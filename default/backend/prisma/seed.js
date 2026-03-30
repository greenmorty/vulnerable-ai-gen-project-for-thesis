/**
 * Responsibility: Seeds ShopSphere with realistic categories, products, users, orders, reviews, wishlists, and coupons for local development.
 */
const { createHash, randomUUID } = require("crypto");

const bcrypt = require("bcrypt");
const {
  AddressType,
  CouponType,
  InventoryMovementType,
  OrderStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  PrismaClient,
  ProductStatus,
  ReviewStatus,
  UserRole,
  UserStatus,
} = require("@prisma/client");

const prisma = new PrismaClient();

const SEED_VALUE = 20260330;
const CUSTOMER_PASSWORD = "ShopSphere123!";
const ADMIN_PASSWORD = "AdminSphere123!";
const VERIFIED_ORDER_STATUSES = new Set([
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
  OrderStatus.REFUNDED,
]);

const createRng = (seed) => {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const rng = createRng(SEED_VALUE);

const randomNumber = () => rng();
const randomInt = (min, max) => Math.floor(randomNumber() * (max - min + 1)) + min;
const chance = (probability) => randomNumber() < probability;
const pickOne = (items) => items[randomInt(0, items.length - 1)];
const roundCurrency = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const decimal = (value) => new Prisma.Decimal(roundCurrency(value).toFixed(2));
const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .replace(/-{2,}/g, "-");
const shuffle = (items) => {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
};
const pickUniqueItems = (items, count) => shuffle(items).slice(0, Math.min(count, items.length));
const sampleWeighted = (items, getWeight) => {
  const weightedTotal = items.reduce((sum, item) => sum + Math.max(getWeight(item), 0), 0);

  if (weightedTotal <= 0) {
    return items[0];
  }

  let cursor = randomNumber() * weightedTotal;

  for (const item of items) {
    cursor -= Math.max(getWeight(item), 0);

    if (cursor <= 0) {
      return item;
    }
  }

  return items[items.length - 1];
};
const randomDateBetween = (start, end) => {
  const startTime = start.getTime();
  const endTime = end.getTime();

  return new Date(startTime + randomNumber() * (endTime - startTime));
};
const shiftDate = (date, days = 0, minutes = 0) =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000 + minutes * 60 * 1000);
const hashCouponCode = (value) =>
  createHash("sha256").update(value.trim().toUpperCase()).digest("hex");
const maskCouponCode = (value) => {
  const normalized = value.trim().toUpperCase();

  if (normalized.length <= 4) {
    return normalized;
  }

  return `${normalized.slice(0, 4)}${"*".repeat(Math.max(normalized.length - 4, 2))}`;
};
const buildOrderNumber = (index) => `SS-20260330-${String(index + 1).padStart(4, "0")}`;
const formatProductCode = (value) => String(value).padStart(3, "0");
const formatPhone = (index) => `+1-555-${String(1200 + index).padStart(4, "0")}`;

const imageLibrary = {
  audio: [
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1518444065439-e933c06ce9cd?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1487215078519-e21cc028cb29?auto=format&fit=crop&w=1200&q=80",
  ],
  office: [
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
  ],
  smart: [
    "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1558089687-f282ffcbc0d4?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
  ],
  fitness: [
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1518310952931-b1de897abd40?auto=format&fit=crop&w=1200&q=80",
  ],
  kitchen: [
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1517414204284-5ce0f8e67fd9?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1517705008128-361805f42e86?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=1200&q=80",
  ],
};

