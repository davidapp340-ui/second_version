import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { CheckCircle, Lock, Star, Trophy } from 'lucide-react-native';
import { DayDetailModal } from '@/components/DayDetailModal';
import { useProgressScreen } from '@/hooks/useProgressScreen';
import { TrackDay } from '@/lib/trackService';

export default function ProgressScreen() {
  const router = useRouter();
  
  // שימוש ב-Hook החדש שלנו כדי לקבל את כל הנתונים והפונקציות
  const {
    loading, refreshing, starting, error,
    childName, progress, trackWithDays,
    modalVisible, setModalVisible,
    selectedDay, setSelectedDay,
    dayExercises, setDayExercises,
    onRefresh, handleStartTrack, loadDayExercises
  } = useProgressScreen();

  const handleDayPress = async (day: TrackDay) => {
    if (!progress) return;

    // לוגיקת בדיקת זמינות יום
    const isCompleted = progress.days_completed.includes(day.day_number);
    const isCurrentDay = day.day_number === progress.current_day;
    const isPreviousCompleted = day.day_number === 1 || progress.days_completed.includes(day.day_number - 1);

    if (isCompleted || (isCurrentDay && isPreviousCompleted)) {
      setSelectedDay(day);
      await loadDayExercises(day.id);
      setModalVisible(true);
    }
  };

  const handleExercisePress = (exerciseId: string) => {
    setModalVisible(false);
    router.push({
      pathname: '/exercise/[id]',
      params: { id: exerciseId },
    });
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedDay(null);
    setDayExercises([]);
  };

  const getDayStatus = (dayNumber: number) => {
    if (!progress) return 'locked';
    if (progress.days_completed.includes(dayNumber)) return 'completed';
    if (dayNumber === progress.current_day && (dayNumber === 1 || progress.days_completed.includes(dayNumber - 1))) {
      return 'current';
    }
    return 'locked';
  };

  // --- תצוגה ---

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4FFFB0" />
      </View>
    );
  }

  if (!progress || !trackWithDays) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#B4FF39', '#4FFFB0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <Text style={styles.headerTitle}>מסע האימון שלך</Text>
        </LinearGradient>

        <View style={styles.emptyState}>
          <Trophy size={64} color="#CCCCCC" />
          <Text style={styles.emptyTitle}>טרם התחלת מסלול אימון</Text>
          <Text style={styles.emptyDescription}>לחץ על הכפתור כדי להתחיל את מסע האימון שלך</Text>
          {error && <Text style={styles.errorText}>{error}</Text>}
          <TouchableOpacity
            style={[styles.startButton, starting && styles.startButtonDisabled]}
            onPress={handleStartTrack}
            disabled={starting}
          >
            {starting ? <ActivityIndicator size="small" color="#1A1A1A" /> : <Text style={styles.startButtonText}>התחל מסלול אימון</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const today = new Date();
  const dayOfMonth = today.getDate();
  const daysCompleted = progress.days_completed.length;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#B4FF39', '#4FFFB0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>מסע האימון שלך</Text>
          <Text style={styles.headerSubtitle}>יום {dayOfMonth} מתוך 30</Text>
          <View style={styles.progressBar}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${(daysCompleted / 30) * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>{daysCompleted}/30 ימים הושלמו החודש</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.trackContainer}>
          <Text style={styles.trackTitle}>{trackWithDays.name_he}</Text>
          <Text style={styles.trackDescription}>{trackWithDays.description_he}</Text>

          <View style={styles.journeyMap}>
            {trackWithDays.track_days
              .sort((a, b) => a.day_number - b.day_number)
              .map((day, index) => {
                const status = getDayStatus(day.day_number);
                const isLeftSide = index % 2 === 0;

                return (
                  <View key={day.id} style={styles.dayRow}>
                    {index > 0 && (
                      <View style={[styles.connectingLine, { alignSelf: isLeftSide ? 'flex-end' : 'flex-start' }]} />
                    )}
                    <TouchableOpacity
                      style={[styles.dayStation, isLeftSide ? styles.dayStationLeft : styles.dayStationRight]}
                      onPress={() => handleDayPress(day)}
                      disabled={status === 'locked'}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.dayCircle,
                        status === 'completed' && styles.dayCircleCompleted,
                        status === 'current' && styles.dayCircleCurrent,
                        status === 'locked' && styles.dayCircleLocked,
                      ]}>
                        {status === 'completed' ? (
                          <CheckCircle size={32} color="#FFFFFF" fill="#4FFFB0" />
                        ) : status === 'locked' ? (
                          <Lock size={24} color="#999999" />
                        ) : (
                          <>
                            <Text style={styles.dayNumber}>{day.day_number}</Text>
                            {status === 'current' && (
                              <View style={styles.currentBadge}>
                                <Star size={16} color="#FFD700" fill="#FFD700" />
                              </View>
                            )}
                          </>
                        )}
                      </View>

                      <View style={styles.dayInfo}>
                        <Text style={[styles.dayTitle, status === 'locked' && styles.dayTitleLocked]}>
                          {day.title_he}
                        </Text>
                        {status === 'current' && <Text style={styles.currentLabel}>← האימון של היום</Text>}
                        {status === 'completed' && <Text style={styles.completedLabel}>✓ הושלם</Text>}
                      </View>
                    </TouchableOpacity>

                    {status === 'current' && (
                      <View style={styles.characterContainer}>
                        <Image source={require('@/assets/images/icon.png')} style={styles.character} />
                      </View>
                    )}
                  </View>
                );
              })}
          </View>

          {daysCompleted >= 30 && (
            <View style={styles.completionCard}>
              <Trophy size={48} color="#FFD700" />
              <Text style={styles.completionTitle}>כל הכבוד!</Text>
              <Text style={styles.completionText}>השלמת את המסלול! אתה מדהים! 🎉</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <DayDetailModal
        visible={modalVisible}
        onClose={handleCloseModal}
        day={selectedDay}
        dayNumber={selectedDay?.day_number || 0}
        childName={childName}
        exercises={dayExercises}
        onExercisePress={handleExercisePress}
      />
    </View>
  );
}

