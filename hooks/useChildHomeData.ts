import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth'; // שימוש ב-Auth הקיים
import { getChildByUserId, type Child } from '@/lib/familyService';
import { getChildPoints, type ChildPoints } from '@/lib/pointsService';
import { getChildNotifications, markChildNotificationAsRead, type ChildNotification } from '@/lib/notificationService';
import { supabase } from '@/lib/supabase'; // נצטרך את זה לשליפה ישירה אם חסרה פונקציה

export function useChildHomeData() {
  const { user, linkedChild, isLinkedMode } = useAuth(); // שימוש בנתונים מהקונטקסט
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [childName, setChildName] = useState('');
  const [childData, setChildData] = useState<Child | null>(null);
  const [isLinked, setIsLinked] = useState(false);
  const [dailyMessage, setDailyMessage] = useState('');
  const [points, setPoints] = useState<ChildPoints | null>(null);
  const [notifications, setNotifications] = useState<ChildNotification[]>([]);

  const generateDailyMessage = (child: Child | any) => {
    const messages = [
      'כל הכבוד! השלמת את כל התרגילים אתמול!',
      'אל תשכח להתאמן היום!',
      'אתה עושה עבודה מצוינת!',
      'כבר תרגלת היום? בוא נמשיך!',
    ];
    // לוגיקה פשוטה להודעה
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const loadData = async () => {
    try {
      let currentChildId: string | null = null;
      let currentChildName: string = '';

      // תרחיש א': ילד מקושר
      if (isLinkedMode && linkedChild) {
        currentChildId = linkedChild.id;
        currentChildName = linkedChild.name;
        setIsLinked(true);
        
        // המרה בסיסית של הפרופיל למבנה של Child אם חסרים נתונים
        // או שליפה מלאה מהדאטהבייס אם צריך עדכון
        setChildData(linkedChild as unknown as Child); 
      } 
      // תרחיש ב': ילד עצמאי (עם משתמש)
      else if (user) {
        const firstName = user.user_metadata?.first_name || 'ידידי';
        currentChildName = firstName;
        
        // שליפה לפי User ID
        const child = await getChildByUserId(user.id);
        if (child) {
            currentChildId = child.id;
            setChildData(child);
            setIsLinked(child.is_linked || false);
        }
      }

      setChildName(currentChildName);

      // אם זיהינו ילד, נטען את שאר הנתונים (נקודות והתראות)
      if (currentChildId) {
        // שליפה טרייה של נתונים מהשרת (כדי לוודא סנכרון)
        // הערה: אם getChildByUserId לא מתאים לילד מקושר, נשתמש בשליפה ישירה:
        if (isLinkedMode) {
            const { data: freshChild } = await supabase
                .from('children')
                .select('*')
                .eq('id', currentChildId)
                .single();
            
            if (freshChild) {
                setChildData(freshChild as any);
                setDailyMessage(generateDailyMessage(freshChild));
            }
        } else if (childData) {
            setDailyMessage(generateDailyMessage(childData));
        }

        const [childPoints, childNotifications] = await Promise.all([
          getChildPoints(currentChildId).catch(() => null),
          getChildNotifications(currentChildId).catch(() => [])
        ]);

        if (childPoints) setPoints(childPoints);
        if (childNotifications) setNotifications(childNotifications.slice(0, 5));
      }

    } catch (error) {
      console.error('Error loading child home data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, linkedChild]); // תלות בשינוי משתמש

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const markNotificationRead = async (notification: ChildNotification) => {
    if (!notification.is_read) {
      try {
        await markChildNotificationAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
  };

  return {
    loading,
    refreshing,
    childName,
    childData,
    isLinked,
    dailyMessage,
    points,
    notifications,
    onRefresh,
    markNotificationRead
  };
}