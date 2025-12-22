import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Code, Plus, Copy, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BotStrategy {
  id: string;
  name: string;
  description: string;
  codeSnippet: string;
}

export default function BotPlayground() {
  const [strategies, setStrategies] = useState<BotStrategy[]>([]);
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    fetchStrategies();
  }, []);

  const fetchStrategies = async () => {
    // Fetch admin-customizable bot strategies
    const { data } = await supabase
      .from('trading_bots')
      .select('*')
      .eq('strategy', 'playground_strategy');

    if (data && data.length > 0) {
      const parsed = data.map(bot => ({
        id: bot.id,
        name: bot.name,
        description: bot.description || '',
        codeSnippet: (bot.config as any)?.codeSnippet || '// Strategy code here',
      }));
      setStrategies(parsed);
    } else {
      // Default strategies if none are configured
      setStrategies([
        {
          id: 'mispriced',
          name: 'Mispriced Markets',
          description: 'Bet against extreme probabilities (>95% or <5%)',
          codeSnippet: `// Mispriced Markets Strategy
const markets = await fetchMarkets(100);
const candidates = markets.filter(m => 
  m.probability > 0.95 || m.probability < 0.05
);

for (const market of candidates) {
  const outcome = market.probability > 0.5 ? "NO" : "YES";
  await placeBet(market.id, betAmount, outcome);
}`,
        },
        {
          id: 'high_volume',
          name: 'High Volume Trader',
          description: 'Follow momentum on high-volume markets',
          codeSnippet: `// High Volume Momentum Strategy
const markets = await fetchMarkets(50);
const highVolume = markets.filter(m => 
  m.volume24Hours > 500
);

for (const market of highVolume) {
  // Bet with the trend
  const outcome = market.probability > 0.5 ? "YES" : "NO";
  await placeBet(market.id, betAmount, outcome);
}`,
        },
        {
          id: 'contrarian',
          name: 'Contrarian',
          description: 'Fade recent large movements',
          codeSnippet: `// Contrarian Strategy
const markets = await fetchMarkets(100);
const recentMoves = markets.filter(m => 
  m.volume24Hours > 300 &&
  (m.probability > 0.8 || m.probability < 0.2)
);

for (const market of recentMoves) {
  // Bet against the crowd
  const outcome = market.probability > 0.5 ? "NO" : "YES";
  await placeBet(market.id, betAmount, outcome);
}`,
        },
        {
          id: 'liquidity_provider',
          name: 'Liquidity Provider',
          description: 'Provide balanced liquidity on mid-range markets',
          codeSnippet: `// Liquidity Provider Strategy
const markets = await fetchMarkets(50);
const midRange = markets.filter(m => 
  m.totalLiquidity > 500 &&
  m.probability > 0.3 && m.probability < 0.7
);

for (const market of midRange.slice(0, 5)) {
  // Place balanced orders
  await placeBet(market.id, betAmount / 2, "YES");
  await placeBet(market.id, betAmount / 2, "NO");
}`,
        },
      ]);
    }
    setIsLoading(false);
  };

  const toggleStrategy = (strategyId: string) => {
    setSelectedStrategies(prev => 
      prev.includes(strategyId)
        ? prev.filter(id => id !== strategyId)
        : [...prev, strategyId]
    );
  };

  const generateBotCode = () => {
    const selectedStrats = strategies.filter(s => selectedStrategies.includes(s.id));
    
    const code = `// ManiFed Trading Bot
// Generated with strategies: ${selectedStrats.map(s => s.name).join(', ')}

const API_KEY = 'YOUR_MANIFOLD_API_KEY';
const betAmount = 10; // M$ per trade

async function fetchMarkets(limit = 100) {
  const response = await fetch(
    \`https://api.manifold.markets/v0/markets?limit=\${limit}&sort=liquidity\`
  );
  const markets = await response.json();
  return markets.filter(m => !m.isResolved && m.probability !== undefined);
}

async function placeBet(contractId, amount, outcome) {
  const response = await fetch('https://api.manifold.markets/v0/bet', {
    method: 'POST',
    headers: {
      'Authorization': \`Key \${API_KEY}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ contractId, amount, outcome }),
  });
  
  if (!response.ok) {
    console.error('Bet failed:', await response.text());
    return false;
  }
  
  console.log(\`Placed \${outcome} bet of M$\${amount} on \${contractId}\`);
  return true;
}

async function runBot() {
  console.log('Starting trading bot...');
  
${selectedStrats.map(s => `  // === ${s.name} ===
  // ${s.description}
  {
${s.codeSnippet.split('\n').map(line => '    ' + line).join('\n')}
  }
`).join('\n')}
  
  console.log('Bot run complete!');
}

// Run the bot
runBot().catch(console.error);
`;
    
    return code;
  };

  const copyCode = () => {
    const code = generateBotCode();
    navigator.clipboard.writeText(code);
    setHasCopied(true);
    toast({ title: 'Copied!', description: 'Bot code copied to clipboard.' });
    setTimeout(() => setHasCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <Card className="glass">
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            Bot Building Playground
          </CardTitle>
          <CardDescription>
            Mix and match trading strategies to generate your own Manifold trading bot. 
            Select strategies below and copy the generated code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Strategy Selection */}
          <div className="space-y-4">
            <Label>Select Strategies to Include</Label>
            <div className="grid sm:grid-cols-2 gap-4">
              {strategies.map(strategy => (
                <Card 
                  key={strategy.id}
                  className={`cursor-pointer transition-all ${
                    selectedStrategies.includes(strategy.id) 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => toggleStrategy(strategy.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedStrategies.includes(strategy.id)}
                        onCheckedChange={() => toggleStrategy(strategy.id)}
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold">{strategy.name}</h4>
                        <p className="text-sm text-muted-foreground">{strategy.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Generated Code */}
          {selectedStrategies.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  Generated Bot Code
                </Label>
                <Button 
                  variant={hasCopied ? "default" : "outline"} 
                  size="sm" 
                  onClick={copyCode}
                  className="gap-2"
                >
                  {hasCopied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {hasCopied ? 'Copied!' : 'Copy Code'}
                </Button>
              </div>
              <Textarea
                value={generateBotCode()}
                readOnly
                className="font-mono text-xs h-[400px] bg-secondary/30"
              />
              <p className="text-sm text-muted-foreground">
                Copy this code and run it with Node.js or Deno. Replace <code>YOUR_MANIFOLD_API_KEY</code> with your actual API key.
              </p>
            </div>
          )}

          {selectedStrategies.length === 0 && (
            <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
              <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select strategies above to generate your trading bot code.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
