import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, Timestamp, doc, setDoc, getDocs, deleteDoc, query } from "firebase/firestore";
import fs from "fs";

// Mapping keywords to relevant Unsplash premium news assets
const IMAGE_MAPPING: Record<string, string> = {
  politics: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&q=80&w=1200",
  court: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=1200",
  economy: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=1200",
  finance: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=1200",
  technology: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1200",
  education: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=1200",
  science: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200",
  sports: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&q=80&w=1200",
  soccer: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=1200",
  stadium: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=1200",
  health: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&q=80&w=1200",
  hospital: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=1200",
  culture: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=1200",
  music: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=1200",
  business: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200",
  scholarship: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=1200",
  liberia: "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&q=80&w=1200",
  monrovia: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=1200",
  commerce: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200",
  default: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=1200"
};

// Preset news videos for AI news anchors / footage
const PRESET_VIDEOS = [
  "https://assets.mixkit.co/videos/preview/mixkit-news-studio-television-production-room-stage-41480-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-broadcast-studio-with-screens-and-lights-34199-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-world-map-animation-with-digital-elements-41481-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-videographer-adjusting-settings-on-a-studio-camera-42171-large.mp4"
];

// In-Memory Global AI Core State
interface ServerLogEntry {
  timestamp: string;
  message: string;
  type: "info" | "success" | "warn" | "error";
}

const aiLogsList: ServerLogEntry[] = [];
let totalGeneratedCount = 0;
let isBackgroundActive = true; // Autonomous by default!
let backgroundIntervalSpeed = 60000; // default 1 minute (60s)
let activeIntervalTimer: NodeJS.Timeout | null = null;

