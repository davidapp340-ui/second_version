import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Smartphone, Clock, Copy, Check } from 'lucide-react-native';
import { generateLinkingCode, fetchChildProfile } from '@/lib/authService';
import { ChildProfile } from '@/types/auth';

export default function ChildProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  // State לנתוני הילד
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // State לקוד הצימוד
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 דקות בשניות

  // 1. טעינת פרטי הילד בעליית המסך
  useEffect(() => {
    loadChildData();
  }, [id]);

  // 2. ניהול טיימר (אם יש קוד מוצג)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (pairingCode && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [pairingCode, timeLeft]);

  const loadChildData = async () => {
    if (!id || typeof id !== 'string') return;
    setLoading(true);
    // אנו משתמשים בפונקציית העזר שיצרנו ב-authService
    const data = await fetchChildProfile(id);
    if (data) {
      setChild(data);
    } else {
      Alert.alert('שגיאה', 'לא ניתן לטעון את פרטי הילד');
      router.back();
    }
    setLoading(false);
  };

  const handleGenerateCode = async () => {
    if (!id || typeof id !== 'string') return;
    
    setCodeLoading(true);
    const { code, error } = await generateLinkingCode(id);
    setCodeLoading(false);

    if (error) {
      Alert.alert('שגיאה', 'נכשל ביצירת קוד התחברות');
      return;
    }

    if (code) {
      setPairingCode(code);
      setTimeLeft(600); // איפוס ל-10 דקות
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4FFFB0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4FFFB0', '#B4FF39']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowRight color="#1A1A1A" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{child?.name || 'פרופיל ילד'}</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* כרטיס פרטים אישיים */}
        <View style={styles.card}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{child?.name?.[0] || '?'}</Text>
          </View>
          <Text style={styles.nameText}>{child?.name}</Text>
          <Text style={styles.infoText}>גיל: {child?.age} • נקודות: {child?.points}</Text>
        </View>

        {/* אזור צימוד מכשיר */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>חיבור מכשיר לילד</Text>
          <Text style={styles.sectionSubtitle}>
            כדי שהילד יוכל לשחק מהמכשיר שלו, צור קוד והזן אותו באפליקציה במכשיר השני.
          </Text>

          {!pairingCode ? (
            <TouchableOpacity 
              style={styles.generateButton} 
              onPress={handleGenerateCode}
              disabled={codeLoading}
            >
              {codeLoading ? (
                <ActivityIndicator color="#1A1A1A" />
              ) : (
                <>
                  <Smartphone size={24} color="#1A1A1A" style={{ marginLeft: 8 }} />
                  <Text style={styles.generateButtonText}>צור קוד התחברות</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.codeContainer}>
              <Text style={styles.codeLabel}>הקוד שלך (תקף ל-10 דקות):</Text>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{pairingCode}</Text>
              </View>
              
              <View style={styles.timerContainer}>
                <Clock size={16} color="#666" />
                <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
              </View>

              <Text style={styles.instructionText}>
                פתח את האפליקציה במכשיר של הילד, בחר "כניסה עם קוד", והקלד את המספרים האלו.
              </Text>

              <TouchableOpacity 
                style={styles.closeCodeButton}
                onPress={() => setPairingCode(null)}
              >
                <Text style={styles.closeCodeText}>סגור</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    flex: 1,
    textAlign: 'center',
    marginRight: 40, // איזון הכפתור
  },
  content: { padding: 20 },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#E0E0E0',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#666' },
  nameText: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 4 },
  infoText: { fontSize: 16, color: '#666' },
  
  section: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A', textAlign: 'right', marginBottom: 8 },
  sectionSubtitle: { fontSize: 14, color: '#666', textAlign: 'right', marginBottom: 20, lineHeight: 20 },
  
  generateButton: {
    flexDirection: 'row',
    backgroundColor: '#4FFFB0',
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4FFFB0',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  generateButtonText: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },

  codeContainer: { alignItems: 'center', width: '100%' },
  codeLabel: { fontSize: 16, color: '#666', marginBottom: 12 },
  codeBox: {
    backgroundColor: '#F0F0F0',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#4FFFB0',
    marginBottom: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  codeText: { fontSize: 32, fontWeight: 'bold', color: '#1A1A1A', letterSpacing: 4 },
  timerContainer: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 20 },
  timerText: { fontSize: 14, color: '#666', fontWeight: 'bold' },
  instructionText: { fontSize: 14, color: '#1A1A1A', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  
  closeCodeButton: { padding: 12 },
  closeCodeText: { color: '#666', fontSize: 16, textDecorationLine: 'underline' },
});