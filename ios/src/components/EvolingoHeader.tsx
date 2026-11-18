import { SymbolView } from 'expo-symbols';
import { Image } from 'expo-image';
import React from 'react';
import {
  View,
  Platform,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  LayoutGrid,
  ChevronLeft,
  Ellipsis,
} from 'lucide-react-native';
import { EvoTheme } from '../theme/tokens';

interface EvolingoHeaderProps {
  sidebarOpen?: boolean;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onOpenSidebar?: () => void;
  showBackButton?: boolean;
  onBack?: () => void;
  onOpenMenu?: () => void;
  onMorePress?: () => void;
  onOpenProfile?: () => void;
  userName?: string;
  avatarUri?: string | null;
  title?: string;
}

export const EvolingoHeader: React.FC<EvolingoHeaderProps> = ({
  sidebarOpen = false,
  isSidebarOpen,
  onToggleSidebar,
  onOpenSidebar,
  showBackButton,
  onBack,
  onOpenMenu,
  onMorePress,
  onOpenProfile,
  userName = 'Evolingo',
  avatarUri,
  title,
}) => {
  const effectiveSidebarOpen = isSidebarOpen ?? sidebarOpen;
  const effectiveToggleSidebar = onToggleSidebar ?? onOpenSidebar ?? (() => {});
  const effectiveOpenMenu = onOpenMenu ?? onMorePress;
  const initials =
    userName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || '')
      .join('') || 'EV';

  const handleLeftPress = () => {
    if (onBack && (showBackButton ?? !effectiveSidebarOpen)) {
      onBack();
    } else {
      effectiveToggleSidebar();
    }
  };

  const showChevron =
    effectiveSidebarOpen || (showBackButton ?? Boolean(onBack));

  return (
    <View style={styles.container}>
      {/* Left 44pt floating white circular button */}
      <TouchableOpacity
        style={styles.leftCircleButton}
        onPress={handleLeftPress}
        activeOpacity={0.72}
        accessibilityRole="button"
        accessibilityLabel={
          showChevron ? 'Vissza vagy oldalsáv bezárása' : 'Oldalsáv megnyitása'
        }
      >
        {Platform.OS === 'ios' ? (
          <SymbolView name={showChevron ? "chevron.left" : "square.grid.2x2"} size={20} tintColor={EvoTheme.colors.ink} />
        ) : showChevron ? (
          <ChevronLeft size={21} color={EvoTheme.colors.ink} strokeWidth={1.9} />
        ) : (
          <LayoutGrid size={20} color={EvoTheme.colors.ink} strokeWidth={1.85} />
        )}
      </TouchableOpacity>

      {title ? (
        <Text style={styles.centerTitle} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View style={styles.spacer} />
      )}

      {/* Right combined capsule (~90x44pt): Ellipsis (...) + circular profile avatar */}
      <View style={[styles.rightCapsule, !effectiveOpenMenu && styles.profileOnly]}>
        {effectiveOpenMenu && (
          <TouchableOpacity
            style={styles.ellipsisHit}
            onPress={effectiveOpenMenu}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Képernyő műveletek"
          >
            {Platform.OS === 'ios' ? <SymbolView name="ellipsis" size={19} tintColor={EvoTheme.colors.ink} /> : <Ellipsis size={19} color={EvoTheme.colors.ink} strokeWidth={2} />}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.avatarHit}
          onPress={onOpenProfile}
          activeOpacity={0.78}
          accessibilityRole="button"
          accessibilityLabel="Profil és beállítások megnyitása"
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} contentFit="cover" cachePolicy="memory-disk" transition={120} />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 54,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    zIndex: 20,
  },
  leftCircleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: EvoTheme.colors.glassFill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: EvoTheme.colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  spacer: {
    flex: 1,
  },
  centerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: EvoTheme.colors.ink,
    marginHorizontal: 12,
  },
  rightCapsule: {
    height: 44,
    minWidth: 90,
    borderRadius: 22,
    paddingLeft: 4,
    paddingRight: 5,
    backgroundColor: EvoTheme.colors.glassFill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: EvoTheme.colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  profileOnly: {
    minWidth: 44,
    paddingHorizontal: 0,
  },
  ellipsisHit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: EvoTheme.colors.action,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarInitials: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
