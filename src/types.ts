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
  type: 'announcement' | 'video' | 'picture' | 'lesson' | 'reel' | 'store' | 'music';
  title: string;
  description: string;
  mediaUrl: string;       // Image URL or Video URL (supports standard or YouTube/Vimeo embeds/direct links)
  thumbnailUrl?: string; // Optional thumbnail image
  price?: number;         // For 'store' promos/fees
  storeUrl?: string;      // Related link for event/promo
  duration?: string;      // duration e.g., "0:59" or "10:24"
  likesCount: number;
  likedBy: string[];      // Array of User UIDs who liked it
  sharesCount: number;
  createdAt: string;
  location?: string;      // Dynamic tags or location
  viewsCount?: number;
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

export interface Inquiry {
  id: string;
  fullName: string;
  email: string;
  subject: string;
  message: string;
  status: 'pending' | 'resolved' | 'archived';
  createdAt: string;
}
