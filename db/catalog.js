/**
 * The seed catalog for MyRig.
 *
 * Single source of truth for the `products`, `learning_cards` and
 * `upgrade_rules` tables.
 *
 *   npm run db:gen-seed   ->  regenerates db/seed.sql from this file
 *   npm run db:setup      ->  applies db/schema.sql then seeds Neon from this file
 *
 * PARTS and ACCESSORIES are kept as separate arrays here because that is how the
 * recommendation engine thinks about them, but they seed ONE `products` table
 * (see PRODUCTS at the bottom). The store sells the same rows the engine
 * recommends - a part is a product. There is no second catalog to keep in sync.
 *
 * Prices are realistic sample prices in USD, not live retail prices.
 *
 * Field meanings:
 *   tier      'budget' | 'mid' | 'high' | 'ultra'  (see TIER_ORDER in api/_lib/engine.js)
 *   best_for  gaming goals this item suits: competitive_fps | high_graphics |
 *             casual | streaming | balanced   ('any' = fits every goal)
 *   styles    setup styles this item suits: rgb | minimalist | white | cozy |
 *             streamer | esports              ('any' = fits every style)
 */

export const PARTS = [
  // ---------------- CPU ----------------
  {
    name: 'Ryzen 5 5600',
    category: 'cpu',
    price: 130,
    tier: 'budget',
    best_for: ['casual', 'balanced', 'competitive_fps'],
    styles: ['any'],
    reason: 'A cheap 6-core CPU that still keeps frame rates high in esports and casual games.',
  },
  {
    name: 'Ryzen 5 7600',
    category: 'cpu',
    price: 200,
    tier: 'mid',
    best_for: ['competitive_fps', 'balanced', 'high_graphics'],
    styles: ['any'],
    reason: 'Modern 6-core CPU that feeds a mid-range GPU without holding it back.',
  },
  {
    name: 'Intel i5 Class CPU',
    category: 'cpu',
    price: 210,
    tier: 'mid',
    best_for: ['balanced', 'casual', 'high_graphics'],
    styles: ['any'],
    reason: 'Well-rounded CPU for gaming plus everyday multitasking.',
  },
  {
    name: 'Intel i7 / Ryzen 7 Class CPU',
    category: 'cpu',
    price: 340,
    tier: 'high',
    best_for: ['streaming', 'high_graphics', 'balanced'],
    styles: ['any'],
    reason: 'Extra cores handle encoding a stream while the game keeps running smoothly.',
  },

  // ---------------- GPU ----------------
  {
    name: 'RX 7600 Class GPU',
    category: 'gpu',
    price: 270,
    tier: 'budget',
    best_for: ['casual', 'competitive_fps', 'balanced'],
    styles: ['any'],
    reason: 'Strong value at 1080p, especially in lighter and competitive titles.',
  },
  {
    name: 'RTX 4060 Class GPU',
    category: 'gpu',
    price: 300,
    tier: 'mid',
    best_for: ['competitive_fps', 'balanced', 'streaming'],
    styles: ['any'],
    reason: 'Good for 1080p competitive gaming and high FPS esports titles.',
  },
  {
    name: 'RTX 4070 / RX 7800 XT Class GPU',
    category: 'gpu',
    price: 520,
    tier: 'high',
    best_for: ['high_graphics', 'streaming', 'balanced'],
    styles: ['any'],
    reason: 'Comfortably drives 1440p with high settings in demanding modern games.',
  },
  {
    name: 'High-End RTX Class GPU',
    category: 'gpu',
    price: 800,
    tier: 'ultra',
    best_for: ['high_graphics'],
    styles: ['any'],
    reason: 'Maximum visual quality - ray tracing and 1440p/4K in the heaviest games.',
  },

  // ---------------- RAM ----------------
  {
    name: '16GB DDR4 RAM',
    category: 'ram',
    price: 40,
    tier: 'budget',
    best_for: ['casual', 'competitive_fps', 'balanced'],
    styles: ['any'],
    reason: '16GB is the comfortable minimum for modern gaming.',
  },
  {
    name: '16GB DDR5 RAM',
    category: 'ram',
    price: 60,
    tier: 'mid',
    best_for: ['competitive_fps', 'balanced', 'high_graphics'],
    styles: ['any'],
    reason: 'Faster memory that pairs with current-generation CPUs.',
  },
  {
    name: '32GB DDR5 RAM',
    category: 'ram',
    price: 110,
    tier: 'high',
    best_for: ['streaming', 'high_graphics'],
    styles: ['any'],
    reason: 'Headroom for a game, a stream, a browser and Discord all at once.',
  },

  // ---------------- Storage ----------------
  {
    name: '500GB NVMe SSD',
    category: 'storage',
    price: 45,
    tier: 'budget',
    best_for: ['casual', 'competitive_fps'],
    styles: ['any'],
    reason: 'Fast load times on a tight budget - enough for a few large games.',
  },
  {
    name: '1TB NVMe SSD',
    category: 'storage',
    price: 70,
    tier: 'mid',
    best_for: ['balanced', 'competitive_fps', 'high_graphics'],
    styles: ['any'],
    reason: 'The sweet spot: fast loading with room for a real game library.',
  },
  {
    name: '2TB NVMe SSD',
    category: 'storage',
    price: 120,
    tier: 'high',
    best_for: ['streaming', 'high_graphics'],
    styles: ['any'],
    reason: 'Big modern games and recorded footage fill space quickly.',
  },

  // ---------------- Case ----------------
  {
    name: 'Budget Airflow Case',
    category: 'case',
    price: 60,
    tier: 'budget',
    best_for: ['casual', 'balanced', 'competitive_fps'],
    styles: ['minimalist', 'esports', 'any'],
    reason: 'Mesh front panel keeps temperatures low without spending much.',
  },
  {
    name: 'Black Minimalist Case',
    category: 'case',
    price: 85,
    tier: 'mid',
    best_for: ['balanced', 'competitive_fps', 'high_graphics'],
    styles: ['minimalist', 'esports'],
    reason: 'Clean matte black shell with no lighting - stays out of the way.',
  },
  {
    name: 'White Clean Case',
    category: 'case',
    price: 95,
    tier: 'mid',
    best_for: ['balanced', 'casual', 'high_graphics'],
    styles: ['white', 'cozy'],
    reason: 'A bright white shell that anchors a light, tidy desk.',
  },
  {
    name: 'RGB Glass Case',
    category: 'case',
    price: 100,
    tier: 'mid',
    best_for: ['balanced', 'high_graphics', 'streaming'],
    styles: ['rgb', 'streamer'],
    reason: 'Tempered glass side panel and RGB fans put the build on display.',
  },

  // ---------------- Monitor ----------------
  {
    name: '1080p 75Hz Monitor',
    category: 'monitor',
    price: 110,
    tier: 'budget',
    best_for: ['casual'],
    styles: ['any'],
    reason: 'Cheap and perfectly fine for relaxed, non-competitive games.',
  },
  {
    name: '1080p 144Hz Monitor',
    category: 'monitor',
    price: 170,
    tier: 'mid',
    best_for: ['competitive_fps', 'balanced', 'casual'],
    styles: ['any'],
    reason: 'High refresh rate makes aiming and tracking noticeably smoother.',
  },
  {
    name: '1080p 240Hz Monitor',
    category: 'monitor',
    price: 260,
    tier: 'high',
    best_for: ['competitive_fps'],
    styles: ['esports', 'rgb', 'minimalist'],
    reason: 'Built for esports - the lowest possible motion blur and input lag.',
  },
  {
    name: '1440p 165Hz Monitor',
    category: 'monitor',
    price: 300,
    tier: 'high',
    best_for: ['high_graphics', 'streaming', 'balanced'],
    styles: ['any'],
    reason: 'Sharper image than 1080p while still staying fast enough for action games.',
  },
]

