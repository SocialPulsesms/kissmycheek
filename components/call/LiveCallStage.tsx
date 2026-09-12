'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  Phone, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  Sparkles, 
  Crown, 
  Gift, 
  ShieldCheck, 
  Radio, 
  ArrowLeft,
  SlidersHorizontal,
  Wifi,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { MemberProfile } from '@/lib/mockData';
import { CreditsAndGiftingModal } from '@/components/ui/CreditsAndGiftingModal';
import { BespokeGift } from '@/lib/creditsStore';
import { getCanonicalRoomId } from '@/lib/callRoomId';
import { callRingtone } from '@/lib/callRingtone';
import { DEFAULT_RTC_CONFIGURATION, KMC_LUXE_FILTERS, FilterKey, applyKmcSenderParameters } from '@/lib/webrtcIceConfig';

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
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('luxe');

  // Interactive UI drawers & overlays
  const [showReactions, setShowReactions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [heartBursts, setHeartBursts] = useState<Array<{ id: string; x: number; y: number }>>([]);
  const lastTapRef = useRef<number>(0);

  // Synchronous session initialization
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

  // Real WebRTC 2-Way Live Stream state
  const [useLiveMedia, setUseLiveMedia] = useState(false);
  const [localMediaStream, setLocalMediaStream] = useState<MediaStream | null>(null);
  const [callConnected, setCallConnected] = useState(false);
  const [roomId, setRoomId] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>(getInitialUserId);
  const [currentUserName, setCurrentUserName] = useState<string>(getInitialUserName);
  const [currentUserPhoto, setCurrentUserPhoto] = useState<string>('');
  const [peerId, setPeerId] = useState<string>('');
  const [peerRole, setPeerRole] = useState<'caller' | 'callee' | null>(initialRole || null);
  const peerRoleRef = useRef<'caller' | 'callee' | null>(initialRole || null);
  const pendingCandidatesRef = useRef<any[]>([]);
  const lastEventTimestampRef = useRef<number>(0);
  const [partnerJoined, setPartnerJoined] = useState(false);
  const [partnerMicMuted, setPartnerMicMuted] = useState(false);
  const [partnerCameraOff, setPartnerCameraOff] = useState(false);
  const [isSwappedView, setIsSwappedView] = useState(false);
  const [audioBlockedNotice, setAudioBlockedNotice] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<Array<{ id: string; emoji: string; x: number }>>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>('Calling member...');
  const [copiedLink, setCopiedLink] = useState(false);
  const stopRingbackRef = useRef<(() => void) | null>(null);

  // Video elements and peer connections
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const roomIdRef = useRef<string>('');
  const peerIdRef = useRef<string>('');
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const candidateIndexRef = useRef<number>(0);
  const remoteDescriptionSetRef = useRef<boolean>(false);
  const iceCandidateBufferRef = useRef<any[]>([]);
  const iceCandidateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speakerMutedRef = useRef(false);
  speakerMutedRef.current = speakerMuted;
  const endedRef = useRef(false);
  const callConnectedRef = useRef(false);
  const secondsElapsedRef = useRef(0);
  const handleEndCallRef = useRef<(opts?: { remote?: boolean }) => void>(() => {});
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Gifting state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'gifting' | 'topup' | 'elite'>('gifting');
  const [activeGiftEffect, setActiveGiftEffect] = useState<{ gift: BespokeGift; reaction: string } | null>(null);

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

  // Attempt to resolve partner photo from directory/profile API if missing
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

  // Audio visualizer setup
  const setupAudioMeter = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateMeter = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animationFrameRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();
    } catch (e) {}
  };

  // Duration timer — only after the other member is actually connected
  useEffect(() => {
    callConnectedRef.current = callConnected;
    if (!callConnected) return;
    setSecondsElapsed(0);
    secondsElapsedRef.current = 0;
    const timer = setInterval(() => {
      setSecondsElapsed(prev => {
        const next = prev + 1;
        secondsElapsedRef.current = next;
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [callConnected]);

  const bindRemoteElements = () => {
    const stream = remoteStreamRef.current;
    if (!stream) return;

    const playEl = (el: HTMLMediaElement | null) => {
      if (!el) return;
      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      el.muted = speakerMutedRef.current;
      el.play().then(() => setAudioBlockedNotice(false)).catch(() => setAudioBlockedNotice(true));
    };

    playEl(remoteVideoRef.current);
    playEl(remoteAudioRef.current);
  };

  const ingestRemoteTrack = (event: RTCTrackEvent) => {
    event.track.enabled = true;

    const inbound = event.streams && event.streams[0] ? event.streams[0] : null;
    const existing = remoteStreamRef.current || new MediaStream();
    const merged = new MediaStream();

    const addTrack = (track: MediaStreamTrack) => {
      if (!merged.getTracks().some((t) => t.id === track.id)) {
        track.enabled = true;
        merged.addTrack(track);
      }
    };

    if (inbound) {
      inbound.getTracks().forEach(addTrack);
    }
    existing.getTracks().forEach(addTrack);
    addTrack(event.track);

    remoteStreamRef.current = merged;

    if (merged.getVideoTracks().some((t) => t.readyState !== 'ended')) {
      setHasRemoteVideo(true);
    }

    setCallConnected(true);
    setPartnerJoined(true);
    setConnectionStatus('Connected');
    if (stopRingbackRef.current) {
      stopRingbackRef.current();
      stopRingbackRef.current = null;
    }

    bindRemoteElements();
    event.track.onunmute = () => {
      if (event.track.kind === 'video') setHasRemoteVideo(true);
      bindRemoteElements();
    };
  };

  // WebRTC Media & Signaling Initialization
  const initializeMediaAndSignaling = async (targetFacingMode: 'user' | 'environment' = 'user') => {
    try {
      const canonicalRoom = initialRoomId || getCanonicalRoomId(currentUserId || 'caller', partnerId);
      setRoomId(canonicalRoom);
      roomIdRef.current = canonicalRoom;

      let currentPeerId = '';
      try {
        const peerKey = `kmc_call_peer_${canonicalRoom}`;
        currentPeerId = sessionStorage.getItem(peerKey) || '';
        if (!currentPeerId) {
          currentPeerId = `peer-${Math.random().toString(36).substring(2, 9)}`;
          sessionStorage.setItem(peerKey, currentPeerId);
        }
      } catch {
        currentPeerId = `peer-${Math.random().toString(36).substring(2, 9)}`;
      }
      setPeerId(currentPeerId);
      peerIdRef.current = currentPeerId;

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }

      remoteStreamRef.current = new MediaStream();

      let localStream: MediaStream | null = null;
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: {
            facingMode: targetFacingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
      } catch (e1) {
        try {
          localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: { facingMode: targetFacingMode }
          });
        } catch (e2) {
          try {
            localStream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: true
            });
          } catch (e3) {
            try {
              localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (e4) {
              console.warn('Local media stream capture unavailable:', e4);
            }
          }
        }
      }

      if (localStream) {
        if (callMode === 'voice' || cameraOff) {
          localStream.getVideoTracks().forEach(track => {
            track.enabled = false;
          });
        }
        localStreamRef.current = localStream;
        setLocalMediaStream(localStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
          localVideoRef.current.play().catch(() => {});
        }
        setupAudioMeter(localStream);
        setUseLiveMedia(true);
        setConnectionStatus('Connecting...');
      }

      let rtcConfig: RTCConfiguration = DEFAULT_RTC_CONFIGURATION;
      try {
        const iceRes = await fetch('/api/ice-servers');
        const iceData = await iceRes.json();
        if (Array.isArray(iceData?.iceServers) && iceData.iceServers.length > 0) {
          rtcConfig = { ...DEFAULT_RTC_CONFIGURATION, iceServers: iceData.iceServers };
        }
      } catch {}

      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;

      if (localStream) {
        localStream.getTracks().forEach((track) => {
          track.enabled = true;
          pc.addTrack(track, localStream!);
        });
      } else {
        try {
          pc.addTransceiver('audio', { direction: 'recvonly' });
          pc.addTransceiver('video', { direction: 'recvonly' });
        } catch {}
      }

      const flushIceCandidates = () => {
        if (iceCandidateTimerRef.current) {
          clearTimeout(iceCandidateTimerRef.current);
          iceCandidateTimerRef.current = null;
        }
        const batch = iceCandidateBufferRef.current.splice(0);
        if (batch.length === 0) return;
        const candidates = batch.map((c: RTCIceCandidate) => ({
          candidate: c.candidate,
          sdpMid: c.sdpMid,
          sdpMLineIndex: c.sdpMLineIndex,
          usernameFragment: c.usernameFragment
        }));
        fetch('/api/call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body: JSON.stringify({
            action: 'ice_candidate_batch',
            roomId: canonicalRoom,
            peerId: currentPeerId,
            role: peerRoleRef.current,
            candidates
          })
        }).catch(() => {});
      };

      pc.ontrack = ingestRemoteTrack;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          iceCandidateBufferRef.current.push(event.candidate);
          if (!iceCandidateTimerRef.current) {
            iceCandidateTimerRef.current = setTimeout(flushIceCandidates, 50);
          }
        } else {
          flushIceCandidates();
        }
      };

      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') {
          flushIceCandidates();
        }
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === 'connected') {
          applyKmcSenderParameters(pc, 'high');
          setPartnerJoined(true);
          if (remoteStreamRef.current?.getTracks().length) {
            setCallConnected(true);
            setConnectionStatus('Connected');
            bindRemoteElements();
          } else {
            setConnectionStatus('Connecting media...');
          }
          if (stopRingbackRef.current) {
            stopRingbackRef.current();
            stopRingbackRef.current = null;
          }
        } else if (state === 'failed') {
          setConnectionStatus('Reconnecting...');
        }
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        if (state === 'connected' || state === 'completed') {
          applyKmcSenderParameters(pc, 'high');
          setPartnerJoined(true);
          if (remoteStreamRef.current?.getTracks().length) {
            setCallConnected(true);
            setConnectionStatus('Connected');
            bindRemoteElements();
          } else {
            setConnectionStatus('Connecting media...');
          }
          if (stopRingbackRef.current) {
            stopRingbackRef.current();
            stopRingbackRef.current = null;
          }
        } else if (state === 'failed' && peerRoleRef.current === 'caller') {
          pc.createOffer({ iceRestart: true }).then(async (newOffer) => {
            await pc.setLocalDescription(newOffer);
            const local = pc.localDescription;
            await fetch('/api/call', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              keepalive: true,
              body: JSON.stringify({
                action: 'send_offer',
                roomId: canonicalRoom,
                peerId: currentPeerId,
                offer: local ? { type: local.type, sdp: local.sdp } : { type: newOffer.type, sdp: newOffer.sdp },
                sdp: local ? { type: local.type, sdp: local.sdp } : { type: newOffer.type, sdp: newOffer.sdp }
              })
            });
          }).catch(() => {});
        }
      };

      const intendedRole = initialRole || 'caller';

      // Caller: create the invite BEFORE joining. If messages already rang the
      // callee, the store keeps the in-flight room instead of wiping SDP/ICE.
      if (intendedRole === 'caller') {
        try {
          await fetch('/api/call', {
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
          });
        } catch {}
      }

      // Register presence & join room
      const joinRes = await fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join_room',
          roomId: canonicalRoom,
          peerId: currentPeerId,
          userId: currentUserId,
          userName: currentUserName,
          userPhoto: currentUserPhoto,
          role: intendedRole,
          preferredRole: intendedRole
        })
      });
      const joinData = await joinRes.json();
      
      const effectiveRole = initialRole || joinData.role || (joinData.room?.peers?.length === 1 ? 'caller' : 'callee');
      setPeerRole(effectiveRole);
      peerRoleRef.current = effectiveRole;

      if (effectiveRole === 'caller') {
        stopRingbackRef.current = callRingtone.startOutgoingRingback();
        setConnectionStatus('Calling member...');

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await pc.setLocalDescription(offer);
        const localOffer = pc.localDescription || offer;

        await fetch('/api/call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'offer',
            roomId: canonicalRoom,
            peerId: currentPeerId,
            offer: { type: localOffer.type, sdp: localOffer.sdp },
            sdp: { type: localOffer.type, sdp: localOffer.sdp }
          })
        });
      } else {
        setConnectionStatus('Connecting...');
      }

      // Fast Polling loop (150ms) for ultra-responsive WebRTC signaling
      pollTimerRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch('/api/call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'poll_signaling',
              roomId: canonicalRoom,
              peerId: currentPeerId,
              role: peerRoleRef.current,
              lastCandidateIndex: candidateIndexRef.current,
              lastEventTimestamp: lastEventTimestampRef.current
            })
          });

          if (!pollRes.ok) return;
          const pollData = await pollRes.json();

          const remoteEnded =
            pollData.inviteStatus === 'DECLINED' ||
            pollData.inviteStatus === 'CANCELLED' ||
            pollData.inviteStatus === 'ENDED' ||
            pollData.status === 'ENDED' ||
            pollData.roomStatus === 'cancelled';

          if (remoteEnded) {
            handleEndCallRef.current({ remote: true });
            return;
          }

          if (pollData.events && pollData.events.length > 0) {
            for (const evt of pollData.events) {
              lastEventTimestampRef.current = Math.max(lastEventTimestampRef.current, evt.timestamp || 0);
              if (evt.type === 'reaction' && evt.data?.emoji) {
                spawnReaction(evt.data.emoji);
              }
              if (evt.type === 'media_state') {
                if (typeof evt.data?.micMuted === 'boolean') setPartnerMicMuted(evt.data.micMuted);
                if (typeof evt.data?.cameraOff === 'boolean') setPartnerCameraOff(evt.data.cameraOff);
              }
            }
          }

          if (peerRoleRef.current === 'callee' && pollData.offer && !pc.currentRemoteDescription) {
            try {
              await pc.setRemoteDescription(pollData.offer);
              remoteDescriptionSetRef.current = true;

              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              const localAnswer = pc.localDescription || answer;

              await fetch('/api/call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'answer',
                  roomId: canonicalRoom,
                  peerId: currentPeerId,
                  answer: { type: localAnswer.type, sdp: localAnswer.sdp },
                  sdp: { type: localAnswer.type, sdp: localAnswer.sdp }
                })
              });

              while (pendingCandidatesRef.current.length > 0) {
                const cand = pendingCandidatesRef.current.shift();
                if (cand && (cand.candidate || cand.sdpMid !== undefined)) {
                  try {
                    await pc.addIceCandidate(cand);
                  } catch (ce) {}
                }
              }

              setPartnerJoined(true);
              setConnectionStatus(remoteStreamRef.current?.getTracks().length ? 'Connected' : 'Connecting media...');
              bindRemoteElements();
            } catch (e) {}
          }

          if (peerRoleRef.current === 'caller' && pollData.answer && !pc.currentRemoteDescription) {
            try {
              await pc.setRemoteDescription(pollData.answer);
              remoteDescriptionSetRef.current = true;

              while (pendingCandidatesRef.current.length > 0) {
                const cand = pendingCandidatesRef.current.shift();
                if (cand && (cand.candidate || cand.sdpMid !== undefined)) {
                  try {
                    await pc.addIceCandidate(cand);
                  } catch (ce) {}
                }
              }

              setPartnerJoined(true);
              setConnectionStatus(remoteStreamRef.current?.getTracks().length ? 'Connected' : 'Connecting media...');
              if (stopRingbackRef.current) {
                stopRingbackRef.current();
                stopRingbackRef.current = null;
              }
              bindRemoteElements();
            } catch (e) {}
          }

          if (pollData.candidates && pollData.candidates.length > 0) {
            for (const cand of pollData.candidates) {
              if (cand && (cand.candidate || cand.sdpMid !== undefined)) {
                if (remoteDescriptionSetRef.current && pc.remoteDescription) {
                  try {
                    await pc.addIceCandidate(new RTCIceCandidate(cand));
                  } catch (ce) {}
                } else {
                  pendingCandidatesRef.current.push(cand);
                }
              }
            }
            candidateIndexRef.current = pollData.nextCandidateIndex;
          }
        } catch (e) {}
      }, 150);

    } catch (err) {
      setConnectionStatus('Encrypted channel active.');
    }
  };

  const spawnReaction = (emoji: string) => {
    const id = `rx_${Date.now()}_${Math.random()}`;
    const x = 15 + Math.random() * 70;
    setFloatingReactions(prev => [...prev, { id, emoji, x }]);
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== id));
    }, 2800);
  };

  const sendCallEvent = async (type: 'reaction' | 'media_state', data: any) => {
    if (!roomId || !peerId) return;
    try {
      await fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_event',
          roomId,
          peerId,
          type,
          data
        })
      });
    } catch {}
  };

  const handleSendReaction = (emoji: string) => {
    spawnReaction(emoji);
    sendCallEvent('reaction', { emoji });
  };

  const handleStageInteraction = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    setShowReactions(false);
    setShowFilters(false);
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

  const unlockAudio = () => {
    speakerMutedRef.current = false;
    setSpeakerMuted(false);
    bindRemoteElements();
  };

  useEffect(() => {
    const handleGesture = () => unlockAudio();
    window.addEventListener('click', handleGesture, { passive: true });
    window.addEventListener('touchstart', handleGesture, { passive: true });
    return () => {
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('touchstart', handleGesture);
    };
  }, []);

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      localVideoRef.current.play().catch(() => {});
    }
  }, [useLiveMedia, cameraOff, isSwappedView, callMode, localMediaStream]);

  useEffect(() => {
    bindRemoteElements();
  }, [isSwappedView, callConnected, hasRemoteVideo, callMode, speakerMuted]);

  useEffect(() => {
    endedRef.current = false;
    initializeMediaAndSignaling('user');

    return () => {
      if (stopRingbackRef.current) {
        stopRingbackRef.current();
        stopRingbackRef.current = null;
      }
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (iceCandidateTimerRef.current) clearTimeout(iceCandidateTimerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch {}
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (peerConnectionRef.current) {
        try { peerConnectionRef.current.close(); } catch {}
      }
      // Detach from the room on remount, but do not mark the call ENDED.
      if (!endedRef.current && roomIdRef.current && peerIdRef.current) {
        fetch('/api/call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body: JSON.stringify({
            action: 'leave_room',
            roomId: roomIdRef.current,
            peerId: peerIdRef.current
          })
        }).catch(() => {});
      }
    };
  }, [partnerId, initialRoomId]);

  const toggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = micMuted;
      });
      const nextState = !micMuted;
      setMicMuted(nextState);
      sendCallEvent('media_state', { micMuted: nextState });
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = cameraOff;
      });
      const nextState = !cameraOff;
      setCameraOff(nextState);
      sendCallEvent('media_state', { cameraOff: nextState });
    }
  };

  const switchCallMode = async (newMode: 'voice' | 'video') => {
    if (newMode === callMode) return;
    setCallMode(newMode);

    const stream = localStreamRef.current;
    const pc = peerConnectionRef.current;
    const turnVideoOff = newMode === 'voice';

    if (turnVideoOff) {
      stream?.getVideoTracks().forEach(track => {
        track.enabled = false;
      });
      setCameraOff(true);
      sendCallEvent('media_state', { cameraOff: true });
      return;
    }

    const existingVideo = stream?.getVideoTracks()[0];
    if (existingVideo) {
      existingVideo.enabled = true;
      setCameraOff(false);
      sendCallEvent('media_state', { cameraOff: false });
      return;
    }

    try {
      const fresh = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      const newTrack = fresh.getVideoTracks()[0];
      if (!newTrack || !pc) return;

      const sender = pc.getSenders().find(s => s.track?.kind === 'video') || pc.getSenders().find(s => !s.track);
      if (sender) {
        await sender.replaceTrack(newTrack);
      } else {
        pc.addTrack(newTrack, stream || fresh);
      }

      if (stream) {
        stream.addTrack(newTrack);
        setLocalMediaStream(stream);
      } else {
        localStreamRef.current = fresh;
        setLocalMediaStream(fresh);
      }

      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current.play().catch(() => {});
      }

      setCameraOff(false);
      sendCallEvent('media_state', { cameraOff: false });
    } catch {
      setCallMode('voice');
    }
  };

  const handleFlipCamera = async () => {
    if (!localStreamRef.current || !peerConnectionRef.current) return;
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    try {
      const fresh = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: nextFacing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      const newTrack = fresh.getVideoTracks()[0];
      if (!newTrack) return;

      const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(newTrack);
      }

      localStreamRef.current.getVideoTracks().forEach(track => {
        localStreamRef.current?.removeTrack(track);
        track.stop();
      });
      localStreamRef.current.addTrack(newTrack);
      setLocalMediaStream(localStreamRef.current);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current.play().catch(() => {});
      }
      setFacingMode(nextFacing);
    } catch {}
  };

  const toggleSpeaker = () => {
    const nextMuted = !speakerMuted;
    setSpeakerMuted(nextMuted);
    if (remoteAudioRef.current) remoteAudioRef.current.muted = nextMuted;
    if (remoteVideoRef.current) remoteVideoRef.current.muted = nextMuted;
  };

  const handleGiftSent = (gift: BespokeGift, partnerReply?: string) => {
    setActiveGiftEffect({ gift, reaction: partnerReply || gift.reactionText });
    setTimeout(() => {
      setActiveGiftEffect(null);
    }, 5000);
  };

  const handleEndCall = (opts?: { remote?: boolean }) => {
    if (endedRef.current) return;
    endedRef.current = true;

    if (stopRingbackRef.current) {
      stopRingbackRef.current();
      stopRingbackRef.current = null;
    }
    callRingtone.playCallEndTone();

    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (iceCandidateTimerRef.current) clearTimeout(iceCandidateTimerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      try { peerConnectionRef.current.close(); } catch {}
    }

    const activeRoomId = roomIdRef.current || roomId;
    const activePeerId = peerIdRef.current || peerId;
    if (activeRoomId && !opts?.remote) {
      fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          action: callConnectedRef.current ? 'end_call' : 'cancel_call',
          roomId: activeRoomId,
          peerId: activePeerId
        })
      }).catch(() => {});
    }

    const elapsed = secondsElapsedRef.current;
    const durationText = formatTimer(elapsed > 0 ? elapsed : 0);

    try {
      fetch('/api/call-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          partnerId,
          partnerName,
          partnerPhoto,
          partnerOccupation,
          callType: callMode,
          durationSeconds: elapsed,
          durationFormatted: durationText,
          status: callConnectedRef.current ? 'completed' : (opts?.remote ? 'declined' : 'missed')
        })
      }).catch(() => {});
    } catch {}

    try {
      sessionStorage.removeItem(`kmc_call_peer_${activeRoomId}`);
    } catch {}
    
    // Log in local chat cache
    try {
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const callLogContent = `${callMode === 'voice' ? '📞 Voice Call' : '📹 Video Date'} ended • ${durationText}`;
      const callLogMsg = {
        id: `call_msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        senderId: currentUserId,
        content: callLogContent,
        timestamp: nowStr,
        mediaType: 'call_log',
        callType: callMode,
        callDuration: durationText,
        callStatus: 'completed',
        read: true
      };

      const savedThreads = localStorage.getItem('kmc_persistent_chat_v2');
      const threads = savedThreads ? JSON.parse(savedThreads) : [];
      const targetThread = threads.find((t: any) => 
        t.participant?.id === partnerId || 
        t.id === `th-${partnerId}` || 
        t.id?.includes(partnerId)
      );

      if (targetThread) {
        if (!targetThread.messages) targetThread.messages = [];
        targetThread.messages.push(callLogMsg);
        targetThread.lastMessage = callLogContent;
        targetThread.lastMessageTime = nowStr;
        localStorage.setItem('kmc_persistent_chat_v2', JSON.stringify(threads));
      }
    } catch {}

    if (onEndCall) {
      onEndCall(durationText);
    }
  };
  handleEndCallRef.current = handleEndCall;

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const initials = profile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'KM';

  return (
    <div 
      onClick={handleStageInteraction}
      className="fixed inset-0 z-[999999] h-[100dvh] w-full bg-[#050507] text-[#F4F4F6] relative overflow-hidden flex flex-col justify-between pt-12 pb-14 sm:pt-6 sm:pb-6 px-3.5 sm:px-6 select-none font-sans"
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 2.75rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 3.25rem)'
      }}
    >
      {/* Remote audio — keep in-document so mobile WebViews do not discard playback */}
      <audio
        ref={(el) => {
          remoteAudioRef.current = el;
          if (el) {
            el.setAttribute('playsinline', 'true');
            el.setAttribute('webkit-playsinline', 'true');
            bindRemoteElements();
          }
        }}
        autoPlay
        playsInline
        muted={speakerMuted}
        className="absolute w-px h-px overflow-hidden opacity-0 pointer-events-none"
      />

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

      {/* BACKGROUND / MAIN STAGE AREA */}
      <div className="absolute inset-0 z-0 bg-[#050507] flex items-center justify-center overflow-hidden">
        
        {/* A. VIDEO CALL MODE */}
        {callMode === 'video' ? (
          <>
            {/* Remote Live Video (Full background) */}
            <div
              onClick={(e) => {
                if (isSwappedView) {
                  e.stopPropagation();
                  setIsSwappedView(false);
                }
              }}
              className={`transition-all duration-500 overflow-hidden ${
                !isSwappedView
                  ? 'absolute inset-0 w-full h-full z-0'
                  : 'absolute right-3.5 sm:right-6 top-28 sm:top-28 z-30 w-28 sm:w-36 h-40 sm:h-48 rounded-2xl border-2 border-[#D4AF37] shadow-2xl bg-neutral-900 cursor-pointer'
              }`}
            >
              <video
                ref={(el) => {
                  remoteVideoRef.current = el;
                  if (el) {
                    el.setAttribute('playsinline', 'true');
                    el.setAttribute('webkit-playsinline', 'true');
                    bindRemoteElements();
                  }
                }}
                autoPlay
                playsInline
                muted={speakerMuted}
                style={{ filter: KMC_LUXE_FILTERS[activeFilter].filter }}
                className={`w-full h-full object-cover transition-all duration-500 ${
                  hasRemoteVideo && !partnerCameraOff ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              />

              {/* WhatsApp-Style Calling & Ringing Avatar Screen */}
              {(!hasRemoteVideo || partnerCameraOff) && (
                <div className="relative w-full h-full flex flex-col items-center justify-center z-10 bg-[#07070A] overflow-hidden">
                  {/* Blurred Ambient Wallpaper */}
                  {profile.photos?.[0] ? (
                    <img
                      src={profile.photos[0]}
                      alt={profile.name}
                      className="w-full h-full object-cover brightness-[0.25] blur-2xl scale-110 absolute inset-0"
                    />
                  ) : (
                    <div className="w-full h-full bg-radial from-[#1A140A] via-[#08080C] to-black absolute inset-0" />
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/70 pointer-events-none" />

                  {/* Central WhatsApp-Style Luxury Avatar */}
                  <div className="relative flex flex-col items-center justify-center p-6 text-center z-10 max-w-sm mx-auto">
                    {/* Radar Ripple Waves */}
                    <div className="relative mb-5 flex items-center justify-center">
                      <div 
                        className="absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full border border-[#D4AF37]/25 animate-ping opacity-30 pointer-events-none" 
                        style={{ animationDuration: '2.5s' }}
                      />
                      <div 
                        className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full border border-[#D4AF37]/40 animate-pulse pointer-events-none" 
                        style={{ animationDuration: '2s' }}
                      />
                      
                      {/* Avatar Circle */}
                      <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-2 border-[#D4AF37] p-1 overflow-hidden shadow-[0_0_50px_rgba(212,175,55,0.4)] relative z-10 bg-[#0C0C12] flex items-center justify-center">
                        {profile.photos?.[0] ? (
                          <img src={profile.photos[0]} alt={profile.name} className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <span className="font-serif font-bold text-3xl sm:text-4xl text-[#E5C378]">{initials}</span>
                        )}
                      </div>
                      
                      <span className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-[#D4AF37] text-black border-2 border-black flex items-center justify-center shadow-lg z-20">
                        <Video className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white mb-1 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                      {profile.name}
                    </h3>
                    <p className="text-xs text-[#E5C378] tracking-widest uppercase font-semibold mb-3">
                      {partnerCameraOff && callConnected ? 'Camera Off • HD Voice' : (peerRole === 'caller' && !callConnected ? 'Ringing...' : 'Encrypted Video Date')}
                    </p>

                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/80 border border-[#D4AF37]/35 backdrop-blur-xl text-xs text-neutral-200 shadow-xl">
                      <span className={`w-2 h-2 rounded-full ${callConnected ? 'bg-emerald-400 animate-pulse' : 'bg-[#D4AF37] animate-ping'}`} />
                      <span>{callConnected ? (partnerCameraOff ? 'Connected (Audio Only)' : 'Connected') : (peerRole === 'caller' ? 'Calling member...' : 'Connecting...')}</span>
                    </div>
                  </div>
                </div>
              )}

              {isSwappedView && (
                <span className="absolute bottom-2 left-2 text-[9px] font-bold bg-black/85 px-2 py-0.5 rounded-full text-[#D4AF37] backdrop-blur-md border border-white/10">
                  {profile.name.split(' ')[0]}
                </span>
              )}
            </div>

            {/* Local Video PiP Self-Preview (Top Right) */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                setIsSwappedView(!isSwappedView);
              }}
              className={`transition-all duration-500 overflow-hidden ${
                isSwappedView
                  ? 'absolute inset-0 w-full h-full z-0'
                  : 'absolute right-3.5 sm:right-6 top-28 sm:top-28 z-30 w-28 sm:w-36 h-40 sm:h-48 rounded-2xl border-2 border-[#D4AF37] shadow-[0_10px_35px_rgba(0,0,0,0.9)] bg-[#0E0E14] cursor-pointer'
              }`}
            >
              {/* Live Camera Video Feed with direct ref binding */}
              <video
                ref={(el) => {
                  localVideoRef.current = el;
                  if (el && localStreamRef.current && el.srcObject !== localStreamRef.current) {
                    el.srcObject = localStreamRef.current;
                    el.play().catch(() => {});
                  }
                }}
                autoPlay
                playsInline
                muted
                style={{ filter: KMC_LUXE_FILTERS[activeFilter].filter }}
                className={`w-full h-full object-cover transform -scale-x-100 transition-all duration-300 ${
                  localMediaStream && !cameraOff ? 'block' : 'hidden'
                }`}
              />

              {/* Camera Off or Loading Placeholder */}
              <div className={`w-full h-full bg-[#111116] flex flex-col items-center justify-center p-2 text-center ${
                localMediaStream && !cameraOff ? 'hidden' : 'flex'
              }`}>
                <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/50 flex items-center justify-center mb-1">
                  <Crown className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <span className="text-[10px] text-white/80 font-medium">{cameraOff ? 'Camera Off' : 'Starting camera...'}</span>
              </div>

              {!isSwappedView && (
                <span className="absolute bottom-1.5 left-1.5 text-[8px] font-bold bg-black/85 px-2 py-0.5 rounded-full text-white backdrop-blur-md border border-white/10 flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${localMediaStream && !cameraOff ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span>You (Tap to swap)</span>
                </span>
              )}
            </div>
          </>
        ) : (
          /* B. VOICE CALL MODE */
          <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="absolute w-96 h-96 rounded-full bg-[#D4AF37]/10 blur-[120px] pointer-events-none" />

            <div className="relative mb-6 flex items-center justify-center">
              <div 
                className="absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full border border-[#D4AF37]/20 transition-all duration-300"
                style={{ transform: `scale(${1 + (audioLevel / 100) * 0.6})`, opacity: 0.3 + (audioLevel / 100) * 0.7 }}
              />
              <div 
                className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full border border-[#D4AF37]/40 transition-all duration-200"
                style={{ transform: `scale(${1 + (audioLevel / 100) * 0.35})` }}
              />

              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-2 border-[#D4AF37] p-1.5 overflow-hidden shadow-[0_0_50px_rgba(212,175,55,0.4)] relative z-10 bg-black flex items-center justify-center">
                {profile.photos?.[0] ? (
                  <img src={profile.photos[0]} alt={profile.name} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span className="font-serif font-bold text-3xl sm:text-4xl text-[#D4AF37]">{initials}</span>
                )}
              </div>

              <span className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-[#D4AF37] text-black border-2 border-black flex items-center justify-center shadow-lg z-20">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
              </span>
            </div>

            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white mb-1">
              {profile.name}
            </h2>
            <p className="text-xs text-white/70 font-medium mb-3">
              {profile.occupation} • {profile.location}
            </p>

            {/* Audio Visualizer Waves */}
            <div className="flex items-center gap-1.5 h-6 mb-4">
              {[40, 75, 95, 60, 85, 100, 70, 50, 90, 65, 80, 45].map((height, idx) => (
                <div
                  key={idx}
                  className="w-1 bg-gradient-to-t from-[#D4AF37] to-amber-200 rounded-full transition-all duration-150"
                  style={{
                    height: `${Math.max(4, (audioLevel > 5 ? (height * audioLevel) / 100 : 4))}%`,
                    opacity: audioLevel > 5 ? 1 : 0.3
                  }}
                />
              ))}
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-[#D4AF37]/30 backdrop-blur-md text-xs text-[#D4AF37] font-semibold mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{callConnected ? `Encrypted HD Voice (${formatTimer(secondsElapsed)})` : connectionStatus}</span>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); switchCallMode('video'); }}
              className="px-4 py-2 rounded-full gold-gradient-bg text-black font-bold text-xs flex items-center gap-1.5 hover:scale-105 transition-transform shadow-lg"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Switch to Video Date</span>
            </button>
          </div>
        )}

        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black via-transparent to-black/60" />
      </div>

      {/* TOP HEADER CONTROLS */}
      <header className="relative z-30 flex items-center justify-between gap-3 bg-black/80 backdrop-blur-2xl p-3 px-4 sm:px-5 rounded-2xl border border-[#D4AF37]/30 shadow-2xl">
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); handleEndCall(); }}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="End Call and Return to Chat"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <h1 className="font-serif font-bold text-white text-base sm:text-lg flex items-center gap-2">
              <span className="truncate max-w-[130px] sm:max-w-none">{profile.name}</span>
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-neutral-300 font-medium mt-0.5">
              <span className={`w-2 h-2 rounded-full ${callConnected ? 'bg-emerald-400 animate-pulse' : 'bg-[#D4AF37] animate-ping'}`} />
              <span className="text-emerald-400 font-semibold">{formatTimer(secondsElapsed)}</span>
              <span className="text-white/30">•</span>
              <span className="text-white/70 flex items-center gap-1 text-[11px]">
                <ShieldCheck className="w-3 h-3 text-[#D4AF37]" /> Encrypted
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switch Pill */}
          <div className="flex items-center bg-black/80 p-1 rounded-full border border-white/10 text-xs">
            <button
              onClick={(e) => { e.stopPropagation(); switchCallMode('voice'); }}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${
                callMode === 'voice' ? 'bg-[#D4AF37] text-black font-bold shadow-md' : 'text-white/60 hover:text-white'
              }`}
            >
              <Phone className="w-3 h-3" />
              <span className="hidden sm:inline">Voice</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); switchCallMode('video'); }}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${
                callMode === 'video' ? 'bg-[#D4AF37] text-black font-bold shadow-md' : 'text-white/60 hover:text-white'
              }`}
            >
              <Video className="w-3 h-3" />
              <span className="hidden sm:inline">Video</span>
            </button>
          </div>

          {/* Flip Camera Button */}
          {callMode === 'video' && (
            <button
              onClick={(e) => { e.stopPropagation(); handleFlipCamera(); }}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white hover:text-[#D4AF37] transition-all shadow-md active:rotate-180 duration-300"
              title="Flip Camera"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Speaker Mute Button */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleSpeaker(); }}
            className={`p-2 rounded-full border transition-all shadow-md ${
              speakerMuted ? 'bg-amber-600 border-amber-400 text-white' : 'bg-white/10 hover:bg-white/20 border-white/10 text-white hover:text-[#D4AF37]'
            }`}
            title={speakerMuted ? "Unmute Speaker" : "Mute Speaker"}
          >
            {speakerMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* AUDIO BLOCKED AUTOPLAY UNLOCK BANNER */}
      {audioBlockedNotice && (
        <div className="relative z-30 max-w-md mx-auto w-full my-2">
          <button
            onClick={(e) => { e.stopPropagation(); unlockAudio(); }}
            className="w-full p-2.5 rounded-2xl gold-gradient-bg text-black font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(212,175,55,0.6)] animate-bounce"
          >
            <Volume2 className="w-4 h-4 text-black" />
            <span>🔊 Tap here to unmute audio</span>
          </button>
        </div>
      )}

      {/* FLOATING GIFT CELEBRATION */}
      <AnimatePresence>
        {activeGiftEffect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="relative z-40 max-w-md mx-auto w-full my-auto"
          >
            <div className="p-6 rounded-3xl bg-black/90 border-2 border-[#D4AF37] backdrop-blur-2xl text-center shadow-[0_0_50px_rgba(212,175,55,0.5)]">
              <div className="text-5xl mb-2 animate-bounce">{activeGiftEffect.gift.icon}</div>
              <h3 className="font-serif text-xl font-bold text-white">
                You sent {activeGiftEffect.gift.name}!
              </h3>
              <p className="text-xs text-[#D4AF37] mt-1 font-semibold">{activeGiftEffect.gift.tagline}</p>
              
              <div className="mt-4 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-[#F5E6CA] italic">
                "{activeGiftEffect.reaction}"
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM FLOATING CONTROLS & INTERACTION ZONE */}
      <div className="relative z-30 flex flex-col items-center gap-2.5 pb-2">
        
        {/* Floating Quick Reactions Drawer */}
        <AnimatePresence>
          {showReactions && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              className="p-1.5 px-3 rounded-full bg-black/90 border border-[#D4AF37]/60 backdrop-blur-2xl shadow-2xl flex items-center gap-2"
            >
              {['❤️', '🔥', '✨', '😘', '🥂', '🌹', '👑'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSendReaction(emoji);
                  }}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 hover:bg-white/20 hover:scale-125 active:scale-95 transition-all text-lg sm:text-xl flex items-center justify-center"
                  title={`Send ${emoji} reaction`}
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Beauty Filters Drawer (Video Mode) */}
        <AnimatePresence>
          {showFilters && callMode === 'video' && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              className="p-1.5 px-3 rounded-full bg-black/90 border border-[#D4AF37]/60 backdrop-blur-2xl shadow-2xl flex items-center gap-1.5 overflow-x-auto max-w-[90vw]"
            >
              {(Object.keys(KMC_LUXE_FILTERS) as FilterKey[]).map((key) => {
                const f = KMC_LUXE_FILTERS[key];
                const isSelected = activeFilter === key;
                return (
                  <button
                    key={key}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveFilter(key);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all whitespace-nowrap ${
                      isSelected
                        ? 'bg-[#D4AF37] text-black font-bold shadow-md scale-105'
                        : 'bg-white/5 hover:bg-white/15 text-white/80 hover:text-white'
                    }`}
                  >
                    <span>{f.icon}</span>
                    <span>{f.name}</span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Clean Luxury Floating Dock */}
        <div className="flex items-center gap-3 sm:gap-4 bg-black/90 backdrop-blur-2xl p-2.5 px-5 sm:px-6 rounded-full border border-[#D4AF37]/45 shadow-[0_10px_35px_rgba(0,0,0,0.8)] mx-auto">
          
          {/* Mute Mic */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleMic(); }}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all shadow-md ${
              micMuted ? 'bg-rose-600 text-white' : 'glass-panel text-white hover:text-[#D4AF37]'
            }`}
            title={micMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            {micMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Toggle Camera (Video Mode) */}
          {callMode === 'video' && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleCamera(); }}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all shadow-md ${
                cameraOff ? 'bg-rose-600 text-white' : 'glass-panel text-white hover:text-[#D4AF37]'
              }`}
              title={cameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              {cameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          )}

          {/* Interactive Reactions Toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowReactions(!showReactions);
              setShowFilters(false);
            }}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all shadow-md ${
              showReactions ? 'gold-gradient-bg text-black shadow-[0_0_20px_rgba(212,175,55,0.6)]' : 'glass-panel text-white hover:text-[#D4AF37]'
            }`}
            title="Interactive Reactions"
          >
            <Sparkles className="w-5 h-5" />
          </button>

          {/* Beauty Filters Toggle (Video Mode) */}
          {callMode === 'video' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowFilters(!showFilters);
                setShowReactions(false);
              }}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all shadow-md ${
                showFilters ? 'gold-gradient-bg text-black shadow-[0_0_20px_rgba(212,175,55,0.6)]' : 'glass-panel text-white hover:text-[#D4AF37]'
              }`}
              title="Beauty Filters"
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          )}

          {/* Gift Modal Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setModalTab('gifting');
              setModalOpen(true);
            }}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full gold-gradient-bg text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-[0_0_20px_rgba(212,175,55,0.4)]"
            title="Send Virtual Gift"
          >
            <Gift className="w-5 h-5 text-black" />
          </button>

          {/* End Call Button */}
          <button
            onClick={(e) => { e.stopPropagation(); handleEndCall(); }}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all"
            title="End Call"
          >
            <PhoneOff className="w-5 h-5" />
          </button>

        </div>
      </div>

      {/* Credit Wallet & Bespoke Gifting Modal */}
      <CreditsAndGiftingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultTab={modalTab}
        recipientName={profile.name}
        onGiftSent={handleGiftSent}
        threadId={partnerId}
      />
    </div>
  );
}
