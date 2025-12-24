import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  TrendingUp,
  FileText,
  Shield,
  ArrowRight,
  Sparkles,
  Landmark,
  ChevronDown,
  MoreHorizontal,
  Info,
} from "lucide-react";
import manifedLogo from "@/assets/manifed-logo-new.png";
import { PenguinAnimation } from "@/components/PenguinAnimation";

// 3D Graph Animation with Axes and Camera Panning
function RisingChartBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    let animationFrame: number;
    let time = 0;

    // Generate smooth chart data points
    const generateChartData = (offset: number): number[] => {
      const points: number[] = [];
      for (let i = 0; i < 200; i++) {
        // Upward trending line with some variation
        const trend = i * 2.5;
        const wave = Math.sin(i * 0.05 + offset) * 20;
        const noise = Math.sin(i * 0.2 + offset * 2) * 10;
        points.push(trend + wave + noise);
      }
      return points;
    };
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2 + 200;

      // Camera rotation for 3D effect
      const cameraAngleX = Math.sin(time * 0.3) * 0.1 + 0.2;
      const cameraAngleY = Math.cos(time * 0.2) * 0.15;

      // Dynamic scale based on screen size for full coverage
      const baseScale = Math.max(canvas.width, canvas.height) / 800;

      // 3D projection helper
      const project3D = (x: number, y: number, z: number) => {
        const scale = baseScale;
        const px = x * Math.cos(cameraAngleY) - z * Math.sin(cameraAngleY);
        const pz = x * Math.sin(cameraAngleY) + z * Math.cos(cameraAngleY);
        const py = y * Math.cos(cameraAngleX) - pz * Math.sin(cameraAngleX);
        return {
          x: centerX + px * scale,
          y: centerY - py * scale + 50,
        };
      };

      // Draw grid floor
      ctx.strokeStyle = "rgba(59, 130, 246, 0.08)";
      ctx.lineWidth = 1;
      const gridSize = 400;
      const gridStep = 40;
      for (let i = -gridSize; i <= gridSize; i += gridStep) {
        // X lines
        const p1 = project3D(i, 0, -gridSize);
        const p2 = project3D(i, 0, gridSize);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // Z lines
        const p3 = project3D(-gridSize, 0, i);
        const p4 = project3D(gridSize, 0, i);
        ctx.beginPath();
        ctx.moveTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.stroke();
      }

      // Draw axes
      ctx.lineWidth = 2;

      // X axis (horizontal)
      ctx.strokeStyle = "rgba(59, 130, 246, 0.3)";
      const xAxisStart = project3D(-gridSize, 0, 0);
      const xAxisEnd = project3D(gridSize, 0, 0);
      ctx.beginPath();
      ctx.moveTo(xAxisStart.x, xAxisStart.y);
      ctx.lineTo(xAxisEnd.x, xAxisEnd.y);
      ctx.stroke();

      // Y axis (vertical - price)
      ctx.strokeStyle = "rgba(34, 197, 94, 0.4)";
      const yAxisStart = project3D(0, 0, 0);
      const yAxisEnd = project3D(0, 400, 0);
      ctx.beginPath();
      ctx.moveTo(yAxisStart.x, yAxisStart.y);
      ctx.lineTo(yAxisEnd.x, yAxisEnd.y);
      ctx.stroke();

      // Z axis (depth)
      ctx.strokeStyle = "rgba(59, 130, 246, 0.2)";
      const zAxisStart = project3D(0, 0, -gridSize);
      const zAxisEnd = project3D(0, 0, gridSize);
      ctx.beginPath();
      ctx.moveTo(zAxisStart.x, zAxisStart.y);
      ctx.lineTo(zAxisEnd.x, zAxisEnd.y);
      ctx.stroke();

      // Draw the main rising line
      const chartData = generateChartData(time);
      const scrollOffset = time * 50;

      // Main line with glow
      ctx.strokeStyle = "rgba(34, 197, 94, 0.6)";
      ctx.lineWidth = 3;
      ctx.shadowColor = "rgba(34, 197, 94, 0.5)";
      ctx.shadowBlur = 15;
      ctx.beginPath();
      let first = true;
      for (let i = 0; i < chartData.length; i++) {
        const x = (i - 100) * 4 - (scrollOffset % 800);
        const y = chartData[i];
        const z = 0;
        if (x < -gridSize || x > gridSize) continue;
        const p = project3D(x, y, z);
        if (first) {
          ctx.moveTo(p.x, p.y);
          first = false;
        } else {
          ctx.lineTo(p.x, p.y);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw candlestick markers at intervals
      for (let i = 0; i < chartData.length; i += 15) {
        const x = (i - 100) * 4 - (scrollOffset % 800);
        if (x < -gridSize || x > gridSize) continue;
        const y = chartData[i];
        const p = project3D(x, y, 0);

        // Draw marker dot
        ctx.fillStyle = "rgba(34, 197, 94, 0.8)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Draw vertical line to base
        const base = project3D(x, 0, 0);
        ctx.strokeStyle = "rgba(34, 197, 94, 0.15)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(base.x, base.y);
        ctx.stroke();
      }

      // Floating particles
      for (let i = 0; i < 15; i++) {
        const angle = time * 0.5 + i * ((Math.PI * 2) / 15);
        const radius = 200 + Math.sin(time + i) * 50;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = 200 + Math.sin(time * 2 + i) * 100;
        const p = project3D(x, y, z);
        const size = 2 + Math.sin(time + i) * 1;
        ctx.fillStyle = `rgba(59, 130, 246, ${0.2 + Math.sin(time + i) * 0.1})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      time += 0.008;
      animationFrame = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{
        opacity: 0.85,
      }}
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
        className={`h-28 transition-transform duration-300 ${isHovered ? "animate-bounce-subtle" : ""}`}
      />
    </Link>
  );
}
export default function Landing() {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
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
      description: "Peer-to-peer marketplace for prediction market loans. 0.5% fee on funded loans.",
      icon: TrendingUp,
      link: "/marketplace",
      free: true,
    },
    {
      title: "ManiFed Fintech",
      description: "Premium AI tools: Arbitrage Scanner, Market Agent, Index Funds, and more.",
      icon: Sparkles,
      link: "/fintech/menu",
      free: false,
      badge: "Premium",
    },
  ];
  return (
    <div className="min-h-screen relative overflow-hidden">
      <RisingChartBackground />

      {/* Floating Glass Island Navigation Bar */}
      <header className="sticky top-4 z-50 mx-4 md:mx-8">
        <div className="max-w-6xl mx-auto bg-background/40 backdrop-blur-xl border border-border/50 rounded-2xl shadow-lg shadow-black/5">
          <div className="flex items-center justify-between py-2 px-6">
            <BouncingLogo />

            {/* Main Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <Link to="/auth?redirect=/bonds">
                <Button variant="ghost" size="sm" className="font-serif">
                  Treasury
                </Button>
              </Link>
              <Link to="/auth?redirect=/marketplace">
                <Button variant="ghost" size="sm" className="font-serif">
                  P2P Loans
                </Button>
              </Link>
              <Link to="/auth?redirect=/fintech/menu">
                <Button variant="ghost" size="sm" className="font-serif">
                  Fintech
                </Button>
              </Link>
              <Link to="/auth?redirect=/about">
                <Button variant="ghost" size="sm" className="font-serif">
                  About
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
      </header>

      {/* Mobile Navigation */}
      <div className="md:hidden sticky top-20 z-40 mx-4 mt-2">
        <div className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-xl px-4 py-2 overflow-x-auto">
          <div className="flex gap-2">
            <Link to="/auth?redirect=/bonds">
              <Button variant="outline" size="sm" className="font-serif whitespace-nowrap">
                Treasury
              </Button>
            </Link>
            <Link to="/auth?redirect=/marketplace">
              <Button variant="outline" size="sm" className="font-serif whitespace-nowrap">
                P2P Loans
              </Button>
            </Link>
            <Link to="/fintech">
              <Button variant="outline" size="sm" className="font-serif whitespace-nowrap">
                Fintech
              </Button>
            </Link>
            <Link to="/about">
              <Button variant="outline" size="sm" className="font-serif whitespace-nowrap">
                About
              </Button>
            </Link>
          </div>
        </div>
      </div>
      <main className="relative z-10">
        {/* Hero Section with Parallax */}
        <section
          className="container mx-auto px-4 py-24 md:py-32 text-center relative"
          style={{
            transform: `translateY(${scrollY * 0.1}px)`,
          }}
        >
          <div className="animate-slide-up max-w-4xl mx-auto">
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold italic text-foreground mb-8 leading-tight">
              The <span className="text-amber-400">Golden</span> Age of Manifold is Here
            </h1>
            <p className="font-serif text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-12">
              Manifold's decentralized financial institution. Treasury bonds, peer-to-peer lending, and premium fintech
              tools for the prediction market ecosystem.
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
              <Link to="/auth?mode=signup">
                <Button
                  size="lg"
                  className="font-serif text-lg px-10 py-6 bg-foreground text-background hover:bg-foreground/90"
                >
                  Get Started <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Penguin Animation */}
            <div className="mt-12 flex justify-center"></div>
          </div>
        </section>

        {/* Products Grid */}
        <section
          className="container mx-auto px-4 py-16"
          style={{
            transform: `translateY(${scrollY * 0.05}px)`,
          }}
        >
          <div className="text-center mb-12 animate-slide-up">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">Our Products</h2>
            <p className="font-serif text-muted-foreground max-w-xl mx-auto">
              Financial instruments designed for the prediction market ecosystem
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {products.map((product, index) => (
              <Card
                key={product.title}
                className="glass border-border/50 animate-slide-up hover:border-accent/50 transition-all hover:-translate-y-1"
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
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
                <p className="font-serif text-sm text-muted-foreground mb-4">Contact the POTUS and Fed Chair at:</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <a
                    href="https://manifold.markets/ManiFed"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-accent hover:underline font-serif"
                  >
                    <Landmark className="w-4 h-4" />
                    @ManiFed on Manifold
                  </a>
                  <span className="hidden sm:inline text-muted-foreground">•</span>
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-accent hover:underline font-serif"
                    href="https://discord.com/users/1443255374089289840"
                  >
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
                <img src={manifedLogo} alt="ManiFed" className="h-8" />
                <span className="font-display font-semibold text-foreground">ManiFed</span>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <Link to="/terms" className="hover:text-foreground transition-colors">
                  Terms
                </Link>
                <Link to="/privacy" className="hover:text-foreground transition-colors">
                  Privacy
                </Link>
                <Link to="/about" className="hover:text-foreground transition-colors">
                  About
                </Link>
              </div>
              <p className="text-sm text-muted-foreground">© 2025 ManiFed. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
