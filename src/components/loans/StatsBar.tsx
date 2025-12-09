import { Card } from '@/components/ui/card';
import { TrendingUp, DollarSign, Users, Activity } from 'lucide-react';

interface LoanData {
  amount: number;
  funded_amount?: number;
  fundedAmount?: number;
  interest_rate?: number;
  interestRate?: number;
  status: string;
}

interface StatsBarProps {
  loans?: LoanData[];
}

export function StatsBar({ loans = [] }: StatsBarProps) {
  const totalVolume = loans.reduce((sum, loan) => sum + Number(loan.amount), 0);
  const activeLending = loans
    .filter((l) => l.status === 'active' || l.status === 'seeking_funding')
    .reduce((sum, loan) => sum + Number(loan.funded_amount ?? loan.fundedAmount ?? 0), 0);
  const avgInterest = loans.length > 0
    ? loans.reduce((sum, loan) => sum + Number(loan.interest_rate ?? loan.interestRate ?? 0), 0) / loans.length
    : 0;
  const activeLoans = loans.filter(
    (l) => l.status === 'active' || l.status === 'seeking_funding'
  ).length;

  const stats = [
    {
      label: 'Total Volume',
      value: `M$${totalVolume.toLocaleString()}`,
      icon: DollarSign,
      change: loans.length > 0 ? `${loans.length} loans` : 'No loans yet',
    },
    {
      label: 'Active Lending',
      value: `M$${activeLending.toLocaleString()}`,
      icon: TrendingUp,
      change: 'currently funded',
    },
    {
      label: 'Avg. Interest',
      value: `${avgInterest.toFixed(1)}%`,
      icon: Activity,
      change: 'across all loans',
    },
    {
      label: 'Active Loans',
      value: activeLoans.toString(),
      icon: Users,
      change: 'seeking funding or active',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.label}
            className="glass p-4 hover:bg-card/90 transition-colors animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-xs text-success mt-2">{stat.change}</p>
          </Card>
        );
      })}
    </div>
  );
}
