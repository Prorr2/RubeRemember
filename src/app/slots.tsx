import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  StyleSheet,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRememberStore, TimeSlot } from '../hooks/use-remember-store';
import { useColorScheme } from '../hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

// ─────────────────────────────────────────────────────────────────────────────
// Small time-input helper (HH:MM)
// ─────────────────────────────────────────────────────────────────────────────
function TimeInput({
  label,
  value,
  onChange,
  colors,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  colors: typeof Colors.dark;
}) {
  // Local editing buffers so each field is fully independent
  const [hText, setHText] = React.useState(() => value.split(':')[0] ?? '00');
  const [mText, setMText] = React.useState(() => value.split(':')[1] ?? '00');

  // Keep local state in sync when parent value changes externally
  React.useEffect(() => {
    const parts = value.split(':');
    setHText(parts[0] ?? '00');
    setMText(parts[1] ?? '00');
  }, [value]);

  const commitH = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 2);
    const clamped = Math.min(23, parseInt(digits || '0', 10));
    const formatted = String(clamped).padStart(2, '0');
    setHText(formatted);
    onChange(`${formatted}:${mText.padStart(2, '0')}`);
  };

  const commitM = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 2);
    const clamped = Math.min(59, parseInt(digits || '0', 10));
    const formatted = String(clamped).padStart(2, '0');
    setMText(formatted);
    onChange(`${hText.padStart(2, '0')}:${formatted}`);
  };

  return (
    <View style={{ flex: 1 }}>
      <Text style={[formStyles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[formStyles.timeRow, { borderColor: colors.backgroundSelected }]}>
        <TextInput
          style={[formStyles.timeSegment, { color: colors.text, backgroundColor: colors.backgroundElement }]}
          value={hText}
          onChangeText={setHText}
          onBlur={() => commitH(hText)}
          onEndEditing={() => commitH(hText)}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="HH"
          placeholderTextColor={colors.textSecondary}
          selectTextOnFocus
        />
        <Text style={{ color: colors.textSecondary, fontSize: 18, fontWeight: 'bold' }}>:</Text>
        <TextInput
          style={[formStyles.timeSegment, { color: colors.text, backgroundColor: colors.backgroundElement }]}
          value={mText}
          onChangeText={setMText}
          onBlur={() => commitM(mText)}
          onEndEditing={() => commitM(mText)}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="MM"
          placeholderTextColor={colors.textSecondary}
          selectTextOnFocus
        />
      </View>
    </View>
  );
}

const formStyles = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 10, padding: 4 },
  timeSegment: { width: 44, textAlign: 'center', fontSize: 18, fontWeight: 'bold', borderRadius: 8, padding: 6 },
});

