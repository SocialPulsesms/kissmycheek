import { resetCallSignalingStore } from '@/lib/callSignalingStore';
import { resetCallHistoryStore } from '@/lib/callHistoryStore';

beforeEach(() => {
  resetCallSignalingStore();
  resetCallHistoryStore();
});
