CREATE OR REPLACE FUNCTION public.create_cart_quote(_customer_name text, _customer_email text, _customer_phone text, _customer_address text, _items jsonb, _subtotal numeric, _shipping numeric, _total numeric)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE num text;
BEGIN
  IF length(trim(coalesce(_customer_name,''))) = 0 OR length(_customer_name) > 200 THEN RAISE EXCEPTION 'invalid name'; END IF;
  IF length(coalesce(_customer_email,'')) > 255 OR length(coalesce(_customer_phone,'')) > 40 OR length(coalesce(_customer_address,'')) > 500 THEN RAISE EXCEPTION 'invalid data'; END IF;
  IF jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) < 1 OR jsonb_array_length(_items) > 200 THEN RAISE EXCEPTION 'invalid items'; END IF;
  IF _subtotal < 0 OR _shipping < 0 OR _total < 0 THEN RAISE EXCEPTION 'invalid totals'; END IF;
  num := public.next_quote_number();
  INSERT INTO public.quotes(quote_number, customer_name, customer_email, customer_phone, customer_address, items, subtotal, shipping_fee, total, doc_type, status, show_signatures, customer)
  VALUES (num, trim(_customer_name), coalesce(_customer_email,''), nullif(_customer_phone,''), nullif(_customer_address,''), _items, _subtotal, _shipping, _total, 'orcamento', 'rascunho', false,
    jsonb_build_object('name', trim(_customer_name), 'phone', nullif(_customer_phone,''), 'whatsapp', nullif(_customer_phone,''), 'email', nullif(_customer_email,''), 'street', nullif(_customer_address,'')));
  RETURN num;
END $$;

CREATE OR REPLACE FUNCTION public.attach_cart_quote_pdf(_quote_number text, _pdf_url text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _pdf_url IS NULL OR _pdf_url !~ '^https://[^ ]+/storage/v1/object/public/quotes/[A-Za-z0-9-]+\.pdf$' THEN RETURN false; END IF;
  UPDATE public.quotes SET pdf_url = _pdf_url
   WHERE quote_number = _quote_number AND pdf_url IS NULL AND created_at > now() - interval '15 minutes' AND doc_type = 'orcamento' AND status = 'rascunho';
  RETURN FOUND;
END $$;

REVOKE ALL ON FUNCTION public.create_cart_quote(text,text,text,text,jsonb,numeric,numeric,numeric) FROM public;
REVOKE ALL ON FUNCTION public.attach_cart_quote_pdf(text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.create_cart_quote(text,text,text,text,jsonb,numeric,numeric,numeric) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attach_cart_quote_pdf(text,text) TO anon, authenticated;