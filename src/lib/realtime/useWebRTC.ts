'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { RTCSignal } from './roomTypes';

// Google & Cloudflare public STUN servers + Metered Open Relay STUN/TURN for WebRTC peer-to-peer connection
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:openrelay.metered.ca:80' },
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
  const isMakingOfferRef = useRef(false);

  // Initialize or clean up RTCPeerConnection
  const cleanupPC = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    iceCandidatesQueue.current = [];
    isMakingOfferRef.current = false;
    setRemoteStream(null);
    setConnectionState('closed');
  }, []);

  const createPeerConnection = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return null;

    cleanupPC();

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState);
      setConnectionState(pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        if (typeof (pc as any).restartIce === 'function') {
          console.log('[WebRTC] Attempting ICE restart...');
          (pc as any).restartIce();
        }
      }
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
      console.log('[WebRTC] Track received:', event.track.kind, event.track.id);

      // Listen for when first RTP packets arrive from network
      event.track.onunmute = () => {
        console.log('[WebRTC] Track unmuted (media packets flowing):', event.track.kind);
        setRemoteStream((prev) => (prev ? new MediaStream(prev.getTracks()) : null));
      };

      // Always create a fresh MediaStream instance so React state and HTML5 video detect the change
      const incomingStream = event.streams && event.streams[0] ? event.streams[0] : null;
      setRemoteStream((prevStream) => {
        const sourceTracks = incomingStream ? incomingStream.getTracks() : [event.track];
        if (prevStream) {
          const merged = [...prevStream.getTracks()];
          sourceTracks.forEach((t) => {
            if (!merged.some((m) => m.id === t.id)) {
              merged.push(t);
            }
          });
          return new MediaStream(merged);
        }
        return new MediaStream(sourceTracks);
      });
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

    if (pc.signalingState !== 'stable') {
      console.log('[WebRTC] startCall invoked while signalingState is:', pc.signalingState);
      // If we already prepared an offer, re-send it so the guest receives it
      if (pc.localDescription && pc.localDescription.type === 'offer') {
        console.log('[WebRTC] Re-broadcasting existing local offer...');
        onSendSignal({
          type: 'offer',
          sdp: pc.localDescription,
          senderId,
        });
        return;
      }
      return;
    }

    // Attach latest local tracks
    if (localStream) {
      const senders = pc.getSenders();
      localStream.getTracks().forEach((track) => {
        const existing = senders.find((s) => s.track?.kind === track.kind);
        if (!existing) {
          try {
            pc!.addTrack(track, localStream);
          } catch (e) {}
        }
      });
    }

    try {
      isMakingOfferRef.current = true;
      console.log('[WebRTC] Creating offer...');
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      if (pc.signalingState !== 'stable') return;

      await pc.setLocalDescription(offer);
      onSendSignal({
        type: 'offer',
        sdp: offer,
        senderId,
      });
    } catch (err) {
      console.error('[WebRTC] Failed to create offer:', err);
    } finally {
      isMakingOfferRef.current = false;
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

          // Handle collision/glare
          if (pc.signalingState !== 'stable') {
            if (!isInitiator) {
              await pc.setLocalDescription({ type: 'rollback' });
            } else {
              return;
            }
          }

          // Add local tracks before creating answer
          if (localStream) {
            const senders = pc.getSenders();
            localStream.getTracks().forEach((track) => {
              const existing = senders.find((s) => s.track?.kind === track.kind);
              if (!existing) {
                try {
                  pc!.addTrack(track, localStream);
                } catch (e) {}
              }
            });
          }

          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

          // Drain queued ICE candidates
          while (iceCandidatesQueue.current.length > 0) {
            const candidate = iceCandidatesQueue.current.shift();
            if (candidate && candidate.candidate) {
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
          if (pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

            // Drain queued ICE candidates
            while (iceCandidatesQueue.current.length > 0) {
              const candidate = iceCandidatesQueue.current.shift();
              if (candidate && candidate.candidate) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                  console.warn('[WebRTC] Draining candidate error:', e);
                }
              }
            }
          }
        } else if (signal.type === 'candidate') {
          if (signal.candidate && signal.candidate.candidate) {
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
        }
      } catch (err) {
        console.error('[WebRTC] Error handling signal:', err);
      }
    },
    [createPeerConnection, isInitiator, localStream, onSendSignal, senderId, startCall]
  );

  // Sync track replacements when localStream changes (without re-triggering startCall renegotiation loop)
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
  }, [localStream]);

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
