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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, User, Lock, Mail, Calendar } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth'; // 1. ייבוא ה-Hook החדש

export default function ChildIndependentSignup() {
  const router = useRouter();
  const { refreshProfile } = useAuth(); // 2. שליפת פונקציית הרענון
  const [loading, setLoading] = useState(false);

  // טופס הרשמה
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignup = async () => {
    if (!name || !age || !email || !password) {
      Alert.alert('חסרים פרטים', 'חמוד/ה, צריך למלא את כל השדות כדי להתחיל!');
      return;
    }

    setLoading(true);
    try {
      // 1. יצירת המשתמש במערכת האימות (Auth)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            age: parseInt(age),
            user_type: 'child_independent',
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('לא הצלחנו ליצור את המשתמש');

      const userId = authData.user.id;

      // 2. יצירת "משפחה" עבור הילד (ללא תלות בהורה)
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .insert({
          name: `המסע של ${name}`,
        })
        .select()
        .single();

      if (familyError) throw familyError;

      // 3. יצירת פרופיל הילד
      const { error: childError } = await supabase
        .from('children')
        .insert({
          id: userId,           // ה-ID הזהה ל-Auth
          family_id: familyData.id,
          user_id: userId,      // גיבוי (אופציונלי, תלוי בסכמה)
          name: name,
          age: parseInt(age),
          is_independent: true, // דגל חשוב!
          points: 0,
          avatar_url: 'default_child_avatar',
        });

      if (childError) throw childError;

      // 4. שלב קריטי: רענון הפרופיל והמתנה
      // זה מבטיח שהאפליקציה תדע שהמשתמש החדש הוא "ילד" ותכניס אותו פנימה
      await new Promise(resolve => setTimeout(resolve, 500)); // המתנה קטנה למסד הנתונים
      await refreshProfile();

      Alert.alert('איזה כיף!', 'החשבון נוצר בהצלחה. בוא נתחיל להתאמן!', [
        { text: 'קדימה!', onPress: () => router.replace('/(tabs)') }
      ]);

    } catch (error: any) {
      console.error('Error signing up independent child:', error);
      Alert.alert('אופס...', 'משהו השתבש בהרשמה. נסה שוב או בקש עזרה ממבוגר.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FF9F4F', '#FF6B6B']} // צבעים חמים וכיפיים לילדים
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowRight color="#FFFFFF" size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>הרשמה לילדים</Text>
        <Text style={styles.headerSubtitle}>יוצאים לדרך עצמאית! 🚀</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.illustrationContainer}>
             {/* תמונה של הדמות */}
             <Image 
                source={require('@/assets/images/icon.png')} 
                style={styles.characterImage}
                resizeMode="contain"
             />
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>איך קוראים לך?</Text>
              <View style={styles.inputWrapper}>
                <User size={20} color="#FF9F4F" />
                <TextInput
                  style={styles.input}
                  placeholder="השם שלך"
                  value={name}
                  onChangeText={setName}
                  textAlign="right"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>בן/בת כמה את/ה?</Text>
              <View style={styles.inputWrapper}>
                <Calendar size={20} color="#FF9F4F" />
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>האימייל שלך</Text>
              <View style={styles.inputWrapper}>
                <Mail size={20} color="#FF9F4F" />
                <TextInput
                  style={styles.input}
                  placeholder="email@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  textAlign="right"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>סיסמה סודית</Text>
              <View style={styles.inputWrapper}>
                <Lock size={20} color="#FF9F4F" />
                <TextInput
                  style={styles.input}
                  placeholder="******"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  textAlign="right"
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>צור חשבון והתחל!</Text>
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
    backgroundColor: '#FFF5F0', // רקע בהיר וחמים
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginTop: -20,
    marginBottom: 20,
  },
  characterImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF',
    borderWidth: 4,
    borderColor: '#FFF',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#FF9F4F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
  },
  inputWrapper: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#FFF5F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: '#FFE0CC',
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    textAlign: 'right',
    height: '100%',
  },
  submitButton: {
    backgroundColor: '#FF6B6B',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});