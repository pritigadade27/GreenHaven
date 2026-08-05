/** Green Haven — product catalogue. */

// Indoor
import aloeVera from '../assets/images/plants/aloe-vera.jpg';
import castIron from '../assets/images/plants/cast-iron-plant.jpg';
import dumbcane from '../assets/images/plants/dumbcane.jpg';
import friendship from '../assets/images/plants/friendship-plant.jpg';
import grapeIvy from '../assets/images/plants/grape-ivy.jpg';
import jade from '../assets/images/plants/jade-plant.jpg';
import luckyBamboo from '../assets/images/plants/lucky-bamboo.jpg';
import moneyPlant from '../assets/images/plants/money-plant.jpg';
import peaceLily from '../assets/images/plants/peace-lily.jpg';
import philodendron from '../assets/images/plants/philodendron.jpg';
import rubberPlant from '../assets/images/plants/rubber-plant.jpg';
import spiderPlant from '../assets/images/plants/spider-plant.jpg';
import staghorn from '../assets/images/plants/staghorn-fern.jpg';
import zzPlant from '../assets/images/plants/zz-plant.jpg';

// Outdoor
import agave from '../assets/images/plants/agave.jpg';
import banana from '../assets/images/plants/banana.jpg';
import croton from '../assets/images/plants/croton.jpg';
import curryLeaf from '../assets/images/plants/curry-leaf.jpg';
import hibiscus from '../assets/images/plants/hibiscus.jpg';
import jasmine from '../assets/images/plants/jasmine.jpg';
import lemon from '../assets/images/plants/lemon.jpg';
import marigold from '../assets/images/plants/marigold.jpg';
import papaya from '../assets/images/plants/papaya.jpg';
import rose from '../assets/images/plants/rose.jpg';
import sunflower from '../assets/images/plants/sunflower.jpg';
import tulsi from '../assets/images/plants/tulsi.jpg';

// Second wave — sourced from Unsplash, curated in Y:\Priti\green-haven\assets
import anthurium from '../assets/images/plants/anthurium.jpg';
import arecaPalm from '../assets/images/plants/areca-palm.jpg';
import basil from '../assets/images/plants/basil.jpg';
import birdOfParadise from '../assets/images/plants/bird-of-paradise.jpg';
import bonsai from '../assets/images/plants/bonsai.jpg';
import bostonFern from '../assets/images/plants/boston-fern.jpg';
import bougainvillea from '../assets/images/plants/bougainvillea.jpg';
import cactus from '../assets/images/plants/cactus.jpg';
import calathea from '../assets/images/plants/calathea.jpg';
import fiddleLeafFig from '../assets/images/plants/fiddle-leaf-fig.jpg';
import lavender from '../assets/images/plants/lavender.jpg';
import monstera from '../assets/images/plants/monstera.jpg';
import orchid from '../assets/images/plants/orchid.jpg';
import stringOfPearls from '../assets/images/plants/string-of-pearls.jpg';

import { MERCHANDISE } from './merchandise.js';
import { EXTRA_PLANTS } from './plants-extra.js';

export const CATEGORIES = [
  { slug: 'indoor-plants', name: 'Indoor Plants', blurb: 'Living decor for every room.' },
  { slug: 'outdoor-plants', name: 'Outdoor Plants', blurb: 'Balconies, terraces and gardens.' },
  { slug: 'flowering-plants', name: 'Flowering Plants', blurb: 'Colour that returns each season.' },
  { slug: 'succulents', name: 'Succulents', blurb: 'Sculptural and near-unkillable.' },
  { slug: 'air-purifying', name: 'Air Purifying Plants', blurb: 'Cleaner air, quietly.' },
  { slug: 'pots-planters', name: 'Pots & Planters', blurb: 'Ceramic, terracotta and stone.' },
  { slug: 'gardening-tools', name: 'Gardening Tools', blurb: 'Built to last a lifetime.' },
  { slug: 'seeds', name: 'Seeds', blurb: 'Non-GMO, open pollinated.' },
  { slug: 'plant-care', name: 'Plant Care Products', blurb: 'Feed, protect, repot.' },
];

