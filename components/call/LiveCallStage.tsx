'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  RefreshCw, 
  Crown, 
  Gift, 
  ShieldCheck, 
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Camera
} from 'lucide-react';
import { MemberProfile } from '@/lib/mockData';
import { CreditsAndGiftingModal } from '@/components/ui/CreditsAndGiftingModal';
import { BespokeGift } from '@/lib/creditsStore';
import { getCanonicalRoomId } from '@/lib/callRoomId';
import { callRingtone } from '@/lib/callRingtone';
import { 
  DEFAULT_RTC_CONFIGURATION, 
  optimizeSdpForNetwork, 
  KMC_LUXE_FILTERS, 
  FilterKey, 
  applyKmcSenderParameters 
} from '@/lib/webrtcIceConfig';

export interface LiveCallStageProps {
  partnerId: string;
  partnerName?: string;
  partnerPhoto?: string;
  partnerOccupation?: string;
  partnerLocation?: string;
  initialMode?: 'voice' | 'video';
  initialRoomId?: string;
  role?: 'caller' | 'callee';
  onEndCall?: (durationFormatted: string) => void;
}

export function LiveCallStage({
  partnerId,
  partnerName = 'Club Member',
  partnerPhoto = '',
  partnerOccupation = 'Member',
  partnerLocation = 'Verified Member',
  initialMode = 'video',
  initialRoomId,
  role: initialRole,
  onEndCall
}: LiveCallStageProps) {
  const [callMode, setCallMode] = useState<'voice' | 'video'>(initialMode);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(initialMode === 'voice');
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [callConnected, setCallConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>(
    initialRole === 'callee' ? 'Connecting secure line...' : 'Calling exclusive member...'
  );
  const [activeFilter, setActiveFilter] = useState<FilterKey>('luxe');
  const [showFilters, setShowFilters] = useState(false);

  // Floating reactions & animations
  const [floatingReactions, setFloatingReactions] = useState<Array<{ id: string; emoji: string; x: number }>>([]);
  const [heartBursts, setHeartBursts] = useState<Array<{ id: string; x: number; y: number }>>([]);
  const lastTapRef = useRef<number>(0);

  // Gifting state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'gifting' | 'topup' | 'elite'>('gifting');
  const [activeGiftEffect, setActiveGiftEffect] = useState<{ gift: BespokeGift; reaction: string } | null>(null);

  // Media & WebRTC Refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidatesRef = useRef<any[]>([]);

  // Call management state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [partnerCameraOff, setPartnerCameraOff] = useState(false);
  const [partnerMicMuted, setPartnerMicMuted] = useState(false);
  const [mediaPermissionError, setMediaPermissionError] = useState<string | null>(null);
  const [isMediaStarting, setIsMediaStarting] = useState(false);

  // Guarantee local self-view binding whenever local stream or camera state updates
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, cameraOff]);

  // Current session resolution
  const getInitialUserId = () => {
    if (typeof window === 'undefined') return 'caller';
    try {
      const saved = localStorage.getItem('kmc_user_profile');
      if (saved) {
        const p = JSON.parse(saved);
        if (p.id) return p.id;
      }
      const sess = localStorage.getItem('kmc_session');
      if (sess) {
        const s = JSON.parse(sess);
        if (s.userId || s.id) return s.userId || s.id;
      }
    } catch {}
    return 'user-me';
  };

  const getInitialUserName = () => {
    if (typeof window === 'undefined') return 'Exclusive Member';
    try {
      const saved = localStorage.getItem('kmc_user_profile');
      if (saved) {
        const p = JSON.parse(saved);
        if (p.customName || p.fullName || p.name) return p.customName || p.fullName || p.name;
      }
      const sess = localStorage.getItem('kmc_session');
      if (sess) {
        const s = JSON.parse(sess);
        if (s.customName || s.fullName || s.name) return s.customName || s.fullName || s.name;
      }
    } catch {}
    return 'Exclusive Member';
  };

  const [currentUserId] = useState<string>(getInitialUserId);
  const [currentUserName] = useState<string>(getInitialUserName);
  const [currentUserPhoto] = useState<string>('');

  const [profile, setProfile] = useState<MemberProfile>({
    id: partnerId,
    name: partnerName,
    age: 28,
    location: partnerLocation,
    occupation: partnerOccupation,
    education: 'Verified',
    bio: '',
    height: "5'10\"",
    verified: true,
    tier: 'ELITE',
    compatibility: 95,
    relationshipGoals: 'Exclusive Dating',
    photos: partnerPhoto ? [partnerPhoto] : [],
    interests: [],
    lifestyle: { travel: '', drink: '', workout: '', pets: '' },
    online: true,
    distance: 'Direct'
  });

  const stopRingbackRef = useRef<(() => void) | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const candidateBatchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const candidateQueueRef = useRef<any[]>([]);
  const endedRef = useRef(false);
  const secondsElapsedRef = useRef(0);
  const roomIdRef = useRef<string>('');
  const peerIdRef = useRef<string>('');
  const peerRoleRef = useRef<'caller' | 'callee'>(initialRole === 'callee' ? 'callee' : 'caller');
  const lastEventTimestampRef = useRef<number>(0);

  // Fallback photo lookup from directory
  useEffect(() => {
    if (!profile.photos || profile.photos.length === 0 || !profile.photos[0]) {
      fetch(`/api/directory?search=${encodeURIComponent(partnerName)}`)
        .then(res => res.json())
        .then(data => {
          if (data.members && data.members.length > 0) {
            const found = data.members.find((m: any) => m.id === partnerId || m.name === partnerName);
            if (found && found.photos && found.photos.length > 0) {
              setProfile(prev => ({
                ...prev,
                photos: found.photos,
                occupation: found.occupation || prev.occupation,
                location: found.location || prev.location
              }));
            }
          }
        })
        .catch(() => {});
    }
  }, [partnerId, partnerName]);

  // Duration Timer (Runs when call is connected)
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed(prev => {
        const next = prev + 1;
        secondsElapsedRef.current = next;
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Robust, Progressive In-App Local Camera & Microphone Acquisition
  const acquireMediaStream = async (targetFacing: 'user' | 'environment' = facingMode): Promise<MediaStream | null> => {
    setIsMediaStarting(true);
    setMediaPermissionError(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setIsMediaStarting(false);
      setMediaPermissionError('Camera API not available on this device');
      return null;
    }

    let stream: MediaStream | null = null;

    // 1. Voice Mode
    if (callMode === 'voice') {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch (e) {
        console.warn('Voice acquisition fallback failed:', e);
      }
    } else {
      // 2. Video Mode: Instant Ultra-Fast Hardware Acquisition
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { facingMode: targetFacing }
        });
      } catch (err1) {
        console.warn('Primary camera attempt:', err1);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true
          });
        } catch (err2) {
          console.warn('Secondary camera attempt:', err2);
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: false
            });
          } catch (err3) {
            console.warn('Audio fallback attempt:', err3);
          }
        }
      }
    }

    setIsMediaStarting(false);

    if (stream) {
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Attach stream to local self-view
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }

      // Connect or replace tracks on existing RTCPeerConnection
      const pc = peerConnectionRef.current;
      if (pc) {
        const senders = pc.getSenders();
        stream.getTracks().forEach(track => {
          const matchingSender = senders.find(s => s.track?.kind === track.kind) || senders.find(s => !s.track);
          if (matchingSender) {
            matchingSender.replaceTrack(track).catch(() => {});
          } else {
            try {
              pc.addTrack(track, stream!);
            } catch {}
          }
        });
        applyKmcSenderParameters(pc, 'high');
      }

      return stream;
    } else {
      setMediaPermissionError('Please allow camera & microphone access to connect');
      return null;
    }
  };

  // Dispatch signaling events to partner peer
  const sendSignalingEvent = async (type: string, data: any) => {
    const activeRoom = roomIdRef.current;
    const activePeer = peerIdRef.current;
    if (!activeRoom || !activePeer) return;

    fetch('/api/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send_event',
        roomId: activeRoom,
        peerId: activePeer,
        type,
        data
      })
    }).catch(() => {});
  };

  // Queue ICE candidates for efficient batched POST
  const queueIceCandidate = (candidate: any) => {
    candidateQueueRef.current.push(candidate);
    if (!candidateBatchTimerRef.current) {
      candidateBatchTimerRef.current = setTimeout(() => {
        candidateBatchTimerRef.current = null;
        const batch = [...candidateQueueRef.current];
        candidateQueueRef.current = [];
        if (batch.length === 0) return;

        fetch('/api/call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send_ice',
            roomId: roomIdRef.current,
            peerId: peerIdRef.current,
            role: peerRoleRef.current,
            candidates: batch
          })
        }).catch(() => {});
      }, 150);
    }
  };

  // Primary WebRTC Connection Pipeline
  useEffect(() => {
    endedRef.current = false;

    // 0. Instantly acquire camera and microphone in 0ms upon call placement
    acquireMediaStream(facingMode);

    const canonicalRoom = (initialRoomId || getCanonicalRoomId(currentUserId || 'caller', partnerId))
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .slice(0, 50);

    roomIdRef.current = canonicalRoom;

    let currentPeer = '';
    try {
      const stored = sessionStorage.getItem(`kmc_peer_${canonicalRoom}`);
      if (stored) currentPeer = stored;
      else {
        currentPeer = `peer-${Math.random().toString(36).substring(2, 9)}`;
        sessionStorage.setItem(`kmc_peer_${canonicalRoom}`, currentPeer);
      }
    } catch {
      currentPeer = `peer-${Math.random().toString(36).substring(2, 9)}`;
    }
    peerIdRef.current = currentPeer;

    remoteStreamRef.current = new MediaStream();

    // 1. Audio tone management
    if (initialRole === 'callee') {
      callRingtone.stopAll();
      setConnectionStatus('Connecting secure date...');
      peerRoleRef.current = 'callee';
    } else {
      peerRoleRef.current = 'caller';
      stopRingbackRef.current = callRingtone.startOutgoingRingback();
      setConnectionStatus('Calling member...');

      // Notify callee
      fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          action: 'initiate_call',
          roomId: canonicalRoom,
          callerId: currentUserId || 'caller',
          callerName: currentUserName || 'Exclusive Member',
          callerPhoto: currentUserPhoto,
          calleeId: partnerId,
          calleeName: partnerName,
          callMode: callMode
        })
      }).catch(() => {});
    }

    // 2. Setup RTCPeerConnection with dynamic Metered TURN credentials
    let isDisposed = false;

    const setupPeerConnection = async () => {
      let rtcConfig: RTCConfiguration = DEFAULT_RTC_CONFIGURATION;
      try {
        const iceRes = await fetch('/api/ice-servers');
        if (iceRes.ok) {
          const iceData = await iceRes.json();
          if (Array.isArray(iceData?.iceServers) && iceData.iceServers.length > 0) {
            rtcConfig = { ...DEFAULT_RTC_CONFIGURATION, iceServers: iceData.iceServers };
          }
        }
      } catch {}

      if (isDisposed) return;

      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;

      // Allocate transceivers so SDP negotiation generates complete audio & video m-lines immediately
      try {
        if (pc.getTransceivers().length === 0) {
          pc.addTransceiver('audio', { direction: 'sendrecv' });
          pc.addTransceiver('video', { direction: 'sendrecv' });
        }
      } catch {}

      // If localStream was already acquired in parallel, attach tracks immediately
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          try {
            pc.addTrack(track, localStreamRef.current!);
          } catch {}
        });
        applyKmcSenderParameters(pc, 'high');
      }

      // Handle local ICE candidates
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          queueIceCandidate(e.candidate.toJSON());
        }
      };

      // Handle incoming remote media tracks
      pc.ontrack = (e) => {
        if (e.streams && e.streams[0]) {
          const remoteStr = e.streams[0];
          remoteStreamRef.current = remoteStr;

          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStr;
            remoteVideoRef.current.play().catch(() => {});
          }
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStr;
            remoteAudioRef.current.play().catch(() => {});
          }

          const hasVid = remoteStr.getVideoTracks().length > 0;
          setHasRemoteVideo(hasVid);
        }

        // Once remote media is received, stop all ringtones & mark connected
        callRingtone.stopAll();
        if (stopRingbackRef.current) {
          stopRingbackRef.current();
          stopRingbackRef.current = null;
        }
        setCallConnected(true);
        setConnectionStatus('Connected');
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === 'connected') {
          callRingtone.stopAll();
          if (stopRingbackRef.current) {
            stopRingbackRef.current();
            stopRingbackRef.current = null;
          }
          setCallConnected(true);
          setConnectionStatus('Connected');
          applyKmcSenderParameters(pc, 'high');
        } else if (state === 'disconnected' || state === 'failed') {
          setConnectionStatus('Reconnecting...');
        }
      };

      // 3. Attach local tracks to peer connection if stream is already active
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          try {
            const senders = pc.getSenders();
            const sender = senders.find(s => s.track?.kind === track.kind) || senders.find(s => !s.track);
            if (sender) {
              sender.replaceTrack(track).catch(() => {});
            } else {
              pc.addTrack(track, localStreamRef.current!);
            }
          } catch {}
        });
      }

      // 4. Join room on signaling server
      try {
        const joinRes = await fetch('/api/call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'join_room',
            roomId: canonicalRoom,
            peerId: currentPeer,
            role: peerRoleRef.current,
            userName: currentUserName,
            userPhoto: currentUserPhoto
          })
        });

        const joinData = await joinRes.json();
        const effectiveRole = joinData.role || peerRoleRef.current;
        peerRoleRef.current = effectiveRole;

        if (effectiveRole === 'caller') {
          // Caller creates SDP offer
          const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
          const optimizedOffer = optimizeSdpForNetwork(offer.sdp || '');
          await pc.setLocalDescription({ type: offer.type, sdp: optimizedOffer });

          await fetch('/api/call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'send_offer',
              roomId: canonicalRoom,
              peerId: currentPeer,
              sdp: { type: offer.type, sdp: optimizedOffer }
            })
          });
        } else {
          // Callee checks if caller's offer is already available
          if (joinData.offer && !pc.currentRemoteDescription) {
            await pc.setRemoteDescription(new RTCSessionDescription(joinData.offer));
            const answer = await pc.createAnswer();
            const optimizedAnswer = optimizeSdpForNetwork(answer.sdp || '');
            await pc.setLocalDescription({ type: answer.type, sdp: optimizedAnswer });

            await fetch('/api/call', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'send_answer',
                roomId: canonicalRoom,
                peerId: currentPeer,
                sdp: { type: answer.type, sdp: optimizedAnswer }
              })
            });

            // Process any pending queued candidates
            for (const cand of pendingCandidatesRef.current) {
              try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch {}
            }
            pendingCandidatesRef.current = [];
          }
        }
      } catch (err) {
        console.warn('Signaling init error:', err);
      }

      // 5. Polling Loop for Remote SDP Answer, Candidates, and End Status
      let nextCandidateIndex = 0;

      pollTimerRef.current = setInterval(async () => {
        if (endedRef.current) return;

        try {
          const pollRes = await fetch(
            `/api/call?action=poll_signaling&roomId=${encodeURIComponent(canonicalRoom)}&peerId=${encodeURIComponent(currentPeer)}&lastCandidateIndex=${nextCandidateIndex}&lastEventTimestamp=${lastEventTimestampRef.current}`
          );
          if (!pollRes.ok) return;
          const pollData = await pollRes.json();

          // Remote hangup / decline check
          const remoteEnded =
            pollData.inviteStatus === 'DECLINED' ||
            pollData.inviteStatus === 'CANCELLED' ||
            pollData.inviteStatus === 'ENDED' ||
            pollData.status === 'ENDED' ||
            pollData.roomStatus === 'cancelled';

          if (remoteEnded) {
            handleEndCall({ remote: true });
            return;
          }

          // If caller sees callee accepted, stop ringback immediately
          if (pollData.inviteStatus === 'ACCEPTED' || pollData.answer) {
            callRingtone.stopAll();
            if (stopRingbackRef.current) {
              stopRingbackRef.current();
              stopRingbackRef.current = null;
            }
            setConnectionStatus('Connected');
            setCallConnected(true);
          }

          const currentPc = peerConnectionRef.current;
          if (!currentPc) return;

          // Caller receives Callee's SDP Answer
          if (peerRoleRef.current === 'caller' && pollData.answer && !currentPc.currentRemoteDescription) {
            await currentPc.setRemoteDescription(new RTCSessionDescription(pollData.answer));

            for (const cand of pendingCandidatesRef.current) {
              try { await currentPc.addIceCandidate(new RTCIceCandidate(cand)); } catch {}
            }
            pendingCandidatesRef.current = [];
          }

          // Callee receives Caller's SDP Offer (if not already set)
          if (peerRoleRef.current === 'callee' && pollData.offer && !currentPc.currentRemoteDescription) {
            await currentPc.setRemoteDescription(new RTCSessionDescription(pollData.offer));
            const answer = await currentPc.createAnswer();
            const optimizedAnswer = optimizeSdpForNetwork(answer.sdp || '');
            await currentPc.setLocalDescription({ type: answer.type, sdp: optimizedAnswer });

            await fetch('/api/call', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'send_answer',
                roomId: canonicalRoom,
                peerId: currentPeer,
                sdp: { type: answer.type, sdp: optimizedAnswer }
              })
            });

            for (const cand of pendingCandidatesRef.current) {
              try { await currentPc.addIceCandidate(new RTCIceCandidate(cand)); } catch {}
            }
            pendingCandidatesRef.current = [];
          }

          // Ingest remote ICE candidates
          if (Array.isArray(pollData.candidates) && pollData.candidates.length > 0) {
            nextCandidateIndex = pollData.nextCandidateIndex || (nextCandidateIndex + pollData.candidates.length);
            for (const candidate of pollData.candidates) {
              if (currentPc.remoteDescription && currentPc.remoteDescription.type) {
                try {
                  await currentPc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch {}
              } else {
                pendingCandidatesRef.current.push(candidate);
              }
            }
          }

          // Handle Partner Events (Reactions, Camera/Mic Mute toggles)
          if (Array.isArray(pollData.events)) {
            for (const ev of pollData.events) {
              if (ev.timestamp > lastEventTimestampRef.current) {
                lastEventTimestampRef.current = ev.timestamp;
                if (ev.type === 'reaction' && ev.data?.emoji) {
                  spawnReaction(ev.data.emoji);
                } else if (ev.type === 'media_state') {
                  if (typeof ev.data?.cameraOff === 'boolean') {
                    setPartnerCameraOff(ev.data.cameraOff);
                  }
                  if (typeof ev.data?.micMuted === 'boolean') {
                    setPartnerMicMuted(ev.data.micMuted);
                  }
                }
              }
            }
          }
        } catch {}
      }, 1200);
    };

    setupPeerConnection();

    return () => {
      isDisposed = true;
      callRingtone.stopAll();
      if (stopRingbackRef.current) {
        stopRingbackRef.current();
        stopRingbackRef.current = null;
      }
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (candidateBatchTimerRef.current) clearTimeout(candidateBatchTimerRef.current);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    };
  }, [partnerId, initialRoomId]);

  // End Call Handler
  const handleEndCall = (opts?: { remote?: boolean }) => {
    if (endedRef.current) return;
    endedRef.current = true;

    callRingtone.stopAll();
    if (stopRingbackRef.current) {
      stopRingbackRef.current();
      stopRingbackRef.current = null;
    }
    callRingtone.playCallEndTone();

    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    const activeRoomId = roomIdRef.current;
    if (activeRoomId && !opts?.remote) {
      fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          action: 'end_call',
          roomId: activeRoomId,
          peerId: currentUserId
        })
      }).catch(() => {});
    }

    const durationStr = formatDuration(secondsElapsedRef.current);
    if (onEndCall) {
      onEndCall(durationStr);
    }
  };

  // Toggle Microphone Mute
  const handleToggleMic = () => {
    const next = !micMuted;
    setMicMuted(next);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !next;
      });
    }
    sendSignalingEvent('media_state', { micMuted: next });
  };

  // Toggle Camera On / Off
  const handleToggleCamera = async () => {
    const next = !cameraOff;
    setCameraOff(next);

    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !next;
      });
    }

    // If user previously started voice-only, acquire video stream
    if (!next && (!localStreamRef.current || localStreamRef.current.getVideoTracks().length === 0)) {
      await acquireMediaStream(facingMode);
    }

    sendSignalingEvent('media_state', { cameraOff: next });
  };

  // Flip Camera (Front <-> Rear)
  const handleFlipCamera = async () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);

    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => track.stop());
    }

    await acquireMediaStream(nextFacing);
  };

  // Spawn Floating Reaction
  const spawnReaction = (emoji: string) => {
    const id = `rx_${Date.now()}_${Math.random()}`;
    const x = 15 + Math.random() * 70;
    setFloatingReactions(prev => [...prev, { id, emoji, x }]);
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== id));
    }, 3000);
  };

  const handleSendReaction = (emoji: string) => {
    spawnReaction(emoji);
    sendSignalingEvent('reaction', { emoji });
  };

  // Double-tap stage for instant Heart Burst
  const handleStageTap = (e: React.MouseEvent | React.TouchEvent) => {
    // Also unlock mobile audio autoplay if blocked
    if (remoteAudioRef.current && remoteAudioRef.current.paused) {
      remoteAudioRef.current.play().catch(() => {});
    }
    if (remoteVideoRef.current && remoteVideoRef.current.paused) {
      remoteVideoRef.current.play().catch(() => {});
    }

    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      const clientX = 'touches' in e && e.touches[0] ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e && e.touches[0] ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      const id = `hb_${Date.now()}_${Math.random()}`;
      setHeartBursts(prev => [...prev, { id, x: clientX || window.innerWidth / 2, y: clientY || window.innerHeight / 2 }]);
      handleSendReaction('❤️');
      setTimeout(() => {
        setHeartBursts(prev => prev.filter(h => h.id !== id));
      }, 1400);
    }
    lastTapRef.current = now;
  };

  const initials = (profile.name || 'Member')
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div 
      onClick={handleStageTap}
      className="fixed inset-0 z-[999999] h-[100dvh] w-full bg-[#050507] text-[#F4F4F6] relative overflow-hidden select-none font-sans"
    >
      {/* Hidden Audio Element for Guaranteed High-Fidelity Remote Audio */}
      <audio ref={remoteAudioRef} autoPlay playsInline muted={speakerMuted} />

      {/* FLOATING REAL-TIME REACTIONS PARTICLES */}
      <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
        <AnimatePresence>
          {floatingReactions.map(rx => (
            <motion.div
              key={rx.id}
              initial={{ opacity: 0, y: 30, scale: 0.5 }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: -650,
                scale: [0.5, 1.4, 1.2, 0.9],
                rotate: [0, -12, 12, -8, 0]
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.8, ease: "easeOut" }}
              style={{ left: `${rx.x}%` }}
              className="absolute bottom-28 text-4xl sm:text-5xl filter drop-shadow-[0_0_20px_rgba(212,175,55,0.9)]"
            >
              {rx.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Interactive Double-Tap Heart Burst */}
      <AnimatePresence>
        {heartBursts.map(h => (
          <motion.div
            key={h.id}
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.3, 2, 2.3, 2], y: -120 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{ left: h.x - 30, top: h.y - 30 }}
            className="fixed z-50 pointer-events-none text-5xl filter drop-shadow-[0_0_25px_rgba(255,50,100,0.9)]"
          >
            ❤️
          </motion.div>
        ))}
      </AnimatePresence>

      {/* 1. TOP SLEEK LUXURY VIP HEADER (Unified Floating Overlay) */}
      <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between gap-3 bg-black/85 backdrop-blur-xl p-3 sm:p-3.5 rounded-2xl border border-[#D4AF37]/35 shadow-[0_8px_32px_rgba(0,0,0,0.85)]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 border-[#D4AF37] p-0.5 bg-black shadow-[0_0_15px_rgba(212,175,55,0.4)] overflow-hidden">
              {profile.photos?.[0] ? (
                <img src={profile.photos[0]} alt={profile.name} className="w-full h-full object-cover rounded-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#111116] font-serif font-bold text-base text-[#D4AF37]">
                  {initials}
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-black flex items-center justify-center">
              <ShieldCheck className="w-2.5 h-2.5 text-black" />
            </div>
          </div>

          <div className="min-w-0 flex flex-col">
            <div className="flex items-center gap-1.5">
              <h2 className="font-serif text-sm sm:text-base font-bold text-white truncate">{profile.name}</h2>
              <Crown className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
            </div>
            <div className="flex items-center gap-2 text-[11px] text-neutral-300">
              <span className={`flex items-center gap-1 font-semibold ${callConnected ? 'text-emerald-400' : 'text-[#D4AF37] animate-pulse'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${callConnected ? 'bg-emerald-400 animate-pulse' : 'bg-[#D4AF37]'}`} />
                {callConnected ? formatDuration(secondsElapsed) : connectionStatus}
              </span>
              <span>•</span>
              <span className="truncate text-neutral-400">{profile.occupation || 'Exclusive Member'}</span>
            </div>
          </div>
        </div>

        {/* Single Unified Action Controls (VIP Gift & End Call) */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setModalTab('gifting');
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl gold-gradient-bg text-black font-bold text-xs hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(212,175,55,0.4)]"
            title="Send VIP Gift"
          >
            <Gift className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Gift</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEndCall();
            }}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center gap-1.5 shadow-[0_0_20px_rgba(225,29,72,0.5)] font-bold text-xs transition-all border border-rose-400/40"
            title="End Call"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>End Call</span>
          </button>
        </div>
      </div>

      {/* 2. FULLSCREEN LUXURY VIDEO & VOICE STAGE */}
      <div className="absolute inset-0 z-10 w-full h-full bg-black overflow-hidden">
        {/* Remote Partner Video Stream */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          muted={speakerMuted}
          style={{ filter: KMC_LUXE_FILTERS[activeFilter].filter }}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            callConnected && hasRemoteVideo && !partnerCameraOff ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
          }`}
        />

        {/* Fallback Luxury Calling / Ringing / Voice Mode Screen */}
        {(!callConnected || !hasRemoteVideo || partnerCameraOff) && (
          <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-6 text-center z-10 bg-[#07070A] overflow-hidden">
            {/* Ambient Blurred Background Wallpaper */}
            {profile.photos?.[0] && (
              <div 
                className="absolute inset-0 bg-cover bg-center filter blur-3xl opacity-25 scale-125 pointer-events-none"
                style={{ backgroundImage: `url(${profile.photos[0]})` }}
              />
            )}

            {/* Glowing Golden Aura Avatar */}
            <div className="relative mb-6">
              <div className="absolute -inset-4 rounded-full bg-[#D4AF37]/20 filter blur-xl animate-pulse" />
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-3 border-[#D4AF37] p-1 bg-black shadow-[0_0_50px_rgba(212,175,55,0.4)] overflow-hidden relative z-10">
                {profile.photos?.[0] ? (
                  <img src={profile.photos[0]} alt={profile.name} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#111116] font-serif font-bold text-3xl text-[#D4AF37]">
                    {initials}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full gold-gradient-bg border-2 border-black flex items-center justify-center shadow-lg z-20">
                <Crown className="w-4 h-4 text-black" />
              </div>
            </div>

            <h3 className="font-serif text-2xl font-bold text-white tracking-wider mb-2 relative z-10">
              {profile.name}
            </h3>

            <p className="text-sm text-[#D4AF37] font-semibold tracking-wide mb-1 relative z-10">
              {callConnected ? (callMode === 'voice' ? 'Exclusive Private Voice Date' : (partnerCameraOff ? 'Partner Camera Paused' : 'Connected')) : connectionStatus}
            </p>

            <p className="text-xs text-neutral-400 relative z-10">
              {callConnected ? formatDuration(secondsElapsed) : 'Secured with 256-bit End-to-End Encryption'}
            </p>

            {/* Tap to Activate Camera & Audio Helper if permission blocked */}
            {!isMediaStarting && mediaPermissionError && !localStream && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  acquireMediaStream(facingMode);
                }}
                className="mt-6 px-4 py-2.5 rounded-xl gold-gradient-bg text-black font-bold text-xs shadow-[0_0_20px_rgba(212,175,55,0.5)] flex items-center gap-2 hover:scale-105 active:scale-95 transition-all relative z-20"
              >
                <Camera className="w-4 h-4" />
                <span>Tap to Enable Camera & Audio</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. SELF-VIEW PICTURE-IN-PICTURE (PiP) */}
      {!cameraOff && (
        <div className="absolute bottom-28 right-4 z-30 w-28 sm:w-36 aspect-[3/4] rounded-2xl border-2 border-[#D4AF37]/50 shadow-[0_10px_30px_rgba(0,0,0,0.8)] overflow-hidden bg-black/80 backdrop-blur-md">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{ filter: KMC_LUXE_FILTERS[activeFilter].filter }}
            className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
          />
          {micMuted && (
            <div className="absolute bottom-1.5 left-1.5 w-6 h-6 rounded-full bg-rose-600/90 flex items-center justify-center shadow">
              <MicOff className="w-3.5 h-3.5 text-white" />
            </div>
          )}
        </div>
      )}

      {/* 4. BOTTOM FLOATING LUXURY CALL CONTROLS */}
      <div className="absolute bottom-6 left-4 right-4 z-30 flex items-center justify-between gap-2 max-w-lg mx-auto bg-black/85 backdrop-blur-2xl p-3 sm:p-3.5 rounded-2xl border border-[#D4AF37]/35 shadow-[0_10px_40px_rgba(0,0,0,0.9)]">
        {/* Toggle Microphone */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleMic();
          }}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all ${
            micMuted 
              ? 'bg-rose-600 text-white shadow-[0_0_20px_rgba(225,29,72,0.5)]' 
              : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
          }`}
          title={micMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {micMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Toggle Camera */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleCamera();
          }}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all ${
            cameraOff 
              ? 'bg-rose-600 text-white shadow-[0_0_20px_rgba(225,29,72,0.5)]' 
              : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
          }`}
          title={cameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
        >
          {cameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>

        {/* Flip Camera (Front/Back) */}
        {!cameraOff && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleFlipCamera();
            }}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/10 text-white hover:bg-white/20 border border-white/10 flex items-center justify-center active:scale-95 transition-all"
            title="Flip Camera"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        )}

        {/* Beauty Filters */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowFilters(!showFilters);
          }}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all ${
            showFilters 
              ? 'gold-gradient-bg text-black shadow-[0_0_20px_rgba(212,175,55,0.6)]' 
              : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
          }`}
          title="Beauty Filters"
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>

        {/* Floating Quick Reaction Emojis */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {['❤️', '🥂', '👑', '🔥'].map((emoji) => (
            <button
              key={emoji}
              onClick={(e) => {
                e.stopPropagation();
                handleSendReaction(emoji);
              }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/5 hover:bg-white/15 active:scale-125 transition-all flex items-center justify-center text-lg border border-white/5"
              title={`Send ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* End Call Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleEndCall();
          }}
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center shadow-[0_0_25px_rgba(225,29,72,0.6)] transition-all border border-rose-400/40"
          title="End Call"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>

      {/* Beauty Filters Drawer */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-24 left-4 right-4 z-40 max-w-md mx-auto bg-black/90 backdrop-blur-2xl p-3 rounded-2xl border border-[#D4AF37]/35 shadow-2xl flex items-center justify-around gap-1"
          >
            {(Object.keys(KMC_LUXE_FILTERS) as FilterKey[]).map((k) => (
              <button
                key={k}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveFilter(k);
                }}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                  activeFilter === k ? 'gold-gradient-bg text-black font-bold' : 'text-neutral-300 hover:text-white'
                }`}
              >
                <span className="text-xl">{KMC_LUXE_FILTERS[k].icon}</span>
                <span className="text-[10px] truncate">{KMC_LUXE_FILTERS[k].name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bespoke 3D Gift Animation Celebration Overlay */}
      <AnimatePresence>
        {activeGiftEffect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -50 }}
            className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, -5, 5, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-32 h-32 rounded-3xl gold-gradient-bg p-1 shadow-[0_0_80px_rgba(212,175,55,0.8)] flex items-center justify-center mb-4 text-6xl"
            >
              <span>{activeGiftEffect.gift.icon}</span>
            </motion.div>
            <h2 className="font-serif text-3xl font-bold text-[#E5C378] tracking-wide mb-1">
              {activeGiftEffect.gift.name}
            </h2>
            <p className="text-sm font-semibold text-white/90">{activeGiftEffect.reaction}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Luxury VIP Gifting Modal */}
      <CreditsAndGiftingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultTab={modalTab}
        recipientName={profile.name}
        threadId={partnerId}
        onGiftSent={(gift) => {
          setActiveGiftEffect({ gift, reaction: gift.reactionText || 'Sent with love' });
          handleSendReaction('👑');
          setTimeout(() => setActiveGiftEffect(null), 4000);
        }}
      />
    </div>
  );
}
