-- 1. ניקוי: מחיקת הטבלאות הקיימות (כדי למנוע התנגשויות עם הגרסאות הישנות)
DROP TABLE IF EXISTS exercises_gallery CASCADE;
DROP TABLE IF EXISTS eye_exercises CASCADE;

-- 2. יצירת טבלת התרגילים מחדש (המידע הטכני)
CREATE TABLE eye_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_name TEXT NOT NULL,
    icon TEXT,
    description TEXT,
    media_type TEXT DEFAULT 'Video', -- 'Video' or 'Audio'
    video_link TEXT,
    audio_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. יצירת טבלת הגלריה מחדש (הקטגוריות והעיצוב)
CREATE TABLE exercises_gallery (
    id UUID PRIMARY KEY REFERENCES eye_exercises(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    color TEXT NOT NULL,
    display BOOLEAN DEFAULT true,
    display_order INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. הגדרות אבטחה (כדי שהאפליקציה תוכל לקרוא את המידע)
ALTER TABLE eye_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON eye_exercises FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON exercises_gallery FOR SELECT USING (true);

-- 5. הוספת תרגיל ראשון לדוגמה (כדי שתוכל לראות שמשהו עובד)
DO $$
DECLARE
  new_exercise_id UUID;
BEGIN
  -- יצירת התרגיל
  INSERT INTO eye_exercises (exercise_name, description, icon)
  VALUES ('מצמוץ מהיר', 'מצמץ בעיניים במהירות למשך 30 שניות', '👀')
  RETURNING id INTO new_exercise_id;

  -- שיוך לקטגוריה
  INSERT INTO exercises_gallery (id, category, color, display_order)
  VALUES (new_exercise_id, 'הרפיה', '#3498DB', 1);
END $$;