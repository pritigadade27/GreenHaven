import seedMarigoldFront from '../assets/images/seeds/seed-marigold-front.jpg';
import seedSunflowerFront from '../assets/images/seeds/seed-sunflower-front.jpg';
import seedRoseFront from '../assets/images/seeds/seed-rose-front.jpg';
import seedHibiscusFront from '../assets/images/seeds/seed-hibiscus-front.jpg';
import seedJasmineFront from '../assets/images/seeds/seed-jasmine-front.jpg';
import seedTulsiFront from '../assets/images/seeds/seed-tulsi-front.jpg';
import seedCurryLeafFront from '../assets/images/seeds/seed-curry-leaf-front.jpg';
import seedLemonFront from '../assets/images/seeds/seed-lemon-front.jpg';
import seedPapayaFront from '../assets/images/seeds/seed-papaya-front.jpg';
import seedAgaveFront from '../assets/images/seeds/seed-agave-front.jpg';
import seedCrotonFront from '../assets/images/seeds/seed-croton-front.jpg';
import seedAloeVeraFront from '../assets/images/seeds/seed-aloe-vera-front.jpg';

import potTerracotta from '../assets/images/care/terracotta-set.jpg';
import potCeramic from '../assets/images/care/ceramic-planters.jpg';
import potSingle from '../assets/images/tools/pot.jpg';
import potStack from '../assets/images/tools/pots-2.jpg';
import potSet from '../assets/images/tools/pots-3.jpg';
import potTray from '../assets/images/tools/tray-1.jpg';
import potCage from '../assets/images/tools/cage-1.jpg';
import potHanging from '../assets/images/care/hanging-planter.jpg';
import potWindow from '../assets/images/care/window-box.jpg';
import potStand from '../assets/images/care/plant-stand.jpg';
import potConcrete from '../assets/images/care/concrete-planter.jpg';
import potSelfWater from '../assets/images/care/self-watering-pot.jpg';

import toolTrowel from '../assets/images/care/hand-tool-duo.jpg';
import toolFork from '../assets/images/tools/garden-fork.jpg';
import toolShears from '../assets/images/tools/pruning-shears.jpg';
import toolLoppers from '../assets/images/care/loppers.jpg';
import toolRake from '../assets/images/tools/leaf-rake.jpg';
import toolHoe from '../assets/images/tools/hoe.jpg';
import toolScissors from '../assets/images/tools/garden-scissors.jpg';
import toolWeeder from '../assets/images/tools/weed-puller.jpg';
import toolSet from '../assets/images/tools/tool-set-2.jpg';
import toolGloves from '../assets/images/tools/gloves-2.jpg';
import toolApron from '../assets/images/tools/garden-apron.jpg';
import toolBoots from '../assets/images/tools/gardening-boots.jpg';
import toolBelt from '../assets/images/tools/toolbelt.jpg';
import toolCan from '../assets/images/care/brass-watering-can.jpg';
import toolHose from '../assets/images/tools/garden-hose.jpg';
import toolBucket from '../assets/images/care/garden-bucket.jpg';
import toolCart from '../assets/images/care/garden-cart.jpg';
import toolBarrow from '../assets/images/tools/wheelbarrow.jpg';
import toolTwine from '../assets/images/tools/twine.jpg';
import toolLabels from '../assets/images/tools/plant-labels-1.jpg';
import toolDuo from '../assets/images/care/hand-tool-duo.jpg';

import careFertilizer from '../assets/images/care/organic-fertilizer.jpg';
import careLiquid from '../assets/images/care/liquid-feed.jpg';
import careMister from '../assets/images/care/neem-mister.jpg';
import careSpray from '../assets/images/tools/bottle-spray.jpg';
import carePotting from '../assets/images/care/potting-mix.jpg';
import careStarter from '../assets/images/care/seed-starter-tray.jpg';
import careGranular from '../assets/images/care/granular-feed.jpg';
import carePest from '../assets/images/care/pest-spray.jpg';
import careMeter from '../assets/images/care/moisture-meter.jpg';

const item = ({
  id, slug, name, subtitle, category, price, mrp, image,
  rating = 4.6, reviews = 40, stock = 60, short, description,
  badges = [], specs = {}, featured = false, bestSeller = false,
  pet = null, difficulty = null,
}) => ({
  id, slug, name,
  botanical: subtitle,
  category, price, mrp, image, rating, reviews, stock,
  short, description,
  petSafety: pet,
  difficulty,
  light: null,
  water: null,
  maintenance: '—',
  growth: '—',
  size: specs.size ?? '—',
  badges,
  specs,
  featured,
  bestSeller,
  isMerchandise: true,
});

const seed = (n) => item({ ...n, category: 'seeds', badges: ['edible', 'beginner', ...(n.badges ?? [])] });

