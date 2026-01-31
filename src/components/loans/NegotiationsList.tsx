import { useState, useEffect } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { HandshakeIcon, Check, X, Loader2, MessageSquare, Clock, Undo } from "lucide-react";

interface Negotiation {
  id: string;
  negotiator_user_id: string;
  negotiator_username: string;
  proposed_amount: number;
  proposed_interest_rate: number;
  proposed_term_days: number;
  message: string | null;
  status: string;
  created_at: string;
  expires_at: string | null;
  escrow_held: boolean;
}

interface NegotiationsListProps {
  loanId: string;
  isOwner: boolean;
  currentUserId?: string | null;
  onAccept?: (negotiation: Negotiation) => void;
}

export function NegotiationsList({ loanId, isOwner, currentUserId, onAccept }: NegotiationsListProps) {
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchNegotiations();
  }, [loanId]);

  const fetchNegotiations = async () => {
    try {
      const { data, error } = await supabase
        .from('loan_negotiations')
        .select('*')
        .eq('loan_id', loanId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNegotiations(data || []);
    } catch (error) {
      console.error("Error fetching negotiations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (negotiation: Negotiation) => {
    setProcessingId(negotiation.id);
    try {
      const { data, error } = await supabase.functions.invoke('accept-negotiation', {
        body: { negotiationId: negotiation.id }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Offer Accepted',
        description: data.message || 'Funds have been transferred to your account from the lender.',
      });

      if (onAccept) onAccept(negotiation);
      fetchNegotiations();
    } catch (error) {
      console.error("Error accepting negotiation:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to accept proposal",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (negotiationId: string) => {
    setProcessingId(negotiationId);
    try {
      const { data, error } = await supabase.functions.invoke('reject-negotiation', {
        body: { negotiationId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Offer Declined',
        description: data.message || 'The offer has been declined.',
      });

      fetchNegotiations();
    } catch (error) {
      console.error("Error rejecting negotiation:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject proposal",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleWithdraw = async (negotiationId: string) => {
    setProcessingId(negotiationId);
    try {
      const { data, error } = await supabase.functions.invoke('withdraw-negotiation', {
        body: { negotiationId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Offer Withdrawn',
        description: data.message || 'Your offer has been withdrawn.',
      });

      fetchNegotiations();
    } catch (error) {
      console.error("Error withdrawing negotiation:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to withdraw proposal",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (negotiations.length === 0) {
    return null;
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge className="bg-success/20 text-success">Accepted</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <HandshakeIcon className="w-5 h-5 text-primary" />
          Counter-Proposals ({negotiations.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {negotiations.map((neg) => (
          <div
            key={neg.id}
            className="p-4 rounded-lg bg-secondary/30 space-y-3"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-foreground">@{neg.negotiator_username}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(neg.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(neg.status)}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Amount</p>
                <p className="font-medium text-foreground">M${neg.proposed_amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Rate</p>
                <p className="font-medium text-success">{neg.proposed_interest_rate}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Term</p>
                <p className="font-medium text-foreground">{neg.proposed_term_days} days</p>
              </div>
            </div>

            {neg.expires_at && neg.status === 'pending' && (
              <div className="flex items-center gap-2 text-xs">
                <Clock className="w-3 h-3" />
                {isExpired(neg.expires_at) ? (
                  <span className="text-destructive">Expired</span>
                ) : (
                  <span className="text-muted-foreground">
                    Expires {formatDistanceToNow(new Date(neg.expires_at), { addSuffix: true })}
                  </span>
                )}
              </div>
            )}

            {neg.message && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MessageSquare className="w-4 h-4 mt-0.5 shrink-0" />
                <p>{neg.message}</p>
              </div>
            )}

            {/* Owner actions */}
            {isOwner && neg.status === 'pending' && !isExpired(neg.expires_at) && (
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => handleAccept(neg)}
                  disabled={!!processingId}
                >
                  {processingId === neg.id ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Check className="w-3 h-3 mr-1" />
                  )}
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(neg.id)}
                  disabled={!!processingId}
                >
                  <X className="w-3 h-3 mr-1" />
                  Decline
                </Button>
              </div>
            )}

            {/* Negotiator can withdraw their own pending proposal */}
            {!isOwner && currentUserId === neg.negotiator_user_id && neg.status === 'pending' && (
              <div className="pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleWithdraw(neg.id)}
                  disabled={!!processingId}
                >
                  {processingId === neg.id ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Undo className="w-3 h-3 mr-1" />
                  )}
                  Withdraw Proposal
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
