import { useLocalSearchParams } from 'expo-router';

import { NotesDetailScreen } from '@/screens/notes/notes-detail-screen';

export default function NotesDetailRoute() {
  // fresh='1' → 방금 종료한 회의. 요약 생성 완료까지 상세 화면에서 폴링한다.
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  return <NotesDetailScreen id={id ?? ''} waitForSummary={fresh === '1'} />;
}
