import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MANIFED_API_KEY = Deno.env.get("MANIFED_API_KEY")!;

interface ManifoldTransaction {
  id: string;
  fromId: string;
  fromUsername: string;
  toId: string;
  toUsername: string;
  amount: number;
  createdTime: number;
  data?: {
    message?: string;
  };
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
    console.log("[VERIFY-TRANSACTIONS] Starting verification process...");

    // Fetch ManiFed's recent transactions from Manifold
    const txnResponse = await fetch("https://api.manifold.markets/v0/me/txns?limit=100", {
      headers: { "Authorization": `Key ${MANIFED_API_KEY}` },
    });

    if (!txnResponse.ok) {
      const errorText = await txnResponse.text();
      console.error("[VERIFY-TRANSACTIONS] Manifold API error:", errorText);
      throw new Error(`Failed to fetch Manifold transactions: ${txnResponse.status}`);
    }

    const transactions: ManifoldTransaction[] = await txnResponse.json();
    console.log(`[VERIFY-TRANSACTIONS] Fetched ${transactions.length} transactions from Manifold`);

    // Get pending transactions that haven't expired
    const { data: pendingTxns, error: pendingError } = await supabase
      .from('pending_transactions')
      .select('*')
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString());

    if (pendingError) {
      console.error("[VERIFY-TRANSACTIONS] Error fetching pending:", pendingError);
      throw pendingError;
    }

    console.log(`[VERIFY-TRANSACTIONS] Found ${pendingTxns?.length || 0} pending transactions to verify`);

    const results = {
      verified: 0,
      refunded: 0,
      expired: 0,
      errors: 0,
    };

    // Process each pending transaction
    for (const pending of pendingTxns || []) {
      try {
        // Find matching Manifold transaction by message containing the code
        const matchingTxn = transactions.find(txn => {
          const message = txn.data?.message || '';
          return message.toLowerCase().includes(pending.transaction_code.toLowerCase());
        });

        if (!matchingTxn) {
          console.log(`[VERIFY-TRANSACTIONS] No matching txn for code: ${pending.transaction_code}`);
          continue;
        }

        console.log(`[VERIFY-TRANSACTIONS] Found match for ${pending.transaction_code} from @${matchingTxn.fromUsername}`);

        // Check if amount matches
        if (matchingTxn.amount < pending.amount) {
          console.log(`[VERIFY-TRANSACTIONS] Amount mismatch. Expected: ${pending.amount}, Got: ${matchingTxn.amount}. Refunding...`);
          
          // Refund the wrong amount
          await refundTransaction(matchingTxn.fromUsername, matchingTxn.amount, 
            `Refund: Wrong amount sent. Expected M$${pending.amount}, got M$${matchingTxn.amount}. Code: ${pending.transaction_code}`);
          
          // Update status to refunded
          await supabase
            .from('pending_transactions')
            .update({ 
              status: 'refunded',
              from_manifold_username: matchingTxn.fromUsername,
              from_manifold_user_id: matchingTxn.fromId,
            })
            .eq('id', pending.id);
          
          results.refunded++;
          continue;
        }

        // Amount is correct - process based on transaction type
        console.log(`[VERIFY-TRANSACTIONS] Processing ${pending.transaction_type} for code ${pending.transaction_code}`);

        await processTransaction(supabase, pending, matchingTxn);
        
        // Mark as completed
        await supabase
          .from('pending_transactions')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
            from_manifold_username: matchingTxn.fromUsername,
            from_manifold_user_id: matchingTxn.fromId,
          })
          .eq('id', pending.id);

        results.verified++;

      } catch (error) {
        console.error(`[VERIFY-TRANSACTIONS] Error processing ${pending.transaction_code}:`, error);
        results.errors++;
      }
    }

    // Expire old pending transactions
    const { data: expired, error: expireError } = await supabase
      .from('pending_transactions')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString())
      .select();

    if (expired) {
      results.expired = expired.length;
      console.log(`[VERIFY-TRANSACTIONS] Expired ${expired.length} old transactions`);
    }

    console.log("[VERIFY-TRANSACTIONS] Verification complete:", results);

    return new Response(JSON.stringify({
      success: true,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[VERIFY-TRANSACTIONS] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function refundTransaction(toUsername: string, amount: number, message: string) {
  const response = await fetch("https://api.manifold.markets/v0/managram", {
    method: "POST",
    headers: {
      "Authorization": `Key ${MANIFED_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      toUsernames: [toUsername],
      amount: amount,
      message: message,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[VERIFY-TRANSACTIONS] Refund failed for @${toUsername}:`, errorText);
    throw new Error(`Failed to refund: ${errorText}`);
  }

  console.log(`[VERIFY-TRANSACTIONS] Refunded M$${amount} to @${toUsername}`);
}

async function processTransaction(supabase: any, pending: any, manifoldTxn: ManifoldTransaction) {
  const { transaction_type, related_id, amount, user_id, metadata } = pending;

  switch (transaction_type) {
    case 'loan_funding':
      // Record investment in the investments table
      await supabase.from('investments').insert({
        loan_id: related_id,
        investor_user_id: user_id,
        investor_username: manifoldTxn.fromUsername,
        amount: amount,
        message: metadata?.message || `Investment via ${pending.transaction_code}`,
      });

      // Record transaction
      await supabase.from('transactions').insert({
        user_id: user_id,
        type: 'invest',
        amount: amount,
        description: `Invested M$${amount} in loan`,
        loan_id: related_id,
      });

      console.log(`[VERIFY-TRANSACTIONS] Recorded loan funding: M$${amount} for loan ${related_id}`);
      break;

    case 'loan_repayment':
      // Get loan and investments to distribute repayment
      const { data: loan } = await supabase
        .from('loans')
        .select('*')
        .eq('id', related_id)
        .single();

      if (!loan) throw new Error(`Loan ${related_id} not found`);

      const { data: investments } = await supabase
        .from('investments')
        .select('*')
        .eq('loan_id', related_id);

      if (!investments?.length) throw new Error(`No investments found for loan ${related_id}`);

      // Calculate repayment distribution
      const totalInvested = investments.reduce((sum: number, inv: any) => sum + Number(inv.amount), 0);
      const feeRate = 0.02; // 2% ManiFed fee
      const netAmount = amount * (1 - feeRate);

      for (const investment of investments) {
        const share = Number(investment.amount) / totalInvested;
        const repaymentAmount = Math.floor(netAmount * share);

        if (repaymentAmount > 0) {
          // Send mana to investor
          await fetch("https://api.manifold.markets/v0/managram", {
            method: "POST",
            headers: {
              "Authorization": `Key ${MANIFED_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              toUsernames: [investment.investor_username],
              amount: repaymentAmount,
              message: `Loan repayment from ${loan.title}`,
            }),
          });

          // Record transaction
          await supabase.from('transactions').insert({
            user_id: investment.investor_user_id,
            type: 'repayment',
            amount: repaymentAmount,
            description: `Repayment from loan: ${loan.title}`,
            loan_id: related_id,
          });
        }
      }

      // Record fee
      await supabase.from('fee_pool').insert({
        user_id: user_id,
        amount: amount * feeRate,
        source: 'loan_repayment',
      });

      // Update loan status
      await supabase
        .from('loans')
        .update({ status: 'repaid', updated_at: new Date().toISOString() })
        .eq('id', related_id);

      console.log(`[VERIFY-TRANSACTIONS] Processed loan repayment for loan ${related_id}`);
      break;

    case 'loan_cancellation':
      // Similar to repayment but return principal only (no interest)
      const { data: cancelLoan } = await supabase
        .from('loans')
        .select('*')
        .eq('id', related_id)
        .single();

      const { data: cancelInvestments } = await supabase
        .from('investments')
        .select('*')
        .eq('loan_id', related_id);

      for (const investment of cancelInvestments || []) {
        // Return exact investment amount
        await fetch("https://api.manifold.markets/v0/managram", {
          method: "POST",
          headers: {
            "Authorization": `Key ${MANIFED_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            toUsernames: [investment.investor_username],
            amount: Math.floor(Number(investment.amount)),
            message: `Loan cancelled - principal returned: ${cancelLoan?.title}`,
          }),
        });

        await supabase.from('transactions').insert({
          user_id: investment.investor_user_id,
          type: 'refund',
          amount: Number(investment.amount),
          description: `Loan cancelled - principal returned`,
          loan_id: related_id,
        });
      }

      await supabase
        .from('loans')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', related_id);

      console.log(`[VERIFY-TRANSACTIONS] Processed loan cancellation for loan ${related_id}`);
      break;

    case 'bond_purchase':
      // Bonds are held by ManiFed - just record the purchase
      // The bond should already be created, we just confirm the payment
      await supabase.from('transactions').insert({
        user_id: user_id,
        type: 'bond_purchase',
        amount: amount,
        description: `Bond purchase confirmed`,
      });

      // Update bond status if needed
      if (related_id) {
        await supabase
          .from('bonds')
          .update({ status: 'active' })
          .eq('id', related_id);
      }

      console.log(`[VERIFY-TRANSACTIONS] Confirmed bond purchase for user ${user_id}`);
      break;

    default:
      console.warn(`[VERIFY-TRANSACTIONS] Unknown transaction type: ${transaction_type}`);
  }
}
