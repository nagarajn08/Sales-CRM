import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthContext';
import { colors, spacing, radius, font } from '../theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Required', 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (e: any) {
      Alert.alert('Login Failed', e?.response?.data?.detail ?? 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={s.logoWrap}>
            <View style={s.logoBox}>
              <Ionicons name="funnel" size={28} color="#fff" />
            </View>
            <Text style={s.appName}>SalesCRM</Text>
            <Text style={s.tagline}>Smart Sales & Lead Management</Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Sign In</Text>

            <View style={s.fieldWrap}>
              <Text style={s.label}>Email</Text>
              <TextInput
                style={s.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholder="you@company.com"
                placeholderTextColor={colors.muted}
              />
            </View>

            <View style={s.fieldWrap}>
              <Text style={s.label}>Password</Text>
              <View style={s.pwWrap}>
                <TextInput
                  style={[s.input, { flex: 1, marginBottom: 0 }]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPw}
                  placeholder="••••••••"
                  placeholderTextColor={colors.muted}
                  onSubmitEditing={submit}
                  returnKeyType="done"
                />
                <TouchableOpacity onPress={() => setShowPw(v => !v)} style={s.eyeBtn}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={s.btn} onPress={submit} disabled={loading} activeOpacity={0.85}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>Sign In</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  logoWrap: { alignItems: 'center', marginBottom: spacing.xxl },
  logoBox: {
    width: 72, height: 72, borderRadius: radius.xl,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  appName: { fontSize: font.xl, fontWeight: '800', color: colors.foreground, letterSpacing: -0.5 },
  tagline: { fontSize: font.sm, color: colors.muted, marginTop: 4 },
  card: {
    backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.xl,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  cardTitle: { fontSize: font.lg, fontWeight: '700', color: colors.foreground, marginBottom: spacing.lg },
  fieldWrap: { marginBottom: spacing.md },
  label: { fontSize: font.xs, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: {
    backgroundColor: colors.mutedBg, borderRadius: radius.md, paddingHorizontal: spacing.md,
    paddingVertical: 13, fontSize: font.base, color: colors.foreground,
    borderWidth: 1, borderColor: colors.border,
  },
  pwWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { padding: 10 },
  btn: {
    backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14,
    alignItems: 'center', marginTop: spacing.md,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  btnText: { color: '#fff', fontSize: font.base, fontWeight: '700' },
});
