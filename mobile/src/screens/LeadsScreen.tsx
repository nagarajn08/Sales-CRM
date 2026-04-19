import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { leadsApi } from '../api';
import { colors, spacing, radius, font } from '../theme';
import type { Lead } from '../types';
import LeadCard from '../components/LeadCard';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'New', value: 'new' },
  { label: 'Call Back', value: 'call_back' },
  { label: 'Interested', value: 'interested_call_back' },
  { label: 'Converted', value: 'converted' },
];

const PAGE_SIZE = 20;

export default function LeadsScreen() {
  const navigation = useNavigation<any>();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (p = 1, q = search, status = statusFilter, reset = false) => {
    if (p === 1) { reset ? setLoading(true) : setRefreshing(true); }
    else setLoadingMore(true);
    try {
      const params: any = { page: p, limit: PAGE_SIZE };
      if (q.trim()) params.search = q.trim();
      if (status) params.status = status;
      const { leads: rows, total: t } = await leadsApi.list(params);
      setLeads(prev => p === 1 ? rows : [...prev, ...rows]);
      setTotal(t);
      setPage(p);
    } catch {}
    finally { setLoading(false); setRefreshing(false); setLoadingMore(false); }
  }, [search, statusFilter]);

  useEffect(() => { load(1, search, statusFilter, true); }, [statusFilter]);

  const onSearchChange = (text: string) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(1, text, statusFilter, true), 400);
  };

  const onEndReached = () => {
    if (!loadingMore && leads.length < total) load(page + 1);
  };

  const onRefresh = () => load(1, search, statusFilter, true);

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Leads</Text>
          <Text style={s.sub}>{total} total</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => navigation.navigate('AddLead')} activeOpacity={0.85}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={18} color={colors.muted} style={s.searchIcon} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={onSearchChange}
          placeholder="Search by name, mobile, email…"
          placeholderTextColor={colors.muted}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Status filters */}
      <FlatList
        horizontal
        data={STATUS_FILTERS}
        keyExtractor={i => i.value}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterList}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setStatusFilter(item.value)}
            style={[s.chip, statusFilter === item.value && s.chipActive]}
            activeOpacity={0.7}
          >
            <Text style={[s.chipText, statusFilter === item.value && s.chipTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        )}
        style={s.filterBar}
      />

      {/* List */}
      <FlatList
        data={leads}
        keyExtractor={i => String(i.id)}
        renderItem={({ item }) => (
          <LeadCard lead={item} onPress={() => navigation.navigate('LeadDetail', { id: item.id })} />
        )}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ margin: spacing.lg }} /> : null}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="people-outline" size={48} color={colors.muted} />
            <Text style={s.emptyText}>No leads found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { fontSize: font.xl, fontWeight: '800', color: colors.foreground, letterSpacing: -0.5 },
  sub: { fontSize: font.xs, color: colors.muted, fontWeight: '500', marginTop: 2 },
  addBtn: {
    width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, height: 44,
  },
  searchIcon: { marginRight: spacing.sm },
  searchInput: { flex: 1, fontSize: font.base, color: colors.foreground },
  filterBar: { maxHeight: 40 },
  filterList: { paddingHorizontal: spacing.lg, gap: 8 },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.full,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: font.xs, fontWeight: '600', color: colors.muted },
  chipTextActive: { color: '#fff' },
  list: { padding: spacing.lg, paddingTop: spacing.sm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl },
  emptyText: { fontSize: font.base, color: colors.muted, marginTop: spacing.md },
});