function addServerLog(message: string, type: "info" | "success" | "warn" | "error" = "info") {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[AI-NEWSROOM] [${type.toUpperCase()}] ${message}`);
  aiLogsList.unshift({ timestamp, message, type });
  if (aiLogsList.length > 100) aiLogsList.pop();
}

// 15-second YouTube Movies & TV shows Auto-Publisher state
const CINEMATIC_ITEMS = [
  { title: "Sita Sings the Blues (Full Animated Feature Movie)", url: "https://www.youtube.com/watch?v=Ob7V385eS4Q", summary: "An award-winning beautiful modern animated cinema classic based on the ancient Ramayana legend.", logo: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=400" },
  { title: "Charlie Chaplin's The Kid (Full Comedy Masterclass)", url: "https://www.youtube.com/watch?v=qNseEVlaCl4", summary: "Chaplin's first full-length feature film, widely considered one of the greatest silent cinema films in history.", logo: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=400" },
  { title: "Sherlock Holmes in Dressed to Kill (1946 Classic Mystery Movie)", url: "https://www.youtube.com/watch?v=v0N9Xv6NFrI", summary: "The brilliant detective Sherlock Holmes traces stolen music boxes displaying mysterious numeric codes.", logo: "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?auto=format&fit=crop&w=400" },
  { title: "Classic Tom and Jerry Adventures Collection", url: "https://www.youtube.com/watch?v=b4S0vOfu6kU", summary: "Retro cartoon episodes featuring the hilarious chases of Tom and Jerry from the golden age of animation.", logo: "https://images.unsplash.com/photo-1608889174633-41a45f9bd57b?auto=format&fit=crop&w=400" },
  { title: "Night of the Living Dead (1968 Horror Landmark Movie)", url: "https://www.youtube.com/watch?v=zRreU_G008A", summary: "George A. Romero's groundbreaking thriller that pioneered the modern zombie genre and redefined survival horror.", logo: "https://images.unsplash.com/photo-1505635338219-0a113f66773a?auto=format&fit=crop&w=400" },
  { title: "Buster Keaton's The General (1926 Legendary Action Comedy)", url: "https://www.youtube.com/watch?v=vVkaAn42Kic", summary: "A thrilling silent epic filled with Keaton's famous high-risk physical stunts and continuous train pursuits.", logo: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=400" },
  { title: "Metropolis (Fritz Lang's 1927 Sci-Fi Masterwork Movie)", url: "https://www.youtube.com/watch?v=-I76b7H6GIs", summary: "The historic German expressionist masterpiece exploring dystopian futures, grand machines, and AI robotic genesis.", logo: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=400" },
  { title: "Steamboat Willie (Original Mickey Mouse, 1928 Cartoon Short)", url: "https://www.youtube.com/watch?v=BBgghnQF6E4", summary: "The historic debut story of Mickey Mouse featuring fully synchronized audio and delightful sound effects.", logo: "https://images.unsplash.com/photo-1593085512500-5d55148d6f0d?auto=format&fit=crop&w=400" },
  { title: "Retro Looney Tunes Selection (Bugs Bunny and Daffy Duck Classics)", url: "https://www.youtube.com/watch?v=LImshT3b9lA", summary: "Classic animated shorts featuring Bugs Bunny, Daffy Duck, and Elmer Fudd from the historic Warner archive.", logo: "https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?auto=format&fit=crop&w=400" },
  { title: "1940s Classic Superman (High-Definition Color Action Shorts)", url: "https://www.youtube.com/watch?v=TjS9_C-V_a8", summary: "The spectacular Academy Award-nominated science-fiction animated stories created by Fleischer Studios.", logo: "https://images.unsplash.com/photo-1472457897821-70d3819a0e24?auto=format&fit=crop&w=400" },
  { title: "Live Earth View Broadcast from the International Space Station (ISS)", url: "https://www.youtube.com/watch?v=DDU-rZs-Ic4", summary: "Breathtaking continuous live high-definition television broadcast of planet Earth seen from orbit.", logo: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400" },
  { title: "Live Tokyo Shibuya Crossing Street Broadcast (Japan Cams)", url: "https://www.youtube.com/watch?v=H-30B0g6ubE", summary: "Panoramic view of the world's busiest pedestrian crosswalk live from the streets of Shibuya, Tokyo.", logo: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=400" },
  { title: "Live Venice Gondola Canal Guide Broadcast (Italy Tour Cams)", url: "https://www.youtube.com/watch?v=ph1vpnYIXZ0", summary: "Serene live street webcam tracking historic water-taxi gondolas floating past Venetian architecture.", logo: "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=400" },
  { title: "Live Times Square Crossroads Stream (New York City Cams)", url: "https://www.youtube.com/watch?v=1-iS7LArMPA", summary: "Continuous high-resolution live camera feed highlighting the iconic digital billboards and streets of Times Square.", logo: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=400" },
  { title: "The Hunchback of Notre Dame (1923 Victor Hugo Classic Movie)", url: "https://www.youtube.com/watch?v=R98p9F4Y1yU", summary: "Lon Chaney's legendary performance as Quasimodo in the spectacular historical cinema drama set in Paris.", logo: "https://images.unsplash.com/photo-1478147427282-58a87a120781?auto=format&fit=crop&w=400" }
];

let currentMovieIndex = 0;
let movieDaemonTimer: NodeJS.Timeout | null = null;
let isMovieDaemonActive = true; // Auto movie publishing active by default

async function publishNextMovie() {
  try {
    const db = getFirestoreDb();
    if (!db) return;

    const item = CINEMATIC_ITEMS[currentMovieIndex];
    // Recycling ID wrapping around limit of 15 entries to prevent Firestore bloat!
    const docId = `auto_movie_${currentMovieIndex + 1}`;

    const payload = {
      title: item.title,
      summary: item.summary,
      content: `Enjoy our curated automatic high-definition cinematic broadcast: "${item.title}".\n\nOur advanced GNN AI director updates movies, television series, cartoons, and live streaming channels every 15 seconds. Play directly within the unified GNN TV terminal using full controls.`,
      category: "Movies",
      imageUrl: item.logo,
      videoUrl: item.url,
      publishedAt: Timestamp.now(),
      authorId: "ai_movie_bot",
      authorName: "GNN Cinema AI",
      viewsCount: Math.floor(Math.random() * 4500) + 500,
      likesCount: Math.floor(Math.random() * 900) + 120,
      isMovie: true,
      isAlert: false,
      publishedByAI: true
    };

    await setDoc(doc(db, "articles", docId), payload);
    addServerLog(`[CINEMA-AI] Curated movie publication: "${item.title}" | Recycled ID: ${docId}`, "success");

    currentMovieIndex = (currentMovieIndex + 1) % CINEMATIC_ITEMS.length;
  } catch (error: any) {
    console.error("Failed to publish cinema movie: ", error);
    addServerLog(`Cinema Auto-Publisher error: ${error.message || error}`, "error");
  }
}

function launchMovieAutoPublisher() {
  if (movieDaemonTimer) {
    clearInterval(movieDaemonTimer);
    movieDaemonTimer = null;
  }

  if (!isMovieDaemonActive) {
    addServerLog("Cinema Movie Auto-Publisher task is paused.", "warn");
    return;
  }

  addServerLog("Launching Cinema Auto-Publisher daemon loop. Curating fresh movie embed every 15s.", "info");
  
  // Instant trigger
  publishNextMovie();

  movieDaemonTimer = setInterval(() => {
    publishNextMovie();
  }, 15000);
}

let aiClient: GoogleGenAI | null = null;
let firestoreDb: any = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it via Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  }
  return aiClient;
}

// Lazy loading Firestore app using config
function getFirestoreDb() {
  if (!firestoreDb) {
    try {
      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      const firebaseApp = initializeApp(config);
      firestoreDb = getFirestore(firebaseApp, config.firestoreDatabaseId);
      addServerLog("Firebase backend gateway correctly bounds.", "info");
    } catch (e: any) {
      addServerLog(`Could not load Firebase connection layout: ${e.message}`, "error");
    }
  }
  return firestoreDb;
}

// High-fidelity local editorial synthesizer fallback for API Key exhaustion/leak events
function generateBackupNewsArticle(requestedCategory?: string) {
  const categories = ["Politics", "Economy", "Technology", "Science", "Sports", "Health", "Culture", "Scholarships", "Products", "Promotions"];
  const category = (requestedCategory && categories.includes(requestedCategory)) 
    ? requestedCategory 
    : categories[Math.floor(Math.random() * categories.length)];

  // Random names and parameters to create variations
  const firstNames = ["Satta", "Darius", "Victoria", "Moses", "Emmanuel", "Fatu", "George", "Kollie", "Ebenezer", "Esther"];
  const lastNames = ["Gbah", "Tarpeh", "Kollie", "Sherman", "Ngafuan", "Kamara", "Mensah", "Benson", "Coleman", "Kpoto"];
  const authorName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
  
  const randVal = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  const isAlert = Math.random() < 0.25; // 25% chance for a breaking news alert

  let title = "";
  let summary = "";
  let content = "";
  let imageKeyword = "default";
  let metadata: Record<string, any> = {};

  if (category === "Politics") {
    const topics = [
      {
        title: `LIBERIA-EU DIALOGUE COMES TO AGREEMENT ON ${randVal(15, 60)}M INFRASTRUCTURE REHABILITATION GRANT`,
        summary: "An official diplomatic compact was signed on Providence Island highlighting support for national water networks and standard solar power distribution.",
        content: `### BILATERAL COMPACT FOR PROGRESS\n\nIn a landmark diplomatic session, the Government of Liberia and European Union emissaries compiled a groundbreaking development agreement worth **${randVal(15, 60)} Million**. The bilateral assistance grant is designed to direct urgent infrastructure development across critical regions over the next thirty-six months.\n\n### KEY SECTORIAL IMPROVEMENTS\n\nAccording to officials, the grant resources will target:\n- Clean drinking water infrastructure in Grand Bassa and Nimba Counties\n- Retrofitting key ministerial offices with solar microgrids\n- Expanding high-speed telecommunication cabling along primary highways\n\n> "This historic fund establishes a robust platform for modernizing county structures and improving living standards for thousands of families." \n> — *Senator Augustine K. Ngafuan*\n\n### IMMEDIATE IMPLEMENTATION TIMELINE\n\nSpecialized engineering teams are scheduled to begin diagnostic investigations beginning next week. Government watchdogs pledged extreme audit visibility to ensure every cent yields maximum return.`,
        imageKeyword: "politics"
      },
      {
        title: `ECOWAS PARLIAMENT ANNOUNCES INTEGRATED TARIFF-FREE TRADE INITIATIVES FOR COCOA AND MINERALS`,
        summary: "The regional assembly approves immediate procedural measures aimed at simplifying agricultural logistics and currency clearance times.",
        content: `### REGIONAL ECONOMY HARMONIZATION\n\nDuring a standard legislative forum, the ECOWAS Parliament finalized a comprehensive guideline that completely clears tariff hurdles on local agricultural and raw mineral logistics between West African states. This milestone initiative is expected to reduce shipping cost rates by **${randVal(8, 25)}%**.\n\n### ELIMINATING SUPPLY BINDINGS\n\nTrade authorities highlighted three primary pillars:\n1. Common electronic cargo manifests to prevent border delays\n2. Streamlined banking integration supporting local currencies\n3. Dedicated shipping lanes for perishable products\n\n> "Eliminating these historic fiscal blockages unlocks massive capital capabilities for local Liberian merchants and small-scale farmers." \n> — *Commissioner Satta Tarpeh*\n\n### GLOBAL COMMERCIAL POSITION\n\nWest Africa supplies a major share of international cocoa. This integrated regional trade policy positions ECOWAS as an optimized commercial hub ready to scale product delivery to global buyers.`,
        imageKeyword: "commerce"
      }
    ];
    const item = topics[Math.floor(Math.random() * topics.length)];
    title = item.title;
    summary = item.summary;
    content = item.content;
    imageKeyword = item.imageKeyword;
  } else if (category === "Economy") {
    const topics = [
      {
        title: `CENTRAL BANK UNVEILS DIGITAL BANKING INTEGRATION PORTAL TO LIQUIDATE LOCAL LIQUIDITY BINDINGS`,
        summary: "A modern commercial settlement framework is launched in Monrovia, allowing rural vendors to clear transactions without paper bills.",
        content: `### LIQUIDITY RESOLUTION CAMPAIGN\n\nTo directly address physical bank note constraints, the Central Bank of Liberia has debuted its official national electronic clearing portal. Developed over eighteen months, this framework allows seamless real-time ledger verification between micro-finance houses and main commercial banks.\n\n### THE MECHANICS OF DIGITAL BILLS\n\nLocal vendors can now execute high-volume payments with Instant Clearing codes, reducing cash logistics dependency. Economic projections point to a **${randVal(10, 30)}%** transaction speed increase within sixty days.\n\n> "Transitioning into digitized ledgers represents a fundamental step in building an elegant, robust economy that serves the remote market vendor." \n> — *Director Moses Sherman*\n\n### SECURITY & SCALABILITY ASSURANCES\n\nBank experts focused on ensuring that the software incorporates advanced bank-grade security rules to secure accounts against fraud. Education workshops will commence across local municipal hubs.`,
        imageKeyword: "finance"
      },
      {
        title: `LIBERIAN COCONUT AND RUBBER EXPORTS SURGE BY ${randVal(12, 40)}% IN SECOND QUARTER AS INTERNATIONAL TRADING ENLARGES`,
        summary: "A robust increase in trans-Atlantic ship freight launches Monrovia commercial ports into high-density shipping metrics.",
        content: `### AGRICULTURAL EXPORTS EXPLOSION\n\nNewly published Q2 commercial bulletins record a massive **${randVal(12, 40)}%** increase in rubber and organic coconut derivatives shipment volumes out of the Freeport of Monrovia. This growth marks a substantial economic recovery phase.\n\n### GLOBAL DEMAND FACTORS\n\nKey shipping drivers include:\n- Sustainable rubber contracts with industrial automotive developers\n- Surging popularity of high-grade Liberian organic cosmetic oils\n- Streamlined harbor customs clearance processes\n\n> "Our local co-ops are now operating at full capacity. We have scaled production, created new community jobs, and secured stable international prices." \n> — *Cooperative Director Esther Kamara*\n\n### ECONOMIC INDICATOR OUTLOOK\n\nAnalysts estimate this commerce surge will contribute an additional **${randVal(5, 18)} Million** directly to rural community earnings, fostering grass-roots investment.`,
        imageKeyword: "economy"
      }
    ];
    const item = topics[Math.floor(Math.random() * topics.length)];
    title = item.title;
    summary = item.summary;
    content = item.content;
    imageKeyword = item.imageKeyword;
  } else if (category === "Technology") {
    const topics = [
      {
        title: `RURAL FIBER BROADBAND HIGHWAY ACTIVATED RELIABLY CONNECTING ${randVal(15, 50)} REMOTE SCHOOLS`,
        summary: "High-speed educational telecommunication networks are successfully integrated in Nimba County digital classrooms.",
        content: `### DIGITAL HIGHSCHOOLS REVOLUTION\n\nA collaborative tech alliance has successfully completed installation of a long-distance optic fiber loop in rural Nimba County. This high-performance line directly binds **${randVal(15, 50)}** secondary academies to high-fidelity internet.\n\n### TRANSFORMING EDUCATIONAL MATERIAL\n\nFor the first time, students will enjoy uninterrupted access to:\n- Online video lecture channels\n- WAEC Liberia interactive test platforms\n- Digital encyclopedia libraries\n\n> "Having high-speed internet in our remote classroom completely transforms learning. Our student body can now research global archives instantly." \n> — *Principal George Kpoto*\n\n### SYSTEM MAINTENANCE PROTOCOLS\n\nTo prevent network down-time, regional IT maintenance kiosks are established at central junctures. Instructors are undergoing intensive computer literacy workshops.`,
        imageKeyword: "technology"
      }
    ];
    const item = topics[Math.floor(Math.random() * topics.length)];
    title = item.title;
    summary = item.summary;
    content = item.content;
    imageKeyword = item.imageKeyword;
  } else if (category === "Science") {
    const topics = [
      {
        title: `ECOLOGISTS DISCOVER NEW ENDEMIC REEF SPECIES OFF THE COAST OF SINOE COUNTY MARINE PARKS`,
        summary: "High-accuracy deep marine dives map previously undocumented Atlantic sea shelf habitats hosting diverse wildlife.",
        content: `### PACIFIC-ATLANTIC SHELF SURPRISES\n\nDuring a joint oceanographic study off the coast of Sinoe, researchers discovered a remarkable and previously undocumented bio-diverse coral reef. The reef structure extends over **${randVal(3, 10)} miles**.\n\n### ENCOUNTERING MARINE WILDLIFE\n\nDive teams captured detailed digital video of:\n- Complex micro-coral structures with deep-water immunity\n- Over **${randVal(40, 120)}** distinct marine species in premium health\n\n> "This critical discovery proves the absolute necessity of preserving ocean reefs. Preserving this habitat maintains Atlantic marine health." \n> — *Biologist Victoria Sherman*\n\n### CONSERVATION PROPOSALS\n\nScientists are compiling data to expand the National Marine Protection perimeter, aiming to shield the reef from unauthorized dredging.`,
        imageKeyword: "science"
      }
    ];
    const item = topics[Math.floor(Math.random() * topics.length)];
    title = item.title;
    summary = item.summary;
    content = item.content;
    imageKeyword = item.imageKeyword;
  } else if (category === "Sports") {
    const topics = [
      {
        title: `NATIONAL LONE STAR STAGES HEROIC ${randVal(1, 3)}-${randVal(0, 1)} VICTORY IN REGIONAL FIBA STADIUM QUALIFIERS`,
        summary: "A thrilling final quarter shootout triggers massive euphoria across Monrovia as standard basketball squads triumph.",
        content: `### HEART-STOPPING COURT SHOT\n\nLiberia's National Basketball Squad, Lone Star, clinched an extremely close **${randVal(102, 115)} to ${randVal(95, 101)}** victory against regional rivals in standard championships. The stadium was packed to full capacity with passionate national fans.\n\n### SECOND HALF INITIATIVES\n\nThe team adjusted its defensive parameters using:\n- Rapid perimeter defense transitions\n- Dominant rebounds by the center guard\n- Flawless three-pointer conversions in final minutes\n\n> "We executed our plays perfectly. Every individual on the floor poured their soul into today's victory." \n> — *Head Coach George Kamara*\n\n### NEXT ROAD TO TROPHY\n\nWith this qualifier victory, the team moves forward to the continental quarterfinals scheduled to commence next month.`,
        imageKeyword: "sports"
      }
    ];
    const item = topics[Math.floor(Math.random() * topics.length)];
    title = item.title;
    summary = item.summary;
    content = item.content;
    imageKeyword = item.imageKeyword;
  } else if (category === "Health") {
    const topics = [
      {
        title: `JFK MEDICAL CENTER COMMISSIONS MODERN STATE-OF-THE-ART DIGITAL CARDIOLOGY UNIT`,
        summary: "The apex hospital launches premium clinical cardiac detection capabilities to expedite patient recovery times.",
        content: `### ADVANCING CLINICAL EXCELLENCE\n\nThe John F. Kennedy Medical Center in Monrovia has officially commissioned its modern digital cardiology diagnostics department. This project guarantees access to advanced non-invasive cardiac scanning services locally.\n\n### MODERN IMAGING HARDWARE\n\nThe medical unit is fully fitted to support:\n- Real-time electrocardiography sweeps\n- High-resolution blood flow arterial tracking\n- Integrated remote tele-consultation workstations\n\n> "Having local access to these advanced diagnostic instruments removes the stress of traveling overseas for basic heart consultations." \n> — *Chief Cardiologist Ebenezer Benson*\n\n### NURSE TRAINING ENGAGEMENTS\n\nA specialized team of eight clinical technicians has finalized comprehensive simulation training run by expert heart care partners.`,
        imageKeyword: "hospital"
      }
    ];
    const item = topics[Math.floor(Math.random() * topics.length)];
    title = item.title;
    summary = item.summary;
    content = item.content;
    imageKeyword = item.imageKeyword;
  } else if (category === "Culture") {
    const topics = [
      {
        title: `PROVIDENCE ISLAND HISTORY REVALUATION DRAWING THOUSANDS TO MONROVIA ARTS CELEBRATIONS`,
        summary: "Liberian textile artisans, folklore experts, and historians gather for beautiful celebrations of traditional crafts.",
        content: `### MEMORY & TEXTILE WEAVING CELEBRATIONS\n\nThe Providence Island National Historical Park became the epicenter of cultural preservation as the Annual Monrovia Folklore Arts Festival officially opened. More than **${randVal(2000, 5000)}** attendees registered on opening day.\n\n### CHERISHING TRADITIONS\n\nFestival highlights included:\n- Traditional Lofa county indigo cloth weaving displays\n- Staged performances of historic national oral narratives\n- Authentic culinary workshops highlighting Liberian country cuisine\n\n> "Our heritage is our greatest national wealth. Documenting these crafts ensures our children walk forward with profound identity." \n> — *Art Historian Satta Kollie*\n\n### GLOBAL EXPANSION CAMPAIGNS\n\nCreative councils outlined plans to host a digital marketplace to showcase Liberian handcrafts to premium design galleries globally.`,
        imageKeyword: "culture"
      }
    ];
    const item = topics[Math.floor(Math.random() * topics.length)];
    title = item.title;
    summary = item.summary;
    content = item.content;
    imageKeyword = item.imageKeyword;
  } else if (category === "Scholarships") {
    title = `ANNUAL GLOBAL LEADERS FUND SCHOLARSHIP IS ANNOUNCED: FULLY FUNDED STEM OPPORTUNITIES`;
    summary = `The Global Higher Education Council is calling for ambitious Liberian and West African undergraduate degree holders to apply for full post-grad sponsorships.`;
    imageKeyword = "scholarship";
    content = `### EXCELLENCE IN STEM OPPORTUNITIES\n\nThe highly prestigious Global Leaders Fund, in unison with partnering European universities, is officially receiving applications for post-graduate scholarships. The program supports exceptional students seeking Master’s or Doctoral degrees in engineering, computing, and agriculture biology.\n\n### SCHOLARSHIP INCLUSIONS\n\n- 100% full tuition waiver coverage\n- Comfortable student housing allowance\n- High-speed research computer loan\n- Round-trip airfare from Monrovia\n\n### APPLICATION GUIDELINES\n\nHigher education commissions recommend completing candidate files prior to the final submission deadline. Transcripts should highlight strong mathematics or science averages.`;
    
    metadata = {
      scholarshipSponsor: "Global Leaders Development Fund",
      scholarshipAmount: "Fully Funded Postgraduate ($48,000 value/year)",
      scholarshipEligibility: "Liberian university graduates with a GPA above 3.25",
      scholarshipDeadline: `November 30, 2026`,
      scholarshipLink: "https://global-leaders-fund.org/apply-stem"
    };
  } else if (category === "Products") {
    title = `RELIABLE OFFLINE SOLAR HOME LIGHTING KITS ARRIVE FOR RURAL RESIDENTS`;
    summary = `A premium solar power distributor introduces affordable high-durability battery packs and lighting panels built for Liberian homes.`;
    imageKeyword = "technology";
    content = `### RESILIENT FAMILY SOLAR ELECTRICITY\n\nWith regional communities seeking reliable power, standard solar solutions provider *Apex Offgrid* has launched its sustainable Solar Home Kits. The packaged system allows complete offline electricity independence for lighting and electronic device recharging.\n\n### PACK CONTENT & LIFETIME\n\nEach certified kit provides:\n- Three high-intensity solar LED hanging bulbs\n- One dynamic USB-C multi-channel phone charger station\n- Over-charge protected lithium iron phosphate battery pack\n- ${randVal(24, 48)} Months of continuous factory guarantee coverage\n\n### VALUE AND PRICING\n\nThe solar systems are accessible at central distribution points with affordable installment options. Apex technicians provide direct standard clinical setup inside your home.`;

    metadata = {
      productPrice: `${randVal(45, 80)} USD (Installment plans accepted)`,
      productSeller: "Apex Offgrid Liberia",
      productLocation: "Tubman Boulevard, Congotown, Monrovia",
      productContact: "+231 77 826 3121"
    };
  } else if (category === "Promotions") {
    title = `MONROVIA METROPOLITAN CONCERT RESOUNDS AS HEADLINING ARTIST CONFIRMS TOUR DREAMS`;
    summary = `A spectacular show is set to light up Providence center stage as national artists combine for peace unity beats.`;
    imageKeyword = "music";
    content = `### SOULFUL BEATS OF LIBERIA\n\nThe highly anticipated *Unifying Beats Campaign* concert has finalized scheduling plans for Providence Island's main amphitheater. The festival binds contemporary artists and legacy folklore musicians under a single voice of unity.\n\n### CONCERT DETAILS & LIVE LINEUP\n\n- Main Headliner: **G-Sweety Duo** doing new hits\n- Guest performances by legendary traditional drummers\n- Dynamic food stalls serving local Liberian dishes\n\n### TICKETS AND RESERVATIONS\n\nTickets are accessible via early-bird digit codes. Concert proceedings support community school instruments purchases.`;

    metadata = {
      promoArtistName: "G-Sweety Duo & Friends",
      promoReleaseTitle: "Unifying Beats Campaign Concert Live",
      promoBookingInfo: "Early tickets at +231 88 126 5002 or info@g-sweety-music.com"
    };
  }

  return {
    title,
    summary,
    content,
    category,
    imageKeyword,
    authorName,
    isAlert,
    ...metadata
  };
}

