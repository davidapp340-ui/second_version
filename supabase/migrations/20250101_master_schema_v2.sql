/*
  MASTER SCHEMA V2 - FINAL FIX
  ----------------------------
  כולל תמיכה מובנית בילדים עצמאיים (ללא חובת משפחה).
*/

-- 1. ניקוי מלא
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS track_day_completions CASCADE;
DROP TABLE IF EXISTS user_track_progress CASCADE;
DROP TABLE IF EXISTS track_day_assignments CASCADE;
DROP TABLE IF EXISTS track_days CASCADE;
DROP TABLE IF EXISTS training_tracks CASCADE;
DROP TABLE IF EXISTS eye_exercises CASCADE;
DROP TABLE IF EXISTS research_messages CASCADE;
DROP TABLE IF EXISTS children CASCADE;
DROP TABLE IF EXISTS families CASCADE;
DROP TABLE IF EXISTS parents CASCADE;

-- ==========================================
-- חלק א': משתמשים ומשפחה
-- ==========================================

CREATE TABLE parents (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  name text DEFAULT 'My Family',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- התיקון: family_id הוא עכשיו אופציונלי (יכול להיות NULL לילד עצמאי)
  family_id uuid REFERENCES families(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  age integer NOT NULL,
  avatar_url text,
  linking_code text UNIQUE NOT NULL,
  is_linked boolean DEFAULT false,
  current_step integer DEFAULT 1,
  total_points integer DEFAULT 0,
  daily_streak integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ==========================================
-- חלק ב': תרגילים ומסלולים
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
-- חלק ג': התקדמות והתראות
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
-- חלק ד': אבטחה (RLS) - התיקון הקריטי
-- ==========================================

ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE eye_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_day_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_track_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- מדיניות קריאה ציבורית (תרגילים ומסלולים)
CREATE POLICY "Public read exercises" ON eye_exercises FOR SELECT USING (true);
CREATE POLICY "Public read tracks" ON training_tracks FOR SELECT USING (true);
CREATE POLICY "Public read days" ON track_days FOR SELECT USING (true);
CREATE POLICY "Public read assignments" ON track_day_assignments FOR SELECT USING (true);

-- מדיניות הרשמה לילדים עצמאיים (חשוב מאוד!)
CREATE POLICY "Children can insert own profile" ON children FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Children can update own profile" ON children FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Children can read own profile" ON children FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- מדיניות הורים
CREATE POLICY "Parents manage own data" ON parents FOR ALL USING (auth.uid() = id);

-- מדיניות התקדמות
CREATE POLICY "Users manage own progress" ON user_track_progress FOR ALL USING (
  EXISTS (SELECT 1 FROM children WHERE id = user_track_progress.child_id AND user_id = auth.uid())
);
CREATE POLICY "Users manage completions" ON track_day_completions FOR ALL USING (
  EXISTS (SELECT 1 FROM children WHERE id = track_day_completions.child_id AND user_id = auth.uid())
);

-- ==========================================
-- חלק ה': נתונים ראשוניים
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
  INSERT INTO training_tracks (name, title_he, total_days)
  VALUES ('Beginner', 'מסלול מתחילים - 30 יום', 30) RETURNING id INTO v_track_id;

  SELECT id INTO v_ex1_id FROM eye_exercises WHERE name = 'Palming';

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