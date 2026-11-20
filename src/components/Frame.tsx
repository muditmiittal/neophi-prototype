// The key frame of a memory: sample illustration or the user's own upload, the evidence highlight,
// and for video a timeline with moment pins.

import type { Evidence, SourceAccessState } from '../ai/types';
import { fmtTime } from '../lib/reason';
import type { MomentPin } from '../store/types';
import { Icon } from './Icon';
import { STATE_COPY } from './Lanes';
import { Scene, type SceneId } from './Scene';

export interface FrameProps {
  sceneId?: SceneId;
  thumb?: string;
  title: string;
  mediaKind: 'video' | 'image' | 'none';
  durationSec?: number;
  time: number;
  onTime?: (t: number) => void;
  active?: Evidence | null;
  pins?: MomentPin[];
  /** Set when there is no picture to show. */
  gone?: SourceAccessState | 'private_memory' | null;
  sample?: boolean;
}

export function Frame(p: FrameProps) {
  const hasPic = Boolean(p.thumb) || (p.sceneId && p.sceneId !== 'none');
  const dur = p.durationSec ?? 0;
  const box = p.active?.bbox;
  return (
    <figure className="frame">
      {hasPic ? (
        <div className="frame-pic">
          {p.thumb ? <img src={p.thumb} alt={p.title} /> : <Scene id={p.sceneId!} t={dur ? p.time / dur : 0} title={`Sample illustration: ${p.title}`} />}
          {box && (
            <div className="frame-box" style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }}>
              <span>{p.active!.ref}</span>
            </div>
          )}
          {p.sample && (
            <span className="stamp" style={{ position: 'absolute', right: 8, top: 8, background: 'rgb(255 250 240 / 0.9)', color: '#3d362c' }}>
              Sample
            </span>
          )}
        </div>
      ) : (
        <div className="frame-gone">
          <Icon name={p.gone === 'private_memory' ? 'lock' : 'offline'} />
          <span className="stamp stamp-warn">{p.gone === 'private_memory' ? 'Private: AI off' : STATE_COPY[p.gone ?? 'unsupported'].stamp}</span>
          <span>{p.gone === 'private_memory' ? 'Nothing was fetched or analysed.' : 'No picture is kept for this memory.'}</span>
        </div>
      )}
      {hasPic && p.mediaKind === 'video' && dur > 0 && (
        <div className="timeline">
          <span>{fmtTime(p.time)}</span>
          <div className="timeline-track">
            {p.pins?.map((pin) => (
              <span key={pin.id} className="timeline-pin" style={{ left: `${(pin.from / dur) * 100}%`, width: `${Math.max(1.5, ((pin.to - pin.from) / dur) * 100)}%` }} title={`Pinned: ${pin.label}`} />
            ))}
            <input
              type="range"
              min={0}
              max={dur}
              step={1}
              value={p.time}
              onChange={(e) => p.onTime?.(Number(e.target.value))}
              aria-label="Position in the clip, in seconds"
              aria-valuetext={`${fmtTime(p.time)} of ${fmtTime(dur)}`}
            />
            <span className="timeline-head" style={{ left: `${(p.time / dur) * 100}%` }} />
          </div>
          <span>{fmtTime(dur)}</span>
        </div>
      )}
    </figure>
  );
}
