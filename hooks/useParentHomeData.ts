import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useScreenTexts } from '@/hooks/useTexts';
import { getCurrentUser } from '@/lib/authService';
import {
  getChildren,
  getFamily,
  getResearchMessages,
  type Child,
} from '@/lib/familyService';

export function useParentHomeData() {
  const router = useRouter();
  const { getText, loading: textsLoading } = useScreenTexts('parent_home');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [parentName, setParentName] = useState('');
  const [children, setChildren] = useState<Child[]>([]);
  const [researchMessage, setResearchMessage] = useState('');

  const loadData = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.replace('/auth/parent-login');
        return;
      }

      // שליפת השם מה-Metadata
      const nameFromMeta = user.user_metadata?.first_name || user.user_metadata?.name || '';
      setParentName(nameFromMeta);

      const family = await getFamily(user.id);
      if (family) {
        const childrenData = await getChildren(family.id);
        setChildren(childrenData);
      }

      const messages = await getResearchMessages();
      if (messages && messages.length > 0) {
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        setResearchMessage(randomMessage.message_key);
      }
    } catch (error) {
      console.error('Error loading parent home data:', error);
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

  return {
    loading: loading || textsLoading,
    refreshing,
    parentName,
    children,
    researchMessage,
    onRefresh,
    getText // אנחנו מחצינים גם את פונקציית הטקסטים
  };
}