// 1. Import
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProfile } from './hooks';
import { ProfileCard } from './components/profile-card';
import { ChatSettingsCard } from './components/chat-settings-card';
import { AppSettingsCard } from './components/app-settings-card';
import { AppInfoCard } from './components/app-info-card';
import { ProfileEditSheet } from './components/profile-edit-sheet';
import { styles } from './settings-screen.styles';

// 2. 페이지(함수) 시작
export function SettingsScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  // 3. 서버 상태 — 내 프로필 + 채팅 설정
  const { data: profile, isLoading, isError } = useProfile();

  // 4. Return
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.title}>
            설정
          </ThemedText>
        </View>

        {isLoading ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.stateText}>
            로드 중...
          </ThemedText>
        ) : isError || !profile ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.stateText}>
            프로필을 불러오지 못했습니다.
          </ThemedText>
        ) : (
          <>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              <ProfileCard profile={profile} />
              <ChatSettingsCard profile={profile} />
              <AppSettingsCard />
              <AppInfoCard />
            </ScrollView>
            <ProfileEditSheet profile={profile} />
          </>
        )}
      </SafeAreaView>
    </View>
  );
}