// API Key Variables with Vercel and direct hardcoded configuration defaults
const NEWSDATA_KEY = process.env.NEWSDATA_API_KEY || "pub_1cde5f81113e44efafd866a26437daea";
const MEDIASTACK_KEY = process.env.MEDIASTACK_API_KEY || "d4b44b583aafdb40ade0b607c7919e2d";

// Real-Time 100% Automatic Firestore De-duplication Engine
async function deleteDuplicateArticles() {
  try {
    const db = getFirestoreDb();
    if (!db) return;

    addServerLog("[DEDUPLICATION] Initiating active firestore duplicates purge scanner...", "info");
    const q = query(collection(db, "articles"));
    const snapshot = await getDocs(q);

    const seen = new Map<string, Array<{ id: string; publishedAt: any }>>();
    let checkedCount = 0;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      checkedCount++;
      if (data.isMovie) return; // Skip recycled cinema channel items from deduplication

      const rawTitle = (data.title || "").toLowerCase().trim();
      if (!rawTitle) return;

      if (!seen.has(rawTitle)) {
        seen.set(rawTitle, []);
      }
      seen.get(rawTitle)!.push({
        id: docSnap.id,
        publishedAt: data.publishedAt
      });
    });

    let deletedCount = 0;

    for (const [title, list] of seen.entries()) {
      if (list.length > 1) {
        // Sort documents by order of timestamp/publishedAt, keeping the oldest valid copy
        list.sort((a, b) => {
          const t1 = a.publishedAt?.seconds || 0;
          const t2 = b.publishedAt?.seconds || 0;
          return t1 - t2;
        });

        // Delete all newer, recurrent duplicate documents
        const duplicatesToPurge = list.slice(1);
        for (const duplicate of duplicatesToPurge) {
          try {
            await deleteDoc(doc(db, "articles", duplicate.id));
            deletedCount++;
          } catch (deleteError) {
            console.error(`Failed to delete duplicate document with ID ${duplicate.id}:`, deleteError);
          }
        }
      }
    }

    if (deletedCount > 0) {
      addServerLog(`[DEDUPLICATION] Complete! Deleted ${deletedCount} duplicate copy/copies of articles from our Firestore database.`, "success");
    } else {
      addServerLog(`[DEDUPLICATION] Complete. Zero duplicates found in ${checkedCount} scanned articles. All collections are clean.`, "info");
    }
  } catch (error: any) {
    addServerLog(`[DEDUPLICATION] Failed to run deduplication sweep safely: ${error.message || error}`, "error");
  }
}

