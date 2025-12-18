import React, { useState } from 'react';
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
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth'; // שימוש בהוק החדש
import { ArrowRight, KeyRound } from 'lucide-react-native';

export default function ChildLoginScreen() {
  const router = useRouter();
  const { signInWithCode, isLoading } = useAuth(); // שליפת הפונקציה מההוק
  
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    const cleanCode = code.trim().toUpperCase();

    if (cleanCode.length < 6) {
      Alert.alert('שגיאה', 'נא להזין קוד מלא (6 תווים)');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // קריאה לפונקציית הצימוד החדשה
      const result = await signInWithCode(cleanCode);
      
      if (!result.success) {
        Alert.alert('התחברות נכשלה', result.error || 'הקוד שגוי או פג תוקף');
        setIsSubmitting(false);
      } else {
        // ההצלחה תזוהה אוטומטית ע"י useAuth שיעביר אותנו למסך הבית
        // אבל ליתר ביטחון, אם הניווט האוטומטי לא קורה מייד:
         router.replace('/(tabs)');
      }
    } catch (e) {
      setIsSubmitting(false);
      Alert.alert('שגיאה', 'ארעה שגיאה בתקשורת');
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <LinearGradient
          colors={['#B4FF39', '#4FFFB0', '#4DD9D9']}
          locations={[0, 0.5, 1]}
          style={styles.gradient}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.content}
          >
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => router.back()}
              disabled={isSubmitting || isLoading}
            >
              <ArrowRight size={24} color="#1A1A1A" />
            </TouchableOpacity>

            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <KeyRound size={40} color="#1A1A1A" />
              </View>
              <Text style={styles.title}>כניסת ילד</Text>
              <Text style={styles.subtitle}>
                הכנס את הקוד שמופיע אצל ההורה
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="A1B2C3"
                  placeholderTextColor="rgba(26, 26, 26, 0.3)"
                  value={code}
                  onChangeText={(text) => setCode(text.toUpperCase())}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={6}
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                  editable={!isSubmitting}
                />
              </View>

              <TouchableOpacity
                style={[styles.button, (isSubmitting || code.length < 6) && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={isSubmitting || code.length < 6}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>התחבר למשחק!</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </LinearGradient>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: '#1A1A1A',
    opacity: 0.8,
    textAlign: 'center',
  },
  form: {
    gap: 24,
  },
  inputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    padding: 16,
    fontSize: 32,
    color: '#1A1A1A',
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 8,
    height: 80,
  },
  button: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
});