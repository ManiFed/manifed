import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create client with user's auth token to verify identity
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Not authenticated');
    }

    const buyerId = user.id;
    console.log('Authenticated buyer:', buyerId);

    // Parse request body
    const { listing_id } = await req.json();
    if (!listing_id) {
      throw new Error('Missing listing_id');
    }

    console.log('Processing purchase for listing:', listing_id);

    // Use service role for all database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch listing with bond details
    const { data: listing, error: listingError } = await supabase
      .from('bond_listings')
      .select('*, bond:bonds(*)')
      .eq('id', listing_id)
      .eq('status', 'active')
      .single();

    if (listingError || !listing) {
      console.error('Listing error:', listingError);
      throw new Error('Listing not found or no longer active');
    }

    console.log('Found listing:', listing.id, 'Price:', listing.asking_price, 'Seller:', listing.seller_id);

    // Prevent self-purchase
    if (listing.seller_id === buyerId) {
      throw new Error('Cannot purchase your own listing');
    }

    // Check buyer's balance
    const { data: buyerBalance, error: balanceError } = await supabase
      .from('user_balances')
      .select('balance')
      .eq('user_id', buyerId)
      .single();

    if (balanceError) {
      console.error('Balance error:', balanceError);
      throw new Error('Could not fetch buyer balance');
    }

    if (!buyerBalance || buyerBalance.balance < listing.asking_price) {
      throw new Error(`Insufficient balance. Need M$${listing.asking_price}, have M$${buyerBalance?.balance || 0}`);
    }

    console.log('Buyer balance sufficient:', buyerBalance.balance);

    // Execute all operations atomically using service role
    
    // 1. Deduct buyer's balance
    const { error: deductError } = await supabase.rpc('modify_user_balance', {
      p_user_id: buyerId,
      p_amount: listing.asking_price,
      p_operation: 'subtract'
    });

    if (deductError) {
      console.error('Deduct error:', deductError);
      throw new Error('Failed to deduct buyer balance');
    }

    console.log('Deducted buyer balance');

    // 2. Credit seller's balance
    const { error: creditError } = await supabase.rpc('modify_user_balance', {
      p_user_id: listing.seller_id,
      p_amount: listing.asking_price,
      p_operation: 'add'
    });

    if (creditError) {
      console.error('Credit error:', creditError);
      // Rollback buyer deduction
      await supabase.rpc('modify_user_balance', {
        p_user_id: buyerId,
        p_amount: listing.asking_price,
        p_operation: 'add'
      });
      throw new Error('Failed to credit seller balance');
    }

    console.log('Credited seller balance');

    // 3. Transfer bond ownership
    const { error: bondError } = await supabase
      .from('bonds')
      .update({ user_id: buyerId })
      .eq('id', listing.bond_id);

    if (bondError) {
      console.error('Bond transfer error:', bondError);
      // Rollback balances
      await supabase.rpc('modify_user_balance', {
        p_user_id: buyerId,
        p_amount: listing.asking_price,
        p_operation: 'add'
      });
      await supabase.rpc('modify_user_balance', {
        p_user_id: listing.seller_id,
        p_amount: listing.asking_price,
        p_operation: 'subtract'
      });
      throw new Error('Failed to transfer bond ownership');
    }

    console.log('Transferred bond ownership');

    // 4. Update listing status
    const { error: updateListingError } = await supabase
      .from('bond_listings')
      .update({ status: 'sold' })
      .eq('id', listing.id);

    if (updateListingError) {
      console.error('Listing update error:', updateListingError);
    }

    // 5. Record bond transaction
    await supabase.from('bond_transactions').insert({
      bond_id: listing.bond_id,
      from_user_id: listing.seller_id,
      to_user_id: buyerId,
      price: listing.asking_price,
      transaction_type: 'sale',
    });

    // 6. Record in transactions table for both parties
    await supabase.from('transactions').insert([
      {
        user_id: buyerId,
        type: 'bond_purchase',
        amount: -listing.asking_price,
        description: `Purchased bond from market`,
      },
      {
        user_id: listing.seller_id,
        type: 'bond_sale',
        amount: listing.asking_price,
        description: `Sold bond on market`,
      }
    ]);

    console.log('Transaction complete');

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Bond purchased successfully',
      bond_id: listing.bond_id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to purchase bond';
    console.error('Purchase bond error:', message);
    return new Response(JSON.stringify({ 
      error: message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