const SEEDS = [
  seed({
    id: 's01', slug: 'marigold-seeds', name: 'Marigold Seeds', subtitle: 'African Crackerjack',
    price: 149, mrp: 199, image: seedMarigoldFront, rating: 4.8, reviews: 214, bestSeller: true,
    short: '50 seeds. Blooms in 50 days and keeps pests off everything nearby.',
    description: 'Our own open-pollinated Crackerjack marigold. Sow in June, deadhead through the season, and you will have colour into September. Planted beside vegetables the roots deter nematodes.',
    badges: ['flowering', 'fastGrowing'],
    specs: { 'Seed count': '50 seeds', 'Sowing depth': '6 mm', 'Spacing': '20–30 cm apart', 'Germination': '5–7 days at 21 °C', 'Days to bloom': '50 days', 'Sun': 'Full sun, 6 hrs', 'Soil': 'Any well-draining soil', 'Sow season': 'Jun – Sep', 'Viability': '2 years if kept cool and dry', 'Type': 'Non-GMO, open pollinated' },
  }),
  seed({
    id: 's02', slug: 'sunflower-seeds', name: 'Sunflower Seeds', subtitle: 'Golden Giant',
    price: 179, mrp: 229, image: seedSunflowerFront, rating: 4.9, reviews: 188, featured: true,
    short: '30 seeds. The easiest big result in gardening, and safe around pets.',
    description: 'Plant a seed and about seventy-five days later you have a flower head taller than a child. The classic thing to grow with children — fast, dramatic and completely non-toxic.',
    badges: ['flowering', 'petFriendly', 'fastGrowing'],
    specs: { 'Seed count': '30 seeds', 'Sowing depth': '20 mm', 'Spacing': '45 cm apart', 'Germination': '7–10 days at 20 °C', 'Days to bloom': '75 days', 'Sun': 'Full sun, 8 hrs', 'Soil': 'Deep soil, stake if over 1 m', 'Sow season': 'Feb – Jul', 'Viability': '3 years', 'Type': 'Non-GMO, open pollinated' },
  }),
  seed({
    id: 's03', slug: 'tulsi-seeds', name: 'Tulsi Seeds', subtitle: 'Krishna Holy Basil',
    price: 99, mrp: 149, image: seedTulsiFront, rating: 4.9, reviews: 342, bestSeller: true,
    short: '200 seeds. Germinates in ten days and grows almost anywhere.',
    description: 'Krishna tulsi, the darker-leaved variety, with a stronger clove note than Rama. Surface sow, keep warm, and you will be picking leaves for tea inside two months.',
    badges: ['fragrant', 'petFriendly', 'lowMaintenance'],
    specs: { 'Seed count': '200 seeds', 'Sowing depth': 'Surface — do not cover', 'Spacing': '25 cm apart', 'Germination': '8–12 days at 25 °C', 'First harvest': '50–60 days', 'Sun': 'Full sun, 4–6 hrs', 'Soil': 'Well-draining with compost', 'Sow season': 'All year in warm regions', 'Viability': '2 years', 'Type': 'Non-GMO, open pollinated' },
  }),
  seed({
    id: 's04', slug: 'jasmine-seeds', name: 'Jasmine Seeds', subtitle: 'Mogra Arabian',
    price: 229, mrp: 289, image: seedJasmineFront, rating: 4.7, reviews: 96,
    short: '25 seeds. The scent that fills a balcony after sunset.',
    description: 'Jasminum sambac from our own stock plants. Slower from seed than from cuttings, but the plants are stronger for it.',
    badges: ['flowering', 'fragrant', 'petFriendly'],
    specs: { 'Seed count': '25 seeds', 'Sowing depth': '5 mm', 'Spacing': '60 cm apart', 'Germination': '21–28 days at 25 °C', 'First flowers': 'Second season', 'Sun': '5–6 hrs direct', 'Soil': 'Compost-rich, free draining', 'Sow season': 'Mar – Jul', 'Viability': '1 year — sow fresh', 'Type': 'Non-GMO, open pollinated' },
  }),
  seed({
    id: 's05', slug: 'hibiscus-seeds', name: 'Hibiscus Seeds', subtitle: 'Scarlet Rosa',
    price: 199, mrp: 249, image: seedHibiscusFront, rating: 4.6, reviews: 74,
    short: '20 seeds. Soak overnight and they come up fast.',
    description: 'Scarlet Hibiscus rosa-sinensis. Nick the seed coat and soak for twelve hours before sowing — germination roughly doubles.',
    badges: ['flowering'],
    specs: { 'Seed count': '20 seeds', 'Sowing depth': '10 mm after a 12 hr soak', 'Spacing': '60 cm apart', 'Germination': '14–21 days at 25 °C', 'First flowers': '8–10 months', 'Sun': 'Full sun, 6 hrs', 'Soil': 'Rich and well draining', 'Sow season': 'Feb – Aug', 'Viability': '2 years', 'Type': 'Non-GMO, open pollinated' },
  }),
  seed({
    id: 's06', slug: 'rose-seeds', name: 'Rose Seeds', subtitle: 'Damask Heirloom',
    price: 299, mrp: 379, image: seedRoseFront, rating: 4.3, reviews: 51,
    short: '15 seeds. The perfume rose — patient work, extraordinary result.',
    description: 'Rosa damascena, the rose behind attar and rose water. Needs four weeks of cold stratification in the fridge before sowing. Not a beginner project, but nothing else smells like it.',
    badges: ['flowering', 'fragrant', 'petFriendly'],
    specs: { 'Seed count': '15 seeds', 'Sowing depth': '6 mm after 4 weeks chilling', 'Spacing': '45 cm apart', 'Germination': '30–60 days, uneven', 'First flowers': 'Second or third year', 'Sun': 'Morning sun preferred', 'Soil': 'Rich loam, sharp drainage', 'Sow season': 'Oct – Jan', 'Viability': '1 year', 'Type': 'Non-GMO, open pollinated' },
  }),
  seed({
    id: 's07', slug: 'curry-leaf-seeds', name: 'Curry Leaf Seeds', subtitle: 'Sweet Neem',
    price: 189, mrp: 239, image: seedCurryLeafFront, rating: 4.7, reviews: 163, featured: true,
    short: '20 seeds. Sow fresh — curry leaf seed loses viability fast.',
    description: 'Murraya koenigii, packed the same season it was collected because the seed does not keep. Sow within a month of arrival for the best strike rate.',
    badges: ['fragrant', 'petFriendly'],
    specs: { 'Seed count': '20 seeds', 'Sowing depth': '12 mm', 'Spacing': 'One per pot', 'Germination': '18–21 days at 25 °C', 'First harvest': '12–18 months', 'Sun': '5 hrs direct', 'Soil': 'Loamy with compost', 'Sow season': 'Mar – Aug', 'Viability': 'Weeks — sow immediately', 'Type': 'Non-GMO, open pollinated' },
  }),
  seed({
    id: 's08', slug: 'lemon-seeds', name: 'Lemon Seeds', subtitle: 'Kagzi Lime',
    price: 249, mrp: 299, image: seedLemonFront, rating: 4.4, reviews: 68,
    short: '12 seeds. Thin-skinned kagzi lime, the one worth growing.',
    description: 'Citrus aurantifolia. Sow fresh and keep warm. Seed-grown citrus takes several years to fruit, but the plants are hardier than grafted stock.',
    specs: { 'Seed count': '12 seeds', 'Sowing depth': '10 mm, sown fresh', 'Spacing': 'One per pot', 'Germination': '21–30 days at 25 °C', 'First fruit': '4–7 years from seed', 'Sun': '6–8 hrs direct', 'Soil': 'Citrus mix, never waterlogged', 'Sow season': 'Feb – Sep', 'Viability': 'Days once dried — sow at once', 'Type': 'Non-GMO, open pollinated' },
  }),
  seed({
    id: 's09', slug: 'papaya-seeds', name: 'Papaya Seeds', subtitle: 'Red Lady',
    price: 219, mrp: 279, image: seedPapayaFront, rating: 4.5, reviews: 87,
    short: '25 seeds. Fruit inside a year in a big enough pot.',
    description: 'Red Lady is the reliable choice for containers — compact, early fruiting and mostly bisexual, so you do not need to gamble on getting a female plant.',
    badges: ['petFriendly', 'fastGrowing'],
    specs: { 'Seed count': '25 seeds', 'Sowing depth': '10 mm', 'Spacing': '2 m apart', 'Germination': '14–21 days at 28 °C', 'First fruit': '9–11 months', 'Sun': 'Full sun all day', 'Soil': 'Deep, mounded, free draining', 'Sow season': 'Feb – Oct', 'Viability': '2 years', 'Type': 'Non-GMO, open pollinated' },
  }),
  seed({
    id: 's10', slug: 'aloe-vera-seeds', name: 'Aloe Vera Seeds', subtitle: 'Barbadensis Miller',
    price: 179, mrp: 229, image: seedAloeVeraFront, rating: 4.2, reviews: 44,
    short: '20 seeds. Surface sow on a sandy mix and be patient.',
    description: 'True Aloe barbadensis, the medicinal one. Slow from seed compared with offsets, but you get a much better root system.',
    badges: ['droughtTolerant'],
    specs: { 'Seed count': '20 seeds', 'Sowing depth': 'Surface on sandy mix', 'Spacing': '20 cm apart', 'Germination': '21–28 days at 24 °C', 'Mature size': '2–3 years', 'Sun': 'Bright, some direct', 'Soil': 'Cactus mix with extra grit', 'Sow season': 'Feb – Jun', 'Viability': '1 year', 'Type': 'Non-GMO, open pollinated' },
  }),
  seed({
    id: 's11', slug: 'agave-seeds', name: 'Agave Seeds', subtitle: 'Blue Century',
    price: 269, mrp: 329, image: seedAgaveFront, rating: 4.3, reviews: 38,
    short: '15 seeds. Architecture for a hot terrace, grown from scratch.',
    description: 'Agave americana. Surface sow on grit, keep barely moist, and give it the hottest brightest spot you have.',
    badges: ['droughtTolerant', 'statement'],
    specs: { 'Seed count': '15 seeds', 'Sowing depth': 'Surface on grit', 'Spacing': '60 cm apart', 'Germination': '14–21 days at 25 °C', 'Mature size': '5+ years', 'Sun': 'Full direct sun', 'Soil': 'Sharply drained sandy grit', 'Sow season': 'Mar – Jun', 'Viability': '2 years', 'Type': 'Non-GMO, open pollinated' },
  }),
  seed({
    id: 's12', slug: 'croton-seeds', name: 'Croton Seeds', subtitle: 'Petra Mix',
    price: 209, mrp: 259, image: seedCrotonFront, rating: 4.1, reviews: 33,
    short: '20 seeds. Needs real warmth — 25 °C or it will sulk.',
    description: 'A mixed Petra strain, so the leaf colouring varies plant to plant. Bottom heat makes the difference between a full tray and an empty one.',
    badges: ['statement'],
    specs: { 'Seed count': '20 seeds', 'Sowing depth': '5 mm', 'Spacing': 'One per pot', 'Germination': '21–28 days at 25 °C+', 'Full colour': '6–8 months', 'Sun': 'Bright light, some direct', 'Soil': 'Rich, free draining', 'Sow season': 'Mar – Aug', 'Viability': 'Weeks — sow fresh', 'Type': 'Non-GMO, open pollinated' },
  }),
];

