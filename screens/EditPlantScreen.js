import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getPlant, addPlant, updatePlant, getTiers } from '../database';
import { COLORS, SHADOWS, TIER_COLORS } from '../theme';

function Field({ label, value, onChangeText, multiline, placeholder, keyboardType }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMulti]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        placeholder={placeholder || ''}
        placeholderTextColor={COLORS.textMuted}
        keyboardType={keyboardType || 'default'}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

export default function EditPlantScreen({ route, navigation }) {
  const { plantId, tierId } = route.params || {};
  const isNew = !plantId;

  const [tiers, setTiers] = useState([]);
  const [form, setForm] = useState({
    tier_id: tierId || 1,
    name: '',
    type: '',
    water_days: '3',
    water_amount: '',
    sun: '',
    check_tip: '',
    prune_tip: '',
    kitchen_tip: '',
    notes: '',
  });

  const load = useCallback(async () => {
    const t = await getTiers();
    setTiers(t);
    if (!isNew) {
      const p = await getPlant(plantId);
      if (p) {
        setForm({
          tier_id: p.tier_id,
          name: p.name || '',
          type: p.type || '',
          water_days: String(p.water_days || 3),
          water_amount: p.water_amount || '',
          sun: p.sun || '',
          check_tip: p.check_tip || '',
          prune_tip: p.prune_tip || '',
          kitchen_tip: p.kitchen_tip || '',
          notes: p.notes || '',
        });
      }
    } else {
      setForm(f => ({ ...f, tier_id: tierId || t[0]?.id || 1 }));
    }
  }, [plantId, tierId, isNew]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Błąd', 'Nazwa rośliny jest wymagana.');
      return;
    }
    const days = parseInt(form.water_days, 10);
    if (isNaN(days) || days < 1) {
      Alert.alert('Błąd', 'Podaj prawidłową liczbę dni do podlewania (min. 1).');
      return;
    }
    const data = { ...form, water_days: days };
    if (isNew) {
      await addPlant(data);
    } else {
      await updatePlant({ ...data, id: plantId });
    }
    navigation.goBack();
  };

  const WATER_AMOUNTS = ['bardzo mało', 'mało', 'umiarkowanie', 'regularnie', 'obficie'];
  const TYPE_OPTIONS = ['wielosezonowa', 'wielosezonowy', 'wielosezonowe', 'jednoroczna', 'jednoroczny'];
  const SUN_OPTIONS = ['jasny cień', 'kilka godzin słońca', 'bezpośrednie słońce', 'pełne słońce'];

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isNew ? 'Dodaj roślinę' : 'Edytuj roślinę'}
        </Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>Zapisz</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Kondygnacja picker */}
        <Text style={styles.sectionLabel}>Kondygnacja</Text>
        <View style={styles.tierPicker}>
          {tiers.map((t, idx) => {
            const tc = TIER_COLORS[idx] || TIER_COLORS[0];
            const selected = form.tier_id === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.tierOption,
                  { borderColor: tc.border },
                  selected && { backgroundColor: tc.bg },
                ]}
                onPress={() => set('tier_id', t.id)}
              >
                <View style={[styles.tierDot, { backgroundColor: tc.border }]} />
                <Text style={[styles.tierOptionText, { color: selected ? tc.text : COLORS.textMuted }]}
                  numberOfLines={2}>
                  {t.name}
                </Text>
                {selected && <Ionicons name="checkmark" size={16} color={tc.border} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Basic info */}
        <Text style={styles.sectionLabel}>Podstawowe informacje</Text>
        <Field
          label="Nazwa rośliny *"
          value={form.name}
          onChangeText={v => set('name', v)}
          placeholder="np. Mięta marokańska"
        />

        {/* Type picker */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Typ</Text>
          <View style={styles.chipRow}>
            {TYPE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.chip, form.type === opt && styles.chipSelected]}
                onPress={() => set('type', opt)}
              >
                <Text style={[styles.chipText, form.type === opt && styles.chipTextSelected]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Watering */}
        <Text style={styles.sectionLabel}>Podlewanie</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Podlewaj co ile dni</Text>
          <View style={styles.daysRow}>
            <TouchableOpacity
              style={styles.dayBtn}
              onPress={() => {
                const v = Math.max(1, parseInt(form.water_days, 10) - 1);
                set('water_days', String(v));
              }}
            >
              <Ionicons name="remove" size={20} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.daysValue}>{form.water_days} dni</Text>
            <TouchableOpacity
              style={styles.dayBtn}
              onPress={() => {
                const v = parseInt(form.water_days, 10) + 1;
                set('water_days', String(v));
              }}
            >
              <Ionicons name="add" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Ilość wody</Text>
          <View style={styles.chipRow}>
            {WATER_AMOUNTS.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.chip, form.water_amount === opt && styles.chipSelected]}
                onPress={() => set('water_amount', opt)}
              >
                <Text style={[styles.chipText, form.water_amount === opt && styles.chipTextSelected]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sun */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Nasłonecznienie</Text>
          <View style={styles.chipRow}>
            {SUN_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.chip, form.sun === opt && styles.chipSelected]}
                onPress={() => set('sun', opt)}
              >
                <Text style={[styles.chipText, form.sun === opt && styles.chipTextSelected]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tips */}
        <Text style={styles.sectionLabel}>Wskazówki pielęgnacyjne</Text>
        <Field
          label="Jak sprawdzać wilgotność"
          value={form.check_tip}
          onChangeText={v => set('check_tip', v)}
          multiline
          placeholder="np. Wkłój palec 2 cm w głąb..."
        />
        <Field
          label="Przycinanie"
          value={form.prune_tip}
          onChangeText={v => set('prune_tip', v)}
          multiline
          placeholder="np. Tnij wierzchołki o 1/3..."
        />
        <Field
          label="Zbiór do kuchni"
          value={form.kitchen_tip}
          onChangeText={v => set('kitchen_tip', v)}
          multiline
          placeholder="np. Zbieraj od wierzchołka..."
        />
        <Field
          label="Notatki"
          value={form.notes}
          onChangeText={v => set('notes', v)}
          multiline
          placeholder="Dodatkowe uwagi..."
        />

        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    backgroundColor: COLORS.primaryDark,
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  backBtn: { padding: 4, marginBottom: 2 },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700', flex: 1, marginLeft: 8 },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 8,
  },
  tierPicker: { gap: 6, marginBottom: 4 },
  tierOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 10,
    gap: 8,
    backgroundColor: COLORS.card,
  },
  tierDot: { width: 10, height: 10, borderRadius: 5 },
  tierOptionText: { flex: 1, fontSize: 13, fontWeight: '600' },
  field: { marginBottom: 12 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 5,
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
    ...SHADOWS.small,
  },
  inputMulti: { minHeight: 80, paddingTop: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.card,
  },
  chipSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryBg },
  chipText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  chipTextSelected: { color: COLORS.primary, fontWeight: '700' },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  dayBtn: {
    backgroundColor: COLORS.primaryBg,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primaryBorder,
  },
  daysValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    minWidth: 70,
    textAlign: 'center',
  },
});
