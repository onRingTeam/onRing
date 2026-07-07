import { useEffect } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  type ViewProps,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface BottomSheetProps extends ViewProps {
  visible: boolean;
  onClose: () => void;
  children?: React.ReactNode;
}

// iOS는 will* 이벤트로 키보드와 동시에, Android는 did* 이벤트로 반응
const SHOW_EVENT = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const HIDE_EVENT = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

export function BottomSheet({ visible, onClose, children, style, ...props }: BottomSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // 키보드 높이를 단일 애니메이션 값으로 관리한다.
  // (KeyboardAvoidingView + OS 창 리사이즈가 서로 밀고 당기며 위치가 튀는 문제를 회피)
  const keyboardHeight = useSharedValue(0);

  useEffect(() => {
    const onShow = Keyboard.addListener(SHOW_EVENT, (e) => {
      keyboardHeight.value = withTiming(e.endCoordinates.height, {
        duration: e.duration || 150,
      });
    });
    const onHide = Keyboard.addListener(HIDE_EVENT, (e) => {
      keyboardHeight.value = withTiming(0, { duration: e.duration || 150 });
    });
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [keyboardHeight]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboardHeight.value }],
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} onPress={onClose} activeOpacity={1} />
        {/* 키보드가 올라오면 그 높이만큼 시트를 위로 밀어올림 */}
        <Animated.View
          style={[
            styles.sheet,
            sheetStyle,
            // 제스처 내비게이션 바에 내용이 가려지지 않도록 시스템 인셋만큼 하단 여백 확보
            { backgroundColor: theme.background, paddingBottom: Spacing.four + insets.bottom },
            style,
          ]}
          {...props}
        >
          <View style={styles.grabber} />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: Spacing.three,
    borderTopRightRadius: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.3)',
    marginBottom: Spacing.two,
  },
});
