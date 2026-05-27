import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useRealtimeEvents(onUpdate: () => void) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    channelRef.current = supabase
      .channel('events-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, onUpdate)
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [onUpdate]);
}

export function useRealtimeNotifications(userId: string, onNew: () => void) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId) return;

    channelRef.current = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        onNew
      )
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [userId, onNew]);
}
