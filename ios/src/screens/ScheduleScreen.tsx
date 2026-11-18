import { showActions } from '../components/action-sheet';
import { FlashList } from '@shopify/flash-list';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import {
  Search,
  Award,
  Clock,
  Ellipsis,
  Workflow,
  Plus,
  X,
  Check,
  Play,
  Pause,
  Trash2,
  Sliders,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EvoTheme } from '../theme/tokens';
import { EvolingoHeader } from '../components/EvolingoHeader';
import { LiquidGlassComposer, ChatMode } from '../components/LiquidGlassComposer';

export type TaskStatusTab = 'active' | 'paused' | 'completed';

export interface EvolingoTask {
  id: string;
  title: string;
  subtitle: string;
  status: TaskStatusTab;
  kind: 'long' | 'recurring';
  iconKind: 'search' | 'award' | 'clock';
  currentStep?: number;
  totalSteps?: number;
  stepDetail?: string;
}

interface ScheduleScreenProps {
  tasks: EvolingoTask[];
  onUpdateTasks: React.Dispatch<React.SetStateAction<EvolingoTask[]>>;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenProfile: () => void;
  userName?: string;
  onStartPrompt?: (prompt: string) => void;
}

const STATUS_TABS: Array<{ key: TaskStatusTab; label: string }> = [
  { key: 'active', label: 'Active' },
  { key: 'paused', label: 'Paused' },
  { key: 'completed', label: 'Completed' },
];

