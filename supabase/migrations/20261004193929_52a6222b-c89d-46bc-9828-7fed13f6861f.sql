CREATE TABLE IF NOT EXISTS public.doc_number_counters (
  year int PRIMARY KEY,
  last_value int NOT NULL DEFAULT 0
);
GRANT ALL ON public.doc_number_counters TO service_role;
ALTER TABLE public.doc_number_counters ENABLE ROW LEVEL SECURITY;

INSERT INTO public.doc_number_counters(year, last_value)
SELECT 2026, COALESCE(MAX(NULLIF(regexp_replace(quote_number,'^MR-2026-',''),quote_number)::int),0)
FROM public.quotes WHERE quote_number ~ '^MR-2026-[0-9]{1,4}$'
ON CONFLICT (year) DO NOTHING;

CREATE OR REPLACE FUNCTION public.next_quote_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE y int := extract(year from now())::int; n int; num text;
BEGIN
  LOOP
    INSERT INTO public.doc_number_counters(year,last_value) VALUES (y,1)
    ON CONFLICT (year) DO UPDATE SET last_value = doc_number_counters.last_value + 1
    RETURNING last_value INTO n;
    num := 'MR-'||y||'-'||lpad(n::text,4,'0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.quotes WHERE quote_number = num);
  END LOOP;
  RETURN num;
END $$;

CREATE OR REPLACE FUNCTION public.assign_quote_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.quote_number IS NULL OR trim(NEW.quote_number) = '' THEN
    NEW.quote_number := public.next_quote_number();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS quotes_assign_number ON public.quotes;
CREATE TRIGGER quotes_assign_number BEFORE INSERT ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.assign_quote_number();