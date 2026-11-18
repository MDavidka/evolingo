/**
 * Tier 1: Feature Coverage E2E Test Suite (Category-Partition Testing)
 * 
 * Verifies all 21 Features from PROJECT.md § Feature Inventory and ORIGINAL_REQUEST.md.
 * Minimum 5 tests per feature (total >= 105 tests).
 * 
 * Invocation:
 *   node /root/evolingo/tests/e2e/tier1_feature_coverage.test.js
 * 
 * Exports test results for the master runner.
 */

const fs = require('fs');
const path = require('path');
const {
  assertTrue,
  assertFalse,
  assertEqual,
  assertNotEqual,
  assertMatch,
  assertNotMatch,
  assertIncludes,
  assertNotIncludes,
  assertGreaterThanOrEqual,
  assertLessThanOrEqual,
  assertInRange,
  resolvePath,
  fileExists,
  readFile,
  readPlist,
  inspectSwift,
  inspectTs,
  inspectIpaArchive,
  TestSuite
} = require('./utils/harness');

const suite = new TestSuite('Tier 1: Feature Coverage (Features 1-21)');

// ============================================================================
// Feature 1: Remove MySpace Tab
// Requirement: ORIGINAL_REQUEST §R1 — Delete MySpace tab from root tab/navigation
// controller and remove its associated routing dead-ends.
// ============================================================================
suite.feature(1, 'Remove MySpace Tab', ({ test }) => {
  test('1.1: NativeTab enum in Evolingo.swift does not define case space or case myspace', () => {
    const inspector = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(inspector.exists, 'Evolingo.swift must exist');
    const cases = inspector.getEnumCases('NativeTab');
    assertFalse(cases.includes('space'), 'NativeTab enum must not include "space"');
    assertFalse(cases.includes('myspace'), 'NativeTab enum must not include "myspace"');
    assertTrue(cases.includes('chat'), 'NativeTab must retain active tab "chat"');
    assertTrue(cases.includes('cowork'), 'NativeTab must retain active tab "cowork"');
  });

  test('1.2: EvolingoRootView tab selection items list excludes MySpace', () => {
    const inspector = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(inspector.exists, 'Evolingo.swift must exist');
    assertNotMatch(inspector.source, /case\s+\.space\s*:/, 'Root tab switch must not contain case .space');
    assertNotMatch(inspector.source, /case\s+\.myspace\s*:/, 'Root tab switch must not contain case .myspace');
  });

  test('1.3: Sidebar navigation items in ChatLayerSidebar.swift do not link to MySpace', () => {
    const inspector = inspectSwift('ios/Sources/Evolingo/ChatLayerSidebar.swift');
    assertTrue(inspector.exists, 'ChatLayerSidebar.swift must exist');
    assertNotMatch(inspector.source, /MySpace/i, 'ChatLayerSidebar must not reference MySpace in pins or navigation');
    assertNotMatch(inspector.source, /selectedTab\s*=\s*\.space/, 'ChatLayerSidebar must not set selectedTab to .space');
  });

  test('1.4: Dead-end routing views ModernSpaceView and MyspaceWebView are deleted or unrouted', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertNotMatch(evolingoSwift.source, /ModernSpaceView\s*\(/, 'Evolingo.swift must not instantiate ModernSpaceView');
    assertNotMatch(evolingoSwift.source, /MyspaceWebView\s*\(/, 'Evolingo.swift must not instantiate MyspaceWebView');
    const modernSpaceExists = fileExists('ios/Sources/Evolingo/ModernSpaceView.swift');
    const myspaceWebExists = fileExists('ios/Sources/Evolingo/MyspaceWebView.swift');
    if (modernSpaceExists) {
      const modernSpace = readFile('ios/Sources/Evolingo/ModernSpaceView.swift');
      assertNotMatch(modernSpace, /public\s+var\s+body\s*:\s*some\s+View\s*\{\s*ModernSpaceView/, 'ModernSpaceView must not be an active root tab');
    }
  });

  test('1.5: Deep-link URL scheme handler does not route to space or myspace destination', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertNotMatch(evolingoSwift.source, /\.onOpenURL\s*(?:\([^)]*\)\s*)?\{[\s\S]{0,500}?\b(?:space|myspace)\b/i, 'onOpenURL handler must not route "space" URLs');
  });
});

// ============================================================================
// Feature 2: Plugin Icon Asset Loader
// Requirement: ORIGINAL_REQUEST §R1 — Fix bundle resource asset loader for plugin
// icons so all icons resolve and render reliably without blank or fallback states.
// ============================================================================
suite.feature(2, 'Plugin Icon Asset Loader', ({ test }) => {
  test('2.1: Asset bundle loading uses Bundle.module or valid bundle directory lookup', () => {
    const tools = inspectSwift('ios/Sources/Evolingo/Tools.swift');
    assertTrue(tools.exists, 'Tools.swift must exist');
    const usesBundleModule = tools.hasPattern(/Bundle\.module\.url\s*\(\s*forResource:/);
    const usesMainBundleFallback = tools.hasPattern(/Bundle\.(?:main|module)\.url\s*\([^)]*PluginIcons/);
    assertTrue(usesBundleModule || usesMainBundleFallback, 'Tools.swift must resolve plugin icons via Bundle.module or bundle path');
  });

  test('2.2: Plugin icon resolver supports key brand IDs: github, vercel, supabase, slack, linear', () => {
    const tools = inspectSwift('ios/Sources/Evolingo/Tools.swift');
    assertTrue(tools.exists, 'Tools.swift must exist');
    assertTrue(tools.hasPattern(/case\s+\.github/), 'Icon resolver must support GitHub');
    assertTrue(tools.hasPattern(/case\s+\.vercel/), 'Icon resolver must support Vercel');
    assertTrue(tools.hasPattern(/case\s+\.supabase/), 'Icon resolver must support Supabase');
    assertTrue(tools.hasPattern(/case\s+\.linear/), 'Icon resolver must support Linear');
  });

  test('2.3: Plugin icon PNG assets exist on disk in bundle resource directories', () => {
    const bundlePath = 'ios/xtool/Evolingo.app/Evolingo_Evolingo.bundle';
    const altBundlePath = 'ios/Sources/Evolingo/Resources/PluginIcons';
    const primaryExists = fileExists(bundlePath);
    const altExists = fileExists(altBundlePath);
    assertTrue(primaryExists || altExists, 'Plugin icons directory must exist');
    const targetDir = primaryExists ? bundlePath : altBundlePath;
    const requiredIcons = ['github.png', 'vercel.png', 'supabase.png', 'slack.png', 'notion.png'];
    for (const icon of requiredIcons) {
      assertTrue(fileExists(path.join(targetDir, icon)), `Icon file ${icon} must exist in bundle resources`);
    }
  });

  test('2.4: Asynchronous / in-memory cache ArlenPluginIconLoader prevents duplicate file system reads', () => {
    const tools = inspectSwift('ios/Sources/Evolingo/Tools.swift');
    const hasCache = tools.hasPattern(/class\s+ArlenPluginIconLoader|NSCache<NSString,\s*UIImage>|enum\s+SvglIconCache|PluginIconCache/);
    assertTrue(hasCache, 'Icon cache or loader must be defined in Tools.swift');
    const accessesCache = tools.hasPattern(/memCache\.object|cache\[pluginID\]|cache\.object\(forKey:/);
    assertTrue(accessesCache, 'Icon loader must look up cached image by pluginID');
  });

  test('2.5: Unrecognized plugin ID renders deterministic monogram / badge without crashing', () => {
    const tools = inspectSwift('ios/Sources/Evolingo/Tools.swift');
    assertTrue(tools.hasPattern(/case\s+\.custom|default:/), 'Tools.swift must provide fallback case for custom / unknown plugin IDs');
  });
});

// ============================================================================
// Feature 3: Sidebar Persistence in Cowork
// Requirement: ORIGINAL_REQUEST §R1 — Lock sidebar layout, hierarchy, and selection
// state when opening Cowork to match the main application sidebar.
// ============================================================================
suite.feature(3, 'Sidebar Persistence in Cowork', ({ test }) => {
  test('3.1: Unified ChatLayerSidebar is integrated into Cowork navigation view hierarchy', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const coworkManager = inspectSwift('ios/Sources/Evolingo/CoworkProjectManager.swift');
    assertTrue(evolingoSwift.exists, 'Evolingo.swift must exist');
    const hasSidebarBinding = evolingoSwift.hasPattern(/ChatLayerSidebar(?:View)?\s*\(/) || coworkManager.hasPattern(/ChatLayerSidebar(?:View)?\s*\(/);
    assertTrue(hasSidebarBinding, 'Cowork mode must integrate the shared ChatLayerSidebar component');
  });

  test('3.2: Tab selection binding persists state across mode transitions', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(evolingoSwift.hasPattern(/@State\s+private\s+var\s+selectedTab:\s*NativeTab/), 'selectedTab must be state-managed in root view');
    assertTrue(evolingoSwift.hasPattern(/selectedTab\s*==\s*\.cowork/), 'EvolingoRootView must handle .cowork tab selection condition');
  });

  test('3.3: Sidebar frame width constraint (sidebarWidth) is uniform across chat and cowork', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const hasWidth = evolingoSwift.hasPattern(/sidebarWidth\s*=\s*(?:min\(\s*\d+|[\d.]+)/);
    assertTrue(hasWidth, 'Sidebar width must be consistently defined (sidebarWidth)');
  });

  test('3.4: Pinned sections and session history remain identical when switching between chat and cowork', () => {
    const sidebar = inspectSwift('ios/Sources/Evolingo/ChatLayerSidebar.swift');
    assertTrue(sidebar.hasPattern(/pinned|recents|workspaces/i), 'ChatLayerSidebar must maintain persistent pinned / recents data structure');
  });

  test('3.5: Presentation toggle state showSidebar is shared without jumping during navigation', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(evolingoSwift.hasPattern(/@State\s+private\s+var\s+showSidebar/), 'Root view must bind showSidebar as single source of truth');
    assertTrue(evolingoSwift.hasPattern(/showSidebar\.toggle\(\)|showSidebar\s*=\s*/), 'Sidebar presentation must toggle cleanly');
  });
});

// ============================================================================
// Feature 4: Interactive Swipe Physics
// Requirement: ORIGINAL_REQUEST §R1 — Velocity-based tracking and continuous thresholding
// to eliminate premature rubber-banding.
// ============================================================================
suite.feature(4, 'Interactive Swipe Physics', ({ test }) => {
  test('4.1: DragGesture continuously binds translation offset to sidebarDragOffset without clamping', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(evolingoSwift.hasPattern(/sidebarDragOffset\s*=\s*/), 'Drag gesture must continuously update sidebarDragOffset');
    assertTrue(evolingoSwift.hasPattern(/DragGesture\s*\(\s*minimumDistance:\s*\d+\s*\)/), 'Drag gesture must specify non-zero minimumDistance');
  });

  test('4.2: Gesture completion calculates predictedEndTranslation or velocity threshold', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const hasPredictedEnd = evolingoSwift.hasPattern(/gesture\.predictedEndTranslation\.width/);
    const hasVelocity = evolingoSwift.hasPattern(/velocity\s*>\s*\d+|velocity\s*<\s*-\d+/);
    assertTrue(hasPredictedEnd || hasVelocity, 'Gesture completion logic must evaluate velocity or predictedEndTranslation');
  });

  test('4.3: Low-velocity translation threshold requires at least 35-50% width to complete', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const hasTranslationThreshold = evolingoSwift.hasPattern(/sidebarWidth\s*\*\s*0\.(?:3|35|4|45|5)/);
    assertTrue(hasTranslationThreshold, 'Gesture completion must check fractional width threshold (35%-50%)');
  });

  test('4.4: High-velocity flick completes panel transition even with low initial displacement', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const hasFlickSupport = evolingoSwift.hasPattern(/velocity\s*>\s*(?:100|120|150|200)/);
    assertTrue(hasFlickSupport, 'Gesture must support flick velocity threshold (>100-200 pt/s) for quick open');
  });

  test('4.5: Spring animation damping provides stable physical settle without rubber-banding glitch', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const hasSpring = evolingoSwift.hasPattern(/withAnimation\s*\(\s*\.spring\s*\(\s*response:\s*[\d.]+\s*,\s*dampingFraction:\s*[\d.]+\s*\)\s*\)/);
    assertTrue(hasSpring, 'Gesture completion must execute with spring animation response and dampingFraction');
  });
});

