import type { RealtimeChannel } from '@supabase/supabase-js';
import type { TourEvent } from '../domain/types';
import { supabase } from './supabase';

export interface TourElementPayload {
  event: TourEvent;
}

export function tourChannelName(tourId: string) {
  return `tour:${tourId}`;
}

export function subscribeToTourElementEvents(tourId: string, onEvent: (event: TourEvent) => void) {
  if (!supabase) return () => undefined;
  const client = supabase;
  const channel = client
    .channel(tourChannelName(tourId), {
      config: {
        broadcast: { self: false },
        presence: { key: crypto.randomUUID() }
      }
    })
    .on('broadcast', { event: 'element' }, ({ payload }) => {
      const next = (payload as TourElementPayload).event;
      if (next?.eventType === 'element') onEvent(next);
    })
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

export async function broadcastTourElement(tourId: string, event: TourEvent) {
  if (!supabase) return;
  const client = supabase;
  await new Promise<void>((resolve, reject) => {
    const channel = client.channel(tourChannelName(tourId), {
      config: { broadcast: { self: false } }
    });
    const timeout = window.setTimeout(() => {
      void client.removeChannel(channel);
      reject(new Error('No se pudo conectar con Realtime.'));
    }, 6000);

    channel.subscribe(async (status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        window.clearTimeout(timeout);
        void client.removeChannel(channel);
        reject(new Error('No se pudo emitir el evento del tour.'));
        return;
      }
      if (status !== 'SUBSCRIBED') return;
      await channel.send({ type: 'broadcast', event: 'element', payload: { event } });
      window.clearTimeout(timeout);
      void client.removeChannel(channel);
      resolve();
    });
  });
}

export function subscribeToTourPresence(tourId: string, key: string, onCount: (count: number) => void) {
  if (!supabase) return () => undefined;
  const client = supabase;
  const channel: RealtimeChannel = client
    .channel(tourChannelName(tourId), {
      config: { presence: { key } }
    })
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState() ?? {};
      onCount(Object.keys(state).length);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ online_at: new Date().toISOString() });
      }
    });

  return () => {
    void client.removeChannel(channel);
  };
}