export const ACCESSORIES = [
  // ---------------- Keyboard ----------------
  {
    name: 'Budget Membrane Keyboard',
    category: 'keyboard',
    price: 30,
    best_for: ['casual'],
    styles: ['any'],
    reason: 'Does the job and leaves more of the budget for the parts that affect FPS.',
  },
  {
    name: 'Mechanical Keyboard (TKL)',
    category: 'keyboard',
    price: 70,
    best_for: ['competitive_fps', 'balanced', 'high_graphics'],
    styles: ['minimalist', 'esports'],
    reason: 'Crisp mechanical switches, and the short layout frees up mouse space.',
  },
  {
    name: 'RGB Mechanical Keyboard',
    category: 'keyboard',
    price: 90,
    best_for: ['balanced', 'competitive_fps', 'streaming'],
    styles: ['rgb', 'streamer'],
    reason: 'Per-key lighting that matches the rest of the RGB setup.',
  },
  {
    name: 'White Wireless Keyboard',
    category: 'keyboard',
    price: 85,
    best_for: ['casual', 'balanced'],
    styles: ['white', 'cozy'],
    reason: 'Wireless and white - keeps the desk clean with no visible cable.',
  },

  // ---------------- Mouse ----------------
  {
    name: 'Budget Gaming Mouse',
    category: 'mouse',
    price: 25,
    best_for: ['casual'],
    styles: ['any'],
    reason: 'A reliable sensor at a low price for relaxed play.',
  },
  {
    name: 'Lightweight Gaming Mouse',
    category: 'mouse',
    price: 50,
    best_for: ['competitive_fps', 'balanced'],
    styles: ['esports', 'rgb', 'minimalist'],
    reason: 'A light body makes fast flick shots easier and reduces wrist fatigue.',
  },
  {
    name: 'Wireless Mouse',
    category: 'mouse',
    price: 60,
    best_for: ['balanced', 'casual', 'streaming'],
    styles: ['minimalist', 'white', 'cozy'],
    reason: 'No cable drag, and nothing extra running across a clean desk.',
  },

  // ---------------- Headset ----------------
  {
    name: 'Budget Gaming Headset',
    category: 'headset',
    price: 40,
    best_for: ['casual', 'balanced'],
    styles: ['any'],
    reason: 'Clear game audio and a usable mic for voice chat.',
  },
  {
    name: 'Wireless Gaming Headset',
    category: 'headset',
    price: 100,
    best_for: ['competitive_fps', 'streaming', 'high_graphics'],
    styles: ['any'],
    reason: 'Good positional audio - hearing footsteps first is a real advantage.',
  },

  // ---------------- Content creation ----------------
  {
    name: 'USB Microphone',
    category: 'microphone',
    price: 70,
    best_for: ['streaming'],
    styles: ['streamer', 'rgb', 'cozy'],
    reason: 'Audio quality is what viewers notice first - it matters more than video.',
  },
  {
    name: '1080p Webcam',
    category: 'webcam',
    price: 60,
    best_for: ['streaming'],
    styles: ['streamer'],
    reason: 'A face cam helps viewers connect with the stream.',
  },
  {
    name: 'Ring Light',
    category: 'lighting',
    price: 45,
    best_for: ['streaming'],
    styles: ['streamer', 'white'],
    reason: 'Even front lighting makes any webcam look dramatically better.',
  },

  // ---------------- Lighting / desk ----------------
  {
    name: 'LED Light Strip',
    category: 'lighting',
    price: 25,
    best_for: ['balanced', 'casual', 'streaming'],
    styles: ['rgb', 'streamer'],
    reason: 'Backlighting behind the desk adds the RGB glow with almost no cost.',
  },
  {
    name: 'Warm Desk Lamp',
    category: 'lighting',
    price: 35,
    best_for: ['casual', 'balanced'],
    styles: ['cozy', 'white'],
    reason: 'Warm light is easier on the eyes during long evening sessions.',
  },
  {
    name: 'Desk Speakers',
    category: 'desk',
    price: 80,
    best_for: ['casual', 'balanced'],
    styles: ['cozy', 'white'],
    reason: 'For the times you want the room filled with sound instead of a headset.',
  },
  {
    name: 'Plant & Decor Set',
    category: 'desk',
    price: 30,
    best_for: ['casual', 'balanced'],
    styles: ['cozy'],
    reason: 'A plant and a few small pieces turn a computer desk into a space you enjoy.',
  },
  {
    name: 'Large Desk Mat',
    category: 'desk',
    price: 25,
    best_for: ['competitive_fps', 'balanced', 'casual', 'high_graphics', 'streaming'],
    styles: ['any'],
    reason: 'A consistent surface for low-sensitivity aiming, and it tidies the desk.',
  },
  {
    name: 'Cable Management Kit',
    category: 'desk',
    price: 20,
    best_for: ['balanced', 'competitive_fps', 'casual', 'high_graphics', 'streaming'],
    styles: ['minimalist', 'white', 'esports', 'any'],
    reason: 'The cheapest upgrade that makes a setup look finished.',
  },
]

