import { Pause, Play, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatDuration } from '../lib/media';

interface AudioPlayerProps {
  id: string;
  title: string;
  src: string;
  durationSeconds: number;
  activeAudioId?: string;
  onActivate: (id: string) => void;
}

export function AudioPlayer({ id, title, src, durationSeconds, activeAudioId, onActivate }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || activeAudioId === id) return;
    audio.pause();
    setPlaying(false);
  }, [activeAudioId, id]);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      onActivate(id);
      await audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  function updateProgress(value: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrentTime(value);
  }

  function updateVolume(value: number) {
    const audio = audioRef.current;
    setVolume(value);
    if (audio) audio.volume = value;
  }

  const resolvedDuration = duration || durationSeconds || 0;

  return (
    <article className={`audio-player ${isPlaying ? 'audio-player-active' : ''}`}>
      <audio
        ref={audioRef}
        preload="metadata"
        src={src}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || durationSeconds)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onEnded={() => setPlaying(false)}
      />
      <button type="button" className="audio-play" onClick={togglePlayback} aria-label={isPlaying ? `Pausar ${title}` : `Reproducir ${title}`}>
        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
      </button>
      <div className="audio-meta">
        <strong>{title}</strong>
        <div className="audio-progress-row">
          <span>{formatDuration(currentTime)}</span>
          <input
            aria-label={`Progreso de ${title}`}
            type="range"
            min="0"
            max={Math.max(resolvedDuration, 1)}
            step="0.1"
            value={Math.min(currentTime, resolvedDuration || 0)}
            onChange={(event) => updateProgress(Number(event.target.value))}
          />
          <span>{formatDuration(resolvedDuration)}</span>
        </div>
      </div>
      <label className="audio-volume">
        <Volume2 size={18} />
        <span className="sr-only">Volumen de {title}</span>
        <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => updateVolume(Number(event.target.value))} />
      </label>
    </article>
  );
}
