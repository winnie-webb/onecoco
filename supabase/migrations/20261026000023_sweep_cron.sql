-- 0023_sweep_cron.sql
-- The sweep (app/api/v1/system/sweep) has to run every few minutes: it
-- expires unaccepted orders, clears abandoned checkouts (both hand their
-- coconuts back to stock) and promotes scheduled orders. Vercel Hobby only
-- allows a daily cron, so Postgres calls the endpoint itself: pg_cron fires
-- every 5 minutes and pg_net makes the HTTP call.
--
-- The URL and bearer token live in Supabase Vault, never in this file:
--
--   select vault.create_secret('https://<domain>/api/v1/system/sweep', 'sweep_url');
--   select vault.create_secret('<same value as CRON_SECRET in Vercel>', 'cron_secret');
--
-- Until both exist (a local stack, a fresh project) the job does nothing.
-- vercel.json keeps a daily entry as a backstop.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.call_sweep()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_url    text;
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'sweep_url';
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url                  := v_url,
    headers              := jsonb_build_object(
                              'Authorization', 'Bearer ' || v_secret,
                              'Content-Type', 'application/json'),
    body                 := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
END;
$$;

-- Same default-grant gap as 0022: nobody but the scheduler calls this.
REVOKE ALL ON FUNCTION public.call_sweep() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('sweep', '*/5 * * * *', 'SELECT public.call_sweep()');