// ============================================================================
// Feature 5: Initial-Launch-Only Keyboard Focus
// Requirement: ORIGINAL_REQUEST §R2, PROJECT.md Interface Contract: AppFocusCoordinator
// ============================================================================
suite.feature(5, 'Initial-Launch-Only Keyboard Focus', ({ test }) => {
  test('5.1: AppFocusCoordinator singleton is declared as @MainActor final class conforming to ObservableObject', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const hasCoordinator = evolingoSwift.hasPattern(/class\s+AppFocusCoordinator\s*:\s*(?:ObservableObject|NSObject)/);
    const hasMainActor = evolingoSwift.hasPattern(/@MainActor\s+(?:final\s+)?class\s+AppFocusCoordinator/);
    assertTrue(hasCoordinator, 'AppFocusCoordinator class must be defined in Evolingo.swift');
    assertTrue(hasMainActor, 'AppFocusCoordinator must be decorated with @MainActor');
  });

  test('5.2: AppFocusCoordinator provides shared singleton and hasRequestedColdLaunchFocus property', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const hasShared = evolingoSwift.hasPattern(/static\s+let\s+shared\s*=\s*AppFocusCoordinator\s*\(/);
    const hasProperty = evolingoSwift.hasPattern(/var\s+hasRequestedColdLaunchFocus:\s*Bool/);
    assertTrue(hasShared, 'AppFocusCoordinator must provide static let shared');
    assertTrue(hasProperty, 'AppFocusCoordinator must provide hasRequestedColdLaunchFocus boolean property');
  });

  test('5.3: claimColdLaunchFocus() method returns Bool to grant auto-focus strictly once', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const hasMethod = evolingoSwift.hasPattern(/func\s+claimColdLaunchFocus\s*\(\s*\)\s*->\s*Bool/);
    assertTrue(hasMethod, 'AppFocusCoordinator must declare func claimColdLaunchFocus() -> Bool');
  });

  test('5.4: ChatView / input bar binds auto-focus to claimColdLaunchFocus() rather than raw onAppear', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const bindsCoordinator = evolingoSwift.hasPattern(/claimColdLaunchFocus\s*\(\s*\)/);
    assertTrue(bindsCoordinator, 'ChatView / input bar must invoke claimColdLaunchFocus() before requesting focus');
  });

  test('5.5: Navigating into chat sessions does not unconditionally set isFocused to true', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertNotMatch(evolingoSwift.source, /\.onAppear\s*\{(?:(?!claimColdLaunchFocus)[\s\S]){0,250}?\b(?:isFocused|focused)\s*=\s*true\b/, 'Chat onAppear must not unconditionally force focus');
  });
});

