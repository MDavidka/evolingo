import { FlashList } from '@shopify/flash-list';
import React, { useMemo, useState } from 'react';
import {
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Cloud,
  Ellipsis,
  FilePenLine,
  FileText,
  Folder,
  Grid2x2,
  List,
  Plus,
  Trash2,
  X,
} from 'lucide-react-native';
import { EvolingoHeader } from '../components/EvolingoHeader';
import { LiquidGlassSearchField } from '../components/LiquidGlassSearchField';
import { Colors, Layout, Radii, Shadows, Typography } from '../theme/tokens';

export interface LibraryItem {
  id: string;
  title: string;
  subtitle: string;
  kind: 'folder' | 'file' | 'note';
  parentId: string | null;
  content?: string;
}

interface LibraryScreenProps {
  onOpenSidebar: () => void;
  onOpenProfile?: () => void;
  isSidebarOpen?: boolean;
  items: LibraryItem[];
  onAddItem: (item: Omit<LibraryItem, 'id'>) => void;
  onDeleteItem: (id: string) => void;
  onUpdateItem?: (id: string, content: string) => void;
  titleOverride?: string;
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({
  onOpenSidebar,
  onOpenProfile,
  isSidebarOpen = false,
  items,
  onAddItem,
  onDeleteItem,
  onUpdateItem,
  titleOverride = 'Saját fájlok',
}) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [newSheetOpen, setNewSheetOpen] = useState(false);
  const [newKind, setNewKind] = useState<'folder' | 'note' | 'file'>('folder');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
  const [actionMenuItem, setActionMenuItem] = useState<LibraryItem | null>(null);

  const currentFolder = useMemo(
    () => items.find((item) => item.id === currentFolderId) || null,
    [items, currentFolderId]
  );