const categories = [
  {
    name: "Audio & Headphones",
    slug: "audio-headphones",
    description: "Headphones, speakers, microphones, and listening gear for home, commuting, and creators.",
    skuPrefix: "AUD",
    imageKey: "audio",
    products: [
      {
        name: "Auralink Studio ANC Headphones",
        price: 249,
        shortDescription: "Wireless over-ear headphones with warm tuning, active noise cancellation, and a 40-hour battery.",
        description:
          "Auralink Studio ANC Headphones are tuned for long work sessions and cross-country flights. The padded headband, responsive touch controls, and reliable multipoint Bluetooth make them a dependable everyday pair.",
      },
      {
        name: "MeadowTone Open-Ear Runner",
        price: 129,
        shortDescription: "Featherweight open-ear headphones built for runners who still want awareness outdoors.",
        description:
          "MeadowTone Open-Ear Runner keeps playlists and turn-by-turn prompts clear without sealing off the outside world. The flexible frame stays put during tempo runs and charges fully in under two hours.",
      },
      {
        name: "HarborBeat Mini Bluetooth Speaker",
        price: 89,
        shortDescription: "Portable speaker with clear mids, rubberized edges, and enough power for a patio table.",
        description:
          "HarborBeat Mini Bluetooth Speaker is compact enough for a tote bag but sounds fuller than most travel speakers in its class. It is splash resistant, easy to pair, and lasts through long afternoons outside.",
      },
      {
        name: "Northstar USB-C Podcast Microphone",
        price: 159,
        shortDescription: "Cardioid desktop microphone for video calls, streaming, and starter podcast setups.",
        description:
          "Northstar USB-C Podcast Microphone offers clean vocal capture and simple plug-and-play setup for creators who want less desk clutter. A front-facing gain knob and built-in mute button make live sessions easier to manage.",
      },
      {
        name: "QuietLoop Sleep Earbuds",
        price: 99,
        shortDescription: "Low-profile sleep earbuds with soft silicone tips and gentle overnight audio presets.",
        description:
          "QuietLoop Sleep Earbuds are designed for side sleepers who want a calmer nighttime routine. The rounded housings reduce pressure on the ear and the battery comfortably handles a full night of playback.",
      },
      {
        name: "Meridian Belt-Drive Turntable",
        price: 319,
        shortDescription: "Walnut-finish turntable with preamp support and an upgrade-friendly cartridge mount.",
        description:
          "Meridian Belt-Drive Turntable brings a clean, understated look to a living-room listening setup. It has stable speed control, a quiet motor, and enough flexibility for both powered speakers and classic stereo receivers.",
      },
      {
        name: "EchoDock Desktop Speaker Set",
        price: 179,
        shortDescription: "Compact stereo speakers made for desks, game rooms, and small studio corners.",
        description:
          "EchoDock Desktop Speaker Set balances tight bass with clear vocals so meetings, playlists, and casual editing all sound better. The front volume dial and multiple inputs make switching sources simple.",
      },
      {
        name: "TransitTune Neckband Earphones",
        price: 69,
        shortDescription: "Flexible neckband earphones with quick controls and dependable all-day battery life.",
        description:
          "TransitTune Neckband Earphones are tuned for commuters who want something lighter than full headphones. The magnets keep the buds tidy between calls, and the inline controls are easy to use without looking down.",
      },
      {
        name: "PulseCast Streaming Microphone",
        price: 139,
        shortDescription: "USB streaming microphone with desktop stand, headphone monitoring, and warm vocal tone.",
        description:
          "PulseCast Streaming Microphone helps solo creators sound polished without learning complicated audio gear. It handles spoken voice especially well and ships with a compact stand that fits crowded desks.",
      },
      {
        name: "CedarSound Bookshelf Speakers",
        price: 269,
        shortDescription: "Powered bookshelf speakers with room-filling sound and a rich woodgrain cabinet finish.",
        description:
          "CedarSound Bookshelf Speakers deliver the kind of easy, balanced sound that works for vinyl, TV audio, and weekend playlists. Their cabinets look refined enough for living spaces instead of hiding in a media corner.",
      },
    ],
  },
  {
    name: "Home Office",
    slug: "home-office",
    description: "Desks, chairs, peripherals, and workspace upgrades for focused days at home.",
    skuPrefix: "OFF",
    imageKey: "office",
    products: [
      {
        name: "LedgerLift Standing Desk",
        price: 699,
        shortDescription: "Electric standing desk with memory presets, cable tray, and a sturdy oak-look top.",
        description:
          "LedgerLift Standing Desk gives home offices a cleaner footprint without sacrificing stability. The motor is smooth, the control pad is intuitive, and the frame feels planted even with a full dual-monitor setup.",
      },
      {
        name: "Cloudrest Ergonomic Chair",
        price: 459,
        shortDescription: "Breathable ergonomic chair with adjustable lumbar support and a generous recline range.",
        description:
          "Cloudrest Ergonomic Chair is built for people who spend real hours at a desk and notice the difference by late afternoon. The mesh back stays cool and the adjustable seat depth helps it fit a wider range of body types.",
      },
      {
        name: "FrameLine 4K Webcam",
        price: 149,
        shortDescription: "Sharp USB webcam with autofocus, privacy cover, and dependable low-light handling.",
        description:
          "FrameLine 4K Webcam upgrades video calls without turning your desk into a production set. It clips securely to monitors, locks focus quickly, and performs noticeably better than built-in laptop cameras.",
      },
      {
        name: "PaperTrail Desk Lamp",
        price: 79,
        shortDescription: "Slim LED desk lamp with warm-to-cool color modes and a low-glare reading profile.",
        description:
          "PaperTrail Desk Lamp adds useful task lighting without dominating a desk. The touch controls are simple, the base is compact, and the adjustable head makes it easy to aim light exactly where it is needed.",
      },
      {
        name: "CableCove Thunderbolt Dock",
        price: 229,
        shortDescription: "Multi-port docking station for laptops with dual-display support and front charging ports.",
        description:
          "CableCove Thunderbolt Dock is made for hybrid workers who want a cleaner desk and a single-cable routine. It handles monitors, storage, audio, and charging without the cable sprawl of separate adapters.",
      },
      {
        name: "FocusBoard Felt Desk Mat",
        price: 49,
        shortDescription: "Wool-blend desk mat that softens keyboard noise and keeps work surfaces tidy.",
        description:
          "FocusBoard Felt Desk Mat gives a workspace a quieter, warmer feel and helps keep mouse movement smooth. It is the kind of subtle upgrade that makes a desk look more considered and stay more organized.",
      },
      {
        name: "Atlas 27-inch Monitor Arm",
        price: 119,
        shortDescription: "Gas-spring monitor arm with clean cable routing and a wide range of movement.",
        description:
          "Atlas 27-inch Monitor Arm frees up desk space and makes it easier to dial in a comfortable screen height. The movement feels solid and smooth, with enough adjustment for sit-stand desks and shared workstations.",
      },
      {
        name: "NoteSmith Mechanical Keyboard",
        price: 139,
        shortDescription: "Compact wireless keyboard with tactile switches and a calm, office-friendly sound profile.",
        description:
          "NoteSmith Mechanical Keyboard blends the satisfying feel of mechanical switches with a layout that still works well for everyday office tasks. It connects quickly, looks refined, and does not overwhelm a room with noise.",
      },
      {
        name: "GlideTrack Wireless Mouse",
        price: 59,
        shortDescription: "Comfortable rechargeable mouse with quiet clicks and programmable side buttons.",
        description:
          "GlideTrack Wireless Mouse is tuned for long editing sessions and general productivity work. The shape supports the hand well, the scroll wheel is precise, and the battery lasts for weeks between charges.",
      },
      {
        name: "Stackwell Mobile Drawer Cabinet",
        price: 189,
        shortDescription: "Three-drawer rolling cabinet for papers, cables, and the small things that clutter desks.",
        description:
          "Stackwell Mobile Drawer Cabinet gives smaller offices flexible storage without feeling industrial or bulky. The top doubles as a landing spot for printers or notebooks, and the casters roll smoothly on hard floors.",
      },
    ],
  },
  {
    name: "Smart Home",
    slug: "smart-home",
    description: "Connected devices that make homes more efficient, secure, and comfortable.",
    skuPrefix: "SMT",
    imageKey: "smart",
    products: [
      {
        name: "HearthSense Smart Thermostat",
        price: 219,
        shortDescription: "Smart thermostat with occupancy sensing, room scheduling, and energy usage summaries.",
        description:
          "HearthSense Smart Thermostat helps households smooth out temperature swings while using less energy. The interface is straightforward, and the scheduling tools are helpful even for people new to smart-home gear.",
      },
      {
        name: "LumaPath Matter Bulb Pack",
        price: 69,
        shortDescription: "Four-pack of color smart bulbs with Matter support and scene presets for common rooms.",
        description:
          "LumaPath Matter Bulb Pack makes it easy to brighten living spaces, create routines, and keep setup simple across ecosystems. The bulbs respond quickly to app changes and hold color temperature well.",
      },
      {
        name: "GateWatch Video Doorbell",
        price: 179,
        shortDescription: "Battery-powered doorbell camera with two-way audio and package-zone monitoring.",
        description:
          "GateWatch Video Doorbell is built for homes that want a practical front-door view without a complicated install. The app alerts are timely, and the wide field of view captures visitors and package drops clearly.",
      },
      {
        name: "RainPoint Garden Irrigation Hub",
        price: 129,
        shortDescription: "Weather-aware watering controller for patio planters, raised beds, and small gardens.",
        description:
          "RainPoint Garden Irrigation Hub brings useful automation to outdoor watering without feeling overengineered. It is especially handy for households that travel often or want more consistency during hot weeks.",
      },
      {
        name: "EmberSafe Smart Smoke Alarm",
        price: 99,
        shortDescription: "Connected smoke and CO alarm with mobile alerts and easy hush controls.",
        description:
          "EmberSafe Smart Smoke Alarm delivers clearer notifications than traditional alarms and makes it easier to know which room needs attention. The app setup is quick, and the design looks clean on a ceiling.",
      },
      {
        name: "HavenView Indoor Security Camera",
        price: 89,
        shortDescription: "Indoor camera with privacy shutter, motion zones, and sharp night vision.",
        description:
          "HavenView Indoor Security Camera works well for entryways, nurseries, and pet check-ins. The physical privacy shutter is a thoughtful touch, and the video stream stays stable even on average home Wi-Fi.",
      },
      {
        name: "BreezeLink Air Quality Monitor",
        price: 149,
        shortDescription: "Desk-friendly monitor for CO2, humidity, and indoor comfort trends.",
        description:
          "BreezeLink Air Quality Monitor gives renters and homeowners a better sense of how a room is actually feeling throughout the day. It surfaces useful trends without burying the basics under too much app complexity.",
      },
      {
        name: "GlowScene Ambient Light Strip",
        price: 54,
        shortDescription: "Flexible smart light strip for media consoles, shelves, and headboards.",
        description:
          "GlowScene Ambient Light Strip is easy to cut, place, and fold around corners, making it a simple upgrade for rooms that need a little atmosphere. Scenes are easy to save and brightness transitions are smooth.",
      },
      {
        name: "SocketWise Smart Plug Duo",
        price: 39,
        shortDescription: "Dual-pack of compact smart plugs for lamps, fans, and timed household routines.",
        description:
          "SocketWise Smart Plug Duo keeps automation approachable for people who want a few routines without replacing major appliances. The housings stay narrow enough not to block neighboring wall outlets.",
      },
      {
        name: "AquaGuard Leak Sensor Kit",
        price: 119,
        shortDescription: "Water-leak sensor starter kit for sinks, laundry rooms, and water heater closets.",
        description:
          "AquaGuard Leak Sensor Kit is designed for the quiet places in a home where a small problem can turn expensive fast. Setup is quick, the sensors are discreet, and the alerts come through fast enough to be useful.",
      },
    ],
  },
  {
    name: "Fitness Tech",
    slug: "fitness-tech",
    description: "Wearables, recovery tools, and connected training gear for active routines.",
    skuPrefix: "FIT",
    imageKey: "fitness",
    products: [
      {
        name: "PacePilot GPS Running Watch",
        price: 279,
        shortDescription: "Training watch with dual-band GPS, interval workouts, and strong battery life.",
        description:
          "PacePilot GPS Running Watch is made for runners who want dependable route tracking without stepping up to an ultra-premium price tier. The training screens are easy to read mid-run and battery performance is strong.",
      },
      {
        name: "CoreForm Smart Scale",
        price: 109,
        shortDescription: "Connected scale with multi-user support, trend tracking, and a bright front display.",
        description:
          "CoreForm Smart Scale focuses on useful long-term trends instead of noisy day-to-day swings. It syncs quickly, works well for shared households, and looks polished enough to leave in a bathroom full time.",
      },
      {
        name: "FlexPulse Massage Gun",
        price: 169,
        shortDescription: "Quiet percussion massager with five attachments and enough power for daily recovery.",
        description:
          "FlexPulse Massage Gun makes post-workout recovery easier without sounding like a power tool. The grip is comfortable, the speed controls are simple, and the case keeps everything tidy between sessions.",
      },
      {
        name: "TrailSync Bone-Conduction Headphones",
        price: 119,
        shortDescription: "Workout headphones that stay secure while keeping ears open to traffic and teammates.",
        description:
          "TrailSync Bone-Conduction Headphones are ideal for outdoor runners, cyclists, and walkers who value awareness. They stay put during movement and offer clearer spoken prompts than many budget alternatives.",
      },
      {
        name: "ReviveRoll Recovery Boots",
        price: 429,
        shortDescription: "Compression recovery boots with adjustable zones and easy at-home setup.",
        description:
          "ReviveRoll Recovery Boots are built for athletes who want a premium recovery tool without booking time at a training studio. Inflation cycles feel consistent and the control unit is straightforward to use.",
      },
      {
        name: "MotionArc Smart Jump Rope",
        price: 79,
        shortDescription: "Weighted smart jump rope with app-based interval tracking and comfortable grips.",
        description:
          "MotionArc Smart Jump Rope makes quick conditioning sessions easier to structure and repeat. It counts reliably, stores easily in a gym bag, and feels balanced enough for longer sets.",
      },
      {
        name: "TempoBand Heart Rate Armband",
        price: 89,
        shortDescription: "Optical heart-rate monitor armband for rowing, lifting, cycling, and treadmill work.",
        description:
          "TempoBand Heart Rate Armband is a strong option for athletes who dislike chest straps but still want consistent tracking. It connects quickly to common fitness apps and feels secure without pinching.",
      },
      {
        name: "SurgeRide Indoor Cycling Sensor",
        price: 99,
        shortDescription: "Cadence and speed sensor kit for indoor bikes with simple app pairing.",
        description:
          "SurgeRide Indoor Cycling Sensor turns a basic spin setup into something much more measurable. It pairs quickly, stores rides cleanly, and makes structured workouts easier to follow at home.",
      },
      {
        name: "ElevateGrip Smart Kettlebell",
        price: 249,
        shortDescription: "Compact adjustable kettlebell with digital rep tracking and quick-change weight plates.",
        description:
          "ElevateGrip Smart Kettlebell fits smaller workout spaces without giving up versatility. The handle shape is comfortable, the weight changes are fast, and the connected tracking is helpful without being distracting.",
      },
      {
        name: "Zenith Yoga Mat Pro",
        price: 74,
        shortDescription: "Dense, grippy mat with alignment marks and enough cushion for daily floor work.",
        description:
          "Zenith Yoga Mat Pro stays grounded during flows, mobility work, and bodyweight training. The surface has a reassuring grip, and the mat rolls up neatly without keeping harsh curl marks at the edges.",
      },
    ],
  },
  {
    name: "Kitchen Essentials",
    slug: "kitchen-essentials",
    description: "Practical kitchen upgrades for coffee, prep work, and weeknight cooking.",
    skuPrefix: "KIT",
    imageKey: "kitchen",
    products: [
      {
        name: "ForgeBrew Precision Kettle",
        price: 129,
        shortDescription: "Gooseneck electric kettle with hold temperature mode for tea and pour-over coffee.",
        description:
          "ForgeBrew Precision Kettle is designed for people who actually notice the difference a controlled pour makes. The handle feels balanced, the temperature dial is responsive, and the finish looks refined on a counter.",
      },
      {
        name: "Millstone Burr Coffee Grinder",
        price: 189,
        shortDescription: "Stepped burr grinder with low retention and easy adjustments for home brewers.",
        description:
          "Millstone Burr Coffee Grinder delivers consistent grounds for drip coffee, French press, and everyday espresso experiments. It is a tidy, dependable upgrade for anyone who has outgrown blade grinders.",
      },
      {
        name: "CrispWave Air Fryer Oven",
        price: 239,
        shortDescription: "Countertop air fryer oven with roomy interior and useful presets for weeknight meals.",
        description:
          "CrispWave Air Fryer Oven handles vegetables, toast, leftovers, and sheet-pan dinners without taking over the kitchen. The controls are clear and the cooking results are reliably even for the price.",
      },
      {
        name: "PantrySense Vacuum Sealer",
        price: 109,
        shortDescription: "Counter-friendly vacuum sealer for batch cooking, sous vide prep, and freezer storage.",
        description:
          "PantrySense Vacuum Sealer is compact enough for apartment kitchens but still strong enough for regular meal prep. The controls are simple and the seal quality is consistent across dry and slightly moist foods.",
      },
      {
        name: "Castline Dutch Oven",
        price: 149,
        shortDescription: "Enameled Dutch oven for soups, braises, and weekend bread projects.",
        description:
          "Castline Dutch Oven is the kind of versatile pot that earns a permanent spot on the stove. It retains heat well, cleans up more easily than expected, and looks good enough to serve from at the table.",
      },
      {
        name: "SliceCraft Chef Knife",
        price: 119,
        shortDescription: "Eight-inch chef knife with balanced weight and a comfortable everyday handle.",
        description:
          "SliceCraft Chef Knife is shaped for cooks who want one reliable blade for weeknight prep instead of a crowded knife block. It feels nimble in hand and arrives sharp enough to notice immediately.",
      },
      {
        name: "WillowServe Ceramic Cookware Set",
        price: 259,
        shortDescription: "Ten-piece ceramic cookware set with sturdy handles and easy-clean surfaces.",
        description:
          "WillowServe Ceramic Cookware Set brings together the pieces most households actually reach for instead of filler pans that stay in a cabinet. The finish looks polished and the surfaces release food with minimal fuss.",
      },
      {
        name: "ColdPress Citrus Juicer",
        price: 69,
        shortDescription: "Compact electric citrus juicer for morning orange juice and cocktail prep.",
        description:
          "ColdPress Citrus Juicer is small enough to keep near a coffee setup without crowding a counter. It is quick to rinse, stores neatly, and makes fresh juice feel realistic on regular mornings.",
      },
      {
        name: "EmberMug Travel Tumbler",
        price: 99,
        shortDescription: "Insulated travel tumbler with app-controlled temperature and leak-resistant lid.",
        description:
          "EmberMug Travel Tumbler is made for commuters and home-office workers who never seem to finish coffee while it is still warm. The temperature hold is genuinely useful and the lid feels secure on the move.",
      },
      {
        name: "Oak & Iron Bread Maker",
        price: 199,
        shortDescription: "Quiet bread maker with sourdough cycle, delay timer, and sturdy viewing window.",
        description:
          "Oak & Iron Bread Maker brings a bit of ritual back to busy kitchens without making homemade bread feel like a weekend-only project. It is easy to schedule overnight doughs and straightforward to clean after baking.",
      },
    ],
  },
];

