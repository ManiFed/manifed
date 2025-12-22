import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MANIFED_API_KEY = Deno.env.get("MANIFED_API_KEY")!;
const MANIFED_USER_ID = "xjkHXOwhziTm0vB63IDHLgJlCUO2";

interface ManifoldTransaction {
  id: string;
  fromId: string;
  toId: string;
  amount: number;
  createdTime: number;
  description?: string; // The message sent with the managram
  category?: string;
  token?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "", 
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    console.log("[VERIFY-TRANSACTIONS] Starting deposit verification...");

    // Fetch all transactions TO ManiFed from Manifold API
    const txnResponse = await fetch(`https://api.manifold.markets/v0/txns?toId=${MANIFED_USER_ID}&limit=100`);

    if (!txnResponse.ok) {
      const errorText = await txnResponse.text();
      console.error("[VERIFY-TRANSACTIONS] Manifold API error:", errorText);
      throw new Error(`Failed to fetch Manifold transactions: ${txnResponse.status}`);
    }

    const transactions: ManifoldTransaction[] = await txnResponse.json();
    console.log(`[VERIFY-TRANSACTIONS] Fetched ${transactions.length} transactions from Manifold`);

    // Get all user account codes
    const { data: userBalances, error: balanceError } = await supabase
      .from("user_balances")
      .select("user_id, account_code, balance");

    if (balanceError) {
      console.error("[VERIFY-TRANSACTIONS] Error fetching user balances:", balanceError);
      throw balanceError;
    }

    // Create a map of account_code -> user_id
    const accountCodeMap = new Map<string, string>();
    for (const ub of userBalances || []) {
      if (ub.account_code) {
        accountCodeMap.set(ub.account_code.toUpperCase(), ub.user_id);
      }
    }

    console.log(`[VERIFY-TRANSACTIONS] Found ${accountCodeMap.size} user account codes`);

    // Get already processed transaction IDs to avoid duplicates
    const { data: existingTxns } = await supabase
      .from("transactions")
      .select("description")
      .like("description", "Deposit from Manifold%");

    const processedTxnIds = new Set<string>();
    for (const txn of existingTxns || []) {
      // Extract txn ID from description if present
      const match = txn.description?.match(/txn:([a-zA-Z0-9]+)/);
      if (match) processedTxnIds.add(match[1]);
    }

    const results = {
      depositsProcessed: 0,
      totalAmount: 0,
      errors: 0,
    };

    // Process each Manifold transaction
    for (const txn of transactions) {
      try {
        // Skip if already processed
        if (processedTxnIds.has(txn.id)) {
          continue;
        }

        // Skip if not a MANA_PAYMENT (managram)
        if (txn.category !== "MANA_PAYMENT") {
          continue;
        }

        // Check if the description contains an account code (MF-XXXXXXXX format)
        const description = (txn.description || "").toUpperCase();
        
        // Look for account code pattern in the message
        const codeMatch = description.match(/MF-[A-Z0-9]{8}/);
        if (!codeMatch) {
          console.log(`[VERIFY-TRANSACTIONS] No account code in txn ${txn.id}: "${txn.description}"`);
          continue;
        }

        const accountCode = codeMatch[0];
        const userId = accountCodeMap.get(accountCode);

        if (!userId) {
          console.log(`[VERIFY-TRANSACTIONS] Unknown account code ${accountCode} in txn ${txn.id}`);
          continue;
        }

        console.log(`[VERIFY-TRANSACTIONS] Found deposit! Code: ${accountCode}, Amount: M$${txn.amount}, TxnId: ${txn.id}`);

        // Credit the user's balance using RPC
        const { error: rpcError } = await supabase.rpc("modify_user_balance", {
          p_user_id: userId,
          p_amount: txn.amount,
          p_operation: "add",
        });

        if (rpcError) {
          console.error(`[VERIFY-TRANSACTIONS] Failed to update balance for ${userId}:`, rpcError);
          results.errors++;
          continue;
        }

        // Record the transaction
        await supabase.from("transactions").insert({
          user_id: userId,
          type: "deposit",
          amount: txn.amount,
          description: `Deposit from Manifold (txn:${txn.id})`,
        });

        results.depositsProcessed++;
        results.totalAmount += txn.amount;

        console.log(`[VERIFY-TRANSACTIONS] Credited M$${txn.amount} to user ${userId}`);
      } catch (error) {
        console.error(`[VERIFY-TRANSACTIONS] Error processing txn ${txn.id}:`, error);
        results.errors++;
      }
    }

    console.log("[VERIFY-TRANSACTIONS] Verification complete:", results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: results.depositsProcessed > 0 
          ? `Processed ${results.depositsProcessed} deposits totaling M$${results.totalAmount}`
          : "No new deposits found",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[VERIFY-TRANSACTIONS] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
