-- ============================================================
-- RoadWatch — Phase 2 Migration
-- Adds constraints and seed data needed for Phase 2
-- Run after schema.sql
-- ============================================================

-- Add UNIQUE constraint to complaint_assignments so we can upsert
ALTER TABLE complaint_assignments
  ADD CONSTRAINT complaint_assignments_complaint_id_unique UNIQUE (complaint_id);

-- Seed demo road segments for Bengaluru
INSERT INTO road_segments (name, road_type, authority_area_id, start_lat, start_lng, end_lat, end_lng, length_km, surface_type)
SELECT 'MG Road', 'arterial',
       aa.id, 12.9716, 77.5946, 12.9800, 77.6100, 2.3, 'asphalt'
FROM authority_areas aa WHERE aa.city = 'Bengaluru' LIMIT 1;

INSERT INTO road_segments (name, road_type, authority_area_id, start_lat, start_lng, end_lat, end_lng, length_km, surface_type)
SELECT 'Outer Ring Road', 'highway',
       aa.id, 12.9352, 77.6245, 12.9600, 77.6900, 8.1, 'concrete'
FROM authority_areas aa WHERE aa.city = 'Bengaluru' LIMIT 1;

INSERT INTO road_segments (name, road_type, authority_area_id, start_lat, start_lng, end_lat, end_lng, length_km, surface_type)
SELECT 'Hosur Road', 'arterial',
       aa.id, 12.9082, 77.6476, 12.8700, 77.6600, 5.2, 'asphalt'
FROM authority_areas aa WHERE aa.city = 'Bengaluru' LIMIT 1;

-- Seed demo road segments for Mumbai
INSERT INTO road_segments (name, road_type, authority_area_id, start_lat, start_lng, end_lat, end_lng, length_km, surface_type)
SELECT 'Western Express Highway', 'highway',
       aa.id, 19.0760, 72.8777, 19.1500, 72.8900, 12.4, 'asphalt'
FROM authority_areas aa WHERE aa.city = 'Mumbai' LIMIT 1;

-- Seed demo road segments for Hyderabad
INSERT INTO road_segments (name, road_type, authority_area_id, start_lat, start_lng, end_lat, end_lng, length_km, surface_type)
SELECT 'HITEC City Road', 'arterial',
       aa.id, 17.4473, 78.3762, 17.4600, 78.3900, 3.1, 'asphalt'
FROM authority_areas aa WHERE aa.city = 'Hyderabad' LIMIT 1;

-- Seed demo authority user (password: Authority@123)
-- bcrypt hash for 'Authority@123' (cost 10)
INSERT INTO users (name, email, password_hash, role)
VALUES (
  'Demo Authority Officer',
  'authority@roadwatch.in',
  '$2b$10$YourHashHere', -- replace with actual bcrypt hash
  'authority'
) ON CONFLICT (email) DO NOTHING;