const pot = (n) => item({ ...n, category: 'pots-planters' });

const POTS = [
  pot({
    id: 'm01', slug: 'terracotta-pot-set', name: 'Terracotta Pot Set', subtitle: 'Set of 5, graduated',
    price: 899, mrp: 1199, image: potTerracotta, rating: 4.8, reviews: 176, featured: true, bestSeller: true,
    short: 'Unglazed clay that breathes — the safest pot for anything you overwater.',
    description: 'Five graduated pots from 10 cm to 22 cm, each with a drainage hole and matching saucer. Unglazed terracotta wicks moisture out of the soil, which is why it forgives a heavy hand with the watering can.',
    badges: ['beginner'],
    specs: { Material: 'Unglazed terracotta', Sizes: '10, 13, 16, 19, 22 cm', Drainage: 'Hole and saucer included', Finish: 'Natural clay' },
  }),
  pot({
    id: 'm02', slug: 'ceramic-planter-trio', name: 'Ceramic Planter Trio', subtitle: 'Speckled stone glaze',
    price: 1499, mrp: 1899, image: potCeramic, rating: 4.7, reviews: 121, featured: true,
    short: 'Matte speckled glaze in three sizes. Made to be seen, not hidden.',
    description: 'Stoneware fired at high temperature with a soft speckled glaze. Heavy enough to hold a top-heavy plant upright, and the neutral finish sits with any interior.',
    badges: ['statement'],
    specs: { Material: 'Glazed stoneware', Sizes: '12, 16, 20 cm', Drainage: 'Hole with rubber plug', Finish: 'Matte speckle' },
  }),
  pot({
    id: 'm03', slug: 'classic-clay-pot', name: 'Classic Clay Pot', subtitle: '20 cm single',
    price: 249, mrp: 349, image: potSingle, rating: 4.6, reviews: 208,
    short: 'The plain terracotta pot. Cheap, breathable, endlessly useful.',
    description: 'One good 20 cm terracotta pot with a saucer. Nothing clever about it, which is the point.',
    specs: { Material: 'Unglazed terracotta', Size: '20 cm diameter', Drainage: 'Single hole', Saucer: 'Included' },
  }),
  pot({
    id: 'm04', slug: 'nursery-pot-stack', name: 'Nursery Pot Stack', subtitle: 'Pack of 10',
    price: 399, mrp: 549, image: potStack, rating: 4.5, reviews: 94,
    short: 'Ten lightweight grow pots for propagating and potting on.',
    description: 'Thin-walled 15 cm nursery pots with generous drainage. What we grow in ourselves before a plant moves into something decorative.',
    specs: { Material: 'Recycled polypropylene', Size: '15 cm', Quantity: '10 pots', Drainage: 'Six slots' },
  }),
  pot({
    id: 'm05', slug: 'stoneware-pot-collection', name: 'Stoneware Collection', subtitle: 'Mixed set of 4',
    price: 1799, mrp: 2199, image: potSet, rating: 4.7, reviews: 62,
    short: 'Four shapes, one glaze family. Buy once for a whole shelf.',
    description: 'A cylinder, a bowl, a tall taper and a footed pot, all in the same glaze so a mixed grouping still reads as deliberate.',
    badges: ['statement'],
    specs: { Material: 'Glazed stoneware', Quantity: '4 pots', Sizes: '11 – 21 cm', Drainage: 'Hole with plug' },
  }),
  pot({
    id: 'm06', slug: 'seedling-tray', name: 'Seedling Tray', subtitle: '24 cells with dome',
    price: 349, mrp: 449, image: potTray, rating: 4.6, reviews: 118,
    short: 'Twenty-four cells and a humidity dome. Where every seed packet ends up.',
    description: 'Deep 24-cell tray with a clear vented dome, a solid base tray and drainage in every cell. The dome comes off once the first true leaves appear.',
    badges: ['beginner'],
    specs: { Cells: '24', Depth: '5.5 cm', Includes: 'Base tray and vented dome', Material: 'BPA-free polypropylene' },
  }),
  pot({
    id: 'm07', slug: 'plant-support-cage', name: 'Plant Support Cage', subtitle: 'Set of 2',
    price: 549, mrp: 699, image: potCage, rating: 4.4, reviews: 57,
    short: 'For anything that flops before it flowers.',
    description: 'Powder-coated steel rings on three legs. Push them in early and the plant grows up through them, so the support disappears by midsummer.',
    specs: { Material: 'Powder-coated steel', Height: '90 cm', Quantity: '2 cages', Suits: 'Tomatoes, dahlias, peonies' },
  }),
  pot({
    id: 'm08', slug: 'hanging-planter', name: 'Hanging Planter', subtitle: 'Cotton macramé with pot',
    price: 749, mrp: 949, image: potHanging, rating: 4.7, reviews: 143, featured: true,
    short: 'Gets a trailing plant up where you can actually see it.',
    description: 'Hand-knotted cotton cord with a glazed inner pot and drip saucer. Rated to 4 kg, which is a large pothos with wet soil.',
    badges: ['statement'],
    specs: { Material: 'Cotton cord, glazed pot', 'Pot size': '16 cm', Drop: '90 cm', 'Load limit': '4 kg' },
  }),
  pot({
    id: 'm09', slug: 'window-box', name: 'Window Box', subtitle: '60 cm with brackets',
    price: 1199, mrp: 1499, image: potWindow, rating: 4.6, reviews: 87,
    short: 'Turns a windowsill or railing into a herb garden.',
    description: 'Sixty centimetres of planting on a balcony that has no floor space. Comes with adjustable railing brackets and a built-in drainage channel.',
    specs: { Length: '60 cm', Depth: '18 cm', Includes: 'Adjustable rail brackets', Drainage: 'Channel with plugs' },
  }),
  pot({
    id: 'm0a', slug: 'plant-stand', name: 'Plant Stand', subtitle: 'Solid wood, three tiers',
    price: 2299, mrp: 2899, image: potStand, rating: 4.7, reviews: 96, featured: true,
    short: 'Three tiers of plants in the floor space of one.',
    description: 'Solid rubberwood with a clear lacquer. Staggered tiers so the plants below still get light, which most plant stands get wrong.',
    badges: ['statement'],
    specs: { Material: 'Solid rubberwood', Tiers: '3', Height: '75 cm', Footprint: '40 × 30 cm' },
  }),
  pot({
    id: 'm0b', slug: 'concrete-planter', name: 'Concrete Planter', subtitle: 'Cast, 22 cm',
    price: 999, mrp: 1299, image: potConcrete, rating: 4.5, reviews: 74,
    short: 'Heavy enough that a top-heavy plant cannot tip it.',
    description: 'Cast concrete with a sealed interior. The weight is the feature — a tall dracaena or a fiddle leaf stays upright in it.',
    badges: ['statement'],
    specs: { Material: 'Sealed cast concrete', Diameter: '22 cm', Weight: '3.8 kg', Drainage: 'Hole with plug' },
  }),
  pot({
    id: 'm0c', slug: 'self-watering-pot', name: 'Self-Watering Pot', subtitle: '18 cm with reservoir',
    price: 849, mrp: 1099, image: potSelfWater, rating: 4.6, reviews: 158, bestSeller: true,
    short: 'A fortnight of water in the base. Made for people who travel.',
    description: 'A wicking reservoir holds about two weeks of water and a gauge shows the level, so the plant drinks what it needs instead of what you guessed.',
    badges: ['beginner'],
    specs: { Diameter: '18 cm', Reservoir: '1.2 litres', Indicator: 'Float gauge', Suits: 'Most houseplants except succulents' },
  }),
];

