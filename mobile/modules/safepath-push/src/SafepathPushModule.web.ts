import { registerWebModule, NativeModule } from 'expo';

class SafepathPushModule extends NativeModule<{}> {}

export default registerWebModule(SafepathPushModule, 'SafepathPushModule');
