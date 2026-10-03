import LocationHistoryList from '@/components/LocationHistoryList';
import { useLinkedLocationHistory } from '@/lib/use-linked-location-history';

// Student counterpart to app/(guardian)/location-history.tsx: the saved
// trail of each guardian who has "Share My Location" on
// (app/(guardian)/share-location.tsx). Reading it relies on the
// reverse-direction policy in
// supabase/migrations/20260922155435_reciprocal_location_history.sql.
// Reached from the Guardians tab; href: null in app/(tabs)/_layout.tsx.
export default function GuardianLocationScreen() {
  const history = useLinkedLocationHistory('user');
  return <LocationHistoryList viewer="user" history={history} />;
}
