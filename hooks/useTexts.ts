import { useState, useEffect } from 'react';
// ייבוא קובץ התרגומים המקומי מהתיקייה app/constants
import { HEBREW_TRANSLATIONS, TranslationKey } from '../app/constants/translations';

// פונקציה שמקבלת מפתח (למשל 'home.title') ומחזירה את הטקסט בעברית
export function useTexts() {
  
  /**
   * הפונקציה הראשית לשליפת טקסטים
   * @param key - המפתח של הטקסט
   * @param fallback - (אופציונלי) טקסט ברירת מחדל אם לא נמצא
   */
  const getText = (key: TranslationKey | string, fallback?: string): string => {
    // 1. בדיקה אם המפתח קיים במילון שלנו
    if (key && typeof key === 'string' && key in HEBREW_TRANSLATIONS) {
      return HEBREW_TRANSLATIONS[key as TranslationKey];
    }
    
    // 2. אם לא מצאנו במילון, נחזיר את ה-fallback (אם יש)
    if (fallback) {
      return fallback;
    }

    // 3. כמוצא אחרון - נחזיר את המפתח עצמו (כדי שנראה באפליקציה שחסר תרגום)
    return key;
  };

  // אנחנו שומרים על המבנה הישן (loading, error) כדי לא לשבור קבצים אחרים באפליקציה,
  // אבל בפועל הכל נטען מיידית.
  return {
    texts: HEBREW_TRANSLATIONS, // מחזיר את כל המילון
    getText,
    loading: false, // אין זמן טעינה
    error: null,    // אין שגיאות
    refreshTexts: () => {} // פונקציה ריקה (אין צורך לרענן מהשרת)
  };
}

// פונקציית עזר למסכים ספציפיים (נשארה לתמיכה לאחור בקוד קיים)
export function useScreenTexts(screen: string) {
  const { getText } = useTexts();
  return { 
    getText, 
    loading: false, 
    error: null,
    texts: HEBREW_TRANSLATIONS 
  };
}