const tool = (n) => item({ ...n, category: 'gardening-tools' });

const TOOLS = [
  tool({
    id: 'm10', slug: 'garden-tool-set', name: 'Complete Garden Tool Set', subtitle: '10-piece with carry bag',
    price: 2499, mrp: 3199, image: toolSet, rating: 4.8, reviews: 246, featured: true, bestSeller: true,
    short: 'Everything for a first garden, in a bag that keeps it together.',
    description: 'Trowel, transplanter, cultivator, weeder, pruner, gloves, sprayer, twine and two markers in a waxed canvas tote. Every steel head is one piece with the tang, which is where cheap tools fail first.',
    badges: ['beginner', 'statement'],
    specs: { Pieces: '10', Heads: 'Stainless steel', Handles: 'Beech with rubber grip', Bag: 'Waxed canvas tote' },
  }),
  tool({
    id: 'm11', slug: 'hand-trowel', name: 'Hand Trowel', subtitle: 'Forged stainless',
    price: 449, mrp: 599, image: toolTrowel, rating: 4.7, reviews: 312, bestSeller: true,
    short: 'One forged piece from tip to tang. It will outlast the garden.',
    description: 'Stamped trowels bend at the neck within a season. This one is forged in a single piece, so there is nothing to work loose.',
    specs: { Head: 'Forged stainless steel', Handle: 'Ash, oiled', Length: '32 cm', Use: 'Planting and potting on' },
  }),
  tool({
    id: 'm12', slug: 'hand-tool-duo', name: 'Trowel & Fork Duo', subtitle: 'Matched pair',
    price: 749, mrp: 949, image: toolDuo, rating: 4.7, reviews: 141, featured: true,
    short: 'The two tools you actually reach for, in one purchase.',
    description: 'A planting trowel and a three-tine hand fork with the same forged construction and ash handles. Between them they cover almost everything a container garden needs.',
    specs: { Pieces: '2', Heads: 'Forged stainless steel', Handles: 'Ash, oiled', Length: '30 cm each' },
  }),
  tool({
    id: 'm13', slug: 'bypass-pruners', name: 'Bypass Pruners', subtitle: 'Precision cut',
    price: 899, mrp: 1149, image: toolShears, rating: 4.8, reviews: 189, featured: true,
    short: 'Bypass blades slice living wood instead of crushing it.',
    description: 'Two blades passing like scissors, which leaves a clean cut that heals. Anvil pruners crush the stem and invite disease — use those on deadwood only.',
    specs: { 'Cut type': 'Bypass', 'Max cut': '20 mm', Blade: 'Hardened carbon steel, replaceable', Lock: 'Thumb catch' },
  }),
  tool({
    id: 'm14', slug: 'garden-fork', name: 'Hand Fork', subtitle: 'Three-tine',
    price: 399, mrp: 499, image: toolFork, rating: 4.6, reviews: 134,
    short: 'For breaking crusted soil and lifting weeds whole.',
    description: 'Three forged tines set wide enough to get under a root ball without shredding it.',
    specs: { Head: 'Forged stainless steel', Handle: 'Ash, oiled', Length: '30 cm', Tines: '3' },
  }),
  tool({
    id: 'm15', slug: 'loppers', name: 'Long-Handle Loppers', subtitle: 'Geared, 45 mm cut',
    price: 1699, mrp: 2099, image: toolLoppers, rating: 4.6, reviews: 78,
    short: 'Reach into a shrub and take out a 45 mm branch without a saw.',
    description: 'Geared pivot multiplies your grip, so thick wood cuts with one hand-squeeze rather than three. Telescopic handles for the back of a border.',
    specs: { 'Max cut': '45 mm', Mechanism: 'Geared bypass', Handles: 'Telescopic aluminium', Length: '68 – 95 cm' },
  }),
  tool({
    id: 'm16', slug: 'garden-scissors', name: 'Garden Snips', subtitle: 'Precision tips',
    price: 349, mrp: 449, image: toolScissors, rating: 4.7, reviews: 226,
    short: 'For deadheading, harvesting herbs and tidying houseplants.',
    description: 'Narrow stainless tips that reach into a crowded plant without bruising the stems around it. The pair that lives on the potting bench.',
    badges: ['beginner'],
    specs: { Blade: 'Stainless steel', Length: '17 cm', Use: 'Deadheading and harvesting', Grip: 'Spring-loaded' },
  }),
  tool({
    id: 'm17', slug: 'leaf-rake', name: 'Leaf Rake', subtitle: 'Springy 22-tine',
    price: 799, mrp: 999, image: toolRake, rating: 4.5, reviews: 92,
    short: 'Flexible tines that gather leaves without scalping the lawn.',
    description: 'Twenty-two sprung steel tines on a light shaft. The flex is the point — a rigid rake tears turf.',
    specs: { Tines: '22, sprung steel', Width: '45 cm', Handle: 'Ash, 150 cm', Weight: '780 g' },
  }),
  tool({
    id: 'm18', slug: 'garden-hoe', name: 'Draw Hoe', subtitle: 'Forged head',
    price: 899, mrp: 1099, image: toolHoe, rating: 4.5, reviews: 64,
    short: 'Draw it through the top inch and weeds never get established.',
    description: 'A sharpened forged head on a long ash handle. Five minutes a week beats an hour of hand weeding a month later.',
    specs: { Head: 'Forged carbon steel', Width: '15 cm', Handle: 'Ash, 150 cm', Use: 'Weeding and drills' },
  }),
  tool({
    id: 'm19', slug: 'weed-puller', name: 'Weed Puller', subtitle: 'Long-handled root grab',
    price: 1199, mrp: 1499, image: toolWeeder, rating: 4.4, reviews: 71,
    short: 'Takes out a taproot standing up, without kneeling or bending.',
    description: 'Four claws bite either side of the crown and a foot pedal levers the whole root out. Dandelions come out entire, which is the only way they stay out.',
    specs: { Claws: '4, stainless', Handle: 'Steel, 100 cm', Action: 'Foot-pedal lever', Ejector: 'Thumb release' },
  }),
  tool({
    id: 'm20', slug: 'watering-can', name: 'Watering Can', subtitle: '5 litre with rose',
    price: 1299, mrp: 1599, image: toolCan, rating: 4.8, reviews: 197, featured: true,
    short: 'A long spout that reaches the back of a shelf, and a rose that does not drown seedlings.',
    description: 'Powder-coated steel with a detachable brass rose. The long spout is the part that matters — it gets water to the soil rather than over the leaves.',
    badges: ['beginner'],
    specs: { Capacity: '5 litres', Material: 'Powder-coated steel', Rose: 'Detachable brass', Spout: 'Long reach' },
  }),
  tool({
    id: 'm21', slug: 'garden-gloves', name: 'Garden Gloves', subtitle: 'Coated palm, breathable back',
    price: 449, mrp: 599, image: toolGloves, rating: 4.6, reviews: 284, bestSeller: true,
    short: 'Grippy where it matters, breathable everywhere else.',
    description: 'Nitrile-coated palm for wet soil and thorns, knitted back so your hands do not cook. Machine washable.',
    badges: ['beginner'],
    specs: { Palm: 'Nitrile coated', Back: 'Breathable knit', Sizes: 'S, M, L', Care: 'Machine washable' },
  }),
  tool({
    id: 'm22', slug: 'garden-apron', name: 'Garden Apron', subtitle: 'Waxed canvas, 6 pockets',
    price: 1499, mrp: 1899, image: toolApron, rating: 4.7, reviews: 88,
    short: 'Six pockets, cross-back straps, and it sheds water.',
    description: 'Waxed cotton canvas with cross-back straps that keep the weight off your neck. Pockets sized for snips, twine, labels and a phone.',
    specs: { Material: 'Waxed cotton canvas', Pockets: '6', Straps: 'Cross-back, adjustable', Length: '85 cm' },
  }),
  tool({
    id: 'm23', slug: 'gardening-boots', name: 'Gardening Boots', subtitle: 'Ankle height, pull-on',
    price: 1899, mrp: 2399, image: toolBoots, rating: 4.5, reviews: 76,
    short: 'On and off at the door without undoing anything.',
    description: 'Natural rubber uppers with a cotton lining and a deep-lug sole. Ankle height, so they come off with a heel and a push.',
    specs: { Upper: 'Natural rubber', Lining: 'Cotton', Sole: 'Deep lug', Sizes: 'UK 4 – 11' },
  }),
  tool({
    id: 'm24', slug: 'tool-belt', name: 'Garden Tool Roll', subtitle: 'Printed cotton, ties at the waist',
    price: 1299, mrp: 1599, image: toolBelt, rating: 4.4, reviews: 49,
    short: 'Ties round the waist and keeps the snips where you can reach them.',
    description: 'A printed cotton roll with four pockets and two loops, tied rather than buckled. Rolls up small enough to keep in a drawer.',
    specs: { Material: 'Printed cotton canvas', Pockets: '4 plus 2 loops', Fastening: 'Waist ties', Washable: 'Yes, cold wash' },
  }),
  tool({
    id: 'm25', slug: 'garden-hose', name: 'Garden Hose', subtitle: '15 m, kink resistant',
    price: 1799, mrp: 2299, image: toolHose, rating: 4.4, reviews: 103,
    short: 'Three layers so it does not fold shut halfway down the garden.',
    description: 'Fifteen metres of three-ply reinforced hose with brass fittings and a seven-pattern spray head.',
    specs: { Length: '15 m', Construction: '3-ply reinforced', Fittings: 'Brass', Nozzle: '7-pattern spray head' },
  }),
  tool({
    id: 'm26', slug: 'garden-bucket', name: 'Garden Bucket', subtitle: 'Galvanised, 12 litre',
    price: 599, mrp: 749, image: toolBucket, rating: 4.5, reviews: 87,
    short: 'Twelve litres of galvanised steel that will outlast plastic.',
    description: 'Dipped galvanised steel with a rolled rim and a swing handle. Carries water, weeds, compost or tools without splitting the way plastic does.',
    specs: { Capacity: '12 litres', Material: 'Galvanised steel', Rim: 'Rolled', Handle: 'Swing, riveted' },
  }),
  tool({
    id: 'm27', slug: 'garden-cart', name: 'Garden Cart', subtitle: 'Folding, 70 kg',
    price: 4499, mrp: 5499, image: toolCart, rating: 4.6, reviews: 58,
    short: 'Carries 70 kg and folds against a wall.',
    description: 'Steel frame with a heavy polyester bed and four puncture-proof wheels. Folds flat when the season is over.',
    specs: { Capacity: '70 kg', Frame: 'Powder-coated steel', Wheels: '4, puncture-proof', Folded: '18 cm deep' },
  }),
  tool({
    id: 'm28', slug: 'wheelbarrow', name: 'Wheelbarrow', subtitle: '85 litre steel tray',
    price: 5999, mrp: 7299, image: toolBarrow, rating: 4.7, reviews: 41,
    short: 'A proper barrow. Pneumatic tyre, steel tray, no plastic to crack.',
    description: 'Eighty-five litre galvanised tray on a tubular frame with a pneumatic tyre — the only kind that will cross a lawn with a full load.',
    specs: { Capacity: '85 litres', Tray: 'Galvanised steel', Tyre: 'Pneumatic', 'Load limit': '120 kg' },
  }),
  tool({
    id: 'm29', slug: 'garden-twine', name: 'Garden Twine', subtitle: 'Jute, 100 m',
    price: 199, mrp: 259, image: toolTwine, rating: 4.7, reviews: 219,
    short: 'Biodegradable jute. Tie it on and forget about it.',
    description: 'Three-ply natural jute in a dispenser tin. Strong enough for tomatoes, and it composts down with the plant at the end of the season.',
    badges: ['beginner'],
    specs: { Material: 'Natural jute, 3-ply', Length: '100 m', Dispenser: 'Tin with cutter', Compostable: 'Yes' },
  }),
  tool({
    id: 'm30', slug: 'plant-labels', name: 'Plant Labels', subtitle: 'Bamboo, pack of 50',
    price: 249, mrp: 329, image: toolLabels, rating: 4.6, reviews: 164,
    short: 'Fifty bamboo markers and a pencil that will still be legible in August.',
    description: 'Bamboo rather than plastic, and a graphite pencil rather than a marker — ink fades in sunlight within weeks, graphite does not.',
    badges: ['beginner'],
    specs: { Material: 'Bamboo', Quantity: '50 labels', Size: '15 × 2 cm', Includes: 'Graphite pencil' },
  }),
];

