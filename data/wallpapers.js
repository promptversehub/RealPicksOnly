// ═══════════════════════════════════════════════════════════
// data/wallpapers.js — Wallpaper database for RealPicksOnly
// Replace image URLs with your actual wallpaper paths.
// ═══════════════════════════════════════════════════════════

const WALLPAPERS = [
  // ─── DESKTOP ─────────────────────────────────────────────
  {
    id: "w1",
    title: "Neon City — Cyberpunk Skyline",
    type: "desktop",
    category: "ai",
    resolution: "3840×2160",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80",
    download: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=3840&q=100",
    tags: ["cyberpunk", "neon", "city", "ai"]
  },
  {
    id: "w2",
    title: "Deep Ocean Abstract",
    type: "desktop",
    category: "ai",
    resolution: "2560×1440",
    image: "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=800&q=80",
    download: "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=2560&q=100",
    tags: ["abstract", "ocean", "blue", "ai"]
  },
  {
    id: "w3",
    title: "Mountain at Dawn",
    type: "desktop",
    category: "nature",
    resolution: "3840×2160",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    download: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=3840&q=100",
    tags: ["mountain", "nature", "dawn", "4k"]
  },
  {
    id: "w4",
    title: "Geometric Vortex — AI Art",
    type: "desktop",
    category: "ai",
    resolution: "2560×1440",
    image: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800&q=80",
    download: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=2560&q=100",
    tags: ["geometric", "abstract", "vortex", "ai"]
  },
  {
    id: "w5",
    title: "Aurora Borealis — Iceland",
    type: "desktop",
    category: "nature",
    resolution: "3840×2160",
    image: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&q=80",
    download: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=3840&q=100",
    tags: ["aurora", "iceland", "nature", "4k"]
  },
  {
    id: "w6",
    title: "Dark Minimal — Workspace",
    type: "desktop",
    category: "minimal",
    resolution: "2560×1440",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80",
    download: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=2560&q=100",
    tags: ["dark", "minimal", "workspace", "abstract"]
  },
  {
    id: "w7",
    title: "Galaxy Spiral — Deep Space",
    type: "desktop",
    category: "space",
    resolution: "3840×2160",
    image: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800&q=80",
    download: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=3840&q=100",
    tags: ["space", "galaxy", "cosmos", "4k"]
  },
  {
    id: "w8",
    title: "Fluid Color Waves — AI",
    type: "desktop",
    category: "ai",
    resolution: "2560×1440",
    image: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=800&q=80",
    download: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=2560&q=100",
    tags: ["fluid", "colorful", "waves", "ai"]
  },

  // ─── MOBILE ──────────────────────────────────────────────
  {
    id: "m1",
    title: "Neon Gradient — AMOLED",
    type: "mobile",
    category: "ai",
    resolution: "1080×2400",
    image: "https://images.unsplash.com/photo-1614851099175-e5b30eb6f696?w=400&q=80",
    download: "https://images.unsplash.com/photo-1614851099175-e5b30eb6f696?w=1080&q=100",
    tags: ["neon", "amoled", "gradient", "ai"]
  },
  {
    id: "m2",
    title: "Dark Forest — Mobile",
    type: "mobile",
    category: "nature",
    resolution: "1080×2340",
    image: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&q=80",
    download: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1080&q=100",
    tags: ["forest", "dark", "nature", "mobile"]
  },
  {
    id: "m3",
    title: "Abstract Purple Smoke",
    type: "mobile",
    category: "ai",
    resolution: "1080×2400",
    image: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&q=80",
    download: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1080&q=100",
    tags: ["purple", "smoke", "abstract", "amoled"]
  },
  {
    id: "m4",
    title: "Minimal Black — Clean",
    type: "mobile",
    category: "minimal",
    resolution: "1080×2340",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80",
    download: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080&q=100",
    tags: ["minimal", "black", "clean", "mobile"]
  },
  {
    id: "m5",
    title: "Cosmos — Phone Background",
    type: "mobile",
    category: "space",
    resolution: "1080×2400",
    image: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400&q=80",
    download: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1080&q=100",
    tags: ["space", "cosmos", "stars", "mobile"]
  },
  {
    id: "m6",
    title: "AI Cityscape — Night",
    type: "mobile",
    category: "ai",
    resolution: "1080×2340",
    image: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&q=80",
    download: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1080&q=100",
    tags: ["city", "night", "ai", "mobile"]
  },
  {
  id: "m7",
  title: "Neon City 4K",
  type: "mobile",
  category: "ai",
  resolution: "3840×2160",
  image: "wallpapers/BMW M4 emerging from smoke.png",       // ← your file
  download: "wallpapers/BMW M4 emerging from smoke.png",    // ← same or full res version
  tags: ["car", "bmw", "ai"]
},
];

// ─── MY PRODUCTS ──────────────────────────────────────────
const MY_PRODUCTS = [
  {
    id: "mp1",
    title: "Ultimate Productivity Notion Template",
    description: "A comprehensive Notion workspace with habit tracker, goal planner, and project management system.",
    price: 149,
    image: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80",
    status: "available",
    buyLink: "#",
    tags: ["notion", "productivity", "template"]
  },
  {
    id: "mp2",
    title: "AI Wallpaper Pack Vol. 1 — 50 Wallpapers",
    description: "50 premium AI-generated wallpapers in 4K resolution. AMOLED, nature, cyberpunk and more.",
    price: 99,
    image: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=600&q=80",
    status: "available",
    buyLink: "#",
    tags: ["wallpapers", "ai", "4k"]
  },
  {
    id: "mp3",
    title: "Budget Tracker — Excel + Google Sheets",
    description: "Easy-to-use personal finance tracker. Track income, expenses, savings goals automatically.",
    price: 79,
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80",
    status: "available",
    buyLink: "#",
    tags: ["finance", "tracker", "excel"]
  },
  {
    id: "mp4",
    title: "Social Media Content Calendar 2025",
    description: "Plan 90 days of content in one template. Works for Instagram, YouTube, Twitter, LinkedIn.",
    price: 199,
    image: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&q=80",
    status: "coming-soon",
    buyLink: "#",
    tags: ["social-media", "content", "calendar"]
  },
  {
    id: "mp5",
    title: "Fitness Journal — Printable PDF Pack",
    description: "12-week progressive workout tracker, meal log, and body measurement journal. Print-ready.",
    price: 59,
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80",
    status: "coming-soon",
    buyLink: "#",
    tags: ["fitness", "journal", "printable"]
  },
  {
    id: "mp6",
    title: "Amazon Affiliate Starter Kit",
    description: "Complete guide + templates to start your own Amazon affiliate site. Includes niche research, setup checklist, and content templates.",
    price: 499,
    image: "https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=600&q=80",
    status: "coming-soon",
    buyLink: "#",
    tags: ["affiliate", "guide", "amazon"]
  }
];
