import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { TrendingUp, PlusCircle, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { WalletPopover } from '@/components/WalletPopover';
import { useUserBalance } from '@/hooks/useUserBalance';
import manifedLogo from '@/assets/manifed-logo-new.png';
const navItems = [{
  path: '/marketplace',
  label: 'Marketplace',
  icon: TrendingUp
}, {
  path: '/create',
  label: 'Create Loan',
  icon: PlusCircle
}];
export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    balance,
    fetchBalance
  } = useUserBalance();
  const [hasApiKey, setHasApiKey] = useState(false);
  useEffect(() => {
    fetchUserSettings();
  }, []);
  const fetchUserSettings = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const {
        data
      } = await supabase.from('user_manifold_settings').select('manifold_api_key').eq('user_id', user.id).maybeSingle();
      setHasApiKey(!!data?.manifold_api_key);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };
  const handleSignOut = async () => {
    const {
      error
    } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: 'Error signing out',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      navigate('/');
    }
  };
  return <header className="sticky top-4 z-50 mx-4 md:mx-8">
      <div className="max-w-6xl mx-auto bg-background/60 backdrop-blur-xl border border-border/50 rounded-2xl shadow-lg shadow-black/5">
        <div className="flex items-center justify-between h-20 px-6">
          <Link to="/hub" className="flex items-center gap-3">
            <img src={manifedLogo} alt="ManiFed" className="h-28" />
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return <Link key={item.path} to={item.path}>
                  <Button variant={isActive ? 'secondary' : 'ghost'} size="sm" className={cn('gap-2', isActive && 'bg-secondary text-foreground')}>
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>;
          })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <WalletPopover balance={balance} hasApiKey={hasApiKey} onBalanceChange={fetchBalance} />
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </div>
    </header>;
}