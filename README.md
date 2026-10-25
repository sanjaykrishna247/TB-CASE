# TB Case Study — VINMANTRA presentation site

An animated single-page presentation for the Pulmonary Tuberculosis case study
(II MBBS 2025 batch · Pathology · Microbiology · Pharmacology).

Built with Vite + React 18, Tailwind CSS, framer-motion, React Three Fiber (3D lungs and bacillus),
Remotion Player (4 embedded animations) and Lenis smooth scrolling.

## Run it

```bash
npm install        # first time only
npm run dev        # open the printed URL (usually http://localhost:5173)
```

For the presentation itself, use the production build. It is faster and smoother:

```bash
npm run build
npm run preview    # serves dist/ at http://localhost:4173
```

The site works offline once installed. Only the Google Fonts load from the internet, and system
fonts are used if there's no connection.

## Before presenting: edit these two files

### `src/config.js`
| key | what it changes |
|---|---|
| `presenterName` | "Presented by" in the footer (currently `[FRIEND NAME]`) |
| `className`, `eventName` | hero badges, footer |
| `collegeName`, `departmentName` | hero footer line, footer |
| `preloaderMs` | length of the intro animation |
| `highlightMs` | how long the answer stays brightly highlighted after a jump |

### `src/data/answers.js`
All answer text for Q1–Q8. It's kept short on purpose (about 20 seconds per question):
- `keyLine` is the answer sentence. It gets the highlighter sweep when you click that question in the question list.
- `points` holds 3–4 short supporting lines.
- Inline formatting: `**bold**`, `*italic*` (use italic for organism names).

Case details (patient, timeline, vitals, findings) are in `src/data/caseData.js`.

> Check the latest NTEP guidance before presenting.

## Presenting

- **Top bar:** *Case* jumps to the case; *Questions* jumps to the question list (just above the footer).
- **Question list:** click a question to scroll to its answer and highlight it. Use **Back to questions** (bottom-right) to return.
- **Keyboard:** `→` / `←` go to the next or previous question and highlight it, `I` opens the question list, `H` goes back to the top, and `P` switches to slightly larger text.
- Animations play while on screen. Hover over one for pause/restart.

Suggested 3-minute flow: hero (10 s) → case (30 s) → about 17 s per question → thank you.

## Deploy to Vercel

1. Import this GitHub repo in Vercel (**Add New → Project**).
2. Vercel detects Vite automatically (`vercel.json` sets build `npm run build`, output `dist`). Click **Deploy**.
3. `/simulation` works directly thanks to the SPA rewrite in `vercel.json`.

## Clinical simulation (`/simulation`)

A separate page, styled as a doctor's workstation, for working up the same patient. Open it at
`http://localhost:4173/simulation`, or use the **Simulation** button in the presentation's top bar.

| Module | What you do |
|---|---|
| How TB infects (3D) | 8-stage animated journey through a see-through body: cough → inhalation → airways → alveolus & macrophage (close-up) → lymph nodes → granuloma (close-up) → reactivation → transmission. Drag to rotate, scroll/pinch to zoom, right-drag to pan; play/pause, step through stages, labels, auto camera, fullscreen |
| Vitals monitor | Live ECG / pleth / respiration traces, alarms, NIBP, optional QRS beep |
| Examination | Auscultate front and back (synthesised breath sounds, so use headphones), percuss, palpate the neck |
| Chest X-ray | Hospital-style image viewer: window/level drag, zoom, pan, invert, ruler, CTR, findings + report |
| Sputum microscopy | **Auto run** scans at 10×, applies oil, switches to 100×, focuses, counts AFB in 10 fields and grades the smear (2+). Manual mode: objectives, oil, focus, drag the stage, record fields (bacilli are detected automatically) |
| GeneXpert | Prepare and load the cartridge, watch real-time PCR curves → MTB detected / RIF resistance not detected |
| Treatment | Weight-band FDC dosing, then a 6-month course simulator (weight, fever, sputum, outcome) |

The case brief collects a clinical summary as modules are completed and reveals the final diagnosis at the end.
Simulation values that aren't in the case sheet (SpO₂, the treatment course) are marked as simulated in
`src/sim/simData.js`, which also holds all the editable content. All sounds and images are generated in the browser,
so no extra files are needed.

> Hosting: on a static host, either configure a rewrite of `/simulation` → `/index.html`, or link to `/#/simulation`
> (that also works without any configuration).

## 3D human model

The realistic body in the simulation (`public/models/human-male.bin`) is built from the
[MakeHuman](http://www.makehumancommunity.org) base mesh and young-male shape targets, which the
MakeHuman project released as **CC0 (public domain)** in 2020. `scripts/build-human.py` converts them:
it applies the average young-male shape, lowers the arms into a relaxed stance and scales the body to
the scene. If the file can't be loaded, a simpler built-in body is used instead.

## Structure

```
src/
  config.js            presenter settings
  data/answers.js      all Q1–Q8 content
  data/caseData.js     case history (patient, timeline, vitals, findings)
  AppContext.jsx       smooth scroll, jump + highlight, keyboard, presentation mode
  components/          navbar, preloader, KeyLine highlight, question layout
  sections/            Hero, CaseHistory, Questions (Q1–Q8), QuestionIndex, Footer
  three/               3D lungs (procedural) and drifting bacilli
  remotion/            PathogenesisFlow, GranulomaBuild, ZNStain, RegimenTimeline
  sim/                 clinical simulation page (monitor, exam + audio, X-ray, microscope, GeneXpert, treatment)
```

## Notes
- If the OS setting "reduce motion" is on, smooth scrolling and particles are switched off and the 3D scenes stop moving.
