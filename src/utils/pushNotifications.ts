// Push Notifications utility for order status updates

// Check if browser supports notifications
export const isNotificationSupported = (): boolean => {
  return 'Notification' in window;
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isNotificationSupported()) {
    console.log('Notifications not supported in this browser');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.log('Notifications are blocked by user');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

// Get current permission status
export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
};

// Status labels in Portuguese
const statusLabels: Record<string, string> = {
  pending: 'Aguardando Confirmação',
  confirmed: 'Pedido Confirmado',
  preparing: 'Em Preparação',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

// Status icons/emojis
const statusEmojis: Record<string, string> = {
  pending: '⏳',
  confirmed: '✅',
  preparing: '📦',
  shipped: '🚚',
  delivered: '🎉',
  cancelled: '❌',
};

// Show a push notification for order status change
export const showOrderNotification = (orderNumber: string, status: string): void => {
  if (!isNotificationSupported()) {
    console.log('Notifications not supported');
    return;
  }

  if (Notification.permission !== 'granted') {
    console.log('Notification permission not granted');
    return;
  }

  const statusLabel = statusLabels[status] || status;
  const emoji = statusEmojis[status] || '📋';

  try {
    const notificationOptions: NotificationOptions = {
      body: `Pedido ${orderNumber}: ${statusLabel}`,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: `order-${orderNumber}-${status}`, // Prevents duplicate notifications
      requireInteraction: status === 'delivered' || status === 'shipped', // Keep important notifications visible
    };

    const notification = new Notification(`${emoji} Atualização do Pedido`, notificationOptions);

    // Handle notification click
    notification.onclick = () => {
      window.focus();
      window.location.href = `/rastrear-pedido?pedido=${orderNumber}`;
      notification.close();
    };

    console.log('Push notification shown for order:', orderNumber, status);
  } catch (error) {
    console.error('Error showing notification:', error);
  }
};

// Store permission status locally
const PERMISSION_REQUESTED_KEY = 'notification-permission-requested';

export const hasRequestedPermission = (): boolean => {
  return localStorage.getItem(PERMISSION_REQUESTED_KEY) === 'true';
};

export const markPermissionRequested = (): void => {
  localStorage.setItem(PERMISSION_REQUESTED_KEY, 'true');
};
