import { useLocalSearchParams } from 'expo-router';

import { NotesDetailScreen } from '@/screens/notes/notes-detail-screen';

export default function NotesDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <NotesDetailScreen id={id ?? ''} />;
}
