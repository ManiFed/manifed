import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, User, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock, Loader2, ExternalLink } from 'lucide-react';
import { useManifoldUser, ManifoldUserResult } from '@/hooks/useManifoldUser';

function getStatusBadge(status: string) {
  switch (status) {
    case 'excellent':
      return <Badge variant="success" className="gap-1"><CheckCircle className="w-3 h-3" /> Excellent</Badge>;
    case 'good':
      return <Badge variant="active" className="gap-1"><TrendingUp className="w-3 h-3" /> Good</Badge>;
    case 'fair':
      return <Badge variant="warning" className="gap-1"><Clock className="w-3 h-3" /> Fair</Badge>;
    case 'new':
      return <Badge variant="pending" className="gap-1"><User className="w-3 h-3" /> New</Badge>;
    case 'poor':
      return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" /> Poor</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
}

function getFactorIcon(impact: string) {
  if (impact === 'positive') return <TrendingUp className="w-4 h-4 text-success" />;
  if (impact === 'negative') return <TrendingDown className="w-4 h-4 text-destructive" />;
  return <Clock className="w-4 h-4 text-muted-foreground" />;
}

export default function CreditSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<ManifoldUserResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const { fetchUser, isLoading, error } = useManifoldUser();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setHasSearched(true);
    const result = await fetchUser(searchQuery.trim());
    setSearchResult(result);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8 animate-slide-up">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Credit Score <span className="text-gradient">Lookup</span>
          </h1>
          <p className="text-muted-foreground">
            Search any Manifold Markets user to view their ManiFed credit score
          </p>
        </div>

        {/* Search Box */}
        <Card className="glass mb-8 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Enter Manifold username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-11 h-12 bg-secondary/50 text-lg"
                  disabled={isLoading}
                />
              </div>
              <Button variant="glow" size="lg" onClick={handleSearch} className="px-8" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {hasSearched && (
          <div className="space-y-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
            {error ? (
              <Card className="glass">
                <CardContent className="p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                  <p className="text-muted-foreground">{error}</p>
                </CardContent>
              </Card>
            ) : searchResult ? (
              <>
                {/* User Profile Card */}
                <Card className="glass">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                      <div className="flex items-center gap-4">
                        {searchResult.user.avatarUrl ? (
                          <img
                            src={searchResult.user.avatarUrl}
                            alt={searchResult.user.name}
                            className="w-16 h-16 rounded-full border-2 border-primary/30"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-2xl">
                            {searchResult.user.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <h3 className="text-xl font-semibold text-foreground">{searchResult.user.name}</h3>
                          <p className="text-muted-foreground">@{searchResult.user.username}</p>
                          <div className="flex items-center gap-2 mt-2">
                            {getStatusBadge(searchResult.creditScore.status)}
                            {searchResult.isVerified && (
                              <Badge variant="outline" className="gap-1">
                                <CheckCircle className="w-3 h-3 text-success" /> Verified
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="p-3 rounded-lg bg-primary/10">
                          <p className="text-3xl font-bold text-primary">{searchResult.creditScore.score}</p>
                          <p className="text-xs text-muted-foreground">Credit Score</p>
                        </div>
                        <div className="p-3 rounded-lg bg-secondary/50">
                          <p className="text-xl font-bold text-foreground">
                            M${searchResult.user.balance.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">Balance</p>
                        </div>
                        <div className="p-3 rounded-lg bg-secondary/50">
                          <p className="text-xl font-bold text-foreground">
                            M${searchResult.user.totalDeposits.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">Total Deposits</p>
                        </div>
                        {searchResult.portfolio && (
                          <div className="p-3 rounded-lg bg-secondary/50">
                            <p className={`text-xl font-bold ${searchResult.portfolio.profit && searchResult.portfolio.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {searchResult.portfolio.profit !== undefined 
                                ? `${searchResult.portfolio.profit >= 0 ? '+' : ''}M$${searchResult.portfolio.profit.toLocaleString()}`
                                : 'N/A'}
                            </p>
                            <p className="text-xs text-muted-foreground">All-Time Profit</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Credit Score Breakdown */}
                <Card className="glass animate-slide-up" style={{ animationDelay: '300ms' }}>
                  <CardHeader>
                    <CardTitle className="text-lg">Credit Score Breakdown</CardTitle>
                    <CardDescription>
                      Factors contributing to the ManiFed credit score
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {searchResult.creditScore.factors.map((factor, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                        >
                          <div className="flex items-center gap-3">
                            {getFactorIcon(factor.impact)}
                            <span className="text-foreground">{factor.name}</span>
                          </div>
                          <span className="font-medium text-foreground">{factor.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* View on Manifold */}
                <div className="text-center">
                  <Button variant="outline" asChild>
                    <a
                      href={`https://manifold.markets/${searchResult.user.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View on Manifold Markets
                    </a>
                  </Button>
                </div>
              </>
            ) : !isLoading && (
              <Card className="glass">
                <CardContent className="p-8 text-center">
                  <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No user found with username "{searchQuery}"
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Instructions */}
        {!hasSearched && (
          <Card className="glass animate-slide-up" style={{ animationDelay: '200ms' }}>
            <CardHeader>
              <CardTitle className="text-lg">How Credit Scores Work</CardTitle>
              <CardDescription>
                ManiFed credit scores are calculated from real Manifold Markets data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>Our credit scoring algorithm analyzes:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><span className="text-foreground font-medium">Account Age</span> - Longer history means more reliability</li>
                <li><span className="text-foreground font-medium">Balance & Deposits</span> - Financial standing on Manifold</li>
                <li><span className="text-foreground font-medium">Recent Activity</span> - Active traders are more trustworthy</li>
                <li><span className="text-foreground font-medium">Portfolio Performance</span> - Profitable traders manage risk better</li>
                <li><span className="text-foreground font-medium">Investment Value</span> - Skin in the game matters</li>
              </ul>
              <div className="pt-4 border-t border-border/50">
                <p className="flex gap-3 items-center">
                  <span className="text-primary font-bold">90-100:</span>
                  Excellent credit. Low risk borrower.
                </p>
                <p className="flex gap-3 items-center mt-2">
                  <span className="text-primary font-bold">70-89:</span>
                  Good credit. Reliable borrower.
                </p>
                <p className="flex gap-3 items-center mt-2">
                  <span className="text-primary font-bold">50-69:</span>
                  Fair credit. Moderate risk.
                </p>
                <p className="flex gap-3 items-center mt-2">
                  <span className="text-primary font-bold">Below 50:</span>
                  New or risky. Limited history.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}