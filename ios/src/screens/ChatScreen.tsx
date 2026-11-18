import { showActions } from '../components/action-sheet';
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Share,
  Keyboard,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import {
  Copy,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  Share2,
  Ellipsis,
  Check,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EvoTheme } from '../theme/tokens';
import { ChatSession } from '../components/LayeredSidebar';
import { EvolingoHeader } from '../components/EvolingoHeader';
import {
  LiquidGlassComposer,
  ComposerAttachment,
  ChatMode,
} from '../components/LiquidGlassComposer';

interface ChatScreenProps {
  session: ChatSession;
  userName: string;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenProfile: () => void;
  onSendMessage: (text: string, attachment?: ComposerAttachment | null) => void;
  onNewChat: () => void;
  onClearChat: () => void;
  isStreaming: boolean;
  onStopStreaming: () => void;
}

function normalizeMessageText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/([a-záéíóöőúüű])\.([A-ZÁÉÍÓÖŐÚÜŰ])/g, '$1. $2')
    .replace(/([!?])([A-ZÁÉÍÓÖŐÚÜŰa-záéíóöőúüű])/g, '$1 $2');
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  session,
  userName,
  sidebarOpen,
  onToggleSidebar,
  onOpenProfile,
  onSendMessage,
  onNewChat,
  onClearChat,
  isStreaming,
  onStopStreaming,
}) => {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<ComposerAttachment | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Record<string, 'up' | 'down' | null>>({});
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [activeMode, setActiveMode] = useState<ChatMode>('Tutor');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const isNearBottomRef = useRef(true);
  const prevMsgCountRef = useRef(session.messages.length);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
      if (isNearBottomRef.current) scrollRef.current?.scrollToEnd({ animated: false });
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    const countChanged = session.messages.length !== prevMsgCountRef.current;
    const lastMsg = session.messages[session.messages.length - 1];
    prevMsgCountRef.current = session.messages.length;

    if (countChanged) {
      if (lastMsg?.role === 'user' || isNearBottomRef.current) {
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 60);
      }
    }
  }, [session.messages]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const distanceFromBottom =
      contentSize.height - (layoutMeasurement.height + contentOffset.y);
    isNearBottomRef.current = distanceFromBottom < 120;
  };

  const handleSend = () => {
    const trimmed = draft.trim();
    if ((!trimmed && !attachment) || isStreaming) return;
    Keyboard.dismiss();
    onSendMessage(trimmed || `[Csatolmány: ${attachment?.name}]`, attachment);
    setDraft('');
    setAttachment(null);
    isNearBottomRef.current = true;
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 60);
  };

  const handleHeaderMenu = () => {
    showActions(session.title || 'Conversation', 'Choose an action:', [
      { text: 'New Conversation', onPress: onNewChat },
      {
        text: 'Share Conversation',
        onPress: () => {
          const transcript = session.messages
            .map((m) => `${m.role === 'user' ? 'Me' : 'Evolingo'}: ${m.content}`)
            .join('\n\n');
          Share.share({ message: transcript || session.title });
        },
      },
      {
        text: 'Clear Messages',
        style: 'destructive',
        onPress: onClearChat,
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handlePlusAction = () => {
    showActions('Add Attachment', 'Choose a source for your message:', [
      {
        text: 'Attach Document (English Grammar.pdf)',
        onPress: () =>
          setAttachment({
            id: `att-${Date.now()}`,
            name: 'English Grammar.pdf',
            kind: 'file',
          }),
      },
      {
        text: 'Attach Study Notes (Study Notes.md)',
        onPress: () =>
          setAttachment({
            id: `att-${Date.now()}`,
            name: 'Study Notes.md',
            kind: 'note',
          }),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleMicPress = () => {
    setIsRecording((prev) => {
      const next = !prev;
      if (next && !draft) {
        setDraft('How can you help me study today?');
      }
      return next;
    });
  };

  const handleCopy = (id: string, text: string) => {
    setCopiedId(id);
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      navigator.clipboard.writeText
    ) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 1800);
  };

  const handleShare = async (text: string) => {
    try {
      await Share.share({ message: text });
    } catch {
      // ignore cancelled share
    }
  };

  const toggleFeedback = (id: string) => {
    setLikedIds((prev) => {
      const current = prev[id];
      const next = current === 'up' ? 'down' : current === 'down' ? null : 'up';
      return { ...prev, [id]: next };
    });
  };

  const handleMessageMore = (id: string, content: string) => {
    showActions('Message Actions', undefined, [
      { text: 'Copy', onPress: () => handleCopy(id, content) },
      { text: 'Share', onPress: () => handleShare(content) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Safe-Area Top (58pt top spacing) + Shared EvolingoHeader */}
      <View style={{ paddingTop: Math.max(insets.top, 58) }}>
        <EvolingoHeader
          sidebarOpen={sidebarOpen}
          onToggleSidebar={onToggleSidebar}
          onOpenMenu={handleHeaderMenu}
          onOpenProfile={onOpenProfile}
          userName={userName}
        />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          onScroll={handleScroll}
          scrollEventThrottle={32}
          showsVerticalScrollIndicator={false}
        >
          {(() => {
            const messages = session.messages;
            if (messages.length === 0) return null;
            // Always display only the latest turn/messages at top
            const latestMsg = messages[messages.length - 1];
            const relevantMessages =
              latestMsg.role === 'assistant' && messages.length >= 2
                ? [messages[messages.length - 2], latestMsg]
                : [latestMsg];

            return relevantMessages.map((msg) => {
            const isUser = msg.role === 'user';
            const feedback = likedIds[msg.id];
            const isCopied = copiedId === msg.id;
            const isSpeaking = speakingId === msg.id;
            const formatted = normalizeMessageText(msg.content);
            const paragraphs = formatted
              .split(/\n{2,}/)
              .map((p) => p.trim())
              .filter(Boolean);

            return (
              <View
                key={msg.id}
                style={[
                  styles.turnContainer,
                  isUser ? styles.userTurn : styles.assistantTurn,
                ]}
              >
                {isUser ? (
                  <View style={styles.userBubble}>
                    {msg.attachmentName && (
                      <Text style={styles.userAttachmentTag}>
                        📎 {msg.attachmentName}
                      </Text>
                    )}
                    <Text style={styles.userText}>
                      {formatted}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.assistantBlock}>
                    {paragraphs.map((paragraph, pIndex) => (
                      <Text
                        key={`${msg.id}-p-${pIndex}`}
                        style={[
                          styles.assistantText,
                          pIndex < paragraphs.length - 1 &&
                            styles.paragraphSpacing,
                        ]}
                       
                        selectable
                      >
                        {paragraph}
                      </Text>
                    ))}

                    {/* Subtle 5-icon Assistant Action Bar (Copy, Feedback, Read Aloud, Share, More) */}
                    <View
                      style={styles.actionToolbar}
                      accessibilityRole="toolbar"
                    >
                      <TouchableOpacity
                        style={styles.actionTapTarget}
                        onPress={() => handleCopy(msg.id, msg.content)}
                        accessibilityRole="button"
                        accessibilityLabel="Copy response"
                      >
                        {isCopied ? (
                          <Check size={14.5} color={EvoTheme.colors.ink} />
                        ) : (
                          <Copy
                            size={14.5}
                            color={EvoTheme.colors.secondary}
                            strokeWidth={1.8}
                          />
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionTapTarget}
                        onPress={() => toggleFeedback(msg.id)}
                        accessibilityRole="button"
                        accessibilityLabel="Response feedback"
                      >
                        {feedback === 'down' ? (
                          <ThumbsDown
                            size={14.5}
                            color={EvoTheme.colors.ink}
                            strokeWidth={1.9}
                          />
                        ) : (
                          <ThumbsDown
                            size={14.5}
                            color={EvoTheme.colors.secondary}
                            strokeWidth={1.8}
                          />
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionTapTarget}
                        onPress={() =>
                          setSpeakingId((prev) =>
                            prev === msg.id ? null : msg.id
                          )
                        }
                        accessibilityRole="button"
                        accessibilityLabel="Read aloud"
                      >
                        <Volume2
                          size={14.5}
                          color={
                            isSpeaking
                              ? EvoTheme.colors.ink
                              : EvoTheme.colors.secondary
                          }
                          strokeWidth={1.8}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionTapTarget}
                        onPress={() => handleShare(msg.content)}
                        accessibilityRole="button"
                        accessibilityLabel="Share response"
                      >
                        <Share2
                          size={14.5}
                          color={EvoTheme.colors.secondary}
                          strokeWidth={1.8}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionTapTarget}
                        onPress={() => handleMessageMore(msg.id, msg.content)}
                        accessibilityRole="button"
                        accessibilityLabel="More options"
                      >
                        <Ellipsis
                          size={14.5}
                          color={EvoTheme.colors.secondary}
                          strokeWidth={1.8}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          });
          })()}

          {isStreaming && (
            <View style={styles.streamingRow}>
              <View style={styles.streamingDot} />
              <Text style={styles.streamingText}>Evolingo is typing...</Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom Floating Liquid Glass Composer */}
        <View
          style={[
            styles.composerWrapper,
            {
              paddingBottom: isKeyboardVisible
                ? 4
                : Math.max(insets.bottom + 8, 20),
            },
          ]}
        >
          <LiquidGlassComposer
            value={draft}
            onChangeText={setDraft}
            onSend={handleSend}
            placeholder="Ask anything…"
            isStreaming={isStreaming}
            onStopStreaming={onStopStreaming}
            onPressPlus={handlePlusAction}
            onPressVoiceMode={handleMicPress}
            attachment={attachment}
            onRemoveAttachment={() => setAttachment(null)}
            isRecording={isRecording}
            activeMode={activeMode}
            onChangeMode={setActiveMode}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: EvoTheme.colors.canvas,
  },
  keyboardArea: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 28,
  },
  turnContainer: {
    marginBottom: EvoTheme.spacing.turn,
  },
  userTurn: {
    alignItems: 'flex-end',
  },
  assistantTurn: {
    alignItems: 'flex-start',
  },
  userBubble: {
    maxWidth: '92%',
    backgroundColor: EvoTheme.colors.messageUser,
    borderRadius: EvoTheme.radius.userBubble,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  userAttachmentTag: {
    fontSize: 12.5,
    fontWeight: '500',
    color: EvoTheme.colors.secondary,
    marginBottom: 4,
  },
  userText: {
    fontSize: EvoTheme.typography.userText,
    fontWeight: '400',
    lineHeight: EvoTheme.typography.lineHeight,
    color: EvoTheme.colors.ink,
  },
  assistantBlock: {
    width: '100%',
    paddingRight: 2,
  },
  assistantText: {
    fontSize: EvoTheme.typography.assistantText,
    fontWeight: '400',
    lineHeight: EvoTheme.typography.lineHeight,
    color: EvoTheme.colors.ink,
    letterSpacing: -0.1,
  },
  paragraphSpacing: {
    marginBottom: 14,
  },
  actionToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 2,
    flexWrap: 'wrap',
  },
  actionTapTarget: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streamingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  streamingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: EvoTheme.colors.ink,
  },
  streamingText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: EvoTheme.colors.secondary,
  },
  composerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 4,
    backgroundColor: 'transparent',
  },
});
