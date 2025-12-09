import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoanFiltersProps {
  activeStatus: string;
  onStatusChange: (status: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const statusFilters = [
  { value: 'all', label: 'All Loans' },
  { value: 'seeking_funding', label: 'Seeking Funding' },
  { value: 'active', label: 'Active' },
  { value: 'repaid', label: 'Repaid' },
];

export function LoanFilters({
  activeStatus,
  onStatusChange,
  searchQuery,
  onSearchChange,
}: LoanFiltersProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search loans..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-secondary/50 border-border/50 focus:bg-secondary"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {statusFilters.map((filter) => (
          <Button
            key={filter.value}
            variant={activeStatus === filter.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onStatusChange(filter.value)}
            className={cn(
              'transition-all',
              activeStatus === filter.value && 'glow'
            )}
          >
            {filter.label}
          </Button>
        ))}
      </div>
    </div>
  );
}