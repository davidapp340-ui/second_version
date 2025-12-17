import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, User, Lock, Calendar, AtSign } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function AddChildScreen() {
  const router = useRouter();
  const { profile, isAdmin } = useAuth(); // שימוש ב-Hook המרכזי
  const [loading, setLoading] = useState(false);

  // טופס
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');

  const handleCreateChild = async () => {
    // 1. בדיקות מקדימות
    if (!isAdmin || !profile?.familyId) {
      Alert.alert('שגיאה', 'אין לך הרשאה לבצע פעולה זו או שחסר שיוך משפחתי.');
      return;
    }

    if (!name || !username || !password || !age) {
      Alert.alert('חסרים פרטים', 'נא למלא את כל השדות');
      return;
    }

    setLoading(true);
    try {
      // 2. קריאה לפונקציית שרת (Edge Function)
      // הפונקציה הזו יוצרת את המשתמש מבלי לנתק את ההורה
      const { data, error } = await supabase.functions.invoke('create-child-account', {
        body: {
          email: `${username}@davidapp.local`, // יצירת אימייל פיקטיבי לזיהוי
          password: password,
          name: name,
          age: parseInt(age),
          family_id: profile.familyId, // הקישור הקריטי למשפחה
        },
      });

      if (error) {
        console.error('Edge Function Error:', error);
        throw new Error(error.message || 'שגיאה ביצירת המשתמש בשרת');
      }

      // אם הפונקציה החזירה שגיאה פנימית
      if (data && data.error) {
        throw new Error(data.error);
      }

      Alert.alert('מצוין!', `החשבון של ${name} נוצר בהצלחה.`, [
        { text: 'חזור לדף הבית', onPress: () => router.back() }
      ]);

    } catch (error: any) {
      console.error('Create child error:', error);
      // fallback: הודעה ידידותית במקרה של סביבת פיתוח ללא פונקציות ענן
      if (error.message.includes('Functions') || error.message.includes('fetch')) {
         Alert.alert('שים לב', 'נראה שסביבת הפיתוח לא מחוברת לפונקציות הענן (Edge Functions). בשרת אמיתי זה יעבוד.');
      } else {
         Alert.alert('שגיאה', 'לא הצלחנו ליצור את החשבון. נסה שם משתמש אחר.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4FFFB0', '#B4FF39']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowRight color="#1A1A1A" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>הוספת ילד</Text>
        <Text style={styles.headerSubtitle}>צרף בן משפחה חדש למסע</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.formContainer}>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>שם הילד/ה</Text>
              <View style={styles.inputWrapper}>
                <User size={20} color="#666" />
                <TextInput
                  style={styles.input}
                  placeholder="למשל: דניאל"
                  value={name}
                  onChangeText={setName}
                  textAlign="right"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>גיל</Text>
              <View style={styles.inputWrapper}>
                <Calendar size={20} color="#666" />
                <TextInput
                  style={styles.input}
                  placeholder="גיל"
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                  textAlign="right"
                />
              </View>
            </View>

            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>פרטי התחברות לילד</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>שם משתמש (באנגלית)</Text>
              <View style={styles.inputWrapper}>
                <AtSign size={20} color="#666" />
                <TextInput
                  style={styles.input}
                  placeholder="daniel123"
                  value={username}
                  onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                  autoCapitalize="none"
                  textAlign="right"
                />
              </View>
              <Text style={styles.helperText}>זה השם שהילד יקליד בכניסה לאפליקציה</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>סיסמה</Text>
              <View style={styles.inputWrapper}>
                <Lock size={20} color="#666" />
                <TextInput
                  style={styles.input}
                  placeholder="סיסמה פשוטה (למשל: 123456)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  textAlign="right"
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleCreateChild}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#1A1A1A" />
              ) : (
                <Text style={styles.submitButtonText}>צור פרופיל לילד</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    marginBottom: 10,
    alignSelf: 'flex-end',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'right',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(26, 26, 26, 0.8)',
    textAlign: 'right',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
  },
  inputWrapper: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
    textAlign: 'right',
    height: '100%',
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginRight: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#EEE',
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'right',
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#4FFFB0',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#4FFFB0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
});