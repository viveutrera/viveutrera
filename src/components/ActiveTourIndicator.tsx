import { useEffect, useState } from 'react';
import { Radio, X } from 'lucide-react';
import { Button } from './ui/Button';
import { clearParticipantTourSession, getParticipantTourSession, subscribeTourSessionChange, type ParticipantTourSession } from '../lib/tourSession';

export function ActiveTourIndicator() {
  const [session, setSession] = useState<ParticipantTourSession | undefined>(() => getParticipantTourSession());

  useEffect(() => subscribeTourSessionChange(() => setSession(getParticipantTourSession())), []);

  if (!session) return null;

  return (
    <aside className="active-tour-indicator" role="status" aria-label="Tour activo">
      <Radio size={18} />
      <span>Tour activo</span>
      <strong>{session.code}</strong>
      <Button type="button" variant="ghost" icon={<X size={16} />} onClick={clearParticipantTourSession}>Abandonar tour</Button>
    </aside>
  );
}