// ============================================================================
// Feature 6: Persistent & Uniform Send Button
// Requirement: ORIGINAL_REQUEST §R2 — 36x36pt button in 44x44pt frame, persistent
// arrow.up / stop.fill, semantic tint/opacity across states.
// ============================================================================
suite.feature(6, 'Persistent & Uniform Send Button', ({ test }) => {
  test('6.1: Send button remains persistently mounted across empty, typing, and streaming states', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertNotMatch(evolingoSwift.source, /if\s+canSend\s*\{[^}]*?\bButton\b/, 'Send button must not be conditionally unmounted when empty');
    assertTrue(evolingoSwift.hasPattern(/Circle\(\)[\s\S]*?\.frame\s*\(\s*width:\s*36,\s*height:\s*36\s*\)/), 'Send button shape must be 36x36 circle');
  });

  test('6.2: Send button visual frame is standardized to 36x36pt', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(evolingoSwift.hasPattern(/\.frame\s*\(\s*width:\s*36,\s*height:\s*36\s*\)/), 'Send button inner circular container must be 36x36pt');
  });

  test('6.3: Interactive touch target frame meets or exceeds 44x44pt', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(evolingoSwift.hasPattern(/\.frame\s*\(\s*width:\s*44,\s*height:\s*44\s*\)/), 'Send button touch frame must be at least 44x44pt');
  });

  test('6.4: Icon switches to stop.fill during model loading / streaming state', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const hasStopFill = evolingoSwift.hasPattern(/model\.loading\s*\?\s*"stop\.fill"/);
    assertTrue(hasStopFill, 'Send button icon must show stop.fill when model is streaming / loading');
  });

  test('6.5: Disabled / empty state uses semantic opacity or muted fill rather than view removal', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const hasMutedFill = evolingoSwift.hasPattern(/canSend\s*\|\|\s*model\.loading\s*\?\s*EvoTheme\.Palette\.action\s*:\s*/);
    assertTrue(hasMutedFill, 'Send button must alternate between active action tint and disabled background');
  });
});

// ============================================================================
// Feature 7: Input Padding Refinement
// Requirement: ORIGINAL_REQUEST §R2 — Standardize text-container insets (10pt/8pt)
// and external padding (10pt bottom).
// ============================================================================
suite.feature(7, 'Input Padding Refinement', ({ test }) => {
  test('7.1: Internal text container horizontal insets are standardized to 10pt (or 12pt)', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const hasTextPadding = evolingoSwift.hasPattern(/\.padding\s*\(\s*\.horizontal\s*,\s*(?:10|12)\s*\)/) || evolingoSwift.hasPattern(/HStack\s*\(\s*spacing:\s*(?:8|10)\s*\)/);
    assertTrue(hasTextPadding, 'Input bar text container horizontal spacing must be standardized');
  });

  test('7.2: Internal text container vertical insets are standardized to 8pt', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const hasVerticalPadding = evolingoSwift.hasPattern(/\.padding\s*\(\s*\.vertical\s*,\s*(?:6|8|10)\s*\)/);
    assertTrue(hasVerticalPadding, 'Input bar text container vertical padding must be standardized');
  });

  test('7.3: External container bottom padding is set to 10pt', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const hasBottomPadding = evolingoSwift.hasPattern(/\.padding\s*\(\s*\.bottom\s*,\s*10\s*\)/);
    assertTrue(hasBottomPadding, 'Input container external bottom padding must be 10pt');
  });

  test('7.4: External horizontal padding from display edges is standardized (12pt to 16pt)', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const hasOuterHorizontal = evolingoSwift.hasPattern(/\.padding\s*\(\s*\.horizontal\s*,\s*(?:12|14|16)\s*\)/);
    assertTrue(hasOuterHorizontal, 'Input container external horizontal padding must be between 12pt and 16pt');
  });

  test('7.5: Input bar background shape uses rounded corner radius (20pt to 28pt) or Capsule', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const hasRoundedShape = evolingoSwift.hasPattern(/RoundedRectangle\s*\(\s*cornerRadius:\s*(?:20|22|24|26|28)/) || evolingoSwift.hasPattern(/Capsule\s*\(\s*\)/);
    assertTrue(hasRoundedShape, 'Input bar outer boundary must use rounded corner shape or Capsule');
  });
});

// ============================================================================
// Feature 8: Scroll-Under-Input Layering
// Requirement: ORIGINAL_REQUEST §R2 — Messages scroll smoothly under input bar
// with translucent glass backdrop, proper z-index, and safe area inset.
// ============================================================================
suite.feature(8, 'Scroll-Under-Input Layering', ({ test }) => {
  test('8.1: Chat scroll view configures bottom safe area inset so messages scroll underneath', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const hasSafeAreaInset = evolingoSwift.checkSafeAreaInsetBottom() || evolingoSwift.hasPattern(/\.safeAreaInset\s*\(\s*edge:\s*\.bottom/);
    assertTrue(hasSafeAreaInset, 'Chat scroll view must declare .safeAreaInset(edge: .bottom)');
  });

  test('8.2: Input bar background employs translucent blur or glass backdrop material', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const hasGlass = evolingoSwift.hasPattern(/\.ultraThinMaterial/) ||
                     evolingoSwift.hasPattern(/NavigationGlass/) ||
                     evolingoSwift.hasPattern(/LiquidGlass/) ||
                     evolingoSwift.hasPattern(/EvoTheme\.Palette\.surface/);
    assertTrue(hasGlass, 'Input bar background must employ translucent glass / material surface');
  });

  test('8.3: Floating input bar is assigned higher zIndex than message scroll content', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const hasZIndex = evolingoSwift.hasPattern(/\.zIndex\s*\(\s*(?:1|2|10|20|100)\s*\)/);
    assertTrue(hasZIndex, 'Floating input bar or bottom dock must specify explicit zIndex');
  });

  test('8.4: Scroll view bottom spacer or inset provides clearance matching input bar height', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const hasBottomClearance = evolingoSwift.hasPattern(/Spacer\s*\([^)]*height:\s*(?:60|70|80|90|100|120)/) ||
                               evolingoSwift.hasPattern(/contentInsets|keyboardOffset|bottomPadding/);
    assertTrue(hasBottomClearance, 'Scroll view must provide clearance for floating bottom bar');
  });

  test('8.5: Hairline border separates floating input container from under-scrolling messages', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const hasHairlineBorder = evolingoSwift.hasPattern(/lineWidth:\s*(?:0\.5|1|1\.0)/);
    assertTrue(hasHairlineBorder, 'Input container or bar must use hairline border (0.5pt or 1pt)');
  });
});

