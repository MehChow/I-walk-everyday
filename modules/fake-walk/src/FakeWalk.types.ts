// Define your exported module types here.
export type WalkStatus = 'running' | 'publishing' | 'completed' | 'cancelled' | 'failed';
export type WalkSession = {
  id: string;
  steps: number;
  startedAt: number;
  finishAt: number;
  elapsedMs: number;
  status: WalkStatus;
  recordId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  notification: 'pending' | 'sent' | 'denied' | 'failed';
};
export type Prerequisites = {
  healthAvailable: boolean;
  stepsGranted: boolean;
  notificationsGranted: boolean;
};
export type WalkOverview = {
  active: WalkSession | null;
  latest: WalkSession | null;
  history: WalkSession[];
};