/**
 * What actually goes into the `products` table: parts and accessories, tagged
 * with which they are. Order is stable, so product ids are stable across
 * re-seeds - which matters, because orders and wishlists point at them.
 */
export const PRODUCTS = [
  ...PARTS.map((p) => ({ ...p, kind: 'part' })),
  ...ACCESSORIES.map((a) => ({ ...a, kind: 'accessory', tier: null })),
]

export const LEARNING_CARDS = [
  {
    title: 'CPU',
    category: 'cpu',
    short_description:
      'The CPU is the brain of the computer. It handles game logic, background apps and anything that is not drawing the picture.',
    beginner_description:
      'The CPU is like the brain of the computer. It helps games, apps and background tasks run smoothly. For most gaming you do not need the most expensive one - you need one that is fast enough not to hold your graphics card back.',
  },
  {
    title: 'GPU',
    category: 'gpu',
    short_description:
      'The GPU handles graphics. For gaming this is usually the most important part. A stronger GPU helps games run smoother and look better.',
    beginner_description:
      'The GPU (graphics card) draws everything you see on screen. If you only have money to upgrade one part, this is almost always the one that gives you the biggest jump in frame rate and visual quality.',
  },
  {
    title: 'RAM',
    category: 'ram',
    short_description:
      'RAM is short-term memory. It holds what the computer is actively using right now. 16GB is the comfortable minimum for gaming.',
    beginner_description:
      'RAM is like your desk space - the more you have, the more you can keep open at once. More RAM does not make games faster on its own, but too little RAM makes everything stutter.',
  },
  {
    title: 'SSD Storage',
    category: 'storage',
    short_description:
      'An NVMe SSD is fast storage. It is what makes games and Windows load in seconds instead of minutes.',
    beginner_description:
      'Storage is where your games live. An SSD is much faster than an old hard drive, so levels load quicker. Games are big now, so 1TB fills up faster than you expect.',
  },
  {
    title: 'Monitor Refresh Rate',
    category: 'monitor',
    short_description:
      'Refresh rate (Hz) is how many times per second the screen updates. 144Hz feels much smoother than 60Hz.',
    beginner_description:
      'A 60Hz monitor shows 60 images a second; a 144Hz monitor shows 144. Higher refresh rate makes motion clearer and aiming easier. It only helps if your PC can actually produce that many frames.',
  },
  {
    title: '1080p vs 1440p',
    category: 'monitor',
    short_description:
      '1080p is easier to run and better for high frame rates. 1440p is sharper but asks more from the GPU.',
    beginner_description:
      'Resolution is how many pixels the screen has. 1440p looks sharper than 1080p, but your graphics card has to work harder to fill those extra pixels. Competitive players often stay at 1080p to keep frame rates high.',
  },
  {
    title: 'Why Peripherals Matter',
    category: 'peripherals',
    short_description:
      'Your keyboard, mouse, headset and chair are what you actually touch. They affect the experience as much as the parts inside the case.',
    beginner_description:
      'You never touch your GPU, but your hands are on your mouse for every hour you play. A good mouse and a comfortable seat change how the setup feels far more than a small spec bump inside the tower.',
  },
  {
    title: 'Why Airflow Matters',
    category: 'case',
    short_description:
      'Parts slow themselves down when they get too hot. Good airflow keeps them running at full speed.',
    beginner_description:
      'When components overheat they deliberately slow down to protect themselves, which means lower FPS. A case with a mesh front and a couple of fans keeps air moving so that never happens.',
  },
  {
    title: 'What To Upgrade First',
    category: 'upgrade',
    short_description:
      'Usually the GPU, then the monitor. Upgrade the part that is limiting you, not the part that is easiest to buy.',
    beginner_description:
      'If games look bad or run slowly, upgrade the GPU. If games run fast but the screen feels choppy, upgrade the monitor. If everything stutters when you have Discord and a browser open, add RAM.',
  },
]