  const visibleItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (q) {
        return (
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q)
        );
      }
      return item.parentId === currentFolderId;
    });
  }, [items, searchQuery, currentFolderId]);

  const handleCreate = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    const defaultSubtitle =
      newKind === 'folder'
        ? '0 elem'
        : newKind === 'file'
        ? 'PDF · 1,1 MB'
        : 'Jegyzet';

    onAddItem({
      title: trimmed,
      subtitle: defaultSubtitle,
      kind: newKind,
      parentId: currentFolderId,
      content: newContent.trim() || undefined,
    });
    setNewTitle('');
    setNewContent('');
    setNewSheetOpen(false);
  };



  const openItem = React.useCallback((item: LibraryItem) => {
    if (item.kind === 'folder') setCurrentFolderId(item.id);
    else setSelectedItem(item);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Unified App Header (with back navigation when inside a folder) */}
      <EvolingoHeader
        onOpenSidebar={onOpenSidebar}
        onOpenProfile={onOpenProfile}
        isSidebarOpen={isSidebarOpen}
        showBackButton={currentFolderId !== null}
        onBack={() => setCurrentFolderId(currentFolder?.parentId ?? null)}
        onMorePress={() => setNewSheetOpen(true)}
      />

      {/* Top Search Field */}
      <View style={styles.searchContainer}>
        <LiquidGlassSearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Fájlok és mappák keresése"
        />
      </View>

      {/* Section Header Row */}
      <View style={styles.sectionToolbar}>
        <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>
          {currentFolder ? currentFolder.title : titleOverride}
        </Text>

        <View style={styles.toolbarActions}>
          <Pressable
            onPress={() => setViewMode((v) => (v === 'list' ? 'grid' : 'list'))}
            accessibilityRole="button"
            accessibilityLabel={viewMode === 'list' ? 'Rács nézet' : 'Lista nézet'}
            style={({ pressed }) => [
              styles.viewToggleButton,
              pressed && styles.pressed,
            ]}
          >
            {viewMode === 'list' ? (
              <Grid2x2 size={20} color={Colors.textSecondary} strokeWidth={1.9} />
            ) : (
              <List size={20} color={Colors.textSecondary} strokeWidth={1.9} />
            )}
          </Pressable>

          <Pressable
            onPress={() => setNewSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Új elem létrehozása"
            style={({ pressed }) => [styles.newPillButton, pressed && styles.pressed]}
          >
            <Plus size={16} color={Colors.textPrimary} strokeWidth={2.0} />
            <Text style={styles.newPillText} maxFontSizeMultiplier={1.15}>
              Új
            </Text>
          </Pressable>
        </View>
      </View>

      {/* File & Folder List / Grid */}
      <FlashList
        key={viewMode}
        data={visibleItems}
        numColumns={viewMode === 'grid' ? 2 : 1}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <LibraryRow item={item} viewMode={viewMode} onOpen={openItem} onMenu={setActionMenuItem} />
        )}
        ListEmptyComponent={<View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Nincs megjeleníthető elem</Text>
            <Text style={styles.emptyStateSubtitle}>
              Koppints a „+ Új” gombra mappa vagy jegyzet létrehozásához.
            </Text>
          </View>}
      />

      {/* Bottom Storage Meter */}
      <View
        style={[
          styles.storageFooter,
          { paddingBottom: Math.max(insets.bottom + 8, 18) },
        ]}
      >
        <View style={styles.storageLabelRow}>
          <View style={styles.storageLeftLabel}>
            <Cloud size={16} color={Colors.textSecondary} strokeWidth={1.9} />
            <Text style={styles.storageLabelText} maxFontSizeMultiplier={1.15}>
              Tárhely
            </Text>
          </View>
          <Text style={styles.storageValueText} maxFontSizeMultiplier={1.15}>
            1,2 GB / 5 GB
          </Text>
        </View>
        <View style={styles.storageTrack}>
          <View style={[styles.storageFill, { width: '24%' }]} />
        </View>
      </View>

      {/* Create Item Modal */}
      <Modal
        visible={newSheetOpen}
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
        animationType="slide"
        onRequestClose={() => setNewSheetOpen(false)}
      >
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Új elem hozzáadása</Text>
              <Pressable
                onPress={() => setNewSheetOpen(false)}
                style={styles.closeButton}
              >
                <X size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.kindTabs}>
              {(
                [
                  { id: 'folder', label: 'Mappa' },
                  { id: 'note', label: 'Jegyzet' },
                  { id: 'file', label: 'Dokumentum' },
                ] as const
              ).map((k) => {
                const active = newKind === k.id;
                return (
                  <Pressable
                    key={k.id}
                    onPress={() => setNewKind(k.id)}
                    style={[styles.kindTab, active && styles.kindTabActive]}
                  >
                    <Text
                      style={[
                        styles.kindTabText,
                        active && styles.kindTabTextActive,
                      ]}
                    >
                      {k.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              style={styles.modalInput}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder={
                newKind === 'folder'
                  ? 'Mappa neve (pl. Fizika)'
                  : newKind === 'note'
                  ? 'Jegyzet címe'
                  : 'Fájl neve (pl. Jegyzet.pdf)'
              }
              placeholderTextColor={Colors.textMuted}
              autoFocus
            />

            {newKind !== 'folder' && (
              <TextInput
                style={[styles.modalInput, styles.modalTextarea]}
                value={newContent}
                onChangeText={setNewContent}
                placeholder="Tartalom vagy rövid leírás..."
                placeholderTextColor={Colors.textMuted}
                multiline
              />
            )}

            <Pressable onPress={handleCreate} style={styles.primaryModalBtn}>
              <Text style={styles.primaryModalBtnText}>Létrehozás</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* File / Note Viewer Modal */}
      <Modal
        visible={selectedItem !== null}
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
        animationType="slide"
        onRequestClose={() => setSelectedItem(null)}
      >
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {selectedItem?.title}
              </Text>
              <Pressable
                onPress={() => setSelectedItem(null)}
                style={styles.closeButton}
              >
                <X size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.previewSubtitle}>{selectedItem?.subtitle}</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextarea]}
              value={
                selectedItem?.content ??
                `${selectedItem?.title ?? ''} — szinkronizált Evolingo dokumentum.`
              }
              onChangeText={(txt) => {
                if (selectedItem) {
                  setSelectedItem({ ...selectedItem, content: txt });
                  onUpdateItem?.(selectedItem.id, txt);
                }
              }}
              multiline
            />
            <Pressable
              onPress={() => setSelectedItem(null)}
              style={styles.primaryModalBtn}
            >
              <Text style={styles.primaryModalBtnText}>Kész</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Item Action Sheet */}
      <Modal
        visible={actionMenuItem !== null}
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
        animationType="slide"
        onRequestClose={() => setActionMenuItem(null)}
      >
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {actionMenuItem?.title}
              </Text>
              <Pressable
                onPress={() => setActionMenuItem(null)}
                style={styles.closeButton}
              >
                <X size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <Pressable
              onPress={() => {
                if (actionMenuItem) {
                  onDeleteItem(actionMenuItem.id);
                  setActionMenuItem(null);
                }
              }}
              style={styles.dangerBtn}
            >
              <Trash2 size={18} color="#D92D20" />
              <Text style={styles.dangerBtnText}>Elem törlése</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const renderItemIcon = (kind: LibraryItem['kind']) => {
    switch (kind) {
      case 'folder':
        return <Folder size={22} color={Colors.textPrimary} strokeWidth={1.9} />;
      case 'file':
        return <FileText size={22} color={Colors.textPrimary} strokeWidth={1.9} />;
      case 'note':
        return <FilePenLine size={22} color={Colors.textPrimary} strokeWidth={1.9} />;
    }
  };

