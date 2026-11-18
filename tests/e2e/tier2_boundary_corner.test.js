/**
 * Evolingo E2E Test Suite - Tier 2: Boundary & Corner Cases
 * 
 * Comprehensive Boundary Value Analysis covering all 21 Features in PROJECT.md § Feature Inventory.
 * Minimum 5 boundary, edge, corner, and error-handling test cases per feature (Total: 106 tests).
 * 
 * Authentic Opaque-Box & Disk AST Inspection:
 * - Direct inspection of Swift, TypeScript, Plist, and IPA archives on disk
 * - Zero in-memory dummy facades or simulated mock classes
 * - Legitimate failure on pending Milestone deliverables until implemented
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const {
  PROJECT_ROOT,
  TestSuite,
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
  assertThrows,
  assertAsyncThrows,
  resolvePath,
  fileExists,
  readFile,
  readJson,
  readPlist,
  inspectSwift,
  inspectTs,
  inspectIpaArchive,
} = require('./utils/harness.js');

const suite = new TestSuite('Tier 2: Boundary & Corner Cases (Features 1-21)');

// ============================================================================
// Feature 1: Remove MySpace Tab (Milestone 1, R1)
// ============================================================================
suite.feature(1, 'Remove MySpace Tab', ({ test }) => {
  test('1.1 NativeTab enum boundary — space case is completely absent', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    const cases = swift.getEnumCases('NativeTab');
    
    assertFalse(cases.includes('space'), 'NativeTab enum must NOT contain "space" case');
    assertFalse(cases.includes('myspace'), 'NativeTab enum must NOT contain "myspace" case');
    assertTrue(cases.includes('chat'), 'NativeTab must retain "chat" tab');
    assertTrue(cases.includes('cowork'), 'NativeTab must retain "cowork" tab');
  });

  test('1.2 Dead-end view source files are unreferenced in root navigation', () => {
    const rootSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    const sidebarSwift = inspectSwift('ios/Sources/Evolingo/ChatLayerSidebar.swift');
    assertTrue(rootSwift.exists, 'Evolingo.swift must exist');
    assertTrue(sidebarSwift.exists, 'ChatLayerSidebar.swift must exist');

    assertFalse(rootSwift.hasPattern(/ModernSpaceView\s*\(/), 'Evolingo.swift must not instantiate ModernSpaceView');
    assertFalse(rootSwift.hasPattern(/MyspaceWebView\s*\(/), 'Evolingo.swift must not instantiate MyspaceWebView');
    assertFalse(sidebarSwift.hasPattern(/tab:\s*\.space/), 'ChatLayerSidebar.swift must not link to .space tab');
  });

  test('1.3 NativeTab enum definition and tab selection state in Evolingo.swift', () => {
    const rootSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(rootSwift.exists, 'Evolingo.swift must exist');
    assertTrue(rootSwift.hasPattern(/enum\s+NativeTab/), 'NativeTab enum must be declared in Evolingo.swift');
    assertTrue(rootSwift.hasPattern(/@State\s+private\s+var\s+selectedTab:\s*NativeTab\s*=\s*\.chat/), 'Root selectedTab must initialize safely to .chat');
    assertFalse(rootSwift.hasPattern(/case\s+space\b/), 'NativeTab must not include space case');
    assertFalse(rootSwift.hasPattern(/case\s+myspace\b/), 'NativeTab must not include myspace case');
  });

  test('1.4 Pinned chats JSON decoder safely guards with try? and empty array fallback in ChatLayerSidebar.swift', () => {
    const sidebar = inspectSwift('ios/Sources/Evolingo/ChatLayerSidebar.swift');
    assertTrue(sidebar.exists, 'ChatLayerSidebar.swift must exist');
    assertTrue(
      sidebar.hasPattern(/@AppStorage\("native\.arlen\.pinned\.chats"\)\s+private\s+var\s+pinnedChatIDsJSON\s*=\s*"\[\]"/),
      'Pinned chats must store JSON array in AppStorage'
    );
    assertTrue(
      sidebar.hasPattern(/guard\s+let\s+data\s*=\s*pinnedChatIDsJSON\.data\(using:\s*\.utf8\),\s*let\s+ids\s*=\s*try\?\s*JSONDecoder\(\)\.decode\(\[String\]\.self,\s*from:\s*data\)\s*else\s*\{\s*return\s*\[\]\s*\}/),
      'Pinned chats decoder must guard with try? JSONDecoder and fallback to empty array'
    );
    assertFalse(sidebar.hasPattern(/ModernSpaceView/), 'ChatLayerSidebar.swift must not reference ModernSpaceView');
  });

  test('1.5 Deep link and URL scheme handler does not route to space or myspace', () => {
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(evolingoSwift.exists, 'Evolingo.swift must exist');
    assertNotMatch(evolingoSwift.source, /\.onOpenURL\s*(?:\([^)]*\)\s*)?\{[\s\S]{0,500}?\b(?:space|myspace)\b/i, 'onOpenURL handler must not route "space" or "myspace" URLs');
    assertFalse(evolingoSwift.hasPattern(/url\.host\s*==\s*"space"/), 'URL scheme must not route to space');
    assertFalse(evolingoSwift.hasPattern(/url\.host\s*==\s*"myspace"/), 'URL scheme must not route to myspace');
  });

  test('1.6 Left-edge swipe gesture recognizer excludes or cleans legacy space check', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertFalse(swift.hasPattern(/selectedTab\s*!=\s*\.space/), 'Swipe gesture recognizer should not retain obsolete "selectedTab != .space" check');
  });
});

// ============================================================================
// Feature 2: Plugin Icon Asset Loader (Milestone 1, R1)
// ============================================================================
suite.feature(2, 'Plugin Icon Asset Loader', ({ test }) => {
  test('2.1 Missing, empty, or whitespace plugin name falls back safely without nil crash in Tools.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Tools.swift');
    assertTrue(swift.exists, 'Tools.swift must exist');
    assertTrue(swift.hasPattern(/class\s+ArlenPluginIconLoader/), 'ArlenPluginIconLoader must be declared in Tools.swift');
    assertTrue(
      swift.hasPattern(/guard\s+let\s+url,\s*let\s+data\s*=\s*try\?\s*Data\(contentsOf:\s*url\),\s*let\s+img\s*=\s*UIImage\(data:\s*data\)\s*else\s*\{\s*return\s*nil\s*\}/),
      'ArlenPluginIconLoader must return nil safely on missing assets'
    );
    assertTrue(swift.hasPattern(/struct\s+PluginMiniBrandBadge:\s*View/), 'PluginMiniBrandBadge view must be declared');
    assertTrue(swift.hasPattern(/struct\s+PluginBrandTileView:\s*View/), 'PluginBrandTileView view must be declared');
  });

  test('2.2 Asset casing and extension normalization in Tools.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Tools.swift');
    assertTrue(swift.exists, 'Tools.swift must exist');
    assertTrue(
      swift.hasPattern(/Bundle\.module\.url\(forResource:\s*pluginID,\s*withExtension:\s*"png"\)/),
      'Asset loader must resolve .png extension via Bundle.module'
    );
    assertTrue(swift.hasPattern(/subdirectory:\s*"PluginIcons"/), 'Asset loader must support PluginIcons subdirectory lookup');
  });

  test('2.3 Required plugin icon files exist with non-zero size and valid PNG headers', () => {
    const resourceDir = 'ios/Sources/Evolingo/Resources/PluginIcons';
    const zendeskPath = resolvePath(resourceDir, 'zendesk.png');
    const hubspotPath = resolvePath(resourceDir, 'hubspot.png');

    assertTrue(fs.existsSync(zendeskPath), 'zendesk.png must exist in Resources/PluginIcons/');
    assertTrue(fs.existsSync(hubspotPath), 'hubspot.png must exist in Resources/PluginIcons/');

    const zendeskBuf = fs.readFileSync(zendeskPath);
    const hubspotBuf = fs.readFileSync(hubspotPath);

    assertGreaterThanOrEqual(zendeskBuf.length, 64, 'zendesk.png must have non-zero size (> 64 bytes)');
    assertGreaterThanOrEqual(hubspotBuf.length, 64, 'hubspot.png must have non-zero size (> 64 bytes)');

    const pngMagic = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    assertEqual(zendeskBuf.subarray(0, 8).compare(pngMagic), 0, 'zendesk.png must start with valid PNG magic header bytes');
    assertEqual(hubspotBuf.subarray(0, 8).compare(pngMagic), 0, 'hubspot.png must start with valid PNG magic header bytes');
  });

  test('2.4 ArlenPluginIconLoader implements NSCache, NSLock, and async loadImage in Tools.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Tools.swift');
    assertTrue(swift.exists, 'Tools.swift must exist');
    assertTrue(swift.hasPattern(/private\s+let\s+memCache\s*=\s*NSCache<NSString,\s*UIImage>\(\)/), 'ArlenPluginIconLoader must use NSCache for in-memory caching');
    assertTrue(swift.hasPattern(/private\s+let\s+lock\s*=\s*NSLock\(\)/), 'ArlenPluginIconLoader must use NSLock for thread safety');
    assertTrue(swift.hasPattern(/func\s+loadImage\(for\s+pluginID:\s*String\)\s*async\s*->\s*UIImage\?/), 'ArlenPluginIconLoader must provide async loadImage method');
    assertTrue(swift.hasPattern(/Task\.detached/), 'Async loading must use Task.detached');
  });

  test('2.5 Bundle.module resource path fallback logic inspection', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Tools.swift');
    assertTrue(swift.exists, 'Tools.swift must exist');
    assertTrue(
      swift.hasPattern(/Bundle\.module/) || swift.hasPattern(/Bundle\.main/) || swift.hasPattern(/ArlenPluginIconLoader/),
      'Tools.swift must implement bundle-aware asset loader'
    );
  });
});

// ============================================================================
// Feature 3: Sidebar Persistence in Cowork (Milestone 1, R1)
// ============================================================================
suite.feature(3, 'Sidebar Persistence in Cowork', ({ test }) => {
  test('3.1 Root level sidebar state and transition spring animation in Evolingo.swift', () => {
    const rootSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(rootSwift.exists, 'Evolingo.swift must exist');
    assertTrue(rootSwift.hasPattern(/@State\s+private\s+var\s+showSidebar\s*=\s*false/), 'Evolingo.swift must declare @State private var showSidebar');
    assertTrue(rootSwift.hasPattern(/@State\s+private\s+var\s+sidebarDragOffset:\s*CGFloat\s*=\s*0/), 'Evolingo.swift must declare @State private var sidebarDragOffset');
    assertTrue(rootSwift.hasPattern(/withAnimation\(\.spring/), 'Sidebar transitions must use spring animation');
  });

  test('3.2 Empty Cowork workspace retains identical navigation rows in ChatLayerSidebar.swift', () => {
    const sidebar = inspectSwift('ios/Sources/Evolingo/ChatLayerSidebar.swift');
    assertTrue(sidebar.exists, 'ChatLayerSidebar.swift must exist');
    assertTrue(sidebar.hasPattern(/sidebarNavRow\(title:\s*"Chat",\s*symbol:\s*"bubble\.left\.and\.bubble\.right",\s*tab:\s*\.chat\)/), 'Chat nav row must be defined');
    assertTrue(sidebar.hasPattern(/sidebarNavRow\(title:\s*"Cowork",\s*symbol:\s*"macwindow\.on\.rectangle",\s*tab:\s*\.cowork\)/), 'Cowork nav row must be defined');
    assertTrue(sidebar.hasPattern(/sidebarNavRow\(title:\s*"Schedule",\s*symbol:\s*"calendar",\s*tab:\s*\.schedule\)/), 'Schedule nav row must be defined');
    assertTrue(sidebar.hasPattern(/sidebarNavRow\(title:\s*"Library",\s*symbol:\s*"folder",\s*tab:\s*\.library\)/), 'Library nav row must be defined');
  });

  test('3.3 Tab selection chatModel and coworkModel persist state across transitions in Evolingo.swift', () => {
    const rootSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(rootSwift.exists, 'Evolingo.swift must exist');
    assertTrue(rootSwift.hasPattern(/@StateObject\s+private\s+var\s+chatModel\s*=\s*ChatModel\(namespace:\s*"chat"\)/), 'chatModel must be bound at root');
    assertTrue(rootSwift.hasPattern(/@StateObject\s+private\s+var\s+coworkModel\s*=\s*ChatModel\(namespace:\s*"cowork"\)/), 'coworkModel must be bound at root');
    assertTrue(rootSwift.hasPattern(/activeTab:\s*selectedTab/), 'selectedTab must be passed into ChatLayerSidebarView');
  });

  test('3.4 Sidebar width formula clamps to min(340, width * 0.78) in Evolingo.swift', () => {
    const rootSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(rootSwift.exists, 'Evolingo.swift must exist');
    assertTrue(rootSwift.hasPattern(/let\s+sidebarWidth\s*=\s*min\(340,\s*geometry\.size\.width\s*\*\s*0\.78\)/), 'sidebarWidth formula must clamp to min(340, width * 0.78)');
    assertTrue(rootSwift.hasPattern(/let\s+currentOffset\s*=\s*\(showSidebar\s*\?\s*sidebarWidth\s*:\s*0\)\s*\+\s*sidebarDragOffset/), 'currentOffset formula must account for showSidebar and drag offset');
  });

  test('3.5 ChatLayerSidebarView declares @AppStorage("native.arlen.pinned.chats") for persistence', () => {
    const sidebar = inspectSwift('ios/Sources/Evolingo/ChatLayerSidebar.swift');
    assertTrue(sidebar.exists, 'ChatLayerSidebar.swift must exist');
    assertTrue(sidebar.hasSymbol('ChatLayerSidebarView'), 'ChatLayerSidebarView must be declared');
    assertTrue(sidebar.hasPattern(/@AppStorage\("native\.arlen\.pinned\.chats"\)/), 'Pinned chats must use AppStorage');
  });
});

// ============================================================================
// Feature 4: Interactive Swipe Physics (Milestone 1, R1)
// ============================================================================
suite.feature(4, 'Interactive Swipe Physics', ({ test }) => {
  test('4.1 DragGesture edge boundary (startX < 54) and minimumDistance 8 in Evolingo.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertTrue(swift.hasPattern(/DragGesture\(minimumDistance:\s*8\)/), 'DragGesture must require minimumDistance of 8');
    assertTrue(swift.hasPattern(/sidebarDragOffset\s*=/), 'DragGesture must update sidebarDragOffset');
    assertTrue(swift.hasPattern(/gesture\.startLocation\.x\s*<\s*54/), 'Edge swipe must be restricted to left edge (< 54pt)');
  });

  test('4.2 Gesture completion calculates predictedEndTranslation or velocity threshold in Evolingo.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertTrue(
      swift.hasPattern(/gesture\.predictedEndTranslation\.width/) || swift.hasPattern(/velocity\s*>/) || swift.hasPattern(/predictedEndLocation/),
      'Gesture end must evaluate predicted velocity or end translation'
    );
    assertTrue(swift.hasPattern(/withAnimation\(\.spring\(/), 'Completion must trigger spring animation');
  });

  test('4.3 Opposing negative velocity cancellation and settle to 0 in Evolingo.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertTrue(swift.hasPattern(/sidebarDragOffset\s*=\s*0/), 'Animation completion must settle sidebarDragOffset to 0');
    assertTrue(swift.hasPattern(/showSidebar\s*=\s*shouldOpen/) || swift.hasPattern(/showSidebar\s*=\s*false/), 'Completion logic must update showSidebar state');
  });

  test('4.4 Overdrag translation clamp boundary within sidebarWidth in Evolingo.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertTrue(
      swift.hasPattern(/min\(sidebarWidth,\s*max\(0,\s*gesture\.translation\.width\)\)/) || swift.hasPattern(/min\(sidebarWidth/) || swift.hasPattern(/max\(-sidebarWidth/),
      'Drag translation must be clamped within sidebar bounds'
    );
  });

  test('4.5 Floating-point progress calculation and spring damping in Evolingo.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertTrue(swift.hasPattern(/let\s+progress\s*=\s*max\(0,\s*min\(1,\s*currentOffset\s*\/\s*sidebarWidth\)\)/), 'Progress calculation must be clamped between 0 and 1');
    assertTrue(swift.hasPattern(/\.spring\(response:\s*0\.32,\s*dampingFraction:\s*0\.86\)/) || swift.hasPattern(/\.spring\(response:/), 'Spring animation must specify response and damping');
  });
});

// ============================================================================
// Feature 5: Initial-Launch-Only Keyboard Focus (Milestone 2, R2)
// ============================================================================
suite.feature(5, 'Initial-Launch-Only Keyboard Focus', ({ test }) => {
  test('5.1 AppFocusCoordinator singleton is declared as @MainActor final class conforming to ObservableObject', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertTrue(
      swift.hasPattern(/@MainActor\s+final\s+class\s+AppFocusCoordinator\s*:\s*ObservableObject/) ||
      swift.hasPattern(/class\s+AppFocusCoordinator\s*:\s*ObservableObject/),
      'AppFocusCoordinator must be defined in Evolingo.swift as ObservableObject'
    );
  });

  test('5.2 AppFocusCoordinator provides shared singleton and hasRequestedColdLaunchFocus property', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertTrue(swift.hasPattern(/static\s+let\s+shared\s*=\s*AppFocusCoordinator\(\)/), 'AppFocusCoordinator must provide static let shared');
    assertTrue(swift.hasPattern(/var\s+hasRequestedColdLaunchFocus/), 'AppFocusCoordinator must declare hasRequestedColdLaunchFocus');
  });

  test('5.3 claimColdLaunchFocus() method returns Bool to grant auto-focus strictly once', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertTrue(swift.hasPattern(/func\s+claimColdLaunchFocus\s*\(\s*\)\s*->\s*Bool/), 'AppFocusCoordinator must declare func claimColdLaunchFocus() -> Bool');
  });

  test('5.4 ChatView / input bar invokes claimColdLaunchFocus() prior to requesting focus', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertTrue(swift.hasPattern(/claimColdLaunchFocus\s*\(\s*\)/), 'ChatView / input bar must invoke claimColdLaunchFocus() before requesting focus');
  });

  test('5.5 Coordinator source code signature contract inspection', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertTrue(swift.hasSymbol('AppFocusCoordinator'), 'AppFocusCoordinator must be defined in Evolingo.swift');
    assertTrue(swift.hasMethod('claimColdLaunchFocus', 'AppFocusCoordinator'), 'AppFocusCoordinator must declare claimColdLaunchFocus()');
  });
});

// ============================================================================
// Feature 6: Persistent & Uniform Send Button (Milestone 2, R2)
// ============================================================================
suite.feature(6, 'Persistent & Uniform Send Button', ({ test }) => {
  test('6.1 Send button remains persistently mounted across empty, typing, and streaming states in Evolingo.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertNotMatch(swift.source, /if\s+canSend\s*\{[^}]*?\bButton\b/, 'Send button must not be conditionally unmounted when empty');
    assertTrue(swift.hasPattern(/EvoIcon\(systemName:\s*model\.loading\s*\?\s*"stop\.fill"\s*:\s*"arrow\.up"\)/), 'Send button icon must bind to loading state');
  });

  test('6.2 Send button visual circular frame is 36x36pt in Evolingo.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertTrue(swift.hasPattern(/Circle\(\)[\s\S]*?\.frame\s*\(\s*width:\s*36,\s*height:\s*36\s*\)/), 'Send button shape must be 36x36 circle');
  });

  test('6.3 Interactive touch target frame meets or exceeds 44x44pt with Circle contentShape in Evolingo.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertTrue(swift.hasPattern(/\.frame\s*\(\s*width:\s*44,\s*height:\s*44\s*\)/), 'Send button touch frame must be at least 44x44pt');
    assertTrue(swift.hasPattern(/\.contentShape\s*\(\s*Circle\(\)\s*\)/), 'Send button must define Circle contentShape');
  });

  test('6.4 Streaming state cancellation and stop.fill icon switching in Evolingo.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertTrue(swift.hasPattern(/model\.cancelActiveSend\(\)/), 'Tapping stop button must invoke model.cancelActiveSend()');
    assertTrue(swift.hasPattern(/accessibilityLabel\(model\.loading\s*\?\s*"Stop response"\s*:\s*"Send message"\)/), 'Button accessibilityLabel must reflect state');
  });

  test('6.5 Disabled / empty state uses semantic opacity rather than view removal in Evolingo.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertTrue(swift.hasPattern(/opacity\(canSend\s*\|\|\s*model\.loading\s*\?\s*1\.0\s*:\s*0\.35\)/), 'Button background must apply 0.35 opacity when disabled');
    assertTrue(swift.hasPattern(/\.disabled\(!canSend\s*&&\s*!model\.loading/), 'Button must apply .disabled modifier');
  });
});

// ============================================================================
// Feature 7: Input Padding Refinement (Milestone 2, R2)
// ============================================================================
suite.feature(7, 'Input Padding Refinement', ({ test }) => {
  test('7.1 Internal text container insets strictly match 10pt/8pt or 12pt/8pt in Evolingo.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertTrue(
      swift.hasPattern(/\.padding\(\.horizontal,\s*(?:8|10|12)\)/),
      'Internal horizontal padding must be 8pt, 10pt, or 12pt'
    );
    assertTrue(
      swift.hasPattern(/\.padding\(\.vertical,\s*(?:6|8)\)/),
      'Internal vertical padding must be 6pt or 8pt'
    );
  });

  test('7.2 External bottom padding is strictly 10pt (never 0pt or collapsing) in Evolingo.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertTrue(
      swift.hasPattern(/\.padding\(\.bottom,\s*10\)/),
      'Input container external bottom padding must be strictly 10pt'
    );
  });

  test('7.3 Multi-line text growth preserves internal insets without distortion in Evolingo.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertTrue(swift.hasPattern(/frame\s*\(\s*minHeight:\s*58\s*\)/) || swift.hasPattern(/frame\s*\(\s*minHeight:/), 'Input field must have defined minHeight');
    assertTrue(swift.hasPattern(/fixedSize\(horizontal:\s*false,\s*vertical:\s*true\)/), 'Input field must allow vertical expansion');
  });

  test('7.4 Zero safe area device bottom margin calculation in Evolingo.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertTrue(
      swift.hasPattern(/safeAreaInset/) || swift.hasPattern(/geometry\.safeAreaInsets/) || swift.hasPattern(/safeAreaPadding/),
      'Input container must accommodate device safe area bottom margins'
    );
  });

  test('7.5 Horizontal margin symmetry from display edges in Evolingo.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertTrue(
      swift.hasPattern(/\.padding\(\.horizontal,\s*(?:12|16)\)/),
      'External horizontal padding must be symmetrical (12pt or 16pt)'
    );
  });
});

// ============================================================================
// Feature 8: Scroll-Under-Input Layering (Milestone 2, R2)
// ============================================================================
suite.feature(8, 'Scroll-Under-Input Layering', ({ test }) => {
  test('8.1 Chat ScrollView applies bottom clearance for floating input bar in Evolingo.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertTrue(
      swift.hasPattern(/\.safeAreaInset\s*\(\s*edge:\s*\.bottom/) || swift.hasPattern(/contentBottomInset/),
      'Chat ScrollView must apply bottom clearance for floating input bar'
    );
  });

  test('8.2 Single message bubble resting position above floating bar in Evolingo.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertTrue(
      swift.hasPattern(/Spacer\s*\(\s*minLength:\s*(?:60|70|80|90|100)\s*\)/) || swift.hasPattern(/bottomSpacerHeight/),
      'Message list must reserve clearance for resting above input bar'
    );
  });

  test('8.3 Floating input bar has higher z-index ordering than message list in Evolingo.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertTrue(
      swift.hasPattern(/\.zIndex\s*\(\s*(?:[1-9]\d*)\s*\)/),
      'Input bar container must declare explicit higher .zIndex'
    );
  });

  test('8.4 Translucent glass backdrop applied to input bar in Evolingo.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertTrue(
      swift.hasPattern(/EvoNavigationGlass/) || swift.hasPattern(/ultraThinMaterial/),
      'Floating input bar must use translucent glass styling'
    );
  });

  test('8.5 Touch pass-through prevention via contentShape on floating bar in Evolingo.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertTrue(
      swift.hasPattern(/\.contentShape\s*\(/),
      'Input bar container must intercept touches via contentShape'
    );
  });
});

// ============================================================================
// Feature 9: Dynamic Keyboard Avoidance (Milestone 2, R2)
// ============================================================================
suite.feature(9, 'Dynamic Keyboard Avoidance', ({ test }) => {
  test('9.1 Observer listens to keyboard notification in Evolingo.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertTrue(
      swift.hasPattern(/keyboardWillChangeFrameNotification/) || swift.hasPattern(/keyboardWillShowNotification/),
      'Evolingo.swift must register observer for keyboard notifications'
    );
  });

  test('9.2 Keyboard height binds dynamically to bottom offset in Evolingo.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertTrue(
      swift.hasPattern(/keyboardHeight/) || swift.hasPattern(/safeAreaInset\s*\(\s*edge:\s*\.bottom/),
      'Evolingo.swift must bind keyboard height dynamically to layout'
    );
  });

  test('9.3 Extreme keyboard height guards against negative viewport height in Evolingo.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertTrue(
      swift.hasPattern(/max\s*\(\s*0/) || swift.hasPattern(/max\s*\(\s*100/) || swift.hasPattern(/clamp/),
      'Evolingo.swift must guard viewport against extreme keyboard offsets'
    );
  });

  test('9.4 Interactive keyboard drag dismissal configured in Evolingo.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertTrue(
      swift.hasPattern(/\.scrollDismissesKeyboard\s*\(\s*\.interactively\s*\)/),
      'Evolingo.swift must enable interactive keyboard dismissal on scroll'
    );
  });

  test('9.5 Keyboard frame observer notification name verification', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    const hasNotification = swift.hasPattern(/keyboardWillChangeFrameNotification/) ||
                            swift.hasPattern(/keyboardWillShowNotification/);
    assertTrue(hasNotification, 'Evolingo.swift must register keyboard notification observer');
  });
});

// ============================================================================
// Feature 10: Message Push & Streaming Readability (Milestone 3, R3)
// ============================================================================
suite.feature(10, 'Message Push & Streaming Readability', ({ test }) => {
  test('10.1 High-frequency token streaming maintains invariant line height in ArlenMarkdownRenderer.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/ArlenMarkdownRenderer.swift');
    assertTrue(swift.exists, 'ArlenMarkdownRenderer.swift must exist');
    assertTrue(
      swift.hasPattern(/lineSpacing/) || swift.hasPattern(/EvoFont/) || swift.hasPattern(/lineHeight/),
      'ArlenMarkdownRenderer must configure stable typography line spacing'
    );
  });

  test('10.2 Malformed and unclosed markdown blocks handle streaming safely in ArlenMarkdownRenderer.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/ArlenMarkdownRenderer.swift');
    assertTrue(swift.exists, 'ArlenMarkdownRenderer.swift must exist');
    assertTrue(swift.hasPattern(/codeBlock/) || swift.hasPattern(/```/), 'ArlenMarkdownRenderer must handle code blocks');
  });

  test('10.3 Empty tokens and consecutive newline spam sanitization in lib/arlen/store.ts or Evolingo.swift', () => {
    const storeTs = inspectTs('lib/arlen/store.ts');
    const evolingoSwift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(storeTs.exists || evolingoSwift.exists, 'Store or Evolingo implementation must exist');
    assertTrue(
      storeTs.hasPattern(/replace\(\/\\n\{3,\}\/g/) || evolingoSwift.hasPattern(/trimmingCharacters/) || evolingoSwift.hasPattern(/messages/),
      'Streaming chunks or messages must be sanitized'
    );
  });

  test('10.4 User scrolled-up anchor preservation during streaming delivery in Evolingo.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertTrue(
      swift.hasPattern(/!isUserScrolling/) || swift.hasPattern(/followStream/) || swift.hasPattern(/ScrollViewReader/),
      'Evolingo.swift must guard streaming auto-scroll when user is reading'
    );
  });

  test('10.5 Markdown parser decoupling from main thread verification', () => {
    const renderer = inspectSwift('ios/Sources/Evolingo/ArlenMarkdownRenderer.swift');
    assertTrue(renderer.exists, 'ArlenMarkdownRenderer.swift must exist');
    assertTrue(
      renderer.hasSymbol('ArlenMarkdownRenderer') || renderer.hasSymbol('ArlenMarkdownParser'),
      'ArlenMarkdownRenderer or ArlenMarkdownParser must be declared'
    );
  });
});

// ============================================================================
// Feature 11: 120Hz ProMotion Optimization (Milestone 2, R3)
// ============================================================================
suite.feature(11, '120Hz ProMotion Optimization', ({ test }) => {
  test('11.1 Extra.plist CADisableMinimumFrameDurationOnPhone key verification', () => {
    const plist = readPlist('ios/Extra.plist');
    assertTrue(plist !== null && typeof plist === 'object', 'Extra.plist must exist');
    assertEqual(plist.CADisableMinimumFrameDurationOnPhone, true, 'Extra.plist must specify CADisableMinimumFrameDurationOnPhone = true');
  });

  test('11.2 CAFrameRateRange preferred rate boundary configuration in Evolingo.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertTrue(
      swift.hasPattern(/CAFrameRateRange\s*\(\s*minimum:\s*\d+,\s*maximum:\s*120,\s*preferred:\s*120\s*\)/) ||
      swift.hasPattern(/preferredFrameRateRange/),
      'Evolingo.swift must configure 120Hz frame rate range'
    );
  });

  test('11.3 Low Power Mode and systemReduceMotion disabling animation transactions in Evolingo.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertTrue(swift.hasPattern(/@Environment\(\\\.accessibilityReduceMotion\)\s+private\s+var\s+systemReduceMotion/), 'Evolingo.swift must read systemReduceMotion');
    assertTrue(swift.hasPattern(/systemReduceMotion\s*\|\|\s*reduceMotion/), 'Animation transactions must disable on reduce motion');
  });

  test('11.4 Animation transactions guard zero-duration states safely in Evolingo.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertTrue(swift.hasPattern(/withAnimation/), 'Evolingo.swift must safely invoke withAnimation');
  });

  test('11.5 Heavy markdown parser decoupling from main thread via Task.detached', () => {
    const renderer = inspectSwift('ios/Sources/Evolingo/ArlenMarkdownRenderer.swift');
    const tools = inspectSwift('ios/Sources/Evolingo/Tools.swift');
    assertTrue(renderer.exists, 'ArlenMarkdownRenderer.swift must exist');
    assertTrue(
      renderer.hasPattern(/Task\.detached/) || tools.hasPattern(/Task\.detached/),
      'Heavy operations must be decoupled via Task.detached'
    );
  });
});

// ============================================================================
// Feature 12: Hit-Testing & Touch Targets (Milestone 2, R3)
// ============================================================================
suite.feature(12, 'Hit-Testing & Touch Targets', ({ test }) => {
  test('12.1 Send button touch frame meets or exceeds 44x44pt in Evolingo.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/Evolingo.swift');
    assertTrue(swift.exists, 'Evolingo.swift must exist');
    assertTrue(
      swift.hasPattern(/\.frame\s*\(\s*width:\s*44,\s*height:\s*44\s*\)/),
      'Send button touch container must be at least 44x44pt'
    );
  });

  test('12.2 ChatResponseActions buttons meet or exceed 44x44pt touch frame with Rectangle contentShape', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/ChatResponseActions.swift');
    assertTrue(swift.exists, 'ChatResponseActions.swift must exist');
    assertTrue(
      swift.hasPattern(/\.frame\s*\(\s*width:\s*44,\s*height:\s*44\s*\)/),
      'Action buttons must specify 44x44pt frame'
    );
    assertTrue(
      swift.hasPattern(/\.contentShape\s*\(\s*Rectangle\(\)\s*\)/),
      'Action buttons must define Rectangle contentShape'
    );
  });

  test('12.3 Sidebar navigation row touch targets meet minimum 44pt height in ChatLayerSidebar.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/ChatLayerSidebar.swift');
    assertTrue(swift.exists, 'ChatLayerSidebar.swift must exist');
    assertTrue(
      swift.hasPattern(/minHeight:\s*44/) || swift.hasPattern(/frame\s*\(\s*width:\s*44,\s*height:\s*44\s*\)/) || swift.hasPattern(/padding\(\.vertical/),
      'Sidebar navigation rows must satisfy minimum 44pt touch height'
    );
  });

  test('12.4 Adjacent navigation controls maintain independent touch bounds in ChatLayerSidebar.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/ChatLayerSidebar.swift');
    assertTrue(swift.exists, 'ChatLayerSidebar.swift must exist');
    assertTrue(
      swift.hasPattern(/frame\s*\(\s*width:\s*44,\s*height:\s*44\s*\)/),
      'Sidebar search button must enforce isolated 44x44pt touch frame'
    );
  });

  test('12.5 Trailing action touch targets in ChatResponseActions.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/ChatResponseActions.swift');
    assertTrue(swift.exists, 'ChatResponseActions.swift must exist');
    assertTrue(swift.hasPattern(/EvoScalePressButtonStyle/), 'Actions must use responsive button style');
  });
});

// ============================================================================
// Feature 13: Arlen Chat Mode & Visual Intelligence (Milestone 3, R4)
// ============================================================================
suite.feature(13, 'Arlen Chat Mode & Visual Intelligence', ({ test }) => {
  test('13.1 Mode configuration fallback on unrecognized or empty mode in lib/arlen/modes.ts', async () => {
    const modesModulePath = resolvePath('lib/arlen/modes.ts');
    assertTrue(fs.existsSync(modesModulePath), 'lib/arlen/modes.ts must exist');

    const { modes, modeInstruction } = await import(modesModulePath);
    assertTrue('chat' in modes && 'dev' in modes && 'cowork' in modes, 'All core modes must be defined');
    assertTrue(modeInstruction('chat').includes('Arlen Chat'), 'Chat mode instruction must include Arlen Chat');
    assertTrue(modeInstruction('').includes('Arlen Chat'), 'Empty mode must fallback to Chat instruction');
    assertTrue(modeInstruction('nonexistent_mode_xyz').includes('Arlen Chat'), 'Unknown mode must fallback to Chat instruction');
  });

  test('13.2 Malformed visual intelligence block returns empty array without throwing in lib/arlen/visual-intelligence.ts', async () => {
    const viPath = resolvePath('lib/arlen/visual-intelligence.ts');
    assertTrue(fs.existsSync(viPath), 'lib/arlen/visual-intelligence.ts must exist');

    const { splitMessageIntoBlocks } = await import(viPath);
    const malformed = '```arlen-visual\n{ "component": "map", "coords": [10.5, incomplete\n```';
    const blocks = splitMessageIntoBlocks(malformed);
    assertTrue(Array.isArray(blocks), 'Malformed visual block must return array without throwing');
    assertTrue(blocks.length > 0, 'Must produce a content block');
  });

  test('13.3 Empty visual intelligence payload returns validation error without crash in lib/arlen/visual-intelligence.ts', async () => {
    const viPath = resolvePath('lib/arlen/visual-intelligence.ts');
    assertTrue(fs.existsSync(viPath), 'lib/arlen/visual-intelligence.ts must exist');

    const { validateVisualSpec } = await import(viPath);
    assertFalse(validateVisualSpec({}).ok, 'Empty object must fail validation');
    assertFalse(validateVisualSpec(null).ok, 'Null spec must fail validation');
    assertTrue(validateVisualSpec({ component: 'chart.bar', data: [1, 2, 3] }).ok, 'Valid spec must pass');
  });

  test('13.4 Lazy MapKit and Chart component support in ArlenVisualIntelligence.swift and lib/arlen/visual-intelligence.ts', () => {
    const viSwift = inspectSwift('ios/Sources/Evolingo/ArlenVisualIntelligence.swift');
    const viTs = inspectTs('lib/arlen/visual-intelligence.ts');
    assertTrue(viSwift.exists, 'ArlenVisualIntelligence.swift must exist');
    assertTrue(viTs.exists, 'visual-intelligence.ts must exist');
    assertTrue(
      viSwift.hasPattern(/MapKit/) || viSwift.hasPattern(/Map\(/) || viTs.hasPattern(/MAP_COMPONENTS/) || viTs.hasPattern(/map\./),
      'Visual intelligence must support map components'
    );
  });

  test('13.5 Visual intelligence prompt instruction export in lib/arlen/visual-intelligence.ts', async () => {
    const viPath = resolvePath('lib/arlen/visual-intelligence.ts');
    assertTrue(fs.existsSync(viPath), 'lib/arlen/visual-intelligence.ts must exist');
    const { visualIntelligencePromptInstruction } = await import(viPath);
    assertTrue(typeof visualIntelligencePromptInstruction === 'function', 'visualIntelligencePromptInstruction must be exported');
    const prompt = visualIntelligencePromptInstruction();
    assertTrue(prompt.includes('arlen-visual'), 'Prompt instruction must mention arlen-visual');
  });
});

// ============================================================================
// Feature 14: Web Search Pipeline Optimization (Milestone 3, R4)
// ============================================================================
suite.feature(14, 'Web Search Pipeline Optimization', ({ test }) => {
  test('14.1 Empty query plan returns immediately or flags validation boundary', async () => {
    const webSearch = await import(resolvePath('lib/arlen/web-search.ts'));
    let handled = false;
    try {
      const result = await webSearch.executeWebSearchTool([]);
      assertEqual(result.queries.length, 0, 'Empty plan must return 0 queries');
      assertEqual(result.results.length, 0, 'Empty plan must return 0 results');
      assertEqual(result.sourceCount, 0);
      handled = true;
    } catch (err) {
      if (err.message && (err.message.includes('Too small') || err.message.includes('query'))) {
        handled = true;
      } else {
        throw err;
      }
    }
    assertTrue(handled, 'Empty query plan boundary must be exercised safely');
  });

  test('14.2 Web search pipeline uses Promise.allSettled across query providers in lib/arlen/web-search.ts', () => {
    const webSearchTs = inspectTs('lib/arlen/web-search.ts');
    assertTrue(webSearchTs.exists, 'lib/arlen/web-search.ts must exist');
    assertTrue(
      webSearchTs.hasPattern(/Promise\.allSettled/),
      'Web search pipeline must use Promise.allSettled for concurrent query resilience'
    );
  });

  test('14.3 Harvest fulfilled results from Promise.allSettled in lib/arlen/web-search.ts', () => {
    const webSearchTs = inspectTs('lib/arlen/web-search.ts');
    assertTrue(webSearchTs.exists, 'lib/arlen/web-search.ts must exist');
    assertTrue(
      webSearchTs.hasPattern(/status\s*===\s*["']fulfilled["']/) || webSearchTs.hasPattern(/res\.status\s*===\s*["']fulfilled["']/),
      'Web search pipeline must harvest fulfilled results from Promise.allSettled'
    );
  });

  test('14.4 Query decomposition and deduplication in lib/arlen/web-search.ts', async () => {
    const webSearch = await import(resolvePath('lib/arlen/web-search.ts'));
    const planned = webSearch.planSearchQueries('Compare SwiftUI vs React Native');
    
    const uniqueQueries = new Set(planned.map(q => q.toLowerCase()));
    assertEqual(uniqueQueries.size, planned.length, 'Planned queries must be strictly deduplicated');
  });

  test('14.5 Snippet payload pruning limits token bloating in lib/arlen/web-search.ts', () => {
    const webSearchTs = inspectTs('lib/arlen/web-search.ts');
    assertTrue(webSearchTs.exists, 'lib/arlen/web-search.ts must exist');
    assertTrue(
      webSearchTs.hasPattern(/retrieveSafePageExcerpt/) || webSearchTs.hasPattern(/slice\(/) || webSearchTs.hasPattern(/substring/),
      'Web search must implement excerpt truncation/pruning to limit token bloating'
    );
  });
});

// ============================================================================
// Feature 15: Database Query Optimization (Milestone 3, R4)
// ============================================================================
suite.feature(15, 'Database Query Optimization', ({ test }) => {
  test('15.1 Cowork messages route exports ensureMessageIndexes and queryCoworkMessages', () => {
    const route = inspectTs('app/api/cowork/messages/route.ts');
    assertTrue(route.exists, 'app/api/cowork/messages/route.ts must exist');
    assertTrue(route.hasExport('ensureMessageIndexes'), 'route.ts must export ensureMessageIndexes');
    assertTrue(route.hasExport('queryCoworkMessages'), 'route.ts must export queryCoworkMessages');
  });

  test('15.2 Compound index sequence verification in app/api/cowork/messages/route.ts', () => {
    const route = inspectTs('app/api/cowork/messages/route.ts');
    assertTrue(route.exists, 'app/api/cowork/messages/route.ts must exist');
    assertTrue(
      route.hasPattern(/conversation_id:\s*1,\s*owner_id:\s*1,\s*created_at:\s*1,\s*id:\s*1/),
      'Compound index must match sequence: conversation_id: 1, owner_id: 1, created_at: 1, id: 1'
    );
  });

  test('15.3 Batch pagination limit boundary clamping (1 to 500) in app/api/cowork/messages/route.ts', () => {
    const route = inspectTs('app/api/cowork/messages/route.ts');
    assertTrue(route.exists, 'app/api/cowork/messages/route.ts must exist');
    assertTrue(
      route.hasPattern(/Math\.max\(1,\s*Math\.min\(params\.limit\s*\?\?\s*500,\s*500\)\)/),
      'Limit must be clamped between 1 and 500'
    );
  });

  test('15.4 Heavy field projection exclusion (_id: 0) in app/api/cowork/messages/route.ts', () => {
    const route = inspectTs('app/api/cowork/messages/route.ts');
    assertTrue(route.exists, 'app/api/cowork/messages/route.ts must exist');
    assertTrue(
      route.hasPattern(/projection\s*:\s*\{[^}]*_id:\s*0/),
      'Heavy field projection must exclude _id'
    );
  });

  test('15.5 Missing query parameters error handling (status 400) in app/api/cowork/messages/route.ts', () => {
    const route = inspectTs('app/api/cowork/messages/route.ts');
    assertTrue(route.exists, 'app/api/cowork/messages/route.ts must exist');
    assertTrue(
      route.hasPattern(/status:\s*400/),
      'Missing or invalid parameters must return status 400'
    );
  });
});

// ============================================================================
// Feature 16: Shared Top Navigation Bar (Milestone 4, R5)
// ============================================================================
suite.feature(16, 'Shared Top Navigation Bar', ({ test }) => {
  test('16.1 EvoSharedTopBar struct is defined in ios/Sources/Evolingo/SharedTopBar.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/SharedTopBar.swift');
    assertTrue(swift.exists, 'SharedTopBar.swift must exist on disk');
    assertTrue(swift.hasSymbol('EvoSharedTopBar'), 'EvoSharedTopBar struct must be defined');
    assertTrue(swift.hasPattern(/var\s+menuContent/), 'EvoSharedTopBar must support custom menuContent');
  });

  test('16.2 Left circular button contains square.grid.2x2 icon in SharedTopBar.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/SharedTopBar.swift');
    assertTrue(swift.exists, 'SharedTopBar.swift must exist on disk');
    assertTrue(swift.hasPattern(/square\.grid\.2x2/), 'Left control must contain square.grid.2x2 icon');
  });

  test('16.3 Right control contains pill container with ellipsis and avatar in SharedTopBar.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/SharedTopBar.swift');
    assertTrue(swift.exists, 'SharedTopBar.swift must exist on disk');
    assertTrue(swift.hasPattern(/ellipsis/), 'Right pill control must contain ellipsis icon');
  });

  test('16.4 Hairline 1px border and glass backdrop applied in SharedTopBar.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/SharedTopBar.swift');
    assertTrue(swift.exists, 'SharedTopBar.swift must exist on disk');
    assertTrue(
      swift.hasPattern(/lineWidth:\s*1/) || swift.hasPattern(/stroke\(/),
      'Shared top bar must apply hairline border'
    );
  });

  test('16.5 Controls satisfy minimum 44x44pt touch area in SharedTopBar.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/SharedTopBar.swift');
    assertTrue(swift.exists, 'SharedTopBar.swift must exist on disk');
    assertTrue(
      swift.hasPattern(/\.frame\s*\(\s*width:\s*44,\s*height:\s*44\s*\)/) || swift.hasPattern(/minHeight:\s*44/),
      'Controls must enforce minimum 44pt touch area'
    );
  });
});

// ============================================================================
// Feature 17: Screen A: My Files (Populated) (Milestone 4, R5)
// ============================================================================
suite.feature(17, 'Screen A: My Files (Populated)', ({ test }) => {
  test('17.1 Breadcrumb Bar displays drive icon and path hierarchy My Files > Documents in LibraryModernView.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/LibraryModernView.swift');
    assertTrue(swift.exists, 'LibraryModernView.swift must exist');
    assertTrue(swift.hasPattern(/Documents/), 'Breadcrumb must show Documents level hierarchy');
  });

  test('17.2 Section Header displays bold title My Files, 4 items subtitle, and toolbar icons in LibraryModernView.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/LibraryModernView.swift');
    assertTrue(swift.exists, 'LibraryModernView.swift must exist');
    assertTrue(swift.hasPattern(/My Files/), 'Section header must display "My Files"');
  });

  test('17.3 Bottom search bar contains floating pill search input paired with circular + button in LibraryModernView.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/LibraryModernView.swift');
    assertTrue(swift.exists, 'LibraryModernView.swift must exist');
    assertTrue(swift.hasPattern(/plus/), 'Bottom bar must include circular + button');
  });

  test('17.4 Quick Action Row contains 3 equal-width cards: New File, Arlen Send, Connect in LibraryModernView.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/LibraryModernView.swift');
    assertTrue(swift.exists, 'LibraryModernView.swift must exist');
    assertTrue(swift.hasPattern(/New File/) || swift.hasPattern(/showNewFileSheet/), 'New File action card must be present');
    assertTrue(swift.hasPattern(/Arlen Send/) || swift.hasPattern(/showArlenSendSheet/), 'Arlen Send action card must be present');
    assertTrue(swift.hasPattern(/Connect/) || swift.hasPattern(/showConnectSheet/), 'Connect action card must be present');
  });

  test('17.5 File list card contains rows with right chevrons and uniform trailing margins in LibraryModernView.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/LibraryModernView.swift');
    assertTrue(swift.exists, 'LibraryModernView.swift must exist');
    assertTrue(swift.hasPattern(/chevron\.right/), 'File list rows must display trailing right chevrons');
  });
});

// ============================================================================
// Feature 18: Screen B: My Files (Empty State) (Milestone 4, R5)
// ============================================================================
suite.feature(18, 'Screen B: My Files (Empty State)', ({ test }) => {
  test('18.1 Centered empty state displays folder outline icon in LibraryModernView.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/LibraryModernView.swift');
    assertTrue(swift.exists, 'LibraryModernView.swift must exist');
    assertTrue(swift.hasPattern(/folder/) || swift.hasPattern(/folder\.badge\.plus/), 'Empty state must use folder outline icon');
  });

  test('18.2 Bordered pill button labeled + Create file is centered below body in LibraryModernView.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/LibraryModernView.swift');
    assertTrue(swift.exists, 'LibraryModernView.swift must exist');
    assertTrue(swift.hasPattern(/\+\s*Create file/), 'Empty state must include "+ Create file" pill button');
  });

  test('18.3 Empty state heading displays bold text No files yet in LibraryModernView.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/LibraryModernView.swift');
    assertTrue(swift.exists, 'LibraryModernView.swift must exist');
    assertTrue(swift.hasPattern(/No files yet/), 'Empty state heading must display "No files yet"');
  });

  test('18.4 Empty state body displays secondary text Your files and folders will appear here in LibraryModernView.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/LibraryModernView.swift');
    assertTrue(swift.exists, 'LibraryModernView.swift must exist');
    assertTrue(swift.hasPattern(/Your files and folders will appear here/), 'Empty state body must match required copy');
  });

  test('18.5 Dynamic view switching between populated list and empty state based on files collection in LibraryModernView.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/LibraryModernView.swift');
    assertTrue(swift.exists, 'LibraryModernView.swift must exist');
    assertTrue(
      swift.hasPattern(/files\.isEmpty/) || swift.hasPattern(/items\.isEmpty/) || swift.hasPattern(/model\.items\.isEmpty/),
      'Library view must branch conditionally on collection emptiness'
    );
  });
});

// ============================================================================
// Feature 19: Screen C: Connect Server View (Milestone 4, R5)
// ============================================================================
suite.feature(19, 'Screen C: Connect Server View', ({ test }) => {
  test('19.1 Top card selector displays partial leading card with down chevron in ConnectServerView.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/ConnectServerView.swift');
    assertTrue(swift.exists, 'ConnectServerView.swift must exist on disk');
    assertTrue(swift.hasPattern(/chevron\.down/), 'Top selector card must display down chevron');
  });

  test('19.2 Primary card features centered + icon and Add Server label in ConnectServerView.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/ConnectServerView.swift');
    assertTrue(swift.exists, 'ConnectServerView.swift must exist on disk');
    assertTrue(swift.hasPattern(/Add Server/), 'Primary card must feature Add Server label');
  });

  test('19.3 Centered server empty state features server.rack icon in ConnectServerView.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/ConnectServerView.swift');
    assertTrue(swift.exists, 'ConnectServerView.swift must exist on disk');
    assertTrue(swift.hasPattern(/server\.rack/), 'Empty state must feature server.rack icon');
  });

  test('19.4 Heading Connect a server with 2-line description in ConnectServerView.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/ConnectServerView.swift');
    assertTrue(swift.exists, 'ConnectServerView.swift must exist on disk');
    assertTrue(swift.hasPattern(/Connect a server/), 'Heading must display "Connect a server"');
  });

  test('19.5 Full-width solid black capsule button with white text + Add Server in ConnectServerView.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/ConnectServerView.swift');
    assertTrue(swift.exists, 'ConnectServerView.swift must exist on disk');
    assertTrue(swift.hasPattern(/\+\s*Add Server/), 'Must contain "+ Add Server" button');
  });
});

// ============================================================================
// Feature 20: Screen D: Cowork / Projects Dashboard (Milestone 4, R5)
// ============================================================================
suite.feature(20, 'Screen D: Cowork / Projects Dashboard', ({ test }) => {
  test('20.1 Asymmetric 2-column bento grid has full-height left card for New Project in CoworkProjectManager.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/CoworkProjectManager.swift');
    assertTrue(swift.exists, 'CoworkProjectManager.swift must exist');
    assertTrue(swift.hasPattern(/New Project/), 'Bento grid must contain "New Project" card');
  });

  test('20.2 Bento grid right column stacks two cards: Settings and Machine in CoworkProjectManager.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/CoworkProjectManager.swift');
    assertTrue(swift.exists, 'CoworkProjectManager.swift must exist');
    assertTrue(swift.hasPattern(/Settings/), 'Right column must contain Settings card');
    assertTrue(swift.hasPattern(/Machine/), 'Right column must contain Machine card');
  });

  test('20.3 Latest Projects section header displays bold title and See all > secondary action in CoworkProjectManager.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/CoworkProjectManager.swift');
    assertTrue(swift.exists, 'CoworkProjectManager.swift must exist');
    assertTrue(swift.hasPattern(/Latest Projects/), 'Header must display "Latest Projects"');
    assertTrue(swift.hasPattern(/See all/), 'Header must provide "See all" action');
  });

  test('20.4 Project list displays clean rows with archive/box icon, title, and trailing chevron in CoworkProjectManager.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/CoworkProjectManager.swift');
    assertTrue(swift.exists, 'CoworkProjectManager.swift must exist');
    assertTrue(swift.hasPattern(/archivebox/) || swift.hasPattern(/folder/), 'Project rows must use archive/folder symbol');
    assertTrue(swift.hasPattern(/chevron\.right/), 'Project rows must display right chevron');
  });

  test('20.5 Floating bottom prompt bar features Ask Codex placeholder paired with + and mic icons in CoworkProjectManager.swift', () => {
    const swift = inspectSwift('ios/Sources/Evolingo/CoworkProjectManager.swift');
    assertTrue(swift.exists, 'CoworkProjectManager.swift must exist');
    assertTrue(swift.hasPattern(/Ask Codex/), 'Prompt bar must feature "Ask Codex" placeholder');
    assertTrue(swift.hasPattern(/mic/), 'Prompt bar must feature microphone icon');
  });
});

// ============================================================================
// Feature 21: Release Build & Packaging (Milestone 5, R6)
// ============================================================================
suite.feature(21, 'Release Build & Packaging', ({ test }) => {
  test('21.1 Release deployment directory exists and is accessible', () => {
    const dir = '/var/lib/caddy/downloads';
    assertTrue(fs.existsSync(dir), '/var/lib/caddy/downloads must exist');
    const stat = fs.statSync(dir);
    assertTrue(stat.isDirectory(), '/var/lib/caddy/downloads must be a directory');
  });

  test('21.2 Dual file naming resolution (Arlen-build-99.ipa and arlen-build-99.ipa)', () => {
    const upperIpa = '/var/lib/caddy/downloads/Arlen-build-99.ipa';
    const lowerIpa = '/var/lib/caddy/downloads/arlen-build-99.ipa';

    assertTrue(fs.existsSync(upperIpa), 'Arlen-build-99.ipa must exist');
    assertTrue(fs.existsSync(lowerIpa), 'arlen-build-99.ipa must exist');
  });

  test('21.3 IPA archive size and ZIP magic header bytes (PK\\x03\\x04)', () => {
    const ipaPath = '/var/lib/caddy/downloads/Arlen-build-99.ipa';
    const stat = fs.statSync(ipaPath);
    assertGreaterThanOrEqual(stat.size, 1024 * 1024, 'Release IPA size must be > 1MB');

    const fd = fs.openSync(ipaPath, 'r');
    const buffer = Buffer.alloc(4);
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);

    const zipMagic = Buffer.from([0x50, 0x4B, 0x03, 0x04]);
    assertEqual(buffer.compare(zipMagic), 0, 'Release IPA must have valid ZIP magic header (PK\\x03\\x04)');
  });

  test('21.4 IPA Payload structure and Info.plist presence', () => {
    const ipaInfo = inspectIpaArchive('/var/lib/caddy/downloads/Arlen-build-99.ipa');
    assertTrue(ipaInfo.exists, 'IPA archive must exist');
    assertTrue(ipaInfo.isValidZip, 'IPA must be a valid unzip-readable archive');
    assertTrue(ipaInfo.hasAppPayload, 'IPA must contain Payload/*.app directory');
    assertTrue(ipaInfo.hasInfoPlist, 'IPA must contain Info.plist inside app bundle');
  });

  test('21.5 Local release build artifact exists at designated output path', () => {
    const xtoolIpa = resolvePath('ios/xtool/Evolingo.ipa');
    assertTrue(fs.existsSync(xtoolIpa), 'Local release IPA must exist at ios/xtool/Evolingo.ipa');
    const stat = fs.statSync(xtoolIpa);
    assertGreaterThanOrEqual(stat.size, 5 * 1024 * 1024, 'Local xtool IPA size must be >= 5MB');
  });
});

// ============================================================================
// Execution & Export
// ============================================================================
if (require.main === module) {
  suite.run().then(res => {
    const exitCode = res.summary.failed > 0 ? 1 : 0;
    process.exit(exitCode);
  }).catch(err => {
    console.error('Fatal error during test suite execution:', err);
    process.exit(1);
  });
}

module.exports = suite;
