import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { getCurrentUser } from '@/lib/authService';
import { getChildByUserId, createIndependentChildRecord } from '@/lib/familyService';
import {
  getUserActiveTrackProgress,
  getTrackWithDays,
  getTrackDayExercises,
  getActiveTrainingTracks,
  startTrack,
  type UserProgressWithTrack,
  type TrackWithDays,
  type TrackDay,
} from '@/lib/trackService';
import { getExerciseById } from '@/lib/exercisesService';

export function useProgressScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [childId, setChildId] = useState<string | null>(null);
  const [childName, setChildName] = useState<string>('');
  const [progress, setProgress] = useState<UserProgressWithTrack | null>(null);
  const [trackWithDays, setTrackWithDays] = useState<TrackWithDays | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ניהול המודאל (חלון קופץ) והתרגילים
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<TrackDay | null>(null);
  const [dayExercises, setDayExercises] = useState<any[]>([]);

  useEffect(() => {
    checkUserAccess();
  }, []);

  const checkUserAccess = async () => {
    try {
      const user = await getCurrentUser();
      const userType = user?.user_metadata?.user_type;

      if (userType === 'parent') {
        router.replace('/(tabs)');
        return;
      }
      loadData();
    } catch (error) {
      console.error('Error checking user access:', error);
      router.replace('/(tabs)');
    }
  };

  const loadData = async () => {
    try {
      setError(null);
      const user = await getCurrentUser();
      if (!user) {
        router.replace('/auth/child-login');
        return;
      }

      let child = await getChildByUserId(user.id);

      if (!child) {
        const userType = user.user_metadata?.user_type;
        if (userType === 'child_independent') {
          const firstName = user.user_metadata?.first_name || 'ילד';
          const age = user.user_metadata?.age || 10;
          try {
            child = await createIndependentChildRecord(user.id, firstName, age);
          } catch (createError) {
            console.error('Error creating child record:', createError);
          }
        }
      }

      if (child) {
        setChildId(child.id);
        setChildName(child.name);

        let userProgress = await getUserActiveTrackProgress(child.id);

        if (!userProgress) {
          try {
            const availableTracks = await getActiveTrainingTracks();
            if (availableTracks.length > 0) {
              await startTrack(child.id, availableTracks[0].id);
              userProgress = await getUserActiveTrackProgress(child.id);
            }
          } catch (startError) {
            console.error('Error auto-starting track:', startError);
          }
        }

        setProgress(userProgress);
        if (userProgress) {
          const track = await getTrackWithDays(userProgress.track_id);
          setTrackWithDays(track);
        }
      }
    } catch (err) {
      console.error('Error loading progress:', err);
      setError('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrack = async () => {
    setStarting(true);
    setError(null);
    try {
      let currentChildId = childId;
      if (!currentChildId) {
        const user = await getCurrentUser();
        if (!user) {
          setError('יש להתחבר מחדש');
          return;
        }
        let child = await getChildByUserId(user.id);
        if (child) {
          currentChildId = child.id;
          setChildId(child.id);
          setChildName(child.name);
        } else {
           // לוגיקת יצירת ילד במידת הצורך (פשוטה יותר כאן כי כבר טופלה ב-loadData)
           setError('לא נמצא פרופיל ילד');
           return;
        }
      }

      const availableTracks = await getActiveTrainingTracks();
      if (availableTracks.length === 0) {
        setError('אין מסלולים זמינים כרגע');
        return;
      }

      await startTrack(currentChildId!, availableTracks[0].id);
      const userProgress = await getUserActiveTrackProgress(currentChildId!);
      setProgress(userProgress);

      if (userProgress) {
        const track = await getTrackWithDays(userProgress.track_id);
        setTrackWithDays(track);
      }
    } catch (err) {
      console.error('Error starting track:', err);
      setError('שגיאה בהתחלת המסלול');
    } finally {
      setStarting(false);
    }
  };

  const loadDayExercises = async (trackDayId: string) => {
    try {
      const assignments = await getTrackDayExercises(trackDayId);
      const exercisesWithDetails = await Promise.all(
        assignments.map(async (assignment) => {
          const exercise = await getExerciseById(assignment.exercise_id_text);
          return {
            id: assignment.exercise_id_text,
            title: exercise?.exercise_name || 'תרגיל',
            duration: assignment.duration_override
              ? `${Math.floor(assignment.duration_override / 60)} דקות`
              : '5 דקות',
            isCompleted: false,
            description: exercise?.description || '',
            videoUrl: exercise?.video_link,
            audioUrl: exercise?.audio_link,
            mediaType: exercise?.media_type || 'video',
          };
        })
      );
      setDayExercises(exercisesWithDetails);
    } catch (error) {
      console.error('Error loading day exercises:', error);
      setDayExercises([]);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  return {
    loading,
    refreshing,
    starting,
    error,
    childName,
    progress,
    trackWithDays,
    modalVisible,
    setModalVisible,
    selectedDay,
    setSelectedDay,
    dayExercises,
    setDayExercises,
    onRefresh,
    handleStartTrack,
    loadDayExercises
  };
}