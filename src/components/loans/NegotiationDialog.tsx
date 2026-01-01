import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, HandshakeIcon, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
  const [proposedAmount, setProposedAmount] = useState(loan.amount.toString());
  const [proposedRate, setProposedRate] = useState(loan.interest_rate.toString());
  const [proposedTermDays, setProposedTermDays] = useState(loan.term_days.toString());
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
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

      const { error } = await supabase.from('loan_negotiations').insert({
        loan_id: loan.id,
        negotiator_user_id: user.id,
        negotiator_username: username,
        proposed_amount: parseInt(proposedAmount),
        proposed_interest_rate: parseFloat(proposedRate),
        proposed_term_days: parseInt(proposedTermDays),
        message: message || null,
      });

      if (error) throw error;

      toast({
        title: "Proposal Submitted",
        description: "The loan creator will review your counter-proposal.",
      });

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
      <DialogContent>
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
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Amount (M$)</Label>
              <Input
                type="number"
                value={proposedAmount}
                onChange={(e) => setProposedAmount(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Interest Rate (%)</Label>
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Submit Proposal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
