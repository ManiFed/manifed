import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, TrendingUp, PlusCircle, LayoutDashboard, Landmark, Search, LogOut, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockUserPortfolio } from '@/data/mockLoans';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const navItems = [
  { path: '/marketplace', label: 'Marketplace', icon: TrendingUp },
  { path: '/portfolio', label: 'Portfolio', icon: LayoutDashboard },
  { path: '/create', label: 'Create Loan', icon: PlusCircle },
  { path: '/credit-search', label: 'Credit Scores', icon: Search },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: 'Error signing out',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      navigate('/');
    }
  };

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/marketplace" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center glow">
              <Landmark className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-gradient">ManiFed Loans</h1>
              <p className="text-xs text-muted-foreground -mt-0.5">Prediction Market Lending</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    size="sm"
                    className={cn(
                      'gap-2',
                      isActive && 'bg-secondary text-foreground'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border/50">
              <Wallet className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">
                M${mockUserPortfolio.balance.toLocaleString()}
              </span>
            </div>
            <Badge variant="active" className="hidden sm:inline-flex">
              Rep: {mockUserPortfolio.reputation}
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden flex items-center gap-1 pb-3 -mx-1 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'gap-2 shrink-0',
                    isActive && 'bg-secondary text-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
