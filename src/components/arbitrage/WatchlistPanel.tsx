import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useArbitrageWatchlist } from '@/hooks/useArbitrageWatchlist';
import { ExternalLink, Trash2, Eye, TrendingUp, TrendingDown, Loader2, Star } from 'lucide-react';

export function WatchlistPanel() {
  const { watchlist, isLoading, removeFromWatchlist, updateNotes } = useArbitrageWatchlist();
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            Market Watchlist
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5 text-primary" />
          Market Watchlist ({watchlist.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {watchlist.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No markets in watchlist. Add markets from scan results to track them.
          </p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {watchlist.map(item => {
              const probChange = item.current_probability && item.initial_probability
                ? (item.current_probability - item.initial_probability) * 100
                : null;

              return (
                <div key={item.id} className="p-3 rounded-lg bg-secondary/20 border border-border/50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.market_question}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {item.current_probability !== null && (
                          <Badge variant="outline">
                            {(item.current_probability * 100).toFixed(1)}%
                          </Badge>
                        )}
                        {probChange !== null && (
                          <Badge variant={probChange >= 0 ? 'success' : 'destructive'} className="gap-1">
                            {probChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {probChange >= 0 ? '+' : ''}{probChange.toFixed(1)}%
                          </Badge>
                        )}
                        {item.liquidity && (
                          <span>Liq: M${item.liquidity.toFixed(0)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a href={item.market_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeFromWatchlist(item.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  
                  {editingNotes === item.id ? (
                    <div className="mt-2 flex gap-2">
                      <Input
                        value={notesValue}
                        onChange={(e) => setNotesValue(e.target.value)}
                        placeholder="Add notes..."
                        className="text-xs h-7"
                      />
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          updateNotes(item.id, notesValue);
                          setEditingNotes(null);
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  ) : (
                    <p
                      className="text-xs text-muted-foreground mt-2 cursor-pointer hover:text-foreground"
                      onClick={() => {
                        setEditingNotes(item.id);
                        setNotesValue(item.notes || '');
                      }}
                    >
                      {item.notes || 'Click to add notes...'}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
