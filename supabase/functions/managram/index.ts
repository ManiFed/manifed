import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Bounty market configuration
const BOUNTY_MARKET_ID = "n9gzb0Q4nV"; // manifed-bonds market ID
const WITHDRAWAL_COMMENT_ID = "a5ansst2fbt"; // Comment to award bounty to for withdrawals
const MANIFED_TRADING_API_KEY = Deno.env.get("MANIFED_TRADING_API_KEY") || "";
const MANIFED_API_KEY = Deno.env.get("MANIFED_API_KEY") || "";
const ENCRYPTION_KEY = Deno.env.get("API_ENCRYPTION_KEY") || "";

// Check if a string looks like an encrypted API key
function isEncryptedKey(key: string): boolean {
  try {
    const decoded = atob(key);
    return decoded.length >= 28 && /^[A-Za-z0-9+/=]+$/.test(key);
  } catch {
    return false;
  }
}

// Decrypt API key using AES-GCM, or return plaintext for legacy keys
async function decryptApiKey(storedKey: string): Promise<string> {
  if (!isEncryptedKey(storedKey)) {
    console.log("Using legacy plaintext API key");
    return storedKey;
  }

  console.log("Decrypting encrypted API key");
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
  
  const combined = Uint8Array.from(atob(storedKey), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
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
  recipientUsername?: string;
  loanId?: string;
}

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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Fetch user's API key and settings
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

    let userApiKey: string;
    try {
      userApiKey = await decryptApiKey(userSettings.manifold_api_key);
    } catch (decryptError) {
      console.error("Failed to decrypt API key:", decryptError);
      return new Response(
        JSON.stringify({ error: "API key decryption failed. Please reconnect your Manifold account." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      // DEPOSIT: User adds to the bounty market
      console.log(`Adding M$${amount} to bounty market ${BOUNTY_MARKET_ID}`);
      
      const bountyResponse = await fetch(`https://api.manifold.markets/v0/market/${BOUNTY_MARKET_ID}/add-bounty`, {
        method: "POST",
        headers: {
          "Authorization": `Key ${userApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ amount })
      });

      if (!bountyResponse.ok) {
        const errorText = await bountyResponse.text();
        console.error(`Bounty add failed: ${bountyResponse.status} - ${errorText}`);
        throw new Error(`Failed to add to bounty: ${errorText}`);
      }

      result = await bountyResponse.json();
      console.log("Bounty added successfully:", result);

      // Credit user's ManiFed balance
      await updateUserBalance(supabase, user.id, amount, "add");
      
      await supabase.from("transactions").insert({
        user_id: user.id,
        type: "deposit",
        amount: amount,
        description: `Deposit via bounty: M$${amount}`
      });
      
      console.log(`Credited M$${amount} to user ${user.id} ManiFed balance`);

    } else if (action === "withdraw") {
      // Check balance first
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

      // WITHDRAW: Award bounty to the withdrawal comment, then ManiFedTrading managrams to user
      console.log(`Awarding M$${amount} from bounty to comment ${WITHDRAWAL_COMMENT_ID}`);

      // Step 1: Award bounty to the withdrawal comment using @ManiFed's API key
      const awardResponse = await fetch(`https://api.manifold.markets/v0/market/${BOUNTY_MARKET_ID}/award-bounty`, {
        method: "POST",
        headers: {
          "Authorization": `Key ${MANIFED_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          amount,
          commentId: WITHDRAWAL_COMMENT_ID
        })
      });

      if (!awardResponse.ok) {
        const errorText = await awardResponse.text();
        console.error(`Bounty award failed: ${awardResponse.status} - ${errorText}`);
        throw new Error(`Failed to award bounty: ${errorText}`);
      }

      console.log("Bounty awarded successfully");

      // Step 2: ManiFedTrading managrams the amount to the user
      console.log(`ManiFedTrading sending M$${amount} to @${userData.username}`);
      
      const manifoldUserId = await getUserIdFromUsername(userData.username);
      
      const managramResponse = await fetch("https://api.manifold.markets/v0/managram", {
        method: "POST",
        headers: {
          "Authorization": `Key ${MANIFED_TRADING_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          toIds: [manifoldUserId],
          amount: amount,
          message: message || `ManiFed withdrawal to @${userData.username}`
        })
      });

      if (!managramResponse.ok) {
        const errorText = await managramResponse.text();
        console.error(`Managram failed: ${managramResponse.status} - ${errorText}`);
        throw new Error(`Failed to send withdrawal: ${errorText}`);
      }

      result = await managramResponse.json();
      console.log("Withdrawal managram sent:", result);

      // Debit user's ManiFed balance
      await updateUserBalance(supabase, user.id, amount, "subtract");
      
      await supabase.from("transactions").insert({
        user_id: user.id,
        type: "withdraw",
        amount: amount,
        description: `Withdrawal via bounty: M$${amount}`
      });
      
      console.log(`Debited M$${amount} from user ${user.id} ManiFed balance`);

    } else if (action === "invest") {
      // INVEST: ManiFedTrading sends managram to loan borrower
      if (!recipientUsername) {
        return new Response(
          JSON.stringify({ error: "recipientUsername required for invest action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

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

      const recipientUserId = await getUserIdFromUsername(recipientUsername);
      
      const investResponse = await fetch("https://api.manifold.markets/v0/managram", {
        method: "POST",
        headers: {
          "Authorization": `Key ${MANIFED_TRADING_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          toIds: [recipientUserId],
          amount: amount,
          message: message || `Loan investment from @${userData.username} via ManiFed`
        })
      });

      if (!investResponse.ok) {
        const errorText = await investResponse.text();
        console.error(`Investment managram failed: ${investResponse.status} - ${errorText}`);
        throw new Error(`Failed to send investment: ${errorText}`);
      }

      result = await investResponse.json();
      console.log("Investment managram sent:", result);

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

      await supabase.from("transactions").insert({
        user_id: user.id,
        type: "invest",
        amount: amount,
        description: message || `Investment in loan`,
        loan_id: loanId
      });

      console.log(`Debited M$${amount} from user ${user.id} for investment`);

    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action. Use: deposit, withdraw, or invest" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
