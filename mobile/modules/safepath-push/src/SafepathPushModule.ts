import { NativeModule, requireNativeModule } from 'expo';

declare class SafepathPushModule extends NativeModule<{}> {}

export default requireNativeModule<SafepathPushModule>('SafepathPush');
