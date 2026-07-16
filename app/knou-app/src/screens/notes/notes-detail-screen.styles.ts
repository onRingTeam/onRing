import { StyleSheet } from 'react-native';

import { BottomTabInset, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.half,
  },
  stateText: {
    textAlign: 'center',
    paddingVertical: Spacing.six,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    gap: Spacing.half,
  },
  tabRow: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.half,
    gap: Spacing.half,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    borderRadius: 12,
  },
  statValue: {
    marginTop: Spacing.half,
  },
  statLabel: {
    fontSize: 10,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  summaryText: {
    lineHeight: 20,
  },
  summaryPending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  actionItem: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
  },
  actionItemFirst: {
    borderTopWidth: 0,
    paddingTop: 0,
  },
  actionIndex: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  actionIndexText: {
    fontSize: 10,
    fontWeight: '700',
  },
  actionBody: {
    flex: 1,
    gap: 2,
  },
  actionWho: {
    fontWeight: '700',
    fontSize: 12,
  },
  actionWhat: {
    fontSize: 12,
    lineHeight: 18,
  },
  speakerRow: {
    gap: Spacing.one,
  },
  speakerHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  speakerNameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  speakerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakerInitial: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
  speakerCount: {
    fontSize: 12,
  },
  speakerTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  speakerFill: {
    height: '100%',
    borderRadius: 3,
  },
});
