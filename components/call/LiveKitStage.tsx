'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react';
import type { LocalTrack, RemoteTrack, Room as LiveKitRoom, TrackPublication } from 'livekit-client';

export interface LiveKitStageProps {
  token: string;
  serverUrl: string;
  partnerName?: string;
  partnerPhoto?: string;
  mode?: 'video' | 'voice';
  waitingLabel?: string;
  onLeave: () => void;
}

function attachTrack(track: LocalTrack | RemoteTrack, el: HTMLMediaElement | null) {
  if (!el) return;
  track.attach(el);
}

function detachPub(pub?: TrackPublication) {
  pub?.track?.detach();
}

export function LiveKitStage({
  token,
  serverUrl,
  partnerName,
  partnerPhoto,
  mode = 'video',
  waitingLabel,
  onLeave
}: LiveKitStageProps) {
  const roomRef = useRef<LiveKitRoom | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [status, setStatus] = useState('Connecting…');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(mode === 'video');
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let room: LiveKitRoom | null = null;

    const connect = async () => {
      try {
        sessionStorage.setItem('kmc_in_call', '1');
        const { Room, RoomEvent, Track } = await import('livekit-client');
        room = new Room({
          adaptiveStream: true,
          dynacast: true
        });
        roomRef.current = room;

        const bindRemote = (track: RemoteTrack) => {
          if (track.kind === Track.Kind.Video) {
            attachTrack(track, remoteVideoRef.current);
            setHasRemoteVideo(true);
            setStatus(partnerName || 'Connected');
          }
          if (track.kind === Track.Kind.Audio) {
            attachTrack(track, remoteAudioRef.current);
          }
        };

        room.on(RoomEvent.TrackSubscribed, (track) => bindRemote(track));
        room.on(RoomEvent.TrackUnsubscribed, (track) => {
          track.detach();
          if (track.kind === Track.Kind.Video) setHasRemoteVideo(false);
        });
        room.on(RoomEvent.LocalTrackPublished, (pub) => {
          if (pub.track?.kind === Track.Kind.Video) {
            attachTrack(pub.track, localVideoRef.current);
          }
        });
        room.on(RoomEvent.Disconnected, () => {
          if (!cancelled) onLeave();
        });
        room.on(RoomEvent.ParticipantConnected, () => {
          setStatus(partnerName || 'Connected');
        });

        const connectTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timed out reaching the video server')), 20000);
        });
        await Promise.race([room.connect(serverUrl, token), connectTimeout]);
        if (cancelled) {
          await room.disconnect();
          return;
        }

        await room.localParticipant.setMicrophoneEnabled(true);
        if (mode === 'video') {
          await room.localParticipant.setCameraEnabled(true);
        }
        setStatus(waitingLabel || `Waiting for ${partnerName || 'your date'}…`);

        room.remoteParticipants.forEach((participant) => {
          participant.trackPublications.forEach((pub) => {
            if (pub.track) bindRemote(pub.track as RemoteTrack);
          });
        });
        room.localParticipant.trackPublications.forEach((pub) => {
          if (pub.track?.kind === Track.Kind.Video) {
            attachTrack(pub.track, localVideoRef.current);
          }
        });
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Could not start the video date');
          setStatus('Connection failed');
        }
      }
    };

    connect();

    return () => {
      cancelled = true;
      sessionStorage.removeItem('kmc_in_call');
      const current = roomRef.current;
      roomRef.current = null;
      if (current) {
        current.localParticipant.trackPublications.forEach((pub) => detachPub(pub));
        current.disconnect();
      }
    };
  }, [token, serverUrl, mode, partnerName, waitingLabel, onLeave]);

  const toggleMic = async () => {
    const next = !micOn;
    await roomRef.current?.localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
  };

  const toggleCam = async () => {
    const next = !camOn;
    await roomRef.current?.localParticipant.setCameraEnabled(next);
    setCamOn(next);
  };

  const hangUp = async () => {
    sessionStorage.removeItem('kmc_in_call');
    await roomRef.current?.disconnect();
    onLeave();
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black text-white flex flex-col">
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className={`absolute inset-0 w-full h-full object-cover ${hasRemoteVideo ? 'opacity-100' : 'opacity-0'}`}
      />
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {!hasRemoteVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-[#070709] to-black">
          {partnerPhoto ? (
            <img src={partnerPhoto} alt="" className="w-28 h-28 rounded-full object-cover border-2 border-[#D4AF37]" />
          ) : (
            <div className="w-28 h-28 rounded-full bg-[#1E1B13] border-2 border-[#D4AF37] flex items-center justify-center font-serif text-4xl text-[#D4AF37]">
              {(partnerName || 'M').charAt(0)}
            </div>
          )}
          <p className="font-serif text-xl text-[#D4AF37]">{partnerName || 'Club Member'}</p>
          <p className="text-xs text-white/60">{error || status}</p>
        </div>
      )}

      <video
        ref={localVideoRef}
        autoPlay
        muted
        playsInline
        className="absolute right-4 top-16 w-28 h-40 sm:w-36 sm:h-52 object-cover rounded-2xl border border-[#D4AF37]/50 bg-black/40 shadow-xl"
      />

      <div className="absolute top-0 inset-x-0 p-4 flex justify-between items-start bg-gradient-to-b from-black/70 to-transparent">
        <span className="text-xs font-medium text-white/80">{status}</span>
      </div>

      <div className="absolute bottom-8 inset-x-0 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={toggleMic}
          className={`w-14 h-14 rounded-full border flex items-center justify-center ${micOn ? 'bg-white/10 border-white/20' : 'bg-red-500/80 border-red-400'}`}
          title={micOn ? 'Mute' : 'Unmute'}
        >
          {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>
        {mode === 'video' && (
          <button
            type="button"
            onClick={toggleCam}
            className={`w-14 h-14 rounded-full border flex items-center justify-center ${camOn ? 'bg-white/10 border-white/20' : 'bg-red-500/80 border-red-400'}`}
            title={camOn ? 'Camera off' : 'Camera on'}
          >
            {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>
        )}
        <button
          type="button"
          onClick={hangUp}
          className="w-16 h-16 rounded-full bg-red-600 border border-red-400 flex items-center justify-center shadow-lg"
          title="End date"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
