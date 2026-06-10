import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  getTiers, getAllPlants, waterPlant, deletePlant,
  movePlant, reorderPlantsInTier,
} from '../database';
import TierRow from '../components/TierRow';
import { COLORS, SHADOWS } from '../theme';

export default function HomeScreen({ navigation }) {
  const [tiers, setTiers] = useState([]);
  const [plantsByTier, setPlantsByTier] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const t = await getTiers();
    const all = await getAllPlants();
    const byTier = {};
    for (const tier of t) {
      byTier[tier.id] = all.filter(p => p.tier_id === tier.id);
    }
    setTiers(t);
    setPlantsByTier(byTier);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleWater = async (plantId) => {
    await waterPlant(plantId);
    await loadData();
  };

  const handleDelete = async (plantId) => {
    await deletePlant(plantId);
    await loadData();
  };

  const handleMovePlantUp = async (plantId, tierId) => {
    const plants = plantsByTier[tierId] || [];
    const idx = plants.findIndex(p => p.id === plantId);
    if (idx <= 0) return;
    const newOrder = [...plants];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    await reorderPlantsInTier(tierId, newOrder.map(p => p.id));
    await loadData();
  };

  const handleMovePlantDown = async (plantId, tierId) => {
    const plants = plantsByTier[tierId] || [];
    const idx = plants.findIndex(p => p.id === plantId);
    if (idx < 0 || idx >= plants.length - 1) return;
    const newOrder = [...plants];
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    await reorderPlantsInTier(tierId, newOrder.map(p => p.id));
    await loadData();
  };

  const handleMovePlantToTier = async (plantId, newTierId) => {
    const newPlants = plantsByTier[newTierId] || [];
    await movePlant(plantId, newTierId, newPlants.length);
    await loadData();
  };

  const totalPlants = Object.values(plantsByTier).flat().length;
  const needsWater = Object.values(plantsByTier).flat().filter(p => {
    if (!p.last_watered) return true;
    const diff = (new Date() - new Date(p.last_watered)) / (1000 * 60 * 60 * 24);
    return diff >= p.water_days;
  }).length;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mój Zielnik</Text>
          <Text style={styles.headerSub}>
            {totalPlants} roślin · {needsWater > 0 ? `${needsWater} do podlania` : 'wszystkie OK'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.navigate('EditPlant', { tierId: tiers[0]?.id })}
        >
          <Ionicons name="add" size={26} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Summary strip */}
      {needsWater > 0 && (
        <View style={styles.alertStrip}>
          <Ionicons name="water" size={16} color={COLORS.waterNow} />
          <Text style={styles.alertText}>
            {needsWater} {needsWater === 1 ? 'roślina wymaga' : 'rośliny wymagają'} podlania!
          </Text>
        </View>
      )}

      {/* Scrollable content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {tiers.map((tier, idx) => (
          <TierRow
            key={tier.id}
            tier={tier}
            tierIndex={idx}
            plants={plantsByTier[tier.id] || []}
            allTiers={tiers}
            onPlantPress={(plant) => navigation.navigate('PlantDetail', { plantId: plant.id })}
            onPlantEdit={(plant) => navigation.navigate('EditPlant', { plantId: plant.id })}
            onPlantWater={handleWater}
            onPlantDelete={handleDelete}
            onAddPlant={(tierId) => navigation.navigate('EditPlant', { tierId })}
            onMovePlantUp={handleMovePlantUp}
            onMovePlantDown={handleMovePlantDown}
            onMovePlantToTier={handleMovePlantToTier}
          />
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Długo naciśnij kartę rośliny aby ją przenieść między kondygnacjami
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    backgroundColor: COLORS.primaryDark,
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    ...SHADOWS.medium,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    marginTop: 2,
  },
  headerBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  alertStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.redBg,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5C6C3',
  },
  alertText: {
    color: COLORS.red,
    fontSize: 13,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 24,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 8,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
