import { lazy, Suspense } from 'react';
import LazyMount from './LazyMount';

const RemotionClip = lazy(() => import('./RemotionClip'));

// Stable loaders for each composition
export const comps = {
  pathogenesis: { load: () => import('../remotion/PathogenesisFlow'), frames: 450, label: 'Pathogenesis animation', rate: 0.6 },
  granuloma: { load: () => import('../remotion/GranulomaBuild'), frames: 300, label: 'Granuloma animation' },
  zn: { load: () => import('../remotion/ZNStain'), frames: 240, label: 'Ziehl–Neelsen stain animation' },
  regimen: { load: () => import('../remotion/RegimenTimeline'), frames: 360, label: 'Treatment regimen animation' },
};

// Same 16:9 footprint as the player → no layout shift when it mounts
const Placeholder = () => <div className="aspect-video w-full rounded-2xl bg-night" />;

export default function LazyClip({ name }) {
  const c = comps[name];
  return (
    <LazyMount className="w-full" fallback={<Placeholder />}>
      {(visible) => (
        <Suspense fallback={<Placeholder />}>
          <RemotionClip lazyComponent={c.load} durationInFrames={c.frames} playbackRate={c.rate || 1} label={c.label} visible={visible} />
        </Suspense>
      )}
    </LazyMount>
  );
}
