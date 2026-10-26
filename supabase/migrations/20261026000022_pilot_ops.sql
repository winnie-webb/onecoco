-- 0022_pilot_ops.sql
-- Pilot launch (Harmony Beach Park): the gaps between "the software works"
-- and "a small team can run it from their phones this week".
--
-- 1. Stock that actually counts down. Until now inventory was only a
--    "> 0" gate and no order ever reduced it, so "50 coconuts" meant
--    "unlimited". Stock is counted in coconuts: a product draws
--    `stock_units` from the inventory row of `stock_sku` (its own SKU when
--    NULL), so Coco for Two takes 2 from the same pool as Classic.
-- 2. Runners can carry more than one order. With max_concurrent_orders = 1
--    a second order arriving while the only runner was out delivering
--    could not be accepted and was auto-refunded by the sweep.
-- 3. Staff can read the customer's checkout GPS point (for a maps link).
--    PostgREST returns geography as EWKB, so lng/lat come out of SQL, the
--    same way as 0016.

SET search_path TO public, extensions;

-- ---------------------------------------------------------------------------
-- 1. Stock
-- ---------------------------------------------------------------------------
ALTER TABLE products
  ADD COLUMN stock_sku   text REFERENCES products(sku),
  ADD COLUMN stock_units smallint NOT NULL DEFAULT 1,
  ADD CONSTRAINT product_stock_units_positive CHECK (stock_units >= 1);

ALTER TABLE orders
  ADD COLUMN stock_reserved boolean NOT NULL DEFAULT false;

-- Takes the order's coconuts out of its prep point's stock, all or nothing.
-- Returns false (and changes nothing) when there isn't enough. Idempotent:
-- an order that already holds its stock returns true without taking more.
CREATE FUNCTION public.reserve_order_stock(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_prep_point uuid;
  v_reserved boolean;
  v_need record;
BEGIN
  SELECT prep_point_id, stock_reserved INTO v_prep_point, v_reserved
  FROM orders WHERE id = p_order_id FOR UPDATE;

  IF NOT FOUND OR v_prep_point IS NULL THEN
    RETURN false;
  END IF;
  IF v_reserved THEN
    RETURN true;
  END IF;

  BEGIN
    FOR v_need IN
      SELECT COALESCE(p.stock_sku, p.sku) AS sku, SUM(oi.qty * p.stock_units)::integer AS units
      FROM order_items oi JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = p_order_id
      GROUP BY COALESCE(p.stock_sku, p.sku)
    LOOP
      UPDATE inventory
      SET qty_available = qty_available - v_need.units, updated_at = now()
      WHERE prep_point_id = v_prep_point AND sku = v_need.sku AND qty_available >= v_need.units;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'insufficient stock' USING ERRCODE = 'P0001';
      END IF;
    END LOOP;
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    -- The sub-block's savepoint is rolled back: no partial decrement.
    RETURN false;
  END;

  UPDATE orders SET stock_reserved = true WHERE id = p_order_id;
  RETURN true;
END;
$fn$;

-- Puts an order's coconuts back (cancelled, expired, payment failed).
-- No-op for an order that holds no stock, so it is safe to call twice.
CREATE FUNCTION public.release_order_stock(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_prep_point uuid;
  v_need record;
BEGIN
  UPDATE orders SET stock_reserved = false
  WHERE id = p_order_id AND stock_reserved
  RETURNING prep_point_id INTO v_prep_point;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  FOR v_need IN
    SELECT COALESCE(p.stock_sku, p.sku) AS sku, SUM(oi.qty * p.stock_units)::integer AS units
    FROM order_items oi JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = p_order_id
    GROUP BY COALESCE(p.stock_sku, p.sku)
  LOOP
    UPDATE inventory
    SET qty_available = qty_available + v_need.units, updated_at = now()
    WHERE prep_point_id = v_prep_point AND sku = v_need.sku;
  END LOOP;
  RETURN true;
END;
$fn$;

-- Supabase grants EXECUTE on new public functions to anon/authenticated by
-- default, which would let anyone change stock over /rest/v1/rpc.
REVOKE ALL ON FUNCTION public.reserve_order_stock(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_order_stock(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_order_stock(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_order_stock(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 2. Runner capacity
-- ---------------------------------------------------------------------------
ALTER TABLE runners ALTER COLUMN max_concurrent_orders SET DEFAULT 5;
UPDATE runners SET max_concurrent_orders = 5 WHERE max_concurrent_orders = 1;

-- ---------------------------------------------------------------------------
-- 3. Customer location for staff
-- ---------------------------------------------------------------------------
-- The latest point we hold for an order (checkout, or a later "I moved").
-- Service role only: callers must already have checked the viewer may see
-- this order (staff, or the runner it is assigned to).
CREATE FUNCTION public.order_latest_lnglat(p_order_id uuid)
RETURNS TABLE (lng double precision, lat double precision, accuracy_m numeric)
LANGUAGE sql
STABLE
AS $fn$
  SELECT ST_X(point::geometry), ST_Y(point::geometry), accuracy_m
  FROM order_locations
  WHERE order_id = p_order_id
  ORDER BY captured_at DESC
  LIMIT 1;
$fn$;

REVOKE ALL ON FUNCTION public.order_latest_lnglat(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.order_latest_lnglat(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Same default-grant gap on earlier service-role-only functions. All are
--    only ever called with the service-role client; accept_order_offer
--    trusts its p_runner_id argument (0012), so it must not be public.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.accept_order_offer(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.promote_scheduled_orders() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.truncate_stale_order_locations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_order_offer(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.promote_scheduled_orders() TO service_role;
GRANT EXECUTE ON FUNCTION public.truncate_stale_order_locations() TO service_role;
