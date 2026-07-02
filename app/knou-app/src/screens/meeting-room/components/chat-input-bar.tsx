import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// 파형 시각화용 고정 높이 (목업 느낌)
const WAVE_BARS = [6, 10, 4, 14, 8, 16, 6, 11, 5, 13, 7, 9];

export interface ChatInputBarProps {
  /** 입력한 문장을 서버로 발행 */
  onSend?: (text: string) => void;
  /** 마이크 on/off (WebRTC 송신 트랙 토글) */
  onMicToggle?: (enabled: boolean) => void;
}

export function ChatInputBar({ onSend, onMicToggle }: ChatInputBarProps) {
  const colors = useTheme();
  const [micOn, setMicOn] = useState(true);
  const [voiceOn, setVoiceOn] = useState(true);
  const [text, setText] = useState('');

  const toggleMic = () => {
    setMicOn((prev) => {
      const next = !prev;
      onMicToggle?.(next);
      return next;
    });
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend?.(trimmed);
    setText('');
  };

  return (
    <View style={styles.wrap}>
      {/* 마이크 / 음성 토글 */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          onPress={toggleMic}
          activeOpacity={0.8}
          style={[
            styles.toggle,
            { backgroundColor: micOn ? colors.primary : colors.backgroundSelected },
          ]}
          accessibilityRole="button"
          accessibilityLabel={micOn ? '마이크 켜짐' : '마이크 꺼짐'}
          accessibilityState={{ selected: micOn }}
        >
          <Feather name="mic" size={16} color={micOn ? '#ffffff' : colors.textSecondary} />
          <ThemedText style={[styles.toggleText, { color: micOn ? '#ffffff' : colors.textSecondary }]}>
            마이크 {micOn ? 'ON' : 'OFF'}
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setVoiceOn((v) => !v)}
          activeOpacity={0.8}
          style={[
            styles.toggle,
            { backgroundColor: voiceOn ? colors.backgroundSelected : colors.backgroundElement },
          ]}
          accessibilityRole="button"
          accessibilityLabel={voiceOn ? '음성 출력 켜짐' : '음성 출력 꺼짐'}
          accessibilityState={{ selected: voiceOn }}
        >
          <Feather name="volume-2" size={16} color={colors.text} />
          <ThemedText style={[styles.toggleText, { color: colors.text }]}>
            음성 {voiceOn ? 'ON' : 'OFF'}
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* 음성 인식 파형 */}
      {micOn && (
        <View style={[styles.waveRow, { backgroundColor: colors.backgroundSelected }]}>
          <View style={styles.wave}>
            {WAVE_BARS.map((h, i) => (
              <View key={i} style={[styles.waveBar, { height: h, backgroundColor: colors.accent }]} />
            ))}
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            음성 인식 중...
          </ThemedText>
        </View>
      )}

      {/* TTS 입력 */}
      <View style={[styles.inputRow, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
        <Feather name="type" size={16} color={colors.textSecondary} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="TTS로 말하기..."
          placeholderTextColor={colors.textSecondary}
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          accessibilityLabel="TTS 입력"
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!text.trim()}
          activeOpacity={0.7}
          style={[styles.sendBtn, { backgroundColor: text.trim() ? colors.primary : colors.backgroundSelected }]}
          accessibilityRole="button"
          accessibilityLabel="전송"
        >
          <Feather name="send" size={16} color={text.trim() ? '#ffffff' : colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.three,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  toggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '700',
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  wave: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 18,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.one,
    paddingVertical: Spacing.one,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Spacing.two,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
