import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getPlant, addPlant, updatePlant, getTiers } from '../database';
import { COLORS, SHADOWS, TIER_COLORS } from '../theme';

function Field({ label, value, onChangeText, multiline, placeholder }) {
  return (
    <View style={st.field}>
      <Text style={st.fieldLabel}>{label}</Text>
      <TextInput
        style={[st.input, multiline && st.inputMulti]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        placeholder={placeholder || ''}
        placeholderTextColor={COLORS.textMuted}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

export default function EditPlantScreen({ route, navigation }) {
  const { plantId, tierId } = route.params || {};
  const isNew = !plantId;
  const [tierName, setTierName] = useState('');
  const [tierIndex, setTierIndex] = useState(0);

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

  useFocusEffect(useCallback(() => {
    (async () => {
      const t = await getTiers();
      if (!isNew) {
        const p = await getPlant(plantId);
        if (p) {
          const idx = t.findIndex(x => x.id === p.tier_id);
          setTierIndex(idx >= 0 ? idx : 0);
          setTierName(t[idx]?.name || '');
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
        const tId = tierId || t[0]?.id || 1;
        const idx = t.findIndex(x => x.id === tId);
        setTierIndex(idx >= 0 ? idx : 0);
        setTierName(t[idx]?.name || '');
        setForm(f => ({ ...f, tier_id: tId }));
      }
    })();
  }, [plantId, tierId, isNew]));

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Błąd', 'Nazwa jest wymagana.'); return; }
    const days = parseInt(form.water_days, 10);
    if (isNaN(days) || days < 1) { Alert.alert('Błąd', 'Podaj liczbę dni ≥ 1.'); return; }
    const data = { ...form, water_days: days };
    if (isNew) await addPlant(data);
    else await updatePlant({ ...data, id: plantId });
    navigation.goBack();
  };

  const tc = TIER_COLORS[tierIndex] || TIER_COLORS[0];

  const WATER_AMOUNTS = ['bardzo mało', 'mało', 'umiarkowanie', 'regularnie', 'obficie'];
  const TYPE_OPTIONS = ['wielosezonowa', 'wielosezonowy', 'wielosezonowe', 'jednoroczna', 'jednoroczny'];
  const SUN_OPTIONS = ['jasny cień', 'kilka godzin słońca', 'bezpośrednie słońce'];

  return (
    <KeyboardAvoidingView style={st.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[st.header, { backgroundColor: tc.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={st.headerTitle}>{isNew ? 'Nowa roślina' : 'Edytuj roślinę'}</Text>
          <Text style={st.headerSub} numberOfLines={1}>{tierName}</Text>
        </View>
        <TouchableOpacity onPress={handleSave} style={st.saveBtn}>
          <Text style={st.saveTxt}>Zapisz</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={st.scroll} contentContainerStyle={st.scrollContent}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <Text style={st.sectionLabel}>Podstawowe</Text>
        <Field label="Nazwa *" value={form.name} onChangeText={v => set('name', v)} placeholder="np. Mięta marokańska" />

        <View style={st.field}>
          <Text style={st.fieldLabel}>Typ</Text>
          <View style={st.chips}>
            {TYPE_OPTIONS.map(opt => (
              <TouchableOpacity key={opt}
                style={[st.chip, form.type === opt && { backgroundColor: tc.bg, borderColor: tc.border }]}
                onPress={() => set('type', opt)}>
                <Text style={[st.chipTxt, form.type === opt && { color: tc.text, fontWeight: '700' }]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={st.sectionLabel}>Podlewanie</Text>
        <View style={st.field}>
          <Text style={st.fieldLabel}>Co ile dni</Text>
          <View style={st.daysRow}>
            <TouchableOpacity style={[st.dayBtn, { borderColor: tc.border }]}
              onPress={() => set('water_days', String(Math.max(1, parseInt(form.water_days) - 1)))}>
              <Ionicons name="remove" size={20} color={tc.border} />
            </TouchableOpacity>
            <Text style={[st.daysVal, { color: tc.border }]}>{form.water_days} dni</Text>
            <TouchableOpacity style={[st.dayBtn, { borderColor: tc.border }]}
              onPress={() => set('water_days', String(parseInt(form.water_days) + 1))}>
              <Ionicons name="add" size={20} color={tc.border} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={st.field}>
          <Text style={st.fieldLabel}>Ilość wody</Text>
          <View style={st.chips}>
            {WATER_AMOUNTS.map(opt => (
              <TouchableOpacity key={opt}
                style={[st.chip, form.water_amount === opt && { backgroundColor: tc.bg, borderColor: tc.border }]}
                onPress={() => set('water_amount', opt)}>
                <Text style={[st.chipTxt, form.water_amount === opt && { color: tc.text, fontWeight: '700' }]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={st.field}>
          <Text style={st.fieldLabel}>Słońce</Text>
          <View style={st.chips}>
            {SUN_OPTIONS.map(opt => (
              <TouchableOpacity key={opt}
                style={[st.chip, form.sun === opt && { backgroundColor: tc.bg, borderColor: tc.border }]}
                onPress={() => set('sun', opt)}>
                <Text style={[st.chipTxt, form.sun === opt && { color: tc.text, fontWeight: '700' }]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={st.sectionLabel}>Wskazówki</Text>
        <Field label="Jak sprawdzać wilgotność" value={form.check_tip} onChangeText={v => set('check_tip', v)} multiline placeholder="np. Wkłój palec 2 cm..." />
        <Field label="Przycinanie" value={form.prune_tip} onChangeText={v => set('prune_tip', v)} multiline placeholder="np. Tnij wierzchołki o 1/3..." />
        <Field label="Zbiór do kuchni" value={form.kitchen_tip} onChangeText={v => set('kitchen_tip', v)} multiline placeholder="np. Zbieraj od wierzchołka..." />
        <Field label="Notatki" value={form.notes} onChangeText={v => set('notes', v)} multiline placeholder="Dodatkowe uwagi..." />

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingTop: 50, paddingBottom: 14, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
  },
  backBtn: { padding: 4, marginBottom: 2 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 },
  saveBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8,
  },
  saveTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: COLORS.primary,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: 18, marginBottom: 8,
  },
  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 5 },
  input: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder,
    borderRadius: 10, padding: 12, fontSize: 15, color: COLORS.textPrimary,
    ...SHADOWS.small,
  },
  inputMulti: { minHeight: 75, paddingTop: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    borderWidth: 1.5, borderColor: COLORS.cardBorder, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.card,
  },
  chipTxt: { fontSize: 12, color: COLORS.textMuted },
  daysRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  dayBtn: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.card,
  },
  daysVal: { fontSize: 20, fontWeight: '800', minWidth: 70, textAlign: 'center' },
});
