ALTER TABLE public.appointment_settings
  ADD COLUMN IF NOT EXISTS send_window_start integer NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS send_window_end integer NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS auto_confirm boolean NOT NULL DEFAULT false;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS confirm_pending_at timestamptz;