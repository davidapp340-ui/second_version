import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TestAuthScreen() {
  const { session, linkedChild, signOutUser } = useAuth();
  const { role, loading } = useUserRole();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.header}>🔧 מסך בדיקת מערכת</Text>
        
        {/* כרטיס סטטוס ראשי */}
        <View style={styles.card}>
          <Text style={styles.label}>תפקיד מזוהה (Role):</Text>
          <Text style={styles.valueBig}>{loading ? 'טוען...' : role}</Text>
        </View>

        {/* פרטים טכניים */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>פרטים טכניים:</Text>
          
          <Text style={styles.infoRow}>
            <Text style={styles.label}>Session (הורה): </Text>
            {session ? '✅ קיים' : '❌ אין'}
          </Text>
          
          {session && (
             <Text style={styles.detail}>Email: {session.user.email}</Text>
          )}

          <View style={styles.divider} />

          <Text style={styles.infoRow}>
            <Text style={styles.label}>Linked Child (ילד): </Text>
            {linkedChild ? '✅ קיים' : '❌ אין'}
          </Text>

          {linkedChild && (
            <>
              <Text style={styles.detail}>Name: {linkedChild.name}</Text>
              <Text style={styles.detail}>ID: {linkedChild.id}</Text>
            </>
          )}
        </View>

        {/* כפתורי פעולה */}
        <TouchableOpacity style={styles.button} onPress={signOutUser}>
          <Text style={styles.buttonText}>התנתק (נקה הכל)</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          * מסך זה הוא זמני לבדיקות בלבד.
          כדי לראות אותו, שנה את ה-URL בדפדפן/סימולטור ל: /test-auth
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f0f0' },
  scroll: { padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  label: { fontSize: 16, color: '#666' },
  valueBig: { fontSize: 32, fontWeight: 'bold', color: '#4FFFB0', marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  infoRow: { fontSize: 16, marginBottom: 8 },
  detail: { fontSize: 14, color: '#888', marginLeft: 10, marginBottom: 4 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 12 },
  button: {
    backgroundColor: '#ff4444',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  hint: { marginTop: 30, textAlign: 'center', color: '#999', fontSize: 12 },
});