import { NativeModule, requireNativeModule } from 'expo';
import type { Prerequisites, WalkOverview } from './FakeWalk.types';

declare class FakeWalkModule extends NativeModule<{}> {
  getPrerequisites(): Promise<Prerequisites>;
  requestPermissions(): Promise<Prerequisites>;
  getOverview(): Promise<WalkOverview>;
  startWalk(steps: number): Promise<WalkOverview>;
  cancelWalk(id: string): Promise<WalkOverview>;
  retrySave(id: string): Promise<WalkOverview>;
  openSettings(kind: 'health' | 'notifications'): Promise<void>;
}

export default requireNativeModule<FakeWalkModule>('FakeWalk');
