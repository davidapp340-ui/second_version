import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useScreenTexts } from '@/hooks/useTexts';

export default function WelcomeScreen() {
  const router = useRouter();
  const { getText } = useScreenTexts('welcome');

  // הסרנו מכאן את כל הלוגיקה של בדיקת משתמשים וניווט אוטומטי.
  // זה התפקיד של _layout בלבד!

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
            {/* וודא ששינית את שם הקובץ ל-icon.png או welcome_character.png */}
            <Image 
              source={require('@/assets/images/icon.png')} 
              style={styles.icon}
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
              style={styles.parentButton}
              onPress={() => router.push('/user-type')}
            >
              <Text style={styles.parentButtonText}>בואו נתחיל!</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.linkButton}
              onPress={() => router.push('/auth/parent-login')}
            >
              <Text style={styles.linkButtonText}>כבר יש לי חשבון</Text>
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
  },
  iconContainer: {
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  icon: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 48,
    opacity: 0.8,
  },
  buttonsContainer: {
    width: '100%',
    gap: 16,
  },
  parentButton: {
    backgroundColor: '#1A1A1A',
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  parentButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  linkButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  linkButtonText: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '600',
  },
});