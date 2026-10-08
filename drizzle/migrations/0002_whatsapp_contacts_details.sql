ALTER TABLE public.whatsapp_contacts
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS product_id uuid,
  ADD COLUMN IF NOT EXISTS product_title text,
  ADD COLUMN IF NOT EXISTS cart jsonb,
  ADD COLUMN IF NOT EXISTS searches text[],
  ADD COLUMN IF NOT EXISTS pages text[],
  ADD COLUMN IF NOT EXISTS search_term text;
ALTER TABLE public.whatsapp_contacts
  ADD CONSTRAINT wa_contacts_sizes CHECK (
    coalesce(length(customer_name),0) <= 120 AND coalesce(length(customer_phone),0) <= 30
    AND coalesce(length(message),0) <= 4000 AND coalesce(length(search_term),0) <= 200
    AND coalesce(array_length(searches,1),0) <= 20 AND coalesce(array_length(pages,1),0) <= 30
    AND coalesce(pg_column_size(cart),0) <= 20000);