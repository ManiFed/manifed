import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loan } from '@/types/loan';
import { Clock, TrendingUp, Users, AlertTriangle, CheckCircle, XCircle, Ban, HandCoins, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoanCardProps {
  loan: Loan & { loanType?: string };
}

const statusConfig = {
  seeking_funding: { label: 'Seeking Funding', variant: 'pending' as const, icon: Clock },
  active: { label: 'Active', variant: 'active' as const, icon: TrendingUp },
  repaid: { label: 'Repaid', variant: 'success' as const, icon: CheckCircle },
  defaulted: { label: 'Defaulted', variant: 'destructive' as const, icon: XCircle },
  cancelled: { label: 'Cancelled', variant: 'outline' as const, icon: Ban },
};

const riskConfig = {
  low: { label: 'Low Risk', className: 'text-success' },
  medium: { label: 'Medium Risk', className: 'text-warning' },
  high: { label: 'High Risk', className: 'text-destructive' },
};

export function LoanCard({ loan }: LoanCardProps) {
  const fundingProgress = (loan.fundedAmount / loan.amount) * 100;
  const status = statusConfig[loan.status] || statusConfig.seeking_funding;
  const risk = riskConfig[loan.riskScore] || riskConfig.medium;
  const StatusIcon = status.icon;
  const isOffer = loan.loanType === 'offer';

  // Calculate days remaining based on funding deadline (createdAt + 7 days if no deadline set)
  const fundingDeadline = loan.fundingDeadline || new Date(new Date(loan.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const daysRemaining = Math.max(
    0,
    Math.ceil((new Date(fundingDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  return (
    <Link to={`/loan/${loan.id}`}>
      <Card className={cn(
        "group glass hover:bg-card/90 transition-all duration-300 hover:elevated-shadow hover:-translate-y-1 cursor-pointer overflow-hidden relative",
        isOffer ? "border-l-4 border-l-success" : "border-l-4 border-l-primary"
      )}>
        <div className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity",
          isOffer ? "bg-gradient-to-br from-success/5 to-transparent" : "bg-gradient-to-br from-primary/5 to-transparent"
        )} />
        
        <CardHeader className="pb-3 relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {isOffer ? (
                  <span className="text-xs font-medium text-success flex items-center gap-1">
                    <HandCoins className="w-3 h-3" />
                    OFFERING
                  </span>
                ) : (
                  <span className="text-xs font-medium text-primary flex items-center gap-1">
                    <Search className="w-3 h-3" />
                    SEEKING
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {loan.title}
              </h3>
              <span className="text-sm text-muted-foreground">
                by @{loan.borrower.username}
              </span>
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
                <span className={cn("font-medium", isOffer ? "text-success" : "text-primary")}>{fundingProgress.toFixed(0)}%</span>
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