// שים לב: השאר את הגדרות ה-Styles למטה כפי שהן, לא שינינו אותן
const styles = StyleSheet.create({
  // ... (העתק את ה-styles המקוריים מקובץ ה-progress.tsx הישן לכאן)
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  header: { paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20 },
  headerContent: { gap: 8 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#1A1A1A', textAlign: 'right' },
  headerSubtitle: { fontSize: 18, color: '#1A1A1A', textAlign: 'right' },
  progressBar: { marginTop: 12 },
  progressBarBg: { height: 12, backgroundColor: 'rgba(255, 255, 255, 0.5)', borderRadius: 6, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#1A1A1A', borderRadius: 6 },
  progressText: { fontSize: 14, color: '#1A1A1A', textAlign: 'right', marginTop: 8 },
  content: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  trackContainer: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  trackTitle: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 8, textAlign: 'right' },
  trackDescription: { fontSize: 16, color: '#666', marginBottom: 24, textAlign: 'right' },
  journeyMap: { paddingVertical: 20 },
  dayRow: { position: 'relative', marginBottom: 32 },
  connectingLine: { width: 3, height: 32, backgroundColor: '#E0E0E0', marginBottom: -32, marginTop: -32, zIndex: 0 },
  dayStation: { flexDirection: 'row', alignItems: 'center', gap: 16, zIndex: 1 },
  dayStationLeft: { alignSelf: 'flex-start' },
  dayStationRight: { alignSelf: 'flex-end' },
  dayCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E5E5EA', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#E0E0E0', position: 'relative' },
  dayCircleCompleted: { backgroundColor: '#4FFFB0', borderColor: '#4FFFB0' },
  dayCircleCurrent: { backgroundColor: '#B4FF39', borderColor: '#B4FF39', shadowColor: '#B4FF39', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 },
  dayCircleLocked: { backgroundColor: '#F0F0F0', borderColor: '#E0E0E0' },
  dayNumber: { fontSize: 28, fontWeight: 'bold', color: '#1A1A1A' },
  currentBadge: { position: 'absolute', top: -8, right: -8 },
  dayInfo: { flex: 1 },
  dayTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 4 },
  dayTitleLocked: { color: '#999999' },
  currentLabel: { fontSize: 14, color: '#4FFFB0', fontWeight: '600' },
  completedLabel: { fontSize: 14, color: '#4FFFB0' },
  characterContainer: { position: 'absolute', left: 0, top: -16, zIndex: 2 },
  character: { width: 48, height: 48, borderRadius: 24 },
  completionCard: { backgroundColor: '#FFF4E6', borderRadius: 16, padding: 24, alignItems: 'center', marginTop: 24 },
  completionTitle: { fontSize: 28, fontWeight: 'bold', color: '#1A1A1A', marginTop: 12, marginBottom: 8 },
  completionText: { fontSize: 18, color: '#666', textAlign: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  emptyTitle: { fontSize: 24, fontWeight: 'bold', color: '#666', textAlign: 'center' },
  emptyDescription: { fontSize: 16, color: '#999', textAlign: 'center' },
  startButton: { backgroundColor: '#4FFFB0', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 32, marginTop: 16, minWidth: 200, alignItems: 'center' },
  startButtonDisabled: { opacity: 0.7 },
  startButtonText: { fontSize: 18, fontWeight: '600', color: '#1A1A1A' },
  errorText: { fontSize: 14, color: '#FF3B30', textAlign: 'center', marginTop: 8 },
});