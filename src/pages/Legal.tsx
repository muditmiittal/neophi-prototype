import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** The privacy contact. Set this before the pages are shown to Meta; they say so while it is empty. */
export const PRIVACY_CONTACT = '';

function Contact() {
  return PRIVACY_CONTACT ? (
    <p>
      Privacy and deletion requests: <a href={`mailto:${PRIVACY_CONTACT}`}>{PRIVACY_CONTACT}</a>. Response timing: verify with the build team.
    </p>
  ) : (
    <p>
      <b>Contact address: not set yet.</b> It is added here before the Instagram connection is opened to anyone outside the build team.
    </p>
  );
}

function LegalPage({ title, lede, children }: { title: string; lede: string; children: ReactNode }) {
  return (
    <div className="page wrap">
      <header className="page-head">
        <h1>{title}</h1>
        <p>{lede}</p>
        <p className="hint">Last updated 20 Nov 2026</p>
      </header>
      <div className="prose">
        <p className="banner">
          <span>
            <b>Draft of 20 Nov 2026.</b> This text describes what Neophi does today, including the Instagram message capture used during the Startup Buildathon India 2026. It is DRAFT legal wording: verify before public launch.
          </span>
        </p>
        {children}
      </div>
    </div>
  );
}

export function Privacy() {
  return (
    <LegalPage title="Privacy" lede="What Neophi stores, where, for how long, and who else sees it. Written to be read.">
      <h2>Who runs Neophi</h2>
      <p>Neophi is a prototype built by a two-person team in Jaipur, India, for the Startup Buildathon India 2026. It is not a company product yet.</p>
      <Contact />
      <h2>What Neophi stores</h2>
      <ul>
        <li>The links you paste and the notes you type, exactly as typed.</li>
        <li>The chip you tap, the category and project a memory is in, and any moment you pin.</li>
        <li>For an upload: a small key frame made on your device. The original image or video is not stored.</li>
        <li>The analysis of each memory, and a ledger of what was added and when.</li>
        <li>If you use the waitlist box: your email address.</li>
      </ul>
      <h2>Where your library lives</h2>
      <p>
        In your own browser, in its local storage. There is no Neophi account and no database of users. Clearing the site data in your browser removes all of it.
      </p>
      <h2>If you send a Reel or post to the Neophi Instagram account</h2>
      <p>This works only for people the build team has added as testers while the app is being built. When you send a Reel or post by direct message, Meta delivers to the Neophi server:</p>
      <ul>
        <li>your Instagram-scoped ID (a number that is not your username), the message ID and the time;</li>
        <li>the caption or title, the type (Reel or post) and a link to the media;</li>
        <li>text sent with the share, or a following note within the 10-minute attachment window, kept exactly as sent.</li>
      </ul>
      <p>What the server does with it:</p>
      <ol>
        <li>It checks that the message really came from Meta (a signature check) and ignores anything else.</li>
        <li>It attempts to download media into process memory, not a media file on disk. Media cleanup uses a 1-hour age threshold when another fetch runs; there is no scheduled expiry. Media can remain until cleanup or a server restart.</li>
        <li>When the local app collects the save and the Gemini provider is enabled, it can send available media, the caption and your note to Gemini. The server supports Vertex AI or an AI Studio key; the configured provider’s terms apply. Private memories are not sent for analysis.</li>
        <li>It persists queued captions and notes in the server data directory (inbox.json). Acknowledgement clears those words and writes the queue again. Entries older than 24 hours are pruned on acknowledgement, not by a timer. A stopped or idle server can retain queued data longer.</li>
      </ol>
      <p>Neophi does not read your Instagram account, your followers, your other messages, or any post you did not send. It never asks for your password.</p>
      <h2>Who else gets your data</h2>
      <ul>
        <li>
          <b>Meta</b> (Instagram) carries the message. Its own policies apply to that.
        </li>
        <li>
          <b>Google</b> receives analysis requests only when the Gemini provider is enabled. The default mock provider runs on your device. Private memories are never sent for analysis.
        </li>
      </ul>
      <p>We do not sell data, show advertising, or use analytics or tracking scripts.</p>
      <h2>How long</h2>
      <p>
        In your browser: until you delete it. On the server: words are cleared after successful acknowledgement; age-based cleanup is opportunistic, so no fixed maximum retention is guaranteed. The key frame of
        an upload can be set to remove itself after 1 day or 7 days in Settings. See <Link to="/data-deletion">Data deletion</Link>.
      </p>
      <h2>Your rights</h2>
      <p>
        You can inspect a memory's ledger, export your library and delete your local copy. Legal rights and grievance handling: DRAFT, verify before public launch. Use the contact status above.
      </p>
    </LegalPage>
  );
}

