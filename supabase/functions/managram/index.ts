import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MANIFED_API_KEY = Deno.env.get("MANIFED_API_KEY") || "";
const MANIFED_USERNAME = "ManiFed";

interface ManagramRequest {
  action: "deposit" | "withdraw" | "invest";
  amount: number;
  userApiKey: string;
  message?: string;
  recipientUsername?: string; // For invest action
  loanId?: string; // For invest action
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header and validate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create client with user token for auth validation
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

    const { action, amount, userApiKey, message, recipientUsername, loanId }: ManagramRequest = await req.json();

    if (!action || !amount || !userApiKey) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: action, amount, userApiKey" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (amount < 10) {
      return new Response(
        JSON.stringify({ error: "Minimum amount is M$10" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${action} for amount M$${amount} by user ${user.id}`);

    // Verify user's API key first
    const meResponse = await fetch("https://api.manifold.markets/v0/me", {
      headers: { Authorization: `Key ${userApiKey}` }
    });

    if (!meResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userData = await meResponse.json();
    console.log(`User verified: ${userData.username}`);

    let result;

    if (action === "deposit") {
      // User sends managram to ManiFed
      result = await sendManagram(
        userApiKey,
        MANIFED_USERNAME,
        amount,
        message || `ManiFed deposit from @${userData.username}`
      );

      if (result.txnId) {
        // Credit user's ManiFed balance using service role
        await updateUserBalance(supabase, user.id, amount, "add");
        
        // Record transaction
        await supabase.from("transactions").insert({
          user_id: user.id,
          type: "deposit",
          amount: amount,
          description: `Deposit from Manifold: M$${amount}`
        });
        
        console.log(`Credited M$${amount} to user ${user.id} ManiFed balance`);
      }
    } else if (action === "withdraw") {
      // First check if user has sufficient balance
      const { data: balanceData } = await supabase
        .from("user_balances")
        .select("balance")
        .eq("user_id", user.id)
        .single();

      const currentBalance = Number(balanceData?.balance) || 0;
      if (currentBalance < amount) {
        return new Response(
          JSON.stringify({ error: "Insufficient ManiFed balance" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ManiFed sends managram back to user
      result = await sendManagram(
        MANIFED_API_KEY,
        userData.username,
        amount,
        message || `ManiFed withdrawal to @${userData.username}`
      );

      if (result.txnId) {
        // Debit user's ManiFed balance
        await updateUserBalance(supabase, user.id, amount, "subtract");
        
        // Record transaction
        await supabase.from("transactions").insert({
          user_id: user.id,
          type: "withdraw",
          amount: amount,
          description: `Withdrawal to Manifold: M$${amount}`
        });
        
        console.log(`Debited M$${amount} from user ${user.id} ManiFed balance`);
      }
    } else if (action === "invest") {
      // ManiFed sends managram to loan borrower
      if (!recipientUsername) {
        return new Response(
          JSON.stringify({ error: "recipientUsername required for invest action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check user's balance first
      const { data: balanceData } = await supabase
        .from("user_balances")
        .select("balance, total_invested")
        .eq("user_id", user.id)
        .single();

      const currentBalance = Number(balanceData?.balance) || 0;
      if (currentBalance < amount) {
        return new Response(
          JSON.stringify({ error: "Insufficient ManiFed balance for investment" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      result = await sendManagram(
        MANIFED_API_KEY,
        recipientUsername,
        amount,
        message || `Loan investment from @${userData.username} via ManiFed`
      );

      if (result.txnId) {
        // Debit user's balance and increase total_invested
        const currentTotalInvested = Number(balanceData?.total_invested) || 0;
        
        const { error: updateError } = await supabase
          .from("user_balances")
          .update({
            balance: currentBalance - amount,
            total_invested: currentTotalInvested + amount,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", user.id);

        if (updateError) {
          console.error("Error updating balance after investment:", updateError);
          throw updateError;
        }

        // Record the investment transaction
        await supabase.from("transactions").insert({
          user_id: user.id,
          type: "invest",
          amount: amount,
          description: message || `Investment in loan`,
          loan_id: loanId
        });

        console.log(`Debited M$${amount} from user ${user.id} for investment`);
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action. Use: deposit, withdraw, or invest" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch updated balance to return
    const { data: updatedBalance } = await supabase
      .from("user_balances")
      .select("balance, total_invested")
      .eq("user_id", user.id)
      .single();

    return new Response(
      JSON.stringify({ 
        success: true, 
        action,
        amount,
        username: userData.username,
        newBalance: Number(updatedBalance?.balance) || 0,
        newTotalInvested: Number(updatedBalance?.total_invested) || 0,
        ...result 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in managram function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function updateUserBalance(
  supabase: any,
  userId: string,
  amount: number,
  operation: "add" | "subtract"
): Promise<void> {
  // Get current balance
  const { data: balanceData } = await supabase
    .from("user_balances")
    .select("balance")
    .eq("user_id", userId)
    .single();

  if (balanceData) {
    const currentBalance = Number(balanceData.balance) || 0;
    const newBalance = operation === "add" 
      ? currentBalance + amount 
      : currentBalance - amount;

    await supabase
      .from("user_balances")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
  } else {
    // Create initial record
    await supabase
      .from("user_balances")
      .insert({ 
        user_id: userId, 
        balance: operation === "add" ? amount : 0,
        total_invested: 0
      });
  }
}

async function getUserIdFromUsername(username: string): Promise<string> {
  console.log(`Looking up user ID for @${username}`);
  
  const response = await fetch(`https://api.manifold.markets/v0/user/${username}`);
  
  if (!response.ok) {
    throw new Error(`User @${username} not found`);
  }
  
  const userData = await response.json();
  console.log(`Found user ID: ${userData.id}`);
  return userData.id;
}

async function sendManagram(
  senderApiKey: string,
  toUsername: string,
  amount: number,
  message: string
): Promise<{ txnId?: string; error?: string }> {
  console.log(`Sending M$${amount} to @${toUsername}: ${message}`);
  
  // First get the user ID from username
  const userId = await getUserIdFromUsername(toUsername);
  
  const response = await fetch("https://api.manifold.markets/v0/managram", {
    method: "POST",
    headers: {
      "Authorization": `Key ${senderApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      toIds: [userId],
      amount: amount,
      message: message
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Managram failed: ${response.status} - ${errorText}`);
    throw new Error(`Failed to send managram: ${errorText}`);
  }

  const data = await response.json();
  console.log("Managram sent successfully:", data);
  return { txnId: data.id || "success" };
}
