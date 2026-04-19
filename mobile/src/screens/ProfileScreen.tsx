import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthContext';
import { colors, spacing, radius, font } from '../theme';
import { API_BASE } from '../api/client';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive', onPress: async () => {
          setLoggingOut(true);
          await logout();
        },
      },
    ]);
  };

  if (!user) return null;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.pageTitle}>Profile</Text>

        {/* Avatar + name */}
        <View style={s.profileCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={s.name}>{user.name}</Text>
          <Text style={s.email}>{user.email}</Text>
          <View style={s.roleChip}>
            <Text style={s.roleText}>{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</Text>
          </View>
          {user.org_name && (
            <Text style={s.org}>{user.org_name} · {user.org_type === 'individual' ? 'Individual' : 'Business'}</Text>
          )}
        </View>

        {/* Info */}
        <View style={s.section}>
          <InfoRow icon="server-outline" label="Server" value={API_BASE} />
          <InfoRow icon="build-outline" label="App Version" value="1.0.0" />
        </View>

        {/* Sign out */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} disabled={loggingOut} activeOpacity={0.85}>
          {loggingOut
            ? <ActivityIndicator color={colors.destructive} size="small" />
            : <>
                <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
                <Text style={s.logoutText}>Sign Out</Text>
              </>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={ir.row}>
      <Ionicons name={icon as any} size={18} color={colors.muted} />
      <View style={{ flex: 1 }}>
        <Text style={ir.label}>{label}</Text>
        <Text style={ir.value} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}
const ir = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  label: { fontSize: font.xs, color: colors.muted, fontWeight: '500' },
  value: { fontSize: font.sm, color: colors.foreground, fontWeight: '600' },
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  pageTitle: { fontSize: font.xl, fontWeight: '800', color: colors.foreground, marginBottom: spacing.xl, letterSpacing: -0.5 },
  profileCard: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  avatar: { width: 72, height: 72, borderRadius: radius.full, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  avatarText: { fontSize: 28, fontWeight: '700', color: colors.primary },
  name: { fontSize: font.lg, fontWeight: '800', color: colors.foreground, letterSpacing: -0.3 },
  email: { fontSize: font.sm, color: colors.muted, marginTop: 4 },
  roleChip: { backgroundColor: colors.primary + '15', paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.full, marginTop: spacing.sm },
  roleText: { fontSize: font.xs, fontWeight: '700', color: colors.primary },
  org: { fontSize: font.xs, color: colors.muted, marginTop: spacing.xs },
  section: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.destructive + '40', backgroundColor: colors.destructive + '08' },
  logoutText: { fontSize: font.base, fontWeight: '700', color: colors.destructive },
});
