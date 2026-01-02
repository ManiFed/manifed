import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, HandshakeIcon, ArrowRight, CheckCircle, XCircle, Clock, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { UniversalHeader } from "@/components/layout/UniversalHeader";
import { format } from "date-fns";

interface Negotiation {
  id: string;
  loan_id: string;
  negotiator_user_id: string;
  negotiator_username: string;
  proposed_amount: number;
  proposed_interest_rate: number;
  proposed_term_days: number;
  message: string | null;
  status: string;
  created_at: string;
  loan?: {
    id: string;
    title: string;
    borrower_username: string;
    borrower_user_id: string;
    amount: number;
    interest_rate: number;
    term_days: number;
  };
}

export default function LoanNegotiations() {
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchNegotiations();
  }, []);

  const fetchNegotiations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Fetch negotiations where user is either the negotiator or the loan owner
      const { data: myNegotiations, error: negError } = await supabase
        .from("loan_negotiations")
        .select("*")
        .eq("negotiator_user_id", user.id)
        .order("created_at", { ascending: false });

      if (negError) throw negError;

      // Fetch negotiations on loans I own
      const { data: myLoans } = await supabase
        .from("loans")
        .select("id")
        .eq("borrower_user_id", user.id);

      const myLoanIds = myLoans?.map((l) => l.id) || [];

      let receivedNegotiations: any[] = [];
      if (myLoanIds.length > 0) {
        const { data: received } = await supabase
          .from("loan_negotiations")
          .select("*")
          .in("loan_id", myLoanIds)
          .order("created_at", { ascending: false });
        receivedNegotiations = received || [];
      }

      // Combine and deduplicate
      const allNegotiations = [...(myNegotiations || []), ...receivedNegotiations];
      const uniqueNegotiations = allNegotiations.filter(
        (neg, index, self) => index === self.findIndex((n) => n.id === neg.id)
      );

      // Fetch loan details for each negotiation
      const loanIds = [...new Set(uniqueNegotiations.map((n) => n.loan_id))];
      const { data: loans } = await supabase
        .from("loans")
        .select("id, title, borrower_username, borrower_user_id, amount, interest_rate, term_days")
        .in("id", loanIds);

      const loansMap = new Map(loans?.map((l) => [l.id, l]) || []);

      const negotiationsWithLoans = uniqueNegotiations.map((n) => ({
        ...n,
        loan: loansMap.get(n.loan_id),
      }));

      setNegotiations(negotiationsWithLoans);
    } catch (error) {
      console.error("Error fetching negotiations:", error);
      toast({
        title: "Error",
        description: "Failed to load negotiations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (negId: string, newStatus: "accepted" | "rejected") => {
    setUpdatingId(negId);
    try {
      const { error } = await supabase
        .from("loan_negotiations")
        .update({ status: newStatus })
        .eq("id", negId);

      if (error) throw error;

      toast({
        title: newStatus === "accepted" ? "Proposal Accepted" : "Proposal Rejected",
        description: `The negotiation has been ${newStatus}.`,
      });

      fetchNegotiations();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update negotiation status",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return <Badge className="bg-success/20 text-success border-success/30"><CheckCircle className="w-3 h-3 mr-1" />Accepted</Badge>;
      case "rejected":
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge className="bg-warning/20 text-warning border-warning/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const myProposals = negotiations.filter((n) => n.negotiator_user_id === currentUserId);
  const receivedProposals = negotiations.filter(
    (n) => n.loan?.borrower_user_id === currentUserId && n.negotiator_user_id !== currentUserId
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-6">
        <UniversalHeader />
      </div>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Loan Negotiations</h1>
          <p className="text-muted-foreground">Manage all your loan negotiations in one place</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : negotiations.length === 0 ? (
          <Card className="glass">
            <CardContent className="py-16 text-center">
              <HandshakeIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Negotiations Yet</h3>
              <p className="text-muted-foreground mb-4">
                Start negotiating on loans in the marketplace
              </p>
              <Link to="/marketplace">
                <Button className="gap-2">
                  Browse Loans <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Received Proposals */}
            {receivedProposals.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Proposals on Your Loans ({receivedProposals.length})
                </h2>
                <div className="space-y-4">
                  {receivedProposals.map((neg) => (
                    <Card key={neg.id} className="glass">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <Link to={`/loan/${neg.loan_id}`} className="hover:underline">
                              <h3 className="font-semibold text-foreground">{neg.loan?.title || "Untitled Loan"}</h3>
                            </Link>
                            <p className="text-sm text-muted-foreground">
                              From: @{neg.negotiator_username} • {format(new Date(neg.created_at), "MMM d, yyyy")}
                            </p>
                          </div>
                          {getStatusBadge(neg.status)}
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-4 p-4 rounded-lg bg-secondary/30">
                          <div>
                            <p className="text-xs text-muted-foreground">Proposed Amount</p>
                            <p className="font-semibold text-foreground">M${neg.proposed_amount.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">Original: M${neg.loan?.amount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Proposed Rate</p>
                            <p className="font-semibold text-foreground">{neg.proposed_interest_rate}%</p>
                            <p className="text-xs text-muted-foreground">Original: {neg.loan?.interest_rate}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Proposed Term</p>
                            <p className="font-semibold text-foreground">{neg.proposed_term_days} days</p>
                            <p className="text-xs text-muted-foreground">Original: {neg.loan?.term_days} days</p>
                          </div>
                        </div>

                        {neg.message && (
                          <p className="text-sm text-muted-foreground mb-4 italic">"{neg.message}"</p>
                        )}

                        {neg.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStatus(neg.id, "accepted")}
                              disabled={updatingId === neg.id}
                              className="gap-1"
                            >
                              {updatingId === neg.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(neg.id, "rejected")}
                              disabled={updatingId === neg.id}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* My Proposals */}
            {myProposals.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <HandshakeIcon className="w-5 h-5 text-primary" />
                  Your Proposals ({myProposals.length})
                </h2>
                <div className="space-y-4">
                  {myProposals.map((neg) => (
                    <Card key={neg.id} className="glass">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <Link to={`/loan/${neg.loan_id}`} className="hover:underline">
                              <h3 className="font-semibold text-foreground">{neg.loan?.title || "Untitled Loan"}</h3>
                            </Link>
                            <p className="text-sm text-muted-foreground">
                              To: @{neg.loan?.borrower_username} • {format(new Date(neg.created_at), "MMM d, yyyy")}
                            </p>
                          </div>
                          {getStatusBadge(neg.status)}
                        </div>

                        <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-secondary/30">
                          <div>
                            <p className="text-xs text-muted-foreground">Your Proposal</p>
                            <p className="font-semibold text-foreground">M${neg.proposed_amount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Rate</p>
                            <p className="font-semibold text-foreground">{neg.proposed_interest_rate}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Term</p>
                            <p className="font-semibold text-foreground">{neg.proposed_term_days} days</p>
                          </div>
                        </div>

                        {neg.message && (
                          <p className="text-sm text-muted-foreground mt-4 italic">"{neg.message}"</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
