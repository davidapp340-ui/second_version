/*
  MASTER SCHEMA V2 - COMPLETE & FIXED
  -----------------------------------
  מכיל את כל טבלאות המערכת (משתמשים + אימונים).
  תוקן כדי לאפשר הרשמה חלקה (ללא תלות מעגלית בין הורה למשפחה).
*/

-- ==========================================
-- 1. ניקוי מלא (DROP ALL)
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
-- 2. משתמשים ומשפחה (התיקון המבני)
-- ==========================================

-- א. משפחה (ללא תלות בהורה)
CREATE TABLE families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text DEFAULT 'My Family',
  created_at timestamptz DEFAULT now()
);

-- ב. הורים (מצביעים על משפחה)
CREATE TABLE parents (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id uuid REFERENCES families(id) ON DELETE SET NULL,
  name text NOT NULL, -- שינינו מ-first_name ל-name כדי להתאים לקוד
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ג. ילדים
CREATE TABLE children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid REFERENCES families(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  age integer NOT NULL,
  avatar_url text DEFAULT 'default',
  
  -- שדות שנוספו/שונו להתאמה לקוד:
  is_independent boolean DEFAULT false,
  points integer DEFAULT 0,
  
  -- שדות נוספים
  linking_code text,
  daily_streak integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ==========================================
-- 3. תרגילים ומסלולים (נשמר מהמקור)
-- ==========================================

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

CREATE TABLE training_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title_he text NOT NULL,
  description_he text,
  total_days integer DEFAULT 30,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

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

CREATE TABLE track_day_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_day_id uuid NOT NULL REFERENCES track_days(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES eye_exercises(id) ON DELETE CASCADE,
  exercise_order integer DEFAULT 1,
  duration_seconds integer DEFAULT 60,
  notes_he text
);

-- ==========================================
-- 4. התקדמות והתראות (נשמר מהמקור)
-- ==========================================

CREATE TABLE user_track_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES training_tracks(id) ON DELETE CASCADE,
  current_day integer DEFAULT 1,
  days_completed integer[] DEFAULT ARRAY[]::integer[],
  last_activity_at timestamptz DEFAULT now(),
  UNIQUE(child_id, track_id)
);

CREATE TABLE track_day_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  track_day_id uuid NOT NULL REFERENCES track_days(id) ON DELETE CASCADE,
  completed_at timestamptz DEFAULT now(),
  duration_spent integer DEFAULT 0
);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ==========================================
-- 5. אבטחה (RLS Policies) - מותאם להרשמה
-- ==========================================

-- הפעלת RLS
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE eye_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_day_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_track_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- מדיניות למשפחות (Families)
CREATE POLICY "Enable insert for authenticated users only" ON families FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable select for authenticated users only" ON families FOR SELECT TO authenticated USING (true);

-- מדיניות להורים (Parents)
CREATE POLICY "Enable insert for users based on user_id" ON parents FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Enable select for users based on user_id" ON parents FOR SELECT TO authenticated USING (auth.uid() = id);

-- מדיניות לילדים (Children)
CREATE POLICY "Enable insert for children" ON children FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable select for children" ON children FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable update for children" ON children FOR UPDATE TO authenticated USING (true);

-- מדיניות ציבורית (לקריאת תרגילים ומסלולים)
CREATE POLICY "Public read exercises" ON eye_exercises FOR SELECT USING (true);
CREATE POLICY "Public read tracks" ON training_tracks FOR SELECT USING (true);
CREATE POLICY "Public read days" ON track_days FOR SELECT USING (true);
CREATE POLICY "Public read assignments" ON track_day_assignments FOR SELECT USING (true);

-- מדיניות התקדמות (Progress)
CREATE POLICY "Users manage progress" ON user_track_progress FOR ALL USING (true);
CREATE POLICY "Users manage completions" ON track_day_completions FOR ALL USING (true);
CREATE POLICY "Users manage notifications" ON notifications FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- 6. נתונים ראשוניים (Seed Data)
-- ==========================================

INSERT INTO eye_exercises (name, description, category, color, icon) VALUES
('Palming', 'חימום כפות ידיים וכיסוי העיניים.', 'הרפיה', '#4ECDC4', '🤲'),
('Blinking', 'מצמוץ מהיר וקל.', 'יובש', '#FF6B6B', '👀');

DO $$
DECLARE
  v_track_id uuid;
  v_day_id uuid;
  v_ex1_id uuid;
BEGIN
  -- יצירת מסלול
  INSERT INTO training_tracks (name, title_he, total_days)
  VALUES ('Beginner', 'מסלול מתחילים - 30 יום', 30) RETURNING id INTO v_track_id;

  -- שליפת תרגיל
  SELECT id INTO v_ex1_id FROM eye_exercises WHERE name = 'Palming';

  -- יצירת היום הראשון (פתוח)
  INSERT INTO track_days (track_id, day_number, title_he, description_he, is_locked)
  VALUES (v_track_id, 1, 'יום היכרות', 'מתחילים ברגוע', false) RETURNING id INTO v_day_id;

  INSERT INTO track_day_assignments (track_day_id, exercise_id)
  VALUES (v_day_id, v_ex1_id);
  
  -- יצירת ימים נוספים (נעולים)
  FOR i IN 2..30 LOOP
    INSERT INTO track_days (track_id, day_number, title_he, is_locked)
    VALUES (v_track_id, i, 'יום ' || i, true);
  END LOOP;
END $$;