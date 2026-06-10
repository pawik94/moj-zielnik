import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getPlant, getTiers, waterPlant, deletePlant } from '../database';
import { COLORS, SHADOWS, TIER_COLORS, getWaterUrgency, getWaterLabel, getWaterColor } from '../theme';

function InfoSection({ icon, title, content, color }) {
  if (!content) return null;
  return (
    <View style={[styles.infoSection, { borderLeftColor: color }]}>
      <View style={styles.infoHeader}>
        <Ionicons name={icon} size={16} color={color} />
        <Text style={[styles.infoTitle, { color }]}>{title}</Text>
      </View>
      <Text style={styles.infoContent}>{content}</Text>
    </View>
  );
}

function StatChip({ icon, label, value, color }) {
  return (
    <View style={[styles.statChip, { borderColor: color, backgroundColor: color + '18' }]}>
      <Ionicons name={icon} size={14} color={color} />
      <View>
        <Text style={[styles.statLabel, { color: COLORS.textMuted }]}>{label}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
    </View>
  );
}

export default function PlantDetailScreen({ route, navigation }) {
  const { plantId } = route.params;
  const [plant, setPlant] = useState(null);
  const [tier, setTier] = useState(null);
  const [tierIndex, setTierIndex] = useState(0);

  const load = useCallback(async () => {
    const p = await getPlant(plantId);
    setPlant(p);
    if (p) {
      const tiers = await getTiers();
      const idx = tiers.findIndex(t => t.id === p.tier_id);
      setTier(tiers[idx] || null);
      setTierIndex(idx >= 0 ? idx : 0);
    }
  }, [plantId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!plant) return (
    <View style={styles.loading}>
      <Text style={{ color: COLORS.textMuted }}>Ładowanie...</Text>
    </View>
  );

  const tc = TIER_COLORS[tierIndex] || TIER_COLORS[0];
  const urgency = getWaterUrgency(plant.last_watered, plant.water_days);
  const waterLabel = getWaterLabel(plant.last_watered, plant.water_days);
  const waterColor = getWaterColor(urgency);

  const handleWater = async () => {
    await waterPlant(plant.id);
    await load();
  };

  const handleDelete = () => {
    Alert.alert(
      'Usuń roślinę',
      `Czy na pewno chcesz usunąć "${plant.name}"?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń', style: 'destructive',
          onPress: async () => {
            await deletePlant(plant.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const lastWateredText = plant.last_watered
    ? new Date(plant.last_watered).toLocaleDateString('pl-PL', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : 'Jeszcze nie podlewano';

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: tc.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerName}>{plant.name}</Text>
          <View style={[styles.typeBadge, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
            <Text style={styles.typeBadgeText}>{plant.type}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('EditPlant', { plantId: plant.id })}
          style={styles.editBtn}
        >
          <Ionicons name="pencil" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Tier badge */}
        {tier && (
          <View style={[styles.tierBadge, { backgroundColor: tc.bg, borderColor: tc.border }]}>
            <View style={[styles.tierDot, { backgroundColor: tc.border }]} />
            <Text style={[styles.tierBadgeText, { color: tc.text }]}>{tier.name}</Text>
          </View>
        )}

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatChip
            icon="water-outline"
            label="Podlewanie"
            value={`co ${plant.water_days} dni`}
            color={COLORS.waterOk}
          />
          <StatChip
            icon="sunny-outline"
            label="Słońce"
            value={plant.sun || '—'}
            color={COLORS.tier2Border}
          />
          <StatChip
            icon="flask-outline"
            label="Ilość wody"
            value={plant.water_amount || '—'}
            color={COLORS.tier1Border}
          />
        </View>

        {/* Watering status card */}
        <View style={[styles.waterCard, { borderColor: waterColor, backgroundColor: waterColor + '12' }]}>
          <View style={styles.waterCardLeft}>
            <Ionicons
              name={urgency === 'now' ? 'water' : 'water-outline'}
              size={28}
              color={waterColor}
            />
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.waterStatus, { color: waterColor }]}>
                {urgency === 'now' ? 'Czas podlać!' :
                 urgency === 'soon' ? 'Podlej wkrótce' : 'Podlane'}
              </Text>
              <Text style={styles.waterLastText}>Ostatnio: {lastWateredText}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.waterBtn, { backgroundColor: waterColor }]}
            onPress={handleWater}
          >
            <Ionicons name="water" size={18} color={COLORS.white} />
            <Text style={styles.waterBtnText}>Podlej</Text>
          </TouchableOpacity>
        </View>

        {/* Info sections */}
        <InfoSection
          icon="finger-print-outline"
          title="Jak sprawdzać wilgotność"
          content={plant.check_tip}
          color={COLORS.tier1Border}
        />
        <InfoSection
          icon="cut-outline"
          title="Przycinanie"
          content={plant.prune_tip}
          color={COLORS.primary}
        />
        <InfoSection
          icon="restaurant-outline"
          title="Zbiór do kuchni"
          content={plant.kitchen_tip}
          color={COLORS.tier2Border}
        />
        {plant.notes ? (
          <InfoSection
            icon="information-circle-outline"
            title="Notatki"
            content={plant.notes}
            color={COLORS.textSecondary}
          />
        ) : null}

        {/* Delete button */}
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={18} color={COLORS.red} />
          <Text style={styles.deleteBtnText}>Usuń roślinę</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  backBtn: { padding: 4, marginRight: 8, marginBottom: 2 },
  headerContent: { flex: 1 },
  headerName: { color: COLORS.white, fontSize: 22, fontWeight: '800' },
  typeBadge: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 4,
  },
  typeBadgeText: { color: COLORS.white, fontSize: 12, fontWeight: '600' },
  editBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 8,
    marginBottom: 2,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 14,
    gap: 6,
  },
  tierDot: { width: 8, height: 8, borderRadius: 4 },
  tierBadgeText: { fontSize: 12, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flex: 1,
    minWidth: 90,
  },
  statLabel: { fontSize: 10, marginBottom: 1 },
  statValue: { fontSize: 12, fontWeight: '700' },
  waterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 14,
    ...SHADOWS.small,
  },
  waterCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  waterStatus: { fontSize: 16, fontWeight: '700' },
  waterLastText: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  waterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  waterBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  infoSection: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderLeftWidth: 4,
    padding: 12,
    marginBottom: 10,
    ...SHADOWS.small,
  },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  infoTitle: { fontSize: 13, fontWeight: '700' },
  infoContent: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 20 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.red,
    backgroundColor: COLORS.redBg,
  },
  deleteBtnText: { color: COLORS.red, fontWeight: '700', fontSize: 15 },
});
