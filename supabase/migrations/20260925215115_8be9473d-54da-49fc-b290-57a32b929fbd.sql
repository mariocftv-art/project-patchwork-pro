ALTER TABLE public.company_profile
  ADD COLUMN IF NOT EXISTS pdf_gold_color text DEFAULT '#C9A227',
  ADD COLUMN IF NOT EXISTS pdf_red_color text DEFAULT '#C8102E';
REVOKE EXECUTE ON FUNCTION public.next_quote_number() FROM public;
GRANT EXECUTE ON FUNCTION public.next_quote_number() TO anon, authenticated;