const users = [
  {
    firstName: "Maya",
    lastName: "Bennett",
    email: "maya.bennett@shopsphere.dev",
    role: UserRole.ADMIN,
    city: "Chicago",
    state: "IL",
    postalCode: "60611",
    line1: "145 W Huron St Apt 9B",
  },
  {
    firstName: "Daniel",
    lastName: "Cho",
    email: "daniel.cho@example.com",
    city: "Seattle",
    state: "WA",
    postalCode: "98109",
    line1: "218 Mercer St Apt 504",
  },
  {
    firstName: "Priya",
    lastName: "Shah",
    email: "priya.shah@example.com",
    city: "Austin",
    state: "TX",
    postalCode: "78704",
    line1: "605 Barton Springs Rd Apt 221",
  },
  {
    firstName: "Marcus",
    lastName: "Alvarez",
    email: "marcus.alvarez@example.com",
    city: "Denver",
    state: "CO",
    postalCode: "80206",
    line1: "1180 Josephine St Unit 3",
  },
  {
    firstName: "Elena",
    lastName: "Petrova",
    email: "elena.petrova@example.com",
    city: "Boston",
    state: "MA",
    postalCode: "02116",
    line1: "44 Clarendon St Apt 2A",
  },
  {
    firstName: "Jordan",
    lastName: "Reed",
    email: "jordan.reed@example.com",
    city: "Atlanta",
    state: "GA",
    postalCode: "30308",
    line1: "782 Juniper St NE Apt 16",
  },
  {
    firstName: "Ava",
    lastName: "Thompson",
    email: "ava.thompson@example.com",
    city: "Nashville",
    state: "TN",
    postalCode: "37212",
    line1: "2317 Elliston Pl Apt 6",
  },
  {
    firstName: "Noah",
    lastName: "Kim",
    email: "noah.kim@example.com",
    city: "San Diego",
    state: "CA",
    postalCode: "92101",
    line1: "777 Front St Apt 1120",
  },
  {
    firstName: "Leila",
    lastName: "Hassan",
    email: "leila.hassan@example.com",
    city: "Portland",
    state: "OR",
    postalCode: "97209",
    line1: "1025 NW Glisan St Apt 414",
  },
  {
    firstName: "Connor",
    lastName: "Walsh",
    email: "connor.walsh@example.com",
    city: "Minneapolis",
    state: "MN",
    postalCode: "55403",
    line1: "908 Hennepin Ave S Apt 7C",
  },
  {
    firstName: "Sofia",
    lastName: "Martinez",
    email: "sofia.martinez@example.com",
    city: "Miami",
    state: "FL",
    postalCode: "33137",
    line1: "3540 NE 5th Ave Apt 1204",
  },
  {
    firstName: "Ethan",
    lastName: "Brooks",
    email: "ethan.brooks@example.com",
    city: "Charlotte",
    state: "NC",
    postalCode: "28203",
    line1: "1621 Camden Rd Unit 14",
  },
  {
    firstName: "Nina",
    lastName: "Rossi",
    email: "nina.rossi@example.com",
    city: "Philadelphia",
    state: "PA",
    postalCode: "19103",
    line1: "1910 Chestnut St Apt 811",
  },
  {
    firstName: "Owen",
    lastName: "Davis",
    email: "owen.davis@example.com",
    city: "Phoenix",
    state: "AZ",
    postalCode: "85004",
    line1: "505 E Roosevelt St Apt 324",
  },
  {
    firstName: "Harper",
    lastName: "Nguyen",
    email: "harper.nguyen@example.com",
    city: "San Jose",
    state: "CA",
    postalCode: "95113",
    line1: "88 E San Fernando St Apt 614",
  },
  {
    firstName: "Miles",
    lastName: "Foster",
    email: "miles.foster@example.com",
    city: "Brooklyn",
    state: "NY",
    postalCode: "11201",
    line1: "301 Dean St Apt 5F",
  },
  {
    firstName: "Chloe",
    lastName: "Sullivan",
    email: "chloe.sullivan@example.com",
    city: "Salt Lake City",
    state: "UT",
    postalCode: "84111",
    line1: "355 S 300 E Apt 9",
  },
  {
    firstName: "Leo",
    lastName: "Parker",
    email: "leo.parker@example.com",
    city: "Raleigh",
    state: "NC",
    postalCode: "27603",
    line1: "118 E Martin St Apt 18",
  },
  {
    firstName: "Grace",
    lastName: "Chen",
    email: "grace.chen@example.com",
    city: "Irvine",
    state: "CA",
    postalCode: "92614",
    line1: "2045 Main St Apt 702",
  },
  {
    firstName: "Julian",
    lastName: "Price",
    email: "julian.price@example.com",
    city: "Washington",
    state: "DC",
    postalCode: "20009",
    line1: "1724 Columbia Rd NW Apt 3A",
  },
];

