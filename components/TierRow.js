import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TIER_COLORS, SHADOWS } from '../theme';
import PlantCard from './PlantCard';

export default function TierRow({
  tier,
  tierIndex,
  plants,
  onPlantPress,
  onPlantEdit,
  onPlantWater,
  onPlantDelete,
  onAddPlant,
  onMovePlantUp,
  onMovePlantDown,
  onMovePlantToTier,
  allTiers,
}) {
  const [expanded, setExpanded] = useState(true);
  const tc = TIER_COLORS[tierIndex] || TIER_COLORS[0];

  return (
    <View style={[styles.tier, { borderColor: tc.border, backgroundColor: tc.bg }, SHADOWS.small]}>
      {/* Tier header */}
      <TouchableOpacity
        style={[styles.header, { borderBottomColor: tc.border }]}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.8}
      >
        <View style={[styles.headerAccent, { backgroundColor: tc.border }]} />
        <View style={styles.headerText}>
          <Text style={[styles.tierName, { color: tc.text }]} numberOfLines={1}>
            {tier.name}
          </Text>
          {tier.subtitle ? (
            <Text style={[styles.tierSubtitle, { color: tc.text }]} numberOfLines={1}>
              {tier.subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.countBadge, { backgroundColor: tc.border }]}>
            <Text style={styles.countText}>{plants.length}</Text>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={tc.text}
            style={{ marginLeft: 6 }}
          />
        </View>
      </TouchableOpacity>

      {/* Plants list */}
      {expanded && (
        <View style={styles.plantsContainer}>
          {plants.length === 0 && (
            <Text style={styles.emptyText}>Brak roślin — dodaj pierwszą!</Text>
          )}
          {plants.map((plant, idx) => (
            <PlantCardWithControls
              key={plant.id}
              plant={plant}
              tierIndex={tierIndex}
              idx={idx}
              total={plants.length}
              allTiers={allTiers}
              currentTierId={tier.id}
              onPlantPress={onPlantPress}
              onPlantEdit={onPlantEdit}
              onPlantWater={onPlantWater}
              onPlantDelete={onPlantDelete}
              onMovePlantUp={onMovePlantUp}
              onMovePlantDown={onMovePlantDown}
              onMovePlantToTier={onMovePlantToTier}
            />
          ))}

          {/* Add plant button */}
          <TouchableOpacity
            style={[styles.addBtn, { borderColor: tc.border }]}
            onPress={() => onAddPlant(tier.id)}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={18} color={tc.text} />
            <Text style={[styles.addBtnText, { color: tc.text }]}>Dodaj roślinę</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// Inner component that wraps PlantCard with move controls
function PlantCardWithControls({
  plant, tierIndex, idx, total, allTiers, currentTierId,
  onPlantPress, onPlantEdit, onPlantWater, onPlantDelete,
  onMovePlantUp, onMovePlantDown, onMovePlantToTier,
}) {
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const tc = TIER_COLORS[tierIndex] || TIER_COLORS[0];

  return (
    <View>
      <View style={styles.cardRow}>
        {/* Move up/down arrows */}
        <View style={styles.moveArrows}>
          <TouchableOpacity
            onPress={() => onMovePlantUp(plant.id, currentTierId)}
            disabled={idx === 0}
            style={[styles.arrowBtn, idx === 0 && styles.arrowDisabled]}
          >
            <Ionicons name="chevron-up" size={14} color={idx === 0 ? COLORS.textMuted : tc.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onMovePlantDown(plant.id, currentTierId)}
            disabled={idx === total - 1}
            style={[styles.arrowBtn, idx === total - 1 && styles.arrowDisabled]}
          >
            <Ionicons name="chevron-down" size={14} color={idx === total - 1 ? COLORS.textMuted : tc.text} />
          </TouchableOpacity>
        </View>

        {/* The plant card itself */}
        <View style={{ flex: 1 }}>
          <PlantCard
            plant={plant}
            tierIndex={tierIndex}
            onPress={onPlantPress}
            onEdit={onPlantEdit}
            onWater={onPlantWater}
            onDelete={onPlantDelete}
            isDragging={false}
            dragHandleProps={{}}
          />
        </View>

        {/* Move to tier button */}
        <TouchableOpacity
          style={[styles.moveTierBtn, { borderColor: tc.border }]}
          onPress={() => setShowMoveMenu(!showMoveMenu)}
          activeOpacity={0.7}
        >
          <Ionicons name="swap-vertical" size={15} color={tc.text} />
        </TouchableOpacity>
      </View>

      {/* Move-to-tier dropdown */}
      {showMoveMenu && (
        <View style={[styles.moveMenu, SHADOWS.medium]}>
          <Text style={styles.moveMenuTitle}>Przenieś do kondygnacji:</Text>
          {allTiers
            .filter(t => t.id !== currentTierId)
            .map(t => {
              const ti = allTiers.findIndex(x => x.id === t.id);
              const ttc = TIER_COLORS[ti] || TIER_COLORS[0];
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.moveMenuOption, { borderLeftColor: ttc.border }]}
                  onPress={() => {
                    setShowMoveMenu(false);
                    onMovePlantToTier(plant.id, t.id);
                  }}
                >
                  <Text style={[styles.moveMenuOptionText, { color: ttc.text }]}
                    numberOfLines={1}>
                    {t.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          <TouchableOpacity onPress={() => setShowMoveMenu(false)} style={styles.moveMenuCancel}>
            <Text style={styles.moveMenuCancelText}>Anuluj</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tier: {
    borderRadius: 14,
    borderWidth: 1.5,
    marginVertical: 7,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
  },
  headerAccent: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginRight: 10,
  },
  headerText: {
    flex: 1,
  },
  tierName: {
    fontSize: 13,
    fontWeight: '700',
  },
  tierSubtitle: {
    fontSize: 11,
    opacity: 0.8,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  plantsContainer: {
    padding: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 13,
    paddingVertical: 12,
    fontStyle: 'italic',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  moveArrows: {
    flexDirection: 'column',
    marginRight: 2,
  },
  arrowBtn: {
    padding: 3,
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  moveTierBtn: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 4,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  moveMenu: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    marginHorizontal: 8,
    marginBottom: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  moveMenuTitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 6,
    fontWeight: '600',
  },
  moveMenuOption: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderLeftWidth: 3,
    borderRadius: 4,
    marginBottom: 4,
    backgroundColor: COLORS.bg,
  },
  moveMenuOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  moveMenuCancel: {
    alignItems: 'center',
    paddingTop: 6,
  },
  moveMenuCancelText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
});
