import { PageIntro } from '../components/Immersive';
export function HowWeMeasure() {
  return (
    <div className="page wrap">
      <PageIntro video="loop_student">
        <h1>How we measure</h1>
        <p>
          A small analysis test has been run. <b>The head-to-head retrieval benchmark has not been run.</b> Neophi does not say
          "better" anywhere.
        </p>
      </PageIntro>

      <section className="prose measured-detail"><h2>Small analysis test · 20 Nov 2026</h2><p>12 test items; 12 returned valid output. 41 of 41 observed objects carried an evidence reference. Average time: about 15.5 seconds. Average estimated cost: about US$0.0052 per save, at published prices read that day.</p><p>Source: the build team’s eval_result.json. These counts measure output shape and reference coverage, not whether every observation is correct. No user study or comparative retrieval result is available.</p></section>
      <div className="split">
        <div className="prose">
          <h2>The head-to-head retrieval benchmark</h2>
          <p>The question: when someone half remembers a save, how quickly do they get back to it, and how often?</p>
          <ol>
            <li>
              <b>Same saves.</b> One person saves the same set of Reels and posts into each tool on the same day, adding the same note wherever the tool allows a note.
            </li>
            <li>
              <b>Same half-remembered queries.</b> Ten queries are written before any tool is searched, in the words a person would actually use, including Hindi and
              Hinglish, such as "red shirt dance last month".
            </li>
            <li>
              <b>A stopwatch.</b> For each query and each tool: time from starting the search to opening the right save, with a fixed cut-off after which it counts as
              not found.
            </li>
            <li>
              <b>Two numbers per tool.</b> Hit rate (found or not, at the first result and within the first five) and median time to find.
            </li>
            <li>
              <b>Everything published.</b> The save list, the queries, the raw timings and a screen recording, so anyone can repeat it and disagree.
            </li>
          </ol>
          <h3>Compared against</h3>
          <ul>
            <li>Instagram's own Saved, as the baseline everyone already has.</li>
            <li>Other save tools, only those we have actually used ourselves by then, named with the date and version tested.</li>
          </ul>
        </div>

        <div className="prose">
          <h2>The evaluation set</h2>
          <p>Before the benchmark, a smaller check of the analysis itself on a labelled set of saves:</p>
          <ul>
            <li>
              <b>Note preserved.</b> The stored note equals what was typed, for every example. This must be all of them.
            </li>
            <li>
              <b>Grounding.</b> When a note points at something in the source, is the evidence the right frame or quote?
            </li>
            <li>
              <b>Empty reason rate.</b> When no note was given, how often is the reason left empty or marked AI, never presented as the user's?
            </li>
            <li>
              <b>Retrieval.</b> Is the right save the first result, and is it in the first five?
            </li>
            <li>
              <b>Cost per save.</b> Tokens and time for each analysis, at the listed model price.
            </li>
          </ul>
          <h2>What can make this unfair</h2>
          <ul>
            <li>We write the queries, so they may suit our own search. That is why they are fixed and published before testing.</li>
            <li>One tester is not a study. Results will be reported as what one person measured, not as a general claim.</li>
            <li>Tools change. Every result carries the date it was measured.</li>
          </ul>
          <p className="banner">
            <span>
              <b>Retrieval benchmark: not started.</b> This page will show results only after the runs exist, with the raw data beside them.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
