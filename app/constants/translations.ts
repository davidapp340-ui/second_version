// app/constants/translations.ts

export const HEBREW_TRANSLATIONS = {
  // --- ניווט ---
  'nav.home': 'בית',
  'nav.gallery': 'גלריה',
  'nav.info': 'מידע',
  'nav.settings': 'הגדרות',
  'nav.progress': 'התקדמות',
  
  // --- מסך הבית ---
  'home.welcome': 'שלום',
  'home.track_title': 'מסלול האימון שלך',
  'home.start_day': 'התחל אימון',
  'home.day_locked': 'יום נעול',
  'home.completed': 'הושלם',

  // --- גלריה ---
  'gallery.title': 'ספריית התרגילים',
  'gallery.filter_all': 'הכל',
  'gallery.search': 'חפש תרגיל...',

  // --- הגדרות ---
  'settings.title': 'הגדרות משתמש',
  'settings.save': 'שמור שינויים',
  
  // --- כללי ---
  'common.loading': 'טוען...',
  'common.error': 'שגיאה',
};

// יצוא של הטיפוס (Type) כדי שהמחשב יכיר את המפתחות
export type TranslationKey = keyof typeof HEBREW_TRANSLATIONS;