const care = (n) => item({ ...n, category: 'plant-care' });

const CARE = [
  care({
    id: 'm40', slug: 'organic-fertilizer', name: 'Organic Plant Food', subtitle: 'Slow release, 1 kg',
    price: 549, mrp: 699, image: careFertilizer, rating: 4.7, reviews: 203, featured: true, bestSeller: true,
    short: 'Feeds for three months from one application. Hard to overdo.',
    description: 'Pelleted organic feed that releases as the soil warms, so the plant gets nutrients when it is actually growing. Far more forgiving than a liquid — the commonest way to burn roots is a strong feed on dry soil.',
    badges: ['beginner'],
    specs: { Weight: '1 kg', NPK: '5-5-5 plus trace elements', Release: 'Up to 3 months', Suits: 'All container plants' },
  }),
  care({
    id: 'm41', slug: 'liquid-plant-feed', name: 'Liquid Plant Feed', subtitle: 'Concentrate, 500 ml',
    price: 399, mrp: 499, image: careLiquid, rating: 4.6, reviews: 158,
    short: 'A capful in the watering can, fortnightly through summer.',
    description: 'Balanced concentrate that dilutes 1:200. Always water first, then feed — feeding dry roots is what scorches them.',
    specs: { Volume: '500 ml concentrate', Dilution: '5 ml per litre', NPK: '6-3-6', Frequency: 'Fortnightly in growth' },
  }),
  care({
    id: 'm42', slug: 'neem-mister', name: 'Neem Oil Mister', subtitle: 'Ready to use, 500 ml',
    price: 449, mrp: 579, image: careMister, rating: 4.7, reviews: 241, featured: true,
    short: 'The first thing to reach for at the first sign of pests.',
    description: 'Cold-pressed neem in a fine mister, ready diluted. Handles aphids, spider mite, mealybug and scale. Spray at dusk — neem plus direct sun scorches leaves.',
    badges: ['beginner'],
    specs: { Volume: '500 ml', Active: 'Cold-pressed neem oil', Targets: 'Aphids, mite, mealybug, scale', Apply: 'Weekly at dusk' },
  }),
  care({
    id: 'm43', slug: 'spray-bottle', name: 'Misting Bottle', subtitle: 'Continuous spray, 700 ml',
    price: 349, mrp: 449, image: careSpray, rating: 4.5, reviews: 176,
    short: 'A fine continuous mist, not a jet that knocks leaves about.',
    description: 'Trigger pump that delivers a steady fine mist on the pull and the release. For raising humidity around calatheas and ferns without soaking the soil.',
    specs: { Capacity: '700 ml', Spray: 'Continuous fine mist', Material: 'PET with adjustable nozzle', Use: 'Humidity and foliar feed' },
  }),
  care({
    id: 'm44', slug: 'potting-mix', name: 'Premium Potting Mix', subtitle: '5 litre, peat-free',
    price: 449, mrp: 599, image: carePotting, rating: 4.8, reviews: 267, bestSeller: true,
    short: 'Peat-free, open-structured, and it drains the way roots need.',
    description: 'Coir, composted bark, perlite and worm castings. Open enough that water passes through instead of sitting — which is what kills more houseplants than anything else.',
    badges: ['beginner', 'petFriendly'],
    specs: { Volume: '5 litres', Base: 'Coir and composted bark', Added: 'Perlite, worm castings', Peat: 'Peat-free' },
  }),
  care({
    id: 'm45', slug: 'seed-starter-kit', name: 'Seed Starting Kit', subtitle: 'Tray, mix and labels',
    price: 799, mrp: 999, image: careStarter, rating: 4.6, reviews: 112, featured: true,
    short: 'Everything a seed packet needs, in one box.',
    description: 'A 24-cell tray with a humidity dome, two litres of fine seed compost, twenty bamboo labels and a pencil. Pair it with any of our seed packets.',
    badges: ['beginner'],
    specs: { Tray: '24 cells with dome', Compost: '2 litres fine seed mix', Labels: '20 bamboo plus pencil', Suits: 'All our seed range' },
  }),
];

