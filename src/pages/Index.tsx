import { useState, useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { LoanCard } from '@/components/loans/LoanCard';
import { LoanFilters } from '@/components/loans/LoanFilters';
import { StatsBar } from '@/components/loans/StatsBar';
import { mockLoans } from '@/data/mockLoans';
import { TrendingUp, Sparkles } from 'lucide-react';

const Index = () => {
  const [activeStatus, setActiveStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLoans = useMemo(() => {
    return mockLoans.filter((loan) => {
      const matchesStatus = activeStatus === 'all' || loan.status === activeStatus;
      const matchesSearch =
        searchQuery === '' ||
        loan.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loan.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loan.borrower.username.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [activeStatus, searchQuery]);

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
        <StatsBar />

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

          {filteredLoans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLoans.map((loan, index) => (
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
                Try adjusting your filters or search query
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Index;
