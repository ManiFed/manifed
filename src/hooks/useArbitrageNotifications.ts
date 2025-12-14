import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export function useArbitrageNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('arbitrage-notifications', {
        body: { action: 'get_notifications' }
      });

      if (error) throw error;
      
      const notifs = data?.notifications || [];
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n: Notification) => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase.functions.invoke('arbitrage-notifications', {
        body: { action: 'mark_read', notificationId }
      });

      if (error) throw error;
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase.functions.invoke('arbitrage-notifications', {
        body: { action: 'mark_all_read' }
      });

      if (error) throw error;
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const sendEmailNotification = async (email: string, subject: string, message: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('arbitrage-notifications', {
        body: { action: 'send_email', email, subject, message }
      });

      if (error) throw error;
      return data?.success || false;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    sendEmailNotification,
  };
}
