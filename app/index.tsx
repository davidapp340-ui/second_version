import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useScreenTexts } from '@/hooks/useTexts';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const { getText } = useScreenTexts('welcome');

  // הערה: דף זה כעת סטטי לחלוטין.
  // הלוגיקה של בדיקת המשתמש והעברתו לאפליקציה מתבצעת ב-app/_layout.tsx בלבד.

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#B4FF39', '#4FFFB0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            {/* תיקון קריטי: שימוש בשם קובץ קצר ללא רווחים.
               וודא ששינית את שם הקובץ בתיקייה assets/images ל-welcome_character.png
            */}
            <Image 
              source={require('@/assets/images/welcome_character.png')} 
              style={styles.characterImage}
              resizeMode="contain"
            />
          </View>
          
          <Text style={styles.title}>
            {getText('welcome.title', 'ברוכים הבאים ל-Zoomi')}
          </Text>
          <Text style={styles.subtitle}>
            {getText('welcome.subtitle', 'המשחק שעוזר לעיניים לראות טוב יותר')}
          </Text>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity 
              style={styles.mainButton}
              onPress={() => router.push('/user-type')}
            >
              <Text style={styles.mainButtonText}>בואו נתחיל!</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => router.push('/auth/parent-login')}
            >
              <Text style={styles.secondaryButtonText}>כבר יש לי חשבון</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    paddingTop: 60,
  },
  iconContainer: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  characterImage: {
    width: width * 0.7,
    height: width * 0.7,
    maxWidth: 300,
    maxHeight: 300,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 48,
    opacity: 0.8,
    lineHeight: 24,
  },
  buttonsContainer: {
    width: '100%',
    gap: 16,
    maxWidth: 400,
  },
  mainButton: {
    backgroundColor: '#1A1A1A',
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  mainButtonText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  secondaryButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#1A1A1A',
    fontSize: 18,
    fontWeight: '600',
  },
});