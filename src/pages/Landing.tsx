import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Landmark, Shield, Sparkles, ArrowRight, Coins, FileText, Clock, Search, Newspaper } from 'lucide-react';
import trumpPortrait from '@/assets/trump-portrait.png';
import trumpSignature from '@/assets/trump-signature.png';
export default function Landing() {
  return <div className="min-h-screen">
      {/* Hero Section */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <img alt="ManiFed" className="w-10 h-10 rounded-xl object-cover border-2 border-primary/50" src="/lovable-uploads/2f4b846c-059e-4a08-a289-b1522b47cb1d.png" />
              <div>
                <h1 className="text-lg font-bold text-gradient">ManiFed</h1>
                <p className="text-xs text-muted-foreground">Making Manifold Great Again</p>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/credit-search">
                <Button variant="outline" size="sm" className="gap-2">
                  <Search className="w-4 h-4" />
                  <span className="hidden sm:inline">Check Credit Score</span>
                  <span className="sm:hidden">Credit</span>
                </Button>
              </Link>
              <Link to="/treasury">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Newspaper className="w-4 h-4" />
                  <span className="hidden sm:inline">Treasury News</span>
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button variant="glow" size="sm">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="container mx-auto px-4 py-20 text-center space-y-8">
          <div className="animate-slide-up">
            <img alt="ManiFed Chairman" src="/lovable-uploads/628bdfd0-48bf-45b8-b87b-952e8ff91924.png" className="w-32 h-32 mx-auto border-primary/50 mb-6 border-0 rounded-3xl shadow-none" />
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6">
              Welcome to <span className="text-gradient">ManiFed</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-4">
              ManiFed is Manifold's decentralized financial institution. We provide lending, 
              borrowing, and financial services for the prediction market ecosystem.
            </p>
            <p className="text-lg font-semibold text-primary mb-4">Make America 🇺🇸 like Manifold 💰without mods 🤮. DONALD J. TRUMP</p>
            <img alt="Signature" className="h-10 mx-auto mb-8 opacity-70" src="/lovable-uploads/ac153951-a664-4258-a2a1-69968ea06607.png" />
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth?mode=signup">
                <Button variant="glow" size="xl" className="gap-2">
                  Start Trading <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="outline" size="xl">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Products */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12 animate-slide-up">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Our <span className="text-gradient">Products</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Financial instruments designed for the prediction market ecosystem
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Loans */}
            <Card className="glass border-primary/30 animate-slide-up" style={{
            animationDelay: '100ms'
          }}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">P2P Loans</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Peer-to-peer marketplace for prediction market loans. Borrow or lend M$.
                </p>
                <Link to="/auth?mode=signup">
                  <Button variant="outline" className="w-full gap-2" size="sm">
                    Access Loans <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Bonds */}
            <Card className="glass border-primary/30 animate-slide-up" style={{
            animationDelay: '150ms'
          }}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">T-Bills</h3>
                    <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Fixed-income Treasury Bills with 6% APY. Guaranteed yields at maturity.
                </p>
                <Button variant="outline" className="w-full gap-2" size="sm" disabled>
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Fee Notice */}
        <section className="container mx-auto px-4 py-4">
          <Card className="glass animate-slide-up" style={{
          animationDelay: '300ms'
        }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4 justify-center text-center">
                <Clock className="w-5 h-5 text-primary shrink-0" />
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">2% transaction fee</strong> on loans (charged to borrowers).
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Disclaimer */}
        <section className="container mx-auto px-4 py-8">
          <Card className="glass border-warning/30 animate-slide-up" style={{
          animationDelay: '350ms'
        }}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-warning/10 shrink-0">
                  <Shield className="w-6 h-6 text-warning" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">Important Disclaimer</h3>
                  <p className="text-sm text-muted-foreground">
                    ManiFed is an experimental platform for peer-to-peer M$ lending. All transactions are conducted 
                    in Manifold Markets' virtual currency (M$) and have no real-world monetary value. Loans are 
                    <strong className="text-foreground"> not legally enforceable</strong> and depend entirely on the 
                    borrower's reputation and goodwill to repay. You may lose your entire investment.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    By using ManiFed, you acknowledge that: (1) M$ is play money with no cash value, (2) there is no 
                    guarantee of repayment, (3) ManiFed acts only as a facilitator and cannot enforce loan terms, and 
                    (4) you are responsible for your own due diligence on borrowers.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Contact Section */}
        <section className="container mx-auto px-4 py-8">
          <Card className="glass animate-slide-up" style={{
          animationDelay: '400ms'
        }}>
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="font-semibold text-foreground mb-2">Questions or Need Help?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  ManiFed offers P2P loans. Reach out to us anytime:
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <a href="https://manifold.markets/ManiFed" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                    <Landmark className="w-4 h-4" />
                    DM @ManiFed on Manifold
                  </a>
                  <span className="hidden sm:inline text-muted-foreground">•</span>
                  <a target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline" href="https://discord.com/users/1443255374089289840">
                    Discord: @manifed
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/50 mt-16">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img src={trumpPortrait} alt="ManiFed" className="w-8 h-8 rounded-full" />
                <span className="font-semibold text-foreground">ManiFed</span>
                <span className="text-muted-foreground">- Making Manifold Great Again</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Powered by Manifold Markets • All loans settled in M$ • 2% loan fee (borrowers only)
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>;
}