export function Terms() {
  return (
    <LegalPage title="Terms" lede="Short terms for a prototype.">
      <h2>What this is</h2>
      <p>Neophi is a prototype shown for evaluation. It is provided as it is, with no promise that it will keep working or that your data in it will be kept.</p>
      <h2>Your content</h2>
      <p>
        What you save and write stays yours. Only save and send things you have the right to keep a copy of. Sending a Reel, post, screenshot or recording of someone
        else's work is your decision and your responsibility. Neophi keeps temporary copies of shared media only as described on the <Link to="/privacy">Privacy</Link> page.
      </p>
      <h2>What the AI says</h2>
      <p>
        Descriptions and suggestions can be wrong. They are labelled, they show their evidence or say they are not sure, and they are never a substitute for checking the
        source. Your own words are never changed by the AI.
      </p>
      <h2>Instagram</h2>
      <p>Neophi is not affiliated with or endorsed by Instagram or Meta. Using the Instagram connection means you follow Instagram's own terms as well as these.</p>
      <h2>Sample content</h2>
      <p>Every sample save, caption, account name and picture shown as a sample is invented. Any likeness to a real post or account is not intended.</p>
      <h2>Changes</h2>
      <p>These terms will be replaced by full terms before any public launch.</p>
    </LegalPage>
  );
}

export function DataDeletion() {
  return (
    <LegalPage title="Data deletion" lede="How to remove one memory, or everything, including what came from Instagram.">
      <h2>Delete one memory</h2>
      <ol>
        <li>Open the memory in the app.</li>
        <li>Choose Delete, then confirm.</li>
      </ol>
      <p>The link, your note, the key frame, the analysis and the ledger for that memory are removed from your browser. It cannot be undone.</p>
      <h2>Delete everything</h2>
      <ol>
        <li>
          Open <a href="/app/settings">Settings</a> in the app.
        </li>
        <li>Choose Delete all, then confirm.</li>
      </ol>
      <p>All memories, categories, projects, rules, settings and the waitlist entry are removed from your browser. You can export everything first from the same page.</p>
      <h2>Saves that came from Instagram</h2>
      <p>
        Successful acknowledgement clears the queued words on the server. Media stays in process memory until cleanup or restart; deleting a browser memory does not clear pending server data or cached media. Cleanup has no scheduled expiry. If you want the team to check what remains on the server,
        or you cannot use the app, send a request to the contact address on the <Link to="/privacy">Privacy</Link> page with your Instagram username and the date you sent
        the message; the team must verify how to identify and remove a matching queued item. Response timing is not set yet.
      </p>
      <h2>Google and Meta</h2>
      <p>
        When enabled, Gemini processes text and media under the configured provider’s terms. The resulting analysis stays in your browser; downloaded DM media remains in process memory until opportunistic cleanup or restart. The message itself also exists in your Instagram
        conversation: delete it there with Instagram's own tools. There is no Instagram account connection to revoke in this prototype; sending a DM does not connect your account.
      </p>
    </LegalPage>
  );
}
