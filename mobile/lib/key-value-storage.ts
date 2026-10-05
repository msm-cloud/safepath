// The slice of AsyncStorage the on-device caches use. Declared here so the
// cache logic can take it as a dependency and be tested with an in-memory
// fake under plain Node.
export type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
  multiRemove(keys: readonly string[]): Promise<void>;
};
