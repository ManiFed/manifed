import { useState, useEffect } from "react";
import { addDays, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, HandshakeIcon, MessageSquare, CalendarIcon, Lock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useUserBalance } from "@/hooks/useUserBalance";
import { cn } from "@/lib/utils";

interface NegotiationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: {
    id: string;
    amount: number;
    interest_rate: number;
    term_days: number;
    title: string;
  };
  onSuccess: () => void;
}

export function NegotiationDialog({ open, onOpenChange, loan, onSuccess }: NegotiationDialogProps) {
  const { balance, fetchBalance } = useUserBalance();
  const [proposedAmount, setProposedAmount] = useState(loan.amount.toString());
  const [proposedRate, setProposedRate] = useState(loan.interest_rate.toString());
  const [proposedTermDays, setProposedTermDays] = useState(loan.term_days.toString());
  const [expiresAt, setExpiresAt] = useState<Date>(addDays(new Date(), 3));
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableBalance, setAvailableBalance] = useState<number>(0);

  useEffect(() => {
    if (open) {
      fetchAvailableBalance();
    }
  }, [open]);

  const fetchAvailableBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('get_available_balance', {
        p_user_id: user.id
      });

      if (!error && data !== null) {
        setAvailableBalance(data);
      } else {
        // Fallback to regular balance
        setAvailableBalance(balance);
      }
    } catch {
      setAvailableBalance(balance);
    }
  };

  const amount = parseInt(proposedAmount) || 0;
  const insufficientFunds = amount > availableBalance;

  const handleSubmit = async () => {
    if (insufficientFunds) {
      toast({
        title: "Insufficient funds",
        description: `You need M$${amount.toLocaleString()} available. Your available balance is M$${availableBalance.toLocaleString()}.`,
        variant: "destructive",
      });
      return;
    }

    if (amount < 10) {
      toast({
        title: "Invalid amount",
        description: "Minimum proposal amount is M$10",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get username
      const { data: settings } = await supabase
        .from('user_manifold_settings')
        .select('withdrawal_username, manifold_username')
        .eq('user_id', user.id)
        .maybeSingle();

      const username = settings?.withdrawal_username || settings?.manifold_username;
      if (!username) {
        toast({
          title: "Username required",
          description: "Please set your Manifold username in Settings first.",
          variant: "destructive",
        });
        return;
      }

      // Escrow the funds
      const { data: escrowResult, error: escrowError } = await supabase.rpc('escrow_funds', {
        p_user_id: user.id,
        p_amount: amount
      });

      if (escrowError || !escrowResult) {
        throw new Error("Failed to escrow funds. Please check your available balance.");
      }

      // Create negotiation with escrow
      const { error } = await supabase.from('loan_negotiations').insert({
        loan_id: loan.id,
        negotiator_user_id: user.id,
        negotiator_username: username,
        proposed_amount: amount,
        proposed_interest_rate: parseFloat(proposedRate),
        proposed_term_days: parseInt(proposedTermDays),
        message: message || null,
        expires_at: expiresAt.toISOString(),
        escrow_held: true,
      });

      if (error) {
        // Release escrow if insert fails
        await supabase.rpc('release_escrow', {
          p_user_id: user.id,
          p_amount: amount
        });
        throw error;
      }

      toast({
        title: "Proposal Submitted",
        description: `M$${amount.toLocaleString()} has been held in escrow until ${format(expiresAt, 'MMM d, yyyy')}.`,
      });

      fetchBalance();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Negotiation error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit proposal",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandshakeIcon className="w-5 h-5 text-primary" />
            Propose Terms
          </DialogTitle>
          <DialogDescription>
            Submit a counter-proposal for "{loan.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Balance Info */}
          <div className="p-3 rounded-lg bg-secondary/50 border border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Available Balance</span>
              <span className="font-medium">M${availableBalance.toLocaleString()}</span>
            </div>
          </div>

          {insufficientFunds && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-sm text-destructive">Insufficient funds for this proposal</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Amount (M$)</Label>
              <Input
                type="number"
                value={proposedAmount}
                onChange={(e) => setProposedAmount(e.target.value)}
                className={cn("mt-1", insufficientFunds && "border-destructive")}
              />
            </div>
            <div>
              <Label>Interest (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={proposedRate}
                onChange={(e) => setProposedRate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Term (days)</Label>
              <Input
                type="number"
                value={proposedTermDays}
                onChange={(e) => setProposedTermDays(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Expiration Date */}
          <div>
            <Label className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Proposal Expires
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full mt-1 justify-start text-left font-normal",
                    !expiresAt && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expiresAt ? format(expiresAt, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expiresAt}
                  onSelect={(date) => date && setExpiresAt(date)}
                  disabled={(date) => date < new Date() || date > addDays(new Date(), 30)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground mt-1">
              Funds will be returned if not accepted by this date
            </p>
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Message (optional)
            </Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Explain your proposal..."
              className="mt-1"
            />
          </div>

          {/* Escrow Notice */}
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 text-sm">
              <Lock className="w-4 h-4 text-primary" />
              <span>
                <strong>M${amount.toLocaleString()}</strong> will be held in escrow until accepted, rejected, or expires.
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || insufficientFunds}>
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Submit Proposal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
