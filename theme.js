export const COLORS = {
  // Greens
  primary:       '#3B6D11',
  primaryLight:  '#5A9B1C',
  primaryDark:   '#244208',
  primaryBg:     '#EAF3DC',
  primaryBorder: '#8DC44E',

  // Backgrounds
  bg:            '#F5F4F0',
  card:          '#FFFFFF',
  cardBorder:    '#D8D6CC',

  // Tiers
  tier1Bg:       '#E6F1FB',
  tier1Border:   '#1B6BBF',
  tier1Text:     '#0D4A8A',
  tier2Bg:       '#FAF0DE',
  tier2Border:   '#C07D10',
  tier2Text:     '#6B3E06',
  tier3Bg:       '#DFF3EC',
  tier3Border:   '#117056',
  tier3Text:     '#064232',

  // Status
  red:           '#D93025',
  redBg:         '#FDECEB',
  orange:        '#E8750A',
  orangeBg:      '#FEF3E2',
  green:         '#1E7E34',
  greenBg:       '#D4EDDA',

  // Text
  textPrimary:   '#1E1E1C',
  textSecondary: '#5A5955',
  textMuted:     '#8A8880',
  white:         '#FFFFFF',

  // Watering indicator colors by urgency
  waterOk:       '#1E7E34',
  waterSoon:     '#E8750A',
  waterNow:      '#D93025',
  waterDone:     '#1B6BBF',
};

export const TIER_COLORS = [
  { bg: COLORS.tier1Bg, border: COLORS.tier1Border, text: COLORS.tier1Text },
  { bg: COLORS.tier2Bg, border: COLORS.tier2Border, text: COLORS.tier2Text },
  { bg: COLORS.tier3Bg, border: COLORS.tier3Border, text: COLORS.tier3Text },
];

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};

// Days since last watering → urgency level
export const getWaterUrgency = (lastWatered, waterDays) => {
  if (!lastWatered) return 'now'; // never watered
  const last = new Date(lastWatered);
  const now = new Date();
  const diffDays = (now - last) / (1000 * 60 * 60 * 24);
  const ratio = diffDays / waterDays;
  if (ratio >= 1.0) return 'now';
  if (ratio >= 0.7) return 'soon';
  return 'ok';
};

export const getWaterDaysLeft = (lastWatered, waterDays) => {
  if (!lastWatered) return 0;
  const last = new Date(lastWatered);
  const now = new Date();
  const diffDays = (now - last) / (1000 * 60 * 60 * 24);
  const left = Math.ceil(waterDays - diffDays);
  return Math.max(0, left);
};

export const getWaterLabel = (lastWatered, waterDays) => {
  const urgency = getWaterUrgency(lastWatered, waterDays);
  if (urgency === 'now') return 'Podlej!';
  const left = getWaterDaysLeft(lastWatered, waterDays);
  if (left <= 1) return 'Jutro';
  return `${left}d`;
};

export const getWaterColor = (urgency) => {
  switch (urgency) {
    case 'now':  return COLORS.waterNow;
    case 'soon': return COLORS.waterSoon;
    default:     return COLORS.waterOk;
  }
};
