export type LoanStatus = 'seeking_funding' | 'active' | 'repaid' | 'defaulted' | 'cancelled';

export interface Loan {
  id: string;
  borrower: {
    id: string;
    username: string;
    avatarUrl?: string;
    reputation: number;
  };
  title: string;
  description: string;
  amount: number; // in M$
  fundedAmount: number;
  interestRate: number; // percentage
  termDays: number;
  status: LoanStatus;
  createdAt: string;
  fundingDeadline?: string;
  maturityDate?: string;
  manifoldMarketId?: string;
  riskScore: 'low' | 'medium' | 'high';
  collateralDescription?: string;
  investors: LoanInvestor[];
}

export interface LoanInvestor {
  id: string;
  username: string;
  amount: number;
  investedAt: string;
}

export interface CreateLoanForm {
  title: string;
  description: string;
  amount: number;
  interestRate: number;
  termDays: number;
  collateralDescription?: string;
}

export interface UserPortfolio {
  userId: string;
  username: string;
  balance: number;
  totalInvested: number;
  totalBorrowed: number;
  activeLoans: number;
  activeInvestments: number;
  reputation: number;
}
