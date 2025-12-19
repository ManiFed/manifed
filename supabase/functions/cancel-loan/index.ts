import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create client with user token for auth
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { loanId } = await req.json();

    if (!loanId) {
      return new Response(
        JSON.stringify({ error: "loanId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User ${user.id} attempting to cancel loan ${loanId}`);

    // Get the loan
    const { data: loan, error: loanError } = await supabase
      .from("loans")
      .select("*")
      .eq("id", loanId)
      .single();

    if (loanError || !loan) {
      return new Response(
        JSON.stringify({ error: "Loan not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();
    
    const isAdmin = !!userRole;

    // Verify user owns the loan or is admin
    if (loan.borrower_user_id !== user.id && !isAdmin) {
      return new Response(
        JSON.stringify({ error: "You can only cancel your own loans" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // For admin cancelling someone else's loan with funded amount, skip the managram return
    const isOwner = loan.borrower_user_id === user.id;

    // Can only cancel seeking_funding or active loans (admins can also delete already cancelled loans)
    if (loan.status !== "seeking_funding" && loan.status !== "active" && loan.status !== "cancelled") {
      return new Response(
        JSON.stringify({ error: "Cannot modify this loan" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // If already cancelled, admin just wants to delete - skip refund logic
    const alreadyCancelled = loan.status === "cancelled";

    // Skip all refund/cancel logic if already cancelled - just delete
    if (!alreadyCancelled) {
      // If loan has funded_amount > 0 and the owner is cancelling, they must send funds back
      if (Number(loan.funded_amount) > 0 && isOwner) {
        // Get borrower's Manifold settings to send funds back
        const { data: borrowerSettings } = await supabase
          .from("user_manifold_settings")
          .select("manifold_api_key")
          .eq("user_id", user.id)
          .single();

        if (!borrowerSettings?.manifold_api_key) {
          return new Response(
            JSON.stringify({ error: "You must have your Manifold account connected to cancel a funded loan" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Decrypt the API key
        const ENCRYPTION_KEY = Deno.env.get("API_ENCRYPTION_KEY")!;
        let decryptedApiKey = borrowerSettings.manifold_api_key;
        
        // Check if it's encrypted (base64 encoded)
        if (borrowerSettings.manifold_api_key.length > 50) {
          try {
            const combined = Uint8Array.from(atob(borrowerSettings.manifold_api_key), c => c.charCodeAt(0));
            const iv = combined.slice(0, 12);
            const ciphertext = combined.slice(12);
            
            const keyData = new TextEncoder().encode(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
            const cryptoKey = await crypto.subtle.importKey(
              "raw", keyData, { name: "AES-GCM" }, false, ["decrypt"]
            );
            
            const decrypted = await crypto.subtle.decrypt(
              { name: "AES-GCM", iv }, cryptoKey, ciphertext
            );
            decryptedApiKey = new TextDecoder().decode(decrypted);
          } catch {
            // Might be plaintext, use as-is
          }
        }

        // Send the funded amount back to @ManiFed
        const MANIFED_USERNAME = "ManiFed";
        const fundedAmount = Number(loan.funded_amount);
        
        console.log(`Borrower sending M$${fundedAmount} back to @ManiFed`);
        
        const managramResponse = await fetch("https://api.manifold.markets/v0/managram", {
          method: "POST",
          headers: {
            "Authorization": `Key ${decryptedApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            toIds: [],
            toUsernames: [MANIFED_USERNAME],
            amount: fundedAmount,
            message: `Loan cancelled - returning funds: ${loan.title}`,
          }),
        });

        if (!managramResponse.ok) {
          const errorText = await managramResponse.text();
          console.error("Failed to return funds to ManiFed:", errorText);
          return new Response(
            JSON.stringify({ error: `Failed to return funds to @ManiFed. Please ensure you have M$${fundedAmount} in your Manifold balance.` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        console.log(`Successfully returned M$${fundedAmount} to @ManiFed`);
      }

      console.log(`Cancelling loan: ${loan.title}`);

      // Get all investments for this loan
      const { data: investments, error: investError } = await supabase
        .from("investments")
        .select("*")
        .eq("loan_id", loanId);

      if (investError) {
        console.error("Error fetching investments:", investError);
        throw investError;
      }

      console.log(`Found ${investments?.length || 0} investments to refund`);

      // Refund each investor
      for (const investment of investments || []) {
        // If loan is active (funded), must repay principal + interest
        // If still seeking_funding, just return principal
        const isActive = loan.status === "active";
        const principal = Number(investment.amount);
        const interestMultiplier = isActive ? (1 + Number(loan.interest_rate) / 100) : 1;
        const refundAmount = Math.floor(principal * interestMultiplier);

        // Get investor's balance
        const { data: investorBalance } = await supabase
          .from("user_balances")
          .select("*")
          .eq("user_id", investment.investor_user_id)
          .single();

        if (investorBalance) {
          // Credit the investor's ManiFed balance
          const newBalance = Number(investorBalance.balance) + refundAmount;
          const newTotalInvested = Math.max(0, Number(investorBalance.total_invested) - principal);

          await supabase
            .from("user_balances")
            .update({
              balance: newBalance,
              total_invested: newTotalInvested,
              updated_at: new Date().toISOString()
            })
            .eq("user_id", investment.investor_user_id);

          // Record the refund transaction
          const refundDescription = isActive 
            ? `Loan cancelled - refund with interest: ${loan.title}`
            : `Loan cancelled - refund: ${loan.title}`;
          
          await supabase
            .from("transactions")
            .insert({
              user_id: investment.investor_user_id,
              type: "refund",
              amount: refundAmount,
              description: refundDescription,
              loan_id: loan.id
            });

          console.log(`Refunded M$${refundAmount} to investor ${investment.investor_username}`);
        }
      }

      // Update loan status to cancelled
      await supabase
        .from("loans")
        .update({
          status: "cancelled",
          funded_amount: 0,
          updated_at: new Date().toISOString()
        })
        .eq("id", loanId);
    }

    // If admin is deleting, remove the loan entirely
    if (isAdmin) {
      // First delete related investments
      await supabase
        .from("investments")
        .delete()
        .eq("loan_id", loanId);
      
      // Then delete the loan
      await supabase
        .from("loans")
        .delete()
        .eq("id", loanId);
      
      console.log(`Admin deleted loan ${loanId}`);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Loan deleted successfully.",
          deleted: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Loan ${loanId} cancelled.`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Loan cancelled successfully."
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in cancel-loan:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
