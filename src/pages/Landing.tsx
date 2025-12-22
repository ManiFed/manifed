import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Landmark, Shield, Sparkles, ArrowRight, Coins, FileText, Clock, Search, Newspaper, Brain, Target, MessageSquare, BarChart3 } from "lucide-react";
import trumpPortrait from "@/assets/trump-portrait.png";
export default function Landing() {
  const products = [{
    title: "P2P Loans",
    description: "Peer-to-peer marketplace for prediction market loans. Borrow or lend M$.",
    icon: TrendingUp,
    gradient: "bg-gradient-primary",
    link: "/auth?mode=signup",
    available: true
  }, {
    title: "Treasury Bonds",
    description: "Fixed-income Treasury Bonds with 6% APY. Guaranteed yields at maturity.",
    icon: FileText,
    gradient: "bg-gradient-to-br from-emerald-500 to-teal-600",
    link: "/auth?mode=signup",
    available: true
  }, {
    title: "ManiFed AI",
    description: "AI-powered tools for prediction markets: arbitrage scanner, market agent, and comment maker.",
    icon: Brain,
    gradient: "bg-gradient-to-br from-violet-500 to-purple-600",
    link: "/auth?mode=signup",
    available: true,
    badge: "AI-Powered"
  }, {
    title: "Arbitrage Scanner",
    description: "Scan Manifold Markets for arbitrage opportunities using AI semantic matching.",
    icon: Target,
    gradient: "bg-gradient-to-br from-orange-500 to-red-600",
    link: "/auth?mode=signup",
    available: true,
    badge: "5 credits"
  }, {
    title: "Mispriced Markets",
    description: "Find generally underpriced or overpriced markets using AI analysis.",
    icon: BarChart3,
    gradient: "bg-gradient-to-br from-cyan-500 to-blue-600",
    link: "/auth?mode=signup",
    available: true,
    badge: "5 credits"
  }, {
    title: "Market Agent",
    description: "Paste a Manifold market link and ask AI questions about it.",
    icon: MessageSquare,
    gradient: "bg-gradient-to-br from-blue-500 to-cyan-600",
    link: "/auth?mode=signup",
    available: true,
    badge: "1 credit"
  }, {
    title: "AI Comment Maker",
    description: "Generate Trump-style comments for Manifold markets using AI.",
    icon: Sparkles,
    gradient: "bg-gradient-to-br from-pink-500 to-rose-600",
    link: "/auth?mode=signup",
    available: true,
    badge: "1 credit"
  }, {
    title: "Fintech Tools",
    description: "Index funds, calibration graphs, and bot building playground.",
    icon: Coins,
    gradient: "bg-gradient-to-br from-amber-500 to-yellow-600",
    link: "/fintech",
    available: true,
    badge: "New"
  }];
  return <div className="min-h-screen relative overflow-hidden">
      {/* Ultra Trump Background - Portraits only, no signatures */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <img src={trumpPortrait} alt="" className="absolute -right-10 top-32 w-[550px] h-auto opacity-[0.07] rotate-3" />
        <img src={trumpPortrait} alt="" className="absolute -left-20 bottom-20 w-[400px] h-auto opacity-[0.05] -rotate-6 scale-x-[-1]" />
        <img src={trumpPortrait} alt="" className="absolute right-1/3 top-2/3 w-[280px] h-auto opacity-[0.03] rotate-12" />
      </div>

      {/* Hero Section */}
      <header className="sticky top-0 z-50 glass border-b border-border/50 relative">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <img alt="ManiFed" className="w-10 h-10 rounded-xl object-cover border-primary/50 border-0" src="/lovable-uploads/8cbf6124-13eb-440c-bd86-70a83fae6c42.png" />
              <div>
                <h1 className="text-lg font-bold text-gradient">ManiFed</h1>
                
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
                  <span className="hidden sm:inline">News/About  </span>
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button variant="glow" size="sm">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="container mx-auto px-4 py-20 text-center space-y-8 relative">
          <img src={trumpPortrait} alt="" className="absolute right-0 top-0 w-48 h-48 opacity-10 rounded-full hidden lg:block" />
          <div className="animate-slide-up">
            <img alt="ManiFed Chairman" src="/lovable-uploads/628bdfd0-48bf-45b8-b87b-952e8ff91924.png" className="w-40 h-40 mx-auto border-primary/50 mb-6 border-0 rounded-3xl shadow-xl" />
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6">
              Welcome to <span className="text-gradient">ManiFed</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-4">
              ManiFed is Manifold's decentralized financial institution. We provide lending, borrowing, and AI-powered
              trading tools for the prediction market ecosystem.
              <span className="text-primary font-semibold"> The deep state doesn't want you to know about this.</span>
            </p>
            <p className="text-lg font-semibold text-primary mb-2">Make America 🇺🇸 like Manifold 💰 without mods 🤮</p>
            <p className="text-sm text-muted-foreground mb-4 italic">
              "They tried to regulate prediction markets. They failed. Bigly." — DONALD J. TRUMP
            </p>
            <img alt="Signature" className="h-14 mx-auto mb-8 opacity-80" src="/lovable-uploads/dc5fca2b-4f00-4a11-a7fd-3c71e7c6374b.png" />
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
        <section className="container mx-auto px-4 py-16 relative">
          <img alt="" className="absolute -left-10 top-20 w-[250px] opacity-[0.04] rotate-12" src="/lovable-uploads/7883cca7-f831-4eba-997b-1dcebfa165cf.png" />
          <div className="text-center mb-12 animate-slide-up">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Our <span className="text-gradient">Products</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Financial instruments and AI tools designed for the prediction market ecosystem
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {products.map((product, index) => <Card key={product.title} className="glass border-primary/30 animate-slide-up hover:bg-card/90 transition-all hover:-translate-y-1" style={{
            animationDelay: `${index * 50}ms`
          }}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl ${product.gradient} flex items-center justify-center`}>
                      <product.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-foreground">{product.title}</h3>
                      {product.badge && <Badge variant="secondary" className="text-xs mt-0.5">
                          {product.badge}
                        </Badge>}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{product.description}</p>
                  <Link to={product.link}>
                    <Button variant="outline" className="w-full gap-2" size="sm" disabled={!product.available}>
                      {product.available ? <>
                          Access <ArrowRight className="w-4 h-4" />
                        </> : "Coming Soon"}
                    </Button>
                  </Link>
                </CardContent>
              </Card>)}
          </div>
        </section>

        {/* Disclaimer */}
        <section className="container mx-auto px-4 py-8">
          <Card className="glass border-warning/30 animate-slide-up" style={{
          animationDelay: "350ms"
        }}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-warning/10 shrink-0">
                  <Shield className="w-6 h-6 text-warning" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">Important Disclaimer</h3>
                  <p className="text-sm text-muted-foreground">
                    ManiFed is an experimental platform for peer-to-peer M$ lending. All transactions are conducted in
                    Manifold Markets' virtual currency (M$) and have no real-world monetary value. Loans are
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
          animationDelay: "400ms"
        }}>
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="font-semibold text-foreground mb-2">Questions or Need Help?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  ManiFed offers P2P loans and AI-powered trading tools. Reach out to us anytime:
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
                <img alt="ManiFed" className="w-8 h-8 rounded-full" src="/lovable-uploads/b88a4827-379b-4e6a-afc5-6d0dd09697a8.png" />
                <span className="font-semibold text-foreground">ManiFed</span>
                <span className="text-muted-foreground">- Manifold's Central Bank</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link>
                <span className="text-muted-foreground/50">•</span>
                <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link>
              </div>
              <p className="text-sm text-muted-foreground">Powered by Manifold Markets • All loans settled in M$</p>
            </div>
          </div>
        </footer>
      </main>
    </div>;
}