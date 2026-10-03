import LocationHistoryList from '@/components/LocationHistoryList';
import { useGuardianLinkRevoked } from '@/lib/use-guardian-link-revoked';
import { useLinkedLocationHistory } from '@/lib/use-linked-location-history';

// The guardian's "Recorded Location" tab: for each student they support,
// whether recording is on, how long this guardian keeps the trail (the
// student can change it too, see location_history_retention RLS) and the
// trail itself as Google Maps links.
export default function GuardianLocationHistoryScreen() {
  const history = useLinkedLocationHistory('guardian');
  useGuardianLinkRevoked(history.removePerson);
  return <LocationHistoryList viewer="guardian" history={history} />;
}
