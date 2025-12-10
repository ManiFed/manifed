import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Landmark,
  User,
  Sparkles,
  Award,
  Image,
  Zap,
  Loader2,
  Settings,
  Edit2,
  Save,
} from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  equipped_flair: string | null;
  equipped_badge: string | null;
  equipped_background: string | null;
  equipped_effect: string | null;
}

interface MarketItem {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
}

export default function Profile() {
  const { userId } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [equippedItems, setEquippedItems] = useState<MarketItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = userId || user?.id;
      
      if (!targetUserId) {
        setIsLoading(false);
        return;
      }

      setIsOwner(user?.id === targetUserId);

      // Fetch profile
      let { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle();

      // Create profile if doesn't exist and is owner
      if (!profileData && user?.id === targetUserId) {
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({ user_id: targetUserId })
          .select()
          .single();
        profileData = newProfile;
      }

      if (profileData) {
        setProfile(profileData as Profile);
        setNewUsername(profileData.username || '');

        // Fetch equipped items
        const equippedIds = [
          profileData.equipped_flair,
          profileData.equipped_badge,
          profileData.equipped_background,
          profileData.equipped_effect,
        ].filter(Boolean);

        if (equippedIds.length > 0) {
          const { data: itemsData } = await supabase
            .from('market_items')
            .select('*')
            .in('id', equippedIds);
          
          if (itemsData) {
            setEquippedItems(itemsData as MarketItem[]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveUsername = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: newUsername })
        .eq('user_id', profile.user_id);

      if (error) throw error;

      setProfile({ ...profile, username: newUsername });
      setIsEditing(false);
      toast({ title: 'Username updated!' });
    } catch (error) {
      toast({ title: 'Failed to update username', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const getItemByCategory = (category: string) => {
    return equippedItems.find(item => item.category === category);
  };

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
                <h1 className="text-lg font-bold text-gradient">ManiFed</h1>
                <p className="text-xs text-muted-foreground -mt-0.5">Profile</p>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              {isOwner && (
                <>
                  <Link to="/market">
                    <Button variant="outline" size="sm">Shop</Button>
                  </Link>
                  <Link to="/settings">
                    <Button variant="ghost" size="icon">
                      <Settings className="w-5 h-5" />
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="glass animate-slide-up">
          <CardHeader className="text-center">
            {/* Avatar with effects */}
            <div className="relative mx-auto mb-4">
              <div className={`w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center ${getItemByCategory('effect') ? 'animate-pulse-slow glow' : ''}`}>
                <User className="w-12 h-12 text-primary-foreground" />
              </div>
              {getItemByCategory('flair') && (
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Username */}
            {isEditing ? (
              <div className="flex items-center justify-center gap-2">
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="max-w-[200px] text-center"
                  placeholder="Enter username"
                />
                <Button size="sm" onClick={handleSaveUsername} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <CardTitle className="text-2xl">
                  {profile?.username || 'Anonymous User'}
                </CardTitle>
                {isOwner && (
                  <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Badge */}
            {getItemByCategory('badge') && (
              <Badge variant="secondary" className="mt-2 gap-1">
                <Award className="w-3 h-3" />
                {getItemByCategory('badge')?.name}
              </Badge>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Equipped Items */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Equipped Items</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { category: 'flair', icon: Sparkles, label: 'Flair' },
                  { category: 'badge', icon: Award, label: 'Badge' },
                  { category: 'background', icon: Image, label: 'Background' },
                  { category: 'effect', icon: Zap, label: 'Effect' },
                ].map(({ category, icon: Icon, label }) => {
                  const item = getItemByCategory(category);
                  return (
                    <div key={category} className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-4 h-4 text-primary" />
                        <span className="text-xs text-muted-foreground">{label}</span>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {item?.name || 'None'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {isOwner && (
              <div className="text-center pt-4 border-t border-border/50">
                <Link to="/market">
                  <Button variant="default" className="gap-2">
                    <Sparkles className="w-4 h-4" />
                    Get More Items
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}