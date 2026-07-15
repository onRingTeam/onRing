import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import { ThemedText } from '@/components/themed-text';
import { showAlert } from '@/components/ui/app-alert';
import { Spacing } from '@/constants/theme';

export interface MeetingHeaderProps {
  title: string;
  /** 회의 코드 (공유용). 있으면 헤더에 표시+복사 버튼 노출. */
  code?: string;
  elapsed: string;
  /** 현재 방 참여자 이름 목록 (presence) */
  participants: string[];
  onEnd?: () => void;
}

const AVATAR_COLORS = ['#1A3461', '#2D67C8', '#3E5C8A', '#4A7BC4', '#5B8FD9'];

export function MeetingHeader({ title, code, elapsed, participants, onEnd }: MeetingHeaderProps) {
  const insets = useSafeAreaInsets();

  const copyCode = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    void showAlert('복사됨', `회의 코드가 복사되었습니다.\n${code}`);
  };

  return (
    <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
      <View style={styles.topRow}>
        <View style={styles.titleWrap}>
          <ThemedText style={styles.status}>진행 중</ThemedText>
          <ThemedText style={styles.title} numberOfLines={1}>
            {title}
          </ThemedText>
        </View>

        <View style={styles.timerPill}>
          <View style={styles.recDot} />
          <ThemedText style={styles.timerText}>{elapsed}</ThemedText>
        </View>

        {onEnd && (
          <TouchableOpacity
            onPress={onEnd}
            style={styles.endButton}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="회의 종료"
          >
            <ThemedText style={styles.endText}>종료</ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {code ? (
        <TouchableOpacity
          onPress={copyCode}
          activeOpacity={0.7}
          style={styles.codeRow}
          accessibilityRole="button"
          accessibilityLabel={`회의 코드 ${code} 복사`}
        >
          <ThemedText style={styles.codeLabel}>코드</ThemedText>
          <ThemedText style={styles.codeText} numberOfLines={1}>
            {code}
          </ThemedText>
          <Feather name="copy" size={13} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      ) : null}

      <View style={styles.speakerRow}>
        {participants.map((name, i) => (
          <View key={`${name}-${i}`} style={styles.chip}>
            <View style={[styles.chipAvatar, { backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }]}>
              <ThemedText style={styles.chipAvatarText}>{name.charAt(0)}</ThemedText>
            </View>
            <ThemedText style={styles.chipName} numberOfLines={1}>
              {name}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const NAVY = '#16305C';
const CHIP_BG = 'rgba(255,255,255,0.12)';

const styles = StyleSheet.create({
  header: {
    backgroundColor: NAVY,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomLeftRadius: Spacing.four,
    borderBottomRightRadius: Spacing.four,
    gap: Spacing.three,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.two,
    backgroundColor: CHIP_BG,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
  },
  codeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    maxWidth: 200,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  titleWrap: {
    flex: 1,
    gap: 2,
  },
  status: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    backgroundColor: CHIP_BG,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E05656',
  },
  timerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
  },
  endButton: {
    backgroundColor: '#D93B3B',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  endText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  speakerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: CHIP_BG,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingRight: Spacing.three,
    borderRadius: 999,
  },
  chipAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  chipName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    maxWidth: 90,
  },
});
