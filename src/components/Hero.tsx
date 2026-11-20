import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import { Panel } from './Immersive';

export function Hero() {
  return <Panel video="loop_creator" className="hero pf-paper" id="reason-intro"><div className="wrap hero-in">
    <div className="hero-copy"><p className="label">Your saves, with your reasons</p>
      <h2 className="hero-h">A library built around you. <em>Memories you can trust.</em></h2>
      <p className="hero-lede">Keep each Reel or post with why you saved it. Neophi sorts your library from your own context and helps you find it half remembered.</p>
      <p>Your exact words stay untouched. AI suggestions are separate, labelled, and linked to evidence or marked “not sure”.</p>
      <div className="hero-cta"><a className="btn btn-primary" href="#reason-demo">See the difference <Icon name="arrow" /></a><Link className="btn" to="/connect">Save your first Reel</Link></div>
      <p className="hint">No sign-up. Local browser library. Mock AI by default; sample saves are invented.</p>
    </div>
    <figure className="hero-art"><img src="/brand/hero_scatter_to_settle.webp" width="1376" height="768" loading="lazy" alt="Illustration of scattered saves finding a place in cooking, travel and clothing boxes." /><figcaption className="hint">Less of a pile. More of your own context. Illustration, not a product screenshot.</figcaption></figure>
  </div></Panel>;
}
