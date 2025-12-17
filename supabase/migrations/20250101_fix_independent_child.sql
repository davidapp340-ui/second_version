/*
  תיקון עבור ילדים עצמאיים:
  1. ביטול החובה לשדה family_id.
  2. הוספת הרשאות אבטחה (RLS) ליצירה וניהול פרופיל עצמאי.
*/

-- 1. הופכים את שיוך המשפחה לאופציונלי
ALTER TABLE children ALTER COLUMN family_id DROP NOT NULL;

-- 2. מאפשרים למשתמש מחובר ליצור את הפרופיל של עצמו בטבלת הילדים
CREATE POLICY "Children can create own profile"
  ON children
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. מאפשרים לילד לראות ולעדכן את הפרופיל של עצמו
CREATE POLICY "Children can manage own profile"
  ON children
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);