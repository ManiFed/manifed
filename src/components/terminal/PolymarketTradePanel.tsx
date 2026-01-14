import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PolymarketTradePanelProps {
  currentProbability: number;
  onExecuteTrade: (amount: number, side: 'YES' | 'NO', isLimit: boolean, limitPrice?: number) => void;
  disabled?: boolean;
}

export function PolymarketTradePanel({ 
  currentProbability, 
  onExecuteTrade,
  disabled = false 
}: PolymarketTradePanelProps) {
  const [side, setSide] = useState<'YES' | 'NO'>('YES');
  const [amount, setAmount] = useState('');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [limitPrice, setLimitPrice] = useState('');

  const yesPrice = Math.round(currentProbability * 100);
  const noPrice = 100 - yesPrice;

  const quickAmounts = [1, 20, 100];

  const handleQuickAmount = (val: number) => {
    setAmount(prev => {
      const current = parseInt(prev) || 0;
      return String(current + val);
    });
  };

  const handleMax = () => {
    // This would need to be connected to actual balance
    setAmount('1000');
  };

  const handleTrade = () => {
    const amountNum = parseInt(amount);
    if (isNaN(amountNum) || amountNum <= 0) return;
    
    const limitPriceNum = orderType === 'limit' ? parseInt(limitPrice) : undefined;
    onExecuteTrade(amountNum, side, orderType === 'limit', limitPriceNum);
    setAmount('');
    setLimitPrice('');
  };

  return (
    <Card className="bg-[#1a1b23] border-gray-800 p-4">
      {/* Buy/Sell Toggle */}
      <Tabs defaultValue="buy" className="mb-4">
        <TabsList className="w-full bg-gray-800 p-1">
          <TabsTrigger value="buy" className="flex-1 data-[state=active]:bg-gray-700">
            Buy
          </TabsTrigger>
          <TabsTrigger value="sell" className="flex-1 data-[state=active]:bg-gray-700">
            Sell
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Order Type */}
      <div className="flex items-center justify-end mb-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <select 
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as 'market' | 'limit')}
                className="text-sm bg-transparent text-gray-400 border-none cursor-pointer"
              >
                <option value="market">Market</option>
                <option value="limit">Limit</option>
              </select>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Market: Execute immediately at current price</p>
              <p className="text-xs">Limit: Set a target price for execution</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Yes/No Buttons - Responsive sizing */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setSide('YES')}
                className={`h-10 md:h-12 text-sm md:text-lg font-semibold flex-1 min-w-0 ${
                  side === 'YES'
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
                }`}
                disabled={disabled}
              >
                Yes <span className="ml-1 md:ml-2 text-xs md:text-sm opacity-80">{yesPrice}¢</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Buy YES shares at {yesPrice}% probability</p>
              <p className="text-xs">Pays M$1 per share if market resolves YES</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setSide('NO')}
                className={`h-10 md:h-12 text-sm md:text-lg font-semibold flex-1 min-w-0 ${
                  side === 'NO'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
                }`}
                disabled={disabled}
              >
                No <span className="ml-1 md:ml-2 text-xs md:text-sm opacity-80">{noPrice}¢</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Buy NO shares at {noPrice}% probability</p>
              <p className="text-xs">Pays M$1 per share if market resolves NO</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Amount Input */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Amount</span>
          <span className="text-xl font-bold text-white">M${amount || '0'}</span>
        </div>
        
        {orderType === 'limit' && (
          <div className="mb-3">
            <Input
              type="number"
              placeholder="Limit price %"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white mb-2"
              min={1}
              max={99}
            />
          </div>
        )}

        <div className="flex gap-1 md:gap-2">
          {quickAmounts.map(val => (
            <TooltipProvider key={val}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAmount(val)}
                    className="flex-1 min-w-0 px-1 md:px-3 text-xs md:text-sm border-gray-700 text-gray-300 hover:bg-gray-800"
                    disabled={disabled}
                  >
                    +${val}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Add M${val} to your order</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={handleMax}
            className="flex-1 min-w-0 px-1 md:px-3 text-xs md:text-sm border-gray-700 text-gray-300 hover:bg-gray-800"
            disabled={disabled}
          >
            Max
          </Button>
        </div>
      </div>

      {/* Trade Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleTrade}
              disabled={disabled || !amount || parseInt(amount) <= 0}
              className={`w-full h-10 md:h-12 text-base md:text-lg font-semibold ${
                side === 'YES' 
                  ? 'bg-emerald-500 hover:bg-emerald-600' 
                  : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              Trade
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Execute {orderType} order for M${amount || 0} of {side}</p>
            {orderType === 'limit' && limitPrice && (
              <p className="text-xs">Will fill when price reaches {limitPrice}%</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Syntax Help */}
      <div className="mt-3 md:mt-4 p-2 md:p-3 bg-gray-800/50 rounded-lg">
        <p className="text-[10px] md:text-xs text-gray-500 mb-1 md:mb-2">⌨️ Hold Shift + key for hotkeys:</p>
        <div className="text-[10px] md:text-xs text-gray-600 space-y-0.5">
          <p><code className="text-emerald-400">100B</code> = M$100 YES</p>
          <p><code className="text-red-400">100S</code> = M$100 NO</p>
          <p><code className="text-yellow-400">/100B@45/</code> = Limit @45%</p>
          <p><code className="text-purple-400">ST5/100/</code> = Straddle</p>
        </div>
      </div>
    </Card>
  );
}
