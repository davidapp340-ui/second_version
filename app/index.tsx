import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useScreenTexts } from '@/hooks/useTexts';
import { useUserRole } from '@/hooks/useUserRole';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const { getText, loading: textLoading } = useScreenTexts('splash');
  const { role, loading: authLoading } = useUserRole(); // המוח החדש שלנו
  
  const [isAnimationDone, setIsAnimationDone] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // הפעלת אנימציה בכניסה
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // כשהאנימציה מסתיימת
      setIsAnimationDone(true);
    });
  }, []);

  useEffect(() => {
    // לוגיקת הניווט: מחכים שהאנימציה תסתיים ושהנתונים ייטענו
    if (!textLoading && !authLoading && isAnimationDone) {
      
      // אם המשתמש כבר מחובר (הורה/ילד), ה-_layout יעביר אותו אוטומטית לטאבים.
      // לכן אנחנו מטפלים פה רק במקרה של "אורח" שצריך להמשיך להרשמה.
      if (role === 'GUEST') {
        const timer = setTimeout(() => {
          router.replace('/user-type');
        }, 500); // השהייה קצרה לחוויה נעימה
        return () => clearTimeout(timer);
      }
    }
  }, [textLoading, authLoading, isAnimationDone, role]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#B4FF39', '#4FFFB0', '#4DD9D9']}
        locations={[0, 0.5, 1]}
        style={styles.gradient}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.appName}>{getText('splash.app_name', 'zoomi')}</Text>
        </Animated.View>

        <Animated.Image
          source={require('@/assets/images/A hawk character wearing glasses, designed in the style of Duolingo\'s owl, with a simpler design, no background, and a friendly expression copy.png')}
          style={[
            styles.hawkImage,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
          resizeMode="contain"
        />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    position: 'absolute',
    top: '25%',
    alignItems: 'center',
    zIndex: 10,
  },
  appName: {
    fontSize: 72,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#1A1A1A',
    textAlign: 'center',
    letterSpacing: -2,
  },
  hawkImage: {
    position: 'absolute',
    bottom: -20,
    width: width * 0.9,
    height: height * 0.5,
    maxWidth: 500,
  },
});