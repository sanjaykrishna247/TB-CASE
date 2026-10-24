/**
 * ─────────────────────────────────────────────────────────────
 *  ALL ANSWER TEXT LIVES HERE — kept short for a 3-minute talk.
 * ─────────────────────────────────────────────────────────────
 *  Inline formatting:  **bold**   *italic* (organism names)
 *
 *  id       'q1' … 'q8' (also the URL hash, e.g. #q3)
 *  tag      subject shown above the question
 *  question the question (section heading)
 *  keyLine  THE answer — highlighted when the question is clicked in
 *           the Question Index (rendered with id `q{n}-key`)
 *  points   3–4 short supporting points
 * ─────────────────────────────────────────────────────────────
 */

export const questions = [
  {
    id: 'q1',
    n: 1,
    tag: 'Diagnosis',
    question: 'What is the most likely diagnosis and causative agent?',
    keyLine:
      '**Post-primary pulmonary tuberculosis** of the left upper lobe with **tuberculous cervical lymphadenitis**, caused by ***Mycobacterium tuberculosis***.',
    points: [
      'Six-week cough with **hemoptysis**, evening fever, night sweats, 4 kg weight loss',
      'Apical signs — dullness, bronchial breathing, crackles',
      '**GeneXpert:** MTB detected, rifampicin-sensitive',
      '**Node biopsy:** caseating granulomas with Langhans giant cells',
    ],
  },
  {
    id: 'q2',
    n: 2,
    tag: 'Pathogenesis',
    question: 'How does the disease develop?',
    keyLine:
      'Inhaled bacilli survive inside macrophages; after ~3 weeks a **Th1 / IFN-γ (type IV hypersensitivity)** response walls them off as **caseating granulomas** — the same response that destroys tissue.',
    points: [
      'Droplet nuclei reach the alveoli and are engulfed by macrophages',
      'Bacilli **block phagosome–lysosome fusion** (cord factor, LAM, ESAT-6) and multiply',
      'Th1 cells release **IFN-γ** → activated macrophages; **TNF-α** builds the granuloma',
      'Primary **Ghon complex** → latency; reactivates at the **apex** when immunity falls',
    ],
  },
  {
    id: 'q3',
    n: 3,
    tag: 'Morphology',
    question: 'What are the morphological changes in the organs?',
    keyLine:
      'The hallmark is the **tubercle — a caseating granuloma**: central caseous necrosis, epithelioid cells, Langhans giant cells and a rim of lymphocytes.',
    points: [
      '**Primary:** Ghon focus + hilar node = Ghon complex (Ranke complex when calcified)',
      '**Secondary:** apical consolidation → **thick-walled cavity**, fibrosis',
      '**Lymph node:** matted, cheesy caseation; may form a cold abscess',
      '**Miliary:** 2 mm millet-seed foci in many organs',
    ],
  },
  {
    id: 'q4',
    n: 4,
    tag: 'Microbiology',
    question: 'Describe the morphology and culture of the organism.',
    keyLine:
      '*M. tuberculosis* is a slender, non-motile **acid-fast bacillus** — an obligate aerobe that grows slowly (2–8 weeks) on **Löwenstein–Jensen medium** as **rough, buff, cauliflower-like colonies**.',
    points: [
      '1–4 µm rods; **mycolic-acid wall** → stains poorly with Gram, **red on ZN stain**',
      'Generation time ~14–20 h at 37 °C',
      'Media: **LJ** (egg + malachite green), liquid **MGIT**',
      'Niacin +, nitrate reduction +, catalase at 68 °C −',
    ],
  },
  {
    id: 'q5',
    n: 5,
    tag: 'Laboratory diagnosis',
    question: 'How is the diagnosis confirmed in the lab?',
    keyLine:
      '**Sputum microscopy (ZN), culture (LJ / MGIT) and CBNAAT / GeneXpert**, supported by lymph-node biopsy and chest X-ray.',
    points: [
      'Two sputum samples — ZN or fluorescent smear (needs ≥10⁴ bacilli/ml)',
      '**GeneXpert** detects MTB and rifampicin resistance (*rpoB*) in ~2 hours',
      '**Culture + drug-susceptibility testing** is the gold standard',
      'Support: FNAC / biopsy, chest X-ray, Mantoux or IGRA',
    ],
  },
  {
    id: 'q6',
    n: 6,
    tag: 'Pharmacology',
    question: 'Classify the anti-tubercular drugs.',
    keyLine:
      '**First-line: isoniazid, rifampicin, pyrazinamide, ethambutol (± streptomycin).** **Second-line** drugs for resistant TB are grouped by WHO into **A, B and C**.',
    firstLine: [
      { code: 'H', name: 'Isoniazid', mech: 'Blocks mycolic acid synthesis', ae: 'Hepatitis, neuropathy' },
      { code: 'R', name: 'Rifampicin', mech: 'Inhibits RNA polymerase', ae: 'Orange urine, enzyme inducer' },
      { code: 'Z', name: 'Pyrazinamide', mech: 'Kills intracellular bacilli', ae: 'Hepatotoxic, hyperuricaemia' },
      { code: 'E', name: 'Ethambutol', mech: 'Blocks arabinosyl transferase', ae: 'Optic neuritis' },
      { code: 'S', name: 'Streptomycin', mech: 'Binds 30S ribosome', ae: 'Ototoxic, nephrotoxic' },
    ],
    whoGroups: [
      { group: 'A', drugs: 'Levofloxacin / Moxifloxacin · Bedaquiline · Linezolid' },
      { group: 'B', drugs: 'Clofazimine · Cycloserine / Terizidone' },
      { group: 'C', drugs: 'Delamanid · Amikacin · Ethionamide · PAS · Carbapenems' },
    ],
    points: [],
  },
  {
    id: 'q7',
    n: 7,
    tag: 'Treatment',
    question: 'What is the treatment regimen?',
    keyLine:
      'New, rifampicin-sensitive TB: **2 HRZE + 4 HRE** — daily weight-band fixed-dose combinations for **6 months**.',
    points: [
      '**Pyridoxine** with isoniazid to prevent neuropathy',
      'Monitor sputum, weight, liver tests and vision',
      'Drug-resistant TB: 6-month **BPaLM** regimen',
      'Household contacts: TB preventive therapy (6H / 3HP)',
    ],
  },
  {
    id: 'q8',
    n: 8,
    tag: 'Public health',
    question: 'How is India working to end this “biosocial disease”?',
    keyLine:
      'The **National TB Elimination Programme (NTEP)** — RNTCP renamed in 2020 — works on four pillars, **Detect · Treat · Prevent · Build**, to end TB ahead of the SDG 2030 target.',
    pillars: [
      { name: 'Detect', items: ['Active case finding', 'GeneXpert / Truenat in every district', 'Mandatory notification'] },
      { name: 'Treat', items: ['Free daily FDC drugs', 'Digital adherence', 'Nikshay Poshan Yojana'] },
      { name: 'Prevent', items: ['Preventive therapy for contacts', 'Airborne infection control', 'BCG'] },
      { name: 'Build', items: ['Nikshay portal', 'TB Mukt Bharat Abhiyaan', 'Ni-kshay Mitra support'] },
    ],
    points: [
      '**Why biosocial?** Poverty, malnutrition and crowded homes drive TB — so the programme adds nutrition and community support, not just drugs.',
    ],
    // Check latest NTEP guidance / India TB Report figures before presenting.
  },
];

export const questionById = Object.fromEntries(questions.map((q) => [q.id, q]));
