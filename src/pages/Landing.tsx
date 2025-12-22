import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, FileText, Shield, ArrowRight, Sparkles, Landmark } from "lucide-react";
import manifedLogo from "@/assets/manifed-logo.png";

// 3D Rising Chart Animation Component
function RisingChartBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let animationFrame: number;
    let offset = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw multiple ascending lines
      const lines = 8;
      for (let i = 0; i < lines; i++) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(59, 130, 246, ${0.03 + (i * 0.02)})`;
        ctx.lineWidth = 2;
        
        const baseY = canvas.height - (i * 60);
        const amplitude = 30 + (i * 10);
        const frequency = 0.005 + (i * 0.001);
        const speed = offset * (0.5 + i * 0.1);
        
        ctx.moveTo(0, baseY);
        
        for (let x = 0; x < canvas.width; x += 5) {
          const y = baseY - (x * 0.15) + Math.sin((x * frequency) + speed) * amplitude;
          ctx.lineTo(x, y);
        }
        
        ctx.stroke();
        
        // Add glow effect
        ctx.beginPath();
        ctx.strokeStyle = `rgba(59, 130, 246, ${0.01 + (i * 0.01)})`;
        ctx.lineWidth = 8;
        ctx.moveTo(0, baseY);
        for (let x = 0; x < canvas.width; x += 5) {
          const y = baseY - (x * 0.15) + Math.sin((x * frequency) + speed) * amplitude;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Draw floating dots
      for (let i = 0; i < 20; i++) {
        const x = ((i * 97 + offset * 0.5) % canvas.width);
        const y = canvas.height - (x * 0.2) + Math.sin(x * 0.01 + offset) * 50 - (i * 30);
        const size = 2 + Math.sin(offset + i) * 1;
        
        ctx.beginPath();
        ctx.fillStyle = `rgba(59, 130, 246, ${0.2 + Math.sin(offset + i) * 0.1})`;
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      offset += 0.02;
      animationFrame = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.6 }}
    />
  );
}

// Bouncing Logo Component
function BouncingLogo() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link 
      to="/" 
      className="flex items-center gap-3"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <img 
        src={manifedLogo} 
        alt="ManiFed" 
        className={`w-12 h-12 rounded-lg transition-transform duration-300 ${isHovered ? 'animate-bounce-subtle' : ''}`}
      />
      <span className="font-display text-xl font-bold text-foreground hidden sm:block">ManiFed</span>
    </Link>
  );
}

export default function Landing() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const products = [
    {
      title: "Treasury Bonds",
      description: "Fixed-income Treasury Bonds with 6% APY. Guaranteed yields at maturity.",
      icon: FileText,
      link: "/bonds",
      free: true,
    },
    {
      title: "P2P Loans",
      description: "Peer-to-peer marketplace for prediction market loans. 2% fee on funded loans.",
      icon: TrendingUp,
      link: "/marketplace",
      free: true,
    },
    {
      title: "ManiFed Fintech",
      description: "Premium AI tools: Arbitrage Scanner, Market Agent, Index Funds, and more.",
      icon: Sparkles,
      link: "/fintech",
      free: false,
      badge: "Premium",
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      <RisingChartBackground />

      {/* Horizontal Navigation Bar */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <BouncingLogo />
            
            {/* Main Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <Link to="/bonds">
                <Button variant="ghost" size="sm" className="font-serif">
                  Treasury
                </Button>
              </Link>
              <Link to="/marketplace">
                <Button variant="ghost" size="sm" className="font-serif">
                  P2P Loans
                </Button>
              </Link>
              <Link to="/fintech">
                <Button variant="ghost" size="sm" className="font-serif">
                  ManiFed Fintech
                </Button>
              </Link>
              <Link to="/credit-search">
                <Button variant="ghost" size="sm" className="font-serif">
                  Tools
                </Button>
              </Link>
            </nav>

            {/* Auth Buttons */}
            <div className="flex items-center gap-2">
              <Link to="/auth">
                <Button variant="ghost" size="sm" className="font-serif">
                  Sign In
                </Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button size="sm" className="font-serif bg-foreground text-background hover:bg-foreground/90">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-border px-4 py-2 overflow-x-auto">
          <div className="flex gap-2">
            <Link to="/bonds">
              <Button variant="outline" size="sm" className="font-serif whitespace-nowrap">Treasury</Button>
            </Link>
            <Link to="/marketplace">
              <Button variant="outline" size="sm" className="font-serif whitespace-nowrap">P2P Loans</Button>
            </Link>
            <Link to="/fintech">
              <Button variant="outline" size="sm" className="font-serif whitespace-nowrap">Fintech</Button>
            </Link>
            <Link to="/credit-search">
              <Button variant="outline" size="sm" className="font-serif whitespace-nowrap">Tools</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero Section with Parallax */}
        <section 
          className="container mx-auto px-4 py-24 md:py-32 text-center relative"
          style={{ transform: `translateY(${scrollY * 0.1}px)` }}
        >
          <div className="animate-slide-up max-w-4xl mx-auto">
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold italic text-foreground mb-8 leading-tight">
              The Golden Age of Manifold is Here
            </h1>
            <p className="font-serif text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-12">
              Manifold's decentralized financial institution. Treasury bonds, peer-to-peer lending, 
              and premium fintech tools for the prediction market ecosystem.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="font-serif text-lg px-8 py-6 bg-foreground text-background hover:bg-foreground/90">
                  Start Trading <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/about">
                <Button variant="outline" size="lg" className="font-serif text-lg px-8 py-6">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Products Grid */}
        <section 
          className="container mx-auto px-4 py-16"
          style={{ transform: `translateY(${scrollY * 0.05}px)` }}
        >
          <div className="text-center mb-12 animate-slide-up">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Our Products
            </h2>
            <p className="font-serif text-muted-foreground max-w-xl mx-auto">
              Financial instruments designed for the prediction market ecosystem
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {products.map((product, index) => (
              <Card 
                key={product.title} 
                className="glass border-border/50 animate-slide-up hover:border-accent/50 transition-all hover:-translate-y-1"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                      <product.icon className="w-6 h-6 text-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display text-lg font-bold text-foreground">{product.title}</h3>
                      {product.badge && (
                        <Badge variant="secondary" className="text-xs mt-0.5 bg-accent text-accent-foreground">
                          {product.badge}
                        </Badge>
                      )}
                      {product.free && (
                        <Badge variant="outline" className="text-xs mt-0.5">
                          Free
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="font-serif text-sm text-muted-foreground mb-4">{product.description}</p>
                  <Link to={product.link}>
                    <Button variant="outline" className="w-full font-serif gap-2" size="sm">
                      Access <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Disclaimer */}
        <section className="container mx-auto px-4 py-8">
          <Card className="glass border-warning/30 animate-slide-up max-w-4xl mx-auto">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-warning/10 shrink-0">
                  <Shield className="w-6 h-6 text-warning" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-display font-semibold text-foreground">Important Disclaimer</h3>
                  <p className="font-serif text-sm text-muted-foreground">
                    ManiFed is an experimental platform for peer-to-peer M$ lending. All transactions are conducted in
                    Manifold Markets' virtual currency (M$) and have no real-world monetary value. Loans are
                    <strong className="text-foreground"> not legally enforceable</strong> and depend entirely on the
                    borrower's reputation and goodwill to repay.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Contact Section */}
        <section className="container mx-auto px-4 py-8">
          <Card className="glass animate-slide-up max-w-4xl mx-auto">
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="font-display font-semibold text-foreground mb-2">Questions or Need Help?</h3>
                <p className="font-serif text-sm text-muted-foreground mb-4">
                  Reach out to us anytime:
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <a href="https://manifold.markets/ManiFed" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-accent hover:underline font-serif">
                    <Landmark className="w-4 h-4" />
                    @ManiFed on Manifold
                  </a>
                  <span className="hidden sm:inline text-muted-foreground">•</span>
                  <a target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-accent hover:underline font-serif" href="https://discord.com/users/1443255374089289840">
                    Discord: @manifed
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <footer className="border-t border-border mt-16">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img src={manifedLogo} alt="ManiFed" className="w-8 h-8 rounded" />
                <span className="font-display font-semibold text-foreground">ManiFed</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-serif">
                <Link to="/terms" className="text-muted-foreground hover:text-accent transition-colors">Terms of Service</Link>
                <span className="text-muted-foreground/50">•</span>
                <Link to="/privacy" className="text-muted-foreground hover:text-accent transition-colors">Privacy Policy</Link>
                <span className="text-muted-foreground/50">•</span>
                <Link to="/about" className="text-muted-foreground hover:text-accent transition-colors">About</Link>
              </div>
              <p className="font-serif text-sm text-muted-foreground">All transactions in M$</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}