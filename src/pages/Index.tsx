import { useState, useMemo, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { LoanCard } from '@/components/loans/LoanCard';
import { LoanFilters } from '@/components/loans/LoanFilters';
import { StatsBar } from '@/components/loans/StatsBar';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Sparkles, Loader2 } from 'lucide-react';

interface Loan {
  id: string;
  borrower_username: string;
  borrower_reputation: number;
  title: string;
  description: string;
  amount: number;
  funded_amount: number;
  interest_rate: number;
  term_days: number;
  status: string;
  risk_score: string;
  collateral_description: string | null;
  created_at: string;
}

const Index = () => {
  const [activeStatus, setActiveStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLoans(data || []);
    } catch (error) {
      console.error('Error fetching loans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      const matchesStatus = activeStatus === 'all' || loan.status === activeStatus;
      const matchesSearch =
        searchQuery === '' ||
        loan.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loan.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loan.borrower_username.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [loans, activeStatus, searchQuery]);

  // Transform database loans to LoanCard format
  const transformedLoans = filteredLoans.map(loan => ({
    id: loan.id,
    borrower: {
      id: loan.id,
      username: loan.borrower_username,
      reputation: loan.borrower_reputation,
    },
    title: loan.title,
    description: loan.description,
    amount: loan.amount,
    fundedAmount: loan.funded_amount,
    interestRate: loan.interest_rate,
    termDays: loan.term_days,
    status: loan.status as 'seeking_funding' | 'active' | 'repaid' | 'defaulted',
    createdAt: loan.created_at,
    riskScore: loan.risk_score as 'low' | 'medium' | 'high',
    collateralDescription: loan.collateral_description || undefined,
    investors: [],
  }));

  return (
    <div className="min-h-screen">
      <Header />

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <section className="text-center space-y-4 py-8 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Powered by Manifold Markets
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Fund & Trade <span className="text-gradient">Prediction Loans</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A peer-to-peer marketplace where traders borrow M$ to capitalize on market
            opportunities, and lenders earn yield on their capital.
          </p>
        </section>

        {/* Stats */}
        <StatsBar loans={loans} />

        {/* Filters */}
        <LoanFilters
          activeStatus={activeStatus}
          onStatusChange={setActiveStatus}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Loan Grid */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">
              {activeStatus === 'all' ? 'All Loans' : `${activeStatus.replace('_', ' ')} Loans`}
            </h2>
            <span className="text-muted-foreground">({filteredLoans.length})</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : transformedLoans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {transformedLoans.map((loan, index) => (
                <div
                  key={loan.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <LoanCard loan={loan} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 glass rounded-xl">
              <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No loans found</h3>
              <p className="text-muted-foreground">
                {loans.length === 0 
                  ? 'Be the first to create a loan!' 
                  : 'Try adjusting your filters or search query'}
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Index;
