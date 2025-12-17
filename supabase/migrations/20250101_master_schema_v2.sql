/*
  MASTER SCHEMA V3 - FINAL & COMPLETE
  -----------------------------------
  סה"כ טבלאות: 10
*/

-- ==========================================
-- 1. ניקוי מלא (מחיקת כל הטבלאות הישנות)
-- ==========================================
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS track_day_completions CASCADE;
DROP TABLE IF EXISTS user_track_progress CASCADE;
DROP TABLE IF EXISTS track_day_assignments CASCADE;
DROP TABLE IF EXISTS track_days CASCADE;
DROP TABLE IF EXISTS training_tracks CASCADE;
DROP TABLE IF EXISTS eye_exercises CASCADE;
DROP TABLE IF EXISTS children CASCADE;
DROP TABLE IF EXISTS parents CASCADE;
DROP TABLE IF EXISTS families CASCADE;

-- ==========================================
-- 2. משתמשים ומשפחה (3 טבלאות)
-- ==========================================

-- 1. משפחה (הבסיס)
CREATE TABLE families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text DEFAULT 'My Family',
  created_at timestamptz DEFAULT now()
);

-- 2. הורים
CREATE TABLE parents (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id uuid REFERENCES families(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. ילדים
CREATE TABLE children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid REFERENCES families(id) ON DELETE CASCADE, -- שייך למשפחה
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- אופציונלי (אם הילד עצמאי)
  name text NOT NULL,
  age integer NOT NULL,
  avatar_url text DEFAULT 'default',
  is_independent boolean DEFAULT false,
  points integer DEFAULT 0,
  daily_streak integer DEFAULT 0,
  linking_code text,
  created_at timestamptz DEFAULT now()
);

-- ==========================================
-- 3. תוכן: תרגילים ומסלולים (4 טבלאות)
-- ==========================================

-- 4. תרגילים
CREATE TABLE eye_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  media_type text DEFAULT 'Video', 
  video_url text,
  icon text,
  category text NOT NULL,
  color text DEFAULT '#4ECDC4',
  created_at timestamptz DEFAULT now()
);

-- 5. מסלולים
CREATE TABLE training_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title_he text NOT NULL,
  description_he text,
  total_days integer DEFAULT 30,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 6. ימים במסלול
CREATE TABLE track_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES training_tracks(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  title_he text NOT NULL,
  description_he text,
  is_locked boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(track_id, day_number)
);

-- 7. שיוך תרגילים לימים
CREATE TABLE track_day_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_day_id uuid NOT NULL REFERENCES track_days(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES eye_exercises(id) ON DELETE CASCADE,
  exercise_order integer DEFAULT 1,
  duration_seconds integer DEFAULT 60,
  notes_he text
);

-- ==========================================
-- 4. התקדמות והתראות (3 טבלאות)
-- ==========================================

-- 8. מעקב התקדמות (איפה הילד עומד?)
CREATE TABLE user_track_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES training_tracks(id) ON DELETE CASCADE,
  current_day integer DEFAULT 1,
  days_completed integer[] DEFAULT ARRAY[]::integer[],
  last_activity_at timestamptz DEFAULT now(),
  UNIQUE(child_id, track_id)
);

-- 9. היסטוריית ביצועים (לוגים)
CREATE TABLE track_day_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  track_day_id uuid NOT NULL REFERENCES track_days(id) ON DELETE CASCADE,
  completed_at timestamptz DEFAULT now(),
  duration_spent integer DEFAULT 0
);

-- 10. התראות
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ==========================================
-- 5. אבטחה (RLS Policies)
-- ==========================================

ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE eye_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_day_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_track_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_day_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- הרשאות גישה למשתמשים מחוברים
CREATE POLICY "Auth users full access families" ON families FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users full access parents" ON parents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users full access children" ON children FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- קריאת תוכן
CREATE POLICY "Read exercises" ON eye_exercises FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read tracks" ON training_tracks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read track days" ON track_days FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read assignments" ON track_day_assignments FOR SELECT TO authenticated USING (true);

-- ניהול התקדמות
CREATE POLICY "Manage progress" ON user_track_progress FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Manage completions" ON track_day_completions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Manage notifications" ON notifications FOR ALL TO authenticated USING (auth.uid() = user_id);

-- ==========================================
-- 6. נתונים ראשוניים (Seed Data)
-- ==========================================

INSERT INTO eye_exercises (name, description, category, color, icon) VALUES
('Palming', 'חימום כפות ידיים וכיסוי העיניים.', 'הרפיה', '#4ECDC4', '🤲'),
('Blinking', 'מצמוץ מהיר וקל.', 'יובש', '#FF6B6B', '👀'),
('Near & Far', 'התמקדות באובייקט קרוב ואז רחוק.', 'פוקוס', '#FFE66D', '↔️');

DO $$
DECLARE
  v_track_id uuid;
  v_day1_id uuid;
  v_ex1_id uuid;
  v_ex2_id uuid;
BEGIN
  -- יצירת מסלול
  INSERT INTO training_tracks (name, title_he, total_days)
  VALUES ('Beginner', 'מסלול מתחילים - 30 יום', 30) RETURNING id INTO v_track_id;

  SELECT id INTO v_ex1_id FROM eye_exercises WHERE name = 'Palming';
  SELECT id INTO v_ex2_id FROM eye_exercises WHERE name = 'Blinking';

  -- יום 1 (פתוח)
  INSERT INTO track_days (track_id, day_number, title_he, description_he, is_locked)
  VALUES (v_track_id, 1, 'התחלה רגועה', 'תרגילי בסיס', false) RETURNING id INTO v_day1_id;

  INSERT INTO track_day_assignments (track_day_id, exercise_id, exercise_order, duration_seconds)
  VALUES (v_day1_id, v_ex1_id, 1, 60), (v_day1_id, v_ex2_id, 2, 45);
  
  -- ימים 2-30 (נעולים)
  FOR i IN 2..30 LOOP
    INSERT INTO track_days (track_id, day_number, title_he, is_locked)
    VALUES (v_track_id, i, 'יום ' || i, true);
  END LOOP;
END $$;