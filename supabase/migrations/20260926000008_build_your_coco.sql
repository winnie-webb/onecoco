-- 0008_build_your_coco.sql
-- Build Your Coco (docs/BUILD-YOUR-COCO-3D-PLAN.md §8): garnish stock and a
-- sticker-printer switch per prep point.
--
-- Garnish (hibiscus, umbrella, lime) are customisation OPTIONS, not products,
-- so the existing `inventory` table (keyed by product sku) can't hold them.
-- Stock is an in/out switch rather than a count: nobody on a beach is going to
-- count hibiscus flowers, but "we're out" is one tap.

CREATE TABLE option_stock (
  prep_point_id  uuid NOT NULL REFERENCES prep_points(id) ON DELETE CASCADE,
  option_id      uuid NOT NULL REFERENCES customization_options(id) ON DELETE CASCADE,
  in_stock       boolean NOT NULL DEFAULT true,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  updated_by     uuid REFERENCES app_users(id) ON DELETE SET NULL,
  PRIMARY KEY (prep_point_id, option_id)
);

-- A prep point whose label printer is down (jam, no labels, no power) stops
-- offering custom stickers until ops switches it back on. Same idea as zone
-- pause: the builder hides what can't be made rather than taking the order.
ALTER TABLE prep_points
  ADD COLUMN stickers_available boolean NOT NULL DEFAULT true;

ALTER TABLE option_stock ENABLE ROW LEVEL SECURITY;

-- Whether a garnish is in stock is no more sensitive than the menu itself.
CREATE POLICY public_read_option_stock ON option_stock
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY staff_all_option_stock ON option_stock FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Coco for Two is one order item holding two coconuts. Garnish and extras go
-- on BOTH, so their price is per coconut: the quote engine multiplies an
-- option's price_delta_cents by the product's coconut count when its group is
-- `per_coconut`. Stickers are priced per name instead (`name`, `name_2`).
ALTER TABLE products
  ADD COLUMN coconuts smallint NOT NULL DEFAULT 1,
  ADD CONSTRAINT product_coconuts_positive CHECK (coconuts >= 1);

ALTER TABLE customization_groups
  ADD COLUMN per_coconut boolean NOT NULL DEFAULT false;
