import { useState, useEffect } from 'react';
import { Bell, CheckCircle, AlertCircle, TrendingUp, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: 'bond_maturity' | 'loan_funded' | 'loan_repaid' | 'investment_return';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const now = new Date();
      const generatedNotifications: Notification[] = [];

      // Check for bonds maturing soon (within 7 days)
      const { data: bonds } = await supabase
        .from('bonds')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (bonds) {
        for (const bond of bonds) {
          const maturityDate = new Date(bond.maturity_date);
          const daysUntilMaturity = Math.ceil((maturityDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilMaturity <= 7 && daysUntilMaturity > 0) {
            generatedNotifications.push({
              id: `bond-${bond.id}`,
              type: 'bond_maturity',
              title: 'Bond Maturing Soon',
              message: `Your M$${bond.amount.toLocaleString()} bond matures in ${daysUntilMaturity} day${daysUntilMaturity === 1 ? '' : 's'}`,
              timestamp: new Date(bond.created_at),
              read: false,
            });
          }
        }
      }

      // Check for recently funded loans (as borrower)
      const { data: loans } = await supabase
        .from('loans')
        .select('*')
        .eq('borrower_user_id', user.id)
        .eq('status', 'active')
        .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (loans) {
        for (const loan of loans) {
          generatedNotifications.push({
            id: `loan-funded-${loan.id}`,
            type: 'loan_funded',
            title: 'Loan Funded',
            message: `Your loan "${loan.title}" has been fully funded!`,
            timestamp: new Date(loan.updated_at),
            read: false,
          });
        }
      }

      // Check for recent transactions (investment returns, repayments)
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .in('type', ['repayment', 'bond_maturity'])
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      if (transactions) {
        for (const tx of transactions) {
          generatedNotifications.push({
            id: `tx-${tx.id}`,
            type: tx.type === 'bond_maturity' ? 'bond_maturity' : 'investment_return',
            title: tx.type === 'bond_maturity' ? 'Bond Matured' : 'Investment Return',
            message: tx.description || `Received M$${tx.amount.toLocaleString()}`,
            timestamp: new Date(tx.created_at),
            read: true,
          });
        }
      }

      // Sort by timestamp (newest first)
      generatedNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      setNotifications(generatedNotifications.slice(0, 10));
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'bond_maturity':
        return <Coins className="w-4 h-4 text-primary" />;
      case 'loan_funded':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'loan_repaid':
        return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'investment_return':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <div className="px-3 py-2 border-b border-border">
          <h3 className="font-semibold text-sm">Notifications</h3>
        </div>
        
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No notifications
          </div>
        ) : (
          <>
            {notifications.map((notification, index) => (
              <div key={notification.id}>
                {index > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem className="flex gap-3 p-3 cursor-default">
                  <div className="shrink-0 mt-0.5">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-primary rounded-full shrink-0" />
                  )}
                </DropdownMenuItem>
              </div>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
