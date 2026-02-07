import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import manifedLogo from "@/assets/manifed-logo-new.png";

// Football field animated background
function FootballFieldBackground() {
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

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Dark green field gradient
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0a1a0a");
      bg.addColorStop(0.5, "#0d2810");
      bg.addColorStop(1, "#061206");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Yard lines (horizontal)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 2;
      const yardSpacing = h / 12;
      for (let i = 1; i < 12; i++) {
        const y = i * yardSpacing;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Hash marks on the sides
      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 12; i++) {
        const y = i * yardSpacing;
        // Left hash
        ctx.beginPath();
        ctx.moveTo(w * 0.3, y - 8);
        ctx.lineTo(w * 0.3, y + 8);
        ctx.stroke();
        // Right hash
        ctx.beginPath();
        ctx.moveTo(w * 0.7, y - 8);
        ctx.lineTo(w * 0.7, y + 8);
        ctx.stroke();
      }

      // End zone highlight at top
      const endZone = ctx.createLinearGradient(0, 0, 0, h * 0.08);
      endZone.addColorStop(0, "rgba(218, 165, 32, 0.08)");
      endZone.addColorStop(1, "transparent");
      ctx.fillStyle = endZone;
      ctx.fillRect(0, 0, w, h * 0.08);

      // Floating football particles
      for (let i = 0; i < 8; i++) {
        const angle = time * 0.3 + i * (Math.PI * 2 / 8);
        const x = w * 0.5 + Math.cos(angle) * (w * 0.35) + Math.sin(time + i) * 30;
        const y = h * 0.4 + Math.sin(angle) * (h * 0.25) + Math.cos(time * 0.7 + i) * 20;
        const alpha = 0.15 + Math.sin(time + i * 0.5) * 0.08;

        // Football shape (elongated ellipse)
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle + time * 0.2);
        ctx.fillStyle = `rgba(139, 90, 43, ${alpha})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, 12, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Laces
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-4, 0);
        ctx.lineTo(4, 0);
        ctx.stroke();
        for (let j = -3; j <= 3; j += 2) {
          ctx.beginPath();
          ctx.moveTo(j, -2);
          ctx.lineTo(j, 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Glow effect at center
      const glow = ctx.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h * 0.45, w * 0.4);
      glow.addColorStop(0, "rgba(218, 165, 32, 0.04)");
      glow.addColorStop(0.5, "rgba(34, 139, 34, 0.02)");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      time += 0.01;
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
    />
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <FootballFieldBackground />

      {/* Floating Glass Header */}
      <header className="sticky top-4 z-50 mx-4 md:mx-8">
        <div className="max-w-4xl mx-auto bg-[#0d1f0d]/60 backdrop-blur-xl border border-[#2a5a2a]/40 rounded-2xl shadow-lg shadow-black/20">
          <div className="flex items-center justify-between py-3 px-6">
            <Link to="/" className="flex items-center gap-3">
              <img src={manifedLogo} alt="ManiFed" className="h-10" />
              <span className="font-display text-xl font-bold text-[#daa520]">ManiFed</span>
            </Link>
            <div className="flex items-center gap-2">
              <Link to="/auth">
                <Button variant="ghost" size="sm" className="text-[#8fbc8f] hover:text-white font-serif">
                  Sign In
                </Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button size="sm" className="bg-[#daa520] text-[#0a1a0a] hover:bg-[#c4941d] font-serif font-bold">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="container mx-auto px-4 py-20 md:py-32 text-center">
          <div className="max-w-3xl mx-auto animate-slide-up">
            <div className="mb-6">
              <span className="text-5xl md:text-7xl">🏈</span>
            </div>
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold italic leading-tight mb-6">
              <span className="text-[#daa520]">Super Bowl</span>{" "}
              <span className="text-white">Trading</span>{" "}
              <span className="text-[#228b22]">Terminal</span>
            </h1>
            <p className="font-serif text-xl md:text-2xl text-[#8fbc8f] max-w-2xl mx-auto mb-10">
              Trade Super Bowl prediction markets with lightning-fast keyboard shortcuts.
              The game is on — are you ready to play?
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
              <Link to="/auth?redirect=/terminal">
                <Button
                  size="lg"
                  className="font-serif text-lg px-12 py-7 bg-[#daa520] text-[#0a1a0a] hover:bg-[#c4941d] font-bold shadow-lg shadow-[#daa520]/20 transition-all hover:scale-105"
                >
                  Enter the Terminal 🏈
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                emoji: "⚡",
                title: "Instant Execution",
                description: "Keyboard-driven trading with hotkeys. Execute orders in milliseconds.",
              },
              {
                emoji: "📊",
                title: "Live Charts",
                description: "Real-time probability charts with multiple time frames for binary markets.",
              },
              {
                emoji: "🏟️",
                title: "Super Bowl Mode",
                description: "Curated Super Bowl markets with live odds. Football-themed trading experience.",
              },
            ].map((feature, i) => (
              <Card
                key={feature.title}
                className="bg-[#0d1f0d]/60 backdrop-blur-sm border-[#2a5a2a]/40 hover:border-[#daa520]/40 transition-all hover:-translate-y-1 animate-slide-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <CardContent className="p-6 text-center">
                  <span className="text-4xl mb-4 block">{feature.emoji}</span>
                  <h3 className="font-display text-lg font-bold text-[#daa520] mb-2">{feature.title}</h3>
                  <p className="font-serif text-sm text-[#8fbc8f]">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-16 text-center">
          <Card className="bg-[#0d1f0d]/60 backdrop-blur-sm border-[#2a5a2a]/40 max-w-2xl mx-auto animate-slide-up">
            <CardContent className="p-8">
              <h2 className="font-display text-3xl font-bold text-white mb-3">Ready to Trade?</h2>
              <p className="font-serif text-[#8fbc8f] mb-6">
                Sign up and start trading Super Bowl markets on ManiFed Terminal.
              </p>
              <Link to="/auth?mode=signup&redirect=/terminal">
                <Button
                  size="lg"
                  className="bg-[#228b22] text-white hover:bg-[#1e7a1e] font-serif font-bold px-10 py-6 text-lg"
                >
                  Create Account
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <footer className="border-t border-[#2a5a2a]/30 mt-8">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img src={manifedLogo} alt="ManiFed" className="h-6" />
                <span className="font-display font-semibold text-[#daa520]">ManiFed</span>
              </div>
              <p className="text-sm text-[#5a7a5a]">© 2025 ManiFed. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
