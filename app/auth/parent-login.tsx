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
import { ArrowRight, Mail, Lock, User } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

export default function ParentLoginScreen() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false); // מצב: הרשמה או התחברות
  const [loading, setLoading] = useState(false);
  
  // טופס
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // פונקציית התחברות (פשוטה)
  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('שגיאה', 'נא למלא אימייל וסיסמה');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // ה-AuthContext ב-_layout.tsx יזהה את השינוי ויעביר אותנו אוטומטית
    } catch (error: any) {
      Alert.alert('שגיאה בהתחברות', error.message || 'אנא בדוק את הפרטים ונסה שוב');
    } finally {
      setLoading(false);
    }
  };

  // פונקציית הרשמה (השרשרת המלאה)
  const handleSignUp = async () => {
    if (!email || !password || !fullName) {
      Alert.alert('שגיאה', 'נא למלא את כל השדות');
      return;
    }

    setLoading(true);
    try {
      // 1. יצירת משתמש במערכת האימות
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            user_type: 'parent', // סימון ראשוני
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('לא נוצר משתמש');

      const userId = authData.user.id;

      // 2. יצירת משפחה חדשה
      // אנחנו יוצרים משפחה לפני ההורה כי ההורה צריך להצביע על משפחה (family_id)
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .insert({
          name: `משפחת ${fullName}`, // שם ברירת מחדל
        })
        .select()
        .single();

      if (familyError) throw familyError;
      if (!familyData) throw new Error('שגיאה ביצירת משפחה');

      // 3. יצירת פרופיל הורה שמקושר למשתמש ולמשפחה
      const { error: parentError } = await supabase
        .from('parents')
        .insert({
          id: userId,            // ה-ID הזהה ל-Auth
          family_id: familyData.id,
          name: fullName,
          email: email,
        });

      if (parentError) throw parentError;

      Alert.alert('הצלחה', 'החשבון נוצר בהצלחה!', [
        { text: 'מעולה', onPress: () => {} } // המעבר יקרה אוטומטית בזכות ה-Hook
      ]);

    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert('שגיאה בהרשמה', error.message);
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
        <Text style={styles.headerTitle}>
          {isSignUp ? 'יצירת חשבון הורה' : 'כניסת הורים'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {isSignUp ? 'בואו נתחיל את המסע המשפחתי' : 'ברוכים השבים!'}
        </Text>
      </LinearGradient>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.formContainer}>
            
            {/* שדה שם מלא - מופיע רק בהרשמה */}
            {isSignUp && (
              <View style={styles.inputContainer}>
                <User size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="שם מלא"
                  value={fullName}
                  onChangeText={setFullName}
                  textAlign="right"
                  autoCorrect={false}
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Mail size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="כתובת אימייל"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                textAlign="right"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="סיסמה"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textAlign="right"
              />
            </View>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={isSignUp ? handleSignUp : handleSignIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#1A1A1A" />
              ) : (
                <Text style={styles.actionButtonText}>
                  {isSignUp ? 'צור חשבון' : 'התחבר'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setIsSignUp(!isSignUp)}
            >
              <Text style={styles.toggleButtonText}>
                {isSignUp 
                  ? 'כבר יש לך חשבון? לחץ כאן להתחברות' 
                  : 'אין לך חשבון? לחץ כאן להרשמה'}
              </Text>
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
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'right',
    marginBottom: 8,
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
    flexGrow: 1,
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
  inputContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  inputIcon: {
    marginLeft: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
    textAlign: 'right',
    height: '100%',
  },
  actionButton: {
    backgroundColor: '#4FFFB0',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#4FFFB0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  toggleButton: {
    padding: 16,
    alignItems: 'center',
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});