// hooks/useTexts.ts
// התיקון: הוספנו את "app" לנתיב כדי שהמחשב ימצא את הקובץ
import { HEBREW_TRANSLATIONS, TranslationKey } from '../app/constants/translations';

export function useTexts() {
  
  const getText = (key: TranslationKey | string): string => {
    // בדיקה האם המפתח קיים במילון שלנו
    // (השימוש ב-as מאפשר לטייפסקריפט להבין שאנחנו יודעים מה אנחנו עושים)
    if (key && typeof key === 'string' && key in HEBREW_TRANSLATIONS) {
      return HEBREW_TRANSLATIONS[key as TranslationKey];
    }
    
    // אם לא מצאנו תרגום, נחזיר את המפתח עצמו כדי שתראה מה חסר
    return key;
  };

  return {
    getText,
    loading: false, // אין טעינה כי הקובץ כבר אצלנו
    error: null,
    refreshTexts: () => {} 
  };
}