import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  Camera,
  Bell,
  Sparkles,
  ShieldCheck,
  Cpu,
  Database,
  Info,
  Check,
  Volume2,
  Trash2,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EvoTheme } from '../theme/tokens';

interface ProfileScreenProps {
  onBack: () => void;
  photoUri?: string;
  onChangePhoto: (uri: string) => void;
  hapticsEnabled: boolean;
  onChangeHaptics: (value: boolean) => void;
  userName?: string;
  onUpdateUserName?: (name: string) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onBack,
  photoUri,
  onChangePhoto,
  userName = 'David Miller',
  onUpdateUserName,
  hapticsEnabled,
  onChangeHaptics,
}) => {
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState(userName);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleEditName = () => {
    Alert.prompt
      ? Alert.prompt(
          'Edit Display Name',
          'Enter your new profile name:',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Save',
              onPress: (text?: string) => {
                if (text && text.trim()) {
                  setDisplayName(text.trim());
                  onUpdateUserName?.(text.trim());
                }
              },
            },
          ],
          'plain-text',
          displayName
        )
      : Alert.alert('Edit Name', 'Profile name updated to: ' + displayName);
  };

  const chooseProfilePhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled) onChangePhoto(result.assets[0].uri);
    } catch {
      Alert.alert('Photo unavailable', 'Try choosing the photo again.');
    }
  };

  const handleClearCache = () => {
    Alert.alert('Clear image cache?', 'Images will be reloaded when needed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear Cache',
        style: 'destructive',
        onPress: async () => {
          try {
            if (!(await Image.clearDiskCache())) throw new Error('Cache unavailable');
            await Image.clearMemoryCache();
            Alert.alert('Image cache cleared');
          } catch {
            Alert.alert('Could not clear the image cache', 'Try again.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Top Header with Back Navigation */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 58) }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Back to chat"
        >
          <ChevronLeft size={24} color={EvoTheme.colors.ink} strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile & Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 24, 40) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* User Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              {photoUri ? (
                <Image source={photoUri} style={styles.avatar} contentFit="cover" cachePolicy="memory-disk" transition={120} />
              ) : (
              <Text style={styles.avatarInitials}>
                {displayName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase() || 'DM'}
              </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.cameraBadge}
              onPress={chooseProfilePhoto}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Choose profile photo"
              activeOpacity={0.8}
            >
              <Camera size={13} color="#FFFFFF" strokeWidth={2.0} />
            </TouchableOpacity>
          </View>

          <View style={styles.heroInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.heroName}>{displayName}</Text>
              <TouchableOpacity onPress={handleEditName} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.heroEmail}>david.miller@evolingo.ai</Text>
            <View style={styles.proBadge}>
              <Sparkles size={11} color="#2563EB" strokeWidth={2.2} />
              <Text style={styles.proBadgeText}>PRO MEMBER</Text>
            </View>
          </View>
        </View>

        {/* Section: Account & Subscription */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ACCOUNT</Text>
          <View style={styles.groupedCard}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Membership</Text>
              <View style={styles.rowValuePill}>
                <Text style={styles.rowValuePillText}>Active · Evolingo Pro</Text>
              </View>
            </View>
            <View style={styles.separator} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Sync Status</Text>
              <View style={styles.statusIndicator}>
                <View style={styles.greenDot} />
                <Text style={styles.rowSubLabel}>On-Device & Cloud</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section: Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>PREFERENCES</Text>
          <View style={styles.groupedCard}>
            <View style={styles.row}>
              <View style={styles.rowIconLabel}>
                <View style={[styles.iconBox, { backgroundColor: '#E8F2FF' }]}>
                  <Bell size={18} color="#2563EB" strokeWidth={1.9} />
                </View>
                <View>
                  <Text style={styles.rowLabel}>Push Notifications</Text>
                  <Text style={styles.rowSubLabel}>Task alerts & agent updates</Text>
                </View>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#E5E5EA', true: '#202127' }}
              />
            </View>
            <View style={styles.separator} />
            <View style={styles.row}>
              <View style={styles.rowIconLabel}>
                <View style={[styles.iconBox, { backgroundColor: '#F3F0FF' }]}>
                  <ShieldCheck size={18} color="#7C3AED" strokeWidth={1.9} />
                </View>
                <View>
                  <Text style={styles.rowLabel}>Haptic Feedback</Text>
                  <Text style={styles.rowSubLabel}>Tactile feedback on interactions</Text>
                </View>
              </View>
              <Switch
                value={hapticsEnabled}
                onValueChange={onChangeHaptics}
                trackColor={{ false: '#E5E5EA', true: '#202127' }}
              />
            </View>
            <View style={styles.separator} />
            <View style={styles.row}>
              <View style={styles.rowIconLabel}>
                <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
                  <Volume2 size={18} color="#059669" strokeWidth={1.9} />
                </View>
                <View>
                  <Text style={styles.rowLabel}>Sound Effects</Text>
                  <Text style={styles.rowSubLabel}>Audio feedback when messages arrive</Text>
                </View>
              </View>
              <Switch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{ false: '#E5E5EA', true: '#202127' }}
              />
            </View>
          </View>
        </View>

        {/* Section: AI Connectivity */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>AI CONNECTIVITY</Text>
          <View style={styles.groupedCard}>
            <View style={styles.row}>
              <View style={styles.rowIconLabel}>
                <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
                  <Cpu size={18} color="#D97706" strokeWidth={1.9} />
                </View>
                <View>
                  <Text style={styles.rowLabel}>API Gateway</Text>
                  <Text style={styles.rowSubLabel}>api.sycord.site (Online)</Text>
                </View>
              </View>
              <View style={styles.onlineBadge}>
                <View style={styles.greenDot} />
                <Text style={styles.onlineText}>Connected</Text>
              </View>
            </View>
            <View style={styles.separator} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Default Mode</Text>
              <Text style={styles.rowValueText}>Tutor (GPT-4o Adaptive)</Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Offline Fallback</Text>
              <Text style={styles.rowValueText}>Apple Foundation Model</Text>
            </View>
          </View>
        </View>

        {/* Section: Storage & Data */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>STORAGE & DATA</Text>
          <View style={styles.groupedCard}>
            <View style={styles.row}>
              <View style={styles.rowIconLabel}>
                <View style={[styles.iconBox, { backgroundColor: '#F1F5F9' }]}>
                  <Database size={18} color="#475569" strokeWidth={1.9} />
                </View>
                <View>
                  <Text style={styles.rowLabel}>Image Storage</Text>
                </View>
              </View>
            </View>
            <View style={styles.separator} />
            <TouchableOpacity style={styles.rowButton} onPress={handleClearCache}>
              <Trash2 size={17} color="#DC2626" strokeWidth={1.9} />
              <Text style={styles.destructiveButtonText}>Clear Image Cache</Text>
            </TouchableOpacity>

          </View>
        </View>

        {/* Section: App Information */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ABOUT</Text>
          <View style={styles.groupedCard}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Evolingo Version</Text>
              <Text style={styles.rowValueText}>1.1 (Build 76)</Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Engine</Text>
              <Text style={styles.rowValueText}>React Native + Native iOS Bridge</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#F2F2F7',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1F',
  },
  headerSpacer: {
    width: 44,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 20,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#202127',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  heroInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1F',
  },
  editLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  heroEmail: {
    fontSize: 13.5,
    fontWeight: '400',
    color: '#8E8E93',
    marginTop: 2,
    marginBottom: 6,
  },
  proBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  section: {
    gap: 6,
  },
  sectionHeader: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#8E8E93',
    paddingHorizontal: 12,
    letterSpacing: 0.4,
  },
  groupedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowIconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: 15.5,
    fontWeight: '600',
    color: '#1C1C1F',
  },
  rowSubLabel: {
    fontSize: 12.5,
    fontWeight: '400',
    color: '#8E8E93',
    marginTop: 1,
  },
  rowValueText: {
    fontSize: 14.5,
    fontWeight: '500',
    color: '#8E8E93',
  },
  rowValuePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F4F4F6',
  },
  rowValuePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1F',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
  },
  onlineText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#16A34A',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginLeft: 16,
  },
  rowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  destructiveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#DC2626',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1F',
  },
});
