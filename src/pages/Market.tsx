import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useUserBalance } from '@/hooks/useUserBalance';
import { WalletPopover } from '@/components/WalletPopover';
import {
  Landmark,
  Store,
  Sparkles,
  Crown,
  Image,
  Zap,
  Award,
  Loader2,
  LogOut,
  Settings,
  Check,
  ShoppingCart,
} from 'lucide-react';

interface MarketItem {
  id: string;
  name: string;
  description: string | null;
  category: 'flair' | 'badge' | 'background' | 'effect';
  image_url: string | null;
  price: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

interface UserItem {
  id: string;
  item_id: string;
  is_equipped: boolean;
}

const CATEGORY_ICONS = {
  flair: Sparkles,
  badge: Award,
  background: Image,
  effect: Zap,
};

const RARITY_COLORS = {
  common: 'bg-muted text-muted-foreground border-border',
  uncommon: 'bg-green-500/20 text-green-600 border-green-500/30',
  rare: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  epic: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
  legendary: 'bg-amber-500/20 text-amber-600 border-amber-500/30',
};

export default function Market() {
  const [items, setItems] = useState<MarketItem[]>([]);
  const [userItems, setUserItems] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [equippingId, setEquippingId] = useState<string | null>(null);
  const { balance, fetchBalance } = useUserBalance();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch market items
      const { data: itemsData } = await supabase
        .from('market_items')
        .select('*')
        .order('price', { ascending: true });

      if (itemsData) {
        setItems(itemsData as MarketItem[]);
      }

      // Fetch user's owned items
      const { data: userItemsData } = await supabase
        .from('user_items')
        .select('*')
        .eq('user_id', user.id);

      if (userItemsData) {
        setUserItems(userItemsData as UserItem[]);
      }

      // Check API key
      const { data: settings } = await supabase
        .from('user_manifold_settings')
        .select('manifold_api_key')
        .eq('user_id', user.id)
        .maybeSingle();

      setHasApiKey(!!settings?.manifold_api_key);
      await fetchBalance();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async (item: MarketItem) => {
    if (item.price > balance) {
      toast({
        title: 'Insufficient Balance',
        description: `You need M$${item.price} to purchase this item`,
        variant: 'destructive',
      });
      return;
    }

    setPurchasingId(item.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Deduct from ManiFed balance (this is a purchase, not a withdrawal)
      const { error: balanceError } = await supabase.rpc('modify_user_balance', {
        p_user_id: user.id,
        p_amount: item.price,
        p_operation: 'subtract'
      });

      if (balanceError) throw balanceError;

      // Add item to user's inventory
      const { error: insertError } = await supabase
        .from('user_items')
        .insert({
          user_id: user.id,
          item_id: item.id,
        });

      if (insertError) throw insertError;

      // Record transaction as market_purchase (not withdrawal)
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'market_purchase',
        amount: -item.price,
        description: `Purchased ${item.name}`,
      });

      // Record fee to fee pool
      await supabase.from('fee_pool').insert({
        user_id: user.id,
        amount: item.price * 0.005,
        source: 'market',
      });

      toast({
        title: 'Purchase Successful!',
        description: `You now own ${item.name}!`,
      });

      await fetchData();
    } catch (error) {
      console.error('Error purchasing item:', error);
      toast({
        title: 'Purchase Failed',
        description: error instanceof Error ? error.message : 'Could not complete purchase',
        variant: 'destructive',
      });
    } finally {
      setPurchasingId(null);
    }
  };

  const handleEquip = async (item: MarketItem) => {
    setEquippingId(item.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update profile with equipped item
      const updateField = `equipped_${item.category}`;
      const { error } = await supabase
        .from('profiles')
        .update({ [updateField]: item.id })
        .eq('user_id', user.id);

      if (error) {
        // Profile might not exist, create it
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({ 
            user_id: user.id, 
            [updateField]: item.id 
          });
        if (insertError) throw insertError;
      }

      toast({
        title: 'Item Equipped!',
        description: `${item.name} is now active on your profile`,
      });
    } catch (error) {
      console.error('Error equipping item:', error);
      toast({
        title: 'Equip Failed',
        variant: 'destructive',
      });
    } finally {
      setEquippingId(null);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const filteredItems = activeCategory === 'all' 
    ? items 
    : items.filter(item => item.category === activeCategory);

  const ownedItemIds = new Set(userItems.map(ui => ui.item_id));

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
                <h1 className="text-lg font-bold text-gradient">ManiFed Market</h1>
                <p className="text-xs text-muted-foreground -mt-0.5">Profile Customization</p>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <WalletPopover balance={balance} hasApiKey={hasApiKey} onBalanceChange={fetchBalance} />
              <Link to="/profile">
                <Button variant="outline" size="sm">My Profile</Button>
              </Link>
              <Link to="/settings">
                <Button variant="ghost" size="icon">
                  <Settings className="w-5 h-5" />
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
            <Crown className="w-4 h-4" />
            Profile Customization
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            ManiFed <span className="text-gradient">Market</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Customize your profile with unique flairs, badges, backgrounds, and effects.
          </p>
        </div>

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-8">
          <TabsList className="grid w-full grid-cols-5 max-w-lg mx-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="flair" className="gap-1">
              <Sparkles className="w-3 h-3" />
              Flairs
            </TabsTrigger>
            <TabsTrigger value="badge" className="gap-1">
              <Award className="w-3 h-3" />
              Badges
            </TabsTrigger>
            <TabsTrigger value="background" className="gap-1">
              <Image className="w-3 h-3" />
              BGs
            </TabsTrigger>
            <TabsTrigger value="effect" className="gap-1">
              <Zap className="w-3 h-3" />
              Effects
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* My Items */}
        {userItems.length > 0 && (
          <div className="mb-8 animate-slide-up" style={{ animationDelay: '50ms' }}>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              My Items ({userItems.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {userItems.map((ui) => {
                const item = items.find(i => i.id === ui.item_id);
                if (!item) return null;
                const Icon = CATEGORY_ICONS[item.category];
                return (
                  <Badge key={ui.id} variant="secondary" className="gap-1 py-1.5 px-3">
                    <Icon className="w-3 h-3" />
                    {item.name}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Items Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
          {filteredItems.map((item) => {
            const Icon = CATEGORY_ICONS[item.category];
            const isOwned = ownedItemIds.has(item.id);
            const isPurchasing = purchasingId === item.id;
            const isEquipping = equippingId === item.id;

            return (
              <Card key={item.id} className={`glass transition-all hover:-translate-y-1 ${isOwned ? 'border-success/50' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <Badge className={RARITY_COLORS[item.rarity]}>
                      {item.rarity}
                    </Badge>
                  </div>
                  <CardTitle className="text-base mt-3">{item.name}</CardTitle>
                  {item.description && (
                    <CardDescription className="text-xs">{item.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-foreground">M${item.price}</p>
                    </div>
                    {isOwned ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEquip(item)}
                        disabled={isEquipping}
                      >
                        {isEquipping ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Equip'
                        )}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handlePurchase(item)}
                        disabled={isPurchasing || !hasApiKey}
                      >
                        {isPurchasing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Buy'
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-16">
            <Store className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No items in this category</p>
          </div>
        )}
      </main>
    </div>
  );
}