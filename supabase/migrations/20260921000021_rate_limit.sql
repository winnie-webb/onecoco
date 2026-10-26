-- Audit T-9: lib/security/rate-limit.ts was an in-memory map, which on
-- Vercel is per-lambda-instance — effectively no limit at all. This moves
-- the counter into Postgres so every instance shares it.
--
-- Fixed-window counter: one row per (key, window). The upsert is a single
-- atomic statement, so concurrent requests can't both read a stale count.
-- Rows for finished windows are deleted by the sweep (prune_rate_limits).

CREATE TABLE rate_limit_hits (
  key          text        NOT NULL,
  window_start timestamptz NOT NULL,
  hits         integer     NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

-- Service-role only: no policies, so anon/authenticated see nothing.
ALTER TABLE rate_limit_hits ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.rate_limit_hit(p_key text, p_limit integer, p_window_seconds integer)
RETURNS boolean
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_window timestamptz := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
BEGIN
  INSERT INTO rate_limit_hits (key, window_start, hits)
  VALUES (p_key, v_window, 1)
  ON CONFLICT (key, window_start) DO UPDATE SET hits = rate_limit_hits.hits + 1
  RETURNING hits INTO v_hits;
  RETURN v_hits > p_limit;
END;
$fn$;

CREATE FUNCTION public.prune_rate_limits()
RETURNS integer
LANGUAGE sql
AS $fn$
  WITH gone AS (DELETE FROM rate_limit_hits WHERE window_start < now() - interval '1 hour' RETURNING 1)
  SELECT count(*)::integer FROM gone;
$fn$;

REVOKE ALL ON FUNCTION public.rate_limit_hit(text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prune_rate_limits() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.prune_rate_limits() TO service_role;
