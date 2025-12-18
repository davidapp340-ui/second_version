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
import { ArrowRight, User, Calendar, Copy, Check } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { createLinkedChild, generateLinkingCode } from '@/lib/authService';

export default function AddChildScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form'); // ניהול שלבים במסך
  const [generatedCode, setGeneratedCode] = useState('');
  
  // טופס
  const [name, setName] = useState('');
  const [age, setAge] = useState('');

  const handleAddChild = async () => {
    if (!name || !age) {
      Alert.alert('חסרים פרטים', 'נא למלא שם וגיל');
      return;
    }

    if (!profile?.familyId) {
      Alert.alert('שגיאה', 'לא נמצא שיוך משפחתי. נסה להתחבר מחדש.');
      return;
    }

    setLoading(true);
    try {
      // 1. יצירת הילד בטבלה
      const { child, error: createError } = await createLinkedChild(
        name, 
        parseInt(age), 
        profile.familyId
      );

      if (createError || !child) {
        throw new Error(createError?.message || 'שגיאה ביצירת הילד');
      }

      // 2. הפקת קוד כניסה ראשוני
      const { code, error: codeError } = await generateLinkingCode(child.id);
      
      if (codeError || !code) {
        throw new Error('הילד נוצר, אך הייתה בעיה בהפקת הקוד.');
      }

      setGeneratedCode(code);
      setStep('success');

    } catch (error: any) {
      console.error('Add child flow error:', error);
      Alert.alert('משהו השתבש', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    router.back();
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
        <Text style={styles.headerTitle}>
          {step === 'form' ? 'הוספת ילד' : 'הילד נוסף בהצלחה!'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {step === 'form' ? 'מי מצטרף למשפחה?' : 'הנה הקוד לכניסה למשחק'}
        </Text>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            
            {step === 'form' ? (
              // --- שלב הטופס ---
              <>
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
                      placeholder="8"
                      value={age}
                      onChangeText={setAge}
                      keyboardType="numeric"
                      textAlign="right"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleAddChild}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#1A1A1A" />
                  ) : (
                    <Text style={styles.submitButtonText}>צור פרופיל וקבל קוד</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              // --- שלב הצלחה (הצגת הקוד) ---
              <View style={styles.successContainer}>
                <View style={styles.iconCircle}>
                  <Check size={40} color="#4FFFB0" />
                </View>
                <Text style={styles.successTitle}>מעולה!</Text>
                <Text style={styles.successText}>
                  החשבון של {name} מוכן.
                  כדי להיכנס, הורידו את האפליקציה במכשיר של הילד והזינו את הקוד הבא:
                </Text>

                <View style={styles.codeContainer}>
                  <Text style={styles.codeText}>{generatedCode}</Text>
                </View>

                <Text style={styles.noteText}>
                  * הקוד תקף ל-24 שעות. תמיד אפשר להפיק קוד חדש דרך דף הבית.
                </Text>

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleDone}
                >
                  <Text style={styles.submitButtonText}>סיום וחזרה לבית</Text>
                </TouchableOpacity>
              </View>
            )}

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
    paddingBottom: 40,
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
    marginBottom: 20,
    alignSelf: 'flex-end',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'right',
  },
  headerSubtitle: {
    fontSize: 18,
    color: 'rgba(26, 26, 26, 0.8)',
    textAlign: 'right',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
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
  submitButton: {
    backgroundColor: '#4FFFB0',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
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
  successContainer: {
    alignItems: 'center',
    gap: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0FFF9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  successText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  codeContainer: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    marginVertical: 16,
  },
  codeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A1A',
    letterSpacing: 4,
  },
  noteText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 16,
  },
});