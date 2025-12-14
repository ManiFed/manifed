import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useArbitrageNotifications } from '@/hooks/useArbitrageNotifications';
import { Bell, CheckCheck, Loader2, Sparkles, AlertCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function NotificationsDropdown() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useArbitrageNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'opportunity_found':
        return <Sparkles className="w-4 h-4 text-success" />;
      case 'scan_complete':
        return <CheckCheck className="w-4 h-4 text-primary" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No notifications yet
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map(notif => (
                <div
                  key={notif.id}
                  className={`p-3 hover:bg-secondary/20 cursor-pointer transition-colors ${
                    !notif.is_read ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => {
                    if (!notif.is_read) markAsRead(notif.id);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">
                          {notif.title}
                        </p>
                        {!notif.is_read && (
                          <Badge variant="default" className="text-[10px] h-4">New</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
