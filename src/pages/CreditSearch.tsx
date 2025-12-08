import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, User, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';

// Mock credit score data
const mockCreditScores = [
  { username: 'TraderJoe', reputation: 92, loansCompleted: 15, defaultRate: 0, totalBorrowed: 45000, status: 'excellent' },
  { username: 'MarketMaven', reputation: 87, loansCompleted: 8, defaultRate: 0, totalBorrowed: 28000, status: 'good' },
  { username: 'PredictorPro', reputation: 75, loansCompleted: 5, defaultRate: 10, totalBorrowed: 12000, status: 'fair' },
  { username: 'NewTrader2024', reputation: 50, loansCompleted: 1, defaultRate: 0, totalBorrowed: 500, status: 'new' },
  { username: 'RiskyBets', reputation: 35, loansCompleted: 3, defaultRate: 33, totalBorrowed: 8000, status: 'poor' },
];

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

export default function CreditSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<typeof mockCreditScores>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    const results = mockCreditScores.filter((user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setSearchResults(results);
    setHasSearched(true);
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
            Search for users to view their credit scores and borrowing history
          </p>
        </div>

        {/* Search Box */}
        <Card className="glass mb-8 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-11 h-12 bg-secondary/50 text-lg"
                />
              </div>
              <Button variant="glow" size="lg" onClick={handleSearch} className="px-8">
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {hasSearched && (
          <div className="space-y-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <h2 className="text-lg font-semibold text-foreground">
              {searchResults.length > 0
                ? `Found ${searchResults.length} user${searchResults.length !== 1 ? 's' : ''}`
                : 'No users found'}
            </h2>

            {searchResults.map((user, index) => (
              <Card
                key={user.username}
                className="glass animate-slide-up"
                style={{ animationDelay: `${(index + 3) * 100}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                        {user.username.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">{user.username}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusBadge(user.status)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-primary">{user.reputation}</p>
                        <p className="text-xs text-muted-foreground">Credit Score</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{user.loansCompleted}</p>
                        <p className="text-xs text-muted-foreground">Loans Completed</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{user.defaultRate}%</p>
                        <p className="text-xs text-muted-foreground">Default Rate</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">
                          M${user.totalBorrowed.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">Total Borrowed</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {searchResults.length === 0 && (
              <Card className="glass">
                <CardContent className="p-8 text-center">
                  <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No users found matching "{searchQuery}"
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
                Understanding the ManiFed credit scoring system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p className="flex gap-3">
                <span className="text-primary font-bold">90-100:</span>
                Excellent credit. Low risk borrower with strong repayment history.
              </p>
              <p className="flex gap-3">
                <span className="text-primary font-bold">70-89:</span>
                Good credit. Reliable borrower with consistent payments.
              </p>
              <p className="flex gap-3">
                <span className="text-primary font-bold">50-69:</span>
                Fair credit. Some history available, moderate risk.
              </p>
              <p className="flex gap-3">
                <span className="text-primary font-bold">Below 50:</span>
                Poor credit or new user. Higher risk, limited history.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
