-- seed/jamaica.sql
-- Montego Bay pilot configuration.
--
-- Idempotent: safe to run repeatedly. Everything here is DATA -- opening a
-- second beach, or a second country, is an INSERT and never a migration.
--
-- !! THE ZONE POLYGON IS A PLACEHOLDER !!
-- It is a rectangle drawn around the approximate beach area, good enough to
-- exercise ST_Covers end to end. It is NOT a surveyed boundary and must be
-- redrawn in the admin zone editor (Phase 4) against the real beach, the real
-- property lines, and wherever we actually have permission to operate.
-- The zone therefore ships CLOSED.

SET search_path TO public, extensions;

-- ---------------------------------------------------------------------------
-- Geography
-- ---------------------------------------------------------------------------
INSERT INTO countries (iso2, name, currency, active)
VALUES ('JM', 'Jamaica', 'USD', true)
ON CONFLICT (iso2) DO NOTHING;

INSERT INTO regions (country_id, name, slug)
SELECT c.id, 'St. James', 'st-james' FROM countries c WHERE c.iso2 = 'JM'
ON CONFLICT (country_id, slug) DO NOTHING;

INSERT INTO cities (region_id, name, slug, timezone, active, seo_title, seo_description)
SELECT r.id, 'Montego Bay', 'montego-bay', 'America/Jamaica', true,
       'Fresh Coconut Delivery in Montego Bay',
       'Fresh Jamaican coconuts delivered to your beach chair in Montego Bay.'
FROM regions r WHERE r.slug = 'st-james'
ON CONFLICT (region_id, slug) DO NOTHING;

INSERT INTO beaches (city_id, name, slug, blurb, center, active, seo_title, seo_description)
SELECT ci.id,
       'Doctor''s Cave Beach',
       'doctors-cave-beach',
       'The best known stretch of sand in Montego Bay.',
       ST_GeogFromText('POINT(-77.9213 18.4956)'),
       true,
       'Coconut Delivery at Doctor''s Cave Beach',
       'Order a fresh coconut to your spot on Doctor''s Cave Beach, Montego Bay.'
FROM cities ci WHERE ci.slug = 'montego-bay'
ON CONFLICT (city_id, slug) DO NOTHING;

INSERT INTO prep_points (beach_id, name, location, active)
SELECT b.id, 'Doctor''s Cave cart', ST_GeogFromText('POINT(-77.9212 18.4959)'), true
FROM beaches b WHERE b.slug = 'doctors-cave-beach'
  AND NOT EXISTS (SELECT 1 FROM prep_points p WHERE p.beach_id = b.id);

INSERT INTO delivery_zones (
  beach_id, name, polygon, delivery_fee_cents,
  eta_min_minutes, eta_max_minutes, route_factor,
  operating_hours, service_status, access_notes,
  requires_property_permission, priority, active
)
SELECT b.id,
       'Doctor''s Cave — main strand',
       ST_GeogFromText(
         'POLYGON((-77.9225 18.4962, -77.9198 18.4962, -77.9198 18.4945, -77.9225 18.4945, -77.9225 18.4962))'
       ),
       200,           -- US$2.00 delivery
       6, 12,         -- honest range, never a countdown
       1.35,          -- detour multiplier, recalibrate from observed times
       '{"mon":[["09:00","17:00"]],"tue":[["09:00","17:00"]],"wed":[["09:00","17:00"]],"thu":[["09:00","17:00"]],"fri":[["09:00","17:00"]],"sat":[["09:00","17:00"]],"sun":[["09:00","17:00"]]}'::jsonb,
       'CLOSED',      -- placeholder boundary + no operating permission yet
       'PLACEHOLDER BOUNDARY. Redraw against the real beach before opening. Confirm vending permission before this zone is set to OPEN.',
       true,
       0,
       true
FROM beaches b WHERE b.slug = 'doctors-cave-beach'
  AND NOT EXISTS (SELECT 1 FROM delivery_zones z WHERE z.beach_id = b.id);

-- ---------------------------------------------------------------------------
-- A second beach, same city — Phase 11 (§25): "multi-beach expansion,
-- config only, no rewrite." This section is the proof: it is data, not a
-- migration, exactly as the comment at the top of this file promises.
-- Same placeholder-boundary caveat applies — CLOSED until a real surveyed
-- zone and real vending permission both exist (§27.1, still open).
-- ---------------------------------------------------------------------------
INSERT INTO beaches (city_id, name, slug, blurb, center, active, seo_title, seo_description)
SELECT ci.id,
       'Walter Fletcher Beach',
       'walter-fletcher-beach',
       'A calm, lifeguarded public beach on Montego Bay''s Hip Strip.',
       ST_GeogFromText('POINT(-77.9187 18.4737)'),
       true,
       'Coconut Delivery at Walter Fletcher Beach',
       'Order a fresh coconut to your spot on Walter Fletcher Beach, Montego Bay.'
FROM cities ci WHERE ci.slug = 'montego-bay'
ON CONFLICT (city_id, slug) DO NOTHING;

INSERT INTO prep_points (beach_id, name, location, active)
SELECT b.id, 'Walter Fletcher cart', ST_GeogFromText('POINT(-77.9188 18.4739)'), true
FROM beaches b WHERE b.slug = 'walter-fletcher-beach'
  AND NOT EXISTS (SELECT 1 FROM prep_points p WHERE p.beach_id = b.id);

