-- Drop existing INSERT policies that are too permissive
DROP POLICY IF EXISTS "Anonymous users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.orders;

-- Create a more secure INSERT policy that still allows order creation
-- but validates that required fields are properly formatted
CREATE POLICY "Anyone can create orders with valid data" 
ON public.orders 
FOR INSERT 
WITH CHECK (
  -- Ensure required fields are not empty
  customer_name IS NOT NULL AND length(customer_name) > 0 AND
  customer_email IS NOT NULL AND customer_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' AND
  order_number IS NOT NULL AND
  items IS NOT NULL AND
  subtotal >= 0 AND
  total >= 0
);

-- Add index for faster admin queries (without exposing data)
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);