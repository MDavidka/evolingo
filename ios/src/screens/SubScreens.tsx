import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {
  ArrowUpRight,
  Bell,
  Check,
  Coffee,
  Plus,
  ShieldCheck,
} from 'lucide-react-native';
import { EvolingoHeader } from '../components/EvolingoHeader';
import { LiquidGlassSearchField } from '../components/LiquidGlassSearchField';
import { Colors, Layout, Radii, Shadows, Typography } from '../theme/tokens';

interface SharedScreenProps {
  onOpenSidebar: () => void;
  onOpenProfile?: () => void;
  isSidebarOpen?: boolean;
  onStartPrompt?: (prompt: string) => void;
}

/* -------------------------------------------------------------------------- */
/* COWORK SCREEN                                                              */
/* -------------------------------------------------------------------------- */
export const ProjectsScreen: React.FC<SharedScreenProps> = ({
  onOpenSidebar,
  onOpenProfile,
  isSidebarOpen,
  onStartPrompt,
}) => {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [projects, setProjects] = useState([
    {
      id: 'proj-1',
      title: 'Evolingo iOS 2.0 Redesign',
      subtitle: 'Active workspace · 6 documents · 3 scheduled tasks',
      progress: 0.78,
      status: 'In Progress',
    },
    {
      id: 'proj-2',
      title: 'Erasmus+ Grant Materials',
      subtitle: 'Cover letter, CV, and language preparation',
      progress: 0.55,
      status: 'Active',
    },
    {
      id: 'proj-3',
      title: 'Advanced Biology Exam Review',
      subtitle: 'Cellular biology and biochemistry modules',
      progress: 0.92,
      status: 'Final Phase',
    },
  ]);

  const filtered = projects.filter(
    (p) =>
      !search.trim() ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.subtitle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom }]}>
      <EvolingoHeader
        onOpenSidebar={onOpenSidebar}
        onOpenProfile={onOpenProfile}
        isSidebarOpen={isSidebarOpen}
      />

      <View style={styles.searchWrap}>
        <LiquidGlassSearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Search cowork spaces…"
        />
      </View>

      <View style={styles.toolbarRow}>
        <Text style={styles.sectionTitle}>Cowork</Text>
        <Pressable
          onPress={() =>
            setProjects((prev) => [
              {
                id: `proj-${Date.now()}`,
                title: `New Space #${prev.length + 1}`,
                subtitle: 'Just created · 0 documents',
                progress: 0.15,
                status: 'New',
              },
              ...prev,
            ])
          }
          style={styles.newPill}
        >
          <Plus size={16} color={Colors.textPrimary} strokeWidth={2.0} />
          <Text style={styles.newPillText}>New Space</Text>
        </Pressable>
      </View>

      <FlashList
        data={filtered}
        keyExtractor={(project) => project.id}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: proj }) => <ProjectRow proj={proj} onStartPrompt={onStartPrompt} />}
      />
    </View>
  );
};

/* -------------------------------------------------------------------------- */
/* PROFILE SCREEN                                                             */
/* -------------------------------------------------------------------------- */
export const ProfileScreen: React.FC<SharedScreenProps> = ({
  onOpenSidebar,
  onOpenProfile,
  isSidebarOpen,
}) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  return (
    <View style={styles.container}>
      <EvolingoHeader
        onOpenSidebar={onOpenSidebar}
        onOpenProfile={onOpenProfile}
        isSidebarOpen={isSidebarOpen}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { marginTop: 10 }]}>
          <View style={styles.cardRow}>
            <View style={[styles.iconTile, { backgroundColor: '#F39C22' }]}>
              <Text style={styles.avatarInitials}>DM</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>David Miller</Text>
              <Text style={styles.cardSubtitle}>
                Evolingo Pro · iOS Native Build 75
              </Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Check size={14} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { marginVertical: 12 }]}>
          Preferences
        </Text>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.iconTile}>
              <Bell size={21} color={Colors.textPrimary} strokeWidth={1.9} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>Push Notifications</Text>
              <Text style={styles.cardSubtitle}>
                Task updates and background agent alerts
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{
                false: Colors.progressTrack,
                true: Colors.primaryDark,
              }}
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.iconTile}>
              <ShieldCheck
                size={21}
                color={Colors.textPrimary}
                strokeWidth={1.9}
              />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>Haptic Feedback</Text>
              <Text style={styles.cardSubtitle}>
                Subtle tactile response on interactions
              </Text>
            </View>
            <Switch
              value={hapticsEnabled}
              onValueChange={setHapticsEnabled}
              trackColor={{
                false: Colors.progressTrack,
                true: Colors.primaryDark,
              }}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

/* Compatibility placeholders */
export const PluginsScreen = ProjectsScreen;
export const CodexScreen = ProjectsScreen;
export const ExploreScreen = ProjectsScreen;

const ProjectRow = React.memo(function ProjectRow({proj, onStartPrompt}: { proj: { id: string; title: string; subtitle: string; progress: number }; onStartPrompt?: SharedScreenProps["onStartPrompt"] }) {
return (<Pressable
    onPress={() =>
      onStartPrompt?.(`Continue work in space: ${proj.title}`)
    }
    style={({ pressed }) => [styles.card, pressed && styles.pressed]}
  >
    <View style={styles.cardRow}>
      <View style={styles.iconTile}>
        <Coffee
          size={22}
          color={Colors.textPrimary}
          strokeWidth={1.9}
        />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{proj.title}</Text>
        <Text style={styles.cardSubtitle}>{proj.subtitle}</Text>
      </View>
      <ArrowUpRight size={19} color={Colors.textSecondary} />
    </View>
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          { width: `${Math.round(proj.progress * 100)}%` },
        ]}
      />
    </View>
  </Pressable>);
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchWrap: {
    paddingHorizontal: Layout.screenHorizontalPadding,
    paddingTop: 10,
    paddingBottom: 6,
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenHorizontalPadding,
    paddingTop: 14,
    paddingBottom: 12,
  },
  sectionTitle: {
    ...Typography.sectionHeading,
  },
  newPill: {
    height: 38,
    paddingHorizontal: 14,
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
    fontSize: 14.5,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Layout.screenHorizontalPadding,
    paddingBottom: 36,
    gap: 14,
  },
  card: {
    backgroundColor: Colors.surfaceWhite,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: 16,
    paddingVertical: 15,
    ...Shadows.card,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  cardBody: {
    flex: 1,
    paddingRight: 10,
  },
  cardTitle: {
    ...Typography.cardTitle,
    marginBottom: 3,
  },
  cardSubtitle: {
    ...Typography.secondaryLabel,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.progressTrack,
    marginTop: 14,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.progressFill,
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  verifiedBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
