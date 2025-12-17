// זהו קובץ המילון שלנו. כרגע הוא בעברית בלבד.
// בעתיד, אם תרצה אנגלית, פשוט ניצור קובץ דומה עם תרגום.

export const HEBREW_TRANSLATIONS = {
  // --- מסך פתיחה וניווט ---
  'nav.home': 'בית',
  'nav.gallery': 'גלריה',
  'nav.info': 'מידע',
  'nav.settings': 'הגדרות',
  'nav.progress': 'התקדמות',
  
  // --- מסך הבית (Home) ---
  'home.welcome': 'שלום',
  'home.track_title': 'מסלול האימון שלך',
  'home.start_day': 'התחל אימון',
  'home.day_locked': 'יום נעול',
  'home.completed': 'הושלם',

  // --- גלריה (Gallery) ---
  'gallery.title': 'ספריית התרגילים',
  'gallery.filter_all': 'הכל',
  'gallery.search': 'חפש תרגיל...',

  // --- הגדרות ופרופיל ---
  'settings.title': 'הגדרות משתמש',
  'settings.logout': 'התנתק',
  'settings.delete_account': 'מחק חשבון',
  
  // --- הודעות מערכת ---
  'common.loading': 'טוען נתונים...',
  'common.error': 'אירעה שגיאה, נסה שנית',
  'common.save': 'שמור שינויים',
  'common.back': 'חזור',
};

// הגדרת "טיפוס" (Type) שעוזר למחשב להבין אילו מפתחות קיימים
// זה ימנע ממך טעויות כתיב בקוד
export type TranslationKey = keyof typeof HEBREW_TRANSLATIONS;