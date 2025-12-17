import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser } from '@/lib/authService';
import { getChildByUserId, type Child } from '@/lib/familyService';
import { getChildPoints, type ChildPoints } from '@/lib/pointsService';
import { getChildNotifications, markChildNotificationAsRead, type ChildNotification } from '@/lib/notificationService';

export function useChildHomeData() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [childName, setChildName] = useState('');
  const [childData, setChildData] = useState<Child | null>(null);
  const [isLinked, setIsLinked] = useState(false);
  const [dailyMessage, setDailyMessage] = useState('');
  const [points, setPoints] = useState<ChildPoints | null>(null);
  const [notifications, setNotifications] = useState<ChildNotification[]>([]);

  const generateDailyMessage = (child: Child) => {
    const messages = [
      'כל הכבוד! השלמת את כל התרגילים אתמול!',
      'אל תשכח להתאמן היום!',
      'אתה עושה עבודה מצוינת!',
      'כבר תרגלת היום? בוא נמשיך!',
    ];

    if (child.last_practice_date) {
      const today = new Date().toDateString();
      const lastPractice = new Date(child.last_practice_date).toDateString();
      if (today === lastPractice) {
        return 'כל הכבוד! השלמת את התרגיל היומי! 🎉';
      }
    }

    return messages[Math.floor(Math.random() * messages.length)];
  };

  const loadData = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const firstName = user.user_metadata?.first_name || 'ידידי';
      setChildName(firstName);

      const child = await getChildByUserId(user.id);
      if (child) {
        setChildData(child);
        setIsLinked(child.is_linked);
        setDailyMessage(generateDailyMessage(child));

        // טעינת נקודות והתראות במקביל (מהיר יותר)
        const [childPoints, childNotifications] = await Promise.all([
          getChildPoints(child.id).catch(() => null),
          getChildNotifications(child.id).catch(() => [])
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
  }, []);

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