const couponDefinitions = [
  {
    code: "WELCOME10",
    description: "10% off your first order over $50.",
    type: CouponType.PERCENTAGE,
    value: 10,
    minOrderAmount: 50,
    maxDiscountAmount: 60,
    usageLimit: 150,
  },
  {
    code: "DESK25",
    description: "$25 off workspace orders over $200.",
    type: CouponType.FIXED_AMOUNT,
    value: 25,
    minOrderAmount: 200,
    maxDiscountAmount: null,
    usageLimit: 80,
  },
  {
    code: "AUDIO15",
    description: "15% off audio gear when your cart reaches $150.",
    type: CouponType.PERCENTAGE,
    value: 15,
    minOrderAmount: 150,
    maxDiscountAmount: 75,
    usageLimit: 100,
  },
  {
    code: "MOVE20",
    description: "20% off fitness technology over $180.",
    type: CouponType.PERCENTAGE,
    value: 20,
    minOrderAmount: 180,
    maxDiscountAmount: 90,
    usageLimit: 90,
  },
  {
    code: "KITCHEN30",
    description: "$30 off kitchen essentials over $220.",
    type: CouponType.FIXED_AMOUNT,
    value: 30,
    minOrderAmount: 220,
    maxDiscountAmount: null,
    usageLimit: 75,
  },
];