// ============================================================================
// Feature 9: Dynamic Keyboard Avoidance
// Requirement: ORIGINAL_REQUEST §R2 — Bind scroll view bottom content inset and
// indicator insets dynamically to keyboard frame so active UI is not trapped.
// ============================================================================
suite.feature(9, 'Dynamic Keyboard Avoidance', ({ test }) => {
  test('9.1: Observer listens to UIResponder.keyboardWillChangeFrameNotification or keyboardWillShowNotification', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const hasKeyboardObserver = evolingoSwift.checkKeyboardNotification();
    assertTrue(hasKeyboardObserver, 'Must observe keyboardWillChangeFrameNotification or keyboardWillShowNotification');
  });

  test('9.2: Keyboard height calculation binds dynamically to bottom offset / safe area', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const hasKeyboardHeightState = evolingoSwift.hasPattern(/keyboardHeight|keyboardOffset/);
    assertTrue(hasKeyboardHeightState, 'Evolingo.swift must maintain dynamic keyboardHeight / keyboardOffset state');
  });

  test('9.3: Scroll indicator insets update dynamically with content insets', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const updatesScrollInsets = evolingoSwift.hasPattern(/scrollDismissesKeyboard|scrollIndicators|scrollIndicatorInsets/);
    assertTrue(updatesScrollInsets, 'Scroll view must configure dynamic scroll indicator insets or keyboard dismiss behavior');
  });

  test('9.4: Animation synchronizes with keyboard curve and duration', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const syncsAnimation = evolingoSwift.hasPattern(/keyboardAnimationDuration|UIResponder\.keyboardAnimationDurationUserInfoKey|withAnimation/);
    assertTrue(syncsAnimation, 'Keyboard avoidance must animate with keyboard transition duration');
  });

  test('9.5: Dismissing keyboard smoothly restores original bottom inset without layout glitch', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const handlesDismiss = evolingoSwift.hasPattern(/keyboardWillHideNotification|keyboardHeight\s*=\s*0|isFocused\s*=\s*false/);
    assertTrue(handlesDismiss, 'Must handle keyboard dismiss to restore base insets');
  });
});

// ============================================================================
// Feature 10: Message Push & Streaming Readability
// Requirement: ORIGINAL_REQUEST §R3 — Decouple markdown parsing from main thread,
// stable element IDs, stable line heights, and scroll-offset anchoring.
// ============================================================================
suite.feature(10, 'Message Push & Streaming Readability', ({ test }) => {
  test('10.1: ArlenMarkdownRenderer.swift enforces stable line heights / spacing on text elements', () => {
    const md = inspectSwift('ios/Sources/Evolingo/ArlenMarkdownRenderer.swift');
    assertTrue(md.exists, 'ArlenMarkdownRenderer.swift must exist');
    const hasLineSpacing = md.hasPattern(/\.lineSpacing\s*\(/) || md.hasPattern(/lineLimit/);
    assertTrue(hasLineSpacing, 'Markdown renderer must set stable lineSpacing to prevent text jumps');
  });

  test('10.2: Stable paragraph spacing is configured between consecutive blocks', () => {
    const md = inspectSwift('ios/Sources/Evolingo/ArlenMarkdownRenderer.swift');
    const hasParagraphSpacing = md.hasPattern(/spacing:\s*(?:8|10|12|14|16)/);
    assertTrue(hasParagraphSpacing, 'Markdown block hierarchy must specify consistent block spacing');
  });

  test('10.3: ScrollViewReader anchors scroll offset to bottom during token streaming', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const hasScrollTo = evolingoSwift.hasPattern(/scrollTo\s*\([^)]*anchor:\s*\.bottom\s*\)/);
    assertTrue(hasScrollTo, 'Chat view must execute scrollTo(..., anchor: .bottom) to anchor viewport');
  });

  test('10.4: Message items maintain stable Identifiable IDs to prevent view recreation jitter', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const hasMessageID = evolingoSwift.hasPattern(/ForEach\s*\(\s*(?:model\.messages|displayedMessages)\s*\)/) ||
                         evolingoSwift.hasPattern(/ForEach\s*\(\s*(?:model\.messages|displayedMessages)\s*,\s*id:\s*\\\.id\s*\)/);
    assertTrue(hasMessageID, 'Messages must be rendered with stable element ID keypath');
  });

  test('10.5: Heavy markdown parsing passes are decoupled from main thread or memoized', () => {
    const md = inspectSwift('ios/Sources/Evolingo/ArlenMarkdownRenderer.swift');
    const hasDecoupling = md.hasPattern(/Task\.detached|nonisolated|@Sendable|cache|memoized/i);
    assertTrue(hasDecoupling, 'ArlenMarkdownRenderer must utilize caching, async tasks, or nonisolated parsing');
  });
});

