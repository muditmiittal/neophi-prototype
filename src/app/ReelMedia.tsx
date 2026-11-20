import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Scene } from '../components/Scene';
import type { Memory } from '../store/types';

export function InstagramPreview({ url, tile = false }: { url: string; tile?: boolean }) {
  const [open, setOpen] = useState(false);
  const source = URL.canParse(url) ? new URL(url) : null;
  if (source?.protocol !== 'https:' || !['instagram.com', 'www.instagram.com'].includes(source.host)) return null;
  const post = /^\/(reel|p)\/([\w-]+)\/?$/.exec(source.pathname);
  if (!post) return null;
  return (
    <div className={`instagram-preview${tile ? ' instagram-preview-tile' : ''}${open ? ' is-open' : ''}`}>
      <button type="button" className="btn" aria-expanded={open} onClick={() => setOpen(!open)}>
        {!open && tile && <Icon name="play" />}{open ? 'Close Instagram preview' : tile ? 'Preview' : 'Preview on Instagram'}
      </button>
      {open && <iframe title="Instagram preview" src={`https://www.instagram.com/${post[1]}/${post[2]}/embed/`} referrerPolicy="no-referrer" loading="lazy" />}
    </div>
  );
}

export function hasReelCover(memory: Memory) {
  return !memory.private && (memory.source.platform === 'instagram' || memory.mediaKind === 'video');
}

export function ReelMedia({ memory }: { memory: Memory }) {
  const instagram = memory.source.platform === 'instagram';
  const visual = memory.thumb || (memory.sceneId && memory.sceneId !== 'none');
  return (
    <div className="reel-media">
      <Link className="reel-cover" to={`/app/m/${memory.id}`} aria-label={`Open ${memory.title}`}>
        {memory.thumb ? <img src={memory.thumb} alt="" loading="lazy" /> : memory.sceneId && memory.sceneId !== 'none' && <Scene id={memory.sceneId} />}
        <span className="reel-source">{instagram ? 'Instagram' : 'Video'}</span>
        <span className="reel-open" aria-hidden="true"><Icon name="arrow" /></span>
        <span className="reel-cover-status">{memory.sample ? 'Sample illustration' : visual ? 'Saved frame' : 'No preview frame'}</span>
      </Link>
      {instagram && memory.source.url && !memory.sample && <InstagramPreview key={memory.source.url} url={memory.source.url} tile />}
    </div>
  );
}
