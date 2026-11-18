import Animated, { cancelAnimation, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useState } from 'react';
import {
  useWindowDimensions,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors, Radii } from './src/theme/tokens';
import {
  ChatSession,
  EvolingoRoute,
  LayeredSidebar,
} from './src/components/LayeredSidebar';
import { ChatScreen } from './src/screens/ChatScreen';
import { LibraryItem, LibraryScreen } from './src/screens/LibraryScreen';
import { EvolingoTask, ScheduleScreen } from './src/screens/ScheduleScreen';
import { SpaceScreen } from './src/screens/SpaceScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import {
  CodexScreen,
  ExploreScreen,
  ProjectsScreen,
} from './src/screens/SubScreens';

// Sidebar occupies ~76% of screen width, leaving ~24% of active foreground screen visible

const INITIAL_SESSIONS: ChatSession[] = [
  {
    id: 'pinned-1',
    title: 'Unify Profile Navigation',
    pinned: true,
    updatedAt: Date.now() - 3600_000,
    messages: [
      {
        id: 'p-1',
        role: 'assistant',
        content:
          'Az egységesített fejléc (EvolingoHeader) minden képernyőn a bal oldali rácsgombot és a jobb oldali profilkapszulát használja.',
      },
    ],
  },
  {
    id: 'recent-1',
    title: 'Create Demo Settings Tab',
    updatedAt: Date.now() - 120_000,
    messages: [
      {
        id: 'm-1',
        role: 'assistant',
        content:
          'Igen, működik. 🙂 Ha ez a hatodik teszt volt, akkor a rendszer stabil — most már jöhetne valami igazi kérdés is, szívesen foglalkozom bármivel.',
      },
    ],
  },
  {
    id: 'recent-2',
    title: 'Gabbira írás magyarázata',
    updatedAt: Date.now() - 1800_000,
    messages: [
      {
        id: 'm-2',
        role: 'assistant',
        content:
          'A kifejezés kontextusát és nyelvjárási hátterét részletesen összefoglaltam.',
      },
    ],
  },
  {
    id: 'recent-3',
    title: 'Free AI Providers Comparison',
    updatedAt: Date.now() - 5400_000,
    messages: [],
  },
  {
    id: 'recent-4',
    title: 'Cloudflare Free Requests Esti...',
    updatedAt: Date.now() - 7200_000,
    messages: [],
  },
  {
    id: 'recent-5',
    title: 'Ajándék ötlet javaslat',
    updatedAt: Date.now() - 9600_000,
    messages: [],
  },
  {
    id: 'recent-6',
    title: 'Szoknya románul',
    updatedAt: Date.now() - 14400_000,
    messages: [],
  },
];

const INITIAL_TASKS: EvolingoTask[] = [
  {
    id: 'task-1',
    title: 'Research project',
    subtitle: 'Running · Long-running',
    status: 'active',
    kind: 'long',
    iconKind: 'search',
    currentStep: 3,
    totalSteps: 5,
    stepDetail: 'Analyzing sources',
  },
  {
    id: 'task-2',
    title: 'Free Twitch Badges',
    subtitle: 'Daily · Monitoring',
    status: 'active',
    kind: 'recurring',
    iconKind: 'award',
  },
  {
    id: 'task-3',
    title: 'Napi szókincs ismétlés',
    subtitle: 'Szüneteltetve · Reggel 8:00',
    status: 'paused',
    kind: 'recurring',
    iconKind: 'clock',
  },
  {
    id: 'task-4',
    title: 'Irodalomkutatás összegzése',
    subtitle: 'Befejezve · 12 forrás feldolgozva',
    status: 'completed',
    kind: 'long',
    iconKind: 'search',
    currentStep: 5,
    totalSteps: 5,
    stepDetail: 'Completed',
  },
];

