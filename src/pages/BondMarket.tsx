import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useUserBalance } from '@/hooks/useUserBalance';
import { WalletPopover } from '@/components/WalletPopover';
import { format } from 'date-fns';
import {
  Landmark,
  Store,
  FileText,
  TrendingUp,
  Clock,
  Loader2,
  LogOut,
  ShoppingCart,
} from 'lucide-react';

interface BondListing {
  id: string;
  bond_id: string;
  seller_id: string;
  asking_price: number;
  status: string;
  created_at: string;
  bond: {
    id: string;
    amount: number;
    term_weeks: number;
    annual_yield: number;
    maturity_date: string;
    total_return: number;
  };
}

interface UserBond {
  id: string;
  amount: number;
  term_weeks: number;
  annual_yield: number;
  maturity_date: string;
  total_return: number;
  status: string;
}

export default function BondMarket() {
  const [listings, setListings] = useState<BondListing[]>([]);
  const [userBonds, setUserBonds] = useState<UserBond[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [listingDialogOpen, setListingDialogOpen] = useState(false);
  const [selectedBondToList, setSelectedBondToList] = useState<string | null>(null);
  const [askingPrice, setAskingPrice] = useState('');
  const [isListing, setIsListing] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [hasWithdrawalUsername, setHasWithdrawalUsername] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { balance, fetchBalance } = useUserBalance();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Fetch active listings with bond details
      const { data: listingsData } = await supabase
        .from('bond_listings')
        .select(`
          *,
          bond:bonds(*)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (listingsData) {
        // Filter out listings where bond data couldn't be loaded
        const validListings = listingsData.filter(l => l.bond !== null);
        setListings(validListings as unknown as BondListing[]);
      }

      // Fetch user's bonds that can be listed
      const { data: bondsData } = await supabase
        .from('bonds')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (bondsData) {
        // Filter out bonds that are already listed
        const listedBondIds = new Set((listingsData || []).map(l => l.bond_id));
        setUserBonds(bondsData.filter(b => !listedBondIds.has(b.id)) as UserBond[]);
      }

      // Check API key + withdrawal username (used by wallet)
      const { data: settings } = await supabase
        .from('user_manifold_settings')
        .select('manifold_api_key, withdrawal_username')
        .eq('user_id', user.id)
        .maybeSingle();

      setHasApiKey(!!settings?.manifold_api_key);
      setHasWithdrawalUsername(!!settings?.withdrawal_username);
      await fetchBalance();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuyBond = async (listing: BondListing) => {
    if (listing.asking_price > balance) {
      toast({
        title: 'Insufficient Balance',
        description: `You need M$${listing.asking_price} to purchase this bond`,
        variant: 'destructive',
      });
      return;
    }

    setBuyingId(listing.id);
    try {
      // Use secure edge function for the entire purchase transaction
      const { data, error } = await supabase.functions.invoke('purchase-bond', {
        body: { listing_id: listing.id }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Bond Purchased!',
        description: `You now own this M$${listing.bond.amount} bond`,
      });

      await fetchData();
    } catch (error: any) {
      console.error('Error buying bond:', error);
      toast({
        title: 'Purchase Failed',
        variant: 'destructive',
      });
    } finally {
      setBuyingId(null);
    }
  };

  const handleListBond = async () => {
    if (!selectedBondToList || !askingPrice) return;

    const price = parseFloat(askingPrice);
    if (isNaN(price) || price < 1) {
      toast({ title: 'Invalid price', variant: 'destructive' });
      return;
    }

    setIsListing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('bond_listings')
        .insert({
          bond_id: selectedBondToList,
          seller_id: user.id,
          asking_price: price,
        });

      if (error) throw error;

      toast({ title: 'Bond Listed!', description: `Your bond is now for sale at M$${price}` });
      setListingDialogOpen(false);
      setSelectedBondToList(null);
      setAskingPrice('');
      await fetchData();
    } catch (error) {
      console.error('Error listing bond:', error);
      toast({ title: 'Listing Failed', variant: 'destructive' });
    } finally {
      setIsListing(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/hub" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center glow">
                <Landmark className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gradient">Bond Market</h1>
                <p className="text-xs text-muted-foreground -mt-0.5">Secondary Trading</p>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <WalletPopover
                balance={balance}
                hasApiKey={hasApiKey}
                hasWithdrawalUsername={hasWithdrawalUsername}
                onBalanceChange={fetchBalance}
              />
              <Link to="/bonds">
                <Button variant="outline" size="sm">Buy New Bonds</Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
            <Store className="w-4 h-4" />
            Secondary Market
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Bond <span className="text-gradient">Marketplace</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Buy and sell Treasury Bills from other users at market prices.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Listings */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                Active Listings ({listings.length})
              </h2>
            </div>

            {listings.length === 0 ? (
              <Card className="glass p-8 text-center">
                <Store className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No bonds listed for sale</p>
                <p className="text-sm text-muted-foreground mt-1">Be the first to list your bond!</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {listings.map((listing) => {
                  const isSeller = listing.seller_id === userId;
                  const isBuying = buyingId === listing.id;
                  const daysToMaturity = Math.ceil((new Date(listing.bond.maturity_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <Card key={listing.id} className="glass">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                              <FileText className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-foreground">M${listing.bond.amount}</p>
                                <Badge variant="secondary">{listing.bond.term_weeks}w • {listing.bond.annual_yield}%</Badge>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {daysToMaturity}d to maturity
                                </span>
                                <span className="flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3" />
                                  Returns M${listing.bond.total_return.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-foreground">M${listing.asking_price}</p>
                            {!isSeller && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleBuyBond(listing)}
                                disabled={isBuying || !hasApiKey}
                                className="mt-2"
                              >
                                {isBuying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buy'}
                              </Button>
                            )}
                            {isSeller && (
                              <Badge variant="secondary" className="mt-2">Your Listing</Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar - List Your Bonds */}
          <div className="space-y-6">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Sell Your Bonds
                </CardTitle>
                <CardDescription>
                  List your bonds for other users to buy
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userBonds.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">No bonds available to list</p>
                    <Link to="/bonds">
                      <Button variant="outline" size="sm" className="mt-3">
                        Buy Bonds
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userBonds.map((bond) => (
                      <div key={bond.id} className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="secondary">{bond.term_weeks}w • {bond.annual_yield}%</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(bond.maturity_date), 'MMM d')}
                          </span>
                        </div>
                        <p className="font-semibold text-foreground">M${bond.amount}</p>
                        <Dialog open={listingDialogOpen && selectedBondToList === bond.id} onOpenChange={(open) => {
                          setListingDialogOpen(open);
                          if (!open) setSelectedBondToList(null);
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full mt-2"
                              onClick={() => setSelectedBondToList(bond.id)}
                            >
                              List for Sale
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>List Bond for Sale</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              <div className="p-3 rounded-lg bg-secondary/30">
                                <p className="text-sm text-muted-foreground">Bond Value</p>
                                <p className="font-semibold text-foreground">M${bond.amount}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Returns M${bond.total_return.toFixed(2)} at maturity
                                </p>
                              </div>
                              <div>
                                <Label>Asking Price (M$)</Label>
                                <Input
                                  type="number"
                                  placeholder="Enter your asking price"
                                  value={askingPrice}
                                  onChange={(e) => setAskingPrice(e.target.value)}
                                  className="bg-secondary/50"
                                />
                              </div>
                              <Button
                                variant="default"
                                className="w-full"
                                onClick={handleListBond}
                                disabled={isListing}
                              >
                                {isListing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'List Bond'}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}