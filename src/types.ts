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
