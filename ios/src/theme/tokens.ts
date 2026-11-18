export const EvoTheme = {
  colors: {
    canvas: '#FFFFFF',
    surface: '#F5F5F7',
    surfaceAlt: '#F4F4F6',
    surfacePressed: '#EAEAEE',
    sidebarSelected: '#F3F3F5',
    ink: '#1C1C1F',
    inkSoft: '#25252A',
    secondary: '#8D8D93',
    tertiary: '#B5B5BB',
    line: '#E6E6EA',
    lineStrong: '#D1D1D6',
    action: '#24262E',
    actionPressed: '#1A1C22',
    onAction: '#FFFFFF',
    link: '#24262E',
    chatBluePill: '#3265EB',
    success: '#34C759',
    danger: '#FF3B30',
    messageUser: '#F2F2F4',
    glassFill: 'rgba(255, 255, 255, 0.90)',
    glassBorder: 'rgba(230, 230, 234, 0.85)',
    ambientGradient: ['#FFFFFF', '#E6EEF7', '#B7C8DE', '#A8BDD9'] as const,
  },
  typography: {
    assistantText: 16,
    userText: 16,
    lineHeight: 24,
    sidebarTitle: 26,
    sidebarNav: 17,
    sectionHeader: 14,
    cardTitle: 16,
    secondaryLabel: 13,
    composerText: 16,
    actionIcon: 19,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    turn: 26,
  },
  radius: {
    userBubble: 22,
    composerIdle: 29,
    composerFocused: 24,
    searchField: 18,
    card: 22,
    tile: 16,
    sheet: 26,
    layer: 28,
    pill: 999,
  },
  layout: {
    touchTarget: 44,
    sidebarNavRowHeight: 48,
    actionIconGap: 18,
    horizontalPadding: 20,
  },
};

export const Colors = {
  background: EvoTheme.colors.canvas,
  surfaceWhite: EvoTheme.colors.canvas,
  surfaceInput: EvoTheme.colors.surfaceAlt,
  iconTileBg: EvoTheme.colors.surface,
  textPrimary: EvoTheme.colors.ink,
  textSecondary: EvoTheme.colors.secondary,
  textMuted: EvoTheme.colors.tertiary,
  borderSubtle: EvoTheme.colors.line,
  primaryDark: EvoTheme.colors.action,
  progressTrack: '#ECECEF',
  progressFill: EvoTheme.colors.action,
};

export const Radii = {
  pill: 999,
  card: EvoTheme.radius.card,
  iconTile: EvoTheme.radius.tile,
  foregroundSheet: EvoTheme.radius.layer,
};

export const Layout = {
  screenHorizontalPadding: EvoTheme.layout.horizontalPadding,
  composerHorizontalMargin: 16,
  minTapTarget: EvoTheme.layout.touchTarget,
};

export const Typography = {
  sectionHeading: {
    fontSize: 16.5,
    fontWeight: '600' as const,
    color: EvoTheme.colors.ink,
  },
  cardTitle: {
    fontSize: EvoTheme.typography.cardTitle,
    fontWeight: '600' as const,
    color: EvoTheme.colors.ink,
  },
  secondaryLabel: {
    fontSize: EvoTheme.typography.secondaryLabel,
    fontWeight: '400' as const,
    color: EvoTheme.colors.secondary,
  },
};

export const Shadows = {
  floatingControl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
};