INSERT INTO delivery_zones (
  beach_id, name, polygon, delivery_fee_cents,
  eta_min_minutes, eta_max_minutes, route_factor,
  operating_hours, service_status, access_notes,
  requires_property_permission, priority, active
)
SELECT b.id,
       'Walter Fletcher — main strand',
       ST_GeogFromText(
         'POLYGON((-77.9199 18.4747, -77.9176 18.4747, -77.9176 18.4728, -77.9199 18.4728, -77.9199 18.4747))'
       ),
       200,
       6, 12,
       1.35,
       '{"mon":[["09:00","17:00"]],"tue":[["09:00","17:00"]],"wed":[["09:00","17:00"]],"thu":[["09:00","17:00"]],"fri":[["09:00","17:00"]],"sat":[["09:00","17:00"]],"sun":[["09:00","17:00"]]}'::jsonb,
       'CLOSED',
       'PLACEHOLDER BOUNDARY. Redraw against the real beach before opening. Confirm vending permission before this zone is set to OPEN.',
       true,
       0,
       true
FROM beaches b WHERE b.slug = 'walter-fletcher-beach'
  AND NOT EXISTS (SELECT 1 FROM delivery_zones z WHERE z.beach_id = b.id);

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------
INSERT INTO products (sku, name, slug, description, base_price_cents, currency, active, sort_order) VALUES
  ('CLASSIC', 'Classic Coco', 'classic-coco',
   'One fresh Jamaican coconut, opened cold and handed to you with a straw.', 700, 'USD', true, 10),
  ('TWO', 'Coco for Two', 'coco-for-two',
   'Two fresh coconuts, two straws.', 1200, 'USD', true, 30)
ON CONFLICT (sku) DO NOTHING;

-- Build Your Coco is NOT a separate product: it is Classic plus personalisation.
-- Classic 700 + name 200 = 900, which is the "from US$9" on the marketing page.
INSERT INTO customization_groups (key, label, input_type, required, max_length, min_select, max_select, price_delta_cents, sort_order) VALUES
  ('name',     'Name',     'TEXT',        false, 20, 0, 1, 200, 10),
  ('message',  'Message',  'TEXT',        false, 40, 0, 1,   0, 20),
  ('design',   'Design',   'SELECT',      false, NULL, 0, 1,  0, 30),
  ('occasion', 'Occasion', 'SELECT',      false, NULL, 0, 1,  0, 40),
  ('extras',   'Extras',   'MULTISELECT', false, NULL, 0, 4,  0, 50)
ON CONFLICT (key) DO NOTHING;

INSERT INTO customization_options (group_id, value, label, price_delta_cents, active, sort_order)
SELECT g.id, v.value, v.label, v.price, true, v.sort
FROM customization_groups g
JOIN (VALUES
  ('design',   'jamaican',  'Jamaican',              0, 10),
  ('design',   'tropical',  'Tropical',              0, 20),
  ('design',   'romance',   'Romance',               0, 30),
  ('design',   'birthday',  'Birthday',              0, 40),
  ('occasion', 'vacation',  'Vacation',              0, 10),
  ('occasion', 'birthday',  'Birthday',              0, 20),
  ('occasion', 'honeymoon', 'Honeymoon',             0, 30),
  ('occasion', 'anniversary','Anniversary',          0, 40),
  ('occasion', 'just-married','Just Married',        0, 50),
  ('extras',   'lime',      'Lime',                100, 10),
  ('extras',   'straw',     'Extra straw',           0, 20),
  ('extras',   'spoon',     'Spoon',                 0, 30),
  ('extras',   'water',     'Extra coconut water', 200, 40)
) AS v(group_key, value, label, price, sort) ON v.group_key = g.key
ON CONFLICT (group_id, value) DO NOTHING;

-- Personalisation applies to both products.
INSERT INTO product_customization_groups (product_id, group_id, required, sort_order)
SELECT p.id, g.id, false, g.sort_order
FROM products p CROSS JOIN customization_groups g
WHERE p.sku IN ('CLASSIC', 'TWO')
ON CONFLICT (product_id, group_id) DO NOTHING;

INSERT INTO inventory (prep_point_id, sku, qty_available, qty_reserved)
SELECT pp.id, p.sku, 0, 0
FROM prep_points pp CROSS JOIN products p
ON CONFLICT (prep_point_id, sku) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Operational settings. Every number that would otherwise be a code literal.
-- ---------------------------------------------------------------------------
INSERT INTO settings (key, value) VALUES
  -- Tax is DELIBERATELY zero until the correct treatment is confirmed.
  -- A wrong non-zero rate silently overcharges; zero is visibly unset.
  ('tax_rate_bps',          '0'::jsonb),
  ('service_fee_cents',     '0'::jsonb),
  -- Used for the ETA: metres per second on sand, not pavement.
  ('walking_speed_mps',     '1.1'::jsonb),
  ('prep_time_minutes',     '3'::jsonb),
  ('quote_ttl_minutes',     '15'::jsonb),
  ('accept_window_minutes', '6'::jsonb),
  -- Just-outside-the-polygon band: "you look borderline, confirm?" rather than
  -- a flat rejection that loses a sale to a 20m GPS error.
  ('zone_buffer_metres',    '75'::jsonb),
  -- Above this accuracy we refuse to guess a zone and ask the customer.
  ('accuracy_threshold_m',  '100'::jsonb),
  ('track_token_ttl_hours', '24'::jsonb)
ON CONFLICT (key) DO NOTHING;