// ─────────────────────────────────────────────────────────────────────────────
// Slot form modal
// ─────────────────────────────────────────────────────────────────────────────
function SlotFormModal({
  visible,
  initial,
  onSave,
  onClose,
  colors,
}: {
  visible: boolean;
  initial: Partial<TimeSlot> | null;
  onSave: (name: string, start: string, end: string) => void;
  onClose: () => void;
  colors: typeof Colors.dark;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [start, setStart] = useState(initial?.startTime ?? '09:00');
  const [end, setEnd] = useState(initial?.endTime ?? '10:00');

  React.useEffect(() => {
    if (visible) {
      setName(initial?.name ?? '');
      setStart(initial?.startTime ?? '09:00');
      setEnd(initial?.endTime ?? '10:00');
    }
  }, [visible, initial]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre de la franja no puede estar vacío.');
      return;
    }
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    if (sh * 60 + sm >= eh * 60 + em) {
      Alert.alert('Error', 'La hora de inicio debe ser anterior a la hora de fin.');
      return;
    }
    onSave(name.trim(), start, end);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.container, { backgroundColor: colors.background }]}>
          <Text style={[modalStyles.title, { color: colors.text }]}>
            {initial?.id ? 'Editar franja' : 'Nueva franja horaria'}
          </Text>

          {/* Name */}
          <Text style={[formStyles.label, { color: colors.textSecondary, marginTop: 12 }]}>Nombre</Text>
          <TextInput
            style={[modalStyles.nameInput, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}
            value={name}
            onChangeText={setName}
            placeholder='Ej: "Tarde"'
            placeholderTextColor={colors.textSecondary}
          />

          {/* Times */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <TimeInput label="Inicio" value={start} onChange={setStart} colors={colors} />
            <TimeInput label="Fin" value={end} onChange={setEnd} colors={colors} />
          </View>

          {/* Actions */}
          <View style={modalStyles.btnRow}>
            <Pressable style={[modalStyles.btn, { backgroundColor: colors.backgroundSelected }]} onPress={onClose}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>Cancelar</Text>
            </Pressable>
            <Pressable style={[modalStyles.btn, { backgroundColor: '#007AFF' }]} onPress={handleSave}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Guardar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 },
  container: { borderRadius: 20, padding: 24, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, elevation: 12 },
  title: { fontSize: 18, fontWeight: '700' },
  nameInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, marginTop: 4 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12 },
});

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────
export default function SlotsScreen() {
  const store = useRememberStore();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' || !colorScheme ? 'dark' : colorScheme;
  const colors = Colors[scheme];

  const [modalVisible, setModalVisible] = useState(false);
  const [editingSlot, setEditingSlot] = useState<Partial<TimeSlot> | null>(null);
  const [separation, setSeparation] = useState(String(store.slotSeparationMinutes));

  const openNew = () => {
    setEditingSlot(null);
    setModalVisible(true);
  };

  const openEdit = (slot: TimeSlot) => {
    setEditingSlot(slot);
    setModalVisible(true);
  };

  const handleSave = async (name: string, start: string, end: string) => {
    if (editingSlot?.id) {
      await store.updateTimeSlot(editingSlot.id, name, start, end);
    } else {
      await store.addTimeSlot(name, start, end);
    }
    setModalVisible(false);
  };

  const handleDelete = (slot: TimeSlot) => {
    Alert.alert(
      'Borrar franja',
      `¿Borrar la franja "${slot.name}"? Los recordatorios que la usen perderán su asignación de franja.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: () => store.deleteTimeSlot(slot.id),
        },
      ]
    );
  };

  const handleSaveSeparation = async () => {
    const parsed = parseInt(separation, 10);
    if (isNaN(parsed) || parsed < 1) {
      Alert.alert('Error', 'La separación mínima es 1 minuto.');
      return;
    }
    await store.setSlotSeparationMinutes(parsed);
    Alert.alert('Guardado', `Separación actualizada a ${parsed} minutos.`);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.backgroundSelected }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Franjas Horarias</Text>
        <Pressable onPress={openNew} style={styles.addBtn}>
          <Ionicons name="add" size={24} color="#007AFF" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Separation setting */}
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="timer-outline" size={18} color="#FF9500" />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Separación entre recordatorios</Text>
          </View>
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
            Cuando hay más de un recordatorio en la misma franja horaria, se separan automáticamente por estos minutos.
          </Text>
          <View style={styles.separationRow}>
            <TextInput
              style={[styles.separationInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}
              value={separation}
              onChangeText={setSeparation}
              keyboardType="number-pad"
              maxLength={3}
            />
            <Text style={[styles.separationUnit, { color: colors.textSecondary }]}>min</Text>
            <Pressable style={styles.saveBtn} onPress={handleSaveSeparation}>
              <Text style={styles.saveBtnText}>Aplicar</Text>
            </Pressable>
          </View>
        </View>

        {/* Slot list */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          FRANJAS DEFINIDAS ({store.timeSlots.length})
        </Text>

        {store.timeSlots.length === 0 && (
          <View style={[styles.emptyCard, { borderColor: colors.backgroundSelected }]}>
            <Ionicons name="time-outline" size={36} color={colors.textSecondary} style={{ opacity: 0.4 }} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No hay franjas definidas. Toca "+" para crear una.
            </Text>
          </View>
        )}

        {store.timeSlots.map((slot) => {
          const count = store.reminders.filter((r) => r.timeSlotId === slot.id).length;
          const [sh, sm] = slot.startTime.split(':').map(Number);
          const [eh, em] = slot.endTime.split(':').map(Number);
          const durationMin = (eh * 60 + em) - (sh * 60 + sm);
          const maxItems = store.slotSeparationMinutes > 0 ? Math.floor(durationMin / store.slotSeparationMinutes) : 99;

          return (
            <View key={slot.id} style={[styles.slotCard, { backgroundColor: colors.backgroundElement }]}>
              <View style={styles.slotLeft}>
                <Text style={[styles.slotName, { color: colors.text }]}>{slot.name}</Text>
                <Text style={[styles.slotRange, { color: '#007AFF' }]}>
                  {slot.startTime} – {slot.endTime}
                </Text>
                <Text style={[styles.slotMeta, { color: colors.textSecondary }]}>
                  {count} recordatorio{count !== 1 ? 's' : ''} · máx. {maxItems} en franja
                </Text>
              </View>
              <View style={styles.slotActions}>
                <Pressable onPress={() => openEdit(slot)} style={styles.slotBtn}>
                  <Ionicons name="create-outline" size={20} color="#007AFF" />
                </Pressable>
                <Pressable onPress={() => handleDelete(slot)} style={styles.slotBtn}>
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </Pressable>
              </View>
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>

      <SlotFormModal
        visible={modalVisible}
        initial={editingSlot}
        onSave={handleSave}
        onClose={() => setModalVisible(false)}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700' },
  addBtn: { padding: 4 },
  content: { padding: 16, gap: 12 },
  card: { borderRadius: 16, padding: 16, gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardDesc: { fontSize: 13, lineHeight: 18 },
  separationRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  separationInput: { width: 64, borderWidth: 1, borderRadius: 10, textAlign: 'center', fontSize: 20, fontWeight: '700', paddingVertical: 6 },
  separationUnit: { fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: '#FF9500', borderRadius: 10, alignItems: 'center', paddingVertical: 10 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: 8 },
  emptyCard: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 16, padding: 32, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 13, textAlign: 'center' },
  slotCard: { borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center' },
  slotLeft: { flex: 1, gap: 2 },
  slotName: { fontSize: 16, fontWeight: '700' },
  slotRange: { fontSize: 14, fontWeight: '600' },
  slotMeta: { fontSize: 12 },
  slotActions: { flexDirection: 'row', gap: 4 },
  slotBtn: { padding: 8 },
});