export const UPGRADE_RULES = [
  // ---- By budget tier ----
  {
    condition_type: 'budget_tier',
    condition_value: 'budget',
    upgrade_name: 'Upgrade the GPU',
    priority: 'High',
    estimated_cost: 350,
    reason:
      'The graphics card is the first thing that limits a budget build. Moving up one tier is the single biggest FPS gain available to you.',
  },
  {
    condition_type: 'budget_tier',
    condition_value: 'budget',
    upgrade_name: 'Add more SSD storage',
    priority: 'Medium',
    estimated_cost: 70,
    reason: 'Modern games are 80-150GB each. A second SSD stops you uninstalling games to make room.',
  },
  {
    condition_type: 'budget_tier',
    condition_value: 'budget',
    upgrade_name: 'Upgrade to a 144Hz monitor',
    priority: 'Medium',
    estimated_cost: 170,
    reason: 'Once the PC can push more frames, a faster screen is what lets you actually see them.',
  },
  {
    condition_type: 'budget_tier',
    condition_value: 'budget',
    upgrade_name: 'Add RGB lighting and cable management',
    priority: 'Low',
    estimated_cost: 45,
    reason: 'Cheap finishing touches that make the setup feel intentional rather than temporary.',
  },
  {
    condition_type: 'budget_tier',
    condition_value: 'balanced',
    upgrade_name: 'Add a second monitor',
    priority: 'Medium',
    estimated_cost: 200,
    reason: 'Useful for streaming, multitasking and Discord while gaming.',
  },
  {
    condition_type: 'budget_tier',
    condition_value: 'high',
    upgrade_name: 'Upgrade to a better chair',
    priority: 'Medium',
    estimated_cost: 250,
    reason:
      'At this budget the PC is no longer the weak link. Comfort over long sessions is what is left to improve.',
  },

  // ---- By gaming goal ----
  {
    condition_type: 'gaming_goal',
    condition_value: 'competitive_fps',
    upgrade_name: 'Upgrade to a 240Hz monitor',
    priority: 'High',
    estimated_cost: 260,
    reason: 'In competitive shooters, lower motion blur and input lag is a direct advantage.',
  },
  {
    condition_type: 'gaming_goal',
    condition_value: 'competitive_fps',
    upgrade_name: 'Upgrade to a pro-grade lightweight mouse',
    priority: 'Medium',
    estimated_cost: 80,
    reason: 'A lighter, wireless mouse improves aim consistency more than most internal upgrades.',
  },
  {
    condition_type: 'gaming_goal',
    condition_value: 'competitive_fps',
    upgrade_name: 'Improve desk space and cable management',
    priority: 'Low',
    estimated_cost: 40,
    reason: 'Low-sensitivity aiming needs room to move. A clear desk is genuinely part of the setup.',
  },
  {
    condition_type: 'gaming_goal',
    condition_value: 'high_graphics',
    upgrade_name: 'Upgrade the GPU',
    priority: 'High',
    estimated_cost: 500,
    reason: 'Visual quality scales almost entirely with the graphics card.',
  },
  {
    condition_type: 'gaming_goal',
    condition_value: 'high_graphics',
    upgrade_name: 'Move from 1080p to 1440p',
    priority: 'High',
    estimated_cost: 300,
    reason: 'A sharper screen is what lets you actually see the detail the GPU is rendering.',
  },
  {
    condition_type: 'gaming_goal',
    condition_value: 'high_graphics',
    upgrade_name: 'Add more SSD storage',
    priority: 'Medium',
    estimated_cost: 120,
    reason: 'Graphically heavy games are the largest ones. They fill a 1TB drive quickly.',
  },
  {
    condition_type: 'gaming_goal',
    condition_value: 'streaming',
    upgrade_name: 'Add a second monitor',
    priority: 'High',
    estimated_cost: 200,
    reason: 'Useful for streaming, multitasking and Discord while gaming.',
  },
  {
    condition_type: 'gaming_goal',
    condition_value: 'streaming',
    upgrade_name: 'Upgrade to an XLR microphone setup',
    priority: 'Medium',
    estimated_cost: 200,
    reason: 'Audio is the first thing viewers judge. It is worth more than a camera upgrade.',
  },
  {
    condition_type: 'gaming_goal',
    condition_value: 'streaming',
    upgrade_name: 'Add a stream deck',
    priority: 'Low',
    estimated_cost: 100,
    reason: 'Scene switching without alt-tabbing keeps the stream looking professional.',
  },
  {
    condition_type: 'gaming_goal',
    condition_value: 'casual',
    upgrade_name: 'Upgrade the GPU later',
    priority: 'Medium',
    estimated_cost: 300,
    reason: 'If your taste in games grows into heavier titles, the GPU is what you replace first.',
  },
  {
    condition_type: 'gaming_goal',
    condition_value: 'balanced',
    upgrade_name: 'Upgrade to a 1440p monitor',
    priority: 'Medium',
    estimated_cost: 300,
    reason: 'A balanced build usually has GPU headroom left for a sharper screen.',
  },

  // ---- By setup style ----
  {
    condition_type: 'setup_style',
    condition_value: 'cozy',
    upgrade_name: 'Add warm ambient lighting',
    priority: 'Medium',
    estimated_cost: 50,
    reason: 'Warm bias lighting behind the desk is the core of a cozy setup.',
  },
  {
    condition_type: 'setup_style',
    condition_value: 'cozy',
    upgrade_name: 'Add desk speakers',
    priority: 'Low',
    estimated_cost: 80,
    reason: 'Not every session should need a headset on your head.',
  },
  {
    condition_type: 'setup_style',
    condition_value: 'cozy',
    upgrade_name: 'Upgrade to a better chair',
    priority: 'High',
    estimated_cost: 250,
    reason: 'Comfort is the whole point of a cozy setup, and the chair decides it.',
  },
  {
    condition_type: 'setup_style',
    condition_value: 'rgb',
    upgrade_name: 'Add RGB fans and a light bar',
    priority: 'Low',
    estimated_cost: 70,
    reason: 'Synced lighting across case, desk and wall is what pulls an RGB setup together.',
  },
  {
    condition_type: 'setup_style',
    condition_value: 'streamer',
    upgrade_name: 'Add a green screen',
    priority: 'Low',
    estimated_cost: 90,
    reason: 'A clean camera cutout makes a small stream look far more produced.',
  },
  {
    condition_type: 'setup_style',
    condition_value: 'minimalist',
    upgrade_name: 'Add a monitor arm',
    priority: 'Medium',
    estimated_cost: 90,
    reason: 'Lifting the monitor off its stand clears the desk and hides the cable.',
  },
  {
    condition_type: 'setup_style',
    condition_value: 'white',
    upgrade_name: 'Add a white monitor arm and cable covers',
    priority: 'Low',
    estimated_cost: 110,
    reason: 'A white setup only reads as clean when the cables disappear too.',
  },
  {
    condition_type: 'setup_style',
    condition_value: 'esports',
    upgrade_name: 'Add a low-distraction desk layout',
    priority: 'Low',
    estimated_cost: 60,
    reason: 'A large mat, no clutter and neutral lighting keep attention on the screen.',
  },
]
