import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Copy, Check, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface DepositPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DepositPopup({ open, onOpenChange }: DepositPopupProps) {
  const [accountCode, setAccountCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAccountCode();
    }
  }, [open]);

  const fetchAccountCode = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_balances')
        .select('account_code')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.account_code) {
        setAccountCode(data.account_code);
      } else {
        // Create balance record if it doesn't exist
        const { data: newData, error } = await supabase
          .from('user_balances')
          .insert({ user_id: user.id })
          .select('account_code')
          .single();
        
        if (!error && newData) {
          setAccountCode(newData.account_code);
        }
      }
    } catch (error) {
      console.error('Error fetching account code:', error);
    }
  };

  const handleCopy = () => {
    if (accountCode) {
      navigator.clipboard.writeText(accountCode);
      setCopied(true);
      toast({ title: 'Copied!', description: 'Account code copied to clipboard' });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Deposit M$ to ManiFed</DialogTitle>
          <DialogDescription className="font-serif">
            Send a managram to @ManiFed on Manifold with your account code in the message.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Account Code */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Your Account Code</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-secondary/50 rounded-lg border border-border font-mono text-lg text-center">
                {accountCode || '...'}
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-3 p-4 rounded-lg bg-secondary/30 border border-border/50">
            <p className="text-sm font-semibold text-foreground">Instructions:</p>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Go to <a href="https://manifold.markets/ManiFed" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">@ManiFed on Manifold</a></li>
              <li>Click "Send Mana" and enter the amount you want to deposit</li>
              <li>In the message field, paste your account code: <code className="bg-secondary px-1 rounded">{accountCode || '...'}</code></li>
              <li>Send the managram - your balance will update within minutes!</li>
            </ol>
          </div>

          <a 
            href="https://manifold.markets/ManiFed" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block"
          >
            <Button className="w-full gap-2">
              <ExternalLink className="w-4 h-4" />
              Go to @ManiFed on Manifold
            </Button>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}