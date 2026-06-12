import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  PanResponder, Animated, Dimensions, StatusBar,
  RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  getTiers, getAllPlants, waterPlant, deletePlant, movePlant,
} from '../database';
import { COLORS, TIER_COLORS, SHADOWS, getWaterUrgency, getWaterLabel, getWaterColor } from '../theme';

const SCREEN_W = Dimensions.get('window').width;
const TIER_MARGIN = 10;
const BOX_GAP = 7;

export default function HomeScreen({ navigation }) {
  const [tiers, setTiers] = useState([]);
  const [plantsByTier, setPlantsByTier] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [draggingPlant, setDraggingPlant] = useState(null);
  const [dragOverTier, setDragOverTier] = useState(null);
  const tierLayouts = useRef({});
  const scrollOffset = useRef(0);

  const loadData = useCallback(async () => {
    const t = await getTiers();
    const all = await getAllPlants();
    const byTier = {};
    for (const tier of t) byTier[tier.id] = all.filter(p => p.tier_id === tier.id);
    setTiers(t);
    setPlantsByTier(byTier);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleWater = async (plantId) => {
    await waterPlant(plantId);
    await loadData();
  };

  const handleDelete = (plant) => {
    Alert.alert('Usuń', `Usunąć "${plant.name}"?`, [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: async () => {
        await deletePlant(plant.id); await loadData();
      }},
    ]);
  };

  // Called continuously during drag with pageY (absolute screen Y)
  const onDragMove = useCallback((pageY) => {
    let found = null;
    for (const [id, layout] of Object.entries(tierLayouts.current)) {
      // layout.pageY is absolute Y of tier top on screen
      if (pageY >= layout.pageY && pageY <= layout.pageY + layout.height) {
        found = parseInt(id);
        break;
      }
    }
    setDragOverTier(found);
  }, []);

  const onDragEnd = useCallback(async (plant, pageY) => {
    let targetTier = null;
    for (const [id, layout] of Object.entries(tierLayouts.current)) {
      if (pageY >= layout.pageY && pageY <= layout.pageY + layout.height) {
        targetTier = parseInt(id);
        break;
      }
    }
    setDraggingPlant(null);
    setDragOverTier(null);
    if (targetTier && targetTier !== plant.tier_id) {
      const toPlants = plantsByTier[targetTier] || [];
      await movePlant(plant.id, targetTier, toPlants.length);
      await loadData();
    }
  }, [plantsByTier, loadData]);

  const needsWater = Object.values(plantsByTier).flat()
    .filter(p => !p.last_watered || (new Date() - new Date(p.last_watered)) / 86400000 >= p.water_days).length;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Mój Zielnik 🌿</Text>
          <Text style={s.headerSub}>
            {Object.values(plantsByTier).flat().length} roślin
            {needsWater > 0 ? ` · ${needsWater} do podlania` : ' · wszystkie OK'}
          </Text>
        </View>
      </View>

      {needsWater > 0 && (
        <View style={s.alertStrip}>
          <Ionicons name="water" size={14} color={COLORS.waterNow} />
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
            isDragOver={dragOverTier === tier.id && draggingPlant?.tier_id !== tier.id}
            onLayout={(pageY, height) => {
              tierLayouts.current[tier.id] = { pageY, height };
            }}
            onPlantPress={(p) => navigation.navigate('PlantDetail', { plantId: p.id })}
            onPlantEdit={(p) => navigation.navigate('EditPlant', { plantId: p.id })}
            onPlantWater={handleWater}
            onPlantDelete={handleDelete}
            onAddPlant={() => navigation.navigate('EditPlant', { tierId: tier.id })}
            onDragStart={(p) => setDraggingPlant(p)}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function TierBlock({
  tier, tierIndex, plants, isDragOver,
  onLayout, onPlantPress, onPlantEdit, onPlantWater, onPlantDelete,
  onAddPlant, onDragStart, onDragMove, onDragEnd,
}) {
  const tc = TIER_COLORS[tierIndex] || TIER_COLORS[0];
  const tierRef = useRef(null);

  const measureAndStore = () => {
    if (tierRef.current) {
      tierRef.current.measure((x, y, width, height, pageX, pageY) => {
        onLayout(pageY, height);
      });
    }
  };

  // For tier 3 (index 2), split plants into two groups of max 3
  const isBottomTier = tierIndex === 2;
  const topPlants = isBottomTier ? plants.slice(0, Math.ceil(plants.length / 2)) : plants;
  const bottomPlants = isBottomTier ? plants.slice(Math.ceil(plants.length / 2)) : [];

  const renderRow = (rowPlants) => {
    if (rowPlants.length === 0) return null;
    const count = rowPlants.length;
    const availW = SCREEN_W - TIER_MARGIN * 2 - 16 - BOX_GAP * (count - 1);
    const boxW = availW / count;

    return (
      <View style={s.boxRow}>
        {rowPlants.map(plant => (
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
            onDragEnd={(pageY) => onDragEnd(plant, pageY)}
          />
        ))}
      </View>
    );
  };

  return (
    <View
      ref={tierRef}
      style={[s.tier, { borderColor: tc.border, backgroundColor: tc.bg },
        isDragOver && s.tierDragOver]}
      onLayout={measureAndStore}
    >
      {/* Header */}
      <View style={[s.tierHeader, { borderBottomColor: tc.border + '50' }]}>
        <View style={[s.tierAccent, { backgroundColor: tc.border }]} />
        <View style={s.tierHeaderText}>
          <Text style={[s.tierName, { color: tc.text }]} numberOfLines={1}>{tier.name}</Text>
          {tier.subtitle ? (
            <Text style={[s.tierSub, { color: tc.text + 'AA' }]} numberOfLines={1}>{tier.subtitle}</Text>
          ) : null}
        </View>
        <View style={[s.tierCount, { backgroundColor: tc.border }]}>
          <Text style={s.tierCountTxt}>{plants.length}</Text>
        </View>
        <TouchableOpacity style={[s.tierAddBtn, { backgroundColor: tc.border }]} onPress={onAddPlant}>
          <Ionicons name="add" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Plants */}
      <View style={s.boxesWrap}>
        {plants.length === 0 ? (
          <Text style={[s.emptyTxt, { color: tc.text + '70' }]}>Brak roślin – naciśnij + aby dodać</Text>
        ) : (
          <>
            {renderRow(topPlants)}
            {isBottomTier && bottomPlants.length > 0 && (
              <>
                <View style={[s.divider, { backgroundColor: tc.border + '40' }]} />
                {renderRow(bottomPlants)}
              </>
            )}
          </>
        )}
      </View>

      {isDragOver && (
        <View style={[s.dropOverlay, { borderColor: tc.border }]}>
          <Text style={[s.dropTxt, { color: tc.text }]}>↓ Upuść tutaj</Text>
        </View>
      )}
    </View>
  );
}

function PlantBox({
  plant, tierIndex, width,
  onPress, onEdit, onWater, onDelete,
  onDragStart, onDragMove, onDragEnd,
}) {
  const tc = TIER_COLORS[tierIndex] || TIER_COLORS[0];
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const isDragging = useRef(false);
  const zIndex = useRef(new Animated.Value(1)).current;

  const urgency = getWaterUrgency(plant.last_watered, plant.water_days);
  const waterLabel = getWaterLabel(plant.last_watered, plant.water_days);
  const waterColor = getWaterColor(urgency);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: () => isDragging.current,
    onPanResponderMove: (evt, gs) => {
      if (!isDragging.current) return;
      pan.setValue({ x: gs.dx, y: gs.dy });
      onDragMove(evt.nativeEvent.pageY);
    },
    onPanResponderRelease: (evt, gs) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      const dropY = evt.nativeEvent.pageY;
      Animated.parallel([
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true, tension: 100 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      ]).start();
      zIndex.setValue(1);
      onDragEnd(dropY);
    },
    onPanResponderTerminate: () => {
      isDragging.current = false;
      pan.setValue({ x: 0, y: 0 });
      scale.setValue(1);
      zIndex.setValue(1);
    },
  })).current;

  const startDrag = () => {
    isDragging.current = true;
    zIndex.setValue(999);
    Animated.spring(scale, { toValue: 1.07, useNativeDriver: true }).start();
    onDragStart();
  };

  return (
    <Animated.View
      style={[
        s.box,
        {
          width,
          borderColor: tc.border,
          backgroundColor: COLORS.card,
          transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale }],
          zIndex,
          elevation: isDragging.current ? 10 : 2,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={[s.boxAccent, { backgroundColor: tc.border }]} />

      <TouchableOpacity
        style={s.boxMain}
        onPress={onPress}
        onLongPress={startDrag}
        delayLongPress={350}
        activeOpacity={0.75}
      >
        <Text style={[s.boxName, { color: COLORS.textPrimary }]} numberOfLines={2}>
          {plant.name}
        </Text>
        <Text style={[s.boxType, { color: COLORS.textMuted }]} numberOfLines={1}>
          {plant.type}
        </Text>
      </TouchableOpacity>

      <View style={s.boxBottom}>
        <TouchableOpacity
          style={[s.waterBtn, {
            borderColor: waterColor,
            backgroundColor: waterColor + '15',
          }]}
          onPress={onWater}
        >
          <Ionicons name="water" size={12} color={waterColor} />
          <Text style={[s.waterTxt, { color: waterColor }]}>{waterLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.iconBtn} onPress={onEdit}>
          <Ionicons name="pencil" size={13} color={COLORS.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={s.iconBtn} onPress={onDelete}>
          <Ionicons name="trash-outline" size={13} color={COLORS.red} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    backgroundColor: COLORS.primaryDark,
    paddingTop: 50, paddingBottom: 13,
    paddingHorizontal: 16,
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
    overflow: 'visible',
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
  boxRow: { flexDirection: 'row', gap: BOX_GAP },

  divider: { height: 1, marginVertical: 8, borderRadius: 1 },

  emptyTxt: {
    textAlign: 'center', fontSize: 12,
    fontStyle: 'italic', paddingVertical: 14,
  },

  dropOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2.5, borderStyle: 'dashed', borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  dropTxt: { fontSize: 15, fontWeight: '800' },

  // Box
  box: {
    borderRadius: 10, borderWidth: 1.5,
    backgroundColor: '#fff',
    overflow: 'hidden',
    minHeight: 90,
    ...SHADOWS.small,
  },
  boxAccent: { height: 3, width: '100%' },
  boxMain: { padding: 9, flex: 1 },
  boxName: { fontSize: 13, fontWeight: '700', lineHeight: 17 },
  boxType: { fontSize: 10, marginTop: 3 },

  boxBottom: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingBottom: 8, gap: 5,
  },
  waterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderWidth: 1.5, borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 3,
    flex: 1,
  },
  waterTxt: { fontSize: 10, fontWeight: '700' },
  iconBtn: {
    padding: 5, borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
});
