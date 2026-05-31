export interface SeedArticle {
  title: string;
  category: string;
  summary: string;
  content: string;
  imageUrl: string;
  videoUrl?: string;
  embedCode?: string;
  authorName: string;
  viewsCount: number;
  likesCount: number;
}

export const PRESET_ARTICLES: SeedArticle[] = [
  {
    title: "Global Clean Energy Summit Finalizes Sovereign Funding Compact",
    category: "Science",
    summary: "Seventeen countries pledge strategic joint capital reserves to boost hyper-resilient grid infrastructures and atomic-fusion research hubs by 2030.",
    content: `The International Energy Coalition has officially ratified the Sovereign Green Compact in Kyoto, establishing a historic treaty designed to funnel billions into rapid nuclear-fusion research and solid-state geothermal infrastructure platforms. 

The agreement, backed by major economies, represents a fundamental shift in energy development models, combining private sector venture incentives with direct sovereign wealth fund allocations. Over the next five years, signees pledge to build twelve inter-connected grid testing laboratories across Eurasia and the Americas.

"This is not a symbolic carbon pledge. This is a deployment pact," stated Dame Eleanor Vance, lead director of the Energy Futures Hub. "We are establishing the research infrastructure, public capital backstops, and regulatory corridors to ensure scalable baseload power can be distributed globally by 2030."

Furthermore, the treaty guarantees technology licensing exemptions for developing nations, accelerating access to localized climate mitigation resources and reinforcing international energy equity coordinates.`,
    imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200",
    authorName: "Dominic Thorne",
    viewsCount: 145,
    likesCount: 22
  },
  {
    title: "Venture Capitals Rally as Microchip Synthesized Quantum Compute Core Breaks Coherence Records",
    category: "Technology",
    summary: "A joint research combine in Munich announces microchip computing cores operating in ultra-stable environments, paving the way for consumer quantum services.",
    content: `Engineers have successfully maintained continuous qubit coherence state inside a miniaturized silicone processor module for over 120 minutes at low temperatures, shattering the previous industry standard.

This operational milestone, published in Germany's Advanced Quantum Journal, suggests that full physical implementation of quantum algorithms is entering standard commercial manufacturing phases. Legacy mainframes requiring massive cryogenic liquid nitrogen cylinders may soon face competition from solid-state, server-rack modular systems that fit standard industrial layouts.

Tech companies and research conglomerates have immediately declared massive financing models to secure intellectual property reserves. A primary focus lies in deploying these chips for immediate real-time cryptography defense, complex molecule modeling for oncology cures, and deep machine training coordinates.

The technology is projected to reach selected cloud server pools by late 2027, setting the stage for an unprecedented leap in simulation power.`,
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200",
    authorName: "Sarah K. Jenkins",
    viewsCount: 204,
    likesCount: 54
  },
  {
    title: "Market Indices Fluctuate as Global Trade Arbitrage Rules Enter Active Phases",
    category: "Economy",
    summary: "Key stock metrics exhibit swift shifts as digital commerce tariffs and automated customs checks are fully implemented across major maritime trade routers.",
    content: `The global mercantile sector experienced significant volume fluctuations today as automated digital trade rules went live at twelve midnight. Liquid currency assets and shipping conglomerates exhibited immediate volatility, reacting to standardized pricing tariffs.

Under the fresh trade architecture, automated customs nodes will instantaneously verify shipping cargo lists and match physical tracking coordinates with cloud-secured digital logbooks. While the efficiency optimization promises to reduce administrative transport times by up to 40%, logistics centers anticipate initial backlogs as operators adjust systems.

Independent analysts suggest the adjustments will favor agile local suppliers, reducing total shipping footprints. Stocks in digital freight management firms and port operations surged while legacy long-haul maritime providers logged temporary corrections.`,
    imageUrl: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1200",
    authorName: "Marcus Vance",
    viewsCount: 98,
    likesCount: 12
  }
];
