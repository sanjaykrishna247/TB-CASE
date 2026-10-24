import { useEffect, useRef, useState } from 'react';
import { Player } from '@remotion/player';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { useApp } from '../AppContext';

/** Remotion <Player>: muted loop, plays only while on screen, controls on hover. */
export default function RemotionClip({ lazyComponent, durationInFrames, label, visible = true, playbackRate = 1 }) {
  const ref = useRef(null);
  const { reduced } = useApp();
  const [playing, setPlaying] = useState(false);
  const userPaused = useRef(false);

  useEffect(() => {
    const p = ref.current;
    if (!p) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    p.addEventListener('play', onPlay);
    p.addEventListener('pause', onPause);
    if (import.meta.env.DEV) (window.__players ||= {})[label] = p; // for automated frame checks
    return () => {
      p.removeEventListener('play', onPlay);
      p.removeEventListener('pause', onPause);
    };
  }, [label]);

  useEffect(() => {
    const p = ref.current;
    if (!p) return;
    if (visible && !userPaused.current && !reduced) p.play();
    else if (!visible) p.pause();
  }, [visible, reduced]);

  const toggle = () => {
    const p = ref.current;
    if (!p) return;
    userPaused.current = p.isPlaying();
    p.isPlaying() ? p.pause() : p.play();
  };

  return (
    <div className="group relative aspect-video w-full overflow-hidden rounded-2xl bg-night shadow-lift" aria-label={label}>
      <Player
        ref={ref}
        lazyComponent={lazyComponent}
        durationInFrames={durationInFrames}
        playbackRate={playbackRate}
        compositionWidth={1280}
        compositionHeight={720}
        fps={30}
        loop
        controls={false}
        clickToPlay={false}
        initiallyMuted
        numberOfSharedAudioTags={0}
        style={{ width: '100%', height: '100%' }}
        acknowledgeRemotionLicense
      />
      <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
        <button onClick={() => ref.current?.seekTo(0)} aria-label="Restart animation" className="grid h-9 w-9 place-items-center rounded-full bg-black/50 text-ivory backdrop-blur hover:bg-brick">
          <RotateCcw size={15} />
        </button>
        <button onClick={toggle} aria-label={playing ? 'Pause animation' : 'Play animation'} className="grid h-9 w-9 place-items-center rounded-full bg-black/50 text-ivory backdrop-blur hover:bg-brick">
          {playing ? <Pause size={15} /> : <Play size={15} />}
        </button>
      </div>
    </div>
  );
}
