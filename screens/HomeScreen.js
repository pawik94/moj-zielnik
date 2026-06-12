import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  PanResponder, Animated, Dimensions, StatusBar,
  RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  getTiers, getAllPlants, waterPlant, deletePlant,
  movePlant, reorderPlantsInTier,
} from '../database';
import {
  COLORS, TIER_COLORS, SHADOWS,
  getWaterUrgency, getWaterDaysLeft, getWaterColor,
} from '../theme';

const SCREEN_W = Dimensions.get('window').width;
const TIER_MARGIN = 10;
const BOX_GAP = 7;

export default function HomeScreen({ navigation }) {
  const [tiers, setTiers] = useState([]);
  const [plantsByTier, setPlantsByTier] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const tierLayouts = useRef({});
  const scrollOffset = useRef(0);

  // Shared drag state – single source of truth
  const dragState = useRef({
    active: false,
    plant: null,
    fromTierId: null,
    fromIndex: null,
  });
  const [dragOverTierId, setDragOverTierId] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const loadData = useCallback(async () => {
    const t = await getTiers();
    const all = await getAllPlants();
    const byTier = {};
    for (const tier of t) byTier[tier.id] = all.filter(p => p.tier_id === tier.id);
    setTiers(t);
    setPlantsByTier(byTier);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // Resolve tier + approximate index from absolute pageY + pageX
  const resolveTarget = (pageY, pageX) => {
    let tierId = null;
    let index = null;
    for (const [id, layout] of Object.entries(tierLayouts.current)) {
      if (pageY >= layout.pageY && pageY <= layout.pageY + layout.height) {
        tierId = parseInt(id);
        // estimate column index from pageX
        const plants = plantsByTier[tierId] || [];
        const count = plants.length || 1;
        const availW = SCREEN_W - TIER_MARGIN * 2 - 16;
        const boxW = (availW - BOX_GAP * (count - 1)) / count;
        const relX = pageX - TIER_MARGIN - 8;
        index = Math.min(count - 1, Math.max(0, Math.floor(relX / (boxW + BOX_GAP))));
        break;
      }
    }
    return { tierId, index };
  };

  const onDragMove = useCallback((pageY, pageX) => {
    const { tierId, index } = resolveTarget(pageY, pageX);
    setDragOverTierId(tierId);
    setDragOverIndex(index);
  }, [plantsByTier]);

  const onDragEnd = useCallback(async (pageY, pageX) => {
    const ds = dragState.current;
    if (!ds.active || !ds.plant) return;
    const { tierId: toTierId, index: toIndex } = resolveTarget(pageY, pageX);

    ds.active = false;
    setDragOverTierId(null);
    setDragOverIndex(null);

    if (!toTierId) return;

    if (toTierId === ds.fromTierId) {
      // Reorder within same tier
      const plants = [...(plantsByTier[toTierId] || [])];
      const fromIdx = plants.findIndex(p => p.id === ds.plant.id);
      if (fromIdx === -1 || toIndex === null || fromIdx === toIndex) return;
      const reordered = [...plants];
      reordered.splice(fromIdx, 1);
      reordered.splice(toIndex, 0, ds.plant);
      await reorderPlantsInTier(toTierId, reordered.map(p => p.id));
    } else {
      // Move to different tier
      const toPlants = plantsByTier[toTierId] || [];
      await movePlant(ds.plant.id, toTierId, toPlants.length);
    }
    await loadData();
  }, [plantsByTier, loadData]);

  const needsWater = Object.values(plantsByTier).flat()
    .filter(p => !p.last_watered ||
      (new Date() - new Date(p.last_watered)) / 86400000 >= p.water_days).length;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
      <View style={s.header}>
        <Text style={s.headerTitle}>Mój Zielnik 🌿</Text>
        <Text style={s.headerSub}>
          {Object.values(plantsByTier).flat().length} roślin
          {needsWater > 0 ? ` · ${needsWater} do podlania` : ' · wszystkie OK'}
        </Text>
      </View>

      {needsWater > 0 && (
        <View style={s.alertStrip}>
          <Ionicons name="water" size={13} color={COLORS.waterNow} />
          <Text style={s.alertText}>{needsWater} roślin wymaga podlania!</Text>
        </View>
      )}

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        scrollEventThrottle={16}
        onScroll={e => { scrollOffset.current = e.nativeEvent.contentOffset.y; }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => {
            setRefreshing(true); await loadData(); setRefreshing(false);
          }} colors={[COLORS.primary]} />
        }
      >
        {tiers.map((tier, idx) => (
          <TierBlock
            key={tier.id}
            tier={tier}
            tierIndex={idx}
            plants={plantsByTier[tier.id] || []}
            dragOverTierId={dragOverTierId}
            dragOverIndex={dragOverIndex}
            dragActivePlantId={dragState.current.plant?.id}
            onLayout={(pageY, height) => {
              tierLayouts.current[tier.id] = { pageY, height };
            }}
            onPlantPress={(p) => navigation.navigate('PlantDetail', { plantId: p.id })}
            onPlantEdit={(p) => navigation.navigate('EditPlant', { plantId: p.id })}
            onPlantWater={async (id) => { await waterPlant(id); await loadData(); }}
            onPlantDelete={(plant) => Alert.alert('Usuń', `Usunąć "${plant.name}"?`, [
              { text: 'Anuluj', style: 'cancel' },
              { text: 'Usuń', style: 'destructive', onPress: async () => {
                await deletePlant(plant.id); await loadData();
              }},
            ])}
            onAddPlant={() => navigation.navigate('EditPlant', { tierId: tier.id })}
            onDragStart={(plant, idx) => {
              dragState.current = { active: true, plant, fromTierId: tier.id, fromIndex: idx };
            }}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function TierBlock({
  tier, tierIndex, plants,
  dragOverTierId, dragOverIndex, dragActivePlantId,
  onLayout, onPlantPress, onPlantEdit, onPlantWater, onPlantDelete,
  onAddPlant, onDragStart, onDragMove, onDragEnd,
}) {
  const tc = TIER_COLORS[tierIndex] || TIER_COLORS[0];
  const tierRef = useRef(null);
  const isDragOver = dragOverTierId === tier.id;

  const measureSelf = () => {
    if (tierRef.current) {
      tierRef.current.measure((x, y, w, h, px, pageY) => {
        onLayout(pageY, h);
      });
    }
  };

  const isBottomTier = tierIndex === 2;
  const half = isBottomTier ? Math.ceil(plants.length / 2) : plants.length;
  const topPlants = plants.slice(0, half);
  const botPlants = isBottomTier ? plants.slice(half) : [];

  const renderRow = (rowPlants, startIdx) => {
    if (!rowPlants.length) return null;
    const count = rowPlants.length;
    const availW = SCREEN_W - TIER_MARGIN * 2 - 16 - BOX_GAP * (count - 1);
    const boxW = availW / count;
    return (
      <View style={s.boxRow}>
        {rowPlants.map((plant, i) => {
          const absIdx = startIdx + i;
          const isDropTarget = isDragOver && dragOverIndex === absIdx && plant.id !== dragActivePlantId;
          return (
            <PlantBox
              key={plant.id}
              plant={plant}
              tierIndex={tierIndex}
              width={boxW}
              isDropTarget={isDropTarget}
              onPress={() => onPlantPress(plant)}
              onEdit={() => onPlantEdit(plant)}
              onWater={() => onPlantWater(plant.id)}
              onDelete={() => onPlantDelete(plant)}
              onDragStart={() => onDragStart(plant, absIdx)}
              onDragMove={onDragMove}
              onDragEnd={onDragEnd}
            />
          );
        })}
      </View>
    );
  };

  return (
    <View
      ref={tierRef}
      style={[s.tier, { borderColor: tc.border, backgroundColor: tc.bg },
        isDragOver && s.tierDragOver]}
      onLayout={measureSelf}
    >
      <View style={[s.tierHeader, { borderBottomColor: tc.border + '50' }]}>
        <View style={[s.tierAccent, { backgroundColor: tc.border }]} />
        <View style={s.tierHeaderText}>
          <Text style={[s.tierName, { color: tc.text }]} numberOfLines={1}>{tier.name}</Text>
          {tier.subtitle
            ? <Text style={[s.tierSub, { color: tc.text + 'AA' }]} numberOfLines={1}>{tier.subtitle}</Text>
            : null}
        </View>
        <View style={[s.tierCount, { backgroundColor: tc.border }]}>
          <Text style={s.tierCountTxt}>{plants.length}</Text>
        </View>
        <TouchableOpacity style={[s.tierAddBtn, { backgroundColor: tc.border }]} onPress={onAddPlant}>
          <Ionicons name="add" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={s.boxesWrap}>
        {plants.length === 0
          ? <Text style={[s.emptyTxt, { color: tc.text + '70' }]}>Brak roślin – naciśnij + aby dodać</Text>
          : <>
              {renderRow(topPlants, 0)}
              {isBottomTier && botPlants.length > 0 && (
                <>
                  <View style={[s.divider, { backgroundColor: tc.border + '40' }]} />
                  {renderRow(botPlants, half)}
                </>
              )}
            </>
        }
      </View>
    </View>
  );
}

function PlantBox({
  plant, tierIndex, width, isDropTarget,
  onPress, onEdit, onWater, onDelete,
  onDragStart, onDragMove, onDragEnd,
}) {
  const tc = TIER_COLORS[tierIndex] || TIER_COLORS[0];
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const dragging = useRef(false);

  const urgency = getWaterUrgency(plant.last_watered, plant.water_days);
  const daysLeft = getWaterDaysLeft(plant.last_watered, plant.water_days);
  const waterColor = getWaterColor(urgency);
  // Label: "0d" when needs water (red), "Xd" otherwise
  const waterLabel = urgency === 'now' ? '0d' : `${daysLeft}d`;

  const pr = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: () => dragging.current,
    onPanResponderMove: (evt, gs) => {
      if (!dragging.current) return;
      pan.setValue({ x: gs.dx, y: gs.dy });
      onDragMove(evt.nativeEvent.pageY, evt.nativeEvent.pageX);
    },
    onPanResponderRelease: (evt) => {
      if (!dragging.current) return;
      dragging.current = false;
      const { pageY, pageX } = evt.nativeEvent;
      Animated.parallel([
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true, tension: 120 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      ]).start();
      onDragEnd(pageY, pageX);
    },
    onPanResponderTerminate: () => {
      dragging.current = false;
      pan.setValue({ x: 0, y: 0 });
      scale.setValue(1);
    },
  })).current;

  const startDrag = () => {
    dragging.current = true;
    onDragStart();
    Animated.spring(scale, { toValue: 1.07, useNativeDriver: true }).start();
  };

  return (
    <Animated.View
      style={[
        s.box,
        {
          width,
          borderColor: isDropTarget ? COLORS.primary : tc.border,
          transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale }],
        },
      ]}
      {...pr.panHandlers}
    >
      <View style={[s.boxAccent, { backgroundColor: tc.border }]} />

      {/* Name + type – tappable */}
      <TouchableOpacity
        style={s.boxMain}
        onPress={onPress}
        onLongPress={startDrag}
        delayLongPress={350}
        activeOpacity={0.75}
      >
        <Text style={s.boxName} numberOfLines={2}>{plant.name}</Text>
        <Text style={s.boxType} numberOfLines={1}>{plant.type}</Text>
      </TouchableOpacity>

      {/* Water indicator – compact, always tappable */}
      <TouchableOpacity
        style={[s.waterChip, { borderColor: waterColor, backgroundColor: waterColor + '18' }]}
        onPress={onWater}
      >
        <Ionicons name="water" size={11} color={waterColor} />
        <Text style={[s.waterChipTxt, { color: waterColor }]}>{waterLabel}</Text>
      </TouchableOpacity>

      {/* Edit + delete below water chip */}
      <View style={s.boxIcons}>
        <TouchableOpacity style={s.iconBtn} onPress={onEdit}>
          <Ionicons name="pencil" size={12} color={COLORS.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={s.iconBtn} onPress={onDelete}>
          <Ionicons name="trash-outline" size={12} color={COLORS.red} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    backgroundColor: COLORS.primaryDark,
    paddingTop: 50, paddingBottom: 13, paddingHorizontal: 16,
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },

  alertStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.redBg, paddingHorizontal: 14, paddingVertical: 7,
  },
  alertText: { color: COLORS.red, fontSize: 12, fontWeight: '600' },

  scroll: { flex: 1 },
  scrollContent: { padding: TIER_MARGIN, gap: TIER_MARGIN, paddingBottom: 32 },

  tier: {
    borderRadius: 14, borderWidth: 1.5,
    ...SHADOWS.small,
  },
  tierDragOver: { borderWidth: 2.5, borderStyle: 'dashed' },

  tierHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 9, paddingHorizontal: 10,
    borderBottomWidth: 1, gap: 8,
  },
  tierAccent: { width: 4, height: 26, borderRadius: 2 },
  tierHeaderText: { flex: 1 },
  tierName: { fontSize: 12, fontWeight: '700' },
  tierSub: { fontSize: 10, marginTop: 1 },
  tierCount: {
    borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2,
    minWidth: 22, alignItems: 'center',
  },
  tierCountTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  tierAddBtn: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },

  boxesWrap: { padding: 8 },
  boxRow: { flexDirection: 'row', gap: BOX_GAP, marginBottom: 0 },
  divider: { height: 1, marginVertical: 8, borderRadius: 1 },
  emptyTxt: {
    textAlign: 'center', fontSize: 12,
    fontStyle: 'italic', paddingVertical: 14,
  },

  // Box
  box: {
    borderRadius: 10, borderWidth: 1.5,
    backgroundColor: '#fff',
    overflow: 'hidden',
    minHeight: 95,
    ...SHADOWS.small,
  },
  boxAccent: { height: 3, width: '100%' },
  boxMain: { paddingHorizontal: 8, paddingTop: 7, paddingBottom: 4, flex: 1 },
  boxName: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 16 },
  boxType: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },

  // Compact water chip
  waterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    alignSelf: 'flex-start',
    marginHorizontal: 8,
    borderWidth: 1.5, borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 3,
    minWidth: 36,
  },
  waterChipTxt: { fontSize: 11, fontWeight: '700' },

  // Edit + delete row
  boxIcons: {
    flexDirection: 'row', gap: 4,
    paddingHorizontal: 8, paddingTop: 5, paddingBottom: 8,
  },
  iconBtn: {
    padding: 4, borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
});
