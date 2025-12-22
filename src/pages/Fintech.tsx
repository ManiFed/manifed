import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, TrendingUp, BarChart3, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Footer from "@/components/layout/Footer";
import IndexFunds from "@/components/fintech/IndexFunds";
import CalibrationGraph from "@/components/fintech/CalibrationGraph";
import BotPlayground from "@/components/fintech/BotPlayground";

export default function Fintech() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(!!user);
    });
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to={isAuthenticated ? "/hub" : "/"} className="flex items-center gap-3">
              <img alt="ManiFed" className="w-10 h-10 rounded-xl object-cover" src="/lovable-uploads/8cbf6124-13eb-440c-bd86-70a83fae6c42.png" />
              <span className="text-lg font-bold text-gradient">ManiFed Fintech</span>
            </Link>
            <Link to={isAuthenticated ? "/hub" : "/"}>
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">Fintech Tools</h1>
          <p className="text-muted-foreground">Advanced prediction market analysis and trading tools</p>
        </div>

        <Tabs defaultValue="index-funds" className="space-y-6">
          <TabsList className="grid w-full max-w-lg mx-auto grid-cols-3">
            <TabsTrigger value="index-funds" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Index Funds
            </TabsTrigger>
            <TabsTrigger value="calibration" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Calibration
            </TabsTrigger>
            <TabsTrigger value="bot-builder" className="gap-2">
              <Bot className="w-4 h-4" />
              Bot Builder
            </TabsTrigger>
          </TabsList>

          <TabsContent value="index-funds">
            <IndexFunds />
          </TabsContent>

          <TabsContent value="calibration">
            <CalibrationGraph />
          </TabsContent>

          <TabsContent value="bot-builder">
            <BotPlayground />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
