import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Linking } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
  runOnJS, interpolate, Extrapolation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { Lead } from '../types';
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS } from '../types';
import { colors, spacing, radius, font } from '../theme';

const SWIPE_THRESHOLD = 80;
const { width: SCREEN_W } = Dimensions.get('window');

// Suggested opener based on lead context
function getOpener(lead: Lead): string {
  const first = lead.name.split(' ')[0];
  switch (lead.status) {
    case 'new':
      return `"Hi ${first}, I'm calling to understand how we can help${lead.company ? ` ${lead.company}` : ''} grow."`;
    case 'call_back':
      return `"Hi ${first}, following up from our last conversation — do you have 2 minutes?"`;
    case 'interested_call_back':
      return `"Hi ${first}, I have those details you asked about. Good time to chat?"`;
    case 'busy':
      return `"Hi ${first}, I know you were busy last time — hope this is a better moment."`;
    case 'not_reachable':
      return `"Hi ${first}, I've been trying to reach you — calling one last time today."`;
    default:
      return `"Hi ${first}, calling from TrackmyLead regarding your enquiry."`;
  }
}

function fmtFollowup(raw: string): string {
  const d = new Date(raw.endsWith('Z') ? raw : raw + 'Z');
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 60000; // minutes
  if (diff > 0) {
    if (diff < 60) return `${Math.round(diff)}m overdue`;
    if (diff < 1440) return `${Math.round(diff / 60)}h overdue`;
    return `${Math.round(diff / 1440)}d overdue`;
  }
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

interface Props {
  lead: Lead;
  onDone: () => void;
  onSkip: () => void;
  onCall: (lead: Lead) => void;
  onOpen: () => void;
}

export default function SwipeableQueueCard({ lead, onDone, onSkip, onCall, onOpen }: Props) {
  const translateX = useSharedValue(0);
  const statusColor = STATUS_COLORS[lead.status] ?? colors.muted;
  const priorityColor = PRIORITY_COLORS[lead.priority] ?? colors.muted;
  const isOverdue = lead.next_followup_at
    ? new Date(lead.next_followup_at.endsWith('Z') ? lead.next_followup_at : lead.next_followup_at + 'Z') < new Date()
    : false;

  const pan = Gesture.Pan()
    .minDistance(10)
    .onUpdate(e => { translateX.value = e.translationX; })
    .onEnd(e => {
      if (e.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(SCREEN_W * 1.5, { damping: 18 }, () => runOnJS(onDone)());
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-SCREEN_W * 1.5, { damping: 18 }, () => runOnJS(onSkip)());
      } else {
        translateX.value = withSpring(0, { damping: 20 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotate: `${interpolate(translateX.value, [-200, 200], [-6, 6], Extrapolation.CLAMP)}deg` },
    ],
  }));

  const doneOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  const skipOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP),
  }));

  const handleCall = () => {
    onCall(lead);
    if (lead.mobile) Linking.openURL(`tel:${lead.mobile}`);
  };

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[s.card, cardStyle]}>

        {/* Swipe overlays */}
        <Animated.View style={[s.overlay, s.overlayRight, doneOpacity]} pointerEvents="none">
          <Ionicons name="checkmark-circle" size={56} color={colors.emerald} />
          <Text style={[s.overlayLabel, { color: colors.emerald }]}>Done</Text>
        </Animated.View>
        <Animated.View style={[s.overlay, s.overlayLeft, skipOpacity]} pointerEvents="none">
          <Ionicons name="play-skip-forward-circle" size={56} color={colors.muted} />
          <Text style={[s.overlayLabel, { color: colors.muted }]}>Skip</Text>
        </Animated.View>

        {/* Score pill */}
        <View style={[s.scorePill, { backgroundColor: lead.score >= 70 ? colors.emerald : lead.score >= 40 ? colors.amber : colors.muted }]}>
          <Text style={s.scoreText}>{lead.score}</Text>
        </View>

        {/* Top: identity */}
        <TouchableOpacity onPress={onOpen} activeOpacity={0.8} style={s.identityArea}>
          <View style={[s.avatar, { borderColor: priorityColor }]}>
            <Text style={[s.avatarText, { color: priorityColor }]}>{lead.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={s.identityText}>
            <Text style={s.leadName} numberOfLines={1}>{lead.name}</Text>
            {lead.company ? <Text style={s.company} numberOfLines={1}>{lead.company}</Text> : null}
          </View>
        </TouchableOpacity>

        {/* Badges row */}
        <View style={s.badgeRow}>
          <View style={[s.badge, { backgroundColor: statusColor + '20' }]}>
            <View style={[s.badgeDot, { backgroundColor: statusColor }]} />
            <Text style={[s.badgeText, { color: statusColor }]}>{STATUS_LABELS[lead.status]}</Text>
          </View>
          {isOverdue && lead.next_followup_at && (
            <View style={[s.badge, { backgroundColor: colors.destructive + '15' }]}>
              <Ionicons name="alarm-outline" size={11} color={colors.destructive} />
              <Text style={[s.badgeText, { color: colors.destructive }]}>{fmtFollowup(lead.next_followup_at)}</Text>
            </View>
          )}
          {lead.deal_value != null && (
            <View style={[s.badge, { backgroundColor: colors.emerald + '15', marginLeft: 'auto' }]}>
              <Text style={[s.badgeText, { color: colors.emerald, fontWeight: '700' }]}>₹{lead.deal_value.toLocaleString('en-IN')}</Text>
            </View>
          )}
        </View>

        {/* Suggested opener */}
        <View style={s.openerBox}>
          <Text style={s.openerLabel}>SUGGESTED OPENER</Text>
          <Text style={s.openerText}>{getOpener(lead)}</Text>
        </View>

        {/* Actions */}
        <View style={s.actions}>
          {lead.mobile ? (
            <TouchableOpacity style={s.callBtn} onPress={handleCall} activeOpacity={0.85}>
              <Ionicons name="call" size={22} color="#fff" />
              <Text style={s.callText}>Call {lead.mobile}</Text>
            </TouchableOpacity>
          ) : (
            <View style={[s.callBtn, { backgroundColor: colors.muted }]}>
              <Ionicons name="call-outline" size={22} color="#fff" />
              <Text style={s.callText}>No number</Text>
            </View>
          )}

          <View style={s.secondaryActions}>
            {lead.whatsapp || lead.mobile ? (
              <TouchableOpacity
                style={s.secondaryBtn}
                onPress={() => Linking.openURL(`https://wa.me/${(lead.whatsapp ?? lead.mobile)!.replace(/\D/g, '')}`)}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-whatsapp" size={20} color={colors.emerald} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={s.secondaryBtn} onPress={onOpen} activeOpacity={0.8}>
              <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

      </Animated.View>
    </GestureDetector>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    minHeight: 340,
  },
  overlay: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    borderRadius: radius.xl, justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
  overlayRight: { backgroundColor: colors.emerald + '12' },
  overlayLeft: { backgroundColor: colors.muted + '10' },
  overlayLabel: { fontSize: font.md, fontWeight: '800', marginTop: spacing.sm, letterSpacing: 1 },
  scorePill: {
    position: 'absolute', top: spacing.xl, right: spacing.xl,
    width: 36, height: 36, borderRadius: radius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  scoreText: { fontSize: font.xs, fontWeight: '800', color: '#fff' },
  identityArea: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  avatar: {
    width: 56, height: 56, borderRadius: radius.full,
    backgroundColor: colors.mutedBg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  avatarText: { fontSize: font.xl, fontWeight: '800' },
  identityText: { flex: 1, paddingRight: 44 },
  leadName: { fontSize: font.lg, fontWeight: '800', color: colors.foreground, letterSpacing: -0.3 },
  company: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  openerBox: {
    backgroundColor: colors.mutedBg, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.lg,
  },
  openerLabel: { fontSize: 9, fontWeight: '800', color: colors.muted, letterSpacing: 1, marginBottom: 4 },
  openerText: { fontSize: font.sm, color: colors.foreground, lineHeight: 20, fontStyle: 'italic' },
  actions: { gap: spacing.sm },
  callBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  callText: { fontSize: font.base, fontWeight: '700', color: '#fff' },
  secondaryActions: { flexDirection: 'row', gap: spacing.sm },
  secondaryBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.mutedBg, borderWidth: 1, borderColor: colors.border,
  },
});
