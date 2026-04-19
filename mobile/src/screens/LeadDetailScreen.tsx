import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Modal, TextInput, Alert, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { leadsApi } from '../api';
import { colors, spacing, radius, font } from '../theme';
import type { Lead, Activity, LeadStatus } from '../types';
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS } from '../types';
import { useAuth } from '../auth/AuthContext';

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'call_back', label: 'Call Back' },
  { value: 'interested_call_back', label: 'Interested - Call Back' },
  { value: 'busy', label: 'Busy' },
  { value: 'not_reachable', label: 'Not Reachable' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'converted', label: 'Converted' },
];

const ACTIVITY_COLORS: Record<string, string> = {
  created: colors.emerald, status_changed: colors.primary,
  comment: colors.violet, reassigned: colors.amber,
  followup_set: colors.blue, email_sent: '#06b6d4',
  imported: colors.muted, call_log: colors.rose,
};
const ACTIVITY_LABELS: Record<string, string> = {
  created: 'Lead created', status_changed: 'Status updated',
  comment: 'Comment added', reassigned: 'Reassigned',
  followup_set: 'Follow-up scheduled', email_sent: 'Email sent',
  imported: 'Imported', call_log: 'Call logged',
};

function fmtDate(raw: string | null | undefined) {
  if (!raw) return '—';
  const d = new Date(raw.endsWith('Z') ? raw : raw + 'Z');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function LeadDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const leadId: number = route.params?.id;

  const [lead, setLead] = useState<Lead | null>(null);
  const [timeline, setTimeline] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showStatus, setShowStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus>('new');
  const [statusComment, setStatusComment] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');
  const [savingComment, setSavingComment] = useState(false);

  const fetchLead = useCallback(async () => {
    try {
      const [l, t] = await Promise.all([leadsApi.get(leadId), leadsApi.timeline(leadId)]);
      setLead(l); setTimeline(t);
      setSelectedStatus(l.status);
    } catch { navigation.goBack(); }
    finally { setLoading(false); setRefreshing(false); }
  }, [leadId]);

  useEffect(() => { fetchLead(); }, [fetchLead]);

  const updateStatus = async () => {
    if (!lead) return;
    setSavingStatus(true);
    try {
      const updated = await leadsApi.updateStatus(lead.id, {
        status: selectedStatus,
        comment: statusComment.trim() || undefined,
      });
      setLead(updated); setShowStatus(false); setStatusComment('');
      fetchLead();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail ?? 'Failed to update');
    } finally { setSavingStatus(false); }
  };

  const addComment = async () => {
    if (!lead || !comment.trim()) return;
    setSavingComment(true);
    try {
      await leadsApi.addComment(lead.id, comment.trim());
      setComment(''); setShowComment(false); fetchLead();
    } catch { Alert.alert('Error', 'Failed to add comment'); }
    finally { setSavingComment(false); }
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }
  if (!lead) return null;

  const isTerminal = lead.status === 'not_interested' || lead.status === 'converted';
  const statusColor = STATUS_COLORS[lead.status] ?? colors.muted;
  const priorityColor = PRIORITY_COLORS[lead.priority] ?? colors.muted;

  return (
    <SafeAreaView style={s.safe}>
      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.topTitle} numberOfLines={1}>{lead.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLead(); }} tintColor={colors.primary} />}
      >
        {/* Lead header card */}
        <View style={s.card}>
          <View style={s.namRow}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{lead.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.leadName} numberOfLines={1}>{lead.name}</Text>
              {lead.company && <Text style={s.leadCompany}>{lead.company}</Text>}
            </View>
          </View>
          <View style={s.badges}>
            <View style={[s.badge, { backgroundColor: statusColor + '20' }]}>
              <View style={[s.badgeDot, { backgroundColor: statusColor }]} />
              <Text style={[s.badgeText, { color: statusColor }]}>{STATUS_LABELS[lead.status]}</Text>
            </View>
            <View style={[s.badge, { backgroundColor: priorityColor + '20' }]}>
              <Text style={[s.badgeText, { color: priorityColor }]}>{lead.priority} priority</Text>
            </View>
          </View>
        </View>

        {/* Contact info */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Contact</Text>
          {lead.mobile && (
            <TouchableOpacity style={s.infoRow} onPress={() => Linking.openURL(`tel:${lead.mobile}`)}>
              <Ionicons name="call-outline" size={16} color={colors.primary} />
              <Text style={[s.infoVal, { color: colors.primary }]}>{lead.mobile}</Text>
            </TouchableOpacity>
          )}
          {lead.whatsapp && (
            <TouchableOpacity style={s.infoRow} onPress={() => Linking.openURL(`https://wa.me/${lead.whatsapp!.replace(/\D/g, '')}`)}>
              <Ionicons name="logo-whatsapp" size={16} color={colors.emerald} />
              <Text style={[s.infoVal, { color: colors.emerald }]}>{lead.whatsapp}</Text>
            </TouchableOpacity>
          )}
          {lead.email && (
            <TouchableOpacity style={s.infoRow} onPress={() => Linking.openURL(`mailto:${lead.email}`)}>
              <Ionicons name="mail-outline" size={16} color={colors.muted} />
              <Text style={s.infoVal}>{lead.email}</Text>
            </TouchableOpacity>
          )}
          {lead.deal_value != null && (
            <View style={s.infoRow}>
              <Ionicons name="cash-outline" size={16} color={colors.emerald} />
              <Text style={[s.infoVal, { color: colors.emerald, fontWeight: '700' }]}>₹{lead.deal_value.toLocaleString('en-IN')}</Text>
            </View>
          )}
          <View style={s.infoRow}>
            <Ionicons name="person-outline" size={16} color={colors.muted} />
            <Text style={s.infoVal}>{lead.assigned_to?.name ?? 'Unassigned'}</Text>
          </View>
        </View>

        {/* Follow-up */}
        {lead.next_followup_at && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Next Follow-up</Text>
            <Text style={s.followupDate}>{fmtDate(lead.next_followup_at)}</Text>
          </View>
        )}

        {/* Notes */}
        {lead.notes && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Notes</Text>
            <Text style={s.notes}>{lead.notes}</Text>
          </View>
        )}

        {/* Timeline */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Activity Timeline</Text>
          {timeline.length === 0 && <Text style={s.emptyText}>No activity yet</Text>}
          {timeline.map((a, idx) => {
            const color = ACTIVITY_COLORS[a.activity_type] ?? colors.muted;
            return (
              <View key={a.id} style={s.timelineItem}>
                <View style={s.timelineLeft}>
                  <View style={[s.timelineDot, { backgroundColor: color }]} />
                  {idx < timeline.length - 1 && <View style={s.timelineLine} />}
                </View>
                <View style={s.timelineContent}>
                  <Text style={s.activityLabel}>{ACTIVITY_LABELS[a.activity_type] ?? a.activity_type}</Text>
                  {a.comment && <Text style={s.activityComment}>{a.comment}</Text>}
                  <Text style={s.activityMeta}>{a.user?.name ?? 'System'} · {fmtDate(a.created_at)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Action buttons */}
      {!isTerminal && (
        <View style={s.actionBar}>
          <TouchableOpacity style={s.actionBtn} onPress={() => setShowComment(true)} activeOpacity={0.8}>
            <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
            <Text style={s.actionText}>Comment</Text>
          </TouchableOpacity>
          <View style={s.actionDivider} />
          <TouchableOpacity style={s.actionBtn} onPress={() => setShowStatus(true)} activeOpacity={0.8}>
            <Ionicons name="refresh-outline" size={18} color={colors.emerald} />
            <Text style={[s.actionText, { color: colors.emerald }]}>Update Status</Text>
          </TouchableOpacity>
          {lead.mobile && (
            <>
              <View style={s.actionDivider} />
              <TouchableOpacity style={s.actionBtn} onPress={() => Linking.openURL(`tel:${lead.mobile}`)} activeOpacity={0.8}>
                <Ionicons name="call-outline" size={18} color={colors.blue} />
                <Text style={[s.actionText, { color: colors.blue }]}>Call</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Update Status Modal */}
      <Modal visible={showStatus} transparent animationType="slide">
        <View style={m.overlay}>
          <View style={m.sheet}>
            <View style={m.handle} />
            <Text style={m.title}>Update Status</Text>
            <Text style={m.sectionLabel}>Status</Text>
            <ScrollView style={m.optionsList}>
              {STATUS_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[m.option, selectedStatus === opt.value && m.optionActive]}
                  onPress={() => setSelectedStatus(opt.value)}
                >
                  <View style={[m.optionDot, { backgroundColor: STATUS_COLORS[opt.value] }]} />
                  <Text style={[m.optionText, selectedStatus === opt.value && m.optionTextActive]}>{opt.label}</Text>
                  {selectedStatus === opt.value && <Ionicons name="checkmark" size={18} color={colors.primary} style={{ marginLeft: 'auto' }} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={m.sectionLabel}>Comment (optional)</Text>
            <TextInput
              style={m.textInput}
              value={statusComment}
              onChangeText={setStatusComment}
              placeholder="Add a note…"
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={2}
            />
            <View style={m.btnRow}>
              <TouchableOpacity style={m.cancelBtn} onPress={() => setShowStatus(false)}>
                <Text style={m.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={m.confirmBtn} onPress={updateStatus} disabled={savingStatus} activeOpacity={0.85}>
                {savingStatus ? <ActivityIndicator color="#fff" size="small" /> : <Text style={m.confirmText}>Update</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Comment Modal */}
      <Modal visible={showComment} transparent animationType="slide">
        <View style={m.overlay}>
          <View style={[m.sheet, { paddingBottom: 24 }]}>
            <View style={m.handle} />
            <Text style={m.title}>Add Comment</Text>
            <TextInput
              style={[m.textInput, { height: 100, textAlignVertical: 'top' }]}
              value={comment}
              onChangeText={setComment}
              placeholder="Type your comment…"
              placeholderTextColor={colors.muted}
              multiline
              autoFocus
            />
            <View style={m.btnRow}>
              <TouchableOpacity style={m.cancelBtn} onPress={() => { setShowComment(false); setComment(''); }}>
                <Text style={m.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={m.confirmBtn} onPress={addComment} disabled={savingComment} activeOpacity={0.85}>
                {savingComment ? <ActivityIndicator color="#fff" size="small" /> : <Text style={m.confirmText}>Add Comment</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  topTitle: { flex: 1, fontSize: font.md, fontWeight: '700', color: colors.foreground, textAlign: 'center' },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  namRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  avatar: { width: 48, height: 48, borderRadius: radius.full, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: font.lg, fontWeight: '700', color: colors.primary },
  leadName: { fontSize: font.md, fontWeight: '700', color: colors.foreground },
  leadCompany: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  badges: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full, gap: 4 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: font.xs, fontWeight: '600' },
  cardTitle: { fontSize: font.sm, fontWeight: '700', color: colors.foreground, marginBottom: spacing.md, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  infoVal: { fontSize: font.base, color: colors.foreground },
  followupDate: { fontSize: font.base, color: colors.foreground, fontWeight: '600' },
  notes: { fontSize: font.base, color: colors.foreground, lineHeight: 22 },
  emptyText: { fontSize: font.sm, color: colors.muted, textAlign: 'center', paddingVertical: spacing.md },
  timelineItem: { flexDirection: 'row', gap: spacing.md, minHeight: 44 },
  timelineLeft: { alignItems: 'center', width: 20 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  timelineLine: { width: 2, flex: 1, backgroundColor: colors.border, marginTop: 4 },
  timelineContent: { flex: 1, paddingBottom: spacing.md },
  activityLabel: { fontSize: font.sm, fontWeight: '600', color: colors.foreground },
  activityComment: { fontSize: font.sm, color: colors.foreground, backgroundColor: colors.mutedBg, borderRadius: radius.sm, padding: spacing.sm, marginTop: 4 },
  activityMeta: { fontSize: font.xs, color: colors.muted, marginTop: 3 },
  actionBar: { flexDirection: 'row', backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: spacing.xs },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, gap: 4 },
  actionText: { fontSize: font.xs, fontWeight: '600', color: colors.primary },
  actionDivider: { width: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
});

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingTop: spacing.md },
  handle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg },
  title: { fontSize: font.lg, fontWeight: '700', color: colors.foreground, marginBottom: spacing.lg },
  sectionLabel: { fontSize: font.xs, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm, marginTop: spacing.sm },
  optionsList: { maxHeight: 260 },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderRadius: radius.md, paddingHorizontal: spacing.sm },
  optionActive: { backgroundColor: colors.primary + '12' },
  optionDot: { width: 10, height: 10, borderRadius: 5 },
  optionText: { fontSize: font.base, color: colors.foreground, flex: 1 },
  optionTextActive: { fontWeight: '700', color: colors.primary },
  textInput: { backgroundColor: colors.mutedBg, borderRadius: radius.md, padding: spacing.md, fontSize: font.base, color: colors.foreground, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  btnRow: { flexDirection: 'row', gap: spacing.md },
  cancelBtn: { flex: 1, paddingVertical: 13, alignItems: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  cancelText: { fontSize: font.base, fontWeight: '600', color: colors.muted },
  confirmBtn: { flex: 1, paddingVertical: 13, alignItems: 'center', borderRadius: radius.md, backgroundColor: colors.primary },
  confirmText: { fontSize: font.base, fontWeight: '700', color: '#fff' },
});
