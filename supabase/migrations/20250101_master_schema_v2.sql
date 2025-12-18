/*
  MASTER SCHEMA V5 - FINAL HYBRID MODEL
  -------------------------------------------------------------------------
  גרסה מאוחדת:
  1. ניהול משתמשים (הורים, ילדים עצמאיים, ילדים מקושרים).
  2. מנגנון צימוד (Pairing) עם קוד תקף ל-24 שעות.
  3. מערכת תוכן, התקדמות והתראות.
*/

-- ==========================================
-- 1. ניקוי מלא (Clean Slate)
-- ==========================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ניקוי פונקציות הצימוד
DROP FUNCTION IF EXISTS generate_linking_code(uuid);
DROP FUNCTION IF EXISTS check_child_code(text);

-- ניקוי טבלאות (סדר מחיקה חשוב בגלל קשרי גומלין)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS track_day_completions CASCADE;
DROP TABLE IF EXISTS user_track_progress CASCADE;
DROP TABLE IF EXISTS track_day_assignments CASCADE;
DROP TABLE IF EXISTS track_days CASCADE;
DROP TABLE IF EXISTS training_tracks CASCADE;
DROP TABLE IF EXISTS eye_exercises CASCADE;
DROP TABLE IF EXISTS children CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS families CASCADE;

-- ==========================================
-- 2. תשתית משתמשים ומשפחות
-- ==========================================

-- 1. משפחות
CREATE TABLE families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'My Family',
  created_at timestamptz DEFAULT now()
);

-- 2. פרופילים (משתמשי מערכת: הורים וילדים עצמאיים)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id uuid REFERENCES families(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text NOT NULL CHECK (role IN ('parent', 'child_independent')),
  created_at timestamptz DEFAULT now()
);

-- 3. ילדים (השחקנים)
CREATE TABLE children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid REFERENCES families(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- לילד עצמאי
  name text NOT NULL,
  age integer DEFAULT 0,
  avatar_url text DEFAULT 'default',
  is_independent boolean DEFAULT false,
  
  -- שדות למנגנון הצימוד
  linking_code text, 
  linking_code_expires_at timestamptz,
  
  points integer DEFAULT 0,
  daily_streak integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ==========================================
-- 3. תוכן: תרגילים ומסלולים
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
-- 4. התקדמות והתראות
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
-- 5. אוטומציה (טריגר ליצירת משתמשים)
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_family_id uuid;
  user_role text;
  user_name text;
BEGIN
  user_role := new.raw_user_meta_data->>'role';
  user_name := new.raw_user_meta_data->>'name';
  
  IF user_name IS NULL THEN user_name := 'User'; END IF;

  -- 1. יצירת משפחה
  INSERT INTO public.families (name)
  VALUES ('משפחת ' || user_name)
  RETURNING id INTO new_family_id;

  -- 2. יצירת פרופיל
  INSERT INTO public.profiles (id, family_id, email, full_name, role)
  VALUES (new.id, new_family_id, new.email, user_name, user_role);

  -- 3. אם זה ילד עצמאי, יוצרים לו גם רשומה בטבלת הילדים
  IF user_role = 'child_independent' THEN
    INSERT INTO public.children (
      family_id,
      user_id,
      name,
      age,
      is_independent,
      avatar_url
    ) VALUES (
      new_family_id,
      new.id,
      user_name,
      COALESCE((new.raw_user_meta_data->>'age')::int, 8),
      true,
      COALESCE(new.raw_user_meta_data->>'avatarUrl', 'default')
    );
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- 6. אבטחה (RLS Policies)
-- ==========================================

ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_track_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_day_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE eye_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_day_assignments ENABLE ROW LEVEL SECURITY;

-- מדיניות (Policies)

CREATE POLICY "Users view own profile" ON profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users view own family" ON families 
  FOR SELECT USING (
    id IN (SELECT family_id FROM profiles WHERE id = auth.uid())
  );

-- הורים רואים את כל הילדים במשפחה שלהם
CREATE POLICY "Parents view family children" ON children
  FOR ALL USING (
    family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid() AND role = 'parent')
  );

-- ילד עצמאי רואה רק את עצמו
CREATE POLICY "Independent child views self" ON children
  FOR ALL USING (
    user_id = auth.uid()
  );

-- ילד מקושר (שנכנס עם קוד - אין לו auth.uid רגיל בשלב ה-Select הראשוני, 
-- ולכן הגישה תהיה דרך פונקציית ה-RPC, אך אם נרצה לאפשר גישה עתידית:)
-- כרגע הגישה לנתוני הילד תתבצע דרך הפונקציה המאובטחת למטה.

-- תוכן: קריאה לכולם (מחוברים)
CREATE POLICY "Read exercises" ON eye_exercises FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read tracks" ON training_tracks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read track days" ON track_days FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read assignments" ON track_day_assignments FOR SELECT TO authenticated USING (true);

-- התקדמות: לפי הרשאות צפייה בילד
CREATE POLICY "Manage progress" ON user_track_progress 
  FOR ALL USING (
    child_id IN (
      SELECT id FROM children WHERE 
        (user_id = auth.uid()) OR 
        (family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid() AND role = 'parent'))
    )
  );

-- ==========================================
-- 7. פונקציות הצימוד (The Pairing Logic)
-- ==========================================

-- א. יצירת קוד זמני (גישה להורה בלבד)
CREATE OR REPLACE FUNCTION generate_linking_code(target_child_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_new_code text;
  v_is_parent boolean;
BEGIN
  -- בדיקת הרשאה: רק הורה מאותה משפחה יכול לייצר קוד
  SELECT EXISTS (
    SELECT 1 
    FROM children c
    JOIN profiles p ON c.family_id = p.family_id
    WHERE c.id = target_child_id 
      AND p.id = auth.uid() 
      AND p.role = 'parent'
  ) INTO v_is_parent;

  IF NOT v_is_parent THEN
    RAISE EXCEPTION 'Access Denied: Only parents can generate codes.';
  END IF;

  -- יצירת קוד אקראי (6 תווים, אותיות ומספרים)
  v_new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));

  -- עדכון הקוד והתוקף ל-24 שעות
  UPDATE public.children
  SET linking_code = v_new_code,
      linking_code_expires_at = now() + interval '24 hours'
  WHERE id = target_child_id;

  RETURN v_new_code;
END;
$$;

-- ב. כניסה עם קוד (פתוח לכולם - גם למי שלא מחובר)
CREATE OR REPLACE FUNCTION check_child_code(code_input text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_child_record record;
BEGIN
  -- חיפוש ילד עם הקוד המתאים ושהתוקף לא פג
  SELECT * INTO v_child_record
  FROM public.children
  WHERE linking_code = upper(code_input)
    AND linking_code_expires_at > now()
  LIMIT 1;

  IF v_child_record.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- החזרת המידע בפורמט JSON
  RETURN jsonb_build_object(
    'id', v_child_record.id,
    'name', v_child_record.name,
    'family_id', v_child_record.family_id,
    'avatar_url', v_child_record.avatar_url,
    'points', v_child_record.points,
    'daily_streak', v_child_record.daily_streak,
    'is_independent', v_child_record.is_independent
  );
END;
$$;

-- חשיפת הפונקציות לאפליקציה (חשוב מאוד!)
GRANT EXECUTE ON FUNCTION generate_linking_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_child_code(text) TO anon, authenticated;

-- ==========================================
-- 8. נתונים ראשוניים (Seed Data)
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
  -- יצירת מסלול לדוגמה
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