import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users, Target, Copy, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Position {
  outcome: string;
  shares: number;
  invested: number;
  probability: number;
  answerId?: string;
  answerText?: string;
}

interface CopyTradeOrderProps {
  apiKey: string;
  onOrderPlaced?: () => void;
}

export default function CopyTradeOrder({ apiKey, onOrderPlaced }: CopyTradeOrderProps) {
  const [marketUrl, setMarketUrl] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [market, setMarket] = useState<any>(null);
  const [targetPosition, setTargetPosition] = useState<Position | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [copyType, setCopyType] = useState<'percentage' | 'amount'>('percentage');
  const [copyValue, setCopyValue] = useState('');
  const [includeLimits, setIncludeLimits] = useState(false);

  const extractMarketId = (url: string): string | null => {
    const patterns = [
      /manifold\.markets\/[^/]+\/([a-zA-Z0-9-]+)/,
      /^([a-zA-Z0-9-]+)$/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const loadMarket = async () => {
    const marketId = extractMarketId(marketUrl);
    if (!marketId) {
      toast({ title: 'Invalid URL', description: 'Could not parse market URL', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`https://api.manifold.markets/v0/slug/${marketId}`);
      if (!response.ok) throw new Error('Market not found');
      const data = await response.json();
      setMarket(data);
      setTargetPosition(null);
      setSelectedAnswer('');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load market', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPosition = async () => {
    if (!market || !username) {
      toast({ title: 'Missing fields', description: 'Enter market URL and username', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      // Fetch user's positions
      const response = await fetch(
        `https://api.manifold.markets/v0/market/${market.id}/positions?userId=${username}`,
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      // Try fetching by username lookup
      const userResponse = await fetch(`https://api.manifold.markets/v0/user/${username}`);
      if (!userResponse.ok) throw new Error('User not found');
      const userData = await userResponse.json();
      
      // Fetch their bets on this market
      const betsResponse = await fetch(
        `https://api.manifold.markets/v0/bets?marketId=${market.id}&userId=${userData.id}`
      );
      const bets = await betsResponse.json();
      
      if (!bets || bets.length === 0) {
        toast({ title: 'No Position', description: `${username} has no position in this market`, variant: 'destructive' });
        return;
      }

      // Calculate net position
      let yesShares = 0;
      let noShares = 0;
      let invested = 0;

      // For MC markets, track by answerId
      const answerPositions: Record<string, { yes: number; no: number; invested: number }> = {};

      bets.forEach((bet: any) => {
        if (market.outcomeType === 'MULTIPLE_CHOICE' && bet.answerId) {
          if (!answerPositions[bet.answerId]) {
            answerPositions[bet.answerId] = { yes: 0, no: 0, invested: 0 };
          }
          if (bet.outcome === 'YES') {
            answerPositions[bet.answerId].yes += bet.shares;
          } else {
            answerPositions[bet.answerId].no += bet.shares;
          }
          answerPositions[bet.answerId].invested += bet.amount;
        } else {
          if (bet.outcome === 'YES') {
            yesShares += bet.shares;
          } else {
            noShares += bet.shares;
          }
          invested += bet.amount;
        }
      });

      // For MC markets with selected answer
      if (market.outcomeType === 'MULTIPLE_CHOICE' && selectedAnswer && answerPositions[selectedAnswer]) {
        const pos = answerPositions[selectedAnswer];
        const answer = market.answers?.find((a: any) => a.id === selectedAnswer);
        setTargetPosition({
          outcome: pos.yes > pos.no ? 'YES' : 'NO',
          shares: Math.max(pos.yes, pos.no),
          invested: pos.invested,
          probability: answer?.probability || 0,
          answerId: selectedAnswer,
          answerText: answer?.text
        });
      } else {
        setTargetPosition({
          outcome: yesShares > noShares ? 'YES' : 'NO',
          shares: Math.max(yesShares, noShares),
          invested: invested,
          probability: market.probability
        });
      }

      toast({ title: 'Position Loaded', description: `Found ${username}'s position` });
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to load position', 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const placeCopyTrade = async () => {
    if (!targetPosition || !copyValue || !apiKey) {
      toast({ title: 'Missing fields', variant: 'destructive' });
      return;
    }

    const value = parseFloat(copyValue);
    if (isNaN(value) || value <= 0) {
      toast({ title: 'Invalid amount', variant: 'destructive' });
      return;
    }

    let tradeAmount: number;
    if (copyType === 'percentage') {
      tradeAmount = (targetPosition.invested * value) / 100;
    } else {
      tradeAmount = value;
    }

    setIsLoading(true);
    try {
      const payload: any = {
        contractId: market.id,
        outcome: targetPosition.outcome,
        amount: Math.round(tradeAmount)
      };

      if (targetPosition.answerId) {
        payload.answerId = targetPosition.answerId;
      }

      const response = await fetch('https://api.manifold.markets/v0/bet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Trade failed');
      }

      toast({ title: 'Copy Trade Placed', description: `Placed M$${tradeAmount.toFixed(0)} ${targetPosition.outcome} order` });
      onOrderPlaced?.();
    } catch (error) {
      toast({ 
        title: 'Trade Failed', 
        description: error instanceof Error ? error.message : 'Could not place trade', 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isMultiChoice = market?.outcomeType === 'MULTIPLE_CHOICE';

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Copy className="w-5 h-5" />
          Copy Trade
        </CardTitle>
        <CardDescription className="font-serif">
          Mirror another user's position in a market.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Market URL */}
        <div className="space-y-2">
          <Label className="font-serif">Market URL</Label>
          <div className="flex gap-2">
            <Input
              value={marketUrl}
              onChange={(e) => setMarketUrl(e.target.value)}
              placeholder="https://manifold.markets/..."
              className="font-serif flex-1"
            />
            <Button onClick={loadMarket} disabled={isLoading || !marketUrl} className="font-serif">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load'}
            </Button>
          </div>
        </div>

        {/* Market Info */}
        {market && (
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <p className="font-serif font-medium">{market.question}</p>
            <div className="flex gap-4 text-sm">
              <span>Current: <strong>{(market.probability * 100).toFixed(1)}%</strong></span>
              {isMultiChoice && (
                <Badge variant="outline">Multiple Choice ({market.answers?.length} options)</Badge>
              )}
            </div>
          </div>
        )}

        {/* MC Option Selection */}
        {isMultiChoice && market?.answers && (
          <div className="space-y-2">
            <Label className="font-serif">Select Option</Label>
            <Select value={selectedAnswer} onValueChange={setSelectedAnswer}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an option..." />
              </SelectTrigger>
              <SelectContent>
                {market.answers.map((answer: any) => (
                  <SelectItem key={answer.id} value={answer.id}>
                    {answer.text} ({(answer.probability * 100).toFixed(1)}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Username */}
        <div className="space-y-2">
          <Label className="font-serif">Username to Copy</Label>
          <div className="flex gap-2">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@username"
              className="font-serif flex-1"
            />
            <Button 
              onClick={loadPosition} 
              disabled={isLoading || !username || !market || (isMultiChoice && !selectedAnswer)}
              className="font-serif"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Target Position */}
        {targetPosition && (
          <div className="p-4 rounded-lg bg-accent/10 border border-accent/20 space-y-2">
            <p className="font-serif font-medium text-accent">Target Position</p>
            <div className="grid grid-cols-2 gap-2 text-sm font-serif">
              <span className="text-muted-foreground">Side:</span>
              <span className={targetPosition.outcome === 'YES' ? 'text-emerald-400' : 'text-red-400'}>
                {targetPosition.outcome}
              </span>
              <span className="text-muted-foreground">Shares:</span>
              <span>{targetPosition.shares.toFixed(2)}</span>
              <span className="text-muted-foreground">Invested:</span>
              <span>M${targetPosition.invested.toFixed(2)}</span>
              {targetPosition.answerText && (
                <>
                  <span className="text-muted-foreground">Option:</span>
                  <span>{targetPosition.answerText}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Copy Amount */}
        {targetPosition && (
          <>
            <div className="space-y-2">
              <Label className="font-serif">Copy Amount</Label>
              <div className="flex gap-2">
                <Select value={copyType} onValueChange={(v) => setCopyType(v as 'percentage' | 'amount')}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="amount">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={copyValue}
                  onChange={(e) => setCopyValue(e.target.value)}
                  placeholder={copyType === 'percentage' ? '100' : '1000'}
                  className="font-serif flex-1"
                />
                <span className="flex items-center text-muted-foreground">
                  {copyType === 'percentage' ? '%' : 'M$'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label className="font-serif">Include Limit Orders</Label>
              <Switch checked={includeLimits} onCheckedChange={setIncludeLimits} />
            </div>
            {includeLimits && (
              <p className="text-xs text-muted-foreground">
                Note: Limit orders will be placed proportionally to your copy amount.
              </p>
            )}

            <Button 
              onClick={placeCopyTrade} 
              disabled={isLoading || !copyValue}
              className="w-full font-serif"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Target className="w-4 h-4 mr-2" />}
              Place Copy Trade
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}