export const PLANTS = [
  /* ------------------------------------------------------------- indoor */
  {
    id: 'p01', slug: 'aloe-vera', name: 'Aloe Vera', botanical: 'Aloe barbadensis',
    category: 'succulents', price: 449, mrp: 599, image: aloeVera,
    rating: 4.8, reviews: 312, stock: 40, featured: true, bestSeller: true,
    short: 'A medicine cabinet in a pot — sculptural, sun-loving and famously hard to kill.',
    description:
      'Aloe Vera stores water in its thick, ridged leaves, which is exactly why it forgives you for forgetting it. Snap a leaf and the clear gel inside soothes burns and dry skin. It wants bright light and gritty soil, and almost nothing else.',
    petSafety: 'toxic', difficulty: 'Easy', light: 'high', water: 'low',
    maintenance: 'Low', growth: 'Slow', size: '30–60 cm',
    badges: ['beginner', 'lowMaintenance', 'droughtTolerant', 'brightLight', 'petToxic'],
    care: {
      light: 'Bright, direct sun for 4–6 hours. A south or west windowsill is ideal.',
      water: 'Every 2–3 weeks. Let the soil dry out completely first — the commonest way to kill an aloe is kindness.',
      soil: 'Free-draining cactus or succulent mix with added sand or perlite.',
      humidity: 'Ordinary room humidity. Dislikes damp, stagnant air.',
      temperature: '18–30 °C. Protect from anything below 10 °C.',
      feed: 'A weak succulent feed twice through summer. Nothing in winter.',
      repot: 'Every 2–3 years, or when offsets crowd the pot.',
    },
    tip: 'If the leaves turn flat and pale, it wants more light, not more water.',
  },
  {
    id: 'p02', slug: 'snake-plant-cast-iron', name: 'Cast Iron Plant', botanical: 'Aspidistra elatior',
    category: 'indoor-plants', price: 699, mrp: 899, image: castIron,
    rating: 4.9, reviews: 187, stock: 25, featured: true,
    short: 'The plant that survives the hallway, the spare room and the long holiday.',
    description:
      'Named for its constitution. The Cast Iron Plant tolerates deep shade, draughts, irregular watering and being ignored for a month — and still puts out glossy, deep green leaves. If you have killed everything else, start here.',
    petSafety: 'safe', difficulty: 'Easy', light: 'low', water: 'low',
    maintenance: 'Very Low', growth: 'Slow', size: '45–75 cm',
    badges: ['beginner', 'lowMaintenance', 'lowLight', 'petFriendly', 'droughtTolerant'],
    care: {
      light: 'Low to moderate indirect light. Keep out of direct sun, which scorches the leaves.',
      water: 'Every 2–3 weeks, once the top 5 cm of soil is dry.',
      soil: 'Any decent, well-draining potting mix.',
      humidity: 'Unfussy. Ordinary room humidity is fine.',
      temperature: '10–29 °C. Handles cold rooms better than most.',
      feed: 'Balanced liquid feed once a month in spring and summer.',
      repot: 'Rarely — every 3–4 years. It prefers being slightly pot-bound.',
    },
    tip: 'Wipe the leaves monthly. Dust is the only thing that really slows it down.',
  },
  {
    id: 'p03', slug: 'dumbcane', name: 'Dumbcane', botanical: 'Dieffenbachia seguine',
    category: 'indoor-plants', price: 599, mrp: 749, image: dumbcane,
    rating: 4.5, reviews: 94, stock: 18,
    short: 'Big, brushstroked cream-and-green leaves that fill a corner fast.',
    description:
      'Dumbcane grows quickly into a bold, upright plant with dramatic variegation. It asks for warmth, steady moisture and no direct sun. Its sap is genuinely irritating, so it belongs high on a shelf if you have pets or small children.',
    petSafety: 'toxic', difficulty: 'Moderate', light: 'medium', water: 'medium',
    maintenance: 'Medium', growth: 'Fast', size: '60–150 cm',
    badges: ['statement', 'fastGrowing', 'airPurifying', 'petToxic'],
    care: {
      light: 'Bright indirect light. Direct sun bleaches the variegation.',
      water: 'Weekly. Keep lightly moist but never soggy.',
      soil: 'Rich, peat-based mix that holds a little moisture.',
      humidity: 'Likes it above 50%. Group with other plants or mist occasionally.',
      temperature: '18–27 °C. Keep away from cold draughts.',
      feed: 'Balanced feed every 3–4 weeks in spring and summer.',
      repot: 'Every 2 years in spring.',
    },
    tip: 'Wear gloves when pruning — the sap irritates skin and mouth.',
  },
  {
    id: 'p04', slug: 'friendship-plant', name: 'Friendship Plant', botanical: 'Pilea involucrata',
    category: 'indoor-plants', price: 399, mrp: 499, image: friendship,
    rating: 4.7, reviews: 141, stock: 32, featured: true,
    short: 'Quilted bronze leaves on a compact plant that begs to be shared.',
    description:
      'So easy to propagate that it is traditionally passed between friends — hence the name. The deeply textured leaves look almost hammered. Perfect for a desk, a shelf or a small bathroom.',
    petSafety: 'safe', difficulty: 'Easy', light: 'medium', water: 'medium',
    maintenance: 'Low', growth: 'Moderate', size: '15–30 cm',
    badges: ['beginner', 'petFriendly', 'lowMaintenance', 'fastGrowing'],
    care: {
      light: 'Bright indirect light. Tolerates a little shade.',
      water: 'Weekly. Keep evenly moist in summer, drier in winter.',
      soil: 'Light, well-draining mix with some peat or coco coir.',
      humidity: 'Enjoys humidity — a bathroom or kitchen suits it well.',
      temperature: '16–27 °C.',
      feed: 'Half-strength liquid feed monthly through the growing season.',
      repot: 'Annually in spring; take cuttings at the same time.',
    },
    tip: 'Pinch the growing tips to keep it bushy instead of leggy.',
  },
  {
    id: 'p05', slug: 'grape-ivy', name: 'Grape Ivy', botanical: 'Cissus rhombifolia',
    category: 'indoor-plants', price: 549, mrp: 699, image: grapeIvy,
    rating: 4.6, reviews: 88, stock: 22,
    short: 'A graceful trailing vine for shelves, baskets and stair rails.',
    description:
      'Grape Ivy climbs or cascades with equal enthusiasm, throwing out tendrils and glossy toothed leaflets. It is one of the few genuinely pet-safe trailing plants, and it copes with less light than most vines.',
    petSafety: 'safe', difficulty: 'Easy', light: 'medium', water: 'medium',
    maintenance: 'Low', growth: 'Fast', size: 'Trails to 1.8 m',
    badges: ['petFriendly', 'beginner', 'fastGrowing', 'airPurifying'],
    care: {
      light: 'Medium to bright indirect light. Avoid harsh direct sun.',
      water: 'Weekly. Let the top 3 cm dry between waterings.',
      soil: 'Standard potting mix with good drainage.',
      humidity: 'Average to high. Mist in dry months.',
      temperature: '16–26 °C.',
      feed: 'Monthly balanced feed from spring to early autumn.',
      repot: 'Every 2 years, or top-dress a large hanging basket.',
    },
    tip: 'Give it a moss pole and it will climb; leave it high and it will spill.',
  },
  {
    id: 'p06', slug: 'jade-plant', name: 'Jade Plant', botanical: 'Crassula ovata',
    category: 'succulents', price: 499, mrp: 649, image: jade,
    rating: 4.8, reviews: 264, stock: 45, bestSeller: true,
    short: 'A miniature tree of plump, coin-shaped leaves — the money plant of Vastu.',
    description:
      'Jade thickens into a woody little trunk over years and can outlive its owner. Traditionally kept near an entrance to invite prosperity. It wants sun, sharp drainage and to be left thoroughly alone between waterings.',
    petSafety: 'toxic', difficulty: 'Easy', light: 'high', water: 'low',
    maintenance: 'Low', growth: 'Slow', size: '30–90 cm',
    badges: ['beginner', 'lowMaintenance', 'droughtTolerant', 'vastu', 'brightLight', 'petToxic'],
    care: {
      light: 'At least 4 hours of bright light; some direct sun deepens the red leaf edges.',
      water: 'Every 2–3 weeks in summer, monthly in winter. Soak, then let it dry fully.',
      soil: 'Gritty succulent mix. Drainage matters more than richness.',
      humidity: 'Low humidity preferred.',
      temperature: '18–30 °C. Keep above 10 °C.',
      feed: 'Diluted succulent feed 2–3 times over summer.',
      repot: 'Every 3 years. A snug pot keeps it compact and stable.',
    },
    tip: 'Wrinkled leaves mean thirst. Yellow, mushy leaves mean you overdid it.',
  },
  {
    id: 'p07', slug: 'lucky-bamboo', name: 'Lucky Bamboo', botanical: 'Dracaena sanderiana',
    category: 'indoor-plants', price: 349, mrp: 449, image: luckyBamboo,
    rating: 4.6, reviews: 401, stock: 60, bestSeller: true,
    short: 'Grows in nothing but water and a handful of pebbles.',
    description:
      'Not a bamboo at all, but a Dracaena — which is why it lives happily in a vase of water on a desk. Arrangements are counted deliberately: three stalks for happiness, five for wealth, eight for growth.',
    petSafety: 'toxic', difficulty: 'Easy', light: 'low', water: 'high',
    maintenance: 'Very Low', growth: 'Slow', size: '20–90 cm',
    badges: ['beginner', 'lowLight', 'lowMaintenance', 'vastu', 'petToxic'],
    care: {
      light: 'Indirect light only. Direct sun scorches and yellows the stalks.',
      water: 'Keep roots submerged in 5 cm of water; change it every 2 weeks.',
      soil: 'Pebbles and water, or a well-draining mix if potted in soil.',
      humidity: 'Average room humidity.',
      temperature: '18–32 °C.',
      feed: 'A single drop of liquid feed every couple of months — no more.',
      repot: 'Move to a larger vase when the roots fill the base.',
    },
    tip: 'Use filtered or rested water. Fluoride in tap water browns the tips.',
  },
  {
    id: 'p08', slug: 'money-plant', name: 'Money Plant', botanical: 'Epipremnum aureum',
    category: 'air-purifying', price: 299, mrp: 399, image: moneyPlant,
    rating: 4.9, reviews: 528, stock: 80, featured: true, bestSeller: true,
    short: 'India\u2019s favourite houseplant. Grows in water, soil, sun or shade.',
    description:
      'The Money Plant is the reason a lot of people become plant people. It roots from a cutting in a glass of water, trails metres across a wall, and quietly filters formaldehyde and benzene from the air while doing it.',
    petSafety: 'toxic', difficulty: 'Easy', light: 'low', water: 'medium',
    maintenance: 'Very Low', growth: 'Fast', size: 'Trails to 3 m',
    badges: ['beginner', 'lowMaintenance', 'airPurifying', 'lowLight', 'fastGrowing', 'vastu', 'petToxic'],
    care: {
      light: 'Anything from low light to bright indirect. More light means more variegation.',
      water: 'Weekly. Let the top 3 cm dry out first.',
      soil: 'Any general potting mix — or plain water in a bottle.',
      humidity: 'Tolerates dry air well.',
      temperature: '15–30 °C.',
      feed: 'Monthly balanced feed in spring and summer.',
      repot: 'Every 1–2 years, or just take cuttings and start again.',
    },
    tip: 'Cut just below a node and root it in water — that is a free new plant in three weeks.',
  },
  {
    id: 'p09', slug: 'peace-lily', name: 'Peace Lily', botanical: 'Spathiphyllum wallisii',
    category: 'air-purifying', price: 649, mrp: 849, image: peaceLily,
    rating: 4.7, reviews: 356, stock: 35, featured: true,
    short: 'White sail-like blooms in a room with barely any light.',
    description:
      'One of the very few plants that flowers reliably indoors and in shade. It also tells you exactly when it is thirsty by drooping dramatically, then recovering within hours of a drink — which makes it unusually easy to read.',
    petSafety: 'toxic', difficulty: 'Easy', light: 'low', water: 'medium',
    maintenance: 'Low', growth: 'Moderate', size: '40–65 cm',
    badges: ['beginner', 'airPurifying', 'lowLight', 'flowering', 'petToxic'],
    care: {
      light: 'Low to medium indirect light. Direct sun burns the leaves.',
      water: 'Weekly. Keep lightly moist; it will droop to warn you.',
      soil: 'Rich, moisture-retentive potting mix.',
      humidity: 'Prefers above 50%. Mist or use a pebble tray.',
      temperature: '18–27 °C.',
      feed: 'Balanced feed every 6 weeks in spring and summer.',
      repot: 'Every 1–2 years in spring.',
    },
    tip: 'No flowers? It is almost always too dark. Move it nearer a window, not into the sun.',
  },
  {
    id: 'p10', slug: 'philodendron', name: 'Philodendron', botanical: 'Philodendron hederaceum',
    category: 'indoor-plants', price: 549, mrp: 699, image: philodendron,
    rating: 4.8, reviews: 219, stock: 38,
    short: 'Heart-shaped leaves on a vine that grows almost visibly.',
    description:
      'A forgiving, fast trailing plant with deep green heart-shaped leaves. It handles neglect, adapts to most light, and can be trained up a pole or left to spill from a high shelf.',
    petSafety: 'toxic', difficulty: 'Easy', light: 'medium', water: 'medium',
    maintenance: 'Low', growth: 'Fast', size: 'Trails to 2.5 m',
    badges: ['beginner', 'fastGrowing', 'airPurifying', 'lowLight', 'petToxic'],
    care: {
      light: 'Medium to bright indirect. Tolerates lower light with slower growth.',
      water: 'Weekly, once the top 3 cm is dry.',
      soil: 'Loose, well-draining aroid mix.',
      humidity: 'Average to high.',
      temperature: '18–29 °C.',
      feed: 'Monthly balanced feed in the growing season.',
      repot: 'Every 1–2 years.',
    },
    tip: 'Long gaps between leaves mean it wants brighter light.',
  },
  {
    id: 'p11', slug: 'rubber-plant', name: 'Rubber Plant', botanical: 'Ficus elastica',
    category: 'indoor-plants', price: 899, mrp: 1149, image: rubberPlant,
    rating: 4.7, reviews: 172, stock: 20, featured: true,
    short: 'Broad, lacquered burgundy-green leaves. A proper floor-standing statement.',
    description:
      'The Rubber Plant grows into a small indoor tree with thick, glossy leaves that catch the light. New growth unfurls from a striking red sheath. Give it a bright spot and consistency, and it will reward you for years.',
    petSafety: 'caution', difficulty: 'Moderate', light: 'medium', water: 'medium',
    maintenance: 'Medium', growth: 'Moderate', size: '90–200 cm',
    badges: ['statement', 'airPurifying', 'petCaution'],
    care: {
      light: 'Bright indirect light. A little morning sun is welcome.',
      water: 'Every 7–10 days. Let the top 5 cm dry between waterings.',
      soil: 'Well-draining mix with bark or perlite.',
      humidity: 'Average. Appreciates occasional misting.',
      temperature: '16–29 °C. Hates cold draughts.',
      feed: 'Balanced feed monthly from spring to early autumn.',
      repot: 'Every 2 years, moving up one pot size.',
    },
    tip: 'Leaves dropping from the bottom usually means overwatering, not underwatering.',
  },
  {
    id: 'p12', slug: 'spider-plant', name: 'Spider Plant', botanical: 'Chlorophytum comosum',
    category: 'air-purifying', price: 349, mrp: 449, image: spiderPlant,
    rating: 4.9, reviews: 447, stock: 70, bestSeller: true,
    short: 'Pet safe, air purifying, and it makes you free plants all summer.',
    description:
      'Arching striped leaves and long stems of baby plantlets that dangle like spiders. It is genuinely non-toxic to cats and dogs, tolerates almost any light, and propagates itself without being asked.',
    petSafety: 'safe', difficulty: 'Easy', light: 'medium', water: 'medium',
    maintenance: 'Very Low', growth: 'Fast', size: '30–45 cm',
    badges: ['beginner', 'petFriendly', 'airPurifying', 'lowMaintenance', 'fastGrowing'],
    care: {
      light: 'Bright indirect light, though it copes with less.',
      water: 'Weekly. Keep lightly moist in summer.',
      soil: 'Standard well-draining potting mix.',
      humidity: 'Average room humidity.',
      temperature: '13–27 °C.',
      feed: 'Monthly in spring and summer; skip winter.',
      repot: 'Annually — the thick roots fill a pot quickly.',
    },
    tip: 'Brown tips are usually fluoride in tap water. Leave water out overnight before using it.',
  },
  {
    id: 'p13', slug: 'staghorn-fern', name: 'Staghorn Fern', botanical: 'Platycerium bifurcatum',
    category: 'indoor-plants', price: 1299, mrp: 1649, image: staghorn,
    rating: 4.6, reviews: 63, stock: 12,
    short: 'A living sculpture that grows on a board instead of in a pot.',
    description:
      'An epiphyte, so in the wild it clings to trees rather than soil. Mounted on wood it becomes wall art with antler-shaped fronds. Unusual, pet safe, and a real conversation piece.',
    petSafety: 'safe', difficulty: 'Moderate', light: 'medium', water: 'medium',
    maintenance: 'Medium', growth: 'Slow', size: '45–90 cm spread',
    badges: ['petFriendly', 'statement'],
    care: {
      light: 'Bright indirect light. No direct afternoon sun.',
      water: 'Soak the mount in water for 10 minutes weekly, then let it drain fully.',
      soil: 'None — mount on wood with sphagnum moss, or use a very loose orchid mix.',
      humidity: 'High. Mist several times a week, or hang it in a bathroom.',
      temperature: '16–27 °C.',
      feed: 'Diluted feed once a month in spring and summer.',
      repot: 'Re-mount every 3–5 years as the shield fronds spread.',
    },
    tip: 'The flat brown shield fronds at the base are meant to look dead. Never remove them.',
  },
  {
    id: 'p14', slug: 'zz-plant', name: 'ZZ Plant', botanical: 'Zamioculcas zamiifolia',
    category: 'indoor-plants', price: 799, mrp: 999, image: zzPlant,
    rating: 4.9, reviews: 298, stock: 42, featured: true, bestSeller: true,
    short: 'Waxy, architectural and content in a dim corner for a month.',
    description:
      'The ZZ stores water in potato-like rhizomes underground, which is how it survives being forgotten. Its glossy leaves look almost artificial. If your room has no window and you travel often, this is the plant.',
    petSafety: 'toxic', difficulty: 'Easy', light: 'low', water: 'low',
    maintenance: 'Very Low', growth: 'Slow', size: '45–90 cm',
    badges: ['beginner', 'lowMaintenance', 'lowLight', 'droughtTolerant', 'airPurifying', 'petToxic'],
    care: {
      light: 'Low to bright indirect. Avoid direct sun.',
      water: 'Every 2–3 weeks. When unsure, wait another week.',
      soil: 'Well-draining mix with plenty of perlite.',
      humidity: 'Tolerates dry air completely.',
      temperature: '15–30 °C.',
      feed: 'Twice a year is plenty.',
      repot: 'Every 2–3 years, when rhizomes push at the pot wall.',
    },
    tip: 'Yellowing leaves on a ZZ almost always mean too much water.',
  },

  /* ------------------------------------------------------------ outdoor */
  {
    id: 'p15', slug: 'agave', name: 'Agave', botanical: 'Agave americana',
    category: 'succulents', price: 949, mrp: 1199, image: agave,
    rating: 4.5, reviews: 71, stock: 15,
    short: 'Blue-grey architecture for a hot terrace. Water it four times a year.',
    description:
      'A dramatic rosette of thick, spined, blue-grey leaves. Agave thrives on heat, sun and poor soil — the harsher the position, the better it looks. Superb in a large terracotta pot on a terrace.',
    petSafety: 'caution', difficulty: 'Easy', light: 'high', water: 'low',
    maintenance: 'Very Low', growth: 'Slow', size: '60–150 cm',
    badges: ['lowMaintenance', 'droughtTolerant', 'brightLight', 'statement', 'petCaution'],
    care: {
      light: 'Full direct sun, all day.',
      water: 'Monthly at most in summer; almost nothing in winter.',
      soil: 'Sharply draining sandy or gravelly mix.',
      humidity: 'Dry air preferred.',
      temperature: '15–40 °C. Shelter from prolonged wet cold.',
      feed: 'Not needed. Feeding only makes it soft.',
      repot: 'Every 3–4 years. Wear thick gloves — the spines are serious.',
    },
    tip: 'Trim the terminal spine tips if it sits anywhere near a walkway.',
  },
  {
    id: 'p16', slug: 'banana-plant', name: 'Banana Plant', botanical: 'Musa acuminata',
    category: 'outdoor-plants', price: 1099, mrp: 1399, image: banana,
    rating: 4.4, reviews: 58, stock: 14,
    short: 'Enormous paddle leaves that turn a balcony tropical in one season.',
    description:
      'Few plants change a space as fast. Given heat, water and feed, a banana throws out huge leaves through summer and can fruit in the right climate. Hungry and thirsty, but spectacular.',
    petSafety: 'safe', difficulty: 'Moderate', light: 'high', water: 'high',
    maintenance: 'High', growth: 'Fast', size: '1.5–3 m',
    badges: ['petFriendly', 'statement', 'fastGrowing', 'edible', 'brightLight'],
    care: {
      light: 'Full sun, at least 6 hours.',
      water: 'Frequently — every 2–3 days in summer. It is a heavy drinker.',
      soil: 'Rich, deep, moisture-retentive soil with plenty of compost.',
      humidity: 'High. Mist in dry heat.',
      temperature: '20–35 °C. Protect below 12 °C.',
      feed: 'High-potassium feed every 2 weeks through the growing season.',
      repot: 'Annually into a larger pot, or plant out in the ground.',
    },
    tip: 'Torn leaves are normal and natural — that is how they cope with wind.',
  },
  {
    id: 'p17', slug: 'croton', name: 'Croton', botanical: 'Codiaeum variegatum',
    category: 'outdoor-plants', price: 649, mrp: 849, image: croton,
    rating: 4.5, reviews: 112, stock: 26,
    short: 'Leaves painted in crimson, gold and green — colour without flowers.',
    description:
      'Croton foliage does the work of a flowering plant all year round. The brighter the light, the louder the colour. It sulks and drops leaves if moved often, so choose its spot and leave it there.',
    petSafety: 'toxic', difficulty: 'Moderate', light: 'high', water: 'medium',
    maintenance: 'Medium', growth: 'Moderate', size: '60–120 cm',
    badges: ['statement', 'brightLight', 'petToxic'],
    care: {
      light: 'Bright light with some direct sun. Shade dulls the colours to plain green.',
      water: 'Every 4–6 days. Keep evenly moist, never waterlogged.',
      soil: 'Rich, well-draining potting mix.',
      humidity: 'High. Mist regularly in dry months.',
      temperature: '18–30 °C. Very sensitive to cold and draughts.',
      feed: 'Balanced feed every 3 weeks in spring and summer.',
      repot: 'Every 2 years in spring.',
    },
    tip: 'Leaf drop after a move is normal. Keep conditions steady and it will releaf.',
  },
  {
    id: 'p18', slug: 'curry-leaf', name: 'Curry Leaf Plant', botanical: 'Murraya koenigii',
    category: 'outdoor-plants', price: 449, mrp: 599, image: curryLeaf,
    rating: 4.8, reviews: 386, stock: 55, bestSeller: true,
    short: 'Fresh kadi patta at arm\u2019s reach, all year.',
    description:
      'Nothing bought in a packet compares to a leaf picked a minute before it hits the pan. A curry leaf plant is happy in a large pot on a sunny balcony and will supply a household indefinitely.',
    petSafety: 'safe', difficulty: 'Easy', light: 'high', water: 'medium',
    maintenance: 'Low', growth: 'Moderate', size: '90–200 cm',
    badges: ['petFriendly', 'edible', 'beginner', 'fragrant', 'brightLight'],
    care: {
      light: 'Full sun to partial shade. At least 5 hours of direct sun.',
      water: 'Every 3–4 days in summer. Let the top layer dry between waterings.',
      soil: 'Well-draining loamy soil enriched with compost.',
      humidity: 'Average to high.',
      temperature: '18–35 °C. Bring under cover below 10 °C.',
      feed: 'Buttermilk or a nitrogen-rich organic feed monthly in the growing season.',
      repot: 'Every 2 years into a deeper pot — it roots downward.',
    },
    tip: 'Harvest whole sprigs rather than single leaves. It encourages bushier regrowth.',
  },
  {
    id: 'p19', slug: 'hibiscus', name: 'Hibiscus', botanical: 'Hibiscus rosa-sinensis',
    category: 'flowering-plants', price: 549, mrp: 699, image: hibiscus,
    rating: 4.7, reviews: 243, stock: 40, featured: true,
    short: 'Dinner-plate blooms, one after another, right through the warm months.',
    description:
      'Each flower lasts a single day, and the plant simply produces another. In full sun and with steady feeding a hibiscus will flower for months. A classic of Indian gardens and temple offerings alike.',
    petSafety: 'caution', difficulty: 'Moderate', light: 'high', water: 'high',
    maintenance: 'Medium', growth: 'Fast', size: '90–180 cm',
    badges: ['flowering', 'brightLight', 'fastGrowing', 'petCaution'],
    care: {
      light: 'Full sun — a minimum of 6 hours for good flowering.',
      water: 'Daily in peak summer; every 2–3 days otherwise. Never let it dry out fully.',
      soil: 'Rich, well-draining soil with plenty of organic matter.',
      humidity: 'Moderate to high.',
      temperature: '20–35 °C.',
      feed: 'High-potassium feed every 2 weeks while in bud and bloom.',
      repot: 'Annually in spring, pruning the roots lightly.',
    },
    tip: 'Buds dropping before opening is nearly always irregular watering.',
  },
  {
    id: 'p20', slug: 'jasmine', name: 'Jasmine (Mogra)', botanical: 'Jasminum sambac',
    category: 'flowering-plants', price: 499, mrp: 649, image: jasmine,
    rating: 4.9, reviews: 512, stock: 48, featured: true, bestSeller: true,
    short: 'The scent that fills a whole balcony after sunset.',
    description:
      'Mogra flowers open in the evening and perfume everything around them. Small, waxy and pure white against dark glossy leaves. Pet safe, deeply traditional, and worth growing for the fragrance alone.',
    petSafety: 'safe', difficulty: 'Moderate', light: 'high', water: 'medium',
    maintenance: 'Medium', growth: 'Moderate', size: '60–180 cm',
    badges: ['flowering', 'fragrant', 'petFriendly', 'brightLight'],
    care: {
      light: 'At least 5–6 hours of direct sun for heavy flowering.',
      water: 'Every 2–3 days. Keep evenly moist during the flowering season.',
      soil: 'Well-draining soil with compost and a little sand.',
      humidity: 'Moderate to high.',
      temperature: '18–35 °C.',
      feed: 'Phosphorus-rich feed fortnightly through spring and summer.',
      repot: 'Every 2 years; prune hard after the main flush to keep it flowering.',
    },
    tip: 'Prune back by a third after flowering. Blooms only form on new wood.',
  },
  {
    id: 'p21', slug: 'lemon-tree', name: 'Lemon Tree', botanical: 'Citrus aurantifolia',
    category: 'outdoor-plants', price: 1199, mrp: 1499, image: lemon,
    rating: 4.6, reviews: 164, stock: 18, featured: true,
    short: 'Fragrant blossom, then fruit you can actually pick.',
    description:
      'A potted lemon gives you scented white flowers, glossy evergreen leaves and real fruit on a balcony. It needs sun, sharp drainage and regular feeding, but few plants are as satisfying to harvest.',
    petSafety: 'toxic', difficulty: 'Moderate', light: 'high', water: 'medium',
    maintenance: 'Medium', growth: 'Moderate', size: '1–2.5 m',
    badges: ['edible', 'fragrant', 'flowering', 'brightLight', 'petToxic'],
    care: {
      light: 'Full sun, 6–8 hours. The more the better.',
      water: 'Every 2–3 days in summer. Let the top 5 cm dry; citrus hates wet feet.',
      soil: 'Free-draining citrus mix. Drainage holes are essential.',
      humidity: 'Moderate.',
      temperature: '15–35 °C. Shelter from frost.',
      feed: 'Dedicated citrus feed every 2 weeks from spring to autumn.',
      repot: 'Every 2–3 years in spring.',
    },
    tip: 'Yellow leaves with green veins mean it needs micronutrients — use a proper citrus feed.',
  },
  {
    id: 'p22', slug: 'marigold', name: 'Marigold', botanical: 'Tagetes erecta',
    category: 'flowering-plants', price: 249, mrp: 349, image: marigold,
    rating: 4.8, reviews: 421, stock: 90, bestSeller: true,
    short: 'Instant colour, and it keeps pests off everything nearby.',
    description:
      'Genda is the workhorse of the Indian garden — cheap, fast, endlessly cheerful, and useful. Planted beside vegetables its roots deter nematodes, and the flowers pull in pollinators.',
    petSafety: 'caution', difficulty: 'Easy', light: 'high', water: 'medium',
    maintenance: 'Low', growth: 'Fast', size: '30–90 cm',
    badges: ['beginner', 'flowering', 'fastGrowing', 'brightLight', 'petCaution'],
    care: {
      light: 'Full sun, 6 hours minimum.',
      water: 'Every 2 days. Water at the base, not over the flowers.',
      soil: 'Ordinary garden soil with decent drainage. Not fussy.',
      humidity: 'Average. Good airflow prevents mildew.',
      temperature: '18–32 °C.',
      feed: 'Light balanced feed every 3 weeks. Too much nitrogen gives leaves, not flowers.',
      repot: 'Grown as a seasonal annual — sow fresh each year.',
    },
    tip: 'Deadhead spent blooms twice a week and it will flower half again as long.',
  },
  {
    id: 'p23', slug: 'papaya', name: 'Papaya Plant', botanical: 'Carica papaya',
    category: 'outdoor-plants', price: 599, mrp: 799, image: papaya,
    rating: 4.4, reviews: 97, stock: 20,
    short: 'From seed to fruit in under a year, in a big enough pot.',
    description:
      'Papaya grows astonishingly fast — a single season takes it from seedling to a small tree with deeply lobed leaves. Give it heat, sun, depth and drainage, and it will fruit surprisingly quickly.',
    petSafety: 'safe', difficulty: 'Moderate', light: 'high', water: 'medium',
    maintenance: 'Medium', growth: 'Fast', size: '2–3 m',
    badges: ['petFriendly', 'edible', 'fastGrowing', 'brightLight'],
    care: {
      light: 'Full sun all day.',
      water: 'Every 2–3 days. Deep watering, but never standing water — the roots rot fast.',
      soil: 'Deep, rich, very well-draining soil on a mound.',
      humidity: 'Moderate to high.',
      temperature: '21–33 °C.',
      feed: 'Balanced feed monthly, increasing potassium as fruit sets.',
      repot: 'Start in a deep pot and plant out; it dislikes root disturbance.',
    },
    tip: 'Plant three or four seedlings and keep the strongest — you need a female or bisexual plant to fruit.',
  },
  {
    id: 'p24', slug: 'rose', name: 'Rose', botanical: 'Rosa damascena',
    category: 'flowering-plants', price: 699, mrp: 899, image: rose,
    rating: 4.7, reviews: 389, stock: 44, featured: true,
    short: 'The one everybody wants. Sun, feed, prune — and it repays all three.',
    description:
      'A rose asks more of you than anything else here, and gives more back. The Damask is grown for its perfume above all; it is the rose behind attar and rose water. Sun, airflow and honest pruning are the whole secret.',
    petSafety: 'safe', difficulty: 'Moderate', light: 'high', water: 'medium',
    maintenance: 'High', growth: 'Moderate', size: '90–150 cm',
    badges: ['flowering', 'fragrant', 'petFriendly', 'brightLight'],
    care: {
      light: 'Full sun, 6 hours minimum. Morning sun is best of all.',
      water: 'Every 2–3 days at the base. Wet leaves invite black spot.',
      soil: 'Rich loam with compost and sharp drainage.',
      humidity: 'Moderate. Good airflow matters more than humidity.',
      temperature: '15–30 °C.',
      feed: 'Rose feed every 3 weeks through the growing season; stop before winter.',
      repot: 'Every 2 years, with hard pruning at the same time.',
    },
    tip: 'Prune to an outward-facing bud. It opens the centre and halves your disease problems.',
  },
  {
    id: 'p25', slug: 'sunflower', name: 'Sunflower', botanical: 'Helianthus annuus',
    category: 'flowering-plants', price: 299, mrp: 399, image: sunflower,
    rating: 4.8, reviews: 208, stock: 65,
    short: 'The easiest big result in gardening — and completely pet safe.',
    description:
      'Plant a seed, and about seventy-five days later you have a flower head taller than a child. Sunflowers are the classic plant to grow with kids: fast, dramatic, non-toxic, and the seeds feed the birds afterwards.',
    petSafety: 'safe', difficulty: 'Easy', light: 'high', water: 'medium',
    maintenance: 'Low', growth: 'Fast', size: '1–2.5 m',
    badges: ['beginner', 'petFriendly', 'flowering', 'fastGrowing', 'brightLight'],
    care: {
      light: 'Full direct sun — the whole point of the plant.',
      water: 'Every 2 days. Deep watering encourages deep, stable roots.',
      soil: 'Ordinary well-draining soil. Tolerates poor ground.',
      humidity: 'Average.',
      temperature: '18–33 °C.',
      feed: 'Light feed monthly. Too much nitrogen gives a weak, floppy stem.',
      repot: 'Sown fresh each season; sow direct where it is to grow.',
    },
    tip: 'Stake anything over a metre before it flowers, not after it topples.',
  },
  {
    id: 'p26', slug: 'tulsi', name: 'Tulsi (Holy Basil)', botanical: 'Ocimum tenuiflorum',
    category: 'outdoor-plants', price: 199, mrp: 279, image: tulsi,
    rating: 4.9, reviews: 673, stock: 100, featured: true, bestSeller: true,
    short: 'Sacred, medicinal, pet safe, and the easiest plant in this catalogue.',
    description:
      'Tulsi sits at the centre of Indian households for good reason — it is medicinal, deeply fragrant, culturally significant, and almost impossible to fail with. A pot by the door repels mosquitoes and supplies leaves for tea year round.',
    petSafety: 'safe', difficulty: 'Easy', light: 'high', water: 'medium',
    maintenance: 'Very Low', growth: 'Fast', size: '30–60 cm',
    badges: ['beginner', 'petFriendly', 'edible', 'fragrant', 'lowMaintenance', 'vastu'],
    care: {
      light: 'Full sun, 4–6 hours minimum.',
      water: 'Every 2 days in summer. Let the surface dry slightly between waterings.',
      soil: 'Well-draining soil with compost.',
      humidity: 'Average to high.',
      temperature: '20–35 °C. Bring under shelter below 10 °C.',
      feed: 'Light organic feed monthly. It needs very little.',
      repot: 'Annually. Refresh or replace plants every 18 months for the best leaf.',
    },
    tip: 'Pinch off the flower spikes as they appear — flowering makes the leaves bitter and shortens the plant\u2019s life.',
  },

  /* -------------------------------------------------------- second wave */
  {
    id: 'p27', slug: 'monstera-deliciosa', name: 'Monstera Deliciosa', botanical: 'Monstera deliciosa',
    category: 'indoor-plants', price: 1149, mrp: 1449, image: monstera,
    rating: 4.9, reviews: 604, stock: 30, featured: true, bestSeller: true,
    short: 'The split-leaf icon. One plant and a room reads as designed.',
    description:
      'Monstera earns its fame: huge glossy leaves that develop their signature holes as the plant matures, and a growth rate that rewards you within weeks. Give it a moss pole and bright indirect light and it will climb for years.',
    petSafety: 'toxic', difficulty: 'Easy', light: 'medium', water: 'medium',
    maintenance: 'Low', growth: 'Fast', size: '1-2.5 m',
    badges: ['statement', 'beginner', 'fastGrowing', 'airPurifying', 'petToxic'],
    care: {
      light: 'Bright indirect light. Direct midday sun scorches the leaves.',
      water: 'Weekly. Let the top 5 cm dry out first.',
      soil: 'Chunky aroid mix - bark, perlite and coco chips.',
      humidity: 'Above 50% brings bigger leaves and more fenestration.',
      temperature: '18-30 C.',
      feed: 'Balanced feed monthly through spring and summer.',
      repot: 'Every 2 years, adding a taller moss pole each time.',
    },
    tip: 'No holes in the leaves yet? It is young, or it needs more light. Nothing is wrong.',
  },
  {
    id: 'p28', slug: 'fiddle-leaf-fig', name: 'Fiddle Leaf Fig', botanical: 'Ficus lyrata',
    category: 'indoor-plants', price: 1499, mrp: 1899, image: fiddleLeafFig,
    rating: 4.4, reviews: 218, stock: 16, featured: true,
    short: 'The designer favourite. Beautiful, and it has opinions.',
    description:
      'Enormous violin-shaped leaves on a straight trunk - nothing else looks like it. In return it demands consistency: one bright spot, one watering rhythm, no draughts. Move it around and it drops leaves to punish you.',
    petSafety: 'toxic', difficulty: 'Expert', light: 'high', water: 'medium',
    maintenance: 'High', growth: 'Moderate', size: '1-3 m',
    badges: ['statement', 'brightLight', 'petToxic'],
    care: {
      light: 'Bright indirect light with a few hours of gentle direct sun.',
      water: 'Every 7-10 days, thoroughly, once the top 5 cm is dry.',
      soil: 'Well-draining mix with bark and perlite.',
      humidity: 'Moderate to high. Mist or use a humidifier in dry months.',
      temperature: '18-29 C. Keep away from air conditioning and doorways.',
      feed: 'Balanced feed every 3 weeks in spring and summer.',
      repot: 'Every 2 years, one pot size up.',
    },
    tip: 'Pick its spot and leave it there. Almost every fiddle leaf problem starts with a move.',
  },
  {
    id: 'p29', slug: 'calathea', name: 'Calathea', botanical: 'Goeppertia insignis',
    category: 'indoor-plants', price: 749, mrp: 949, image: calathea,
    rating: 4.6, reviews: 176, stock: 28, featured: true,
    short: 'Painted leaves that fold up at night. Genuinely pet safe.',
    description:
      'Every leaf looks hand-painted, and they rise and fall with the light - which is why it is also called the prayer plant. One of the few truly striking houseplants that is completely safe around cats and dogs.',
    petSafety: 'safe', difficulty: 'Moderate', light: 'low', water: 'medium',
    maintenance: 'Medium', growth: 'Moderate', size: '40-70 cm',
    badges: ['petFriendly', 'lowLight', 'airPurifying', 'statement'],
    care: {
      light: 'Low to medium indirect light. Direct sun bleaches the pattern away.',
      water: 'Every 5-7 days. Keep evenly moist - it hates drying out completely.',
      soil: 'Moisture-retentive peat or coir-based mix.',
      humidity: 'High, above 60%. This is the one thing it will not compromise on.',
      temperature: '18-27 C.',
      feed: 'Half-strength feed monthly in the growing season.',
      repot: 'Every 2 years in spring.',
    },
    tip: 'Crispy brown edges mean dry air or hard water. Use filtered water and raise the humidity.',
  },
  {
    id: 'p30', slug: 'areca-palm', name: 'Areca Palm', botanical: 'Dypsis lutescens',
    category: 'air-purifying', price: 1299, mrp: 1649, image: arecaPalm,
    rating: 4.7, reviews: 289, stock: 22, bestSeller: true,
    short: 'A pet-safe indoor tree that humidifies the room while it works.',
    description:
      'Feathery arching fronds that soften a whole corner. The Areca is one of the highest-rated air purifiers in the NASA clean air study, releases moisture into dry indoor air, and is completely non-toxic to pets.',
    petSafety: 'safe', difficulty: 'Easy', light: 'medium', water: 'medium',
    maintenance: 'Low', growth: 'Moderate', size: '1.2-2.5 m',
    badges: ['petFriendly', 'airPurifying', 'statement', 'beginner'],
    care: {
      light: 'Bright indirect light. Some morning sun is fine.',
      water: 'Every 5-7 days. Keep lightly moist, never waterlogged.',
      soil: 'Free-draining sandy potting mix.',
      humidity: 'Moderate to high.',
      temperature: '18-30 C.',
      feed: 'Balanced feed monthly from spring to early autumn.',
      repot: 'Every 2-3 years. It prefers to be slightly snug.',
    },
    tip: 'Brown tips are usually fluoride or salts in tap water - flush the pot through every few months.',
  },
  {
    id: 'p31', slug: 'bird-of-paradise', name: 'Bird of Paradise', botanical: 'Strelitzia reginae',
    category: 'indoor-plants', price: 1699, mrp: 2099, image: birdOfParadise,
    rating: 4.6, reviews: 134, stock: 12,
    short: 'Banana-sized paddle leaves and, eventually, an extraordinary flower.',
    description:
      'The most architectural plant we sell. Broad upright leaves that turn a corner tropical, and with enough age and sun, the orange crane-shaped bloom that gives it its name. Wants light, space and patience.',
    petSafety: 'toxic', difficulty: 'Moderate', light: 'high', water: 'medium',
    maintenance: 'Medium', growth: 'Moderate', size: '1.5-2 m',
    badges: ['statement', 'brightLight', 'flowering', 'petToxic'],
    care: {
      light: 'The brightest spot you have. Several hours of direct sun.',
      water: 'Every 5-7 days in summer, less in winter.',
      soil: 'Rich, well-draining mix with compost.',
      humidity: 'Moderate.',
      temperature: '18-30 C.',
      feed: 'Balanced feed fortnightly through spring and summer.',
      repot: 'Every 2 years. Being pot-bound actually encourages flowering.',
    },
    tip: 'It rarely flowers before its fourth or fifth year, and only in strong light. That is normal.',
  },
  {
    id: 'p32', slug: 'string-of-pearls', name: 'String of Pearls', botanical: 'Curio rowleyanus',
    category: 'succulents', price: 649, mrp: 849, image: stringOfPearls,
    rating: 4.5, reviews: 197, stock: 24, featured: true,
    short: 'Strands of green beads spilling over a shelf edge.',
    description:
      'A trailing succulent whose spherical leaves store water, so it needs almost none from you. Grown high on a shelf the strands cascade a metre or more. Unusual, elegant and very low effort.',
    petSafety: 'toxic', difficulty: 'Moderate', light: 'high', water: 'low',
    maintenance: 'Low', growth: 'Moderate', size: 'Trails to 90 cm',
    badges: ['droughtTolerant', 'lowMaintenance', 'brightLight', 'statement', 'petToxic'],
    care: {
      light: 'Bright light with some direct morning sun.',
      water: 'Every 2-3 weeks. Soak, then let it dry out completely.',
      soil: 'Gritty cactus mix. Drainage is everything.',
      humidity: 'Low. Dislikes damp, still air.',
      temperature: '18-26 C.',
      feed: 'Weak succulent feed twice over summer.',
      repot: 'Every 2-3 years into a shallow pot.',
    },
    tip: 'Shrivelled pearls mean thirst; mushy, translucent pearls mean you watered too often.',
  },
  {
    id: 'p33', slug: 'cactus', name: 'Golden Barrel Cactus', botanical: 'Echinocactus grusonii',
    category: 'succulents', price: 399, mrp: 549, image: cactus,
    rating: 4.7, reviews: 253, stock: 50,
    short: 'Water it once a month and it will outlive your furniture.',
    description:
      'A compact ribbed cactus with golden spines, perfect on a sunny windowsill. It genuinely thrives on neglect - the single most common way to kill one is kindness with the watering can.',
    petSafety: 'caution', difficulty: 'Easy', light: 'high', water: 'low',
    maintenance: 'Very Low', growth: 'Slow', size: '15-40 cm',
    badges: ['beginner', 'lowMaintenance', 'droughtTolerant', 'brightLight', 'petCaution'],
    care: {
      light: 'Full direct sun, as much as you can give it.',
      water: 'Monthly in summer, almost never in winter.',
      soil: 'Sharp cactus mix with extra grit.',
      humidity: 'Low.',
      temperature: '15-35 C.',
      feed: 'Cactus feed once or twice over summer.',
      repot: 'Every 3-4 years. Use tongs and a folded newspaper.',
    },
    tip: 'Not toxic, but the spines are painful - keep it off low tables where pets and children pass.',
  },
  {
    id: 'p34', slug: 'boston-fern', name: 'Boston Fern', botanical: 'Nephrolepis exaltata',
    category: 'air-purifying', price: 549, mrp: 699, image: bostonFern,
    rating: 4.5, reviews: 162, stock: 30,
    short: 'Pet safe, a natural humidifier, and it loves your bathroom.',
    description:
      'Arching feathery fronds that look best spilling from a hanging basket. It filters formaldehyde from indoor air and puts moisture back into it - and it is entirely safe around cats and dogs.',
    petSafety: 'safe', difficulty: 'Moderate', light: 'medium', water: 'high',
    maintenance: 'Medium', growth: 'Moderate', size: '45-90 cm spread',
    badges: ['petFriendly', 'airPurifying', 'lowLight'],
    care: {
      light: 'Medium indirect light. No direct sun.',
      water: 'Every 3-4 days. The soil should never dry out completely.',
      soil: 'Peat-rich mix that holds moisture.',
      humidity: 'High. A bathroom is close to ideal.',
      temperature: '16-24 C.',
      feed: 'Half-strength feed monthly in spring and summer.',
      repot: 'Annually in spring; divide the crown to make more.',
    },
    tip: 'Dropping crispy fronds is a humidity problem, not a watering one. Mist daily or move it to the bathroom.',
  },
  {
    id: 'p35', slug: 'anthurium', name: 'Anthurium', botanical: 'Anthurium andraeanum',
    category: 'flowering-plants', price: 899, mrp: 1149, image: anthurium,
    rating: 4.7, reviews: 241, stock: 26, featured: true,
    short: 'Lacquered scarlet blooms that last for weeks, indoors, all year.',
    description:
      'Those glossy red hearts are not really flowers but modified leaves, which is why each one lasts six to eight weeks. In good light an Anthurium flowers almost continuously - very little else does that indoors.',
    petSafety: 'toxic', difficulty: 'Moderate', light: 'medium', water: 'medium',
    maintenance: 'Medium', growth: 'Moderate', size: '40-60 cm',
    badges: ['flowering', 'airPurifying', 'statement', 'petToxic'],
    care: {
      light: 'Bright indirect light. Too little light means leaves but no blooms.',
      water: 'Weekly. Let the top 3 cm dry between waterings.',
      soil: 'Chunky, airy orchid or aroid mix.',
      humidity: 'High, above 60%.',
      temperature: '18-29 C.',
      feed: 'High-phosphorus feed every 3 weeks while flowering.',
      repot: 'Every 2 years.',
    },
    tip: 'Green blooms instead of red usually mean too little light.',
  },
  {
    id: 'p36', slug: 'orchid', name: 'Phalaenopsis Orchid', botanical: 'Phalaenopsis hybrid',
    category: 'flowering-plants', price: 1099, mrp: 1399, image: orchid,
    rating: 4.6, reviews: 318, stock: 20, bestSeller: true,
    short: 'Three months of flowers from one watering a week. Pet safe.',
    description:
      'The most forgiving orchid there is, and the classic gift plant. Blooms hold for two to three months, and with a hard cut after flowering it will rebloom the following season. Completely non-toxic to pets.',
    petSafety: 'safe', difficulty: 'Moderate', light: 'medium', water: 'low',
    maintenance: 'Low', growth: 'Slow', size: '40-70 cm',
    badges: ['petFriendly', 'flowering', 'statement'],
    care: {
      light: 'Bright indirect light. An east window is perfect.',
      water: 'Once a week. Soak the bark, drain completely, never let it sit in water.',
      soil: 'Orchid bark only - ordinary potting soil will rot the roots.',
      humidity: 'Moderate to high.',
      temperature: '18-29 C. A 10 C night drop triggers reblooming.',
      feed: 'Weak orchid feed every second watering.',
      repot: 'Every 2 years, into fresh bark.',
    },
    tip: 'When the last flower drops, cut the spike back to the second node - that is what makes it rebloom.',
  },
  {
    id: 'p37', slug: 'bonsai', name: 'Ficus Bonsai', botanical: 'Ficus microcarpa',
    category: 'indoor-plants', price: 1899, mrp: 2399, image: bonsai,
    rating: 4.5, reviews: 108, stock: 10,
    short: 'A tree in miniature. A living project, not a purchase.',
    description:
      'A ficus bonsai is the most forgiving species to start with - it tolerates indoor light, recovers from mistakes and responds quickly to pruning. Expect to spend a few minutes a week on it. That is the point.',
    petSafety: 'toxic', difficulty: 'Expert', light: 'high', water: 'medium',
    maintenance: 'High', growth: 'Slow', size: '25-45 cm',
    badges: ['statement', 'brightLight', 'petToxic'],
    care: {
      light: 'The brightest indirect spot available, with some direct morning sun.',
      water: 'Every 2-3 days. The shallow tray dries fast - check it daily.',
      soil: 'Proper bonsai soil: akadama, pumice and lava rock.',
      humidity: 'Moderate to high. Stand it on a pebble tray.',
      temperature: '18-29 C. No cold draughts.',
      feed: 'Diluted feed fortnightly through the growing season.',
      repot: 'Every 2 years, trimming a third of the roots.',
    },
    tip: 'Ficus sap is a mild irritant and toxic to pets. Keep it on a shelf, not the floor.',
  },
  {
    id: 'p38', slug: 'lavender', name: 'Lavender', botanical: 'Lavandula angustifolia',
    category: 'flowering-plants', price: 499, mrp: 649, image: lavender,
    rating: 4.6, reviews: 274, stock: 38,
    short: 'Scent, colour, and every bee within half a kilometre.',
    description:
      'Silver foliage and purple spikes that perfume a balcony in the evening. Lavender wants exactly what most plants do not - poor gritty soil, full sun and very little water. Give it those and it thrives.',
    petSafety: 'caution', difficulty: 'Moderate', light: 'high', water: 'low',
    maintenance: 'Low', growth: 'Moderate', size: '40-80 cm',
    badges: ['flowering', 'fragrant', 'droughtTolerant', 'brightLight', 'petCaution'],
    care: {
      light: 'Full sun, at least 6 hours.',
      water: 'Every 7-10 days. Overwatering is the usual cause of death.',
      soil: 'Gritty, alkaline, sharply drained. Never rich or soggy.',
      humidity: 'Low. Good airflow prevents rot.',
      temperature: '15-30 C.',
      feed: 'None needed. Feeding gives soft growth and fewer flowers.',
      repot: 'Every 2 years, pruning by a third at the same time.',
    },
    tip: 'Contains linalool, which is mildly toxic to cats and dogs if eaten. Fine on a balcony, not on the floor indoors.',
  },
  {
    id: 'p39', slug: 'basil', name: 'Sweet Basil', botanical: 'Ocimum basilicum',
    category: 'outdoor-plants', price: 199, mrp: 279, image: basil,
    rating: 4.8, reviews: 431, stock: 80, bestSeller: true,
    short: 'Pet safe, endlessly useful, and it grows faster than you can cook.',
    description:
      'The most productive plant in this catalogue for the money. A single pot on a sunny sill supplies a kitchen all season, and the more you pick the bushier it gets. Completely safe around pets and children.',
    petSafety: 'safe', difficulty: 'Easy', light: 'high', water: 'high',
    maintenance: 'Low', growth: 'Fast', size: '30-50 cm',
    badges: ['beginner', 'petFriendly', 'edible', 'fragrant', 'fastGrowing', 'brightLight'],
    care: {
      light: 'Full sun, 5-6 hours minimum.',
      water: 'Every 1-2 days. Basil wilts dramatically when thirsty, then recovers.',
      soil: 'Rich, well-draining potting mix with compost.',
      humidity: 'Average.',
      temperature: '20-32 C. It dislikes anything below 12 C.',
      feed: 'Light nitrogen feed fortnightly.',
      repot: 'Grown as an annual - sow fresh each season.',
    },
    tip: 'Harvest from the top, just above a leaf pair, and pinch out flowers. Flowering ruins the flavour.',
  },
  {
    id: 'p40', slug: 'bougainvillea', name: 'Bougainvillea', botanical: 'Bougainvillea glabra',
    category: 'flowering-plants', price: 649, mrp: 849, image: bougainvillea,
    rating: 4.7, reviews: 205, stock: 32,
    short: 'A wall of magenta on a terrace that gets punishing sun.',
    description:
      'Nothing else gives this much colour for this little water. Bougainvillea flowers hardest when it is hot, dry and slightly neglected - a genuinely drought-tolerant plant for the harshest spot on your terrace.',
    petSafety: 'caution', difficulty: 'Easy', light: 'high', water: 'low',
    maintenance: 'Low', growth: 'Fast', size: '1-3 m',
    badges: ['flowering', 'droughtTolerant', 'fastGrowing', 'brightLight', 'petCaution'],
    care: {
      light: 'Full direct sun, 6+ hours. Shade means leaves and no colour.',
      water: 'Every 5-7 days. Letting it dry between waterings triggers flowering.',
      soil: 'Ordinary well-draining soil. It does not want richness.',
      humidity: 'Low to moderate.',
      temperature: '20-38 C.',
      feed: 'Low-nitrogen, high-potassium feed monthly in the growing season.',
      repot: 'Every 2-3 years. A snug pot means more flowers.',
    },
    tip: 'Too much water and feed gives a green bush with no colour. Treat it mean.',
  },
];

