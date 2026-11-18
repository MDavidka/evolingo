import { showActions } from './action-sheet';
import { FlashList } from '@shopify/flash-list';
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import {
  Search,
  BookOpen,
  Folder,
  AtSign,
  Clock,
  Terminal,
  LayoutGrid,
  MessageCircle,
  SquarePen,
  X,
  Coffee,
  Blocks,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EvoTheme } from '../theme/tokens';

export type EvolingoRoute =
  | 'chat'
  | 'library'
  | 'projects'
  | 'plugins'
  | 'schedule'
  | 'codex'
  | 'profile';

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: number;
  pinned?: boolean;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    attachmentName?: string;
  }>;
}

interface LayeredSidebarProps {
  sessions: ChatSession[];
  currentSessionId: string;
  activeRoute: EvolingoRoute;
  userName: string;
  onSelectSession: (id: string) => void;
  onTogglePinSession?: (id: string) => void;
  onDeleteSession?: (id: string) => void;
  onNavigate: (route: EvolingoRoute) => void;
  onNewChat: () => void;
  onClose: () => void;
}

const NAV_ITEMS: Array<{
  route: EvolingoRoute;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
}> = [
  { route: 'library', label: 'Library', icon: BookOpen },
  { route: 'projects', label: 'Cowork', icon: Coffee },
  { route: 'plugins', label: 'Space', icon: Blocks },
  { route: 'schedule', label: 'Schedule', icon: Clock },
];

