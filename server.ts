import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

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

let aiClient: GoogleGenAI | null = null;

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to generate news articles using Gemini AI
  app.post("/api/ai-publish/generate", async (req, res) => {
    try {
      const { requestedCategory } = req.body;
      const ai = getGeminiClient();

      const systemPrompt = `
        You are an elite, highly professional Chief AI Editor and Senior Investigative Journalist for "Global News", Liberia’s premier independent national digital news agency.
        Your task is to craft an incredibly realistic, highly detailed, and engaging news article. It MUST represent standard high-quality digital journalism.
        
        The article should cover news relevant to Liberia, West Africa, and global connections.
        
        If requestedCategory is provided, write inside that slot.
        Categories list:
        - Politics: Monrovia executive decisions, parliamentary debates, national justice.
        - Economy: Mining sector developments, rubber export valuations, central bank inflation guidelines, local market developments.
        - Technology: Mobile network expansion in rural Liberia, digital banking applications, solar energy microgrids, IT educational workshops.
        - Science: Climate adaptation strategies in coastal counties, agricultural crop research, tropical biology studies.
        - Sports: Liberian National County Sports Meet, National Football Team updates, international athletics spotlights.
        - Health: Upgrading hospital structures, national wellness initiatives, specialized nurse training programs.
        - Culture: Traditional arts exhibitions, Liberian literature dispatches, Independence Day preparation, musical histories.
        - Scholarships: International scholarship guides for Liberian youth, fully-funded masters programs, engineering student grants.
        - Products: Practical consumer reviews of essential devices, local Liberian agricultural products, or energy products.
        - Promotions: Music single releases, theater galas, brand ambassador contracts, concert announcements.

        Enforce high factual styling: include named key figures, realistic locations (e.g., Monrovia, Gbarnga, Kakata, Harper, Buchanan, Robertsport), realistic statistics, and verified quotes from fictitious or public authorities.
      `;

      const promptMsg = requestedCategory 
        ? `Generate a superb breaking news article inside the category of: "${requestedCategory}". Ensure standard Liberian details.`
        : `Generate a superb breaking news article inside a random category from the general list. Keep topics fresh and extremely professional.`;

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
              content: { type: Type.STRING, description: "Comprehensive, fully realized body text of the article. Organize with 3-5 rich paragraphs, professional structure, markdown-supported, with clear section headlines and in-line quotes." },
              category: { type: Type.STRING, description: "Must be exactly one of: Politics, Economy, Technology, Science, Sports, Health, Culture, Scholarships, Products, Promotions" },
              imageKeyword: { type: Type.STRING, description: "One simple lower-case keyword describing the visual subject of the piece (e.g. 'politics', 'stadium', 'hospital', 'court', 'technology', 'finance', 'music') to assign an appropriate preview photo." },
              authorName: { type: Type.STRING, description: "Name of the investigative journalist writing the dispatcher (e.g., 'Satta Kollie', 'Darius Gbah', 'Esther Tarpeh')." },
              isAlert: { type: Type.BOOLEAN, description: "Assign true if this constitutes urgent breaking news that demands a home screen ticker alert." },
              
              // Special metadata schemas if category matches
              scholarshipSponsor: { type: Type.STRING, description: "Sponsor name if category is Scholarships." },
              scholarshipAmount: { type: Type.STRING, description: "Value or coverage details if category is Scholarships." },
              scholarshipEligibility: { type: Type.STRING, description: "Eligibility criteria if category is Scholarships." },
              scholarshipDeadline: { type: Type.STRING, description: "Applications deadline if category is Scholarships." },
              scholarshipLink: { type: Type.STRING, description: "Sponsor website URL if category is Scholarships." },

              productPrice: { type: Type.STRING, description: "Price in USD or LRD if category is Products." },
              productSeller: { type: Type.STRING, description: "Distributor or shop name if category is Products." },
              productLocation: { type: Type.STRING, description: "Physical store location if category is Products." },
              productContact: { type: Type.STRING, description: "Contact number / email if category is Products." },

              promoArtistName: { type: Type.STRING, description: "Artist or Organizer name if category is Promotions." },
              promoReleaseTitle: { type: Type.STRING, description: "Title of the song/event/show if category is Promotions." },
              promoBookingInfo: { type: Type.STRING, description: "Booking contacts or venue details if category is Promotions." }
            },
            required: ["title", "summary", "content", "category", "imageKeyword", "authorName", "isAlert"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No text response received from Gemini.");
      }

      const parsed = JSON.parse(responseText.trim());

      // Map appropriate Unsplash preview image
      const key = (parsed.imageKeyword || "").toLowerCase();
      let selectedImage = IMAGE_MAPPING[key] || IMAGE_MAPPING.default;
      
      // Select a random video attachment
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
        
        // Conditional structures
        ...(parsed.category === 'Scholarships' ? {
          scholarshipSponsor: parsed.scholarshipSponsor || "Liberian Ministry of Education Support",
          scholarshipAmount: parsed.scholarshipAmount || "Fully Funded",
          scholarshipEligibility: parsed.scholarshipEligibility || "Graduating high-school seniors / university undergraduate with minimum 3.2 GPA",
          scholarshipDeadline: parsed.scholarshipDeadline || "September 15, 2026",
          scholarshipLink: parsed.scholarshipLink || "https://moe.gov.lr"
        } : {}),

        ...(parsed.category === 'Products' ? {
          productPrice: parsed.productPrice || "$45 USD",
          productSeller: parsed.productSeller || "Symmetrical Tech Sastech Inc. Monrovia",
          productLocation: parsed.productLocation || "Tubman Boulevard, Monrovia",
          productContact: parsed.productContact || "+231 77 826 3121"
        } : {}),

        ...(parsed.category === 'Promotions' ? {
          promoArtistName: parsed.promoArtistName || "G-Sweety",
          promoReleaseTitle: parsed.promoReleaseTitle || "Daughter of Monrovia",
          promoBookingInfo: parsed.promoBookingInfo || "Bookings: +231 88 126 5002 - bookings@gsweety.lr"
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
