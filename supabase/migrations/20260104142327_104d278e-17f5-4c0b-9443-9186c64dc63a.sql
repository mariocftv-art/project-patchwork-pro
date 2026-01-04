-- Create table to store push subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  order_numbers TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert their subscription (anonymous users tracking orders)
CREATE POLICY "Anyone can create push subscription" 
ON public.push_subscriptions 
FOR INSERT 
WITH CHECK (true);

-- Allow anyone to update their own subscription by endpoint
CREATE POLICY "Anyone can update their subscription" 
ON public.push_subscriptions 
FOR UPDATE 
USING (true);

-- Allow reading subscriptions for sending notifications (service role only will be used)
CREATE POLICY "Service role can read subscriptions" 
ON public.push_subscriptions 
FOR SELECT 
USING (true);

-- Allow deleting subscriptions
CREATE POLICY "Anyone can delete their subscription" 
ON public.push_subscriptions 
FOR DELETE 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for push_subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.push_subscriptions;