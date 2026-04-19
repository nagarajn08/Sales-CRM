import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Lead } from '../types';
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS } from '../types';
import { colors, spacing, radius, font } from '../theme';

interface Props {
  lead: Lead;
  onPress: () => void;
}

export default function LeadCard({ lead, onPress }: Props) {
  const statusColor = STATUS_COLORS[lead.status] ?? colors.muted;
  const priorityColor = PRIORITY_COLORS[lead.priority] ?? colors.muted;

  const isOverdue = lead.next_followup_at
    ? new Date(lead.next_followup_at.endsWith('Z') ? lead.next_followup_at : lead.next_followup_at + 'Z') < new Date()
    : false;

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.75}>
      <View style={[s.priorityBar, { backgroundColor: priorityColor }]} />
      <View style={s.body}>
        <View style={s.row}>
          <View style={s.avatarBox}>
            <Text style={s.avatarText}>{lead.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.name} numberOfLines={1}>{lead.name}</Text>
            {lead.company && <Text style={s.company} numberOfLines={1}>{lead.company}</Text>}
          </View>
          <View style={[s.statusChip, { backgroundColor: statusColor + '18' }]}>
            <Text style={[s.statusText, { color: statusColor }]}>{STATUS_LABELS[lead.status]}</Text>
          </View>
        </View>

        <View style={s.footer}>
          {lead.mobile && (
            <View style={s.footerItem}>
              <Ionicons name="call-outline" size={11} color={colors.muted} />
              <Text style={s.footerText}>{lead.mobile}</Text>
            </View>
          )}
          {isOverdue && (
            <View style={s.footerItem}>
              <Ionicons name="warning-outline" size={11} color={colors.destructive} />
              <Text style={[s.footerText, { color: colors.destructive }]}>Overdue</Text>
            </View>
          )}
          {lead.deal_value != null && (
            <View style={[s.footerItem, { marginLeft: 'auto' }]}>
              <Text style={[s.footerText, { color: colors.emerald, fontWeight: '700' }]}>₹{lead.deal_value.toLocaleString('en-IN')}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.lg,
    marginBottom: spacing.sm, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  priorityBar: { width: 4 },
  body: { flex: 1, padding: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 6 },
  avatarBox: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: font.sm, fontWeight: '700', color: colors.primary },
  name: { fontSize: font.base, fontWeight: '700', color: colors.foreground },
  company: { fontSize: font.xs, color: colors.muted, marginTop: 1 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  statusText: { fontSize: 10, fontWeight: '700' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  footerText: { fontSize: font.xs, color: colors.muted },
});
