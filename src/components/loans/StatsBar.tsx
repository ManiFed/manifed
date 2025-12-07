import { Card } from '@/components/ui/card';
import { TrendingUp, DollarSign, Users, Activity } from 'lucide-react';
import { mockLoans } from '@/data/mockLoans';

export function StatsBar() {
  const totalVolume = mockLoans.reduce((sum, loan) => sum + loan.amount, 0);
  const activeLending = mockLoans
    .filter((l) => l.status === 'active' || l.status === 'seeking_funding')
    .reduce((sum, loan) => sum + loan.fundedAmount, 0);
  const avgInterest =
    mockLoans.reduce((sum, loan) => sum + loan.interestRate, 0) / mockLoans.length;
  const activeLoans = mockLoans.filter(
    (l) => l.status === 'active' || l.status === 'seeking_funding'
  ).length;

  const stats = [
    {
      label: 'Total Volume',
      value: `M$${totalVolume.toLocaleString()}`,
      icon: DollarSign,
      change: '+12.5%',
    },
    {
      label: 'Active Lending',
      value: `M$${activeLending.toLocaleString()}`,
      icon: TrendingUp,
      change: '+8.2%',
    },
    {
      label: 'Avg. Interest',
      value: `${avgInterest.toFixed(1)}%`,
      icon: Activity,
      change: '-0.5%',
    },
    {
      label: 'Active Loans',
      value: activeLoans.toString(),
      icon: Users,
      change: '+3',
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
            <p className="text-xs text-success mt-2">{stat.change} this week</p>
          </Card>
        );
      })}
    </div>
  );
}
