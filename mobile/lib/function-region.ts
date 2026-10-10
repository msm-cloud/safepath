import { FunctionRegion } from '@supabase/supabase-js';

const KNOWN_REGIONS = new Set<string>(Object.values(FunctionRegion));

// Edge functions that make several sequential database calls run in the
// database's region rather than the one nearest the phone. Pinned requests
// aren't rerouted during a regional outage.
export function functionRegion(): FunctionRegion | undefined {
  const region = process.env.EXPO_PUBLIC_SUPABASE_FUNCTION_REGION?.trim();
  return region && KNOWN_REGIONS.has(region) ? (region as FunctionRegion) : undefined;
}
