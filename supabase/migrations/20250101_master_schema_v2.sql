/*
  MASTER SCHEMA V2 - FIXED & ALIGNED
  ----------------------------------
  מותאם בדיוק לקוד ה-React Native:
  1. families: לא דורש הורה (מאפשר יצירה ראשונית וילדים עצמאיים).
  2. parents: כולל family_id ושם שדה name.
  3. children: כולל is_independent ושם שדה points.
*/

-- 1. ניקוי טבלאות קודמות (בסדר נכון למניעת שגיאות קשרי גומלין)
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
-- חלק א': תשתית משפחתית
-- ==========================================

-- טבלת משפחות - הלב של המערכת
CREATE TABLE families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text DEFAULT 'My Family',
  created_at timestamptz DEFAULT now()
  -- הסרנו את parent_id כדי למנוע מעגליות ולאפשר ילדים עצמאיים
);

-- טבלת הורים
CREATE TABLE parents (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id uuid REFERENCES families(id) ON DELETE SET NULL, -- הקישור למשפחה
  name text NOT NULL, -- תואם לקוד (במקום first_name)
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- טבלת ילדים
CREATE TABLE children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid REFERENCES families(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  age integer NOT NULL,
  avatar_url text,
  
  -- שדות לוגיקה ייחודיים
  is_independent boolean DEFAULT false, -- תואם לקוד
  points integer DEFAULT 0,             -- תואם לקוד (במקום total_points)
  
  -- שדות נוספים
  linking_code text,
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
-- חלק ד': אבטחה (RLS Policies) - פתוח לכתיבה
-- ==========================================

-- הפעלת מנגנון האבטחה
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE eye_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_day_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_track_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 1. מדיניות למשפחות
-- מאפשר לכל משתמש מחובר ליצור משפחה (הורה או ילד עצמאי)
CREATE POLICY "Users can insert families" ON families FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can view families" ON families FOR SELECT TO authenticated USING (true);

-- 2. מדיניות להורים
-- מאפשר למשתמש ליצור את הפרופיל של עצמו
CREATE POLICY "Users can insert own parent" ON parents FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can view own parent" ON parents FOR SELECT TO authenticated USING (auth.uid() = id);

-- 3. מדיניות לילדים
-- מאפשר יצירת פרופיל (בין אם ע"י הילד עצמו או ע"י הורה)
CREATE POLICY "Users can insert children" ON children FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can view children" ON children FOR SELECT TO authenticated USING (true);
CREATE POLICY "Children can update points" ON children FOR UPDATE TO authenticated USING (true);

-- 4. מדיניות ציבורית לתוכן
CREATE POLICY "Public read exercises" ON eye_exercises FOR SELECT USING (true);
CREATE POLICY "Public read tracks" ON training_tracks FOR SELECT USING (true);
CREATE POLICY "Public read days" ON track_days FOR SELECT USING (true);
CREATE POLICY "Public read assignments" ON track_day_assignments FOR SELECT USING (true);

-- 5. מדיניות התקדמות
CREATE POLICY "Users manage progress" ON user_track_progress FOR ALL USING (true);
CREATE POLICY "Users manage completions" ON track_day_completions FOR ALL USING (true);


-- ==========================================
-- חלק ה': נתונים ראשוניים (Seed Data)
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
  
  -- יצירת ימים נוספים
  FOR i IN 2..30 LOOP
    INSERT INTO track_days (track_id, day_number, title_he, is_locked)
    VALUES (v_track_id, i, 'יום ' || i, true);
  END LOOP;
END $$;