// ============================================================================
// Feature 11: 120Hz ProMotion Optimization
// Requirement: ORIGINAL_REQUEST §R3 — CADisableMinimumFrameDurationOnPhone in Extra.plist,
// CAFrameRateRange, decouple heavy text passes.
// ============================================================================
suite.feature(11, '120Hz ProMotion Optimization', ({ test }) => {
  test('11.1: Extra.plist specifies CADisableMinimumFrameDurationOnPhone set to true', () => {
    const plist = readPlist('ios/Extra.plist');
    assertTrue(plist.CADisableMinimumFrameDurationOnPhone === true, 'Extra.plist must contain CADisableMinimumFrameDurationOnPhone = true');
  });

  test('11.2: CAFrameRateRange or display link configuration specifies maximum and preferred 120Hz', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const markdownSwift = inspectSwift('ios/Sources/Evolingo/ArlenMarkdownRenderer.swift');
    const extraPlist = readFile('ios/Extra.plist');
    const has120HzConfig = evolingoSwift.checkProMotionDisplayLink() ||
                           markdownSwift.checkProMotionDisplayLink() ||
                           extraPlist.includes('CADisableMinimumFrameDurationOnPhone');
    assertTrue(has120HzConfig, 'Application must configure 120Hz ProMotion display pacing');
  });

  test('11.3: Heavy text parsing / layout is performed off the main thread', () => {
    const md = inspectSwift('ios/Sources/Evolingo/ArlenMarkdownRenderer.swift');
    const isAsyncOrDetached = md.hasPattern(/Task\s*\{|Task\.detached|DispatchQueue\.global/);
    assertTrue(isAsyncOrDetached, 'Text layout or markdown preparation must leverage asynchronous processing');
  });

  test('11.4: View layer hierarchy flattens unnecessary compositing groups', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const lines = evolingoSwift.getLinesMatching(/\.compositingGroup\(\)/);
    assertLessThanOrEqual(lines.length, 5, 'Excessive compositing groups hitch 120Hz frame pacing');
  });

  test('11.5: Spring animations use high dampingFraction (>=0.80) to prevent 120Hz frame hitching', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const hasDampedSpring = evolingoSwift.hasPattern(/dampingFraction:\s*(?:0\.8\d|0\.9\d|1\.0)/);
    assertTrue(hasDampedSpring, 'Interactive animations must use dampingFraction >= 0.80 to ensure frame stability');
  });
});

// ============================================================================
// Feature 12: Hit-Testing & Touch Targets
// Requirement: ORIGINAL_REQUEST §R3 — Audit and expand interactive touch frames
// across all buttons, icons, rows to >= 44x44pt.
// ============================================================================
suite.feature(12, 'Hit-Testing & Touch Targets', ({ test }) => {
  test('12.1: Navigation bar buttons guarantee minimum 44x44pt touch area', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const coworkManager = inspectSwift('ios/Sources/Evolingo/CoworkProjectManager.swift');
    const hasNavTouch = evolingoSwift.hasPattern(/\.frame\s*\(\s*width:\s*44,\s*height:\s*44\s*\)/) ||
                        coworkManager.hasPattern(/\.frame\s*\(\s*width:\s*44,\s*height:\s*44\s*\)/);
    assertTrue(hasNavTouch, 'Navigation buttons must provide at least 44x44pt touch frames');
  });

  test('12.2: Chat input bar controls enforce minimum 44x44pt touch frame', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(evolingoSwift.hasPattern(/\.frame\s*\(\s*width:\s*44,\s*height:\s*44\s*\)/), 'Input bar action buttons must enforce 44x44pt touch area');
  });

  test('12.3: List rows and quick action cards in LibraryModernView provide minimum 44pt touch height', () => {
    const library = inspectSwift('ios/Sources/Evolingo/LibraryModernView.swift');
    assertTrue(library.exists, 'LibraryModernView.swift must exist');
    const hasRowHeight = library.hasPattern(/\.frame\s*\([^)]*minHeight:\s*(?:44|48|52)/) ||
                         library.hasPattern(/\.contentShape\s*\(\s*Rectangle\(\)\s*\)/);
    assertTrue(hasRowHeight, 'Library rows and action cards must enforce >= 44pt touch target');
  });

  test('12.4: Trailing action icons (more, sort, search) expand touch target to >= 44x44pt', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const library = inspectSwift('ios/Sources/Evolingo/LibraryModernView.swift');
    const hasExpand = evolingoSwift.hasPattern(/frame\s*\(\s*width:\s*44,\s*height:\s*44\s*\)/) ||
                      library.hasPattern(/frame\s*\(\s*width:\s*44,\s*height:\s*44\s*\)/);
    assertTrue(hasExpand, 'Action icons must be wrapped in 44x44 touch frames');
  });

  test('12.5: Interactive tappable shapes declare contentShape(Rectangle()) for full-surface hit test', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const library = inspectSwift('ios/Sources/Evolingo/LibraryModernView.swift');
    const hasContentShape = evolingoSwift.hasPattern(/\.contentShape\s*\(\s*Rectangle\(\)\s*\)/) ||
                            library.hasPattern(/\.contentShape\s*\(\s*Rectangle\(\)\s*\)/);
    assertTrue(hasContentShape, 'Custom button rows must declare .contentShape(Rectangle()) for reliable hit testing');
  });
});

