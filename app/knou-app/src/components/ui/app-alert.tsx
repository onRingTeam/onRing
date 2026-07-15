import { useEffect, useState } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * 앱 공통 확인/알림 다이얼로그.
 * - 홈·회의록 삭제 confirm 과 동일한 카드 UI (센터 모달 + 라운드 카드 + 버튼 행)
 * - 네이티브: `showAppAlert()` / `showAlert()` / `showConfirm()` 임퍼러티브 호출
 * - WebView: postMessage `{ type:'alert', ... }` → Host 가 띄우고 결과를 inject
 *
 * Root `_layout` 에 `<AppAlertHost />` 1회 마운트 필요.
 */

export type AppAlertButtonStyle = 'cancel' | 'default' | 'primary' | 'destructive';

export type AppAlertButton = {
  /** Promise resolve 값. 생략 시 text 사용 */
  key?: string;
  text: string;
  style?: AppAlertButtonStyle;
  onPress?: () => void;
};

export type AppAlertIconTone = 'error' | 'primary' | 'accent';

export type AppAlertConfig = {
  title: string;
  message?: string;
  buttons?: AppAlertButton[];
  /** Ionicons 이름 (예: 'trash-outline', 'copy-outline') */
  icon?: keyof typeof Ionicons.glyphMap;
  iconTone?: AppAlertIconTone;
  /** 배경 탭 / Android 뒤로가기 시 cancel 버튼(또는 null) 으로 닫기 */
  cancelable?: boolean;
};

type AlertRequest = AppAlertConfig & {
  resolve: (key: string | null) => void;
};

type AlertListener = (req: AlertRequest | null) => void;

let current: AlertRequest | null = null;
const listeners = new Set<AlertListener>();
/** 연속 호출 시 순서 보장 */
const queue: AlertRequest[] = [];

function emit() {
  listeners.forEach((l) => l(current));
}

function presentNext() {
  if (current || queue.length === 0) return;
  current = queue.shift() ?? null;
  emit();
}

function dismiss(key: string | null) {
  const req = current;
  current = null;
  emit();
  req?.resolve(key);
  // 다음 프레임에 큐 처리 (같은 틱 연속 present 방지)
  setTimeout(presentNext, 0);
}

/**
 * 공통 알림/확인 다이얼로그를 띄운다.
 * @returns 눌린 버튼의 key (배경 닫기·취소면 cancel 버튼 key 또는 null)
 */
export function showAppAlert(config: AppAlertConfig): Promise<string | null> {
  return new Promise((resolve) => {
    const buttons =
      config.buttons && config.buttons.length > 0
        ? config.buttons
        : [{ key: 'ok', text: '확인', style: 'primary' as const }];

    queue.push({
      ...config,
      buttons,
      resolve,
    });
    presentNext();
  });
}

/** 단순 알림 (확인 1버튼). */
export async function showAlert(title: string, message?: string, okText = '확인'): Promise<void> {
  await showAppAlert({
    title,
    message,
    buttons: [{ key: 'ok', text: okText, style: 'primary' }],
    cancelable: true,
  });
}

/** 예/아니오 확인. confirm 이면 true. */
export async function showConfirm(
  title: string,
  message?: string,
  opts?: {
    confirmText?: string;
    cancelText?: string;
    /** true 면 confirm 버튼을 빨강(destructive) */
    destructive?: boolean;
  },
): Promise<boolean> {
  const key = await showAppAlert({
    title,
    message,
    cancelable: true,
    buttons: [
      { key: 'cancel', text: opts?.cancelText ?? '취소', style: 'cancel' },
      {
        key: 'confirm',
        text: opts?.confirmText ?? '확인',
        style: opts?.destructive ? 'destructive' : 'primary',
      },
    ],
  });
  return key === 'confirm';
}

function buttonKey(b: AppAlertButton, index: number): string {
  return b.key ?? b.text ?? String(index);
}

