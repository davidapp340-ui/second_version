-- יצירת פונקציה לטיפול במשתמש חדש
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- בדיקה אם המשתמש הוא הורה
  IF (new.raw_user_meta_data->>'user_type' = 'parent') THEN
    INSERT INTO public.parents (id, first_name, email)
    VALUES (
      new.id,
      new.raw_user_meta_data->>'first_name',
      new.email
    );
    
    -- יצירת משפחה אוטומטית (כדי למנוע שגיאות בהמשך)
    INSERT INTO public.families (parent_id, name)
    VALUES (new.id, 'המשפחה שלי');
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- יצירת הטריגר עצמו
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();