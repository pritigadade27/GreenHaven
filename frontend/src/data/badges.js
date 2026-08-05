/** Green Haven — the badge taxonomy. */

export const BADGES = {
  petFriendly: {
    label: 'Pet Friendly',
    tone: 'good',
    icon: 'paw',
    detail: 'Non-toxic to cats and dogs if nibbled.',
  },
  petCaution: {
    label: 'Keep From Pets',
    tone: 'warn',
    icon: 'paw',
    detail: 'Mildly irritating if chewed — best placed out of reach.',
  },
  petToxic: {
    label: 'Toxic to Pets',
    tone: 'warn',
    icon: 'paw',
    detail: 'Harmful if eaten by cats or dogs. Keep well out of reach.',
  },
  beginner: {
    label: 'Beginner Friendly',
    tone: 'accent',
    icon: 'leaf',
    detail: 'Forgiving of mistakes — a great first plant.',
  },
  lowMaintenance: {
    label: 'Low Maintenance',
    tone: 'good',
    icon: 'shield',
    detail: 'Thrives on neglect. Minimal watering and feeding.',
  },
  airPurifying: {
    label: 'Air Purifying',
    tone: 'good',
    icon: 'drop',
    detail: 'Filters common indoor air pollutants.',
  },
  lowLight: {
    label: 'Low Light',
    tone: 'info',
    icon: 'sun',
    detail: 'Happy away from a window — good for darker rooms.',
  },
  brightLight: {
    label: 'Loves Bright Light',
    tone: 'info',
    icon: 'sun',
    detail: 'Needs several hours of bright or direct sun.',
  },
  droughtTolerant: {
    label: 'Drought Tolerant',
    tone: 'good',
    icon: 'drop',
    detail: 'Forgives a missed watering — or several.',
  },
  flowering: {
    label: 'Flowering',
    tone: 'accent',
    icon: 'star',
    detail: 'Produces blooms through its season.',
  },
  fragrant: {
    label: 'Fragrant',
    tone: 'accent',
    icon: 'star',
    detail: 'Scented flowers or foliage.',
  },
  edible: {
    label: 'Edible / Culinary',
    tone: 'good',
    icon: 'leaf',
    detail: 'Leaves or fruit can be harvested for the kitchen.',
  },
  fastGrowing: {
    label: 'Fast Growing',
    tone: 'info',
    icon: 'arrowRight',
    detail: 'Visible new growth every few weeks in season.',
  },
  statement: {
    label: 'Statement Plant',
    tone: 'accent',
    icon: 'star',
    detail: 'Large and sculptural — designed to be the focal point.',
  },
  vastu: {
    label: 'Vastu / Lucky',
    tone: 'accent',
    icon: 'shield',
    detail: 'Traditionally kept for prosperity and good fortune.',
  },
};

/** Filters offered on the Shop page, in display order. */
export const FILTER_GROUPS = [
  {
    key: 'petSafety',
    label: 'Pet Safety',
    options: [
      { value: 'safe', label: 'Pet friendly only' },
      { value: 'any', label: 'Show everything' },
    ],
  },
  {
    key: 'difficulty',
    label: 'Care Level',
    options: [
      { value: 'Easy', label: 'Easy — new plant parents' },
      { value: 'Moderate', label: 'Moderate — some experience' },
      { value: 'Expert', label: 'Expert — a challenge' },
    ],
  },
  {
    key: 'light',
    label: 'Light in your room',
    options: [
      { value: 'low', label: 'Low light / no direct sun' },
      { value: 'medium', label: 'Bright indirect' },
      { value: 'high', label: 'Full sun' },
    ],
  },
  {
    key: 'water',
    label: 'How often can you water?',
    options: [
      { value: 'low', label: 'Rarely — every 2–3 weeks' },
      { value: 'medium', label: 'Weekly' },
      { value: 'high', label: 'Often — twice a week' },
    ],
  },
];

export default BADGES;