const INITIAL_LIBRARY_ITEMS: LibraryItem[] = [
  {
    id: 'lib-1',
    title: 'Erasmus',
    subtitle: '8 elem',
    kind: 'folder',
    parentId: null,
  },
  {
    id: 'lib-2',
    title: 'Biológia',
    subtitle: '12 elem',
    kind: 'folder',
    parentId: null,
  },
  {
    id: 'lib-3',
    title: 'Történelem',
    subtitle: '4 elem',
    kind: 'folder',
    parentId: null,
  },
  {
    id: 'lib-4',
    title: 'Angol nyelvtan.pdf',
    subtitle: 'PDF · 2,4 MB',
    kind: 'file',
    parentId: null,
    content:
      'Angol nyelvtani összefoglaló — igeidők, feltételes mód és kötőszavak.',
  },
  {
    id: 'lib-5',
    title: 'Tanulási jegyzetek',
    subtitle: 'Jegyzet',
    kind: 'note',
    parentId: null,
    content: 'Kulcsfogalmak és vizsgafeladatok gyűjteménye.',
  },
  {
    id: 'lib-erasmus-1',
    title: 'Motivációs levél.pdf',
    subtitle: 'PDF · 840 KB',
    kind: 'file',
    parentId: 'lib-1',
  },
  {
    id: 'lib-bio-1',
    title: 'Sejtbiológia jegyzet',
    subtitle: 'Jegyzet',
    kind: 'note',
    parentId: 'lib-2',
  },
];

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeRoute, setActiveRoute] = useState<EvolingoRoute>('chat');
  const [profilePhotoUri, setProfilePhotoUri] = useState<string>();
  const [userName, setUserName] = useState('David Miller');
  const [isStreaming, setIsStreaming] = useState(false);

  const [sessions, setSessions] = useState<ChatSession[]>(INITIAL_SESSIONS);
  const [currentSessionId, setCurrentSessionId] = useState('recent-1');
  const [tasks, setTasks] = useState<EvolingoTask[]>(INITIAL_TASKS);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>(
    INITIAL_LIBRARY_ITEMS
  );

  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(320, Math.round(width * 0.76));
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const dragStart = useSharedValue(0);
  const target = useSharedValue(false);
  const dragging = useSharedValue(false);

  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const commitSidebar = useCallback((open: boolean, changed: boolean) => {
    if (changed && hapticsEnabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSidebarOpen(open);
  }, [hapticsEnabled]);

  const animateSidebar = useCallback((open: boolean) => {
    const changed = open !== target.get();
    target.set(open);
    progress.set(withSpring(open ? 1 : 0, DRAWER_SPRING));
    commitSidebar(open, changed);
  }, [commitSidebar, progress, target]);

  const drawerGesture = useMemo(() => Gesture.Pan()
    .enabled(!reducedMotion)
    .activeOffsetX([-10, 10])
    .failOffsetY([-18, 18])
    .onTouchesDown((event, manager) => {
      if (!target.get() && (event.allTouches[0]?.absoluteX ?? Infinity) > 32) manager.fail();
    })
    .onStart(() => {
      dragging.set(true);
      cancelAnimation(progress);
      dragStart.set(progress.get());
    })
    .onUpdate(({ translationX }) => {
      progress.set(Math.max(0, Math.min(1, dragStart.get() + translationX / drawerWidth)));
    })
    .onEnd(({ velocityX }) => {
      const open = Math.abs(velocityX) > 380 ? velocityX > 0 : progress.get() > 0.5;
      const changed = open !== target.get();
      target.set(open);
      progress.set(withSpring(open ? 1 : 0, { ...DRAWER_SPRING, velocity: velocityX / drawerWidth }));
      scheduleOnRN(commitSidebar, open, changed);
    })
    .onFinalize((_event, succeeded) => {
      if (!succeeded && dragging.get()) progress.set(withSpring(target.get() ? 1 : 0, DRAWER_SPRING));
      dragging.set(false);
    }), [commitSidebar, dragStart, dragging, drawerWidth, progress, reducedMotion, target]);

  const sidebarMotion = useAnimatedStyle(() => ({
    opacity: 0.7 + progress.get() * 0.3,
    transform: [{ translateX: reducedMotion ? 0 : (progress.get() - 1) * 18 }],
  }));
  const foregroundMotion = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.get() * drawerWidth }],
  }));

  const currentSession =
    sessions.find((s) => s.id === currentSessionId) || sessions[0];

  const handleNewChat = () => {
    const newId = `session-${Date.now()}`;
    const nextSession: ChatSession = {
      id: newId,
      title: 'Új beszélgetés',
      updatedAt: Date.now(),
      messages: [],
    };
    setSessions((prev) => [nextSession, ...prev]);
    setCurrentSessionId(newId);
    setActiveRoute('chat');
    animateSidebar(false);
  };

  const handleClearChat = () => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSession.id ? { ...s, messages: [] } : s
      )
    );
  };

  const handleTogglePinSession = useCallback((id: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s))
    );
  }, []);

  const handleDeleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      if (remaining.length === 0) {
        const fallback: ChatSession = {
          id: `session-${Date.now()}`,
          title: 'Új beszélgetés',
          updatedAt: Date.now(),
          messages: [],
        };
        setCurrentSessionId(fallback.id);
        return [fallback];
      }
      if (id === currentSessionId) {
        setCurrentSessionId(remaining[0].id);
      }
      return remaining;
    });
  }, [currentSessionId]);

  const selectSession = useCallback((id: string) => {
    setCurrentSessionId(id);
    setActiveRoute('chat');
    animateSidebar(false);
  }, [animateSidebar]);

  const handleSendMessage = async (text: string) => {
    const userMsgId = `u-${Date.now()}`;
    const aiMsgId = `a-${Date.now() + 1}`;

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== currentSession.id) return s;
        const updatedTitle =
          s.messages.length === 0 ? text.slice(0, 38) : s.title;
        return {
          ...s,
          title: updatedTitle,
          updatedAt: Date.now(),
          messages: [
            ...s.messages,
            { id: userMsgId, role: 'user', content: text },
          ],
        };
      })
    );

    setIsStreaming(true);
    try {
      const response = await fetch('https://api.sycord.site/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...currentSession.messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            { role: 'user', content: text },
          ],
          mode: 'auto',
        }),
      });

      const raw = await response.text();
      let reply = '';
      for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
          const payload = trimmed.slice(5).trim();
          if (payload === '[DONE]') break;
          try {
            const parsed = JSON.parse(payload);
            const delta =
              parsed.choices?.[0]?.delta?.content ??
              parsed.content ??
              parsed.text ??
              '';
            reply += delta;
          } catch {
            // ignore non-json lines
          }
        }
      }
      if (!reply.trim()) {
        reply = raw.trim() || 'Rendben, miben segíthetek még?';
      }

      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSession.id
            ? {
                ...s,
                updatedAt: Date.now(),
                messages: [
                  ...s.messages,
                  { id: aiMsgId, role: 'assistant', content: reply.trim() },
                ],
              }
            : s
        )
      );
    } catch {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSession.id
            ? {
                ...s,
                messages: [
                  ...s.messages,
                  {
                    id: aiMsgId,
                    role: 'assistant',
                    content:
                      'Kapcsolati hiba történt. Kérlek ellenőrizd az internetkapcsolatot.',
                  },
                ],
              }
            : s
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleAddLibraryItem = (item: Omit<LibraryItem, 'id'>) => {
    setLibraryItems((prev) => [{ ...item, id: `lib-${Date.now()}` }, ...prev]);
  };

  const handleDeleteLibraryItem = (id: string) => {
    setLibraryItems((prev) =>
      prev.filter((item) => item.id !== id && item.parentId !== id)
    );
  };

  const handleUpdateLibraryItem = (id: string, content: string) => {
    setLibraryItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, content } : item))
    );
  };

  const renderActiveScreen = () => {
    const toggleSidebar = () => animateSidebar(!sidebarOpen);
    const openProfile = () => {
      setActiveRoute('profile');
      animateSidebar(false);
    };

    switch (activeRoute) {
      case 'chat':
        return (
          <ChatScreen
            session={currentSession}
            userName={userName}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={toggleSidebar}
            onOpenProfile={openProfile}
            onSendMessage={handleSendMessage}
            onNewChat={handleNewChat}
            onClearChat={handleClearChat}
            isStreaming={isStreaming}
            onStopStreaming={() => setIsStreaming(false)}
          />
        );
      case 'schedule':
        return (
          <ScheduleScreen
            tasks={tasks}
            onUpdateTasks={setTasks}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={toggleSidebar}
            onOpenProfile={openProfile}
            userName={userName}
          />
        );
      case 'library':
        return (
          <LibraryScreen
            onOpenSidebar={toggleSidebar}
            onOpenProfile={openProfile}
            isSidebarOpen={sidebarOpen}
            items={libraryItems}
            onAddItem={handleAddLibraryItem}
            onDeleteItem={handleDeleteLibraryItem}
            onUpdateItem={handleUpdateLibraryItem}
          />
        );
      case 'projects':
        return (
          <ProjectsScreen
            onOpenSidebar={toggleSidebar}
            onOpenProfile={openProfile}
            isSidebarOpen={sidebarOpen}
            onStartPrompt={(prompt) => {
              setActiveRoute('chat');
              handleSendMessage(prompt);
            }}
          />
        );
      case 'codex':
        return (
          <CodexScreen
            onOpenSidebar={toggleSidebar}
            onOpenProfile={openProfile}
            isSidebarOpen={sidebarOpen}
            onStartPrompt={(prompt) => {
              setActiveRoute('chat');
              handleSendMessage(prompt);
            }}
          />
        );
      case 'plugins':
        return (
          <SpaceScreen
            onOpenSidebar={toggleSidebar}
            onOpenProfile={openProfile}
            isSidebarOpen={sidebarOpen}
            userName={userName}
            onStartPrompt={(prompt) => {
              setActiveRoute('chat');
              handleSendMessage(prompt);
            }}
          />
        );
      case 'profile':
        return (
          <ProfileScreen
            onBack={() => setActiveRoute('chat')}
            userName={userName}
            onUpdateUserName={setUserName}
            photoUri={profilePhotoUri}
            onChangePhoto={setProfilePhotoUri}
            hapticsEnabled={hapticsEnabled}
            onChangeHaptics={setHapticsEnabled}
          />
        );
    }
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
      <GestureDetector gesture={drawerGesture}>
      <View style={styles.root}>
        <StatusBar style="dark" />

        {/* Secondary Layer: Off-Canvas Sidebar */}
        <Animated.View
          style={[
            styles.secondaryLayer,
            { width: drawerWidth },
            sidebarMotion,
          ]}
          pointerEvents={sidebarOpen ? 'auto' : 'none'}
          accessibilityElementsHidden={!sidebarOpen}
          importantForAccessibility={sidebarOpen ? 'auto' : 'no-hide-descendants'}
        >
          <LayeredSidebar
            sessions={sessions}
            currentSessionId={currentSession.id}
            activeRoute={activeRoute}
            userName={userName}
            onNavigate={(route) => {
              setActiveRoute(route);
              animateSidebar(false);
            }}
            onSelectSession={selectSession}
            onTogglePinSession={handleTogglePinSession}
            onDeleteSession={handleDeleteSession}
            onNewChat={handleNewChat}
            onClose={() => animateSidebar(false)}
          />
        </Animated.View>

        {/* Top Foreground Layer: Active Screen */}
        <Animated.View
          style={[
            styles.topLayer,
            foregroundMotion,
            sidebarOpen && styles.openCorners,
          ]}
        >
          <View
            style={styles.topLayerClip}
            pointerEvents={sidebarOpen ? 'none' : 'auto'}
          >
            {renderActiveScreen()}
          </View>

          {sidebarOpen && (
            <TouchableWithoutFeedback
              onPress={() => animateSidebar(false)}
              accessibilityRole="button"
              accessibilityLabel="Oldalsáv bezárása"
            >
              <View style={StyleSheet.absoluteFill} />
            </TouchableWithoutFeedback>
          )}
        </Animated.View>
      </View>
      </GestureDetector>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const DRAWER_SPRING = { duration: 300, dampingRatio: 0.8, overshootClamping: true, reduceMotion: ReduceMotion.System };

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  secondaryLayer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  topLayer: {
    flex: 1,
    backgroundColor: Colors.background,
    shadowColor: '#000000',
    shadowOffset: { width: -6, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 10,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    overflow: 'hidden',
  },
  openCorners: {
    borderTopLeftRadius: Radii.foregroundSheet,
    borderBottomLeftRadius: Radii.foregroundSheet,
  },
  topLayerClip: {
    flex: 1,
  },
});
