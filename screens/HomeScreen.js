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
import { COLORS, TIER_COLORS, SHADOWS, getWaterUrgency, getWaterLabel, getWaterColor } from '../theme';

const SCREEN_W = Dimensions.get('window').width;
const HEADER_H = 100;
const TIER_PADDING = 12;
const BOX_GAP = 8;
const BOX_MIN_H = 80;

export default function HomeScreen({ navigation }) {
  const [tiers, setTiers] = useState([]);
  const [plantsByTier, setPlantsByTier] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [dragging, setDragging] = useState(null); // { plant, fromTierId }
  const [dragOver, setDragOver] = useState(null);  // tierId being hovered
  const tierLayouts = useRef({});
  const scrollRef = useRef(null);
  const scrollY = useRef(0);

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

  const handleWater = async (plantId) => {
    await waterPlant(plantId);
    await loadData();
  };

  const handleDelete = (plant) => {
    Alert.alert('Usuń roślinę', `Usunąć "${plant.name}"?`, [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: async () => {
        await deletePlant(plant.id);
        await loadData();
      }},
    ]);
  };

  // Find which tier the drag is over based on absolute Y position
  const getTierAtY = (absY) => {
    for (const [tierId, layout] of Object.entries(tierLayouts.current)) {
      const top = layout.y - scrollY.current + HEADER_H;
      const bot = top + layout.height;
      if (absY >= top && absY <= bot) return parseInt(tierId);
    }
    return null;
  };

  const handleDrop = async (plant, fromTierId, toTierId) => {
    if (!toTierId || toTierId === fromTierId) return;
    const toPlants = plantsByTier[toTierId] || [];
    await movePlant(plant.id, toTierId, toPlants.length);
    await loadData();
  };

  const needsWater = Object.values(plantsByTier).flat().filter(p => {
    if (!p.last_watered) return true;
    return (new Date() - new Date(p.last_watered)) / 86400000 >= p.water_days;
  }).length;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Mój Zielnik 🌿</Text>
          <Text style={s.headerSub}>
            {Object.values(plantsByTier).flat().length} roślin
            {needsWater > 0 ? ` · ${needsWater} do podlania` : ' · wszystkie OK'}
          </Text>
        </View>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => navigation.navigate('EditPlant', { tierId: tiers[0]?.id })}
        >
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      {needsWater > 0 && (
        <View style={s.alertStrip}>
          <Ionicons name="water" size={14} color={COLORS.waterNow} />
          <Text style={s.alertText}>{needsWater} roślin wymaga podlania!</Text>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        onScroll={e => { scrollY.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
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
            isDragOver={dragOver === tier.id}
            onLayout={(layout) => { tierLayouts.current[tier.id] = layout; }}
            onPlantPress={(p) => navigation.navigate('PlantDetail', { plantId: p.id })}
            onPlantEdit={(p) => navigation.navigate('EditPlant', { plantId: p.id })}
            onPlantWater={handleWater}
            onPlantDelete={handleDelete}
            onAddPlant={() => navigation.navigate('EditPlant', { tierId: tier.id })}
            onDragStart={(plant) => setDragging({ plant, fromTierId: tier.id })}
            onDragMove={(absY) => {
              const over = getTierAtY(absY);
              setDragOver(over);
            }}
            onDragEnd={async (absY) => {
              const toTierId = getTierAtY(absY);
              if (dragging) await handleDrop(dragging.plant, dragging.fromTierId, toTierId);
              setDragging(null);
              setDragOver(null);
            }}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ── Tier block ────────────────────────────────────────────────────────────────
function TierBlock({
  tier, tierIndex, plants, isDragOver,
  onLayout, onPlantPress, onPlantEdit, onPlantWater, onPlantDelete,
  onAddPlant, onDragStart, onDragMove, onDragEnd,
}) {
  const tc = TIER_COLORS[tierIndex] || TIER_COLORS[0];
  const availW = SCREEN_W - TIER_PADDING * 2 - 24; // screen - outer padding - tier padding

  // Calculate box width: fit all plants in a row, wrapping if needed
  const count = plants.length;
  const boxesPerRow = count <= 2 ? count || 1 : count <= 4 ? 2 : 3;
  const boxW = count === 0 ? availW : (availW - BOX_GAP * (boxesPerRow - 1)) / boxesPerRow;

  return (
    <View
      style={[s.tier, { borderColor: tc.border, backgroundColor: tc.bg },
        isDragOver && { borderWidth: 3, borderStyle: 'dashed' }]}
      onLayout={(e) => onLayout(e.nativeEvent.layout)}
    >
      {/* Tier header */}
      <View style={[s.tierHeader, { borderBottomColor: tc.border + '60' }]}>
        <View style={[s.tierAccent, { backgroundColor: tc.border }]} />
        <View style={s.tierHeaderText}>
          <Text style={[s.tierName, { color: tc.text }]} numberOfLines={1}>
            {tier.name}
          </Text>
          {tier.subtitle ? (
            <Text style={[s.tierSub, { color: tc.text + 'BB' }]} numberOfLines={1}>
              {tier.subtitle}
            </Text>
          ) : null}
        </View>
        <View style={[s.tierCount, { backgroundColor: tc.border }]}>
          <Text style={s.tierCountTxt}>{plants.length}</Text>
        </View>
      </View>

      {/* Plant boxes */}
      <View style={s.boxesWrap}>
        {plants.length === 0 ? (
          <Text style={[s.emptyTxt, { color: tc.text + '80' }]}>Brak roślin</Text>
        ) : (
          <View style={s.boxesGrid}>
            {plants.map(plant => (
              <PlantBox
                key={plant.id}
                plant={plant}
                tierIndex={tierIndex}
                width={boxW}
                onPress={() => onPlantPress(plant)}
                onEdit={() => onPlantEdit(plant)}
                onWater={() => onPlantWater(plant.id)}
                onDelete={() => onPlantDelete(plant)}
                onDragStart={() => onDragStart(plant)}
                onDragMove={onDragMove}
                onDragEnd={onDragEnd}
              />
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[s.addPlantBtn, { borderColor: tc.border }]}
          onPress={onAddPlant}
        >
          <Ionicons name="add-circle-outline" size={16} color={tc.text} />
          <Text style={[s.addPlantTxt, { color: tc.text }]}>Dodaj</Text>
        </TouchableOpacity>
      </View>

      {isDragOver && (
        <View style={[s.dropOverlay, { borderColor: tc.border }]}>
          <Text style={[s.dropTxt, { color: tc.text }]}>Upuść tutaj</Text>
        </View>
      )}
    </View>
  );
}

// ── Plant box ─────────────────────────────────────────────────────────────────
function PlantBox({
  plant, tierIndex, width,
  onPress, onEdit, onWater, onDelete,
  onDragStart, onDragMove, onDragEnd,
}) {
  const tc = TIER_COLORS[tierIndex] || TIER_COLORS[0];
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const isDraggingRef = useRef(false);
  const longPressTimer = useRef(null);

  const urgency = getWaterUrgency(plant.last_watered, plant.water_days);
  const waterLabel = getWaterLabel(plant.last_watered, plant.water_days);
  const waterColor = getWaterColor(urgency);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: () => isDraggingRef.current,
    onPanResponderGrant: () => {},
    onPanResponderMove: (_, gs) => {
      if (!isDraggingRef.current) return;
      pan.setValue({ x: gs.dx, y: gs.dy });
      onDragMove(gs.moveY);
    },
    onPanResponderRelease: (_, gs) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      Animated.parallel([
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      ]).start();
      onDragEnd(gs.moveY);
    },
    onPanResponderTerminate: () => {
      isDraggingRef.current = false;
      Animated.parallel([
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      ]).start();
    },
  })).current;

  const handleLongPress = () => {
    isDraggingRef.current = true;
    onDragStart(plant);
    Animated.spring(scale, { toValue: 1.08, useNativeDriver: true }).start();
  };

  return (
    <Animated.View
      style={[
        s.box,
        {
          width,
          minHeight: BOX_MIN_H,
          borderColor: tc.border,
          backgroundColor: tc.bg,
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={s.boxMain}
        onPress={onPress}
        onLongPress={handleLongPress}
        delayLongPress={400}
        activeOpacity={0.8}
      >
        <Text style={[s.boxName, { color: tc.text }]} numberOfLines={2}>
          {plant.name}
        </Text>
        <Text style={[s.boxType, { color: tc.text + '99' }]} numberOfLines={1}>
          {plant.type}
        </Text>
      </TouchableOpacity>

      {/* Bottom row: water + edit */}
      <View style={s.boxActions}>
        <TouchableOpacity
          style={[s.waterBtn, { borderColor: waterColor, backgroundColor: waterColor + '18' }]}
          onPress={onWater}
        >
          <Ionicons
            name={urgency === 'now' ? 'water' : 'water-outline'}
            size={13}
            color={waterColor}
          />
          <Text style={[s.waterTxt, { color: waterColor }]}>{waterLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.editBtn} onPress={onEdit}>
          <Ionicons name="pencil" size={13} color={tc.text + 'BB'} />
        </TouchableOpacity>

        <TouchableOpacity style={s.editBtn} onPress={onDelete}>
          <Ionicons name="trash-outline" size={13} color={COLORS.red + 'BB'} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    backgroundColor: COLORS.primaryDark,
    paddingTop: 48,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  addBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 20, width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },

  alertStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.redBg,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  alertText: { color: COLORS.red, fontSize: 12, fontWeight: '600' },

  scroll: { flex: 1 },
  scrollContent: { padding: TIER_PADDING, paddingBottom: 32, gap: 10 },

  // Tier
  tier: {
    borderRadius: 14, borderWidth: 1.5,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  tierHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 9, paddingHorizontal: 10,
    borderBottomWidth: 1,
  },
  tierAccent: { width: 4, height: 28, borderRadius: 2, marginRight: 9 },
  tierHeaderText: { flex: 1 },
  tierName: { fontSize: 13, fontWeight: '700' },
  tierSub: { fontSize: 11, marginTop: 1 },
  tierCount: {
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
    minWidth: 24, alignItems: 'center',
  },
  tierCountTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },

  boxesWrap: { padding: 8 },
  boxesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: BOX_GAP,
    marginBottom: 6,
  },
  emptyTxt: {
    textAlign: 'center', fontSize: 13,
    fontStyle: 'italic', paddingVertical: 12,
  },

  addPlantBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 7,
    borderWidth: 1, borderStyle: 'dashed', borderRadius: 8,
    marginTop: 2,
  },
  addPlantTxt: { fontSize: 13, fontWeight: '600' },

  dropOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 3, borderStyle: 'dashed', borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  dropTxt: { fontSize: 16, fontWeight: '800' },

  // Plant box
  box: {
    borderRadius: 10, borderWidth: 1.5,
    padding: 10,
    ...SHADOWS.small,
  },
  boxMain: { flex: 1, marginBottom: 8 },
  boxName: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  boxType: { fontSize: 11, marginTop: 3 },

  boxActions: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  waterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderWidth: 1.5, borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 4,
    flex: 1,
  },
  waterTxt: { fontSize: 11, fontWeight: '700' },
  editBtn: {
    padding: 5, borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
});
