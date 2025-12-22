import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart3, Search, TrendingUp, Target } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, Scatter, ScatterChart } from "recharts";

interface CalibrationData {
  bucket: number;
  resolution: number;
  count: number;
}

interface CalibrationResult {
  username: string;
  brierScore: number;
  totalBets: number;
  calibrationData: CalibrationData[];
  accuracy: number;
}

export default function CalibrationGraph() {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CalibrationResult | null>(null);

  const fetchCalibration = async () => {
    if (!username.trim()) {
      toast({ title: "Enter Username", description: "Please enter a Manifold username.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      // Fetch all user bets from Manifold API
      const response = await fetch(`https://api.manifold.markets/v0/bets?username=${username}&limit=1000`);
      if (!response.ok) throw new Error("Failed to fetch user bets");
      
      const bets = await response.json();
      
      if (bets.length === 0) {
        toast({ title: "No Bets Found", description: `User ${username} has no bets.`, variant: "destructive" });
        setIsLoading(false);
        return;
      }

      // Group by contract and get resolved ones
      const contractIds = [...new Set(bets.map((b: any) => b.contractId))];
      
      // Fetch market data for resolved contracts
      const resolvedBets: { probability: number; outcome: boolean }[] = [];
      
      // Process in batches to avoid rate limiting
      for (let i = 0; i < Math.min(contractIds.length, 100); i++) {
        const contractId = contractIds[i];
        try {
          const marketRes = await fetch(`https://api.manifold.markets/v0/market/${contractId}`);
          if (!marketRes.ok) continue;
          
          const market = await marketRes.json();
          
          if (market.isResolved && market.resolution === 'YES' || market.resolution === 'NO') {
            const userBetsOnContract = bets.filter((b: any) => b.contractId === contractId);
            
            for (const bet of userBetsOnContract) {
              // Get probability at time of bet
              const prob = bet.probAfter || bet.probBefore || 0.5;
              const wasYesBet = bet.outcome === 'YES';
              const marketResolvedYes = market.resolution === 'YES';
              
              // If bet YES and resolved YES, or bet NO and resolved NO = correct
              const wasCorrect = wasYesBet === marketResolvedYes;
              
              // For calibration: what probability did they assign and was it correct?
              const effectiveProbability = wasYesBet ? prob : 1 - prob;
              
              resolvedBets.push({
                probability: effectiveProbability,
                outcome: wasCorrect
              });
            }
          }
        } catch (e) {
          // Skip failed requests
        }
        
        // Rate limiting
        if (i % 10 === 0) await new Promise(r => setTimeout(r, 100));
      }

      if (resolvedBets.length < 10) {
        toast({ title: "Not Enough Data", description: `Only found ${resolvedBets.length} resolved bets. Need at least 10.`, variant: "destructive" });
        setIsLoading(false);
        return;
      }

      // Calculate calibration data by bucketing probabilities
      const buckets = Array.from({ length: 10 }, (_, i) => ({
        bucket: (i + 0.5) * 10,
        correct: 0,
        total: 0,
      }));

      for (const bet of resolvedBets) {
        const bucketIndex = Math.min(Math.floor(bet.probability * 10), 9);
        buckets[bucketIndex].total++;
        if (bet.outcome) buckets[bucketIndex].correct++;
      }

      const calibrationData = buckets
        .filter(b => b.total > 0)
        .map(b => ({
          bucket: b.bucket,
          resolution: (b.correct / b.total) * 100,
          count: b.total,
        }));

      // Calculate Brier score
      let brierSum = 0;
      for (const bet of resolvedBets) {
        const outcome = bet.outcome ? 1 : 0;
        brierSum += Math.pow(bet.probability - outcome, 2);
      }
      const brierScore = brierSum / resolvedBets.length;

      // Calculate overall accuracy
      const correctCount = resolvedBets.filter(b => b.outcome).length;
      const accuracy = (correctCount / resolvedBets.length) * 100;

      setResult({
        username,
        brierScore,
        totalBets: resolvedBets.length,
        calibrationData,
        accuracy,
      });

    } catch (error) {
      console.error('Calibration error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch calibration data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Calibration Graph
          </CardTitle>
          <CardDescription>
            Enter a Manifold username to see their prediction calibration. A well-calibrated predictor's 
            graph follows the diagonal line - when they bet 70%, they're right 70% of the time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label>Manifold Username</Label>
              <Input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g., JamesBriggs"
                className="mt-1"
                onKeyDown={e => e.key === 'Enter' && fetchCalibration()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchCalibration} disabled={isLoading} className="gap-2">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Analyze
              </Button>
            </div>
          </div>

          {result && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">Brier Score</p>
                    <p className={`text-2xl font-bold ${result.brierScore < 0.15 ? 'text-success' : result.brierScore < 0.25 ? 'text-warning' : 'text-destructive'}`}>
                      {result.brierScore.toFixed(3)}
                    </p>
                    <p className="text-xs text-muted-foreground">Lower is better</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">Accuracy</p>
                    <p className="text-2xl font-bold text-primary">{result.accuracy.toFixed(1)}%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">Resolved Bets</p>
                    <p className="text-2xl font-bold text-foreground">{result.totalBets}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">Calibration</p>
                    <Badge variant={result.brierScore < 0.2 ? "success" : "secondary"}>
                      {result.brierScore < 0.15 ? "Excellent" : result.brierScore < 0.2 ? "Good" : result.brierScore < 0.25 ? "Fair" : "Needs Work"}
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              {/* Chart */}
              <Card>
                <CardContent className="p-4">
                  <p className="font-medium mb-4">Calibration Curve for @{result.username}</p>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={result.calibrationData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="bucket" 
                          label={{ value: '↑ Predicted Probability (%)', position: 'bottom', offset: 0 }}
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <YAxis 
                          label={{ value: '↑ Resolution (%)', angle: -90, position: 'insideLeft' }}
                          stroke="hsl(var(--muted-foreground))"
                          domain={[0, 100]}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number, name: string) => [
                            name === 'resolution' ? `${value.toFixed(1)}%` : value,
                            name === 'resolution' ? 'Actual Resolution' : 'Bet Count'
                          ]}
                          labelFormatter={(label) => `Predicted: ${label}%`}
                        />
                        <Legend />
                        {/* Perfect calibration line */}
                        <ReferenceLine 
                          segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]} 
                          stroke="hsl(var(--muted-foreground))" 
                          strokeDasharray="5 5"
                          label={{ value: 'Perfect Calibration', position: 'end' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="resolution" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={3}
                          dot={{ r: 8, fill: 'hsl(var(--primary))' }}
                          name="Actual Resolution"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    Points above the line = overconfident, below = underconfident
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
