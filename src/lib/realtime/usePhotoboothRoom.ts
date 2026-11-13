'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type {
  Participant,
  RoomRole,
  PlayerColor,
  RTCSignal,
  RoomSyncAction,
  CursorPosition,
  ReactionItem,
} from './roomTypes';

interface UsePhotoboothRoomProps {
  roomCode: string | null;
  userName: string;
  role: RoomRole;
  enabled?: boolean;
}

export function usePhotoboothRoom({
  roomCode,
  userName,
  role,
  enabled = true,
}: UsePhotoboothRoomProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [partner, setPartner] = useState<Participant | null>(null);
  const [channelStatus, setChannelStatus] = useState<string>('DISCONNECTED');
  const [remoteCursor, setRemoteCursor] = useState<CursorPosition | null>(null);
  const [reactions, setReactions] = useState<ReactionItem[]>([]);

  // Callbacks for outer components
  const onSignalReceivedRef = useRef<((signal: RTCSignal) => void) | null>(null);
  const onSyncReceivedRef = useRef<((action: RoomSyncAction) => void) | null>(null);

  // Participant ID and color
  const participantIdRef = useRef<string>(
    typeof window !== 'undefined'
      ? sessionStorage.getItem('pb_participant_id') || Math.random().toString(36).substring(2, 9)
      : 'local'
  );

  const playerColor: PlayerColor = role === 'host' ? 'pink' : 'blue';

  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pb_participant_id', participantIdRef.current);
    }
  }, []);

  // Set callbacks
  const setOnSignalReceived = useCallback((fn: (signal: RTCSignal) => void) => {
    onSignalReceivedRef.current = fn;
  }, []);

  const setOnSyncReceived = useCallback((fn: (action: RoomSyncAction) => void) => {
    onSyncReceivedRef.current = fn;
  }, []);

  // Connect to Supabase Realtime Channel
  useEffect(() => {
    if (!enabled || !roomCode || !supabase) {
      setChannelStatus('IDLE');
      return;
    }

    const cleanCode = roomCode.toUpperCase().trim();
    const channelName = `photobooth:room:${cleanCode}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: participantIdRef.current },
      },
    });

    channelRef.current = channel;

    // Presence sync
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<Participant>();
        const allParticipants: Participant[] = [];

        Object.values(state).forEach((presences) => {
          presences.forEach((p) => {
            if (p && p.id) allParticipants.push(p);
          });
        });

        setParticipants(allParticipants);

        // Find partner (any participant with different ID)
        const other = allParticipants.find((p) => p.id !== participantIdRef.current);
        setPartner(other || null);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        const joined = newPresences[0] as unknown as Participant;
        if (joined && joined.id !== participantIdRef.current) {
          setPartner(joined);
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const left = leftPresences[0] as unknown as Participant;
        if (left && left.id !== participantIdRef.current) {
          setPartner(null);
        }
      });

    // Broadcast listeners
    channel
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        const signal = payload as RTCSignal;
        if (signal && signal.senderId !== participantIdRef.current) {
          onSignalReceivedRef.current?.(signal);
        }
      })
      .on('broadcast', { event: 'room_sync' }, ({ payload }) => {
        const action = payload as RoomSyncAction;
        if (action) {
          onSyncReceivedRef.current?.(action);
        }
      })
      .on('broadcast', { event: 'cursor' }, ({ payload }) => {
        const cursor = payload as CursorPosition;
        if (cursor && cursor.senderId !== participantIdRef.current) {
          setRemoteCursor(cursor);
        }
      })
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        const reaction = payload as ReactionItem;
        if (reaction) {
          setReactions((prev) => [...prev.slice(-10), reaction]);
        }
      });

    // Subscribe and track presence
    channel.subscribe(async (status) => {
      setChannelStatus(status);
      if (status === 'SUBSCRIBED') {
        const localUser: Participant = {
          id: participantIdRef.current,
          name: userName || (role === 'host' ? 'Host (You)' : 'Guest (You)'),
          role,
          color: playerColor,
          cameraReady: false,
          isReady: false,
          joinedAt: Date.now(),
        };
        await channel.track(localUser);
      }
    });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      setParticipants([]);
      setPartner(null);
      setChannelStatus('DISCONNECTED');
    };
  }, [enabled, roomCode, userName, role, playerColor]);

  // Dispatchers
  const sendSignal = useCallback((signal: RTCSignal) => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'signal',
      payload: signal,
    });
  }, []);

  const sendSync = useCallback((action: RoomSyncAction) => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'room_sync',
      payload: action,
    });
  }, []);

  const sendCursor = useCallback((x: number, y: number) => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'cursor',
      payload: {
        x,
        y,
        senderId: participantIdRef.current,
      },
    });
  }, []);

  const sendReaction = useCallback((emoji: string) => {
    if (!channelRef.current) return;
    const reaction: ReactionItem = {
      id: Math.random().toString(36).substring(2, 9),
      emoji,
      senderId: participantIdRef.current,
      senderName: userName,
      color: playerColor,
      x: 20 + Math.random() * 60, // random x between 20% and 80%
    };
    channelRef.current.send({
      type: 'broadcast',
      event: 'reaction',
      payload: reaction,
    });
    setReactions((prev) => [...prev.slice(-10), reaction]);
  }, [userName, playerColor]);

  const updateCameraReady = useCallback((cameraReady: boolean) => {
    if (!channelRef.current) return;
    channelRef.current.track({
      id: participantIdRef.current,
      name: userName,
      role,
      color: playerColor,
      cameraReady,
      isReady: false,
      joinedAt: Date.now(),
    });
  }, [userName, role, playerColor]);

  const updatePlayerReady = useCallback((isReady: boolean) => {
    if (!channelRef.current) return;
    channelRef.current.track({
      id: participantIdRef.current,
      name: userName,
      role,
      color: playerColor,
      cameraReady: true,
      isReady,
      joinedAt: Date.now(),
    });
  }, [userName, role, playerColor]);

  return {
    participantId: participantIdRef.current,
    playerColor,
    participants,
    partner,
    channelStatus,
    remoteCursor,
    reactions,
    sendSignal,
    sendSync,
    sendCursor,
    sendReaction,
    updateCameraReady,
    updatePlayerReady,
    setOnSignalReceived,
    setOnSyncReceived,
  };
}

