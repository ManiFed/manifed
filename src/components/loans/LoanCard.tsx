import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loan } from '@/types/loan';
import { Clock, TrendingUp, Users, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoanCardProps {
  loan: Loan;
}

const statusConfig = {
  seeking_funding: { label: 'Seeking Funding', variant: 'pending' as const, icon: Clock },
  active: { label: 'Active', variant: 'active' as const, icon: TrendingUp },
  repaid: { label: 'Repaid', variant: 'success' as const, icon: CheckCircle },
  defaulted: { label: 'Defaulted', variant: 'destructive' as const, icon: XCircle },
};

const riskConfig = {
  low: { label: 'Low Risk', className: 'text-success' },
  medium: { label: 'Medium Risk', className: 'text-warning' },
  high: { label: 'High Risk', className: 'text-destructive' },
};

export function LoanCard({ loan }: LoanCardProps) {
  const fundingProgress = (loan.fundedAmount / loan.amount) * 100;
  const status = statusConfig[loan.status];
  const risk = riskConfig[loan.riskScore];
  const StatusIcon = status.icon;

  const daysRemaining = Math.max(
    0,
    Math.ceil((new Date(loan.fundingDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  return (
    <Link to={`/loan/${loan.id}`}>
      <Card className="group glass hover:bg-card/90 transition-all duration-300 hover:elevated-shadow hover:-translate-y-1 cursor-pointer overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <CardHeader className="pb-3 relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {loan.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">
                  by @{loan.borrower.username}
                </span>
                <Badge variant="outline" className="text-xs">
                  Rep: {loan.borrower.reputation}
                </Badge>
              </div>
            </div>
            <Badge variant={status.variant} className="shrink-0">
              <StatusIcon className="w-3 h-3 mr-1" />
              {status.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="relative space-y-4">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {loan.description}
          </p>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="font-semibold text-foreground">M${loan.amount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Interest</p>
              <p className="font-semibold text-success">{loan.interestRate}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Term</p>
              <p className="font-semibold text-foreground">{loan.termDays} days</p>
            </div>
          </div>

          {loan.status === 'seeking_funding' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  M${loan.fundedAmount.toLocaleString()} / M${loan.amount.toLocaleString()}
                </span>
                <span className="font-medium text-primary">{fundingProgress.toFixed(0)}%</span>
              </div>
              <Progress value={fundingProgress} className="h-2" />
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{loan.investors.length}</span>
              </div>
              {loan.status === 'seeking_funding' && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{daysRemaining}d left</span>
                </div>
              )}
            </div>
            <div className={cn('flex items-center gap-1 text-sm', risk.className)}>
              <AlertTriangle className="w-4 h-4" />
              <span>{risk.label}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