export const LayeredSidebar: React.FC<LayeredSidebarProps> = ({
  sessions,
  currentSessionId,
  activeRoute,
  userName,
  onSelectSession,
  onTogglePinSession,
  onDeleteSession,
  onNavigate,
  onNewChat,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSessions = sessions.filter((s) =>
    searchQuery.trim()
      ? s.title.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        s.messages.some((m) =>
          m.content.toLowerCase().includes(searchQuery.trim().toLowerCase())
        )
      : true
  );

  const pinnedSessions = filteredSessions.filter((s) => s.pinned);
  const recentSessions = filteredSessions.filter((s) => !s.pinned);

  const historyRows: HistoryRow[] = [
    ...(pinnedSessions.length ? [{ kind: 'heading' as const, id: 'pinned-heading', title: 'Pinned' }] : []),
    ...pinnedSessions.map((session): HistoryRow => ({ kind: 'thread', id: session.id, session })),
    { kind: 'heading', id: 'recent-heading', title: 'Recents' },
    ...recentSessions.map((session): HistoryRow => ({ kind: 'thread', id: session.id, session })),
  ];

  const initials =
    userName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'DM';

  const handleLongPressThread = React.useCallback((session: ChatSession) => {
    showActions(session.title, 'Choose an action for this conversation:', [
      {
        text: session.pinned ? 'Unpin' : 'Pin to top',
        onPress: () => onTogglePinSession?.(session.id),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDeleteSession?.(session.id),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [onDeleteSession, onTogglePinSession]);

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top + 8, 58),
          paddingBottom: Math.max(insets.bottom + 10, 20),
        },
      ]}
    >
      {/* Top Header: Evolingo Title + 44pt Search Circle Button */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={onClose}
          activeOpacity={0.75}
          accessibilityRole="header"
          accessibilityLabel="Evolingo menu"
        >
          <Text style={styles.brandTitle}>Evolingo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.searchCircleButton}
          onPress={() => {
            setSearchOpen((prev) => !prev);
            if (searchOpen) setSearchQuery('');
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Search conversations"
        >
          {searchOpen ? (
            <X size={19} color={EvoTheme.colors.ink} strokeWidth={1.9} />
          ) : (
            <Search size={19} color={EvoTheme.colors.ink} strokeWidth={1.9} />
          )}
        </TouchableOpacity>
      </View>

      {/* Inline Conversation Search Bar (toggled by Search Circle) */}
      {searchOpen && (
        <View style={styles.searchBox}>
          <Search size={16} color={EvoTheme.colors.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations…"
            placeholderTextColor={EvoTheme.colors.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={15} color={EvoTheme.colors.secondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Scrollable Navigation + Pinned + Recents */}
      <FlashList
        data={historyRows}
        keyExtractor={(row) => row.id}
        getItemType={(row) => row.kind}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={<View style={styles.navList}>
          {NAV_ITEMS.map((item) => {
            const IconComponent = item.icon;
            const isSelected = activeRoute === item.route;
            return (
              <TouchableOpacity
                key={item.route}
                style={[styles.navRow, isSelected && styles.navRowSelected]}
                onPress={() => onNavigate(item.route)}
                activeOpacity={0.68}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={item.label}
              >
                <View style={styles.navIconBox}>
                  <IconComponent
                    size={21}
                    color={EvoTheme.colors.ink}
                    strokeWidth={1.85}
                  />
                </View>
                <Text
                  style={[
                    styles.navLabel,
                    isSelected && styles.navLabelSelected,
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>}
        renderItem={({ item }) => item.kind === 'heading' ? (
          <Text style={styles.sectionHeader}>{item.title}</Text>
        ) : (
          <ThreadRow
            session={item.session}
            selected={activeRoute === 'chat' && item.session.id === currentSessionId}
            onSelect={onSelectSession}
            onOpenMenu={handleLongPressThread}
          />
        )}
      />

      {/* Bottom Floating Controls (IMG_6786: Left Blue "Chat" Pill + Right Avatar Circle) */}
      <View
        style={[
          styles.floatingBottomBar,
          { bottom: Math.max(insets.bottom + 10, 20) },
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={styles.blueChatPill}
          onPress={onNewChat}
          activeOpacity={0.86}
          accessibilityRole="button"
          accessibilityLabel="Új chat indítása"
        >
          <SquarePen size={18} color="#FFFFFF" strokeWidth={2} />
          <Text style={styles.blueChatPillText}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomAvatarOuter}
          onPress={() => onNavigate('profile')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Profil: ${userName}`}
        >
          <View style={styles.bottomAvatarInner}>
            <Text style={styles.bottomAvatarText}>{initials}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

type HistoryRow =
  | { kind: 'heading'; id: string; title: string }
  | { kind: 'thread'; id: string; session: ChatSession };

const ThreadRow = React.memo(function ThreadRow({
  session, selected, onSelect, onOpenMenu,
}: {
  session: ChatSession;
  selected: boolean;
  onSelect: (id: string) => void;
  onOpenMenu: (session: ChatSession) => void;
}) {
  return (
    <TouchableOpacity
      style={[session.pinned ? styles.pinnedRow : styles.recentRow, selected && styles.threadRowSelected]}
      onPress={() => onSelect(session.id)}
      onLongPress={() => onOpenMenu(session)}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      {session.pinned ? <MessageCircle size={19} color={EvoTheme.colors.ink} style={styles.pinnedIcon} /> : null}
      <Text style={[styles.threadTitle, selected && styles.threadTitleSelected]} numberOfLines={1}>
        {session.title}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: EvoTheme.colors.canvas,
    paddingHorizontal: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 14,
  },
  brandTitle: {
    fontSize: EvoTheme.typography.sidebarTitle,
    fontWeight: '700',
    color: EvoTheme.colors.ink,
    letterSpacing: -0.3,
  },
  searchCircleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: EvoTheme.colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchBox: {
    height: 42,
    borderRadius: 14,
    backgroundColor: EvoTheme.colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: EvoTheme.colors.line,
    paddingHorizontal: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: EvoTheme.colors.ink,
    paddingVertical: 4,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 88,
  },
  navList: {
    gap: 2,
    marginBottom: 18,
  },
  navRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  navRowSelected: {
    backgroundColor: EvoTheme.colors.sidebarSelected,
  },
  navIconBox: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  navLabel: {
    fontSize: EvoTheme.typography.sidebarNav,
    fontWeight: '500',
    color: EvoTheme.colors.ink,
  },
  navLabelSelected: {
    fontWeight: '600',
  },
  sectionBlock: {
    marginTop: 8,
    marginBottom: 10,
  },
  sectionHeader: {
    fontSize: EvoTheme.typography.sectionHeader,
    fontWeight: '600',
    color: EvoTheme.colors.ink,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  pinnedRow: {
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinnedIcon: {
    marginRight: 12,
  },
  recentRow: {
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 12,
    justifyContent: 'center',
    marginBottom: 2,
  },
  threadRowSelected: {
    backgroundColor: EvoTheme.colors.sidebarSelected,
  },
  threadTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: EvoTheme.colors.inkSoft,
    flexShrink: 1,
  },
  threadTitleSelected: {
    fontWeight: '500',
    color: EvoTheme.colors.ink,
  },
  floatingBottomBar: {
    position: 'absolute',
    left: 18,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  blueChatPill: {
    height: 50,
    paddingHorizontal: 22,
    borderRadius: 25,
    backgroundColor: EvoTheme.colors.chatBluePill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    shadowColor: '#1E439E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.26,
    shadowRadius: 12,
    elevation: 5,
  },
  blueChatPillText: {
    fontSize: 16.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomAvatarOuter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: EvoTheme.colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  bottomAvatarInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F39C12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomAvatarText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
