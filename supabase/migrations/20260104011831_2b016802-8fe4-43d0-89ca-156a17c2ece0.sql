-- Drop existing restrictive INSERT policy
DROP POLICY IF EXISTS "Anyone can create orders with valid data" ON public.orders;

-- Create a simpler INSERT policy that allows anyone to create orders
CREATE POLICY "Anyone can create orders"
ON public.orders
FOR INSERT
WITH CHECK (
  customer_name IS NOT NULL AND 
  length(customer_name) > 0 AND 
  customer_email IS NOT NULL AND 
  order_number IS NOT NULL AND 
  items IS NOT NULL
);