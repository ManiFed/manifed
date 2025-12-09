import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MANIFED_API_KEY = "5030c542-8fce-4792-a189-3ea91feaf8d8";
const MANIFED_USERNAME = "ManiFed";

interface ManagramRequest {
  action: "deposit" | "withdraw" | "invest";
  amount: number;
  userApiKey: string;
  message?: string;
  recipientUsername?: string; // For invest action
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, amount, userApiKey, message, recipientUsername }: ManagramRequest = await req.json();

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

    console.log(`Processing ${action} for amount M$${amount}`);

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
    } else if (action === "withdraw") {
      // ManiFed sends managram back to user
      result = await sendManagram(
        MANIFED_API_KEY,
        userData.username,
        amount,
        message || `ManiFed withdrawal to @${userData.username}`
      );
    } else if (action === "invest") {
      // ManiFed sends managram to loan borrower
      if (!recipientUsername) {
        return new Response(
          JSON.stringify({ error: "recipientUsername required for invest action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      result = await sendManagram(
        MANIFED_API_KEY,
        recipientUsername,
        amount,
        message || `Loan investment from @${userData.username} via ManiFed`
      );
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action. Use: deposit, withdraw, or invest" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        action,
        amount,
        username: userData.username,
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