CARE.push(
  care({
    id: 'm46', slug: 'granular-plant-food', name: 'Granular Plant Food', subtitle: 'Slow release, 900 g',
    price: 499, mrp: 649, image: careGranular, rating: 4.7, reviews: 164, featured: true,
    short: 'Scatter it on the surface once and forget it for three months.',
    description: 'Coated granules that release as the soil warms. Easier to get right than a liquid — there is no dilution to misjudge and no chance of scorching roots.',
    badges: ['beginner'],
    specs: { Weight: '900 g', NPK: '7-4-7 with trace elements', Release: '3 months', Apply: 'Top-dress in spring' },
  }),
  care({
    id: 'm47', slug: 'pest-spray', name: 'Pest Control Spray', subtitle: 'Ready to use, 750 ml',
    price: 429, mrp: 549, image: carePest, rating: 4.5, reviews: 132,
    short: 'For the infestation that neem alone is not clearing.',
    description: 'A potassium-salt contact spray that works on soft-bodied pests without a residue. Use it when neem has not been enough, and always at dusk.',
    specs: { Volume: '750 ml', Active: 'Potassium salts of fatty acids', Targets: 'Aphids, whitefly, mite, mealybug', Apply: 'Every 5 days until clear' },
  }),
  care({
    id: 'm48', slug: 'moisture-meter', name: 'Soil Moisture Meter', subtitle: 'No batteries',
    price: 349, mrp: 449, image: careMeter, rating: 4.6, reviews: 217, bestSeller: true,
    short: 'Settles the only argument that kills houseplants.',
    description: 'Push the probe to root depth and read it. Removes the guesswork that causes overwatering, which is the single commonest way a houseplant dies.',
    badges: ['beginner'],
    specs: { Probe: '20 cm stainless', Power: 'None required', Scale: 'Dry / Moist / Wet', Use: 'Read at root depth, not the surface' },
  }),
);

export const MERCHANDISE = [...SEEDS, ...POTS, ...TOOLS, ...CARE];

export default MERCHANDISE;
