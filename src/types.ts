export interface Article {
  id: string;
  title: string;
  content: string;
  summary: string;
  category: string;
  imageUrl: string;
  videoUrl?: string;
  embedCode?: string;
  publishedAt: any; // Firestore Timestamp
  authorId: string;
  authorName: string;
  viewsCount: number;
  likesCount: number;
  isAlert?: boolean;
  publishingNote?: string;
  documents?: Array<{ name: string; url: string; type: string; size?: string }>;
  additionalImages?: Array<string>;
  
  // 24/7 Live Streaming definitions
  isLiveStream247?: boolean;
  liveEmbedEnabled?: boolean;
  liveEmbedTitle?: string;
  liveEmbedSource?: 'youtube' | 'twitch' | 'facebook' | 'custom_embed' | 'm3u8';
  liveEmbedUrl?: string;
  liveEmbedCode?: string;
  liveIsAlert?: boolean; // Toggles whether this live stream acts as a breaking banner alert
  liveIsUpdate?: boolean; // Toggles whether this live stream is highlighted as a live update ticker item
}

export interface Advertisement {
  id: string;
  title: string;
  imageUrl: string;
  redirectUrl: string;
  placement: 'header_banner' | 'sidebar' | 'in_feed';
  active: boolean;
  viewsCount: number;
  clicksCount: number;
  publishedAt: any; // Firestore Timestamp
}

export interface UserPreference {
  userId: string;
  categories: string[];
  alertEnabled: boolean;
  savedArticles: string[];
  updatedAt: any; // Firestore Timestamp
}

export interface ArticleLike {
  articleId: string;
  userId: string;
  timestamp: any;
}