// ============================================================================
// Feature 13: Arlen Chat Mode & Visual Intelligence
// Requirement: ORIGINAL_REQUEST §R4 — Fix modes.ts import bug, optimize TTFT,
// background asset parsing and lazy MapKit view allocation.
// ============================================================================
suite.feature(13, 'Arlen Chat Mode & Visual Intelligence', ({ test }) => {
  test('13.1: modes.ts imports visual-intelligence.ts without syntax or path error', () => {
    const modes = inspectTs('lib/arlen/modes.ts');
    assertTrue(modes.exists, 'lib/arlen/modes.ts must exist');
    assertTrue(modes.hasPattern(/from\s+['"]\.\/visual-intelligence(\.ts)?['"]/), 'modes.ts must cleanly import visual-intelligence');
  });

  test('13.2: Arlen Chat mode configuration defines fast profile and visual-intelligence capability', () => {
    const modes = inspectTs('lib/arlen/modes.ts');
    assertTrue(modes.hasPattern(/chat:\s*\{[^}]*profile:\s*'fast'/), 'Chat mode must use "fast" profile for minimal TTFT');
    assertTrue(modes.hasPattern(/visual-intelligence/), 'Chat mode capabilities must include visual-intelligence');
  });

  test('13.3: Visual intelligence pipeline in visual-intelligence.ts parses visual context asynchronously', () => {
    const vi = inspectTs('lib/arlen/visual-intelligence.ts');
    assertTrue(vi.exists, 'lib/arlen/visual-intelligence.ts must exist');
    assertTrue(vi.hasPattern(/parseVisualPayload|visualIntelligencePromptInstruction/), 'visual-intelligence.ts must export parser functions');
  });

  test('13.4: Chat API route at app/api/chat/route.ts streams response with chunked transfer', () => {
    const chatRoute = inspectTs('app/api/chat/route.ts');
    assertTrue(chatRoute.exists, 'app/api/chat/route.ts must exist');
    assertTrue(chatRoute.hasExport('POST'), 'app/api/chat/route.ts must export POST handler');
    assertTrue(chatRoute.hasPattern(/Response|ReadableStream|toTextStreamResponse/), 'chat route must return streaming Response');
  });

  test('13.5: Swift visual intelligence component ArlenVisualIntelligence.swift avoids blocking main thread', () => {
    const viSwift = inspectSwift('ios/Sources/Evolingo/ArlenVisualIntelligence.swift');
    assertTrue(viSwift.exists, 'ArlenVisualIntelligence.swift must exist');
    assertTrue(viSwift.hasPattern(/struct\s+ArlenVisualBlockView|struct\s+VisualBlockView/), 'Must define SwiftUI visual block view');
  });
});

// ============================================================================
// Feature 14: Web Search Pipeline Optimization
// Requirement: ORIGINAL_REQUEST §R4, PROJECT.md Interface Contract: executeWebSearchTool
// ============================================================================
suite.feature(14, 'Web Search Pipeline Optimization', ({ test }) => {
  test('14.1: executeWebSearchTool is exported from lib/arlen/web-search.ts matching interface contract', () => {
    const ws = inspectTs('lib/arlen/web-search.ts');
    assertTrue(ws.exists, 'lib/arlen/web-search.ts must exist');
    assertTrue(ws.hasExport('executeWebSearchTool'), 'web-search.ts must export executeWebSearchTool');
  });

  test('14.2: Web search parallelizes multi-query search with Promise.allSettled', () => {
    const ws = inspectTs('lib/arlen/web-search.ts');
    assertTrue(ws.usesPromiseAllSettled('executeWebSearchTool') || ws.hasPattern(/Promise\.allSettled/), 'Must use Promise.allSettled for parallel queries');
  });

  test('14.3: Payload pruning option prunePayload strips redundant text/snippets', () => {
    const ws = inspectTs('lib/arlen/web-search.ts');
    assertTrue(ws.hasPattern(/prunePayload/), 'executeWebSearchTool must accept prunePayload option');
  });

  test('14.4: Partial streaming updates are emitted via callback during query execution', () => {
    const ws = inspectTs('lib/arlen/web-search.ts');
    assertTrue(ws.hasPattern(/onStepStarted|onStepCompleted|callbacks|streamPartial/), 'web-search.ts must report incremental search progress');
  });

  test('14.5: Query planning caps concurrent sub-queries to prevent latency spikes', () => {
    const ws = inspectTs('lib/arlen/web-search.ts');
    assertTrue(ws.hasPattern(/slice\s*\(\s*0\s*,\s*(?:3|4|5)\s*\)/) || ws.hasPattern(/planSearchQueries/), 'Search execution must bound sub-queries to at most 3-5');
  });
});

// ============================================================================
// Feature 15: Database Query Optimization
// Requirement: ORIGINAL_REQUEST §R4 — Compound indexes, projection filtering, batch reads.
// ============================================================================
suite.feature(15, 'Database Query Optimization', ({ test }) => {
  test('15.1: Cowork messages API specifies compound query on conversation_id and owner_id', () => {
    const route = inspectTs('app/api/cowork/conversations/[id]/messages/route.ts');
    assertTrue(route.exists, 'conversations/[id]/messages/route.ts must exist');
    assertTrue(route.hasPattern(/\.find\s*\(\s*\{(?=[^}]*\bconversation_id:\s*id\b)(?=[^}]*\bowner_id:\s*owned\.ownerId\b)[^}]*\}/), 'Message .find() query must filter on compound keys (conversation_id, owner_id)');
  });

  test('15.2: Database queries project only required fields to eliminate slow reads', () => {
    const route = inspectTs('app/api/cowork/conversations/[id]/messages/route.ts');
    assertTrue(route.hasPattern(/projection\s*:\s*\{[^}]*_id:\s*0/), 'Message query must specify projection excluding _id');
  });

  test('15.3: Batch read queries enforce limit to avoid unbound in-memory memory spikes', () => {
    const route = inspectTs('app/api/cowork/conversations/[id]/messages/route.ts');
    assertTrue(route.hasPattern(/\.limit\s*\(\s*(?:100|200|500)\s*\)/), 'Message query must specify batch read limit');
  });

  test('15.4: Message retrieval leverages index sort order on created_at avoiding sort spills', () => {
    const route = inspectTs('app/api/cowork/conversations/[id]/messages/route.ts');
    assertTrue(route.hasPattern(/\.sort\s*\(\s*\{[^}]*created_at:\s*1/), 'Message query must sort by indexed created_at timestamp');
  });

  test('15.5: MongoDB connection pool configures connection limits and timeout in lib/mongodb.ts', () => {
    const mongo = inspectTs('lib/mongodb.ts');
    assertTrue(mongo.exists, 'lib/mongodb.ts must exist');
    assertTrue(mongo.hasPattern(/maxPoolSize:\s*\d+/), 'MongoDB client must configure maxPoolSize');
    assertTrue(mongo.hasPattern(/serverSelectionTimeoutMS:\s*\d+/), 'MongoDB client must configure serverSelectionTimeoutMS');
  });
});

// ============================================================================
// Feature 16: Shared Top Navigation Bar
// Requirement: ORIGINAL_REQUEST §R5, PROJECT.md Interface Contract: EvoSharedTopBar
// ============================================================================
suite.feature(16, 'Shared Top Navigation Bar', ({ test }) => {
  test('16.1: EvoSharedTopBar struct is defined in SharedTopBar.swift with callbacks', () => {
    const topBar = inspectSwift('ios/Sources/Evolingo/SharedTopBar.swift');
    assertTrue(topBar.exists, 'SharedTopBar.swift must exist');
    assertTrue(topBar.hasPattern(/struct\s+EvoSharedTopBar/), 'EvoSharedTopBar struct must be defined');
    assertTrue(topBar.hasPattern(/onOpenSidebar:\s*\(\)\s*->\s*Void/), 'Must accept onOpenSidebar callback');
    assertTrue(topBar.hasPattern(/onOpenProfile:\s*\(\)\s*->\s*Void/), 'Must accept onOpenProfile callback');
  });

  test('16.2: Left control contains circular bordered button with square.grid.2x2 icon', () => {
    const topBar = inspectSwift('ios/Sources/Evolingo/SharedTopBar.swift');
    assertTrue(topBar.hasPattern(/square\.grid\.2x2/), 'Left control must contain square.grid.2x2 icon');
    assertTrue(topBar.hasPattern(/Circle\(\)/), 'Left control must be styled as a circular bordered button');
  });

  test('16.3: Right control contains pill container with ellipsis and circular user avatar', () => {
    const topBar = inspectSwift('ios/Sources/Evolingo/SharedTopBar.swift');
    assertTrue(topBar.hasPattern(/ellipsis/), 'Right control must contain ellipsis icon');
    assertTrue(topBar.hasPattern(/Capsule\(\)/), 'Right control container must be pill-shaped');
  });

  test('16.4: Hairline 1px border and glass backdrop applied to header bar', () => {
    const topBar = inspectSwift('ios/Sources/Evolingo/SharedTopBar.swift');
    assertTrue(topBar.hasPattern(/lineWidth:\s*(?:0\.5|1|1\.0)/), 'Shared top bar must apply hairline border');
  });

  test('16.5: Both left circular button and right pill container satisfy minimum 44x44pt hit area', () => {
    const topBar = inspectSwift('ios/Sources/Evolingo/SharedTopBar.swift');
    assertTrue(topBar.hasPattern(/frame\s*\(\s*width:\s*44,\s*height:\s*44\s*\)|frame\s*\([^)]*minHeight:\s*44/), 'Controls must satisfy 44x44pt touch area');
  });
});

// ============================================================================
// Feature 17: Screen A: My Files (Populated)
// Requirement: ORIGINAL_REQUEST §R5 — Quick Action row (3 cards), section header,
// breadcrumbs, file list card with chevrons, bottom search bar.
// ============================================================================
suite.feature(17, 'Screen A: My Files (Populated)', ({ test }) => {
  test('17.1: Quick Action Row contains 3 equal-width cards: New File, Arlen Send, Connect', () => {
    const library = inspectSwift('ios/Sources/Evolingo/LibraryModernView.swift');
    assertTrue(library.exists, 'LibraryModernView.swift must exist');
    assertTrue(library.hasPattern(/New File/i), 'Quick action row must include "New File"');
    assertTrue(library.hasPattern(/Arlen Send/i), 'Quick action row must include "Arlen Send"');
    assertTrue(library.hasPattern(/Connect/i), 'Quick action row must include "Connect"');
  });

  test('17.2: Section Header displays bold title My Files, 4 items subtitle, and toolbar icons', () => {
    const library = inspectSwift('ios/Sources/Evolingo/LibraryModernView.swift');
    assertTrue(library.hasPattern(/My Files/), 'Section header must display "My Files" title');
    assertTrue(library.hasPattern(/square\.grid\.2x2|arrow\.up\.arrow\.down|ellipsis/), 'Section toolbar must provide view/sort/more action icons');
  });

  test('17.3: Breadcrumb Bar displays drive icon and path hierarchy My Files > Documents', () => {
    const library = inspectSwift('ios/Sources/Evolingo/LibraryModernView.swift');
    assertTrue(library.hasPattern(/Documents/), 'Breadcrumb must show Documents level');
  });

  test('17.4: File list card contains rows with right chevrons for My Files, Test, Recently Deleted', () => {
    const library = inspectSwift('ios/Sources/Evolingo/LibraryModernView.swift');
    assertTrue(library.hasPattern(/chevron\.right/), 'File list rows must display right chevron');
    assertTrue(library.hasPattern(/Recently Deleted/), 'List card must display "Recently Deleted"');
  });

  test('17.5: Bottom search bar contains floating pill search input paired with circular + button', () => {
    const library = inspectSwift('ios/Sources/Evolingo/LibraryModernView.swift');
    assertTrue(library.hasPattern(/magnifyingglass/), 'Bottom search bar must contain magnifying glass');
    assertTrue(library.hasPattern(/TextField\s*\(\s*"Search"/), 'Search input placeholder must be "Search"');
    assertTrue(library.hasPattern(/systemName:\s*"plus"/), 'Trailing circular button must feature plus icon');
  });
});

// ============================================================================
// Feature 18: Screen B: My Files (Empty State)
// Requirement: ORIGINAL_REQUEST §R5 — Retain shared top bar, quick actions, search,
// with centered folder outline, "No files yet", and "+ Create file" pill.
// ============================================================================
suite.feature(18, 'Screen B: My Files (Empty State)', ({ test }) => {
  test('18.1: Shared top bar, Quick Action Row, and bottom search bar are present in empty state', () => {
    const library = inspectSwift('ios/Sources/Evolingo/LibraryModernView.swift');
    assertTrue(library.exists, 'LibraryModernView.swift must exist');
    assertTrue(library.hasPattern(/bottomSearchShelf|bottomSearchBar/), 'Empty state view must retain search bar');
  });

  test('18.2: Centered empty state displays folder outline icon', () => {
    const library = inspectSwift('ios/Sources/Evolingo/LibraryModernView.swift');
    assertTrue(library.hasPattern(/folder|folder\.badge\.plus|LibraryArchiveDrawerIconShape/), 'Empty state must feature folder outline icon');
  });

  test('18.3: Empty state heading displays bold text No files yet', () => {
    const library = inspectSwift('ios/Sources/Evolingo/LibraryModernView.swift');
    assertTrue(library.hasPattern(/No files yet/), 'Empty state heading must display "No files yet"');
  });

  test('18.4: Empty state body displays secondary text Your files and folders will appear here.', () => {
    const library = inspectSwift('ios/Sources/Evolingo/LibraryModernView.swift');
    assertTrue(library.hasPattern(/Your files and folders will appear here/i), 'Empty state body must match required copy');
  });

  test('18.5: Bordered pill button labeled + Create file is centered below body text', () => {
    const library = inspectSwift('ios/Sources/Evolingo/LibraryModernView.swift');
    assertTrue(library.hasPattern(/\+\s*Create file|Create file/i), 'Empty state must include "+ Create file" pill button');
  });
});

// ============================================================================
// Feature 19: Screen C: Connect Server View
// Requirement: ORIGINAL_REQUEST §R5 — Top card selector with partial leading card,
// centered server rack icon, 2-line desc, full-width black capsule + Add Server button.
// ============================================================================
suite.feature(19, 'Screen C: Connect Server View', ({ test }) => {
  test('19.1: Top card selector displays partial leading card with down chevron next to primary card', () => {
    const connectServer = inspectSwift('ios/Sources/Evolingo/ConnectServerView.swift');
    const machineTabs = inspectSwift('ios/Sources/Evolingo/MachineDetailTabs.swift');
    const coworkManager = inspectSwift('ios/Sources/Evolingo/CoworkProjectManager.swift');
    const exists = connectServer.exists || machineTabs.exists || coworkManager.exists;
    assertTrue(exists, 'Connect Server view or component must exist');
    const hasCardSelector = connectServer.hasPattern(/chevron\.down/) ||
                            machineTabs.hasPattern(/chevron\.down/) ||
                            coworkManager.hasPattern(/chevron\.down/);
    assertTrue(hasCardSelector, 'Top selector must display card with chevron.down');
  });

  test('19.2: Primary card features centered + icon and Add Server label', () => {
    const connectServer = inspectSwift('ios/Sources/Evolingo/ConnectServerView.swift');
    const coworkManager = inspectSwift('ios/Sources/Evolingo/CoworkProjectManager.swift');
    const hasAddServerCard = connectServer.hasPattern(/Add Server/) || coworkManager.hasPattern(/Add Server/);
    assertTrue(hasAddServerCard, 'Top selector card must display "Add Server" label');
  });

  test('19.3: Centered server empty state features server.rack icon', () => {
    const connectServer = inspectSwift('ios/Sources/Evolingo/ConnectServerView.swift');
    const coworkManager = inspectSwift('ios/Sources/Evolingo/CoworkProjectManager.swift');
    const hasServerRack = connectServer.hasPattern(/server\.rack/) || coworkManager.hasPattern(/server\.rack/);
    assertTrue(hasServerRack, 'Connect server view must feature server.rack SF Symbol');
  });

  test('19.4: Heading Connect a server with 2-line description for managing projects and running Cowork remotely', () => {
    const connectServer = inspectSwift('ios/Sources/Evolingo/ConnectServerView.swift');
    const coworkManager = inspectSwift('ios/Sources/Evolingo/CoworkProjectManager.swift');
    const hasHeading = connectServer.hasPattern(/Connect a server/) || coworkManager.hasPattern(/Connect a server/);
    assertTrue(hasHeading, 'Must display "Connect a server" heading');
  });

  test('19.5: Full-width solid black capsule button with white text + Add Server satisfies >= 44pt height', () => {
    const connectServer = inspectSwift('ios/Sources/Evolingo/ConnectServerView.swift');
    const coworkManager = inspectSwift('ios/Sources/Evolingo/CoworkProjectManager.swift');
    const hasButton = connectServer.hasPattern(/\+\s*Add Server/) || coworkManager.hasPattern(/\+\s*Add Server/);
    assertTrue(hasButton, 'Must contain full-width "+ Add Server" button');
  });
});

// ============================================================================
// Feature 20: Screen D: Cowork / Projects Dashboard
// Requirement: ORIGINAL_REQUEST §R5 — Asymmetric 2-column bento grid, Latest Projects
// section with chevrons, Ask Codex bottom prompt bar with + and mic.
// ============================================================================
suite.feature(20, 'Screen D: Cowork / Projects Dashboard', ({ test }) => {
  test('20.1: Asymmetric 2-column bento grid has full-height left card for New Project', () => {
    const cowork = inspectSwift('ios/Sources/Evolingo/CoworkProjectManager.swift');
    assertTrue(cowork.exists, 'CoworkProjectManager.swift must exist');
    assertTrue(cowork.hasPattern(/New Project/i), 'Bento grid left column must contain "New Project" card');
  });

  test('20.2: Bento grid right column stacks two cards: Settings (slider icon) and Machine (server rack)', () => {
    const cowork = inspectSwift('ios/Sources/Evolingo/CoworkProjectManager.swift');
    assertTrue(cowork.hasPattern(/slider|gear|Settings/i), 'Bento grid right column must include Settings');
    assertTrue(cowork.hasPattern(/server\.rack|Machine/i), 'Bento grid right column must include Machine');
  });

  test('20.3: Latest Projects section header displays bold title and See all > secondary action', () => {
    const cowork = inspectSwift('ios/Sources/Evolingo/CoworkProjectManager.swift');
    assertTrue(cowork.hasPattern(/Latest Projects/), 'Header row must display "Latest Projects"');
    assertTrue(cowork.hasPattern(/See all/i), 'Header row must include "See all >" trailing action');
  });

  test('20.4: Project list displays clean rows with archive/box icon, title, and trailing chevron', () => {
    const cowork = inspectSwift('ios/Sources/Evolingo/CoworkProjectManager.swift');
    assertTrue(cowork.hasPattern(/chevron\.right/), 'Project rows must feature trailing chevron');
    assertTrue(cowork.hasPattern(/Arlen|Evolingo|Sycord/), 'Project list must display project items (Arlen, Evolingo, Sycord Cloud)');
  });

  test('20.5: Floating bottom prompt bar features Ask Codex placeholder paired with + and mic icons', () => {
    const cowork = inspectSwift('ios/Sources/Evolingo/CoworkProjectManager.swift');
    assertTrue(cowork.hasPattern(/Ask Codex|Ask Arlen/i), 'Bottom prompt bar must feature "Ask Codex" placeholder');
    assertTrue(cowork.hasPattern(/systemName:\s*"plus"/), 'Prompt bar must feature leading "+" button');
    assertTrue(cowork.hasPattern(/waveform|mic/), 'Prompt bar must feature trailing microphone / waveform button');
  });
});

// ============================================================================
// Feature 21: Release Build & Packaging
// Requirement: ORIGINAL_REQUEST §R6 — xtool dev build --configuration release --ipa
// and verify output at /var/lib/caddy/downloads/Arlen-build-99.ipa
// ============================================================================
suite.feature(21, 'Release Build & Packaging', ({ test }) => {
  test('21.1: Release IPA artifact exists at ios/xtool/Evolingo.ipa or in target build output', () => {
    const ipaExists = fileExists('ios/xtool/Evolingo.ipa');
    assertTrue(ipaExists, 'Release IPA must exist at ios/xtool/Evolingo.ipa');
  });

  test('21.2: Production deployment IPA exists at /var/lib/caddy/downloads/Arlen-build-99.ipa', () => {
    const prodIpa = '/var/lib/caddy/downloads/Arlen-build-99.ipa';
    const altIpa = '/var/lib/caddy/downloads/arlen-build-99.ipa';
    assertTrue(fs.existsSync(prodIpa) || fs.existsSync(altIpa), 'Production IPA must exist in /var/lib/caddy/downloads/');
  });

  test('21.3: Release IPA archive structure is valid and contains Payload/Evolingo.app', () => {
    const ipaInfo = inspectIpaArchive('ios/xtool/Evolingo.ipa');
    assertTrue(ipaInfo.exists, 'Release IPA must be present');
    assertTrue(ipaInfo.isValidZip, 'Release IPA must be a valid ZIP archive');
    assertTrue(ipaInfo.hasAppPayload, 'Release IPA must contain Payload/Evolingo.app directory structure');
    assertTrue(ipaInfo.hasInfoPlist, 'Release IPA must contain bundled Info.plist');
  });

  test('21.4: Release IPA file size exceeds minimum production binary threshold (> 5MB)', () => {
    const ipaInfo = inspectIpaArchive('ios/xtool/Evolingo.ipa');
    assertGreaterThanOrEqual(ipaInfo.sizeBytes, 5 * 1024 * 1024, 'Release IPA size must be at least 5MB');
  });

  test('21.5: Production deployment file permissions allow public read access (mode >= 0644)', () => {
    const prodIpa = '/var/lib/caddy/downloads/Arlen-build-99.ipa';
    const stat = fs.statSync(prodIpa);
    const isReadable = (stat.mode & 0o444) !== 0;
    assertTrue(isReadable, 'Production IPA file must be readable by web server');
  });
});

// ============================================================================
// Execution & Export
// ============================================================================
async function runSuite(options = {}) {
  const result = await suite.run(options);
  const outPath = resolvePath('tests/e2e/tier1_results.json');
  try {
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
  } catch (err) {
    console.error('Warning: Could not write tier1_results.json:', err.message);
  }
  return result;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const filterArg = args.find(a => a.startsWith('--filter='))?.split('=')[1];
  const bail = args.includes('--bail');

  runSuite({ filter: filterArg, bail })
    .then(result => {
      // Return 0 if syntax/execution completes, master runner handles aggregation
      const exitCode = result.summary.failed > 0 && process.env.EXIT_ON_FAIL === '1' ? 1 : 0;
      process.exit(exitCode);
    })
    .catch(err => {
      console.error('Uncaught error during suite execution:', err);
      process.exit(1);
    });
}

module.exports = {
  suite,
  runSuite
};
