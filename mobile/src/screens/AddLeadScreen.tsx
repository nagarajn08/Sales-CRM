import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { leadsApi, usersApi } from '../api';
import { colors, spacing, radius, font } from '../theme';
import { useAuth } from '../auth/AuthContext';

const PRIORITIES = [
  { value: 'hot', label: '🔴 Hot', color: '#ef4444' },
  { value: 'warm', label: '🟡 Warm', color: '#f59e0b' },
  { value: 'cold', label: '🔵 Cold', color: '#3b82f6' },
];

const SOURCES = ['manual', 'import', 'website', 'reference', 'cold_call', 'other'];

export default function AddLeadScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState('warm');
  const [source, setSource] = useState('manual');
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [assignedTo, setAssignedTo] = useState('');

  useEffect(() => {
    if (isAdmin) usersApi.list().then(setUsers).catch(() => {});
  }, [isAdmin]);

  const submit = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Name is required'); return; }
    if (!mobile.trim() && !email.trim()) { Alert.alert('Required', 'Mobile or email is required'); return; }
    setSaving(true);
    try {
      await leadsApi.create({
        name: name.trim(), mobile: mobile.trim() || null,
        email: email.trim() || null, company: company.trim() || null,
        notes: notes.trim() || null, priority, source,
        assigned_to_id: assignedTo ? parseInt(assignedTo) : undefined,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail ?? 'Failed to add lead');
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={s.title}>Add Lead</Text>
          <TouchableOpacity onPress={submit} disabled={saving} style={s.saveBtn}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveText}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Field label="Full Name *">
            <TextInput style={s.input} value={name} onChangeText={setName} placeholder="John Doe" placeholderTextColor={colors.muted} autoCapitalize="words" />
          </Field>
          <Field label="Mobile">
            <TextInput style={s.input} value={mobile} onChangeText={setMobile} placeholder="9876543210" placeholderTextColor={colors.muted} keyboardType="phone-pad" />
          </Field>
          <Field label="Email">
            <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="john@example.com" placeholderTextColor={colors.muted} keyboardType="email-address" autoCapitalize="none" />
          </Field>
          <Field label="Company">
            <TextInput style={s.input} value={company} onChangeText={setCompany} placeholder="Acme Corp" placeholderTextColor={colors.muted} />
          </Field>

          <Field label="Priority">
            <View style={s.pills}>
              {PRIORITIES.map(p => (
                <TouchableOpacity
                  key={p.value}
                  style={[s.pill, priority === p.value && { backgroundColor: p.color + '20', borderColor: p.color }]}
                  onPress={() => setPriority(p.value)}
                >
                  <Text style={[s.pillText, priority === p.value && { color: p.color, fontWeight: '700' }]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Field>

          <Field label="Source">
            <View style={s.pills}>
              {SOURCES.map(src => (
                <TouchableOpacity
                  key={src}
                  style={[s.pill, source === src && { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
                  onPress={() => setSource(src)}
                >
                  <Text style={[s.pillText, source === src && { color: colors.primary, fontWeight: '700' }]}>
                    {src.replace(/_/g, ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Field>

          <Field label="Notes">
            <TextInput
              style={[s.input, { height: 80, textAlignVertical: 'top' }]}
              value={notes} onChangeText={setNotes}
              placeholder="Any additional info…" placeholderTextColor={colors.muted} multiline
            />
          </Field>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={fl.label}>{label}</Text>
      {children}
    </View>
  );
}
const fl = StyleSheet.create({ label: { fontSize: font.xs, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } });

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  title: { flex: 1, fontSize: font.md, fontWeight: '700', color: colors.foreground, textAlign: 'center' },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, minWidth: 64, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700', fontSize: font.sm },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: font.base, color: colors.foreground },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  pillText: { fontSize: font.xs, color: colors.muted, fontWeight: '500' },
});
