import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import {
  Blocks,
  Globe,
  Terminal,
  FileText,
  Sparkles,
  Layers,
  Volume2,
  Check,
  ArrowUpRight,
  Plus,
} from 'lucide-react-native';
import { EvolingoHeader } from '../components/EvolingoHeader';
import { LiquidGlassSearchField } from '../components/LiquidGlassSearchField';
import { EvoTheme } from '../theme/tokens';

interface SpaceScreenProps {
  onOpenSidebar: () => void;
  onOpenProfile: () => void;
  isSidebarOpen?: boolean;
  userName?: string;
  onStartPrompt?: (prompt: string) => void;
}

interface PluginItem {
  id: string;
  title: string;
  category: 'All' | 'Productivity' | 'Developer' | 'Language' | 'Creative';
  description: string;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  iconBg: string;
  iconColor: string;
  tag: string;
  enabled: boolean;
  samplePrompt: string;
}

const CATEGORIES = ['All', 'Productivity', 'Developer', 'Language', 'Creative'] as const;

export const SpaceScreen: React.FC<SpaceScreenProps> = ({
  onOpenSidebar,
  onOpenProfile,
  isSidebarOpen,
  userName = 'David Miller',
  onStartPrompt,
}) => {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<(typeof CATEGORIES)[number]>('All');

  const [plugins, setPlugins] = useState<PluginItem[]>([
    {
      id: 'plug-1',
      title: 'Python Code Sandbox',
      category: 'Developer',
      description: 'Execute scripts, calculate math, and visualize data on the fly.',
      icon: Terminal,
      iconBg: '#F1F5F9',
      iconColor: '#0F172A',
      tag: 'Official',
      enabled: true,
      samplePrompt: 'Write and run a Python script to calculate compound interest over 10 years.',
    },
    {
      id: 'plug-2',
      title: 'Realtime Web Search',
      category: 'Productivity',
      description: 'Fetch the latest web news, documentation, and citations via api.sycord.site.',
      icon: Globe,
      iconBg: '#EFF6FF',
      iconColor: '#2563EB',
      tag: 'Pro',
      enabled: true,
      samplePrompt: 'Search the web for the latest updates on Apple Intelligence and iOS 26 features.',
    },
    {
      id: 'plug-3',
      title: 'PDF & Document Analyzer',
      category: 'Language',
      description: 'Deep document comprehension, table extraction, and chapter summaries.',
      icon: FileText,
      iconBg: '#FDF2F8',
      iconColor: '#DB2777',
      tag: 'Core',
      enabled: true,
      samplePrompt: 'Analyze the attached document and create a 5-point executive summary with action items.',
    },
    {
      id: 'plug-4',
      title: 'AI Image & Diagram Studio',
      category: 'Creative',
      description: 'Generate flowcharts, UI mockups, and illustrations from natural text.',
      icon: Sparkles,
      iconBg: '#FEF3C7',
      iconColor: '#D97706',
      tag: 'Pro',
      enabled: true,
      samplePrompt: 'Generate a mermaid architecture diagram for our iOS client and cloud backend.',
    },
    {
      id: 'plug-5',
      title: 'Interactive Language Tutor',
      category: 'Language',
      description: 'Grammar checking, CEFR B2/C1 vocabulary expansion, and idiom practice.',
      icon: Volume2,
      iconBg: '#ECFDF5',
      iconColor: '#059669',
      tag: 'Core',
      enabled: true,
      samplePrompt: 'Act as my C1 English language tutor. Correct my sentences and explain nuances.',
    },
    {
      id: 'plug-6',
      title: 'Notion & Workspace Sync',
      category: 'Productivity',
      description: 'Sync conversations and study cheat sheets directly into your workspace.',
      icon: Layers,
      iconBg: '#F3E8FF',
      iconColor: '#7C3AED',
      tag: 'Beta',
      enabled: false,
      samplePrompt: 'Export this conversation notes into a structured markdown document.',
    },
  ]);

  const togglePlugin = React.useCallback((id: string) => {
    setPlugins((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
  }, []);

  const filtered = plugins.filter((p) => {
    const matchesCategory =
      selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch =
      !search.trim() ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Unified EvolingoHeader with 58pt top spacing */}
      <View style={{ paddingTop: insets.top + 8 }}>
        <EvolingoHeader
          sidebarOpen={Boolean(isSidebarOpen)}
          onToggleSidebar={onOpenSidebar}
          onOpenProfile={onOpenProfile}
          userName={userName}
        />
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <LiquidGlassSearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Search plugins & space tools…"
        />
      </View>

      {/* Horizontal Category Filter Pills */}
      <View style={styles.filterRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.pill, isSelected && styles.pillSelected]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pillText,
                    isSelected && styles.pillTextSelected,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Plugin Cards List */}
      <FlashList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Installed Space Plugins</Text>
          <Text style={styles.sectionCount}>{filtered.length} available</Text>
        </View>}
        renderItem={({ item }) => <PluginRow item={item} togglePlugin={togglePlugin} onStartPrompt={onStartPrompt} />}
      />
    </View>
  );
};

const PluginRow = React.memo(function PluginRow({item, togglePlugin, onStartPrompt}: { item: PluginItem; togglePlugin: (id: string) => void; onStartPrompt?: SpaceScreenProps["onStartPrompt"] }) {
  const IconComponent = item.icon;
  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <View
          style={[styles.iconBox, { backgroundColor: item.iconBg }]}
        >
          <IconComponent
            size={22}
            color={item.iconColor}
            strokeWidth={1.9}
          />
        </View>

        <View style={styles.cardInfo}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <View style={styles.tagBadge}>
              <Text style={styles.tagText}>{item.tag}</Text>
            </View>
          </View>
          <Text style={styles.cardDesc}>{item.description}</Text>
        </View>

        <Switch
          value={item.enabled}
          onValueChange={() => togglePlugin(item.id)}
          trackColor={{ false: '#E5E5EA', true: '#202127' }}
        />
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.tryButton}
          onPress={() => onStartPrompt?.(item.samplePrompt)}
          activeOpacity={0.7}
        >
          <Text style={styles.tryButtonText}>Try in Chat</Text>
          <ArrowUpRight size={14} color="#2563EB" strokeWidth={2.0} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchWrap: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  filterRow: {
    paddingVertical: 8,
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F2F2F4',
  },
  pillSelected: {
    backgroundColor: '#202127',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  pillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1F',
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    gap: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1F',
  },
  tagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#F4F4F6',
  },
  tagText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#8E8E93',
  },
  cardDesc: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E93',
    lineHeight: 18,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F2F2F4',
    paddingTop: 10,
  },
  tryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  tryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
});
