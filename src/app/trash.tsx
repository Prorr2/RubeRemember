import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  FlatList,
  SafeAreaView,
  Alert,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useRememberStore, Item, ItemType } from '@/hooks/use-remember-store';
import { Colors } from '@/constants/theme';

export default function TrashScreen() {
  const store = useRememberStore();
  const router = useRouter();
  
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' || !colorScheme ? 'dark' : colorScheme;
  const colors = Colors[scheme];

  const trashedItems = useMemo(() => {
    return store.getTrashItems();
  }, [store.items]);

  const handleRestore = async (item: Item) => {
    await store.restoreItem(item.id);
    Alert.alert('Restaurado', `Se restauró "${item.title}".`);
  };

  const handlePermanentDelete = (item: Item) => {
    Alert.alert(
      'Eliminar permanentemente',
      `¿Deseas eliminar permanentemente "${item.title}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await store.deleteItemPermanently(item.id);
            Alert.alert('Eliminado', 'El elemento ha sido eliminado permanentemente.');
          },
        },
      ]
    );
  };

  const handleEmptyTrash = () => {
    if (trashedItems.length === 0) return;
    Alert.alert(
      'Vaciar Papelera',
      '¿Deseas eliminar permanentemente todos los elementos de la papelera? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Vaciar',
          style: 'destructive',
          onPress: async () => {
            await store.emptyTrash();
            Alert.alert('Papelera vaciada', 'Se eliminaron todos los elementos.');
          },
        },
      ]
    );
  };

  const getItemTypeIcon = (type: ItemType) => {
    if (type === ItemType.TASK) return { name: 'checkbox-outline', color: '#FF9500' };
    if (type === ItemType.REMINDER) return { name: 'notifications-outline', color: '#007AFF' };
    return { name: 'sparkles-outline', color: '#5856D6' };
  };

  const getDaysRemaining = (deletedAtStr?: string) => {
    if (!deletedAtStr) return 30;
    const deletedDate = new Date(deletedAtStr);
    const now = new Date();
    const diffTime = now.getTime() - deletedDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const remaining = 30 - diffDays;
    return remaining < 0 ? 0 : remaining;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.backgroundElement }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Papelera</Text>
        <Pressable
          onPress={handleEmptyTrash}
          style={[styles.headerButton, trashedItems.length === 0 && { opacity: 0.5 }]}
          disabled={trashedItems.length === 0}
        >
          <Text style={{ color: '#FF3B30', fontWeight: '700', fontSize: 14 }}>Vaciar</Text>
        </Pressable>
      </View>

      <View style={[styles.infoBanner, { backgroundColor: colors.backgroundElement }]}>
        <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Los elementos en la papelera se eliminarán automáticamente después de 30 días.
        </Text>
      </View>

      <FlatList
        data={trashedItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const iconInfo = getItemTypeIcon(item.type);
          const remaining = getDaysRemaining(item.deletedAt);

          return (
            <View style={[styles.trashCard, { backgroundColor: colors.backgroundElement }]}>
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name={iconInfo.name as any} size={18} color={iconInfo.color} />
                  <Text style={[styles.typeText, { color: colors.textSecondary }]}>
                    {item.type === ItemType.TASK ? 'Tarea' : item.type === ItemType.REMINDER ? 'Alarma' : 'Ocio'}
                  </Text>
                </View>
                <Text style={{ color: '#FF3B30', fontSize: 11, fontWeight: '700' }}>
                  Restan {remaining} días
                </Text>
              </View>

              <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>

              <View style={styles.cardActions}>
                <Pressable
                  onPress={() => handleRestore(item)}
                  style={[styles.actionBtn, { backgroundColor: colors.backgroundSelected }]}
                >
                  <Ionicons name="refresh-outline" size={15} color={colors.text} />
                  <Text style={[styles.actionBtnText, { color: colors.text }]}>Restaurar</Text>
                </Pressable>

                 <Pressable
                  onPress={() => handlePermanentDelete(item)}
                  style={[styles.actionBtn, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}
                >
                  <Ionicons name="trash-outline" size={15} color="#FF3B30" />
                  <Text style={[styles.actionBtnText, { color: '#FF3B30' }]}>Eliminar</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="trash-outline" size={48} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, marginTop: 8 }}>La papelera está vacía.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  infoBanner: {
    flexDirection: 'row',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  trashCard: {
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
