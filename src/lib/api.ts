import { supabase } from './supabase';
import { Child } from '../types/database';

export const authApi = {
  // אימות קוד ילד
  async verifyChildCode(code: string): Promise<{ data: Child | null; error: any }> {
    // קריאה לפונקציית ה-RPC שיצרנו ב-SQL
    const { data, error } = await supabase
      .rpc('verify_pairing_code', { input_code: code.toUpperCase() }) // המרה לאותיות גדולות ליתר ביטחון
      .single();

    return { data, error };
  },

  // כאן נוכל להוסיף בעתיד פונקציות נוספות כמו createChild וכו'
};