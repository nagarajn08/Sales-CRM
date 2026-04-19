import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { dashboardApi, leadsApi } from '../api';
import { useAuth } from '../auth/AuthContext';
import { colors, spacing, radius, font } from '../theme';
import type { DashboardStats, Lead } from '../types';
import { STATUS_LABELS, STATUS_COLORS } from '../types';
import LeadCard from '../components/LeadCard';

function StatCard({ label, value, color, icon }: { label: string; value: number | string; color: string; icon: string }) {
  return (
    <View style={[stat.card, { borderLeftColor: color }]}>
      <View style={[stat.iconBox, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={stat.value}>{value}</Text>
      <Text style={stat.label}>{label}</Text>
    </View>
  );
}

const stat = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md,
    borderLeftWidth: 3, minWidth: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  iconBox: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  value: { fontSize: font.xl, fontWeight: '800', color: colors.foreground, letterSpacing: -0.5 },
  label: { fontSize: font.xs, color: colors.muted, marginTop: 2, fontWeight: '500' },
});

export default function DashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, { leads }] = await Promise.all([
        dashboardApi.stats(),
        leadsApi.list({ limit: 5, sort: 'created_at', order: 'desc' }),
      ]);
      setStats(s);
      setRecentLeads(leads);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Good {getGreeting()},</Text>
            <Text style={s.name}>{user?.name ?? 'there'} 👋</Text>
            {user?.org_name && <Text style={s.org}>{user.org_name}</Text>}
          </View>
          <TouchableOpacity
            style={s.addBtn}
            onPress={() => navigation.navigate('AddLead')}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {stats && (
          <>
            {/* Row 1 */}
            <View style={s.row}>
              <StatCard label="Total Leads" value={stats.total_leads} color={colors.primary} icon="people" />
              <View style={{ width: spacing.sm }} />
              <StatCard label="New Today" value={stats.new_today} color={colors.emerald} icon="sparkles" />
            </View>

            {/* Row 2 */}
            <View style={s.row}>
              <StatCard label="Follow-ups Today" value={stats.follow_ups_today} color={colors.amber} icon="alarm" />
              <View style={{ width: spacing.sm }} />
              <StatCard label="Overdue" value={stats.overdue_followups} color={colors.destructive} icon="warning" />
            </View>

            {/* Row 3 */}
            <View style={s.row}>
              <StatCard label="Converted" value={stats.converted_this_month} color={colors.violet} icon="trophy" />
              <View style={{ width: spacing.sm }} />
              {stats.pipeline_value > 0 && (
                <StatCard
                  label="Pipeline"
                  value={'₹' + formatNum(stats.pipeline_value)}
                  color={colors.blue}
                  icon="trending-up"
                />
              )}
            </View>
          </>
        )}

        {/* Recent leads */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Recent Leads</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Leads')}>
            <Text style={s.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {recentLeads.map(lead => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onPress={() => navigation.navigate('LeadDetail', { id: lead.id })}
          />
        ))}

        {recentLeads.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="people-outline" size={40} color={colors.muted} />
            <Text style={s.emptyText}>No leads yet. Add your first lead!</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function formatNum(n: number) {
  if (n >= 100000) return (n / 100000).toFixed(1) + 'L';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xl },
  greeting: { fontSize: font.sm, color: colors.muted, fontWeight: '500' },
  name: { fontSize: font.xl, fontWeight: '800', color: colors.foreground, letterSpacing: -0.5 },
  org: { fontSize: font.xs, color: colors.primary, fontWeight: '600', marginTop: 2 },
  addBtn: {
    width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  row: { flexDirection: 'row', marginBottom: spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.md },
  sectionTitle: { fontSize: font.md, fontWeight: '700', color: colors.foreground },
  seeAll: { fontSize: font.sm, color: colors.primary, fontWeight: '600' },
  empty: { alignItems: 'center', padding: spacing.xxxl },
  emptyText: { fontSize: font.sm, color: colors.muted, marginTop: spacing.sm, textAlign: 'center' },
});
