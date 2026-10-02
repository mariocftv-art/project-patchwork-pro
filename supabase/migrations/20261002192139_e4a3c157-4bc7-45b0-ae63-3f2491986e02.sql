DO $$ DECLARE q uuid := 'ddccd5d8-1a55-4f99-b07e-d4d52ea657fe'; BEGIN
  IF to_regclass('public.contract_links') IS NOT NULL THEN EXECUTE 'DELETE FROM public.contract_links WHERE quote_id = $1' USING q; END IF;
  DELETE FROM public.contract_signatures WHERE quote_id = q;
  DELETE FROM public.quote_versions WHERE quote_id = q;
  DELETE FROM public.quotes WHERE id = q;
END $$;