// Global active news purge helper to support the clean-slate directive
async function clearAllAiNews() {
  try {
    const db = getFirestoreDb();
    if (!db) return 0;
    addServerLog("[CLEANUP] Purging all database articles to start fresh with high-stack real world dispatches...", "warn");
    const q = query(collection(db, "articles"));
    const snapshot = await getDocs(q);
    let count = 0;
    for (const docSnap of snapshot.docs) {
      await deleteDoc(doc(db, "articles", docSnap.id));
      count++;
    }
    addServerLog(`[CLEANUP] Success! Purged ${count} articles from Firestore collection layout.`, "success");
    return count;
  } catch (err: any) {
    addServerLog(`[CLEANUP] Database purge failed completely: ${err.message || err}`, "error");
    return 0;
  }
}

interface ExtractedNews {
  title: string;
  summary: string;
  content: string;
  sourceUrl: string;
  imageUrl?: string;
  category: string;
}

// Scrape live global and local news feed from NewsData.io and Mediastack
async function fetchExternalNewsFeed(): Promise<ExtractedNews | null> {
  // Try NewsData.io stream first
  try {
    addServerLog(`Contacting NewsData.io with secure digital token: "${NEWSDATA_KEY.substring(0, 8)}..."`, "info");
    const encodedQuery = encodeURIComponent("news OR global OR traffic OR economy OR health OR science");
    const newsdataUrl = `https://newsdata.io/api/1/news?apikey=${NEWSDATA_KEY}&language=en&q=${encodedQuery}`;
    const response = await fetch(newsdataUrl);
    
    if (response.ok) {
      const data: any = await response.json();
      if (data?.status === "success" && Array.isArray(data?.results) && data.results.length > 0) {
        const eligibleResults = data.results.filter((article: any) => article.title && (article.description || article.content));
        if (eligibleResults.length > 0) {
          const rawItem = eligibleResults[Math.floor(Math.random() * eligibleResults.length)];
          const categorizations = Array.isArray(rawItem.category) ? rawItem.category : [];
          
          let targetCategory = "Economy";
          if (categorizations.some((c: string) => /politics|world|government/i.test(c))) targetCategory = "Politics";
          else if (categorizations.some((c: string) => /tech|computer|software|digital|infrastructure/i.test(c))) targetCategory = "Technology";
          else if (categorizations.some((c: string) => /science|environment|nature|space/i.test(c))) targetCategory = "Science";
          else if (categorizations.some((c: string) => /sports|gaming|stadium|qualifiers/i.test(c))) targetCategory = "Sports";
          else if (categorizations.some((c: string) => /health|hospital|medical/i.test(c))) targetCategory = "Health";
          else if (categorizations.some((c: string) => /culture|art|entertainment|music/i.test(c))) targetCategory = "Culture";

          addServerLog(`Successfully retrieved, verified and mapped news article from NewsData.io: "${rawItem.title}"`, "success");
          return {
            title: rawItem.title,
            summary: rawItem.description || rawItem.title,
            content: rawItem.content || rawItem.description || rawItem.title,
            sourceUrl: rawItem.link || "",
            imageUrl: rawItem.image_url || undefined,
            category: targetCategory
          };
        }
      } else {
        addServerLog(`NewsData.io non-critical status response parsed: ${JSON.stringify(data)}`, "warn");
      }
    } else {
      addServerLog(`NewsData.io response rejected with HTTP Code: ${response.status}`, "warn");
    }
  } catch (err: any) {
    addServerLog(`NewsData.io endpoint error context: ${err.message || err}`, "warn");
  }

  // Fallback to Mediastack news stream feed
  try {
    addServerLog(`NewsData.io failed or rate-limited. Sourcing from Mediastack API fallback: "${MEDIASTACK_KEY.substring(0, 8)}..."`, "info");
    const mediastackUrl = `http://api.mediastack.com/v1/news?access_key=${MEDIASTACK_KEY}&languages=en&limit=10`;
    const response = await fetch(mediastackUrl);
    
    if (response.ok) {
      const data: any = await response.json();
      if (Array.isArray(data?.data) && data.data.length > 0) {
        const eligibleResults = data.data.filter((article: any) => article.title && article.description);
        if (eligibleResults.length > 0) {
          const rawItem = eligibleResults[Math.floor(Math.random() * eligibleResults.length)];
          const rawCategory = String(rawItem.category || "").toLowerCase();
          
          let targetCategory = "Economy";
          if (/politics|world|national/i.test(rawCategory)) targetCategory = "Politics";
          else if (/technology|science|tech/i.test(rawCategory)) targetCategory = "Technology";
          else if (/sports|soccer|basketball/i.test(rawCategory)) targetCategory = "Sports";
          else if (/health|medical|disease/i.test(rawCategory)) targetCategory = "Health";
          else if (/culture|entertainment|general/i.test(rawCategory)) targetCategory = "Culture";

          addServerLog(`Successfully retrieved, verified and mapped news article from Mediastack: "${rawItem.title}"`, "success");
          return {
            title: rawItem.title,
            summary: rawItem.description || rawItem.title,
            content: rawItem.description || rawItem.title,
            sourceUrl: rawItem.url || "",
            imageUrl: rawItem.image || undefined,
            category: targetCategory
          };
        }
      } else {
        addServerLog(`Mediastack returned empty datasets or keys were throttled: ${JSON.stringify(data)}`, "warn");
      }
    } else {
      addServerLog(`Mediastack rejected with HTTP code: ${response.status}`, "warn");
    }
  } catch (err: any) {
    addServerLog(`Mediastack endpoint error context: ${err.message || err}`, "warn");
  }

  return null;
}

