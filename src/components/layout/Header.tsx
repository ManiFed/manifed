import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { TrendingUp, PlusCircle, LayoutDashboard, Landmark, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { WalletPopover } from '@/components/WalletPopover';
import { useUserBalance } from '@/hooks/useUserBalance';
const navItems = [{
  path: '/marketplace',
  label: 'Marketplace',
  icon: TrendingUp
}, {
  path: '/portfolio',
  label: 'Portfolio',
  icon: LayoutDashboard
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
  return <header className="sticky top-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/hub" className="flex items-center gap-3">
            
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-gradient">ManiFed Loans</h1>
              
            </div>
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

        {/* Mobile Navigation */}
        <nav className="md:hidden flex items-center gap-1 pb-3 -mx-1 overflow-x-auto">
          {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return <Link key={item.path} to={item.path}>
                <Button variant={isActive ? 'secondary' : 'ghost'} size="sm" className={cn('gap-2 shrink-0', isActive && 'bg-secondary text-foreground')}>
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Button>
              </Link>;
        })}
        </nav>
      </div>
    </header>;
}