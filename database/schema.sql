-- ============================================================
-- ROADWATCH — Full PostgreSQL Schema
-- Covers all 29 modules across 4 phases
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "postgis"; -- For geo queries

-- ============================================================
-- 1. USERS & AUTH (Module 1, 25)
-- ============================================================
CREATE TYPE user_role AS ENUM ('citizen', 'authority', 'admin', 'contractor');

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),             -- NULL for guest
  role          user_role DEFAULT 'citizen',
  phone         VARCHAR(20),
  avatar_url    TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  is_guest      BOOLEAN DEFAULT FALSE,
  is_verified   BOOLEAN DEFAULT FALSE,
  otp_code      VARCHAR(6),
  otp_expires_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. ROADS & AUTHORITY AREAS (Modules 12, 13)
-- ============================================================
CREATE TABLE authority_areas (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(200) NOT NULL,         -- e.g. "BBMP Zone 2"
  authority_org VARCHAR(200) NOT NULL,         -- e.g. "BBMP", "NHAI"
  city          VARCHAR(100),
  state         VARCHAR(100),
  boundary_geojson TEXT,                       -- GeoJSON polygon
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE road_segments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(200),                  -- e.g. "MG Road"
  road_type     VARCHAR(50),                   -- highway, arterial, local
  authority_area_id UUID REFERENCES authority_areas(id) ON DELETE SET NULL,
  start_lat     DECIMAL(9,6),
  start_lng     DECIMAL(9,6),
  end_lat       DECIMAL(9,6),
  end_lng       DECIMAL(9,6),
  length_km     DECIMAL(8,3),
  surface_type  VARCHAR(50),                   -- asphalt, concrete, gravel
  last_repaired_at TIMESTAMPTZ,
  health_score  DECIMAL(3,1) DEFAULT 10.0,     -- 0–10 (Module 17)
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. ISSUES / COMPLAINTS (Modules 2–9, 11, 14, 15)
-- ============================================================
CREATE TYPE issue_type AS ENUM (
  'pothole', 'crack', 'waterlogging', 'broken_divider',
  'missing_signage', 'encroachment', 'streetlight_failure', 'other'
);

CREATE TYPE severity_level AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE complaint_status AS ENUM (
  'submitted', 'under_review', 'assigned', 'in_progress',
  'resolved', 'rejected', 'escalated'
);

CREATE TABLE complaints (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_no    VARCHAR(20) UNIQUE NOT NULL,  -- RW-2024-00001
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  road_segment_id UUID REFERENCES road_segments(id) ON DELETE SET NULL,
  authority_area_id UUID REFERENCES authority_areas(id) ON DELETE SET NULL,
  
  -- Location (Module 2)
  latitude        DECIMAL(9,6) NOT NULL,
  longitude       DECIMAL(9,6) NOT NULL,
  address_text    TEXT,
  
  -- Issue details (Modules 6, 7)
  issue_type      issue_type DEFAULT 'other',
  severity        severity_level DEFAULT 'medium',
  title           VARCHAR(300),
  description     TEXT,
  
  -- AI Analysis (Modules 4, 5)
  ai_analyzed     BOOLEAN DEFAULT FALSE,
  ai_confidence   DECIMAL(4,3),               -- 0.000 to 1.000
  ai_issue_type   issue_type,
  ai_severity     severity_level,
  ai_notes        TEXT,
  
  -- Status (Module 15)
  status          complaint_status DEFAULT 'submitted',
  resolved_image_url TEXT,
  
  -- Duplicate detection (Module 9)
  is_duplicate    BOOLEAN DEFAULT FALSE,
  parent_complaint_id UUID REFERENCES complaints(id) ON DELETE SET NULL,
  
  -- Metadata
  upvotes         INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Images (Module 3)
CREATE TABLE complaint_images (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
  url          TEXT NOT NULL,
  is_primary   BOOLEAN DEFAULT FALSE,
  processed    BOOLEAN DEFAULT FALSE,         -- after AI preprocessing (Module 4)
  uploaded_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Status history (Module 15)
CREATE TABLE complaint_status_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
  old_status   complaint_status,
  new_status   complaint_status NOT NULL,
  changed_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  notes        TEXT,
  changed_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. CONTRACTOR MANAGEMENT (Module 20)
-- ============================================================
CREATE TABLE contractors (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(200) NOT NULL,
  license_number  VARCHAR(100),
  email           VARCHAR(255),
  phone           VARCHAR(20),
  rating          DECIMAL(2,1) DEFAULT 0.0,   -- 0.0 – 5.0
  total_jobs      INTEGER DEFAULT 0,
  completed_jobs  INTEGER DEFAULT 0,
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE complaint_assignments (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id   UUID REFERENCES complaints(id) ON DELETE CASCADE,
  assigned_to    UUID REFERENCES users(id) ON DELETE SET NULL,    -- authority officer
  contractor_id  UUID REFERENCES contractors(id) ON DELETE SET NULL,
  assigned_at    TIMESTAMPTZ DEFAULT NOW(),
  due_date       TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  notes          TEXT
);

-- ============================================================
-- 5. ROAD HEALTH SCORING (Module 17)
-- ============================================================
CREATE TABLE road_health_scores (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  road_segment_id UUID REFERENCES road_segments(id) ON DELETE CASCADE,
  score           DECIMAL(4,1) NOT NULL,       -- 0.0 – 100.0
  issue_count     INTEGER DEFAULT 0,
  critical_count  INTEGER DEFAULT 0,
  last_repair_age_days INTEGER,
  computed_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. BUDGET TRACKING (Module 19)
-- ============================================================
CREATE TABLE budget_allocations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  authority_area_id UUID REFERENCES authority_areas(id),
  fiscal_year     VARCHAR(10) NOT NULL,        -- e.g. "2024-25"
  allocated_amount DECIMAL(15,2) NOT NULL,
  spent_amount    DECIMAL(15,2) DEFAULT 0,
  currency        VARCHAR(5) DEFAULT 'INR',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE budget_transactions (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_allocation_id UUID REFERENCES budget_allocations(id) ON DELETE CASCADE,
  complaint_id         UUID REFERENCES complaints(id) ON DELETE SET NULL,
  contractor_id        UUID REFERENCES contractors(id) ON DELETE SET NULL,
  amount               DECIMAL(12,2) NOT NULL,
  description          TEXT,
  transacted_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. NOTIFICATIONS (Module 22)
-- ============================================================
CREATE TYPE notification_type AS ENUM (
  'status_update', 'new_complaint', 'assignment', 'escalation',
  'resolved', 'system'
);

CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  complaint_id UUID REFERENCES complaints(id) ON DELETE SET NULL,
  type         notification_type DEFAULT 'system',
  title        VARCHAR(200) NOT NULL,
  message      TEXT NOT NULL,
  is_read      BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. ANALYTICS & PREDICTIONS (Modules 18, 21)
-- ============================================================
CREATE TABLE analytics_snapshots (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_date   DATE NOT NULL,
  authority_area_id UUID REFERENCES authority_areas(id) ON DELETE CASCADE,
  total_complaints INTEGER DEFAULT 0,
  resolved_count   INTEGER DEFAULT 0,
  avg_resolution_days DECIMAL(5,1),
  top_issue_type   issue_type,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. AUDIT LOGS (Modules 25, 29)
-- ============================================================
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id   UUID,
  details     JSONB,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_complaints_location ON complaints(latitude, longitude);
CREATE INDEX idx_complaints_status   ON complaints(status);
CREATE INDEX idx_complaints_user     ON complaints(user_id);
CREATE INDEX idx_complaints_severity ON complaints(severity);
CREATE INDEX idx_notifications_user  ON notifications(user_id, is_read);
CREATE INDEX idx_status_log_complaint ON complaint_status_log(complaint_id);
CREATE INDEX idx_road_health_segment ON road_health_scores(road_segment_id);

-- ============================================================
-- SEED: Demo Authority Areas
-- ============================================================
INSERT INTO authority_areas (name, authority_org, city, state, contact_email) VALUES
  ('BBMP Central Zone',  'BBMP',  'Bengaluru', 'Karnataka', 'central@bbmp.gov.in'),
  ('BBMP East Zone',     'BBMP',  'Bengaluru', 'Karnataka', 'east@bbmp.gov.in'),
  ('NHAI NH-44 Stretch', 'NHAI',  'Bengaluru', 'Karnataka', 'nh44@nhai.gov.in'),
  ('MCGM Ward 12',       'MCGM',  'Mumbai',    'Maharashtra', 'ward12@mcgm.gov.in'),
  ('GHMC Zone 1',        'GHMC',  'Hyderabad', 'Telangana',  'zone1@ghmc.gov.in');