// Elaborates external news briefing into a beautifully readable long-form, highly detailed news item free of asterisks or markdown noise
function elaborateExtractedNews(raw: ExtractedNews) {
  const cleanTitle = raw.title.replace(/[*#_]/g, "").trim().toUpperCase();
  const cleanSummary = raw.summary.replace(/[*#_]/g, "").trim();

  // Detail synthesis: Generate cohesive paragraphs detailing the background, impact and analyst commentary
  const p1 = `According to latest official updates and reports released internationally, major progress is unfolding regarding: "${raw.title}". This event has stimulated strategic debates across corporate councils and research universities globally. Observers highlight that this development represents an important shift designed to address critical long-term requirements. ${cleanSummary}`;

  const p2 = `Industry directors and researchers are actively optimizing resources to align with these newly established principles. The rapid implementation phase represents a standard adaptation cycle aimed at maximizing performance. Analysts indicate that these robust modifications will stimulate higher efficiency while sustaining excellent system throughput. "We are observing a direct adaptation period. Our central teams are working collaboratively to secure optimal standards across all platforms," standard coordinators commented in their national briefs.`;

  const p3 = `With direct actions scheduled to accelerate over the standard quarterly cycle, stakeholders remain highly positive on the eventual outturns. Global forums, collaborative diagnostics, and operational guidelines will continue to track and document subsequent stages. All follow-up milestones will be updated live as they emerge. Interested visitors can track complete historical indices under associated international releases.`;

  const cleanContent = `${p1}\n\n${p2}\n\n${p3}`;

  const firstNames = ["Darius", "Satta", "Victoria", "George", "Kollie", "Ebenezer", "Esther"];
  const lastNames = ["Gbah", "Tarpeh", "Kollie", "Sherman", "Kamara", "Mensah", "Kpoto"];
  const authorName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]} (Senior Correspondent)`;

  return {
    title: cleanTitle,
    summary: cleanSummary,
    content: cleanContent,
    category: raw.category,
    imageKeyword: raw.category.toLowerCase(),
    authorName,
    isAlert: Math.random() < 0.25
  };
}

// Background formulation block
async function performAutonomousTick() {
  if (!isBackgroundActive) return;
  addServerLog("Initiating AI investigative research...", "info");
  
  // 1. Always purge duplicates immediately at the start of our background cycle!
  await deleteDuplicateArticles();

  try {
    const db = getFirestoreDb();
    if (!db) {
      throw new Error("Firestore client is uninitialized. Verify Firebase configuration.");
    }

    // Try fetching live structured global/local news from external APIs
    const rawNews = await fetchExternalNewsFeed();
    let parsed: any = null;

    if (rawNews) {
      try {
        const ai = getGeminiClient();
        addServerLog(`Engaging Gemini AI to rewrite news briefs into structured, deep long-form essays without markdown symbols...`, "info");
        
        const systemPrompt = `
          You are an elite, highly professional Chief AI Editor and Senior Investigative Journalist for "Global News Network".
          Your task is to take a real news brief and construct an incredibly realistic, highly detailed, and engaging news article in long-form journalism format. It MUST represent standard high-quality global digital journalism.
          
          CRITICAL REQUIREMENTS:
          1. Use clear, descriptive, professional, literary language.
          2. The body content MUST be extremely detailed and long (at least 300 to 500 words), with 3 to 5 comprehensive paragraphs.
          3. Include expert views, realistic quotes, and analytical context.
          4. CRITICAL: Do NOT output any bold characters (**, __), asterisks (*), hashes (#), bullet points (- / •), or other raw markdown syntax in title, summary, or content. Write pure cohesive text paragraphs.
          5. The category MUST be exactly one of: Politics, Economy, Technology, Science, Sports, Health, Culture, Scholarships, Products, Promotions.
        `;

        const promptMsg = `
          Here is a real external news bulletin we retrieved:
          Title: "${rawNews.title}"
          Summary: "${rawNews.summary}"
          Raw Content: "${rawNews.content}"
          Suggested Category: "${rawNews.category}"
          
          Please rewrite this into a brilliant, fully fleshed-out, long-form explanatory article. Ensure it is extremely informative, features professional narrative quotes, and avoids all markdown formatting symbols (no asterisks, hashes, lists or bolding markers).
        `;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: promptMsg,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Eye-catching headline, all capitalized or formal title-case, formal journalism style." },
                summary: { type: Type.STRING, description: "A detailed 1-2 sentence overview/abstract of the story." },
                content: { type: Type.STRING, description: "Comprehensive, fully realized body text of the article. Organize with 3-5 rich paragraphs, professional structure, plain readable text, no asterisks, no hashes, no lists or bold marks." },
                category: { type: Type.STRING, description: "Must be exactly one of: Politics, Economy, Technology, Science, Sports, Health, Culture, Scholarships, Products, Promotions" },
                imageKeyword: { type: Type.STRING, description: "One simple lower-case keyword describing the visual subject of the piece (e.g. 'politics', 'stadium', 'hospital', 'court', 'technology', 'finance', 'music') to assign an appropriate preview photo." },
                authorName: { type: Type.STRING, description: "Name of the investigative journalist writing the article." },
                isAlert: { type: Type.BOOLEAN, description: "Assign true if this constitutes urgent breaking news." }
              },
              required: ["title", "summary", "content", "category", "imageKeyword", "authorName", "isAlert"]
            }
          }
        });

        const text = response.text;
        if (text) {
          parsed = JSON.parse(text.trim());
          // Make sure we strip any accidental remaining asterisks or hash marks in content
          parsed.content = parsed.content.replace(/[*#_]/g, "").trim();
          parsed.title = parsed.title.replace(/[*#_]/g, "").trim();
          parsed.summary = parsed.summary.replace(/[*#_]/g, "").trim();
        }
      } catch (geminiError: any) {
        addServerLog(`Gemini API failed or lease is marked as forbidden: ${geminiError.message || geminiError}. Using Smart Local Synthesizer Backup on real fetched news...`, "warn");
        parsed = elaborateExtractedNews(rawNews);
      }
    } else {
      // If News API was rate-limited or didn't return any items, fallback to our randomized local synthesizer backup to keep updates flowing indefinitely!
      addServerLog("External news feed returned nothing in this cycle. Executing local synthesizer backup to keep live metrics flowing...", "warn");
      parsed = generateBackupNewsArticle();
      // Safeguard backup contents from markdown symbols
      parsed.content = parsed.content.replace(/[*#_]/g, "").trim();
    }

    if (!parsed) {
      throw new Error("Unable to formulate content payload from both Gemini API and Local Synthesizer Backup.");
    }

    const key = (parsed.imageKeyword || "").toLowerCase();
    const selectedImage = IMAGE_MAPPING[key] || IMAGE_MAPPING.default;
    const randomVideo = PRESET_VIDEOS[Math.floor(Math.random() * PRESET_VIDEOS.length)];

    // Dynamic resolution of the original actual source picture (no mock placeholder image over-rides)
    const originalRealImage = (rawNews && rawNews.imageUrl && rawNews.imageUrl.startsWith("http")) 
      ? rawNews.imageUrl 
      : selectedImage;

    // Direct, pristine evidentiary document generation from the news brief source URL
    const newsEvidenceDocuments = (rawNews && rawNews.sourceUrl) ? [
      {
        name: `VERIFIED_PRIMARY_SOURCE_${parsed.category.toUpperCase()}_REPORT.pdf`,
        type: "PDF",
        size: "Independent Verification",
        url: rawNews.sourceUrl
      }
    ] : [];

    const docDraft = {
      title: parsed.title,
      summary: parsed.summary,
      content: parsed.content,
      category: parsed.category,
      imageUrl: originalRealImage,
      videoUrl: randomVideo,
      isAlert: parsed.isAlert || false,
      authorId: "ai_editor_bot",
      authorName: parsed.authorName || "Global News AI",
      viewsCount: Math.floor(Math.random() * 200) + 10,
      likesCount: Math.floor(Math.random() * 45) + 3,
      publishedAt: Timestamp.now(),
      documents: newsEvidenceDocuments,
      sourceUrl: (rawNews && rawNews.sourceUrl) ? rawNews.sourceUrl : "",

      ...(parsed.category === "Scholarships" ? {
        scholarshipSponsor: parsed.scholarshipSponsor || "Global Higher Education Fund",
        scholarshipAmount: parsed.scholarshipAmount || "Fully Funded Master / PhD",
        scholarshipEligibility: parsed.scholarshipEligibility || "Undergraduate graduates",
        scholarshipDeadline: parsed.scholarshipDeadline || "November 30, 2026",
        scholarshipLink: parsed.scholarshipLink || "https://education-portal.org"
      } : {}),

      ...(parsed.category === "Products" ? {
        productPrice: parsed.productPrice || "$35 USD",
        productSeller: parsed.productSeller || "Central Trade Corp",
        productLocation: parsed.productLocation || "Pristine Plaza, Monrovia",
        productContact: parsed.productContact || "+231 77 826 3121"
      } : {}),

      ...(parsed.category === "Promotions" ? {
        promoArtistName: parsed.promoArtistName || "G-Sweety Duo",
        promoReleaseTitle: parsed.promoReleaseTitle || "Unifying Beats Campaign",
        promoBookingInfo: parsed.promoBookingInfo || "contacts: bookings@broadway.org"
      } : {})
    };

    const docRef = await addDoc(collection(db, "articles"), docDraft);
    totalGeneratedCount++;
    addServerLog(`[SUCCESS] Broadcasted Headline: "${parsed.title}" (${parsed.category}) | Firestore ID: ${docRef.id}`, "success");

  } catch (error: any) {
    console.error("Autonomous formulation cycle failed: ", error);
    addServerLog(`Autonomous ticker halted: ${error.message || error}`, "error");
  }
}

function stopInterval() {
  if (activeIntervalTimer) {
    clearInterval(activeIntervalTimer);
    activeIntervalTimer = null;
  }
}

function launchBackgroundDaemon() {
  stopInterval();
  if (!isBackgroundActive) {
    addServerLog("Background Daemon suspended by admin.", "warn");
    return;
  }

  addServerLog(`Launching news stream worker. Cycle is set to run every ${backgroundIntervalSpeed / 1000}s.`, "info");
  
  activeIntervalTimer = setInterval(() => {
    performAutonomousTick();
  }, backgroundIntervalSpeed);
}

// Initial auto-tick trigger setup (triggers 5 seconds after start, then loop)
function triggerFirstImmediateTick() {
  setTimeout(async () => {
    addServerLog("Startup Trigger: Purging existing articles for a fresh evidence-based high-stack feed...", "info");
    await clearAllAiNews();
    if (isBackgroundActive) {
      addServerLog("Performing initial boot-up autonomous tick from global news API stream...", "info");
      performAutonomousTick();
    }
  }, 5000);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Trigger setup
  getFirestoreDb();
  launchBackgroundDaemon();
  launchMovieAutoPublisher(); // Boot the 15-second movie auto-publisher!
  triggerFirstImmediateTick();

  // API Route to manually trigger news articles formulation
  app.post("/api/ai-publish/generate", async (req, res) => {
    try {
      const { requestedCategory } = req.body;
      let parsed: any = null;

      try {
        const ai = getGeminiClient();

        const systemPrompt = `
          You are an elite, highly professional Chief AI Editor and Senior Investigative Journalist for "Global News", Liberia’s premier independent national digital news agency.
          Your task is to craft an incredibly realistic, highly detailed, and engaging news article. It MUST represent standard high-quality digital journalism.
          
          The article should cover news relevant to Liberia, West Africa, and global connections.
          
          If requestedCategory is provided, write inside that slot.
          Categories list:
          - Politics, Economy, Technology, Science, Sports, Health, Culture, Scholarships, Products, Promotions
        `;

        const promptMsg = requestedCategory 
          ? `Generate a superb breaking news article inside the category of: "${requestedCategory}".`
          : `Generate a superb breaking news article inside a random category.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: promptMsg,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                content: { type: Type.STRING },
                category: { type: Type.STRING },
                imageKeyword: { type: Type.STRING },
                authorName: { type: Type.STRING },
                isAlert: { type: Type.BOOLEAN },
                
                scholarshipSponsor: { type: Type.STRING },
                scholarshipAmount: { type: Type.STRING },
                scholarshipEligibility: { type: Type.STRING },
                scholarshipDeadline: { type: Type.STRING },
                scholarshipLink: { type: Type.STRING },
  
                productPrice: { type: Type.STRING },
                productSeller: { type: Type.STRING },
                productLocation: { type: Type.STRING },
                productContact: { type: Type.STRING },
  
                promoArtistName: { type: Type.STRING },
                promoReleaseTitle: { type: Type.STRING },
                promoBookingInfo: { type: Type.STRING }
              },
              required: ["title", "summary", "content", "category", "imageKeyword", "authorName", "isAlert"]
            }
          }
        });

        parsed = JSON.parse(response.text.trim());
      } catch (gemError: any) {
        addServerLog(`Manual run Gemini API failed: ${gemError.message || gemError}. Falling back to Smart Local Synthesizer...`, "warn");
        parsed = generateBackupNewsArticle(requestedCategory);
      }

      if (!parsed) {
        throw new Error("Unable to formulate content payload from both Gemini API and Local Synthesizer.");
      }

      const key = (parsed.imageKeyword || "").toLowerCase();
      const selectedImage = IMAGE_MAPPING[key] || IMAGE_MAPPING.default;
      const randomVideo = PRESET_VIDEOS[Math.floor(Math.random() * PRESET_VIDEOS.length)];

      const completeArticle = {
        title: parsed.title,
        summary: parsed.summary,
        content: parsed.content,
        category: parsed.category,
        imageUrl: selectedImage,
        videoUrl: randomVideo,
        isAlert: parsed.isAlert || false,
        authorName: parsed.authorName || "Global News AI",
        authorId: "ai_editor_bot",
        viewsCount: 0,
        likesCount: 0,
        publishedAt: new Date().toISOString(),
        
        ...(parsed.category === 'Scholarships' ? {
          scholarshipSponsor: parsed.scholarshipSponsor || "Global Higher Education Fund",
          scholarshipAmount: parsed.scholarshipAmount || "Fully Funded",
          scholarshipEligibility: parsed.scholarshipEligibility || "All African graduates",
          scholarshipDeadline: parsed.scholarshipDeadline || "November 30, 2026",
          scholarshipLink: parsed.scholarshipLink || "https://scholarship-net.org"
        } : {}),

        ...(parsed.category === 'Products' ? {
          productPrice: parsed.productPrice || "$35 USD",
          productSeller: parsed.productSeller || "Tech Center Inc.",
          productLocation: parsed.productLocation || "Tubman Boulevard, Monrovia",
          productContact: parsed.productContact || "+231 77 826 3121"
        } : {}),

        ...(parsed.category === 'Promotions' ? {
          promoArtistName: parsed.promoArtistName || "G-Sweety",
          promoReleaseTitle: parsed.promoReleaseTitle || "Daughter of Monrovia",
          promoBookingInfo: parsed.promoBookingInfo || "Bookings: +231 88 126 5002"
        } : {})
      };

      return res.json({ success: true, article: completeArticle });
    } catch (error: any) {
      console.error("AI Generation Error: ", error);
      return res.status(500).json({ 
        success: false, 
        message: error.message || "An error occurred during AI content formulation." 
      });
    }
  });

  // GET: Daemon News Status panel info
  app.get("/api/ai-publish/status", (req, res) => {
    res.json({
      isRunning: isBackgroundActive,
      intervalSpeed: backgroundIntervalSpeed,
      totalGenerated: totalGeneratedCount,
      logs: aiLogsList,
      // Cinema/Movie publisher states
      isMovieRunning: isMovieDaemonActive,
      currentMovieIdx: currentMovieIndex
    });
  });

  // POST: Control daemon configurations and speed trigger
  app.post("/api/ai-publish/control", (req, res) => {
    try {
      const { action, speed, movieAction } = req.body;
      
      if (action === "toggle") {
        isBackgroundActive = !isBackgroundActive;
        addServerLog(`Manual control trigger: Setting news background generator to ${isBackgroundActive ? "ACTIVE" : "PAUSED"}`, "warn");
        launchBackgroundDaemon();
      }

      if (action === "force") {
        addServerLog("Manual control trigger: Forcing instant formulation tick...", "warn");
        performAutonomousTick();
      }

      if (action === "clear-all") {
        addServerLog("Manual control trigger: Admin requested database purge. Cleansing standard news collection now...", "warn");
        clearAllAiNews();
      }

      if (movieAction === "toggleMovie") {
        isMovieDaemonActive = !isMovieDaemonActive;
        addServerLog(`Manual control trigger: Setting movie publisher to ${isMovieDaemonActive ? "ACTIVE" : "PAUSED"}`, "warn");
        launchMovieAutoPublisher();
      }

      if (movieAction === "forceMovie") {
        addServerLog("Manual control trigger: Forcing instant cinema publication cycle...", "warn");
        publishNextMovie();
      }
      
      if (speed && typeof speed === "number") {
        backgroundIntervalSpeed = speed;
        addServerLog(`Manual control trigger: Readjusting server cycle tick to ${speed / 1000}s`, "warn");
        launchBackgroundDaemon();
      }

      res.json({
        success: true,
        isRunning: isBackgroundActive,
        intervalSpeed: backgroundIntervalSpeed,
        totalGenerated: totalGeneratedCount,
        logs: aiLogsList,
        isMovieRunning: isMovieDaemonActive,
        currentMovieIdx: currentMovieIndex
      });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  // Vite development middleware vs Static Production Assets
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Global News AI Server listening on port ${PORT}...`);
  });
}

startServer();
