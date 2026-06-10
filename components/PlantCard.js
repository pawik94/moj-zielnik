import React, { useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, getWaterUrgency, getWaterLabel, getWaterColor } from '../theme';

export default function PlantCard({
  plant,
  tierIndex,
  onPress,
  onEdit,
  onWater,
  onDelete,
  isDragging,
  dragHandleProps,
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const urgency = getWaterUrgency(plant.last_watered, plant.water_days);
  const waterLabel = getWaterLabel(plant.last_watered, plant.water_days);
  const waterColor = getWaterColor(urgency);

  const tierColors = [
    { accent: COLORS.tier1Border },
    { accent: COLORS.tier2Border },
    { accent: COLORS.tier3Border },
  ];
  const accent = tierColors[tierIndex]?.accent || COLORS.primary;

  const handleLongPress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.05, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const handleDeletePress = () => {
    Alert.alert(
      'Usuń roślinę',
      `Czy na pewno chcesz usunąć "${plant.name}"?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        { text: 'Usuń', style: 'destructive', onPress: () => onDelete(plant.id) },
      ]
    );
  };

  return (
    <Animated.View
      style={[
        styles.card,
        { borderLeftColor: accent, transform: [{ scale: scaleAnim }] },
        isDragging && styles.cardDragging,
        SHADOWS.medium,
      ]}
    >
      {/* Drag handle — shown always, activates drag on long press */}
      <View style={styles.dragHandle} {...dragHandleProps}>
        <Ionicons name="reorder-three" size={18} color={COLORS.textMuted} />
      </View>

      {/* Main content — tap opens detail */}
      <TouchableOpacity
        style={styles.mainContent}
        onPress={() => onPress(plant)}
        activeOpacity={0.7}
        onLongPress={handleLongPress}
      >
        <Text style={styles.plantName} numberOfLines={1}>{plant.name}</Text>
        <Text style={styles.plantType} numberOfLines={1}>{plant.type}</Text>
      </TouchableOpacity>

      {/* Watering button */}
      <TouchableOpacity
        style={[styles.waterBtn, { borderColor: waterColor }]}
        onPress={() => onWater(plant.id)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={urgency === 'now' ? 'water' : 'water-outline'}
          size={16}
          color={waterColor}
        />
        <Text style={[styles.waterLabel, { color: waterColor }]}>{waterLabel}</Text>
      </TouchableOpacity>

      {/* Edit button */}
      <TouchableOpacity
        style={styles.editBtn}
        onPress={() => onEdit(plant)}
        activeOpacity={0.7}
      >
        <Ionicons name="pencil" size={15} color={COLORS.textSecondary} />
      </TouchableOpacity>

      {/* Delete button */}
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={handleDeletePress}
        activeOpacity={0.7}
      >
        <Ionicons name="trash-outline" size={15} color={COLORS.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderLeftWidth: 4,
    marginVertical: 4,
    marginHorizontal: 2,
    paddingVertical: 8,
    paddingHorizontal: 6,
    minHeight: 56,
  },
  cardDragging: {
    opacity: 0.9,
    ...SHADOWS.large,
  },
  dragHandle: {
    paddingHorizontal: 4,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  plantName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  plantType: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  waterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 3,
    marginHorizontal: 3,
    minWidth: 56,
    justifyContent: 'center',
  },
  waterLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  editBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    marginLeft: 2,
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 8,
    marginLeft: 2,
  },
});
