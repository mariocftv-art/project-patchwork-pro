import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { playNotificationSound } from '@/utils/notificationSound';

interface OrderNotification {
  id: string;
  orderNumber: string;
  status: string;
  statusLabel: string;
  timestamp: Date;
  read: boolean;
}

const STORAGE_KEY = 'customer-tracked-orders';
const NOTIFICATIONS_KEY = 'customer-notifications';

const statusLabels: Record<string, string> = {
  pending: 'Aguardando Confirmação',
  confirmed: 'Pedido Confirmado',
  preparing: 'Em Preparação',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

export function useCustomerNotifications() {
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [trackedOrders, setTrackedOrders] = useState<string[]>([]);

  // Load tracked orders and notifications from localStorage
  useEffect(() => {
    const storedOrders = localStorage.getItem(STORAGE_KEY);
    const storedNotifications = localStorage.getItem(NOTIFICATIONS_KEY);
    
    if (storedOrders) {
      try {
        setTrackedOrders(JSON.parse(storedOrders));
      } catch (e) {
        console.error('Error parsing tracked orders:', e);
      }
    }
    
    if (storedNotifications) {
      try {
        const parsed = JSON.parse(storedNotifications);
        setNotifications(parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        })));
      } catch (e) {
        console.error('Error parsing notifications:', e);
      }
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
    }
  }, [notifications]);

  // Subscribe to real-time updates for tracked orders
  useEffect(() => {
    if (trackedOrders.length === 0) return;

    console.log('Subscribing to updates for orders:', trackedOrders);

    const channel = supabase
      .channel('customer-order-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          const updatedOrder = payload.new as any;
          const oldOrder = payload.old as any;
          
          // Check if this is one of our tracked orders
          if (trackedOrders.includes(updatedOrder.order_number)) {
            // Only create notification if status changed
            if (updatedOrder.status !== oldOrder.status) {
              console.log('Order status changed:', updatedOrder.order_number, updatedOrder.status);
              
              // Play notification sound
              playNotificationSound();
              
              const newNotification: OrderNotification = {
                id: `${updatedOrder.order_number}-${Date.now()}`,
                orderNumber: updatedOrder.order_number,
                status: updatedOrder.status,
                statusLabel: statusLabels[updatedOrder.status] || updatedOrder.status,
                timestamp: new Date(),
                read: false,
              };
              
              setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep last 50
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trackedOrders]);

  // Add an order to track
  const trackOrder = (orderNumber: string) => {
    const normalizedNumber = orderNumber.toUpperCase();
    if (!trackedOrders.includes(normalizedNumber)) {
      const newTrackedOrders = [...trackedOrders, normalizedNumber];
      setTrackedOrders(newTrackedOrders);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTrackedOrders));
    }
  };

  // Mark notification as read
  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
    localStorage.removeItem(NOTIFICATIONS_KEY);
  };

  // Get unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    trackedOrders,
    trackOrder,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };
}
