// Service Worker Push Notification utilities

// Check if push notifications are supported
export const isPushSupported = (): boolean => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

// Register the service worker
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!isPushSupported()) {
    console.log('[Push] Push notifications not supported in this browser');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    console.log('[Push] Service Worker registered successfully:', registration.scope);
    return registration;
  } catch (error) {
    console.error('[Push] Service Worker registration failed:', error);
    return null;
  }
};

// Get the current push subscription
export const getSubscription = async (): Promise<PushSubscription | null> => {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch (error) {
    console.error('[Push] Error getting subscription:', error);
    return null;
  }
};

// Subscribe to push notifications
export const subscribeToPush = async (vapidPublicKey: string): Promise<PushSubscription | null> => {
  if (!isPushSupported()) {
    console.log('[Push] Push not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      console.log('[Push] Already subscribed');
      return subscription;
    }

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[Push] Notification permission denied');
      return null;
    }

    // Convert VAPID key to Uint8Array
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    // Subscribe to push
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
    });

    console.log('[Push] Subscribed successfully:', subscription.endpoint);
    return subscription;
  } catch (error) {
    console.error('[Push] Error subscribing to push:', error);
    return null;
  }
};

// Unsubscribe from push notifications
export const unsubscribeFromPush = async (): Promise<boolean> => {
  try {
    const subscription = await getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      console.log('[Push] Unsubscribed successfully');
      return true;
    }
    return false;
  } catch (error) {
    console.error('[Push] Error unsubscribing:', error);
    return false;
  }
};

// Convert VAPID public key from base64 URL to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Define Supabase client type for the function
interface SupabaseClient {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        single: () => Promise<{ data: { id: string; order_numbers: string[] } | null; error: unknown }>;
      };
    };
    update: (data: object) => {
      eq: (column: string, value: string) => Promise<{ error: unknown }>;
    };
    insert: (data: object) => Promise<{ error: unknown }>;
  };
}

// Save subscription to database
export const saveSubscriptionToServer = async (
  subscription: PushSubscription,
  orderNumber: string,
  supabase: SupabaseClient
): Promise<boolean> => {
  try {
    const subscriptionData = subscription.toJSON();
    const keys = subscriptionData.keys as { p256dh: string; auth: string };

    if (!keys || !keys.p256dh || !keys.auth) {
      console.error('[Push] Invalid subscription keys');
      return false;
    }

    // Check if subscription already exists
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id, order_numbers')
      .eq('endpoint', subscriptionData.endpoint || '')
      .single();

    if (existing) {
      // Add order number to existing subscription if not already there
      const orderNumbers = existing.order_numbers || [];
      const normalizedOrderNumber = orderNumber.toUpperCase();
      
      if (!orderNumbers.includes(normalizedOrderNumber)) {
        const { error } = await supabase
          .from('push_subscriptions')
          .update({
            order_numbers: [...orderNumbers, normalizedOrderNumber],
          })
          .eq('id', existing.id);

        if (error) {
          console.error('[Push] Error updating subscription:', error);
          return false;
        }
      }
      console.log('[Push] Updated existing subscription with new order');
    } else {
      // Create new subscription
      const { error } = await supabase
        .from('push_subscriptions')
        .insert({
          endpoint: subscriptionData.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          order_numbers: [orderNumber.toUpperCase()],
        });

      if (error) {
        console.error('[Push] Error saving subscription:', error);
        return false;
      }
      console.log('[Push] Saved new subscription');
    }

    return true;
  } catch (error) {
    console.error('[Push] Error saving subscription to server:', error);
    return false;
  }
};
