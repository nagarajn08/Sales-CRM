import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Lead, LeadStatus } from '../types';
import { STATUS_COLORS } from '../types';
import { colors, spacing, radius, font } from '../theme';

interface Outcome {
  status: LeadStatus;
  label: string;
  icon: string;
  color: string;
}

const OUTCOMES: Outcome[] = [
  { status: 'converted',           label: 'Converted',       icon: 'trophy',            color: '#059669' },
  { status: 'interested_call_back',label: 'Interested',       icon: 'thumbs-up',         color: '#10b981' },
  { status: 'call_back',           label: 'Call Back',        icon: 'call',              color: '#f59e0b' },
  { status: 'busy',                label: 'Busy',             icon: 'time',              color: '#94a3b8' },
  { status: 'not_reachable',       label: 'Not Reachable',   icon: 'call-outline',       color: '#f97316' },
  { status: 'not_interested',      label: 'Not Interested',  icon: 'close-circle',       color: '#ef4444' },
];

interface Props {
  visible: boolean;
  lead: Lead | null;
  onSubmit: (status: LeadStatus, note?: string) => Promise<void>;
  onDismiss: () => void;
}

export default function OutcomeSheet({ visible, lead, onSubmit, onDismiss }: Props) {
  const [selected, setSelected] = useState<LeadStatus | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => { setSelected(null); setNote(''); setSaving(false); };

  const handleSubmit = async () => {
    if (!selected) return;
    setSaving(true);
    await onSubmit(selected, note.trim() || undefined);
    reset();
  };

  const handleDismiss = () => { reset(); onDismiss(); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleDismiss}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />

          <Text style={s.title}>How did the call go?</Text>
          {lead && <Text style={s.sub}>{lead.name}{lead.company ? ` · ${lead.company}` : ''}</Text>}

          {/* Outcome grid */}
          <View style={s.grid}>
            {OUTCOMES.map((o, i) => (
              <TouchableOpacity
                key={o.status}
                style={[
                  s.outcomeBtn,
                  selected === o.status && { backgroundColor: o.color + '18', borderColor: o.color },
                ]}
                onPress={() => setSelected(o.status)}
                activeOpacity={0.75}
              >
                <View style={[s.outcomeIcon, { backgroundColor: o.color + '18' }]}>
                  <Ionicons name={o.icon as any} size={20} color={o.color} />
                </View>
                <Text style={[s.outcomeLabel, selected === o.status && { color: o.color, fontWeight: '700' }]}>
                  {o.label}
                </Text>
                {/* 1–6 shortcut hint */}
                <Text style={s.shortcutHint}>{i + 1}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Note */}
          <TextInput
            style={s.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Add a note (optional)…"
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={2}
          />

          {/* Actions */}
          <View style={s.btnRow}>
            <TouchableOpacity style={s.dismissBtn} onPress={handleDismiss} activeOpacity={0.8}>
              <Text style={s.dismissText}>Later</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.submitBtn, !selected && s.submitDisabled]}
              onPress={handleSubmit}
              disabled={!selected || saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.submitText}>Log &amp; Next</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.xl, paddingTop: spacing.md, paddingBottom: 36,
  },
  handle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.xl },
  title: { fontSize: font.lg, fontWeight: '800', color: colors.foreground, letterSpacing: -0.3 },
  sub: { fontSize: font.sm, color: colors.muted, marginTop: 4, marginBottom: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  outcomeBtn: {
    width: '48%', flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.md, paddingHorizontal: spacing.sm,
    backgroundColor: colors.mutedBg, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border,
    position: 'relative',
  },
  outcomeIcon: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  outcomeLabel: { fontSize: font.sm, fontWeight: '600', color: colors.foreground, flex: 1 },
  shortcutHint: {
    position: 'absolute', top: 4, right: 6,
    fontSize: 9, fontWeight: '700', color: colors.muted, opacity: 0.5,
  },
  noteInput: {
    backgroundColor: colors.mutedBg, borderRadius: radius.md,
    padding: spacing.md, fontSize: font.base, color: colors.foreground,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg,
    minHeight: 56, textAlignVertical: 'top',
  },
  btnRow: { flexDirection: 'row', gap: spacing.sm },
  dismissBtn: {
    flex: 1, paddingVertical: 14, alignItems: 'center',
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  dismissText: { fontSize: font.base, fontWeight: '600', color: colors.muted },
  submitBtn: {
    flex: 2, paddingVertical: 14, alignItems: 'center',
    borderRadius: radius.md, backgroundColor: colors.primary,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  submitDisabled: { backgroundColor: colors.muted, shadowOpacity: 0 },
  submitText: { fontSize: font.base, fontWeight: '700', color: '#fff' },
});
