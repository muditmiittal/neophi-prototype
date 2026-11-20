import { Link } from 'react-router-dom';
import { PageIntro } from '../components/Immersive';

// Sources for the Magpie column: its own public site, read on 14 Nov 2026. We have not used the product.
// "Not checked" means we have not looked for it, not that the answer is no.
const ROWS: { what: string; today: string; planned: string; magpie: string }[] = [
  { what: 'Save from Instagram by DM', today: 'Testers only in Meta development mode; local demo pickup. Media access can fail.', planned: 'Public access after review and verification.', magpie: 'Yes, says its site: DM a Reel to save it.' },
  { what: 'Paste a link or upload a file', today: 'Yes. Links are kept, not fetched.', planned: 'Reading link media where allowed.', magpie: 'Not checked by us.' },
  { what: 'Your own note on a save', today: 'Yes, stored exactly as typed. Browser speech recognition is optional.', planned: 'Recorded voice uploads.', magpie: 'Yes, says its site: notes on Reels.' },
  { what: 'Your words kept apart from AI text', today: 'Yes, enforced in code with tests.', planned: 'Same rule on the server.', magpie: 'Not checked by us.' },
  { what: 'Evidence for each AI observation', today: 'Sample analysis, or optional Gemini analysis. Guard checks references.', planned: 'Human evaluation of evidence correctness.', magpie: 'Not checked by us.' },
  { what: '"Not sure" instead of a guess', today: 'Yes, guard and display rules.', planned: 'Measure uncertainty quality on a labelled set.', magpie: 'Not checked by us.' },
  { what: 'Categories built from your context', today: 'Yes, with simple word matching.', planned: 'Embedding-based, updated as you save.', magpie: 'Collections and rules, says its site.' },
  { what: 'Find by half remembering', today: 'Word matching in English, Hindi and Hinglish; optional Gemini embeddings.', planned: 'Comparative retrieval benchmark.', magpie: 'Yes, says its site: recall in plain English.' },
  { what: 'Connections to other apps', today: 'Maps search links, calendar-file export and copied task checklists. No account connected.', planned: 'Account integrations.', magpie: 'Google Maps, Spotify, Notion and MCP, says its site.' },
  { what: 'Export and delete', today: 'Yes: JSON, Markdown, CSV; delete one or all.', planned: 'Same, plus server-side erasure.', magpie: 'CSV export, says its site.' },
  { what: 'Published prices', today: 'None yet.', planned: 'After we measure cost per save.', magpie: 'Yes, on its site.' },
];

export function Compare() {
  return (
    <div className="page wrap">
      <PageIntro video="loop_traveller">
        <h1>An honest comparison</h1>
        <p>
          Neophi status checked in code on 20 Nov 2026. Competitor statements below are the original 14 Nov 2026 notes and have not been reverified. This page says what Neophi does today, what is only
          planned, and what the closest tool says about itself.
        </p>
      </PageIntro>

      <div className="table-wrap" tabIndex={0} role="region" aria-label="Comparison table, scrolls sideways on small screens">
        <table className="cmp">
          <thead>
            <tr>
              <th scope="col">What</th>
              <th scope="col">
                Neophi today<small>this prototype</small>
              </th>
              <th scope="col">
                Neophi planned<small>not built</small>
              </th>
              <th scope="col">
                Magpie<small>from its own site, not tested by us</small>
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.what}>
                <th scope="row">{r.what}</th>
                <td>{r.today}</td>
                <td>{r.planned}</td>
                <td>{r.magpie}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="split" style={{ marginTop: 40 }}>
        <div className="prose">
          <h2>How to read this</h2>
          <ul>
            <li>"Says its site" means we read it on the product's public pages. We have not used the product.</li>
            <li>"Not checked" means we have not verified the point either way. It does not mean the answer is no.</li>
            <li>Competitor source links: verify before relying on the historical comparison. No competitor was tested in this build.</li>
          </ul>
        </div>
        <div className="prose">
          <h2>What we do not claim</h2>
          <p>
            We do not claim to be better than anyone. Our bet is two things: categories personal to each user, and a memory you can trust. Whether that makes saves
            faster to find is something to measure, with the method published first.
          </p>
          <p>
            <Link to="/how-we-measure">How we will measure it</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
