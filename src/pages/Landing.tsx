import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Landmark, 
  Shield, 
  Sparkles, 
  ArrowRight, 
  Coins,
  FileText,
  Clock,
  Search
} from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center glow">
                <Landmark className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gradient">ManiFed</h1>
                <p className="text-xs text-muted-foreground -mt-0.5">Manifold's Central Bank</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/credit-search">
                <Button variant="outline" size="sm" className="gap-2">
                  <Search className="w-4 h-4" />
                  <span className="hidden sm:inline">Check Credit Score</span>
                  <span className="sm:hidden">Credit</span>
                </Button>
              </Link>
              <Link to="/bonds">
                <Button variant="ghost" size="sm" className="gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">Bonds</span>
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              The Central Bank for Prediction Markets
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6">
              Welcome to <span className="text-gradient">ManiFed</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              ManiFed is Manifold's decentralized financial institution. We provide lending, 
              borrowing, and financial services for the prediction market ecosystem.
            </p>
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

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Loans - Active */}
            <Card className="glass border-primary/30 animate-slide-up" style={{ animationDelay: '100ms' }}>
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">ManiFed Loans</h3>
                    <Badge variant="active">Live Now</Badge>
                  </div>
                </div>
                <p className="text-muted-foreground mb-6">
                  A peer-to-peer marketplace for prediction market loans. Borrow M$ for trading 
                  opportunities or earn yield by lending to traders.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                  <li className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-primary" />
                    Borrow M$ for market opportunities
                  </li>
                  <li className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Reputation-based credit scoring
                  </li>
                  <li className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Transparent loan marketplace
                  </li>
                </ul>
                <Link to="/auth?mode=signup">
                  <Button variant="glow" className="w-full gap-2">
                    Access Loans <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Bonds - Live */}
            <Card className="glass border-primary/30 animate-slide-up" style={{ animationDelay: '200ms' }}>
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">ManiFed Bonds</h3>
                    <Badge variant="active">Live Now</Badge>
                  </div>
                </div>
                <p className="text-muted-foreground mb-6">
                  Treasury Bills for stable returns. Fixed terms from 4 to 52 weeks with 
                  guaranteed yields at maturity. Currently offering 6% APY.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                  <li className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    4, 13, 26, or 52 week terms
                  </li>
                  <li className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    6% APY guaranteed at maturity
                  </li>
                  <li className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Principal + yield returned automatically
                  </li>
                </ul>
                <Link to="/bonds">
                  <Button variant="glow" className="w-full gap-2">
                    Explore Bonds <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="container mx-auto px-4 py-8">
          <Card className="glass border-warning/30 animate-slide-up" style={{ animationDelay: '300ms' }}>
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
          <Card className="glass animate-slide-up" style={{ animationDelay: '400ms' }}>
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="font-semibold text-foreground mb-2">Questions or Need Help?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  ManiFed offers P2P loans backed by Manifold Markets. Reach out to us anytime:
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <a 
                    href="https://manifold.markets/ManiFed" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <Landmark className="w-4 h-4" />
                    DM @ManiFed on Manifold
                  </a>
                  <span className="hidden sm:inline text-muted-foreground">•</span>
                  <a 
                    href="https://discord.gg/manifed" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
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
                <Landmark className="w-6 h-6 text-primary" />
                <span className="font-semibold text-foreground">ManiFed</span>
                <span className="text-muted-foreground">- Manifold's Central Bank</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Powered by Manifold Markets • All loans settled in M$
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
