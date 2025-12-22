import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Copy, ExternalLink, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionCode: string;
  amount: number;
  expiresAt: string;
  transactionType: string;
  onSuccess?: () => void;
}

export function TransactionModal({
  isOpen,
  onClose,
  transactionCode,
  amount,
  expiresAt,
  transactionType,
  onSuccess,
}: TransactionModalProps) {
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes in seconds
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const expiryTime = new Date(expiresAt).getTime();
    
    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiryTime - now) / 1000));
      setTimeRemaining(remaining);
      
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, expiresAt]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(transactionCode);
    setHasCopied(true);
    toast({ title: 'Copied!', description: 'Transaction code copied to clipboard' });
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleCopyAmount = () => {
    navigator.clipboard.writeText(amount.toString());
    toast({ title: 'Copied!', description: 'Amount copied to clipboard' });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'loan_funding': 'Loan Investment',
      'loan_repayment': 'Loan Repayment',
      'loan_cancellation': 'Loan Cancellation',
      'bond_purchase': 'Bond Purchase',
    };
    return labels[type] || type;
  };

  const isExpired = timeRemaining === 0;
  const progressValue = (timeRemaining / 600) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isExpired ? (
              <AlertCircle className="w-5 h-5 text-destructive" />
            ) : (
              <Clock className="w-5 h-5 text-primary" />
            )}
            {isExpired ? 'Transaction Expired' : 'Complete Your Transaction'}
          </DialogTitle>
          <DialogDescription>
            {isExpired 
              ? 'This transaction code has expired. Please try again.'
              : 'Send mana to ManiFed on Manifold to complete your transaction.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!isExpired && (
            <>
              {/* Timer */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Time Remaining</span>
                  <span className={`font-mono font-bold ${timeRemaining < 120 ? 'text-destructive' : 'text-primary'}`}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>
                <Progress value={progressValue} className="h-2" />
              </div>

              {/* Transaction Type */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Transaction Type</span>
                <Badge variant="secondary">{getTypeLabel(transactionType)}</Badge>
              </div>

              {/* Amount */}
              <div className="p-4 rounded-lg bg-secondary/50 border border-border/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Amount to Send</span>
                  <Button variant="ghost" size="sm" onClick={handleCopyAmount} className="h-8 gap-1">
                    <Copy className="w-3 h-3" />
                    Copy
                  </Button>
                </div>
                <p className="text-3xl font-bold text-primary">M${amount.toLocaleString()}</p>
              </div>

              {/* Transaction Code */}
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Your Transaction Code</span>
                  <Button 
                    variant={hasCopied ? "default" : "outline"} 
                    size="sm" 
                    onClick={handleCopyCode}
                    className="h-8 gap-1"
                  >
                    {hasCopied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {hasCopied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <p className="text-2xl font-mono font-bold text-primary tracking-wider">{transactionCode}</p>
              </div>

              {/* Instructions */}
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Instructions:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Go to Manifold Markets</li>
                  <li>Send M${amount.toLocaleString()} to <span className="font-bold text-primary">@ManiFed</span></li>
                  <li>Include the code <span className="font-mono font-bold text-primary">{transactionCode}</span> in the message</li>
                  <li>ManiFed will verify your payment within 10 minutes</li>
                </ol>
              </div>

              {/* Action Button */}
              <Button asChild className="w-full gap-2">
                <a 
                  href={`https://manifold.markets/ManiFed`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4" />
                  Go to ManiFed on Manifold
                </a>
              </Button>
            </>
          )}

          {isExpired && (
            <div className="text-center py-4">
              <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
              <p className="text-muted-foreground mb-4">
                This transaction code has expired. If you already sent mana, it will be automatically refunded.
              </p>
              <Button onClick={onClose}>Close</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