const orderStatusPlan = shuffle([
  ...Array(84).fill(OrderStatus.DELIVERED),
  ...Array(28).fill(OrderStatus.SHIPPED),
  ...Array(18).fill(OrderStatus.PROCESSING),
  ...Array(22).fill(OrderStatus.PAID),
  ...Array(16).fill(OrderStatus.PENDING),
  ...Array(12).fill(OrderStatus.PAYMENT_FAILED),
  ...Array(10).fill(OrderStatus.CANCELLED),
  ...Array(10).fill(OrderStatus.REFUNDED),
]);

const reviewTitleByRating = {
  5: ["Exceeded expectations", "Daily favorite", "Easy recommendation", "Worth every dollar"],
  4: ["Strong overall pick", "Very happy with it", "Solid buy", "A dependable upgrade"],
  3: ["Good with a few tradeoffs", "Mostly works for me", "Fine but not perfect", "Decent overall"],
  2: ["Needs more polish", "I expected better", "Mixed experience", "Not quite there"],
  1: ["Would not buy again", "Disappointing in practice", "Missed the mark", "Too many issues"],
};

const reviewBodyByRating = {
  5: [
    "has been excellent in daily use. The setup was quick, the build feels premium, and performance has stayed consistent week after week.",
    "fits naturally into my routine. It feels thoughtfully designed and has held up better than I expected for something I use this often.",
    "has turned into one of those purchases I notice every single day. It feels refined, reliable, and easy to recommend without caveats.",
  ],
  4: [
    "does most things well and feels nicely finished. I took off one star because there is still a small learning curve, but I would gladly buy it again.",
    "has been a strong upgrade overall. The core experience is really good, though I wish a couple of the smaller details were more polished.",
    "performs well and feels sturdy enough for regular use. It is not flawless, but the strengths clearly outweigh the tradeoffs for me.",
  ],
  3: [
    "gets the job done, but it does not feel quite as polished as I hoped. The basics are there, though a few rough edges show up in regular use.",
    "lands in the middle for me. I like some parts of the design, but the overall experience has been more mixed than the price suggested.",
    "works fine once it is set up, but I have run into enough small annoyances that I cannot rate it higher right now.",
  ],
  2: [
    "looked promising, but everyday use has been inconsistent. I can see what it was aiming for, yet the final experience still feels unfinished.",
    "has a couple of bright spots, but the overall execution has been frustrating. I expected a smoother experience at this price point.",
    "did not hold up as well as I hoped in regular use. It needs better tuning and a more refined user experience to feel worth it.",
  ],
  1: [
    "has been disappointing from the start. Performance was unreliable and it never felt like it justified the price.",
    "missed the mark for me. I ran into problems early and never got enough consistency to trust it day to day.",
    "ended up being one of the few purchases I regretted quickly. The experience felt rough and the quality did not inspire confidence.",
  ],
};

const notePool = [
  "Please leave the package with the front desk if no one is home.",
  "Ring the bell once and text after delivery.",
  "If possible, leave the box by the side gate.",
  "Gift order for a family member. Please keep the packaging neat.",
  null,
  null,
  null,
];

const cleanupDatabase = async () => {
  await prisma.adminAuditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.couponRedemption.deleteMany();
  await prisma.orderCoupon.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.review.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.address.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();
};

const calculateDiscount = (coupon, subtotal) => {
  const minimum = coupon.minOrderAmount ? Number(coupon.minOrderAmount) : 0;

  if (subtotal < minimum) {
    return 0;
  }

  let discount =
    coupon.type === CouponType.PERCENTAGE
      ? subtotal * (Number(coupon.value) / 100)
      : Number(coupon.value);

  if (coupon.maxDiscountAmount !== null) {
    discount = Math.min(discount, Number(coupon.maxDiscountAmount));
  }

  return roundCurrency(Math.max(0, Math.min(discount, subtotal)));
};