export const ScheduleScreen: React.FC<ScheduleScreenProps> = ({
  tasks,
  onUpdateTasks,
  sidebarOpen,
  onToggleSidebar,
  onOpenProfile,
  userName = 'David Miller',
  onStartPrompt,
}) => {
  const insets = useSafeAreaInsets();
  const [selectedTab, setSelectedTab] = useState<TaskStatusTab>('active');
  const [composerText, setComposerText] = useState('');
  const [activeMode, setActiveMode] = useState<ChatMode>('Tutor');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // New Task Modal state
  const [createModalKind, setCreateModalKind] = useState<'long' | 'recurring' | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSubtitle, setNewTaskSubtitle] = useState('');

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const visibleTasks = tasks.filter((t) => t.status === selectedTab);

  const handleTaskMenu = React.useCallback((task: EvolingoTask) => {
    const actions: Array<{
      text: string;
      style?: 'default' | 'cancel' | 'destructive';
      onPress?: () => void;
    }> = [];

    if (task.kind === 'long' && (task.currentStep || 1) < (task.totalSteps || 5)) {
      actions.push({
        text: 'Advance to Next Step',
        onPress: () => {
          onUpdateTasks((prev) =>
            prev.map((item) => {
              if (item.id !== task.id) return item;
              const nextStep = Math.min(item.totalSteps || 5, (item.currentStep || 1) + 1);
              const isDone = nextStep >= (item.totalSteps || 5);
              return {
                ...item,
                currentStep: nextStep,
                status: isDone ? 'completed' : item.status,
                stepDetail: isDone ? 'Completed' : `Step ${nextStep} in progress`,
              };
            })
          );
        },
      });
    }

    if (task.status === 'active') {
      actions.push({
        text: 'Pause Task',
        onPress: () => {
          onUpdateTasks((prev) =>
            prev.map((item) =>
              item.id === task.id ? { ...item, status: 'paused' } : item
            )
          );
        },
      });
    } else if (task.status === 'paused') {
      actions.push({
        text: 'Resume Task',
        onPress: () => {
          onUpdateTasks((prev) =>
            prev.map((item) =>
              item.id === task.id ? { ...item, status: 'active' } : item
            )
          );
        },
      });
    }

    if (task.status !== 'completed') {
      actions.push({
        text: 'Mark as Completed',
        onPress: () => {
          onUpdateTasks((prev) =>
            prev.map((item) =>
              item.id === task.id ? { ...item, status: 'completed' } : item
            )
          );
        },
      });
    }

    actions.push({
      text: 'Delete Task',
      style: 'destructive',
      onPress: () => {
        onUpdateTasks((prev) => prev.filter((item) => item.id !== task.id));
      },
    });

    actions.push({ text: 'Cancel', style: 'cancel' });

    showActions(task.title, task.subtitle, actions);
  }, [onUpdateTasks]);

  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Required Field', 'Please enter a task title.');
      return;
    }

    const newTask: EvolingoTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      subtitle:
        newTaskSubtitle.trim() ||
        (createModalKind === 'long'
          ? 'Running · Multi-step background agent'
          : 'Daily · Automated recurring task'),
      status: 'active',
      kind: createModalKind || 'long',
      iconKind: createModalKind === 'long' ? 'search' : 'clock',
      currentStep: createModalKind === 'long' ? 1 : undefined,
      totalSteps: createModalKind === 'long' ? 5 : undefined,
      stepDetail: createModalKind === 'long' ? 'Step 1 of 5 · Initializing' : undefined,
    };

    onUpdateTasks((prev) => [newTask, ...prev]);
    setNewTaskTitle('');
    setNewTaskSubtitle('');
    setCreateModalKind(null);
    setSelectedTab('active');
  };

  const handleSendPrompt = () => {
    const text = composerText.trim();
    if (!text) return;
    Keyboard.dismiss();
    setComposerText('');
    onStartPrompt?.(text);
  };

  return (
    <View style={styles.container}>
      {/* Top Safe Area & EvolingoHeader with 58pt spacing */}
      <View style={{ paddingTop: Math.max(insets.top, 58) }}>
        <EvolingoHeader
          sidebarOpen={sidebarOpen}
          onToggleSidebar={onToggleSidebar}
          onOpenProfile={onOpenProfile}
          userName={userName}
        />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Status Segmented Control matching reference */}
        <View style={styles.tabBar}>
          {STATUS_TABS.map((tab) => {
            const isSelected = selectedTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabButton, isSelected && styles.tabButtonActive]}
                onPress={() => setSelectedTab(tab.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    isSelected && styles.tabLabelActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.hairlineDivider} />

        {/* Task Cards List */}
        <FlashList
          data={visibleTasks}
          keyExtractor={(task) => task.id}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={styles.emptyState}>
              <Clock size={32} color="#C7C7CC" strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>No {selectedTab} tasks</Text>
              <Text style={styles.emptySubtitle}>
                Create a new task below or ask the AI agent to automate one.
              </Text>
            </View>}
          renderItem={({ item: task }) => <TaskRow task={task} handleTaskMenu={handleTaskMenu} />}
        />

        {/* Quick Action Pills above Composer */}
        <View style={styles.quickActionsBar}>
          <TouchableOpacity
            style={styles.longTaskPill}
            onPress={() => setCreateModalKind('long')}
            activeOpacity={0.7}
          >
            <Workflow size={15} color="#1C1C1F" strokeWidth={2.0} />
            <Text style={styles.longTaskPillText}>Long task</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.newTaskPill}
            onPress={() => setCreateModalKind('recurring')}
            activeOpacity={0.8}
          >
            <Plus size={15} color="#FFFFFF" strokeWidth={2.4} />
            <Text style={styles.newTaskPillText}>New task</Text>
          </TouchableOpacity>
        </View>

        {/* Floating Liquid Glass Composer */}
        <View
          style={[
            styles.composerWrapper,
            {
              paddingBottom: isKeyboardVisible
                ? 8
                : Math.max(insets.bottom, 12),
            },
          ]}
        >
          <LiquidGlassComposer
            value={composerText}
            onChangeText={setComposerText}
            onSend={handleSendPrompt}
            placeholder="Ask anything…"
            onPressPlus={() => setCreateModalKind('long')}
            activeMode={activeMode}
            onChangeMode={setActiveMode}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Modal: Create Task Bottom Sheet */}
      <Modal
        visible={createModalKind !== null}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
        onRequestClose={() => setCreateModalKind(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {createModalKind === 'long' ? 'New Long-Running Task' : 'New Recurring Task'}
              </Text>
              <TouchableOpacity
                onPress={() => setCreateModalKind(null)}
                style={styles.modalClose}
              >
                <X size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Task name (e.g., Biology Literature Review)"
              placeholderTextColor="#8E8E93"
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              autoFocus
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Subtitle or cadence (e.g., Daily at 9:00 AM)"
              placeholderTextColor="#8E8E93"
              value={newTaskSubtitle}
              onChangeText={setNewTaskSubtitle}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setCreateModalKind(null)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.createBtn}
                onPress={handleCreateTask}
              >
                <Text style={styles.createBtnText}>Create Task</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const TaskRow = React.memo(function TaskRow({task, handleTaskMenu}: { task: EvolingoTask; handleTaskMenu: (task: EvolingoTask) => void }) {
  const currentStep = task.currentStep || 1;
  const totalSteps = task.totalSteps || 5;
  const progressPct =
    task.status === 'completed'
      ? 100
      : Math.round((currentStep / totalSteps) * 100);

  return (
    <View style={styles.taskCard}>
      <View style={styles.taskTopRow}>
        <View style={styles.iconTile}>
          {task.iconKind === 'search' ? (
            <Search size={20} color="#1C1C1F" strokeWidth={2.0} />
          ) : task.iconKind === 'award' ? (
            <Award size={20} color="#1C1C1F" strokeWidth={2.0} />
          ) : (
            <Clock size={20} color="#1C1C1F" strokeWidth={2.0} />
          )}
        </View>

        <View style={styles.taskBody}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <Text style={styles.taskSubtitle}>{task.subtitle}</Text>
        </View>

        <TouchableOpacity
          style={styles.menuHit}
          onPress={() => handleTaskMenu(task)}
          activeOpacity={0.6}
        >
          <Ellipsis size={18} color="#8E8E93" strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      {task.kind === 'long' && (
        <View style={styles.progressSection}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressPct}%` },
              ]}
            />
          </View>
          <Text style={styles.stepDetail}>
            {task.stepDetail ||
              `Step ${currentStep} of ${totalSteps} · In progress`}
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 8,
  },
  tabButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: '#F2F2F4',
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8E8E93',
  },
  tabLabelActive: {
    fontWeight: '700',
    color: '#1C1C1F',
  },
  hairlineDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#EFEFF1',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1F',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    maxWidth: 260,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EFEFF1',
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  taskTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconTile: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  taskBody: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    color: '#1C1C1F',
    marginBottom: 3,
  },
  taskSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
  },
  menuHit: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSection: {
    marginTop: 12,
    gap: 6,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#EFEFF1',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#1C1C1F',
  },
  stepDetail: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#8E8E93',
  },
  quickActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 10,
  },
  longTaskPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  longTaskPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1F',
  },
  newTaskPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#202127',
  },
  newTaskPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  composerWrapper: {
    paddingHorizontal: 20,
    paddingTop: 4,
    backgroundColor: 'transparent',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1F',
  },
  modalClose: {
    padding: 4,
  },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1C1C1F',
    backgroundColor: '#F9F9FB',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F2F2F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1F',
  },
  createBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#202127',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
