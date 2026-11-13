'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { RTCSignal } from './roomTypes';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
};

interface UseWebRTCOptions {
  localStream: MediaStream | null;
  isInitiator: boolean;
  onSendSignal: (signal: RTCSignal) => void;
  senderId: string;
  enabled?: boolean;
}

export function useWebRTC({
  localStream,
  isInitiator,
  onSendSignal,
  senderId,
  enabled = true,
}: UseWebRTCOptions) {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);

  // Initialize or clean up RTCPeerConnection
  const cleanupPC = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    setRemoteStream(null);
    setConnectionState('closed');
  }, []);

  const createPeerConnection = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return null;

    cleanupPC();

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state changed:', pc.connectionState);
      setConnectionState(pc.connectionState);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        onSendSignal({
          type: 'candidate',
          candidate: event.candidate.toJSON(),
          senderId,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('[WebRTC] Track received:', event.track.kind);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else {
        setRemoteStream((prevStream) => {
          if (prevStream) {
            if (!prevStream.getTracks().some((t) => t.id === event.track.id)) {
              prevStream.addTrack(event.track);
            }
            return new MediaStream(prevStream.getTracks());
          }
          return new MediaStream([event.track]);
        });
      }
    };

    // Add local tracks if available
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        try {
          pc.addTrack(track, localStream);
        } catch (e) {
          console.warn('[WebRTC] addTrack error:', e);
        }
      });
    }

    return pc;
  }, [enabled, cleanupPC, localStream, onSendSignal, senderId]);

  // Initiate call if this client is initiator
  const startCall = useCallback(async () => {
    let pc = pcRef.current;
    if (!pc) {
      pc = createPeerConnection();
    }
    if (!pc) return;

    // Attach latest local tracks
    if (localStream) {
      const senders = pc.getSenders();
      localStream.getTracks().forEach((track) => {
        if (!senders.some((s) => s.track === track)) {
          try {
            pc.addTrack(track, localStream);
          } catch (e) {}
        }
      });
    }

    try {
      console.log('[WebRTC] Creating offer...');
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      onSendSignal({
        type: 'offer',
        sdp: offer,
        senderId,
      });
    } catch (err) {
      console.error('[WebRTC] Failed to create offer:', err);
    }
  }, [createPeerConnection, localStream, onSendSignal, senderId]);

  // Request offer from host (used by guest when guest camera becomes ready)
  const requestOffer = useCallback(() => {
    console.log('[WebRTC] Requesting offer from host...');
    onSendSignal({
      type: 'request_offer',
      senderId,
    });
  }, [onSendSignal, senderId]);

  // Process incoming signal
  const handleSignal = useCallback(
    async (signal: RTCSignal) => {
      let pc = pcRef.current;
      if (!pc) {
        pc = createPeerConnection();
      }
      if (!pc) return;

      try {
        if (signal.type === 'request_offer') {
          if (isInitiator) {
            console.log('[WebRTC] Received request_offer from guest. Starting call...');
            await startCall();
          }
        } else if (signal.type === 'offer') {
          console.log('[WebRTC] Received offer, applying remote description');
          // Add local tracks before creating answer
          if (localStream) {
            const senders = pc.getSenders();
            localStream.getTracks().forEach((track) => {
              if (!senders.some((s) => s.track === track)) {
                try {
                  pc.addTrack(track, localStream);
                } catch (e) {}
              }
            });
          }

          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

          // Drain queued ICE candidates
          while (iceCandidatesQueue.current.length > 0) {
            const candidate = iceCandidatesQueue.current.shift();
            if (candidate) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (e) {
                console.warn('[WebRTC] Draining candidate error:', e);
              }
            }
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          console.log('[WebRTC] Answer sent to host');
          onSendSignal({
            type: 'answer',
            sdp: answer,
            senderId,
          });
        } else if (signal.type === 'answer') {
          console.log('[WebRTC] Received answer, applying remote description');
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

          // Drain queued ICE candidates
          while (iceCandidatesQueue.current.length > 0) {
            const candidate = iceCandidatesQueue.current.shift();
            if (candidate) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (e) {
                console.warn('[WebRTC] Draining candidate error:', e);
              }
            }
          }
        } else if (signal.type === 'candidate') {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            } catch (e) {
              console.warn('[WebRTC] addIceCandidate error:', e);
            }
          } else {
            iceCandidatesQueue.current.push(signal.candidate);
          }
        }
      } catch (err) {
        console.error('[WebRTC] Error handling signal:', err);
      }
    },
    [createPeerConnection, isInitiator, localStream, onSendSignal, senderId, startCall]
  );

  // Sync track replacements when localStream changes
  useEffect(() => {
    const pc = pcRef.current;
    if (!pc || !localStream) return;

    const senders = pc.getSenders();
    localStream.getTracks().forEach((track) => {
      const sender = senders.find((s) => s.track?.kind === track.kind);
      if (sender) {
        sender.replaceTrack(track).catch(console.error);
      } else {
        try {
          pc.addTrack(track, localStream);
        } catch (e) {}
      }
    });

    // If initiator and connection is stable, update call
    if (isInitiator && pc.remoteDescription && pc.signalingState === 'stable') {
      startCall();
    }
  }, [localStream, isInitiator, startCall]);

  // Audio / Video toggles
  const toggleAudio = useCallback(() => {
    if (!localStream) return;
    const audioTracks = localStream.getAudioTracks();
    audioTracks.forEach((track) => {
      track.enabled = !track.enabled;
    });
    setIsAudioMuted(!audioTracks[0]?.enabled);
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (!localStream) return;
    const videoTracks = localStream.getVideoTracks();
    videoTracks.forEach((track) => {
      track.enabled = !track.enabled;
    });
    setIsVideoMuted(!videoTracks[0]?.enabled);
  }, [localStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupPC();
    };
  }, [cleanupPC]);

  return {
    remoteStream,
    connectionState,
    startCall,
    requestOffer,
    handleSignal,
    toggleAudio,
    toggleVideo,
    isAudioMuted,
    isVideoMuted,
  };
}