const pickOrderItems = (allProducts, count) => {
  const selectedProductIds = new Set();
  const items = [];

  while (items.length < count) {
    const product = sampleWeighted(allProducts, (candidate) => candidate.salesWeight);

    if (selectedProductIds.has(product.id)) {
      continue;
    }

    selectedProductIds.add(product.id);
    items.push({
      product,
      quantity: randomInt(1, product.price >= 300 ? 2 : 3),
    });
  }

  return items;
};

const createCategories = async () => {
  const categoryMap = new Map();

  for (const category of categories) {
    const created = await prisma.category.create({
      data: {
        name: category.name,
        slug: category.slug,
        description: category.description,
      },
    });

    categoryMap.set(category.slug, created);
  }

  return categoryMap;
};

const createUsers = async () => {
  const customerPasswordHash = await bcrypt.hash(CUSTOMER_PASSWORD, 12);
  const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const createdUsers = [];

  for (const [index, user] of users.entries()) {
    const passwordHash =
      user.role === UserRole.ADMIN ? adminPasswordHash : customerPasswordHash;
    const avatarSeed = slugify(`${user.firstName}-${user.lastName}`);
    const createdAt = shiftDate(new Date("2025-01-01T09:00:00.000Z"), randomInt(0, 370));
    const fullName = `${user.firstName} ${user.lastName}`;

    const createdUser = await prisma.user.create({
      data: {
        email: user.email,
        passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: formatPhone(index),
        avatarUrl: `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(avatarSeed)}`,
        role: user.role ?? UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: shiftDate(createdAt, 0, randomInt(5, 180)),
        lastLoginAt: shiftDate(new Date(), -randomInt(0, 21), -randomInt(0, 720)),
        createdAt,
        updatedAt: shiftDate(createdAt, randomInt(5, 120)),
        addresses: {
          create: [
            {
              type: AddressType.SHIPPING,
              fullName,
              line1: user.line1,
              city: user.city,
              state: user.state,
              postalCode: user.postalCode,
              country: "US",
              phone: formatPhone(index),
              isDefault: true,
            },
            {
              type: AddressType.BILLING,
              fullName,
              line1: user.line1,
              city: user.city,
              state: user.state,
              postalCode: user.postalCode,
              country: "US",
              phone: formatPhone(index),
              isDefault: true,
            },
          ],
        },
      },
      include: {
        addresses: true,
      },
    });

    createdUsers.push(createdUser);
  }

  return createdUsers;
};

const createCoupons = async () => {
  const createdCoupons = [];

  for (const definition of couponDefinitions) {
    const coupon = await prisma.coupon.create({
      data: {
        codeHash: hashCouponCode(definition.code),
        codePreview: maskCouponCode(definition.code),
        description: definition.description,
        type: definition.type,
        value: decimal(definition.value),
        minOrderAmount:
          definition.minOrderAmount !== null ? decimal(definition.minOrderAmount) : null,
        maxDiscountAmount:
          definition.maxDiscountAmount !== null ? decimal(definition.maxDiscountAmount) : null,
        usageLimit: definition.usageLimit,
        usageCount: 0,
        startsAt: new Date("2025-01-01T00:00:00.000Z"),
        endsAt: new Date("2027-01-01T00:00:00.000Z"),
        isActive: true,
      },
    });

    createdCoupons.push({
      ...coupon,
      rawCode: definition.code,
    });
  }

  return createdCoupons;
};

const createProducts = async (categoryMap) => {
  const createdProducts = [];
  let productIndex = 0;

  for (const category of categories) {
    const categoryRecord = categoryMap.get(category.slug);
    const images = imageLibrary[category.imageKey];

    for (const [offset, product] of category.products.entries()) {
      const sku = `${category.skuPrefix}-${formatProductCode(offset + 1)}`;
      const slug = slugify(product.name);
      const inventoryQuantity =
        productIndex < 6
          ? randomInt(5, 9)
          : productIndex < 14
            ? randomInt(8, 14)
            : randomInt(18, 85);
      const reservedQuantity =
        inventoryQuantity > 10 ? randomInt(0, Math.min(5, inventoryQuantity - 5)) : randomInt(0, 2);
      const reorderPoint = inventoryQuantity < 12 ? 10 : randomInt(8, 16);
      const warehouseLocation = `A-${randomInt(1, 5)}-${randomInt(1, 24)}`;
      const baseDate = shiftDate(new Date("2025-05-01T10:00:00.000Z"), randomInt(0, 240));

      const createdProduct = await prisma.product.create({
        data: {
          name: product.name,
          slug,
          sku,
          shortDescription: product.shortDescription,
          description: product.description,
          basePrice: decimal(product.price),
          currency: "USD",
          taxRate: decimal(0),
          status: ProductStatus.ACTIVE,
          isFeatured: productIndex < 10 || chance(0.12),
          createdAt: baseDate,
          updatedAt: shiftDate(baseDate, randomInt(2, 70)),
          categories: {
            create: [
              {
                categoryId: categoryRecord.id,
              },
            ],
          },
          images: {
            create: [
              {
                url: images[offset % images.length],
                altText: `${product.name} hero image`,
                position: 0,
                isPrimary: true,
              },
              {
                url: images[(offset + 1) % images.length],
                altText: `${product.name} detail image`,
                position: 1,
                isPrimary: false,
              },
            ],
          },
          variants: {
            create: {
              name: `${product.name} Default`,
              sku,
              price: decimal(product.price),
              isDefault: true,
              isActive: true,
              inventoryItem: {
                create: {
                  trackQuantity: true,
                  quantityOnHand: inventoryQuantity,
                  reservedQuantity,
                  reorderPoint,
                  warehouseLocation,
                },
              },
            },
          },
        },
        include: {
          categories: {
            include: {
              category: true,
            },
          },
          variants: {
            include: {
              inventoryItem: true,
            },
          },
          images: true,
        },
      });

      const variant = createdProduct.variants[0];

      await prisma.inventoryMovement.create({
        data: {
          inventoryItemId: variant.inventoryItem.id,
          type: InventoryMovementType.RESTOCK,
          quantity: inventoryQuantity,
          reason: "Initial stock load",
          reference: "seed",
          createdAt: shiftDate(baseDate, 0, 45),
        },
      });

      createdProducts.push({
        id: createdProduct.id,
        name: createdProduct.name,
        slug: createdProduct.slug,
        sku: createdProduct.sku,
        price: Number(createdProduct.basePrice),
        currency: createdProduct.currency,
        category: createdProduct.categories[0].category,
        categorySlug: category.slug,
        primaryImageUrl: createdProduct.images[0]?.url ?? null,
        variantId: variant.id,
        variantSku: variant.sku,
        inventoryItemId: variant.inventoryItem.id,
        inventoryCount: variant.inventoryItem.quantityOnHand - variant.inventoryItem.reservedQuantity,
        salesWeight: productIndex < 8 ? 5 : productIndex < 20 ? 3 : 1,
      });

      productIndex += 1;
    }
  }

  return createdProducts;
};