function toneColor(
  tone: AppAlertIconTone | undefined,
  colors: ReturnType<typeof useTheme>,
): string {
  if (tone === 'error') return colors.error;
  if (tone === 'accent') return colors.accent;
  return colors.primary;
}

/**
 * 전역 Alert 렌더러. 앱 루트에 한 번만 둔다.
 */
export function AppAlertHost() {
  const colors = useTheme();
  const [req, setReq] = useState<AlertRequest | null>(current);

  useEffect(() => {
    const listener: AlertListener = (next) => setReq(next);
    listeners.add(listener);
    setReq(current);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const visible = !!req;
  const buttons = req?.buttons ?? [];
  const stacked = buttons.length >= 3;

  const onButton = (b: AppAlertButton, index: number) => {
    const key = buttonKey(b, index);
    try {
      b.onPress?.();
    } catch (e) {
      console.warn('[AppAlert] onPress error', e);
    }
    dismiss(key);
  };

  const onRequestClose = () => {
    if (!req) return;
    if (req.cancelable === false) return;
    const cancel = buttons.find((b) => b.style === 'cancel');
    if (cancel) {
      onButton(cancel, buttons.indexOf(cancel));
    } else {
      dismiss(null);
    }
  };

  const btnBg = (style: AppAlertButtonStyle | undefined) => {
    switch (style) {
      case 'destructive':
        return colors.error;
      case 'primary':
      case 'default':
        return colors.primary;
      case 'cancel':
      default:
        return colors.backgroundSelected;
    }
  };

  const btnTextColor = (style: AppAlertButtonStyle | undefined) => {
    if (style === 'cancel' || style == null) return colors.textSecondary;
    return '#ffffff';
  };

  // 2버튼일 때 cancel 을 왼쪽, 액션을 오른쪽으로 정렬
  const ordered =
    buttons.length === 2
      ? [...buttons].sort((a, b) => {
          const rank = (s?: AppAlertButtonStyle) => (s === 'cancel' ? 0 : 1);
          return rank(a.style) - rank(b.style);
        })
      : buttons;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        {/* 배경 탭 — cancelable 일 때만 닫기 */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={req?.cancelable === false ? undefined : onRequestClose}
          accessibilityLabel="닫기"
        />
        <View
          style={[styles.card, { backgroundColor: colors.backgroundElement }]}
          accessibilityRole="alert"
        >
          {req?.icon ? (
            <View style={[styles.iconWrap, { backgroundColor: colors.backgroundSelected }]}>
              <Ionicons
                name={req.icon}
                size={22}
                color={toneColor(req.iconTone, colors)}
              />
            </View>
          ) : null}

          <ThemedText type="smallBold" style={styles.title}>
            {req?.title}
          </ThemedText>

          {req?.message ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
              {req.message}
            </ThemedText>
          ) : null}

          <View style={[styles.btnRow, stacked && styles.btnCol]}>
            {ordered.map((b, i) => {
              const style = b.style ?? (stacked || ordered.length === 1 ? 'primary' : 'cancel');
              // 2버튼 정렬 후 원래 index 로 key 생성에 쓰지 않도록 ordered 기준 key
              const originalIndex = buttons.indexOf(b);
              return (
                <TouchableOpacity
                  key={`${buttonKey(b, originalIndex)}-${i}`}
                  style={[
                    styles.btn,
                    stacked && styles.btnStacked,
                    { backgroundColor: btnBg(style) },
                  ]}
                  onPress={() => onButton(b, originalIndex)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={b.text}
                >
                  <ThemedText
                    type="small"
                    style={[styles.btnText, { color: btnTextColor(style) }]}
                  >
                    {b.text}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
    // 배경 Touchable 위에 카드가 오도록
    zIndex: 1,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  title: {
    fontSize: 16,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    lineHeight: 20,
  },
  btnRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
    alignSelf: 'stretch',
  },
  btnCol: {
    flexDirection: 'column',
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: Spacing.three,
  },
  btnStacked: {
    flex: undefined,
    alignSelf: 'stretch',
  },
  btnText: {
    fontWeight: '700',
  },
});
