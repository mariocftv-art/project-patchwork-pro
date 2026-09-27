import { useState, useEffect } from 'react';
import { ordersApi } from '@/lib/supabaseApi';
import { playNotificationSound } from '@/utils/notificationSound';
import { showOrderNotification } from '@/utils/pushNotifications';

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

  // Consulta segura periódica dos pedidos acompanhados
  useEffect(() => {
    if (trackedOrders.length === 0) return;
    const LAST_KEY = 'customer-order-last-status';
    const check = async () => {
      try {
        const rows = await ordersApi.getStatuses(trackedOrders.slice(-20));
        const last: Record<string, string> = JSON.parse(localStorage.getItem(LAST_KEY) || '{}');
        const fresh: OrderNotification[] = [];
        for (const r of rows) {
          const prev = last[r.order_number];
          if (prev && prev !== r.status) {
            playNotificationSound();
            showOrderNotification(r.order_number, r.status);
            fresh.push({
              id: `${r.order_number}-${Date.now()}`,
              orderNumber: r.order_number,
              status: r.status,
              statusLabel: statusLabels[r.status] || r.status,
              timestamp: new Date(),
              read: false,
            });
          }
          last[r.order_number] = r.status;
        }
        localStorage.setItem(LAST_KEY, JSON.stringify(last));
        if (fresh.length) setNotifications(prev => [...fresh, ...prev].slice(0, 50));
      } catch { /* ignore */ }
    };
    check();
    const interval = setInterval(check, 20000);
    return () => clearInterval(interval);
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