const LibraryRow = React.memo(function LibraryRow({ item, viewMode, onOpen, onMenu }: {
  item: LibraryItem;
  viewMode: 'list' | 'grid';
  onOpen: (item: LibraryItem) => void;
  onMenu: (item: LibraryItem) => void;
}) {
  return (viewMode === 'list' ? (
    <Pressable
      onPress={() => onOpen(item)}
      style={({ pressed }) => [
        styles.fileRow,
        pressed && styles.rowPressed,
      ]}
    >
      <View style={styles.iconTile}>{renderItemIcon(item.kind)}</View>

      <View style={styles.fileTextColumn}>
        <Text
          style={styles.fileTitle}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text
          style={styles.fileSubtitle}
          numberOfLines={1}
        >
          {item.subtitle}
        </Text>
      </View>

      <Pressable
        onPress={() => onMenu(item)}
        accessibilityRole="button"
        accessibilityLabel={`${item.title} műveletek`}
        style={({ pressed }) => [
          styles.moreButton,
          pressed && styles.pressed,
        ]}
      >
        <Ellipsis size={19} color={Colors.textSecondary} strokeWidth={2.0} />
      </Pressable>
    </Pressable>
  ) : (
    <Pressable
      onPress={() => onOpen(item)}
      style={({ pressed }) => [
        styles.gridCard,
        pressed && styles.rowPressed,
      ]}
    >
      <View style={styles.gridCardTop}>
        <View style={styles.iconTile}>{renderItemIcon(item.kind)}</View>
        <Pressable
          onPress={() => onMenu(item)}
          style={styles.moreButton}
        >
          <Ellipsis size={18} color={Colors.textSecondary} strokeWidth={2.0} />
        </Pressable>
      </View>
      <Text style={styles.fileTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.fileSubtitle} numberOfLines={1}>
        {item.subtitle}
      </Text>
    </Pressable>
  ));
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    paddingHorizontal: Layout.screenHorizontalPadding,
    paddingTop: 10,
    paddingBottom: 6,
  },
  sectionToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenHorizontalPadding,
    paddingTop: 18,
    paddingBottom: 10,
  },
  sectionTitle: {
    ...Typography.sectionHeading,
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  viewToggleButton: {
    width: Layout.minTapTarget,
    height: Layout.minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  newPillButton: {
    height: 38,
    paddingHorizontal: 15,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceWhite,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...Shadows.floatingControl,
  },
  newPillText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Layout.screenHorizontalPadding,
    paddingBottom: 24,
  },
  gridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  fileRow: {
    minHeight: 74,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
  },
  rowPressed: {
    opacity: 0.72,
  },
  iconTile: {
    width: 50,
    height: 50,
    borderRadius: Radii.iconTile,
    backgroundColor: Colors.iconTileBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  fileTextColumn: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 8,
  },
  fileTitle: {
    ...Typography.cardTitle,
    fontWeight: '500',
    marginBottom: 3,
  },
  fileSubtitle: {
    ...Typography.secondaryLabel,
  },
  moreButton: {
    width: Layout.minTapTarget,
    height: Layout.minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCard: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: Colors.surfaceWhite,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: 14,
    marginBottom: 4,
  },
  gridCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyStateTitle: {
    ...Typography.cardTitle,
    marginBottom: 6,
  },
  emptyStateSubtitle: {
    ...Typography.secondaryLabel,
    textAlign: 'center',
  },
  storageFooter: {
    paddingHorizontal: Layout.screenHorizontalPadding,
    paddingTop: 12,
    backgroundColor: Colors.background,
  },
  storageLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  storageLeftLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  storageLabelText: {
    ...Typography.secondaryLabel,
  },
  storageValueText: {
    ...Typography.secondaryLabel,
  },
  storageTrack: {
    height: 4.5,
    borderRadius: 3,
    backgroundColor: Colors.progressTrack,
    overflow: 'hidden',
  },
  storageFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.progressFill,
  },
  pressed: {
    opacity: 0.72,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: Colors.surfaceWhite,
  },
  modalCard: {
    backgroundColor: Colors.surfaceWhite,
    borderRadius: 24,
    padding: 20,
    ...Shadows.card,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kindTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  kindTab: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kindTabActive: {
    backgroundColor: Colors.primaryDark,
  },
  kindTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  kindTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalInput: {
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.surfaceInput,
    paddingHorizontal: 14,
    fontSize: 15.5,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  modalTextarea: {
    height: 110,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  previewSubtitle: {
    ...Typography.secondaryLabel,
    marginBottom: 12,
  },
  primaryModalBtn: {
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryModalBtnText: {
    fontSize: 15.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dangerBtn: {
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FEF3F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dangerBtnText: {
    fontSize: 15.5,
    fontWeight: '600',
    color: '#D92D20',
  },
});
