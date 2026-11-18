import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import {
  Plus,
  AudioLines,
  ArrowUp,
  Square,
  Paperclip,
  X,
  ChevronDown,
} from 'lucide-react-native';
import { EvoTheme } from '../theme/tokens';

export interface ComposerAttachment {
  id: string;
  name: string;
  kind: 'file' | 'image' | 'note';
}

export type ChatMode = 'Tutor' | 'Fast' | 'Plan' | 'Auto';

interface LiquidGlassComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder?: string;
  isStreaming?: boolean;
  onStopStreaming?: () => void;
  onPressPlus?: () => void;
  onPressMic?: () => void;
  onPressVoiceMode?: () => void;
  attachment?: ComposerAttachment | null;
  onRemoveAttachment?: () => void;
  isRecording?: boolean;
  activeMode?: ChatMode;
  onChangeMode?: (mode: ChatMode) => void;
}

export const LiquidGlassComposer: React.FC<LiquidGlassComposerProps> = ({
  value,
  onChangeText,
  onSend,
  placeholder = 'Ask anything…',
  isStreaming = false,
  onStopStreaming,
  onPressPlus,
  onPressVoiceMode,
  attachment,
  onRemoveAttachment,
  isRecording = false,
  activeMode = 'Tutor',
  onChangeMode,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [inputHeight, setInputHeight] = useState(24);
  const inputRef = useRef<TextInput>(null);

  const hasContent = value.trim().length > 0 || Boolean(attachment);
  const isMultiline = value.includes('\n') || inputHeight > 34;
  const isOpenState = isFocused || hasContent || isMultiline;

  const handleFocus = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsFocused(true);
  };

  const handleBlur = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsFocused(false);
  };

  const handlePrimaryPress = () => {
    if (isStreaming) {
      onStopStreaming?.();
      return;
    }
    if (hasContent) {
      onSend();
      setInputHeight(24);
      return;
    }
    if (onPressVoiceMode) {
      onPressVoiceMode();
    } else {
      inputRef.current?.focus();
    }
  };

  const handleSelectMode = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Tutor (Educational)', 'Fast (Instant response)', 'Plan (Deep reasoning)', 'Auto (Adaptive)'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) onChangeMode?.('Tutor');
          if (buttonIndex === 2) onChangeMode?.('Fast');
          if (buttonIndex === 3) onChangeMode?.('Plan');
          if (buttonIndex === 4) onChangeMode?.('Auto');
        }
      );
    } else {
      const modes: ChatMode[] = ['Tutor', 'Fast', 'Plan', 'Auto'];
      const nextIdx = (modes.indexOf(activeMode) + 1) % modes.length;
      onChangeMode?.(modes[nextIdx]);
    }
  };

  return (
    <View
      style={[
        styles.liquidGlassCapsule,
        isOpenState ? styles.capsuleOpen : styles.capsuleIdle,
      ]}
    >
      {/* Optional Attachment Pill */}
      {attachment && (
        <View style={styles.attachmentRow}>
          <View style={styles.attachmentChip}>
            <Paperclip size={13} color={EvoTheme.colors.ink} />
            <Text style={styles.attachmentName} numberOfLines={1}>
              {attachment.name}
            </Text>
            {onRemoveAttachment && (
              <TouchableOpacity
                onPress={onRemoveAttachment}
                style={styles.attachmentRemove}
                accessibilityRole="button"
                accessibilityLabel="Remove attachment"
              >
                <X size={13} color={EvoTheme.colors.secondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <View style={[styles.mainRow, isMultiline && styles.mainRowMultiline]}>
        {/* Left Plus Button */}
        <TouchableOpacity
          style={styles.plusButton}
          onPress={onPressPlus}
          activeOpacity={0.65}
          accessibilityRole="button"
          accessibilityLabel="Add attachment or action"
        >
          <Plus size={20} color={EvoTheme.colors.ink} strokeWidth={2.0} />
        </TouchableOpacity>

        {/* Center Text Input */}
        <TextInput
          ref={inputRef}
          style={[
            styles.textInput,
            { height: Math.min(120, Math.max(24, inputHeight)) },
          ]}
          placeholder={placeholder}
          placeholderTextColor={EvoTheme.colors.secondary}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          multiline
          maxLength={6000}
          scrollEnabled={inputHeight >= 110}
          onContentSizeChange={(e) => {
            const nextH = Math.ceil(e.nativeEvent.contentSize.height);
            if (Math.abs(nextH - inputHeight) > 2) {
              setInputHeight(nextH);
            }
          }}
          accessibilityLabel={placeholder}
        />

        {/* Right Section: Mode Selector Pill ("Tutor ⌵") + Waveform / Send Circle */}
        <View style={styles.rightGroup}>
          {!hasContent && !isMultiline && (
            <TouchableOpacity
              style={styles.modePill}
              onPress={handleSelectMode}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Select mode, currently ${activeMode}`}
            >
              <Text style={styles.modeText}>{activeMode}</Text>
              <ChevronDown size={14} color={EvoTheme.colors.secondary} strokeWidth={2.0} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.voiceOrSendButton}
            onPress={handlePrimaryPress}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={
              isStreaming
                ? 'Stop response'
                : hasContent
                ? 'Send message'
                : 'Start voice mode'
            }
          >
            <View
              style={[
                styles.darkCircle,
                isRecording && styles.darkCircleRecording,
              ]}
            >
              {isStreaming ? (
                <Square size={14} color="#FFFFFF" fill="#FFFFFF" />
              ) : hasContent ? (
                <ArrowUp size={18} color="#FFFFFF" strokeWidth={2.2} />
              ) : (
                <AudioLines size={18} color="#FFFFFF" strokeWidth={2.0} />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  liquidGlassCapsule: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(235, 235, 240, 0.95)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  capsuleIdle: {
    minHeight: 58,
    justifyContent: 'center',
  },
  capsuleOpen: {
    minHeight: 58,
    borderRadius: 26,
    justifyContent: 'center',
  },
  attachmentRow: {
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 4,
    flexDirection: 'row',
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: EvoTheme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
    maxWidth: '90%',
  },
  attachmentName: {
    fontSize: 12.5,
    fontWeight: '500',
    color: EvoTheme.colors.ink,
    flexShrink: 1,
  },
  attachmentRemove: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainRowMultiline: {
    alignItems: 'flex-end',
  },
  plusButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    color: EvoTheme.colors.ink,
    paddingHorizontal: 6,
    paddingTop: Platform.OS === 'ios' ? 4 : 0,
    paddingBottom: Platform.OS === 'ios' ? 4 : 0,
    textAlignVertical: 'center',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modePill: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F5F5F7',
  },
  modeText: {
    fontSize: 14.5,
    fontWeight: '500',
    color: EvoTheme.colors.ink,
  },
  voiceOrSendButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#202127',
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkCircleRecording: {
    backgroundColor: EvoTheme.colors.danger,
  },
});
