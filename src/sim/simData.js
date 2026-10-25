/**
 * Simulation data. Values marked "simulated" are not in the case sheet and
 * are plausible defaults for the exercise — edit freely.
 */
export const banner = {
  uhid: 'OPD/2025/PULM-0147',
  name: 'Patient A (anonymised)',
  age: 35,
  sex: 'M',
  dept: 'Pulmonary Medicine · OPD',
  allergies: 'Not recorded',
};

export const vitals = {
  hr: 98,
  spo2: 95, // simulated (not in case sheet)
  rr: 24,
  sys: 120,
  dia: 80,
  tempF: 100,
};

export const history = [
  'Cough × 6 weeks, now with blood-streaked sputum',
  'Evening fever, drenching night sweats',
  'Fatigue, loss of appetite, 4 kg weight loss',
  'Crowded, poorly ventilated home · non-smoker',
];

// Auscultation / percussion points (coords in the 300×380 chest SVG)
// side: patient's side. Image is viewed from the front, so patient's LEFT is on the viewer's RIGHT.
export const chestPoints = {
  front: [
    { id: 'RUZ-a', side: 'R', label: 'Right upper zone (2nd ICS, MCL)', x: 110, y: 182 },
    { id: 'LUZ-a', side: 'L', label: 'Left upper zone (2nd ICS, MCL)', x: 190, y: 182, abnormal: true },
    { id: 'RMZ-a', side: 'R', label: 'Right mid zone (4th ICS)', x: 106, y: 211 },
    { id: 'LMZ-a', side: 'L', label: 'Left mid zone (4th ICS)', x: 194, y: 211 },
    { id: 'RLZ-a', side: 'R', label: 'Right lower zone (6th ICS, AAL)', x: 91, y: 263 },
    { id: 'LLZ-a', side: 'L', label: 'Left lower zone (6th ICS, AAL)', x: 209, y: 263 },
  ],
  back: [
    // from behind, patient's LEFT is on the viewer's LEFT
    { id: 'LUZ-p', side: 'L', label: 'Left upper zone (suprascapular)', x: 115, y: 183, abnormal: true },
    { id: 'RUZ-p', side: 'R', label: 'Right upper zone (suprascapular)', x: 185, y: 183 },
    { id: 'LMZ-p', side: 'L', label: 'Left interscapular', x: 133, y: 217 },
    { id: 'RMZ-p', side: 'R', label: 'Right interscapular', x: 167, y: 217 },
    { id: 'LLZ-p', side: 'L', label: 'Left base (infrascapular)', x: 115, y: 276 },
    { id: 'RLZ-p', side: 'R', label: 'Right base (infrascapular)', x: 185, y: 276 },
  ],
};

export const findingsAt = (abnormal) =>
  abnormal
    ? {
        breath: 'Bronchial (tubular) breathing',
        added: 'Fine late-inspiratory crackles',
        percussion: 'Dull',
        resonance: 'Increased vocal resonance',
        note: 'Consolidation with cavitation in the left upper lobe — air-filled alveoli replaced by caseous tissue conduct sound like a tube.',
      }
    : {
        breath: 'Normal vesicular',
        added: 'None',
        percussion: 'Resonant',
        resonance: 'Normal',
        note: 'Normal aerated lung.',
      };

// GeneXpert probes — ΔCt (max − min) ≤ 4 → rifampicin resistance not detected
export const xpertProbes = [
  { name: 'Probe A', ct: 19.2, color: '#4ADE80' },
  { name: 'Probe B', ct: 20.1, color: '#FACC15' },
  { name: 'Probe C', ct: 19.6, color: '#F87171' },
  { name: 'Probe D', ct: 20.4, color: '#C4B5FD' },
  { name: 'Probe E', ct: 21.0, color: '#FDBA74' },
  { name: 'SPC', ct: 26.8, color: '#9CA3AF', control: true },
];

// NTEP adult daily FDC (HRZE 75/150/400/275 mg) weight bands.
// VERIFY against the current NTEP dosing chart before use.
export const weightBands = [
  { min: 25, max: 39, tabs: 2 },
  { min: 40, max: 54, tabs: 3 },
  { min: 55, max: 69, tabs: 4 },
  { min: 70, max: 200, tabs: 5 },
];

// Simulated treatment course (month → state)
export const course = [
  { m: 0, temp: 100, dWt: 0, cough: 'Severe, hemoptysis', smear: 'AFB 2+', note: 'Start intensive phase: HRZE daily + pyridoxine. Notify on Nikshay; screen household contacts.' },
  { m: 1, temp: 99.2, dWt: 0.5, cough: 'Improving, no blood', smear: '—', note: 'Mild nausea — take after food. LFT normal. Adherence via 99DOTS.' },
  { m: 2, temp: 98.4, dWt: 1.5, cough: 'Occasional', smear: 'Negative', note: 'End of intensive phase: smear negative → continuation phase HRE (pyrazinamide stopped).' },
  { m: 3, temp: 98.4, dWt: 2.5, cough: 'Resolved', smear: '—', note: 'Gaining weight. Check visual acuity / colour vision (ethambutol).' },
  { m: 4, temp: 98.2, dWt: 3, cough: 'Resolved', smear: '—', note: 'Asymptomatic. Nikshay Poshan Yojana nutrition support continues.' },
  { m: 5, temp: 98.2, dWt: 3.5, cough: 'Resolved', smear: '—', note: 'Continue HRE. Cervical node shrinking.' },
  { m: 6, temp: 98.2, dWt: 4, cough: 'Resolved', smear: 'Negative', note: 'End of treatment: smear / culture negative → outcome CURED. Follow up for relapse.' },
];
