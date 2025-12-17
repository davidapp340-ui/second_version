import { HEBREW_TRANSLATIONS, TranslationKey } from '../app/constants/translations';

export function useTexts() {
  /**
   * פונקציה שמקבלת מפתח טקסט ומחזירה את התרגום
   * @param key - המפתח של הטקסט (למשל 'nav.home')
   */
  const getText = (key: TranslationKey | string): string => {
    // בודק אם המפתח קיים במילון שלנו
    if (key in HEBREW_TRANSLATIONS) {
      return HEBREW_TRANSLATIONS[key as TranslationKey];
    }
    
    // אם לא מצאנו תרגום (למשל מפתח חדש שעוד לא הוספנו), נחזיר את המפתח עצמו
    // זה עוזר לזהות איפה חסר טקסט
    return key;
  };

  return {
    getText,
    loading: false, // אין טעינה, הטקסט זמין מיידית
    error: null,
    refreshTexts: () => {} // פונקציה ריקה כי אין צורך לרענן
  };
}