import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Footer from "@/components/layout/Footer";
import AdvancedOrders from "@/components/fintech/AdvancedOrders";
import manifedLogo from "@/assets/manifed-logo.png";

export default function FintechAdvancedOrders() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth?redirect=/fintech/advanced-orders');
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleData) {
        setHasAccess(true);
        setIsLoading(false);
        return;
      }

      const { data: subData } = await supabase
        .from('fintech_subscriptions')
        .select('is_active, expires_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (subData) {
        const isActive = subData.is_active && 
          (!subData.expires_at || new Date(subData.expires_at) > new Date());
        setHasAccess(isActive);
      }
    } catch (error) {
      console.error('Access check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#0a0a0a]">
        <Card className="max-w-md w-full border-neutral-800 bg-neutral-900/50">
          <CardHeader className="text-center">
            <Lock className="w-12 h-12 mx-auto text-amber-400 mb-4" />
            <CardTitle className="font-display text-white">Subscription Required</CardTitle>
            <CardDescription className="font-serif text-neutral-400">
              Subscribe to Private Client to access Advanced Orders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/fintech">
              <Button className="w-full font-serif bg-amber-500 hover:bg-amber-600 text-black">View Plans</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <header className="sticky top-0 z-50 bg-neutral-900/80 backdrop-blur-lg border-b border-neutral-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/fintech/menu" className="flex items-center gap-3">
              <img src={manifedLogo} alt="ManiFed" className="w-10 h-10 rounded-lg" />
              <span className="font-display text-lg font-bold text-white">Advanced Orders</span>
            </Link>
            <Link to="/fintech/menu">
              <Button variant="ghost" size="sm" className="gap-2 font-serif text-neutral-300 hover:text-white hover:bg-neutral-800">
                <ArrowLeft className="w-4 h-4" />
                Back to Menu
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <AdvancedOrders />
      </main>

      <Footer />
    </div>
  );
}