/* ------------------------------------------------------------------ helpers */

/** PLANTS holds the living stock. */
export const ALL_PLANTS = [...PLANTS, ...EXTRA_PLANTS];
export const CATALOGUE = [...ALL_PLANTS, ...MERCHANDISE];

export const getPlantBySlug = (slug) => CATALOGUE.find((p) => p.slug === slug);

export const getByCategory = (category) =>
  category ? CATALOGUE.filter((p) => p.category === category) : CATALOGUE;

/** How many products sit in a category — merchandise included. */
export const countInCategory = (slug) => CATALOGUE.filter((p) => p.category === slug).length;

export const getFeatured = () => ALL_PLANTS.filter((p) => p.featured);

export const getBestSellers = () => ALL_PLANTS.filter((p) => p.bestSeller);

export const getPetSafe = () => ALL_PLANTS.filter((p) => p.petSafety === 'safe');

export const getBeginnerFriendly = () => ALL_PLANTS.filter((p) => p.badges.includes('beginner'));

/** Related products: same category first, then anything sharing a badge. */
export const getRelated = (plant, limit = 4) => {
  const others = CATALOGUE.filter((p) => p.id !== plant.id);
  const sameCategory = others.filter((p) => p.category === plant.category);
  const sharedBadge = others.filter(
    (p) => !sameCategory.includes(p) && p.badges.some((b) => plant.badges.includes(b))
  );
  return [...sameCategory, ...sharedBadge].slice(0, limit);
};

export default PLANTS;
