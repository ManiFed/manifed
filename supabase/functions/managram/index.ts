import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MANIFED_API_KEY = Deno.env.get("MANIFED_API_KEY") || "";
const MANIFED_USERNAME = "ManiFed";
const ENCRYPTION_KEY = Deno.env.get("API_ENCRYPTION_KEY") || "";

// Check if a string looks like an encrypted API key (base64 with sufficient length for IV + data)
function isEncryptedKey(key: string): boolean {
  // Encrypted keys are base64 encoded and have at least 12 bytes IV + some encrypted data
  // A UUID-style API key like "fd09f0a3-493d-4e2a-8af4-015c5b192678" is 36 chars
  // An encrypted key will be longer and use base64 charset (A-Za-z0-9+/=)
  try {
    // Try to decode as base64
    const decoded = atob(key);
    // Encrypted keys should be at least 12 (IV) + 16 (min encrypted) = 28 bytes
    // which would be ~38+ chars in base64
    return decoded.length >= 28 && /^[A-Za-z0-9+/=]+$/.test(key);
  } catch {
    return false;
  }
}

// Decrypt API key using AES-GCM, or return plaintext for legacy keys
async function decryptApiKey(storedKey: string): Promise<string> {
  // Check if this is a legacy plaintext key (UUID format or similar)
  if (!isEncryptedKey(storedKey)) {
    console.log("Using legacy plaintext API key");
    return storedKey;
  }

  console.log("Decrypting encrypted API key");
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  // Derive key from encryption secret
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
  
  // Decode base64 and extract IV + encrypted data
  const combined = Uint8Array.from(atob(storedKey), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    keyMaterial,
    encrypted
  );
  
  return decoder.decode(decrypted);
}

interface ManagramRequest {
  action: "deposit" | "withdraw" | "invest";
  amount: number;
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

    const { action, amount, message, recipientUsername, loanId }: ManagramRequest = await req.json();

    if (!action || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: action, amount" }),
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

    // Fetch user's API key server-side using service role
    const { data: userSettings, error: settingsError } = await supabase
      .from("user_manifold_settings")
      .select("manifold_api_key, manifold_username")
      .eq("user_id", user.id)
      .single();

    if (settingsError || !userSettings?.manifold_api_key) {
      console.error("Failed to fetch user API key:", settingsError);
      return new Response(
        JSON.stringify({ error: "Manifold account not connected. Please connect in Settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decrypt the API key
    let userApiKey: string;
    try {
      userApiKey = await decryptApiKey(userSettings.manifold_api_key);
    } catch (decryptError) {
      console.error("Failed to decrypt API key:", decryptError);
      return new Response(
        JSON.stringify({ error: "API key decryption failed. Please reconnect your Manifold account in Settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const manifoldUsername = userSettings.manifold_username;

    // Verify user's API key
    const meResponse = await fetch("https://api.manifold.markets/v0/me", {
      headers: { Authorization: `Key ${userApiKey}` }
    });

    if (!meResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Invalid Manifold API key. Please update in Settings." }),
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
      // Investment flow: Deduct from investor's ManiFed balance immediately
      // Funds are NOT sent to borrower until funding period ends (handled by process-repayments)

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

      // No managram sent here - funds held until funding period ends
      // Just mark as successful to proceed with balance deduction
      result = { txnId: `invest_${Date.now()}` };
      console.log(`Investment of M$${amount} recorded - funds held until funding period ends`);

      if (result.txnId) {
        // Debit user's balance using the secure RPC function
        const { error: balanceError } = await supabase.rpc('modify_user_balance', {
          p_user_id: user.id,
          p_amount: amount,
          p_operation: 'subtract'
        });

        if (balanceError) {
          console.error("Error deducting balance for investment:", balanceError);
          throw balanceError;
        }

        // Update total_invested separately
        const currentTotalInvested = Number(balanceData?.total_invested) || 0;
        await supabase
          .from("user_balances")
          .update({
            total_invested: currentTotalInvested + amount,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", user.id);

        // Record the investment transaction
        await supabase.from("transactions").insert({
          user_id: user.id,
          type: "invest",
          amount: amount,
          description: message || `Investment in loan`,
          loan_id: loanId
        });

        console.log(`Debited M$${amount} from user ${user.id} for investment via RPC`);
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Check for insufficient balance error and return 400 instead of 500
    if (errorMessage.includes("Insufficient balance")) {
      // Extract the balance info for a friendly message
      const match = errorMessage.match(/needed (\d+(?:\.\d+)?).+only had (\d+(?:\.\d+)?)/);
      const friendlyMessage = match 
        ? `Insufficient Manifold balance. You need M$${Math.ceil(Number(match[1]))} but only have M$${Math.floor(Number(match[2]))} in your Manifold account.`
        : "Insufficient balance in your Manifold account to complete this deposit.";
      
      return new Response(
        JSON.stringify({ error: friendlyMessage }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
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
  // Use the centralized modify_user_balance RPC for all balance changes
  const { error } = await supabase.rpc('modify_user_balance', {
    p_user_id: userId,
    p_amount: amount,
    p_operation: operation
  });

  if (error) {
    console.error(`Failed to ${operation} balance via RPC:`, error);
    throw new Error(`Failed to ${operation} balance: ${error.message}`);
  }
  
  console.log(`Successfully updated balance for user ${userId}: ${operation} M$${amount}`);
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