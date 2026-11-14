'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { RTCSignal } from './roomTypes';

// Google public STUN servers for WebRTC peer-to-peer connection
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
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

  // Apply 480p 30fps constraints to transmitted video stream
  const applyVideoSenderConstraints = useCallback(async (sender: RTCRtpSender, track: MediaStreamTrack) => {
    if (track.kind !== 'video') return;
    try {
      const settings = track.getSettings();
      const height = settings.height || 720;
      // Downscale so transmitted preview stream is 480p (ideal for mobile & PC smooth 30-60fps)
      const scaleFactor = height > 480 ? Math.max(1, height / 480) : 1;

      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      params.encodings[0].scaleResolutionDownBy = scaleFactor;
      params.encodings[0].maxBitrate = 900_000; // 900 kbps (lightweight 480p)
      params.encodings[0].maxFramerate = 30; // 30 FPS preview target
      (params as any).degradationPreference = 'maintain-framerate'; // Prioritize fluid framerate over resolution

      await sender.setParameters(params);
      console.log(`[WebRTC] Video stream constrained to 480p@30fps (scale: ${scaleFactor.toFixed(2)})`);
    } catch (err) {
      console.warn('[WebRTC] setParameters error (ignorable):', err);
    }
  }, []);

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

    // Add local tracks if available and apply 480p preview constraints
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        try {
          const sender = pc.addTrack(track, localStream);
          if (track.kind === 'video') {
            applyVideoSenderConstraints(sender, track);
          }
        } catch (e) {
          console.warn('[WebRTC] addTrack error:', e);
        }
      });
    }

    return pc;
  }, [enabled, cleanupPC, localStream, onSendSignal, senderId, applyVideoSenderConstraints]);

  // Initiate call if this client is initiator
  const startCall = useCallback(async () => {
    let pc = pcRef.current;
    if (!pc) {
      pc = createPeerConnection();
    }
    if (!pc) return;

    if (pc.signalingState !== 'stable') {
      console.log('[WebRTC] Cannot startCall, signalingState is not stable:', pc.signalingState);
      return;
    }

    // Attach latest local tracks
    if (localStream) {
      const senders = pc.getSenders();
      localStream.getTracks().forEach((track) => {
        const existing = senders.find((s) => s.track?.kind === track.kind);
        if (!existing) {
          try {
            const sender = pc!.addTrack(track, localStream);
            if (track.kind === 'video') {
              applyVideoSenderConstraints(sender, track);
            }
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
  }, [createPeerConnection, localStream, onSendSignal, senderId, applyVideoSenderConstraints]);

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
                  const sender = pc!.addTrack(track, localStream);
                  if (track.kind === 'video') {
                    applyVideoSenderConstraints(sender, track);
                  }
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
    [createPeerConnection, isInitiator, localStream, onSendSignal, senderId, startCall, applyVideoSenderConstraints]
  );

  // Sync track replacements when localStream changes (without re-triggering startCall renegotiation loop)
  useEffect(() => {
    const pc = pcRef.current;
    if (!pc || !localStream) return;

    const senders = pc.getSenders();
    localStream.getTracks().forEach((track) => {
      const sender = senders.find((s) => s.track?.kind === track.kind);
      if (sender) {
        sender.replaceTrack(track).then(() => {
          if (track.kind === 'video') {
            applyVideoSenderConstraints(sender, track);
          }
        }).catch(console.error);
      } else {
        try {
          const newSender = pc.addTrack(track, localStream);
          if (track.kind === 'video') {
            applyVideoSenderConstraints(newSender, track);
          }
        } catch (e) {}
      }
    });
  }, [localStream, applyVideoSenderConstraints]);

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
