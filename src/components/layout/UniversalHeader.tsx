import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { WalletPopover } from '@/components/WalletPopover';
import { useUserBalance } from '@/hooks/useUserBalance';
import manifedLogo from '@/assets/manifed-logo-new.png';

interface NavItem {
  path: string;
  label: string;
}

interface UniversalHeaderProps {
  variant?: 'default' | 'transparent' | 'landing';
  showAuth?: boolean;
  navItems?: NavItem[];
}

export function UniversalHeader({ 
  variant = 'default', 
  showAuth = true,
  navItems 
}: UniversalHeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { balance, fetchBalance } = useUserBalance();
  const [hasApiKey, setHasApiKey] = useState(false);
  const [hasWithdrawalUsername, setHasWithdrawalUsername] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);
    if (user) {
      fetchUserSettings();
    }
  };

  const fetchUserSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('user_manifold_settings')
        .select('manifold_api_key, withdrawal_username')
        .eq('user_id', user.id)
        .maybeSingle();
      setHasApiKey(!!data?.manifold_api_key);
      setHasWithdrawalUsername(!!data?.withdrawal_username);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

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

  const defaultNavItems: NavItem[] = [
    { path: '/bonds', label: 'Treasury' },
    { path: '/marketplace', label: 'P2P Loans' },
    { path: '/fintech/menu', label: 'Fintech' },
  ];

  const items = navItems || defaultNavItems;

  const headerClass = cn(
    'sticky top-4 z-50 mx-4 md:mx-8',
    variant === 'transparent' && 'bg-transparent',
  );

  const containerClass = cn(
    'max-w-6xl mx-auto backdrop-blur-xl border border-border/50 rounded-2xl shadow-lg shadow-black/5',
    variant === 'landing' ? 'bg-background/40' : 'bg-background/80',
  );

  return (
    <header className={headerClass}>
      <div className={containerClass}>
        <div className="flex items-center justify-between py-3 px-6">
          {/* Logo */}
          <Link to={isAuthenticated ? "/hub" : "/"} className="flex items-center gap-3">
            <img src={manifedLogo} alt="ManiFed" className="h-12 md:h-16" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {items.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <Button 
                    variant={isActive ? 'secondary' : 'ghost'} 
                    size="sm" 
                    className={cn(
                      'font-medium tracking-wide',
                      isActive && 'bg-secondary text-foreground'
                    )}
                  >
                    {item.label}
                  </Button>
                </Link>
              );
            })}
            {isAuthenticated && (
              <Link to="/about">
                <Button variant="ghost" size="sm" className="font-medium tracking-wide">
                  About
                </Button>
              </Link>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <div className="hidden sm:block">
                  <WalletPopover
                    balance={balance}
                    hasApiKey={hasApiKey}
                    hasWithdrawalUsername={hasWithdrawalUsername}
                    onBalanceChange={fetchBalance}
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </>
            ) : showAuth && (
              <>
                <Link to="/auth">
                  <Button variant="ghost" size="sm" className="font-medium">
                    Sign In
                  </Button>
                </Link>
                <Link to="/auth?mode=signup">
                  <Button size="sm" className="font-medium bg-foreground text-background hover:bg-foreground/90">
                    Get Started
                  </Button>
                </Link>
              </>
            )}

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/50 px-6 py-4">
            <div className="flex flex-col gap-2">
              {items.map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <Link 
                    key={item.path} 
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button 
                      variant={isActive ? 'secondary' : 'ghost'} 
                      size="sm" 
                      className="w-full justify-start font-medium"
                    >
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
              <Link to="/about" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start font-medium">
                  About
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
