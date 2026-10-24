/** Case history content. Edit to match the actual case sheet. */

export const patient = [
  ['Patient', '35-year-old man'],
  ['Seen in', 'Outpatient department'],
  ['Home', 'Crowded, poorly ventilated'],
  ['Habits', 'Non-smoker'],
];

// Symptom timeline over six weeks
export const timeline = [
  { week: 'Week 0', label: 'Cough' },
  { week: 'Week 1', label: 'Evening fever' },
  { week: 'Week 2', label: 'Night sweats' },
  { week: 'Week 3', label: 'Fatigue' },
  { week: 'Week 4', label: '4 kg weight loss' },
  { week: 'Week 6', label: 'Hemoptysis', alert: true },
];

// flag: 'high' | 'low' | undefined (normal)
export const vitals = [
  { label: 'Temperature', value: 100, unit: '°F', flag: 'high' },
  { label: 'Resp. rate', value: 24, unit: '/min', flag: 'high' },
  { label: 'Pulse', value: 98, unit: '/min' },
  { label: 'BP', value: 120, second: 80, unit: 'mmHg' },
  { label: 'Haemoglobin', value: 10.2, decimals: 1, unit: 'g/dL', flag: 'low' },
  { label: 'ESR', value: 50, unit: 'mm/hr', flag: 'high' },
];

export const findings = [
  {
    title: 'On examination',
    lines: ['Left upper lobe: dull note, bronchial breathing, fine crackles', 'Cervical node 3 × 2 cm, matted'],
  },
  {
    title: 'GeneXpert',
    highlight: true,
    lines: ['MTB detected', 'Rifampicin resistance not detected'],
  },
  {
    title: 'Node biopsy',
    lines: ['Caseating granulomas', 'Langhans giant cells'],
  },
];

export const publicHealth = 'Case notified to public-health authorities; household contacts and community screened.';
