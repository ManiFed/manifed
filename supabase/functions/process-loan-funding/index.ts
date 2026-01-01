import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MANIFED_USERNAME = "ManiFed";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { loanId } = await req.json();
    
    if (!loanId) {
      throw new Error("Loan ID is required");
    }

    console.log(`[LOAN-FUNDING] Processing loan ${loanId}`);

    // Get loan details
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      throw new Error("Loan not found");
    }

    // Check if fully funded
    if (loan.funded_amount < loan.amount) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Loan is not fully funded yet",
          funded: loan.funded_amount,
          required: loan.amount
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Already processed
    if (loan.status === 'active' || loan.status === 'repaid') {
      return new Response(
        JSON.stringify({ success: true, message: "Loan already processed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[LOAN-FUNDING] Loan fully funded: M$${loan.funded_amount} - sending to borrower`);

    // Get ManiFed API key to send funds
    const apiKey = Deno.env.get("MANIFED_API_KEY");
    if (!apiKey) {
      throw new Error("ManiFed API key not configured");
    }

    // Get borrower's Manifold user ID
    const borrowerResponse = await fetch(
      `https://api.manifold.markets/v0/user/${loan.borrower_username}`
    );
    
    if (!borrowerResponse.ok) {
      // Try case-insensitive search
      const searchResponse = await fetch(
        `https://api.manifold.markets/v0/search-users?term=${encodeURIComponent(loan.borrower_username)}`
      );
      
      if (!searchResponse.ok) {
        throw new Error(`Could not find borrower @${loan.borrower_username}`);
      }
      
      const searchResults = await searchResponse.json();
      const matchedUser = searchResults.find(
        (u: any) => u.username.toLowerCase() === loan.borrower_username.toLowerCase()
      );
      
      if (!matchedUser) {
        throw new Error(`Could not find borrower @${loan.borrower_username}`);
      }
      
      // Send mana to borrower
      const sendResponse = await fetch("https://api.manifold.markets/v0/managram", {
        method: "POST",
        headers: {
          Authorization: `Key ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          toIds: [matchedUser.id],
          amount: Math.floor(loan.funded_amount),
          message: `Loan funded: ${loan.title}`,
        }),
      });

      if (!sendResponse.ok) {
        const errorText = await sendResponse.text();
        console.error("[LOAN-FUNDING] Managram failed:", errorText);
        throw new Error("Failed to send funds to borrower");
      }
    } else {
      const borrower = await borrowerResponse.json();
      
      // Send mana to borrower
      const sendResponse = await fetch("https://api.manifold.markets/v0/managram", {
        method: "POST",
        headers: {
          Authorization: `Key ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          toIds: [borrower.id],
          amount: Math.floor(loan.funded_amount),
          message: `Loan funded: ${loan.title}`,
        }),
      });

      if (!sendResponse.ok) {
        const errorText = await sendResponse.text();
        console.error("[LOAN-FUNDING] Managram failed:", errorText);
        throw new Error("Failed to send funds to borrower");
      }
    }

    console.log(`[LOAN-FUNDING] Sent M$${loan.funded_amount} to @${loan.borrower_username}`);

    // Calculate maturity date from now (fully funded moment)
    const maturityDate = new Date();
    maturityDate.setDate(maturityDate.getDate() + loan.term_days);

    // Update loan status to active
    const { error: updateError } = await supabase
      .from('loans')
      .update({ 
        status: 'active',
        maturity_date: maturityDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', loanId);

    if (updateError) {
      console.error("[LOAN-FUNDING] Failed to update loan status:", updateError);
      throw new Error("Failed to update loan status");
    }

    console.log(`[LOAN-FUNDING] Loan activated, maturity: ${maturityDate.toISOString()}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Loan funded! M$${loan.funded_amount} sent to @${loan.borrower_username}`,
        maturityDate: maturityDate.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[LOAN-FUNDING] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
