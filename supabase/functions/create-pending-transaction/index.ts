import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate unique transaction code in format mf********
function generateTransactionCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = 'mf';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    console.log("[CREATE-PENDING-TRANSACTION] Starting...");

    // Get authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("[CREATE-PENDING-TRANSACTION] Auth error:", authError);
      throw new Error("Not authenticated");
    }

    const { transactionType, amount, relatedId, metadata } = await req.json();
    
    if (!transactionType || !amount) {
      throw new Error("Missing required fields: transactionType and amount");
    }

    // Validate transaction types
    const validTypes = ['loan_funding', 'loan_repayment', 'loan_cancellation', 'bond_purchase'];
    if (!validTypes.includes(transactionType)) {
      throw new Error(`Invalid transaction type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Generate unique code
    let transactionCode: string = generateTransactionCode();
    let attempts = 0;
    const maxAttempts = 10;
    
    // Keep trying until we get a unique code
    while (attempts < maxAttempts) {
      const { data: existing } = await supabase
        .from('pending_transactions')
        .select('id')
        .eq('transaction_code', transactionCode)
        .maybeSingle();
      
      if (!existing) break;
      transactionCode = generateTransactionCode();
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      throw new Error("Failed to generate unique transaction code");
    }

    // Set expiration to 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Create the pending transaction
    const { data: transaction, error: insertError } = await supabase
      .from('pending_transactions')
      .insert({
        user_id: user.id,
        transaction_code: transactionCode!,
        transaction_type: transactionType,
        amount: amount,
        related_id: relatedId || null,
        expires_at: expiresAt,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (insertError) {
      console.error("[CREATE-PENDING-TRANSACTION] Insert error:", insertError);
      throw insertError;
    }

    console.log(`[CREATE-PENDING-TRANSACTION] Created transaction ${transactionCode} for user ${user.id}`);

    return new Response(JSON.stringify({
      success: true,
      transactionCode: transactionCode!,
      amount: amount,
      expiresAt: expiresAt,
      manifedUsername: "ManiFed", // The account to send mana to
      instructions: `Send M$${amount} to @ManiFed on Manifold with the message: ${transactionCode!}`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[CREATE-PENDING-TRANSACTION] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
