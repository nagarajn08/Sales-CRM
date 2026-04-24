import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, AppState, AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { leadsApi } from '../api';
import { colors, spacing, radius, font } from '../theme';
import type { Lead, LeadStatus } from '../types';
import SwipeableQueueCard from '../components/SwipeableQueueCard';
import OutcomeSheet from '../components/OutcomeSheet';

// Only leads worth calling
function isActionable(l: Lead): boolean {
  return l.is_active && l.status !== 'not_interested' && l.status !== 'converted';
}

// Priority: overdue → score desc → deal_value desc
function sortQueue(leads: Lead[]): Lead[] {
  const now = new Date();
  return [...leads].sort((a, b) => {
    const ts = (l: Lead) => l.next_followup_at
      ? new Date(l.next_followup_at.endsWith('Z') ? l.next_followup_at : l.next_followup_at + 'Z')
      : null;
    const aOver = (ts(a)?.getTime() ?? Infinity) < now.getTime() ? 1 : 0;
    const bOver = (ts(b)?.getTime() ?? Infinity) < now.getTime() ? 1 : 0;
    if (bOver !== aOver) return bOver - aOver;
    if (b.score !== a.score) return b.score - a.score;
    return (b.deal_value ?? 0) - (a.deal_value ?? 0);
  });
}

export default function QueueScreen() {
  const navigation = useNavigation<any>();
  const [queue, setQueue] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOutcome, setShowOutcome] = useState(false);
  const [saving, setSaving] = useState(false);
  const calledLeadRef = useRef<Lead | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const initialLoad = useRef(true);

  const loadQueue = useCallback(async () => {
    try {
      const { leads } = await leadsApi.list({ limit: 100 });
      setQueue(sortQueue(leads.filter(isActionable)));
    } catch {}
    finally { setLoading(false); }
  }, []);

  // Reload when screen comes back into focus (after LeadDetail edit etc.)
  useFocusEffect(useCallback(() => {
    if (initialLoad.current) { initialLoad.current = false; return; }
    loadQueue();
  }, [loadQueue]));

  useEffect(() => { loadQueue(); }, [loadQueue]);

  // Detect return from phone dialler
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && next === 'active') {
        if (calledLeadRef.current) setShowOutcome(true);
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, []);

  // ── Queue actions ──────────────────────────────────────────────────────────

  const handleCall = (lead: Lead) => {
    calledLeadRef.current = lead;
    // Linking.openURL is fired inside SwipeableQueueCard
  };

  const handleDone = () => {
    // Card was swiped right — show outcome sheet immediately
    if (queue[0]) {
      calledLeadRef.current = queue[0];
      setShowOutcome(true);
    }
  };

  const handleSkip = () => {
    setQueue(prev => prev.length <= 1 ? prev : [...prev.slice(1), prev[0]]);
  };

  const handleOutcomeSubmit = async (status: LeadStatus, note?: string) => {
    const lead = calledLeadRef.current;
    if (!lead) return;
    setSaving(true);
    try {
      await leadsApi.updateStatus(lead.id, { status, comment: note });
    } catch {}
    setSaving(false);
    setShowOutcome(false);
    calledLeadRef.current = null;
    setQueue(prev => {
      const rest = prev.filter(l => l.id !== lead.id);
      // Terminal statuses leave the queue; active ones re-sort back in
      if (status !== 'not_interested' && status !== 'converted') {
        return sortQueue([...rest, { ...lead, status }].filter(isActionable));
      }
      return rest;
    });
  };

  const handleOutcomeDismiss = () => {
    setShowOutcome(false);
    calledLeadRef.current = null;
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const lead = queue[0];

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Queue</Text>
          <Text style={s.sub}>
            {queue.length > 0 ? `${queue.length} follow-up${queue.length !== 1 ? 's' : ''}` : 'All clear'}
          </Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => navigation.navigate('AddLead')} activeOpacity={0.85}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {queue.length === 0 ? (
        <EmptyQueue onRefresh={loadQueue} />
      ) : (
        <>
          {/* Card stack */}
          <View style={s.stackWrap}>
            {/* Depth cards (not interactive) */}
            {queue[2] && <View style={[s.depthCard, s.depth3]} />}
            {queue[1] && <View style={[s.depthCard, s.depth2]} />}

            <SwipeableQueueCard
              key={lead.id}
              lead={lead}
              onDone={handleDone}
              onSkip={handleSkip}
              onCall={handleCall}
              onOpen={() => navigation.navigate('LeadDetail', { id: lead.id })}
            />
          </View>

          {/* Swipe hint */}
          <View style={s.hint}>
            <View style={s.hintItem}>
              <Ionicons name="arrow-back-circle-outline" size={16} color={colors.muted} />
              <Text style={s.hintText}>Skip</Text>
            </View>
            <Text style={s.hintDot}>·</Text>
            <View style={s.hintItem}>
              <Text style={s.hintText}>Done</Text>
              <Ionicons name="arrow-forward-circle-outline" size={16} color={colors.muted} />
            </View>
          </View>
        </>
      )}

      <OutcomeSheet
        visible={showOutcome}
        lead={calledLeadRef.current}
        onSubmit={handleOutcomeSubmit}
        onDismiss={handleOutcomeDismiss}
      />
    </SafeAreaView>
  );
}

function EmptyQueue({ onRefresh }: { onRefresh: () => void }) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIconWrap}>
        <Ionicons name="checkmark-done-circle" size={56} color={colors.emerald} />
      </View>
      <Text style={s.emptyTitle}>Queue cleared</Text>
      <Text style={s.emptySub}>All follow-ups are done. Great work!</Text>
      <TouchableOpacity style={s.refreshBtn} onPress={onRefresh} activeOpacity={0.8}>
        <Ionicons name="refresh-outline" size={16} color={colors.primary} />
        <Text style={s.refreshText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md,
  },
  title: { fontSize: font.xl, fontWeight: '800', color: colors.foreground, letterSpacing: -0.5 },
  sub: { fontSize: font.xs, color: colors.muted, fontWeight: '500', marginTop: 2 },
  addBtn: {
    width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  stackWrap: { flex: 1, justifyContent: 'center', paddingTop: spacing.md },
  depthCard: {
    position: 'absolute', left: spacing.lg + 12, right: spacing.lg + 12,
    borderRadius: radius.xl, backgroundColor: colors.card,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 4,
  },
  depth2: { height: 300, top: spacing.md + 8, transform: [{ scale: 0.95 }] },
  depth3: { height: 290, top: spacing.md,     transform: [{ scale: 0.90 }] },
  hint: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: spacing.md, paddingVertical: spacing.lg,
  },
  hintItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hintText: { fontSize: font.xs, color: colors.muted, fontWeight: '500' },
  hintDot: { fontSize: font.xs, color: colors.muted },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl },
  emptyIconWrap: {
    width: 96, height: 96, borderRadius: radius.full, backgroundColor: colors.emerald + '15',
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl,
  },
  emptyTitle: { fontSize: font.lg, fontWeight: '800', color: colors.foreground, letterSpacing: -0.3 },
  emptySub: { fontSize: font.sm, color: colors.muted, marginTop: spacing.sm, textAlign: 'center' },
  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginTop: spacing.xl, paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.primary,
  },
  refreshText: { fontSize: font.sm, fontWeight: '700', color: colors.primary },
});