const createWishlists = async (createdUsers, products) => {
  const customerUsers = createdUsers.filter((user) => user.role !== UserRole.ADMIN);

  for (const user of customerUsers.slice(0, 14)) {
    const selectedProducts = pickUniqueItems(products, randomInt(3, 6));

    await prisma.wishlist.create({
      data: {
        userId: user.id,
        name: "Favorites",
        isDefault: true,
        createdAt: shiftDate(new Date(), -randomInt(1, 60)),
        updatedAt: shiftDate(new Date(), -randomInt(0, 20)),
        items: {
          create: selectedProducts.map((product) => ({
            productId: product.id,
            createdAt: shiftDate(new Date(), -randomInt(0, 45)),
          })),
        },
      },
    });
  }
};

const buildAddressSnapshot = (user) => {
  const shippingAddress = user.addresses.find((address) => address.type === AddressType.SHIPPING);

  return {
    fullName: shippingAddress.fullName,
    line1: shippingAddress.line1,
    city: shippingAddress.city,
    state: shippingAddress.state,
    postalCode: shippingAddress.postalCode,
    country: shippingAddress.country,
    phone: shippingAddress.phone,
  };
};

const createOrders = async (createdUsers, products, coupons) => {
  const customerUsers = createdUsers.filter((user) => user.role !== UserRole.ADMIN);
  const productSalesMap = new Map();
  const purchasePairs = new Set();
  const couponUsageCounts = new Map(coupons.map((coupon) => [coupon.id, 0]));
  const createdOrders = [];

  for (const [index, status] of orderStatusPlan.entries()) {
    const user = sampleWeighted(customerUsers, () => 1);
    const withinLastThirtyDays = index < 140 || VERIFIED_ORDER_STATUSES.has(status);
    const createdAt = withinLastThirtyDays
      ? randomDateBetween(new Date("2026-03-01T00:00:00.000Z"), new Date("2026-03-30T23:00:00.000Z"))
      : randomDateBetween(new Date("2025-09-01T00:00:00.000Z"), new Date("2026-02-20T23:00:00.000Z"));
    const placedAt = shiftDate(createdAt, 0, randomInt(5, 180));
    const lineItems = pickOrderItems(products, randomInt(1, 4));
    const subtotal = roundCurrency(
      lineItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    );
    const eligibleCoupons = coupons.filter((coupon) => subtotal >= Number(coupon.minOrderAmount ?? 0));
    const selectedCoupon =
      eligibleCoupons.length > 0 && chance(0.34) ? pickOne(eligibleCoupons) : null;
    const discountTotal = selectedCoupon ? calculateDiscount(selectedCoupon, subtotal) : 0;
    const grandTotal = roundCurrency(subtotal - discountTotal);
    const shippingAddress = buildAddressSnapshot(user);

    let paymentStatus = PaymentStatus.PENDING;
    let simulatedOutcome = "pending";
    let processedAt = null;
    let fulfilledAt = null;
    let cancelledAt = null;
    let redeemCoupon = false;

    if (
      status === OrderStatus.PAID ||
      status === OrderStatus.PROCESSING ||
      status === OrderStatus.SHIPPED ||
      status === OrderStatus.DELIVERED
    ) {
      paymentStatus = PaymentStatus.CAPTURED;
      simulatedOutcome = "success";
      processedAt = shiftDate(placedAt, 0, randomInt(3, 30));
      redeemCoupon = Boolean(selectedCoupon);
    } else if (status === OrderStatus.REFUNDED) {
      paymentStatus = PaymentStatus.REFUNDED;
      simulatedOutcome = "success";
      processedAt = shiftDate(placedAt, randomInt(5, 25), randomInt(0, 120));
      fulfilledAt = shiftDate(placedAt, randomInt(3, 10), randomInt(0, 120));
      redeemCoupon = Boolean(selectedCoupon);
    } else if (status === OrderStatus.PAYMENT_FAILED) {
      paymentStatus = PaymentStatus.FAILED;
      simulatedOutcome = "failed";
      processedAt = shiftDate(placedAt, 0, randomInt(1, 20));
    } else if (status === OrderStatus.CANCELLED) {
      paymentStatus = PaymentStatus.CANCELLED;
      simulatedOutcome = "cancelled";
      cancelledAt = shiftDate(placedAt, randomInt(0, 2), randomInt(30, 180));
      processedAt = cancelledAt;
    }

    if (status === OrderStatus.SHIPPED) {
      fulfilledAt = shiftDate(placedAt, randomInt(1, 4), randomInt(30, 120));
    }

    if (status === OrderStatus.DELIVERED) {
      fulfilledAt = shiftDate(placedAt, randomInt(3, 9), randomInt(30, 180));
    }

    const paymentMethod = pickOne([
      PaymentMethod.CARD,
      PaymentMethod.CARD,
      PaymentMethod.CARD,
      PaymentMethod.PAYPAL,
      PaymentMethod.WALLET,
      PaymentMethod.BANK_TRANSFER,
    ]);
    const orderNumber = buildOrderNumber(index);
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        orderNumber,
        status,
        subtotal: decimal(subtotal),
        discountTotal: decimal(discountTotal),
        taxTotal: decimal(0),
        shippingTotal: decimal(0),
        grandTotal: decimal(grandTotal),
        currency: "USD",
        notes: pickOne(notePool),
        shippingAddressSnapshot: shippingAddress,
        billingAddressSnapshot: shippingAddress,
        placedAt,
        fulfilledAt,
        cancelledAt,
        createdAt,
        updatedAt: fulfilledAt ?? cancelledAt ?? processedAt ?? placedAt,
        items: {
          create: lineItems.map((item) => ({
            productId: item.product.id,
            variantId: item.product.variantId,
            sku: item.product.variantSku,
            name: item.product.name,
            quantity: item.quantity,
            unitPrice: decimal(item.product.price),
            totalPrice: decimal(item.product.price * item.quantity),
            snapshot: {
              slug: item.product.slug,
              category: item.product.category.name,
              primaryImageUrl: item.product.primaryImageUrl,
            },
          })),
        },
        payments: {
          create: {
            provider: PaymentProvider.SIMULATED,
            method: paymentMethod,
            status: paymentStatus,
            amount: decimal(grandTotal),
            currency: "USD",
            providerReference: `SIM-${randomUUID().slice(0, 12).toUpperCase()}`,
            simulatedOutcome,
            processedAt,
            createdAt: placedAt,
            updatedAt: processedAt ?? placedAt,
          },
        },
        coupons:
          selectedCoupon && discountTotal > 0
            ? {
                create: {
                  couponId: selectedCoupon.id,
                  code: selectedCoupon.codePreview,
                  discountAmount: decimal(discountTotal),
                  createdAt: placedAt,
                },
              }
            : undefined,
        couponRedemptions:
          selectedCoupon && discountTotal > 0 && redeemCoupon
            ? {
                create: {
                  couponId: selectedCoupon.id,
                  userId: user.id,
                  amountApplied: decimal(discountTotal),
                  redeemedAt: processedAt ?? placedAt,
                },
              }
            : undefined,
      },
      include: {
        items: true,
      },
    });

    if (selectedCoupon && discountTotal > 0 && redeemCoupon) {
      couponUsageCounts.set(
        selectedCoupon.id,
        (couponUsageCounts.get(selectedCoupon.id) ?? 0) + 1,
      );
    }

    for (const item of lineItems) {
      productSalesMap.set(
        item.product.id,
        (productSalesMap.get(item.product.id) ?? 0) + item.quantity,
      );

      if (VERIFIED_ORDER_STATUSES.has(status)) {
        purchasePairs.add(`${user.id}:${item.product.id}`);
      }
    }

    createdOrders.push({
      id: order.id,
      userId: user.id,
      status,
      createdAt,
      itemProductIds: lineItems.map((item) => item.product.id),
    });
  }

  for (const coupon of coupons) {
    await prisma.coupon.update({
      where: {
        id: coupon.id,
      },
      data: {
        usageCount: couponUsageCounts.get(coupon.id) ?? 0,
      },
    });
  }

  return {
    createdOrders,
    productSalesMap,
    purchasePairs,
  };
};

