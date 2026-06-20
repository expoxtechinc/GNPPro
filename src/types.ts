export type UserRole = 'user' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
  avatarUrl?: string;
}

export interface MediaPost {
  id: string;
  type: 'reel' | 'video' | 'picture' | 'store' | 'music';
  title: string;
  description: string;
  mediaUrl: string;       // Image URL or Video URL (supports standard or YouTube/Vimeo embeds/direct links)
  thumbnailUrl?: string; // Optional thumbnail image
  price?: number;         // For 'store' promos
  storeUrl?: string;      // External link for store products
  duration?: string;      // Video duration e.g., "0:59" or "10:24"
  likesCount: number;
  likedBy: string[];      // Array of User UIDs who liked it
  sharesCount: number;
  createdAt: string;
  location?: string;      // Optional geotag/location
  viewsCount?: number;
  contactNumber?: string; // For store items
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  content: string;
  createdAt: string;
}
