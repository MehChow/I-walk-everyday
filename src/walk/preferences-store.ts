import { createMMKV } from 'react-native-mmkv';

// UI preferences only. The native module remains authoritative for walk sessions.
export const walkPreferences = createMMKV({ id: 'walk-goal-preferences' });
