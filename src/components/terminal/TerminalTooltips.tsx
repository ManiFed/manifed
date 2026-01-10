import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Info, Keyboard, Zap, Target, RefreshCw, XCircle, Settings } from 'lucide-react';
import { ReactNode } from 'react';

interface TooltipButtonProps {
  children: ReactNode;
  tooltip: string;
  onClick?: () => void;
  variant?: 'default' | 'ghost' | 'outline' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  disabled?: boolean;
}

export function TooltipButton({ 
  children, 
  tooltip, 
  onClick, 
  variant = 'ghost', 
  size = 'sm',
  className,
  disabled
}: TooltipButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          onClick={onClick}
          className={className}
          disabled={disabled}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <p className="text-sm">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export const TERMINAL_TOOLTIPS = {
  hotkeyMode: "Hotkey Mode: When enabled, keyboard shortcuts work globally without focusing the command line. Great for rapid trading.",
  autoExecute: "Auto-Execute: Market orders execute instantly when enabled. Limit orders still require Enter or / suffix.",
  cancelAll: "Cancel All (Cmd+L): Cancels all pending limit orders in the current market.",
  sellAll: "Sell All (Cmd+X): Sells all positions and cancels all limit orders in the current market.",
  refresh: "Refresh: Fetch latest market data, positions, and probabilities.",
  quickLimitUp: "Quick Limit Up (Cmd+F+digit): Place a YES limit order at current price + digit%. Amount uses Quick Limit preset.",
  quickLimitDown: "Quick Limit Down (Shift+F+digit): Place a NO limit order at current price - digit%. Amount uses Quick Limit preset.",
  straddle: "Straddle Order: Place both YES and NO limit orders at equal distance from current price.",
  mcNavigation: "MC Navigation: Use ↑↓ or W/S keys to navigate through multiple choice options.",
} as const;

export function HotkeyModeControl({ 
  hotkeyMode, 
  onToggle 
}: { 
  hotkeyMode: boolean; 
  onToggle: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={hotkeyMode ? 'default' : 'outline'}
          size="sm"
          onClick={onToggle}
          className={`gap-2 ${hotkeyMode ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
        >
          <Keyboard className="w-4 h-4" />
          {hotkeyMode ? 'Hotkeys ON' : 'Hotkeys OFF'}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <p className="text-sm">{TERMINAL_TOOLTIPS.hotkeyMode}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function AutoExecuteControl({ 
  autoExecute, 
  onToggle 
}: { 
  autoExecute: boolean; 
  onToggle: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={autoExecute ? 'default' : 'outline'}
          size="sm"
          onClick={onToggle}
          className={`gap-2 ${autoExecute ? 'bg-yellow-600 hover:bg-yellow-700' : ''}`}
        >
          <Zap className="w-4 h-4" />
          {autoExecute ? 'Auto ON' : 'Auto OFF'}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <p className="text-sm">{TERMINAL_TOOLTIPS.autoExecute}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function QuickActionButtons({
  onCancelAll,
  onSellAll,
  onRefresh,
  isLoading
}: {
  onCancelAll: () => void;
  onSellAll: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <TooltipButton 
        tooltip={TERMINAL_TOOLTIPS.cancelAll}
        onClick={onCancelAll}
        variant="outline"
        className="text-yellow-400 border-yellow-700 hover:bg-yellow-900/30"
      >
        <XCircle className="w-4 h-4 mr-1" />
        Cancel All
      </TooltipButton>
      
      <TooltipButton 
        tooltip={TERMINAL_TOOLTIPS.sellAll}
        onClick={onSellAll}
        variant="outline"
        className="text-red-400 border-red-700 hover:bg-red-900/30"
      >
        <Target className="w-4 h-4 mr-1" />
        Sell All
      </TooltipButton>
      
      <TooltipButton 
        tooltip={TERMINAL_TOOLTIPS.refresh}
        onClick={onRefresh}
        variant="ghost"
        disabled={isLoading}
      >
        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
      </TooltipButton>
    </div>
  );
}

export function InfoTooltip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="w-4 h-4 text-muted-foreground cursor-help" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-sm">{content}</p>
      </TooltipContent>
    </Tooltip>
  );
}