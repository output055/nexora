import { getTriggers } from '@/app/actions/triggers';
import TriggersClient from './TriggersClient';

export default async function CommunicationSettingsPage() {
  const { data: triggers, success } = await getTriggers();

  return <TriggersClient initialTriggers={success && triggers ? triggers : []} />;
}