const createReviews = async (createdUsers, products, createdOrders, purchasePairs) => {
  const customerUsers = createdUsers.filter((user) => user.role !== UserRole.ADMIN);
  const orderHistoryByPair = new Map();

  for (const order of createdOrders) {
    if (!VERIFIED_ORDER_STATUSES.has(order.status)) {
      continue;
    }

    for (const productId of order.itemProductIds) {
      const pairKey = `${order.userId}:${productId}`;
      const currentDate = orderHistoryByPair.get(pairKey);

      if (!currentDate || currentDate < order.createdAt) {
        orderHistoryByPair.set(pairKey, order.createdAt);
      }
    }
  }

  const verifiedCandidates = shuffle(Array.from(purchasePairs));
  const preferredVerifiedPairs = verifiedCandidates.slice(
    0,
    Math.min(115, verifiedCandidates.length),
  );
  const fallbackPairs = shuffle(
    customerUsers.flatMap((user) => products.map((product) => `${user.id}:${product.id}`)),
  ).filter((pairKey) => !purchasePairs.has(pairKey));
  const selectedPairs = [...preferredVerifiedPairs, ...fallbackPairs].slice(0, 150);

  if (selectedPairs.length < 150) {
    throw new Error("Seed generation could not assemble the required 150 unique review pairs.");
  }

  for (const [index, pairKey] of selectedPairs.entries()) {
    const [userId, productId] = pairKey.split(":");
    const product = products.find((candidate) => candidate.id === productId);

    if (!product) {
      continue;
    }

    const verifiedPurchase = purchasePairs.has(pairKey);
    const rating = sampleWeighted([1, 2, 3, 4, 5], (value) => {
      const verifiedWeights = { 1: 2, 2: 4, 3: 12, 4: 28, 5: 34 };
      const fallbackWeights = { 1: 4, 2: 7, 3: 14, 4: 24, 5: 20 };

      return verifiedPurchase ? verifiedWeights[value] : fallbackWeights[value];
    });
    let status = ReviewStatus.APPROVED;

    if (index >= 110 && index < 135) {
      status = ReviewStatus.PENDING;
    } else if (index >= 135) {
      status = ReviewStatus.REJECTED;
    }

    const bodySuffix = pickOne(reviewBodyByRating[rating]);
    const createdAt = verifiedPurchase
      ? shiftDate(orderHistoryByPair.get(pairKey), randomInt(2, 40))
      : randomDateBetween(new Date("2025-11-01T00:00:00.000Z"), new Date("2026-03-30T18:00:00.000Z"));

    await prisma.review.create({
      data: {
        userId,
        productId,
        rating,
        title: pickOne(reviewTitleByRating[rating]),
        body: `${product.name} ${bodySuffix}`,
        status,
        verifiedPurchase,
        createdAt,
        updatedAt: shiftDate(createdAt, randomInt(0, 12)),
      },
    });
  }
};

const createAdminAuditLogs = async (adminUserId) => {
  await prisma.adminAuditLog.createMany({
    data: [
      {
        actorUserId: adminUserId,
        action: "seed.catalog_import",
        entityType: "Product",
        metadata: {
          importedProducts: 50,
        },
        createdAt: new Date("2026-03-01T09:15:00.000Z"),
      },
      {
        actorUserId: adminUserId,
        action: "seed.coupon_launch",
        entityType: "Coupon",
        metadata: {
          activeCoupons: couponDefinitions.length,
        },
        createdAt: new Date("2026-03-05T11:40:00.000Z"),
      },
      {
        actorUserId: adminUserId,
        action: "seed.inventory_review",
        entityType: "InventoryItem",
        metadata: {
          lowStockThreshold: 10,
        },
        createdAt: new Date("2026-03-12T16:05:00.000Z"),
      },
    ],
  });
};

const main = async () => {
  console.log("Seeding ShopSphere with deterministic sample data...");

  await cleanupDatabase();

  const categoryMap = await createCategories();
  const createdUsers = await createUsers();
  const coupons = await createCoupons();
  const products = await createProducts(categoryMap);

  await createWishlists(createdUsers, products);

  const { createdOrders, purchasePairs } = await createOrders(
    createdUsers,
    products,
    coupons,
  );

  await createReviews(createdUsers, products, createdOrders, purchasePairs);

  const adminUser = createdUsers.find((user) => user.role === UserRole.ADMIN);

  if (adminUser) {
    await createAdminAuditLogs(adminUser.id);
  }

  console.log("Seed complete.");
  console.log("");
  console.log("Admin login:");
  console.log(`  email: ${adminUser.email}`);
  console.log(`  password: ${ADMIN_PASSWORD}`);
  console.log("");
  console.log("Customer login:");
  console.log(`  email: ${createdUsers.find((user) => user.role === UserRole.CUSTOMER).email}`);
  console.log(`  password: ${CUSTOMER_PASSWORD}`);
  console.log("");
  console.log("Coupons:");
  for (const coupon of couponDefinitions) {
    console.log(`  ${coupon.code} - ${coupon.description}`);
  }
};

main()
  .catch((error) => {
    console.error("Seed failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
