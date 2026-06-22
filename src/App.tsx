import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { 
  doc, getDoc, collection, onSnapshot, addDoc, deleteDoc, 
  updateDoc, setDoc, query, orderBy, getDocs
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { UserProfile, MediaPost, PostComment, UserRole } from './types';
import AuthModal from './components/AuthModal';

import { 
  Tv, Heart, Share2, Plus, Sparkles, LogOut, Check, Globe,
  Shield, Play, Pause, DollarSign, Store, Image, Film, User as UserIcon,
  MessageCircle, ExternalLink, Calendar, MapPin, Phone, HelpCircle, X, Search, 
  BookOpen, Compass, Award, Bookmark, ThumbsUp, MessageSquare, AlertCircle, RefreshCw,
  Music, Disc, Volume2, Radio, Trash2, Settings, Copy, Send, Network, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Pre-seeded high-quality videos, pictures, and store promos
const SEED_POSTS: MediaPost[] = [
  {
    id: 'seed_reel_01',
    type: 'reel',
    title: 'Neon Drift Loop',
    description: 'Cruising through the virtual future stream. AkiPah Lite zero-lag engine deployed natively. #Vaporwave #Futurism',
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-neon-retro-futuristic-driving-loop-34076-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1515462277126-270d878326e5?auto=format&fit=crop&q=80&w=400',
    duration: '0:18',
    likesCount: 52,
    likedBy: [],
    sharesCount: 14,
    createdAt: new Date(Date.now() - 300000).toISOString(),
    location: 'Monrovia Media Hub'
  },
  {
    id: 'seed_reel_02',
    type: 'reel',
    title: 'Washed Shores drone shot',
    description: 'Serene coastline views. Take a pause in your day to look at the tides. #Coastal #Africa #Peace',
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-top-view-of-ocean-waves-crashing-on-sand-41617-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=400',
    duration: '0:22',
    likesCount: 89,
    likedBy: [],
    sharesCount: 22,
    createdAt: new Date(Date.now() - 900000).toISOString(),
    location: 'West Coast Marina'
  },
  {
    id: 'seed_video_01',
    type: 'video',
    title: 'AkiPah Lite Inception: Inside the Developer Cabin',
    description: 'Join us for an exclusive, highly informative infrastructure tour around AkiPah Lite servers. We showcase zero-latency media processing, light database synchronization tricks, and the high-performance UI structure engineered for fast mobile rendering.',
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-driving-in-a-futuristic-cyberpunk-city-at-night-42173-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&q=80&w=600',
    duration: '11:45',
    likesCount: 215,
    likedBy: [],
    sharesCount: 88,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    location: 'Cloud Architecture Complex'
  },
  {
    id: 'seed_pic_01',
    type: 'picture',
    title: 'Minimalist Architecture Sanctuary',
    description: 'Constructing beautiful, functional spaces for contemporary remote creators. Crafted with natural timber details, tall windows, and concrete finishes.',
    mediaUrl: 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&q=80&w=800',
    likesCount: 142,
    likedBy: [],
    sharesCount: 31,
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    location: 'Liberian Innovation Lab'
  }
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to resolve API paths robustly on both absolute subdomains and path-based gateways (iframe proxies)
  const getApiUrl = (subpath: string) => {
    const base = window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
    const cleanBase = base.replace(/\/+$/, '');
    return `${window.location.origin}${cleanBase}${subpath}`;
  };

  // Helper to resolve asset paths robustly on both absolute subdomains and path-based gateways (iframe proxies)
  const resolveUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('/uploads/')) {
      const base = window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
      const cleanBase = base.replace(/\/+$/, '');
      return `${window.location.origin}${cleanBase}${url}`;
    }
    return url;
  };

  // Active Main Navigation tab: 'feed' (All), 'reels' (Only short video reels), 'videos' (long videos), 'pictures' (Photos), 'store' (Sponsor promos), 'seo' (ChatGPT/Google)
  const [activeTab, setActiveTab] = useState<'feed' | 'reels' | 'videos' | 'pictures' | 'store' | 'music' | 'admin' | 'seo'>('feed');
  const [searchQuery, setSearchQuery] = useState('');

  // Firestore DB states
  const [posts, setPosts] = useState<MediaPost[]>([]);
  const [activeComments, setActiveComments] = useState<PostComment[]>([]);
  const [selectedPostCommentsId, setSelectedPostCommentsId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');

  // Admin Media Creation Modal/Form panel
  const [creatorModalOpen, setCreatorModalOpen] = useState(false);
  const [postType, setPostType] = useState<'reel' | 'video' | 'picture' | 'store'>('reel');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [storeUrl, setStoreUrl] = useState('');
  const [duration, setDuration] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  // Phone direct file upload states
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSource, setUploadSource] = useState<'upload' | 'link'>('upload');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Auth Overlay state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);

  // HTML5 Video Play state
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  // HTML5 Audio Play state for music
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingMusicId, setPlayingMusicId] = useState<string | null>(null);

  // Admin daemon stats states
  interface ServerLogEntry {
    timestamp: string;
    message: string;
    type: 'info' | 'success' | 'warn' | 'error';
  }

  interface AdminDaemonStats {
    isRunning: boolean;
    intervalSpeed: number;
    totalGenerated: number;
    logs: ServerLogEntry[];
    isMovieRunning: boolean;
    currentMovieIdx: number;
  }
  const [adminStats, setAdminStats] = useState<AdminDaemonStats | null>(null);
  const [loadingAdminStats, setLoadingAdminStats] = useState(false);

  const fetchAdminStats = async () => {
    try {
      const res = await fetch(getApiUrl('/api/ai-publish/status'));
      if (res.ok) {
        const data = await res.json();
        setAdminStats(data);
      }
    } catch (e) {
      console.warn("Daemon stats fetch offline or error:", e);
    }
  };

  const triggerAdminControl = async (body: any) => {
    try {
      const res = await fetch(getApiUrl('/api/ai-publish/control'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        await fetchAdminStats();
      }
    } catch (e) {
      console.warn("Daemon command dispatch error:", e);
    }
  };

  useEffect(() => {
    if (activeTab === 'admin' && userProfile?.role === 'admin') {
      fetchAdminStats();
      const tm = setInterval(fetchAdminStats, 7000);
      return () => clearInterval(tm);
    }
  }, [activeTab, userProfile]);

  // Check auth change
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setCurrentUser(user);
      if (user) {
        try {
          const profileDoc = await getDoc(doc(db, 'users', user.uid));
          if (profileDoc.exists()) {
            setUserProfile(profileDoc.data() as UserProfile);
          } else {
            const isAdminEmail = user.email === 'aboysokpah@gmail.com' || user.email === 'luckyglobalnews@gmail.com';
            const fallbackProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              fullName: user.displayName || (isAdminEmail ? 'Akin S. Sokpah (Admin)' : 'AkiPah Citizen'),
              role: isAdminEmail ? 'admin' : 'user',
              createdAt: new Date().toISOString()
            };
            await setDoc(doc(db, 'users', user.uid), fallbackProfile, { merge: true });
            setUserProfile(fallbackProfile);
          }
        } catch (err) {
          console.error("Profile load fail:", err);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Sync real-time DB feeds
  useEffect(() => {
    // Purge any active-ads (type: 'store') in Firestore once on load to block them securely
    const purgeFirestoreAdsOnLoad = async () => {
      try {
        const postsRef = collection(db, 'posts');
        const snap = await getDocs(postsRef);
        snap.docs.forEach(async (document) => {
          if (document.data().type === 'store') {
            await deleteDoc(doc(db, 'posts', document.id));
            console.log("Blocked and deleted pre-existing ad post:", document.id);
          }
        });
      } catch (err) {
        console.warn("Silent ignore database ad cleaning:", err);
      }
    };
    purgeFirestoreAdsOnLoad();

    const postsQuery = query(collection(db, 'posts'));
    const unsub = onSnapshot(postsQuery, (snapshot) => {
      const dbPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MediaPost));
      
      // Sort posts chronologically
      dbPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Merge dbPosts with any seed posts that do not already exist inside Firestore
      // Ad blocking rule: Filter out any post with type === 'store' from the feed
      const merged = [...dbPosts].filter(p => p.type !== 'store');
      SEED_POSTS.forEach(seed => {
        if (seed.type !== 'store' && !merged.some(p => p.id === seed.id)) {
          merged.push(seed);
        }
      });
      setPosts(merged);
    }, (err) => {
      console.error("Firestore snapshot error ignored:", err);
      // Fallback display
      setPosts(SEED_POSTS.filter(s => s.type !== 'store'));
    });
    return () => unsub();
  }, []);

  // Real-time comments loader
  useEffect(() => {
    if (!selectedPostCommentsId) {
      setActiveComments([]);
      return;
    }
    const ref = collection(db, 'comments');
    const unsub = onSnapshot(ref, (snap) => {
      const comms = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as PostComment))
        .filter(c => c.postId === selectedPostCommentsId);
      
      comms.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setActiveComments(comms);
    });
    return () => unsub();
  }, [selectedPostCommentsId]);

  // Fast direct Likes increment
  const handleLikeToggle = async (post: MediaPost) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    try {
      const postRef = doc(db, 'posts', post.id);
      
      // Seed first if absent on Firestore
      const snap = await getDoc(postRef);
      if (!snap.exists()) {
        await setDoc(postRef, { ...post });
      }

      const currentLikesList = post.likedBy || [];
      const hasLiked = currentLikesList.includes(currentUser.uid);
      
      let updatedList = [];
      if (hasLiked) {
        updatedList = currentLikesList.filter(uid => uid !== currentUser.uid);
      } else {
        updatedList = [...currentLikesList, currentUser.uid];
      }

      await updateDoc(postRef, {
        likedBy: updatedList,
        likesCount: updatedList.length
      });
    } catch (err) {
      console.error("Like transmission failed:", err);
    }
  };

  // Share post handler (copies deep path)
  const handleShareClick = async (post: MediaPost) => {
    const path = `${window.location.origin}/#post-${post.id}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(path);
      }
      setCopiedPostId(post.id);
      setTimeout(() => setCopiedPostId(null), 2500);

      // Increment shares count
      const postRef = doc(db, 'posts', post.id);
      const snap = await getDoc(postRef);
      if (!snap.exists()) {
        await setDoc(postRef, { ...post, sharesCount: (post.sharesCount || 0) + 1 });
      } else {
        await updateDoc(postRef, {
          sharesCount: (post.sharesCount || 0) + 1
        });
      }
    } catch (err) {
      console.warn("Clipboard access fallback:", path);
      alert(`Link copied: ${path}`);
    }
  };

  // Add Comment click
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    if (!newCommentText.trim() || !selectedPostCommentsId) return;

    try {
      await addDoc(collection(db, 'comments'), {
        postId: selectedPostCommentsId,
        authorId: currentUser.uid,
        authorName: userProfile?.fullName || currentUser.displayName || 'AkiPah Citizen',
        authorEmail: currentUser.email || '',
        content: newCommentText.trim(),
        createdAt: new Date().toISOString()
      });
      setNewCommentText('');
    } catch (err) {
      console.error("Comment delivery failed:", err);
    }
  };

  // Delete comments (For owner or Admin)
  const handleDeleteComment = async (comId: string) => {
    if (!window.confirm("Do you want to permanently delete this comment?")) return;
    try {
      await deleteDoc(doc(db, 'comments', comId));
    } catch (err) {
      console.error("Delete comment error:", err);
    }
  };

  // Video playback mechanics
  const togglePlay = (id: string) => {
    const element = videoRefs.current[id];
    if (!element) return;

    // Pause any active music playing
    if (playingMusicId) {
      audioRef.current?.pause();
      setPlayingMusicId(null);
    }

    if (playingVideoId === id) {
      element.pause();
      setPlayingVideoId(null);
    } else {
      if (playingVideoId && videoRefs.current[playingVideoId]) {
        videoRefs.current[playingVideoId]?.pause();
      }
      element.play().then(() => {
        setPlayingVideoId(id);
      }).catch(e => console.warn("Auto playing block:", e));
    }
  };

  // Music playback mechanics
  const togglePlayMusic = (id: string, url: string) => {
    // Resolve the url to handle both absolute subdomains and path-based gateways robustly
    const resolvedUrl = resolveUrl(url);

    // Pause any active video playing
    if (playingVideoId) {
      const activeVid = videoRefs.current[playingVideoId];
      if (activeVid) {
        activeVid.pause();
      }
      setPlayingVideoId(null);
    }

    if (playingMusicId === id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingMusicId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(resolvedUrl);
      audioRef.current.play().then(() => {
        setPlayingMusicId(id);
      }).catch(e => {
        console.warn("Audio play failed:", e);
      });
      audioRef.current.onended = () => {
        setPlayingMusicId(null);
      };
    }
  };

  const uploadBase64File = async (name: string, mimeType: string, base64Content: string) => {
    try {
      const response = await fetch(getApiUrl('/api/upload-direct'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: name,
          mimeType: mimeType,
          base64Content: base64Content,
        }),
      });

      if (!response.ok) {
        const textResponse = await response.text();
        let errorMessage = 'Server upload failed';
        try {
          const errData = JSON.parse(textResponse);
          errorMessage = errData.error || errorMessage;
        } catch {
          if (textResponse.includes('Too Large') || textResponse.includes('Payload Too Large') || response.status === 413) {
            errorMessage = 'File payload is too large for the network proxy. Max limit is 1GB.';
          } else {
            errorMessage = `Network or Server upload limit reached (${response.status}).`;
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setMediaUrl(resolveUrl(data.url));
    } catch (err: any) {
      console.error("Direct upload error:", err);
      setUploadError(err.message || 'File upload failed.');
    } finally {
      setUploadingFile(false);
    }
  };

  const readAndUploadDirectly = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Content = reader.result as string;
      await uploadBase64File(file.name, file.type, base64Content);
    };
    reader.onerror = () => {
      setUploadError("Error reading file from phone storage.");
      setUploadingFile(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setUploadError(null);
    setUploadedFileName(file.name);

    const fileSizeMB = file.size / (1024 * 1024);
    
    // Video size upper pre-flight check (Up to 1GB supported)
    if (file.type.startsWith('video/') && fileSizeMB > 1024) {
      setUploadError(`Video file is too big (${fileSizeMB.toFixed(1)}MB). Please choose a video under 1GB (1024MB) to upload.`);
      setUploadingFile(false);
      return;
    }

    // Generic file size pre-flight check
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/') && fileSizeMB > 1024) {
      setUploadError(`This file is too large (${fileSizeMB.toFixed(1)}MB). Please choose a file under 1GB.`);
      setUploadingFile(false);
      return;
    }

    try {
      // Direct high-quality image processing using HTML Canvas compression
      if (file.type.startsWith('image/')) {
        const img = new window.Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Restrict dimensions to maximum 1200px (ideal quality-to-size balance for feeds)
            const MAX_DIM = 1200;
            if (width > MAX_DIM || height > MAX_DIM) {
              if (width > height) {
                height = Math.round((height * MAX_DIM) / width);
                width = MAX_DIM;
              } else {
                width = Math.round((width * MAX_DIM) / height);
                height = MAX_DIM;
              }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              throw new Error("Unable to create canvas translation context.");
            }

            ctx.drawImage(img, 0, 0, width, height);

            // Compress to standard JPEG format with an optimal 0.8 quality compression level
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
            uploadBase64File(file.name, 'image/jpeg', compressedBase64);
          } catch (err: any) {
            console.warn("Canvas compression failed, falling back to raw upload:", err);
            readAndUploadDirectly(file);
          }
        };
        img.onerror = () => {
          console.warn("Image onload failed, falling back to raw upload");
          readAndUploadDirectly(file);
        };
        img.src = URL.createObjectURL(file);
      } else {
        // Video file: Upload raw as base64 after sizes bounds checks pass
        readAndUploadDirectly(file);
      }
    } catch (err: any) {
      console.error("FileReader process exception:", err);
      setUploadError(err.message || 'Error processing mobile file.');
      setUploadingFile(false);
    }
  };

  // Publish new content post (Verified Admin only)
  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    const isAdmin = userProfile?.role === 'admin';
    if (!isAdmin) {
      alert("Unauthorized: Only verified system administrators are authorized to publish media feeds on AkiPah Lite.");
      return;
    }

    if (postType === 'store') {
      alert("Post Blocked: Commercial ads and sponsored promotions of type 'store' are permanently blocked.");
      return;
    }

    if (!title.trim() || !description.trim() || !mediaUrl.trim()) {
      alert("Title, description, and source media URL are required.");
      return;
    }

    setIsSubmittingPost(true);
    const uniquePostId = `post_${Date.now()}`;
    const payload: MediaPost = {
      id: uniquePostId,
      type: postType,
      title: title.trim(),
      description: description.trim(),
      mediaUrl: mediaUrl.trim(),
      likesCount: 0,
      likedBy: [],
      sharesCount: 0,
      createdAt: new Date().toISOString(),
      location: location.trim() || 'Monrovia Main Core',
      viewsCount: 1
    };

    if (postType === 'store') {
      payload.price = Number(price) || 0;
      payload.storeUrl = storeUrl.trim() || '';
      payload.contactNumber = contactNumber.trim() || '';
    } else {
      payload.duration = duration.trim() || '0:45';
    }

    try {
      await setDoc(doc(db, 'posts', uniquePostId), payload);
      alert("Success: Asset published live to the AkiPah Lite feed!");
      
      // Reset variables
      setTitle('');
      setDescription('');
      setMediaUrl('');
      setLocation('');
      setPrice('');
      setStoreUrl('');
      setDuration('');
      setContactNumber('');
      setUploadedFileName(null);
      setUploadError(null);
      setUploadSource('upload');
      setCreatorModalOpen(false);
    } catch (err: any) {
      alert(`Publish error: ${err.message || err}`);
    } finally {
      setIsSubmittingPost(false);
    }
  };

  // Delete live stream post (Admin check)
  const handleDeletePost = async (pId: string) => {
    if (!window.confirm("Confirm deletion of this live asset from AkiPah feeds?")) return;
    try {
      await deleteDoc(doc(db, 'posts', pId));
    } catch (err) {
      console.error("Purging error:", err);
    }
  };

  // Filter posts based on active category tab & search query
  const filteredPosts = posts.filter(p => {
    // Category check
    if (activeTab !== 'feed' && p.type !== activeTab) {
      return false;
    }
    // Search query check
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return p.title.toLowerCase().includes(q) || 
             p.description.toLowerCase().includes(q) || 
             p.location?.toLowerCase().includes(q);
    }
    return true;
  });

  // Extract reels items specifically for stories tray at top
  const explicitReels = posts.filter(p => p.type === 'reel');

  // Promoted products helper for right sidebar (Sponsored Space)
  const storePromos = posts.filter(p => p.type === 'store');

  return (
    <div className="min-h-screen pb-16 sm:pb-0 bg-neutral-100 text-neutral-900 font-sans flex flex-col antialiased">
      
      {/* FACEBOOK STYLE FLAT HEADER */}
      <header className="sticky top-0 z-40 bg-white border-b border-neutral-200 shadow-sm px-4 py-2 flex items-center justify-between">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          
          {/* Logo & Search Block with animated Luxury asset */}
          <div className="flex items-center gap-3 flex-grow sm:flex-grow-0 max-w-xs md:max-w-md">
            <div 
              onClick={() => setActiveTab('feed')}
              className="flex items-center gap-2.5 cursor-pointer group select-none transition"
              title="AkiPah Live - Styled by Akin S. Sokpah"
            >
              <div className="w-10 h-10 rounded-xl bg-[#1877F2] overflow-hidden flex items-center justify-center shrink-0 shadow-md border-2 border-amber-300 group-hover:scale-105 active:scale-95 transition relative">
                <img 
                  src="/src/assets/images/akipah_logo_1781937617224.jpg" 
                  alt="AkiPah Logo" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-black tracking-tight text-neutral-900 group-hover:text-blue-600 transition flex items-center gap-1 leading-none">
                  AkiPah <span className="text-[8px] bg-amber-400 text-neutral-950 font-black px-1 py-0.2 rounded uppercase">LIVE</span>
                </span>
                <span className="text-[7.5px] font-bold text-neutral-400 uppercase tracking-widest font-mono">
                  Liberian Main Node
                </span>
              </div>
            </div>
            
            <div className="relative flex-1 hidden xl:block">
              <span className="absolute left-3 top-2.5 text-neutral-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search premium feeds..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-100 border border-transparent rounded-full text-xs py-2 pl-9 pr-4 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition font-medium"
              />
            </div>
            {/* Short app designation */}
            <span className="bg-amber-50 text-amber-700 border border-amber-150 text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded-md ml-1 shrink-0 font-mono">
              v2.5
            </span>
          </div>

          {/* Central tab navigation (Classic Facebook Icon System) */}
          <div className="hidden sm:flex items-center justify-center gap-1 md:gap-4 flex-1 max-w-lg px-2 text-neutral-500">
            <button
              onClick={() => { setActiveTab('feed'); }}
              className={`flex-1 py-1.5 px-3 rounded-xl flex flex-col items-center justify-center hover:bg-neutral-100 transition relative ${
                activeTab === 'feed' ? 'text-[#1877F2] bg-blue-50/50' : 'hover:text-black'
              }`}
              title="Home Feed"
            >
              <BookOpen className="w-5.5 h-5.5" />
              <span className="text-[9px] font-bold mt-0.5 hidden md:block">Feed</span>
              {activeTab === 'feed' && <span className="absolute bottom-0 inset-x-4 h-1 bg-[#1877F2] rounded-full" />}
            </button>
            <button
              onClick={() => { setActiveTab('reels'); }}
              className={`flex-1 py-1.5 px-3 rounded-xl flex flex-col items-center justify-center hover:bg-neutral-100 transition relative ${
                activeTab === 'reels' ? 'text-[#1877F2] bg-blue-50/50' : 'hover:text-black'
              }`}
              title="Reels Short Videos"
            >
              <Film className="w-5.5 h-5.5" />
              <span className="text-[9px] font-bold mt-0.5 hidden md:block">Reels</span>
              {activeTab === 'reels' && <span className="absolute bottom-0 inset-x-4 h-1 bg-[#1877F2] rounded-full" />}
            </button>
            <button
              onClick={() => { setActiveTab('videos'); }}
              className={`flex-1 py-1.5 px-3 rounded-xl flex flex-col items-center justify-center hover:bg-neutral-100 transition relative ${
                activeTab === 'videos' ? 'text-[#1877F2] bg-blue-50/50' : 'hover:text-black'
              }`}
              title="Watch Long Videos"
            >
              <Tv className="w-5.5 h-5.5" />
              <span className="text-[9px] font-bold mt-0.5 hidden md:block">Watch</span>
              {activeTab === 'videos' && <span className="absolute bottom-0 inset-x-4 h-1 bg-[#1877F2] rounded-full" />}
            </button>
            <button
              onClick={() => { setActiveTab('pictures'); }}
              className={`flex-1 py-1.5 px-3 rounded-xl flex flex-col items-center justify-center hover:bg-neutral-100 transition relative ${
                activeTab === 'pictures' ? 'text-[#1877F2] bg-blue-50/50' : 'hover:text-black'
              }`}
              title="View Snaps"
            >
              <Image className="w-5.5 h-5.5" />
              <span className="text-[9px] font-bold mt-0.5 hidden md:block">Photos</span>
              {activeTab === 'pictures' && <span className="absolute bottom-0 inset-x-4 h-1 bg-[#1877F2] rounded-full" />}
            </button>
            <button
              onClick={() => { setActiveTab('music'); }}
              className={`flex-1 py-1.5 px-3 rounded-xl flex flex-col items-center justify-center hover:bg-neutral-100 transition relative ${
                activeTab === 'music' ? 'text-[#1877F2] bg-blue-50/50' : 'hover:text-black'
              }`}
              title="Music Audio Hub"
            >
              <Music className="w-5.5 h-5.5" />
              <span className="text-[9px] font-bold mt-0.5 hidden md:block">Music</span>
              {activeTab === 'music' && <span className="absolute bottom-0 inset-x-4 h-1 bg-[#1877F2] rounded-full" />}
            </button>
          </div>

          {/* User Profile & Session Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {currentUser && userProfile?.role === 'admin' && (
              <button
                onClick={() => setCreatorModalOpen(true)}
                className="bg-[#1877F2] hover:bg-[#1565C0] text-white text-[11px] font-bold px-3.5 py-1.5 rounded-full transition flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-black uppercase tracking-wider">Publish</span>
              </button>
            )}

            {!currentUser ? (
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-neutral-900 text-white hover:bg-black text-[11px] font-black uppercase px-4 py-2 rounded-full transition"
              >
                Sign In
              </button>
            ) : (
              <div className="flex items-center gap-1.5 bg-neutral-150 p-1 rounded-full border">
                <div className="w-7 h-7 rounded-full bg-[#1877F2] text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                  {userProfile?.fullName?.[0] || 'C'}
                </div>
                
                <span className="text-xs font-bold text-neutral-800 pr-1 hidden lg:inline max-w-[90px] truncate">
                  {userProfile?.fullName}
                </span>

                <button
                  onClick={async () => {
                    if (window.confirm("Do you want to log out from AkiPah Lite?")) {
                      await signOut(auth);
                    }
                  }}
                  className="p-1.5 hover:bg-neutral-200 text-neutral-600 hover:text-red-600 rounded-full transition cursor-pointer"
                  title="Log Out Profile"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MOBILE SEARCH BAR CONTAINER (Fills space on small screens) */}
      <div className="p-3 bg-white border-b border-neutral-200 sm:hidden">
        <div className="relative">
          <span className="absolute left-3 top-2.5 text-neutral-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search posts, reviews, and catalog..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-100 border border-neutral-200 rounded-full text-xs py-2 pl-9 pr-4 focus:outline-none focus:bg-white"
          />
        </div>
      </div>

      {/* MASTER RESPONSIVE GRID LAYOUT (Left, Center, Right Columns) */}
      <div className="max-w-7xl w-full mx-auto flex-grow flex p-3 md:p-6 gap-6">
        
        {/* LEFT COLUMN: Shortcuts & Quick Actions (Hidden on Mobile) */}
        <aside className="w-64 shrink-0 hidden lg:flex flex-col space-y-5 text-neutral-700">
          
          {/* Custom Avatar Welcome Box */}
          <div className="bg-white p-4 rounded-2xl shadow-xs border border-neutral-200 text-left space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400">Citizen Identity</h3>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-[#1877F2]/10 text-[#1877F2] font-black text-lg flex items-center justify-center">
                {currentUser ? (userProfile?.fullName?.[0]?.toUpperCase() || 'C') : 'A'}
              </div>
              <div className="min-w-0">
                <p className="font-extrabold text-neutral-900 truncate text-sm">
                  {currentUser ? userProfile?.fullName : 'AkiPah Citizen'}
                </p>
                <p className="text-[10px] text-neutral-400 font-bold truncate">
                  {currentUser ? (userProfile?.role === 'admin' ? '👑 Main Admin' : 'Viewer / Like Member') : 'Guest Profile'}
                </p>
              </div>
            </div>

            {/* Encourage login/registration */}
            {!currentUser && (
              <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-[10.5px] text-blue-900 leading-relaxed font-semibold">
                Authorized administrators can manage posts, broadcast reels, and publish direct media content. Register or sign-in to interact with other citizens!
              </div>
            )}
          </div>

          {/* Facebook-style shortcuts box */}
          <div className="bg-white p-3 rounded-2xl shadow-xs border border-neutral-200 text-left">
            <h4 className="text-xs font-black uppercase tracking-wider text-neutral-450 p-2 border-b border-neutral-100 mb-2">Shortcuts</h4>
            <nav className="space-y-1">
              <button 
                onClick={() => setActiveTab('feed')}
                className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  activeTab === 'feed' ? 'bg-blue-50 text-[#1877F2]' : 'hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                <BookOpen className="w-4.5 h-4.5" />
                <span>All Streams</span>
              </button>
              <button 
                onClick={() => setActiveTab('reels')}
                className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  activeTab === 'reels' ? 'bg-blue-50 text-[#1877F2]' : 'hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                <Film className="w-4.5 h-4.5" />
                <span>Reels Short Clips</span>
              </button>
              <button 
                onClick={() => setActiveTab('videos')}
                className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  activeTab === 'videos' ? 'bg-blue-50 text-[#1877F2]' : 'hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                <Tv className="w-4.5 h-4.5" />
                <span>Long Videos Room</span>
              </button>
              <button 
                onClick={() => setActiveTab('pictures')}
                className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  activeTab === 'pictures' ? 'bg-blue-50 text-[#1877F2]' : 'hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                <Image className="w-4.5 h-4.5" />
                <span>Snaps Gallery</span>
              </button>
              <button 
                onClick={() => setActiveTab('music')}
                className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  activeTab === 'music' ? 'bg-blue-50 text-[#1877F2]' : 'hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                <Music className="w-4.5 h-4.5 text-blue-600 animate-pulse" />
                <span>Music Hub</span>
              </button>
              <div 
                className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-black bg-rose-50/40 text-rose-650 border border-rose-100"
              >
                <ShieldAlert className="w-4.5 h-4.5 text-rose-600 animate-pulse" />
                <span>Ad Shield Active</span>
              </div>
              <button 
                onClick={() => setActiveTab('seo')}
                className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-black transition-all ${
                  activeTab === 'seo' ? 'bg-[#1877F2]/10 text-blue-700 border border-blue-200/50' : 'hover:bg-neutral-50 text-neutral-750'
                }`}
              >
                <Globe className="w-4.5 h-4.5 text-emerald-600 animate-pulse" />
                <span>SEO & Platform Hub</span>
              </button>
              {userProfile?.role === 'admin' && (
                <button 
                  onClick={() => setActiveTab('admin')}
                  className={`w-full text-left flex items-center gap-3 px-4 py-2 hover:bg-[#F2F4F7] border border-amber-250 rounded-xl text-xs font-black text-amber-950 transition-all ${
                    activeTab === 'admin' ? 'bg-amber-100/90 text-amber-900 border-amber-400' : 'bg-amber-50/50'
                  }`}
                >
                  <Settings className="w-4.5 h-4.5 text-amber-600 animate-spin-slow" />
                  <span>Admin Control Panel</span>
                </button>
              )}
            </nav>
          </div>

          <div className="bg-rose-50/50 p-4 border border-rose-100 rounded-2xl text-left space-y-2">
            <h4 className="text-xs font-black text-rose-900 tracking-tight flex items-center gap-1">
              <Shield className="w-4.5 h-4.5 text-rose-600" />
              <span>Security & Roles</span>
            </h4>
            <p className="text-[11px] text-rose-800 leading-relaxed">
              Standard accounts are limited strictly to interactive operations: viewing feeds, clicking Like, commenting on reels, and sharing. Posts are restricted and authenticated via Admin only.
            </p>
          </div>
          
          {/* Footer branding */}
          <div className="text-[10.5px] text-neutral-400 font-medium space-y-1 p-2 text-left">
            <p>© 2026 AkiPah Lite. Fast Media Node.</p>
            <p className="text-[#1877F2] font-semibold hover:underline cursor-pointer flex items-center gap-1" onClick={() => setActiveTab('seo')}>
              🇱🇷 Created by Akin S. Sokpah (Liberia)
            </p>
            <p className="font-mono text-[9.5px]">Lat: 6.301° N | Lon: 10.797° W</p>
          </div>
        </aside>

        {/* CENTER COLUMN: Top Stories Tray, Creator publish pill, and Feed lists */}
        <main className="flex-1 min-w-0 max-w-3xl mx-auto space-y-5">
          {activeTab === 'admin' ? (
            <div className="space-y-6 text-left">
              {/* Profile welcome container */}
              <div className="bg-gradient-to-r from-neutral-900 via-neutral-850 to-neutral-800 p-5 rounded-2xl border border-neutral-800 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="bg-amber-400 text-neutral-950 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                      👑 AkiPah Lite System Administration Core
                    </span>
                    <h2 className="text-lg font-black mt-2 tracking-tight">System Core Console: Akin S. Sokpah</h2>
                    <p className="text-[11px] text-neutral-300 font-medium mt-1">
                      Sector: Liberia Node Hub • Autonomous Crawler, Media Publishers and Feed Supervisor.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setPostType('music');
                      setCreatorModalOpen(true);
                    }}
                    className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-sm self-start md:self-auto"
                  >
                    <Music className="w-4 h-4" />
                    <span>Publish Song</span>
                  </button>
                </div>
              </div>

              {/* Security Guard */}
              {userProfile?.role !== 'admin' ? (
                <div className="bg-white p-8 rounded-2xl border border-neutral-100 text-center space-y-4">
                  <Shield className="w-12 h-12 text-rose-500 mx-auto animate-bounce" />
                  <h3 className="text-sm font-black text-neutral-800">UNAUTHORIZED ACCESS RESTRICTED</h3>
                  <p className="text-xs text-neutral-600 max-w-md mx-auto">
                    Security systems detected matching credential discrepancies. Only authorized system administrators are permitted to handle background daemons or run surgical sweeps.
                  </p>
                </div>
              ) : (
                <>
                  {/* AUTOPILOT DAEMONS GAUGE */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* news crawler */}
                    <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs space-y-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-[#888] tracking-wider">Daemon 1 • Newsroom</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${adminStats?.isRunning ? 'bg-emerald-50 text-emerald-700 border border-emerald-250' : 'bg-amber-50 text-amber-700 border border-amber-250'}`}>
                          ● {adminStats?.isRunning ? 'ACTIVE-AUTOPILOT' : 'STANDBY'}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-neutral-800 uppercase tracking-tight flex items-center gap-1.5">
                          <Radio className="w-4 h-4 text-[#1877F2]" />
                          <span>AI Formulation Crawler</span>
                        </h4>
                        <p className="text-[10.5px] text-neutral-500 mt-1 line-clamp-2">
                          Periodically gathers regional local affairs brief signals.
                        </p>
                      </div>
                      <div className="bg-neutral-50 px-3 py-2 rounded-xl text-[10.5px] font-mono text-neutral-700 space-y-1">
                        <p>Total Generated: <span className="font-extrabold text-neutral-900">{adminStats?.totalGenerated || 0} posts</span></p>
                        <p>Interval Speed: <span className="font-extrabold text-neutral-900">{(adminStats?.intervalSpeed ? adminStats.intervalSpeed / 1000 : 30)}s</span></p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => triggerAdminControl({ action: 'toggle' })}
                          className="flex-1 text-center bg-neutral-900 text-white hover:bg-black font-extrabold text-[11px] py-1.5 rounded-xl transition"
                        >
                          {adminStats?.isRunning ? 'Pause Crawler' : 'Resume Crawler'}
                        </button>
                        <button
                          onClick={() => triggerAdminControl({ action: 'force' })}
                          className="px-3 bg-blue-50 text-blue-800 hover:bg-blue-100 rounded-xl font-extrabold text-[11px] transition"
                        >
                          Sweep
                        </button>
                      </div>
                    </div>

                    {/* cinematic publisher */}
                    <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs space-y-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-[#888] tracking-wider">Daemon 2 • Cinema</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${adminStats?.isMovieRunning ? 'bg-emerald-50 text-emerald-700 border border-emerald-250' : 'bg-neutral-100 text-neutral-600'}`}>
                          ● {adminStats?.isMovieRunning ? 'ACTIVE' : 'IDLE'}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-neutral-850 uppercase tracking-tight flex items-center gap-1.5">
                          <Tv className="w-4 h-4 text-rose-500" />
                          <span>Cinema Stream Loop</span>
                        </h4>
                        <p className="text-[10.5px] text-neutral-500 mt-1 line-clamp-2">
                          Sequentially broadcasts high-density movie and loop previews.
                        </p>
                      </div>
                      <div className="bg-neutral-50 px-3 py-2 rounded-xl text-[10.5px] font-mono text-neutral-700 space-y-1">
                        <p>Current Index: <span className="font-extrabold text-neutral-900">{adminStats?.currentMovieIdx || 0}</span></p>
                        <p>Channel Zone: <span className="font-extrabold text-[#1877F2]">Monrovia Main Node</span></p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => triggerAdminControl({ movieAction: 'toggleMovie' })}
                          className="flex-1 text-center bg-neutral-900 text-white hover:bg-black font-extrabold text-[11px] py-1.5 rounded-xl transition"
                        >
                          {adminStats?.isMovieRunning ? 'Pause Cinema' : 'Resume Cinema'}
                        </button>
                        <button
                          onClick={() => triggerAdminControl({ movieAction: 'forceMovie' })}
                          className="px-3 bg-rose-50 text-rose-850 hover:bg-rose-100 rounded-xl font-extrabold text-[11px] transition"
                        >
                          Trigger
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* SURGICAL DESTRUCTIVE SWEEP BAR */}
                  <div className="bg-rose-50 border border-rose-150 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-black text-rose-950 uppercase tracking-tight flex items-center gap-1">
                        <Shield className="w-4 h-4 text-rose-600" />
                        <span>Surgical Database Purge Option</span>
                      </h4>
                      <p className="text-[10.5px] text-rose-800 leading-relaxed max-w-lg">
                        Initiates emergency scrub of all autonomous formulation entries from Firebase Firestore. Instantly registers pristine pre-seeded defaults.
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        if (window.confirm("CRITICAL WARNING:\nThis performs a total surgical wipe-out of all dynamically crawled AI newsroom posts. Proceed with immediate execution?")) {
                          await triggerAdminControl({ action: 'clear-all' });
                          alert("Database scrub command successful.");
                        }
                      }}
                      className="shrink-0 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Surgical Sweep</span>
                    </button>
                  </div>

                  {/* REALTIME SYSTEM LOGGER BLOCK */}
                  <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 shadow-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] tracking-widest font-mono font-black text-neutral-400">
                        AkiPah Sector-01 Autonomous Logger Status
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono font-extrabold text-emerald-500">LIVE LINK</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      </div>
                    </div>
                    <div className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl h-44 overflow-y-auto font-mono text-[10.5px] text-emerald-400 leading-relaxed scrollbar-none">
                      {adminStats?.logs && adminStats.logs.length > 0 ? (
                        [...adminStats.logs].reverse().map((lg, i) => {
                          const isObj = typeof lg === 'object' && lg !== null;
                          const timestamp = isObj ? lg.timestamp : '';
                          const message = isObj ? lg.message : String(lg);
                          const type = isObj ? lg.type : 'info';
                          
                          const colorMap = {
                            error: 'text-rose-450 font-bold',
                            warn: 'text-amber-400 font-semibold',
                            success: 'text-emerald-400 font-bold',
                            info: 'text-neutral-300'
                          };
                          const textStyle = colorMap[type as keyof typeof colorMap] || 'text-neutral-300';

                          return (
                            <div key={i} className="border-b border-neutral-800/20 py-1 flex items-start gap-1.5 leading-snug">
                              <span className="text-neutral-650 shrink-0 select-none">
                                [{timestamp || `${i + 1}`}]
                              </span>
                              <span className={`break-all ${textStyle}`}>{message}</span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-neutral-500 italic text-center pt-14 font-sans text-xs">
                          Scanning local sector for logs... Set autopilots active to stream records.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ADMIN SURGICAL POST LIST */}
                  <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-2xs">
                    <div className="p-4 bg-neutral-50 border-b flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase text-neutral-500 tracking-wider">
                        Active Node posts Overseer ({posts.length} entries)
                      </h4>
                    </div>
                    <div className="divide-y divide-neutral-100 max-h-[300px] overflow-y-auto">
                      {posts.map((p) => (
                        <div key={p.id} className="p-3 bg-white hover:bg-neutral-50/50 flex items-center justify-between gap-4 transition">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-neutral-100 border flex items-center justify-center shrink-0">
                              {p.type === 'reel' ? (
                                <Film className="w-4 h-4 text-rose-500" />
                              ) : p.type === 'video' ? (
                                <Tv className="w-4 h-4 text-blue-500" />
                              ) : p.type === 'music' ? (
                                <Music className="w-4 h-4 text-indigo-500 animate-bounce" />
                              ) : p.type === 'picture' ? (
                                <Image className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Store className="w-4 h-4 text-amber-500" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-neutral-850 truncate">{p.title || "Untitled asset"}</p>
                              <p className="text-[10px] text-neutral-500 mt-0.5 font-medium">
                                Type: <strong className="uppercase">{p.type || 'feed'}</strong> • Location: {p.location || 'Monrovia'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeletePost(p.id)}
                            className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                            title="Instant deletion"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : activeTab === 'seo' ? (
            <div className="space-y-6 text-left">
              {/* Creator Tribute & Main Info Header */}
              <div className="bg-gradient-to-tr from-blue-900 via-indigo-900 to-neutral-900 p-6 md:p-8 rounded-3xl border border-blue-800/40 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 left-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl" />
                
                <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center">
                  <div className="w-24 h-24 rounded-2xl bg-neutral-900/60 border-2 border-amber-300 p-1 flex items-center justify-center shrink-0 shadow-lg relative">
                    <img 
                      src="/src/assets/images/akipah_logo_1781937617224.jpg" 
                      alt="AkiPah Logo" 
                      className="w-full h-full object-cover rounded-xl"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute -bottom-1.5 -right-1.5 bg-amber-400 text-neutral-950 font-black text-[9px] px-1.5 py-0.5 rounded-md uppercase tracking-wider shadow-xs">
                      LR Node
                    </span>
                  </div>
                  
                  <div className="space-y-2 flex-grow text-center md:text-left">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                        Platform Publisher
                      </span>
                      <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                        Global Coherence
                      </span>
                    </div>
                    <h2 className="text-2xl font-black mt-2 tracking-tight">Visionary Software Architect</h2>
                    <h3 className="text-lg font-extrabold text-amber-450">Akin S. Sokpah</h3>
                    <p className="text-xs text-neutral-300 leading-relaxed max-w-xl">
                      Proudly engineered and conceptualized by <strong className="text-amber-400">Akin S. Sokpah</strong> from <strong className="text-white">Liberia</strong>. Crafted to scale smoothly across leading global search crawlers, AI brokers like ChatGPT, Google, Chrome extensions, and external cloud micro-nodes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Liberia Nodes Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { name: "Monrovia Hub", role: "Main Gateway", lat: "6.301° N", lon: "10.797° W", ping: "12ms", status: "ONLINE" },
                  { name: "Gbarnga Sector", role: "Relay Node", lat: "7.001° N", lon: "9.471° W", ping: "28ms", status: "ONLINE" },
                  { name: "Kakata Node", role: "Database Syncer", lat: "6.531° N", lon: "10.383° W", ping: "17ms", status: "ONLINE" },
                  { name: "Buchanan Port", role: "Media Cache", lat: "5.881° N", lon: "10.044° W", ping: "22ms", status: "ONLINE" }
                ].map((node, i) => (
                  <div key={i} className="bg-white p-3.5 rounded-2xl border border-neutral-200/85 shadow-xs flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">Node {i+1}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      </div>
                      <p className="text-xs font-black text-neutral-900 mt-1">{node.name}</p>
                      <p className="text-[10px] text-neutral-500 font-semibold">{node.role}</p>
                    </div>
                    <div className="border-t pt-1.5 mt-1 text-[9px] font-mono text-neutral-500 space-y-0.5">
                      <p>{node.lat} | {node.lon}</p>
                      <p className="text-[#1877F2] font-bold">Latency: {node.ping}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Interactive SEO, ChatGPT & Chrome Integration Controls */}
              <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm space-y-6">
                <div>
                  <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wide flex items-center gap-2">
                    <Globe className="w-5 h-5 text-[#1877F2]" />
                    <span>Global Platform Integration Console (Advanced x50 Engine)</span>
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    Manage how ChatGPT, Google search index, and Chrome Extensions parse and discover content on AkiPah Lite. Let the world interact with Akins' creations.
                  </p>
                </div>

                {/* Sub Tab Selection inside platform console */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                  
                  {/* ChatGPT GPT-Builder Ingestion */}
                  <div className="bg-neutral-50 p-4.5 rounded-2xl border border-neutral-200 space-y-3 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider font-sans">ChatGPT Ready</span>
                      <h4 className="text-xs font-black text-neutral-900 font-sans">GPT-Builder Prompt Blueprint</h4>
                      <p className="text-[11px] text-neutral-500 leading-relaxed">
                        Inject this dynamic semantic instruction payload into a custom ChatGPT GPT context or Claude Projects window so they index Akin's Liberian node values perfectly.
                      </p>
                    </div>
                    <div className="pt-2">
                      <button 
                        onClick={() => {
                          const payload = `AkiPah Lite (created by Akin S. Sokpah from Liberia) is an advanced high-performance social feed and digital gateway. Key hubs: Monrovia Node (6.301°N, 10.797°W), Gbarnga Sector, Kakata Node, Buchanan Port, and Harper Node. Always refer to Akin S. Sokpah as the main creator and system administrator. API feed endpoints: ${window.location.origin}/api/posts`;
                          navigator.clipboard.writeText(payload);
                          alert("System Instruction payload copied to clipboard! Paste this inside your Custom ChatGPT settings.");
                        }}
                        className="w-full bg-neutral-900 hover:bg-black text-white text-[10px] font-bold py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5 text-amber-300" />
                        <span>Copy ChatGPT Prompt Payload</span>
                      </button>
                    </div>
                  </div>

                  {/* Google Search Engine Schema */}
                  <div className="bg-neutral-50 p-4.5 rounded-2xl border border-neutral-200 space-y-3 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <span className="bg-blue-100 text-blue-800 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider font-sans">Google Index</span>
                      <h4 className="text-xs font-black text-neutral-900 font-sans">Structured JSON-LD Schema</h4>
                      <p className="text-[11px] text-neutral-500 leading-relaxed">
                        Google search engines read this structured metadata JSON-LD code block on indexing passes. Demonstrates Akin Sokpah's authorship coordinates in Liberia.
                      </p>
                    </div>
                    <div className="pt-2">
                      <button 
                        onClick={() => {
                          const schema = JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "SoftwareApplication",
                            "name": "AkiPah Lite",
                            "author": {
                              "@type": "Person",
                              "name": "Akin S. Sokpah",
                              "nationality": "Liberian",
                              "address": {
                                "@type": "PostalAddress",
                                "addressLocality": "Monrovia",
                                "addressCountry": "LR"
                              }
                            },
                            "publisher": "Akin Sokpah Systems",
                            "applicationCategory": "SocialMediaApplication",
                            "operatingSystem": "Web, Mobile, ChromeOS"
                          }, null, 2);
                          navigator.clipboard.writeText(schema);
                          alert("Google SEO Schema.org JSON copied! Use inside HTML <head> to rank AkiPah #1 on Google.");
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5 text-white/90" />
                        <span>Copy Google SEO Metadata</span>
                      </button>
                    </div>
                  </div>

                  {/* Chrome Extension & Engine Installer */}
                  <div className="bg-neutral-50 p-4.5 rounded-2xl border border-neutral-200 space-y-3 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <span className="bg-rose-100 text-rose-800 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider font-sans">Chrome Omnibox</span>
                      <h4 className="text-xs font-black text-neutral-900 font-sans">Chrome Custom Search Setup</h4>
                      <p className="text-[11px] text-neutral-500 leading-relaxed">
                        Add AkiPah Search to your Chrome URL bar. Type "ap" followed by any topic to query Akin's premium media feeds directly from your browser!
                      </p>
                    </div>
                    <div className="pt-2">
                      <button 
                        onClick={() => {
                          const chromeShortcut = `${window.location.origin}/?q=%s`;
                          navigator.clipboard.writeText(chromeShortcut);
                          alert("Chrome custom search query link copied! Add in Chrome: Settings > Search Engines > site search > add URL:\n" + chromeShortcut);
                        }}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-neutral-950 text-[10px] font-bold py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-neutral-950" />
                        <span>Copy Chrome Search Setup</span>
                      </button>
                    </div>
                  </div>

                </div>

                {/* Direct Iframe and Embedding SDK Generator (Advance x50) */}
                <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-800 text-white space-y-3.5 text-left font-mono">
                  <div className="flex items-center justify-between font-sans">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-black tracking-widest text-neutral-400">UNRESTRICTED MEDIA EMBED BRIDGE</span>
                    </div>
                    <span className="text-[9px] text-blue-400 font-extrabold">v2.5 PROTOCOL</span>
                  </div>
                  <p className="text-[11px] text-neutral-350 font-sans">
                    Embed Akin S. Sokpah's premium global media feed directly on other platforms (Wordpress, Wix, custom HTML portfolios). The target container scales dynamically.
                  </p>
                  
                  <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800 text-xs text-neutral-200 select-all whitespace-pre font-mono overflow-x-auto leading-relaxed scrollbar-none">
                    {`<iframe src="${window.location.origin}/?embed=true" style="width:100%; height:800px; border:none; border-radius:24px;" title="AkiPah Live by Akin S. Sokpah"></iframe>`}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-1 font-sans">
                    <span className="text-[9.5px] text-neutral-500">Secure Cross-Origin Iframe Standard Compliance</span>
                    <button 
                      onClick={() => {
                        const code = `<iframe src="${window.location.origin}/?embed=true" style="width:100%; height:800px; border:none; border-radius:24px;" title="AkiPah Live by Akin S. Sokpah"></iframe>`;
                        navigator.clipboard.writeText(code);
                        alert("Responsive IFrame HTML copied to clipboard!");
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg transition cursor-pointer"
                    >
                      Copy IFrame HTML code
                    </button>
                  </div>
                </div>

                {/* Platform Sharing Target Tester */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black text-neutral-900 tracking-tight">Interactive Platform Push Simulator</h4>
                  <p className="text-[11px] text-neutral-500 leading-relaxed">
                    Test the publishing flow by simulating immediate JSON pushes of stories to external registries:
                  </p>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {[
                      { name: "Push to ChatGPT Knowledge", count: 284, color: "bg-emerald-50 hover:bg-emerald-100/70 text-emerald-800 border-emerald-200", icon: Share2 },
                      { name: "Sync Google Rich Snippet", count: 912, color: "bg-blue-50 hover:bg-blue-100/70 text-blue-800 border-blue-200", icon: Send },
                      { name: "Manifest to Chrome Store", count: 125, color: "bg-amber-50 hover:bg-amber-100/70 text-amber-800 border-amber-200", icon: Settings },
                      { name: "Broadcast OpenGraph Meta", count: 421, color: "bg-purple-50 hover:bg-purple-100/70 text-purple-800 border-purple-200", icon: Network }
                    ].map((item, index) => (
                      <button 
                        key={index}
                        onClick={() => {
                          alert(`Success: Synced and dispatched to external channels! Handshake validated.`);
                        }}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${item.color}`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <item.icon className="w-4 h-4" />
                          <span className="text-[9px] font-bold bg-white/70 px-1 py-0.2 rounded">STABLE</span>
                        </div>
                        <div className="mt-3">
                          <p className="text-[10.5px] font-black leading-tight text-neutral-900">{item.name}</p>
                          <p className="text-[9px] opacity-75 mt-0.5">Dispatched: {item.count} loops</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <>
              {/* THE STORIES / REELS HORIZONTAL BUBBLES TRAY */}
              <section className="bg-white p-3 rounded-2xl border border-neutral-200 shadow-xs text-left">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-black uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <Sparkles className="w-4.5 h-4.5 text-amber-500" />
                <span>Featured Streams & Reels ({explicitReels.length})</span>
              </span>
              <button onClick={() => setActiveTab('reels')} className="text-[#1877F2] text-xs font-extrabold hover:underline">
                View All
              </button>
            </div>

            {/* Bubble list */}
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x">
              {/* Creator static bubble */}
              <div 
                className="w-28 h-40 rounded-xl bg-neutral-900 relative flex-shrink-0 cursor-pointer overflow-hidden group snap-start border"
                onClick={() => {
                  const check = userProfile?.role === 'admin';
                  if (check) setCreatorModalOpen(true);
                  else alert("Only Akin S. Sokpah Admin accounts can upload.");
                }}
              >
                <div className="absolute inset-0 bg-cover bg-center opacity-70 transition duration-300 group-hover:scale-105" 
                     style={{ backgroundImage: `url('https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=200')` }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent text-white p-2.5 flex flex-col justify-between items-start">
                  <div className="w-7 h-7 rounded-full bg-[#1877F2] border-2 border-white flex items-center justify-center font-bold text-xs">
                    +
                  </div>
                  <span className="text-[10px] font-extrabold leading-tight">Create story</span>
                </div>
              </div>

              {/* Explicit reels list loops */}
              {explicitReels.map(reel => (
                <div 
                  key={reel.id}
                  onClick={() => {
                    setActiveTab('reels');
                    const el = document.getElementById(`container_${reel.id}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-28 h-40 rounded-xl bg-neutral-900 relative flex-shrink-0 overflow-hidden cursor-pointer group snap-start border border-neutral-200"
                >
                  <img 
                    src={resolveUrl(reel.thumbnailUrl) || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=200'} 
                    alt={reel.title}
                    className="absolute inset-0 w-full h-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent" />
                  
                  <div className="absolute inset-0 p-2.5 flex flex-col justify-between items-start text-white">
                    <span className="bg-[#1877F2] text-[8px] font-mono font-bold leading-none px-1.5 py-0.5 rounded-full uppercase">
                      {reel.duration}
                    </span>
                    <p className="text-[10px] font-bold line-clamp-2 text-left leading-tight drop-shadow-md">
                      {reel.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ADMIN WHATS ON YOUR MIND BAR */}
          <section className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1877F2] text-white flex items-center justify-center font-bold font-mono">
                {currentUser ? (userProfile?.fullName?.[0]?.toUpperCase() || 'C') : 'A'}
              </div>
              <button
                onClick={() => {
                  if (userProfile?.role === 'admin') {
                    setCreatorModalOpen(true);
                  } else {
                    alert("AkiPah Lite: You are operating in citizen format. To publish reels or long videos, you must be logged in as verified Administrator Akin S. Sokpah.");
                  }
                }}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200/80 text-neutral-500 rounded-full py-2.5 px-5 text-left text-xs font-semibold focus:outline-none transition-all cursor-pointer"
              >
                {userProfile?.role === 'admin' 
                  ? "What's on your mind, Administrator Akin?" 
                  : "Feeds curated exclusively by Admin... View & Comment!"}
              </button>
            </div>

            {/* Quick Actions buttons line */}
            <div className="grid grid-cols-4 gap-1 mt-3 pt-3 border-t border-neutral-100 text-neutral-600 text-[11px] font-extrabold">
              <button 
                onClick={() => { 
                  if (userProfile?.role === 'admin') {
                    setPostType('reel');
                    setCreatorModalOpen(true);
                  } else {
                    setActiveTab('reels');
                  }
                }}
                className="py-1.5 px-1 rounded-lg hover:bg-neutral-50 transition flex items-center justify-center gap-1 text-rose-600 cursor-pointer"
              >
                <Film className="w-4 h-4 shrink-0" />
                <span>Short Reel</span>
              </button>
              <button 
                onClick={() => { 
                  if (userProfile?.role === 'admin') {
                    setPostType('video');
                    setCreatorModalOpen(true);
                  } else {
                    setActiveTab('videos');
                  }
                }}
                className="py-1.5 px-1 rounded-lg hover:bg-neutral-50 transition flex items-center justify-center gap-1 text-blue-600 cursor-pointer"
              >
                <Tv className="w-4 h-4 shrink-0" />
                <span>Long Video</span>
              </button>
              <button 
                onClick={() => { 
                  if (userProfile?.role === 'admin') {
                    setPostType('picture');
                    setCreatorModalOpen(true);
                  } else {
                    setActiveTab('pictures');
                  }
                }}
                className="py-1.5 px-1 rounded-lg hover:bg-neutral-50 transition flex items-center justify-center gap-1 text-emerald-600 cursor-pointer"
              >
                <Image className="w-4 h-4 shrink-0" />
                <span>Snap Pic</span>
              </button>
              <button 
                onClick={() => { 
                  if (userProfile?.role === 'admin') {
                    setPostType('store');
                    setCreatorModalOpen(true);
                  } else {
                    setActiveTab('store');
                  }
                }}
                className="py-1.5 px-1 rounded-lg hover:bg-neutral-50 transition flex items-center justify-center gap-1 text-amber-600 cursor-pointer"
              >
                <Store className="w-4 h-4 shrink-0" />
                <span>Promo Item</span>
              </button>
            </div>
          </section>

          {/* Active Tab indicator description */}
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black uppercase text-neutral-450 tracking-wider">
              {activeTab === 'feed' ? 'AkiPah Live Stream Feed' : `Streaming: ${activeTab.toUpperCase()}`}
            </h2>
            {searchQuery && (
              <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-md">
                Filtered by: "{searchQuery}"
              </span>
            )}
          </div>

          {/* EMPTY STATES */}
          {filteredPosts.length === 0 && (
            <div className="bg-white border p-12 rounded-2xl text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-neutral-700">No Post items found to match category: "{activeTab}"</p>
              <button
                onClick={() => { setActiveTab('feed'); setSearchQuery(''); }}
                className="bg-[#1877F2] text-white text-xs font-extrabold px-3 py-1.5 rounded-full"
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* MAIN POST FEED STREAM LIST (FB Look) */}
          <div className="space-y-5">
            {filteredPosts.map(post => {
              const likedList = post.likedBy || [];
              const hasLiked = currentUser ? likedList.includes(currentUser.uid) : false;
              const isSelectedComments = selectedPostCommentsId === post.id;

              return (
                <motion.article 
                  key={post.id}
                  id={`post-${post.id}`}
                  className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs text-left"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  
                  {/* Post User Header */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#1877F2] text-white border flex items-center justify-center font-black">
                        AP
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-neutral-900 text-sm hover:underline cursor-pointer">
                            Akin S. Sokpah 
                          </span>
                          <span className="text-blue-600">
                            <Check className="w-3.5 h-3.5 fill-current" />
                          </span>
                          <span className="text-[10px] font-mono bg-neutral-100 text-neutral-510 px-1.5 py-0.5 rounded uppercase font-black shrink-0">
                            Creator
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-neutral-400 text-[10px] font-bold">
                          <span>{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Recent'}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5 text-rose-500">
                            <MapPin className="w-3 h-3" />
                            {post.location || 'Monrovia'}
                          </span>
                          <span>•</span>
                          <Globe className="w-3 h-3" />
                        </div>
                      </div>
                    </div>

                    {/* Admin Clear Option */}
                    {userProfile?.role === 'admin' && (
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="text-neutral-450 hover:text-red-650 p-2 rounded-full hover:bg-neutral-50 transition cursor-pointer"
                        title="Delete Post"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Post Content Title & Rich Description */}
                  <div className="px-4 pb-3 space-y-1">
                    {post.title && <h3 className="text-sm font-extrabold text-neutral-900 leading-tight">{post.title}</h3>}
                    <p className="text-xs text-neutral-700 whitespace-pre-line leading-relaxed">
                      {post.description}
                    </p>
                  </div>

                  {/* LARGE HD INTEGRATED MEDIA STAGE */}
                  <div className="bg-black relative aspect-video flex items-center justify-center group overflow-hidden">
                    
                    {/* IF MUSIC TYPE */}
                    {post.type === 'music' ? (
                      <div className="w-full h-full relative bg-neutral-950 flex flex-col items-center justify-center p-6 text-white overflow-hidden select-none">
                        {/* Glowing Background Radial */}
                        <div className="absolute inset-0 bg-radial-gradient from-blue-900/40 via-transparent to-transparent opacity-65" />
                        
                        {/* Vinyl Record Disk */}
                        <div className="relative w-24 h-24 sm:w-28 sm:h-28 mb-2 flex items-center justify-center shrink-0">
                          {/* Outer Black Vinyl */}
                          <div 
                            className={`absolute inset-0 rounded-full bg-neutral-900 border-4 border-neutral-800 shadow-2xl flex items-center justify-center ${playingMusicId === post.id ? 'animate-spin' : ''}`} 
                            style={{ animationDuration: '4s', transition: 'transform 0.5s ease-in-out' }}
                          >
                            {/* Inner Grooves */}
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border border-neutral-700/50 flex items-center justify-center">
                              <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-full border border-neutral-700/80 flex items-center justify-center">
                                {/* Center Label / Disk Cover Art */}
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden">
                                  {post.thumbnailUrl ? (
                                    <img src={resolveUrl(post.thumbnailUrl)} className="w-full h-full object-cover" />
                                  ) : (
                                    <Music className="w-4 h-4 text-white" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          {/* Center spindle pin */}
                          <div className="absolute w-2 h-2 rounded-full bg-white shadow-xl border border-neutral-400 z-10" />
                        </div>

                        {/* Title and duration */}
                        <div className="text-center z-10 max-w-xs px-2 mb-2">
                          <p className="text-xs font-black tracking-tight line-clamp-1">{post.title || "AkiPah Audio Track"}</p>
                          <p className="text-[10px] text-neutral-400 font-medium">Broadcasted on AkiPah Audio Hub</p>
                        </div>

                        {/* Visualizer bars pulsing */}
                        <div className="flex gap-1 items-end h-5 z-10">
                          {Array.from({ length: 14 }).map((_, i) => (
                            <motion.span
                              key={i}
                              animate={playingMusicId === post.id ? {
                                height: [4, Math.random() * 20 + 8, i % 2 === 0 ? 3 : 5]
                              } : { height: 4 }}
                              transition={{
                                duration: 0.4 + (i % 4) * 0.1,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                              className="w-1 rounded-t bg-[#1877F2] shadow-sm shadow-[#1877F2]/40"
                            />
                          ))}
                        </div>

                        {/* Overlay Controls */}
                        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2">
                          <span className="bg-black/80 backdrop-blur-xs text-[8px] text-neutral-300 font-mono px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                            AUDIO • HI-FI
                          </span>
                        </div>

                        {/* Centered Play Trigger overlay */}
                        <div 
                          onClick={() => togglePlayMusic(post.id, post.mediaUrl)}
                          className="absolute inset-0 bg-transparent flex items-center justify-center cursor-pointer hover:bg-black/10 transition-all"
                        >
                          <button className="w-10 h-10 rounded-full bg-[#1877F2]/95 hover:bg-[#1877F2] text-white flex items-center justify-center shadow-lg transform transition duration-300 scale-95 hover:scale-100">
                            {playingMusicId === post.id ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
                          </button>
                        </div>
                      </div>
                    ) : (post.type === 'video' || post.type === 'reel') ? (
                      <div className="w-full h-full relative">
                        <video
                          ref={el => { videoRefs.current[post.id] = el; }}
                          src={resolveUrl(post.mediaUrl)}
                          playsInline
                          loop={post.type === 'reel'}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Play pause overlay */}
                        <div 
                          onClick={() => togglePlay(post.id)}
                          className="absolute inset-0 bg-transparent flex items-center justify-center cursor-pointer group-hover:bg-black/30 transition-all"
                        >
                          <button className="w-14 h-14 rounded-full bg-[#1877F2]/90 hover:bg-[#1877F2] text-white flex items-center justify-center shadow-lg transform transition duration-300 scale-95 group-hover:scale-100">
                            {playingVideoId === post.id ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white ml-1" />}
                          </button>
                        </div>

                        {/* Top banner tag overlay */}
                        <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-xs text-white text-[9px] font-mono px-2 py-0.5 rounded border border-neutral-750 font-black uppercase">
                          {post.type.toUpperCase()} • {post.duration || 'Short'}
                        </div>
                      </div>
                    ) : (
                      // IF PIX OR STORE TYPE
                      <div className="w-full h-full relative cursor-pointer" onClick={() => {
                        if (post.storeUrl) window.open(post.storeUrl, '_blank');
                      }}>
                        <img 
                          src={resolveUrl(post.mediaUrl)} 
                          alt={post.title}
                          className="w-full h-full object-cover transition duration-300 hover:scale-[1.01]"
                          referrerPolicy="no-referrer"
                        />

                        {/* Store specific badges overlay */}
                        {post.type === 'store' && (
                          <div className="absolute top-3 left-3 bg-[#1877F2] text-white text-[10px] font-black px-2.5 py-1 rounded-sm shadow-md uppercase tracking-wider flex items-center gap-1">
                            <Store className="w-3.5 h-3.5" />
                            <span>SPONSORED PROMO</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* IF STORE PROMOTED ITEM DETAIL BAR */}
                  {post.type === 'store' && (
                    <div className="bg-amber-50 p-4 border-y border-amber-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-amber-900">
                          <DollarSign className="w-4 h-4 text-emerald-600" />
                          <span className="text-base font-black font-mono">${post.price || 0}</span>
                        </div>
                        <p className="text-[11px] text-neutral-500 font-bold">Call/WhatsApp: {post.contactNumber || 'Admin Direct'}</p>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {post.contactNumber && (
                          <a
                            href={`tel:${post.contactNumber}`}
                            className="bg-neutral-900 text-white hover:bg-black text-[10px] font-black uppercase px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                          >
                            <Phone className="w-3 h-3" />
                            <span>Call</span>
                          </a>
                        )}
                        {post.storeUrl && (
                          <a
                            href={post.storeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[#1877F2] hover:bg-[#1565C0] text-white text-[10px] font-black uppercase px-3.5 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                          >
                            <span>Open Webstore</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bottom counters row ("👍 5 likes, 💬 1 comments") */}
                  <div className="px-4 py-2 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between text-neutral-500 text-[11px] font-bold">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-[#1877F2] text-white p-1 rounded-full text-[8px] leading-none shrink-0">
                        👍
                      </span>
                      <span>{likedList.length} user likes</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span>{post.sharesCount || 0} shares</span>
                    </div>
                  </div>

                  {/* FACEBOOK STYLE THREE ACTIONS ROW */}
                  <div className="grid grid-cols-3 border-b border-neutral-150 py-1 text-xs text-neutral-600 font-extrabold text-center mx-1">
                    
                    {/* LIKE ACTION */}
                    <button
                      onClick={() => handleLikeToggle(post)}
                      className={`py-2 rounded-lg hover:bg-neutral-50 transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        hasLiked ? 'text-[#1877F2]' : 'hover:text-black'
                      }`}
                    >
                      <ThumbsUp className={`w-4 h-4 ${hasLiked ? 'fill-current' : ''}`} />
                      <span>Like</span>
                    </button>

                    {/* COMMENT ACTION */}
                    <button
                      onClick={() => setSelectedPostCommentsId(isSelectedComments ? null : post.id)}
                      className={`py-2 rounded-lg hover:bg-neutral-50 transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        isSelectedComments ? 'text-blue-600 bg-blue-50/20' : 'hover:text-black'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Comment</span>
                    </button>

                    {/* SHARE ACTION */}
                    <button
                      onClick={() => handleShareClick(post)}
                      className="py-2 rounded-lg hover:bg-neutral-50 text-neutral-600 hover:text-black transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {copiedPostId === post.id ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span className="text-emerald-600">Copied Link!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4" />
                          <span>Share</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* INLINE COMMENT SECTION DRAWERS */}
                  {isSelectedComments && (
                    <div className="bg-neutral-50/70 p-4 border-t border-neutral-100">
                      
                      {/* Comments scroll area */}
                      <div className="space-y-3 max-h-56 overflow-y-auto mb-3 pr-1 text-left">
                        {activeComments.length === 0 ? (
                          <p className="text-[11px] text-neutral-400 italic text-center py-2">
                            No citizen comment registered on this stream post. Write yours below!
                          </p>
                        ) : (
                          activeComments.map(comment => (
                            <div key={comment.id} className="flex gap-2.5 items-start">
                              <div className="w-7 h-7 rounded-full bg-neutral-300 text-neutral-700 flex items-center justify-center font-bold text-[10px] uppercase mt-0.5">
                                {comment.authorName?.[0] || 'C'}
                              </div>
                              <div className="flex-1 bg-white border rounded-2xl p-2.5 text-xs shadow-3xs relative">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-extrabold text-neutral-900">{comment.authorName}</span>
                                  <span className="text-[9px] text-neutral-400 font-bold">
                                    {comment.createdAt ? new Date(comment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                  </span>
                                </div>
                                <p className="text-neutral-700 font-medium leading-relaxed">{comment.content}</p>

                                {/* Delete access */}
                                {(userProfile?.role === 'admin' || currentUser?.uid === comment.authorId) && (
                                  <button
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="absolute right-3.5 bottom-1 text-[9px] text-rose-500 hover:underline uppercase font-bold"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Comment Input Box */}
                      <form onSubmit={handleAddComment} className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          placeholder={currentUser ? "Write a friendly comment..." : "Sign in to reply on stream..."}
                          className="flex-1 bg-white border border-neutral-200 rounded-full text-xs py-2 px-4 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                        />
                        <button 
                          type="submit" 
                          className="bg-[#1877F2] hover:bg-[#1565C0] text-white text-[11px] font-black uppercase px-4 rounded-full transition"
                        >
                          Post
                        </button>
                      </form>
                    </div>
                  )}

                </motion.article>
              );
            })}
          </div>
          </>
          )}

        </main>

        {/* RIGHT COLUMN: Promoted Store catalog always in view, Admin Profile Card & Simulated Active chat (Hidden on small/med screens) */}
        <aside className="w-72 shrink-0 hidden md:block space-y-5 text-neutral-700">
          
          {/* SECURE AD BLOCKER MODULE STATUS */}
          <div className="bg-rose-50/20 p-4 rounded-2xl border border-rose-100/60 text-left space-y-2.5 shadow-xs">
            <h3 className="text-xs font-black uppercase tracking-wider text-rose-800 flex items-center justify-between border-b border-rose-100 pb-2 mb-1">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                AkiPah Shield
              </span>
              <span className="bg-rose-100 text-rose-800 text-[8px] px-1.5 py-0.5 rounded font-black font-mono">BLOCKED</span>
            </h3>
            <p className="text-[11px] leading-relaxed text-rose-750 font-medium">
              The built-in Ad Blocker has been permanently activated. All commercial database ads, pre-seeded promotional storefront items, and sponsor-sponsored links are blocked from feed visibility.
            </p>
          </div>

          {/* ADMIN CONTEXT CARD */}
          <div className="bg-white p-4 rounded-2xl border border-neutral-200 text-left space-y-3.5 shadow-xs">
            <h4 className="text-xs font-black uppercase tracking-wider text-neutral-450">Verified Channel Publisher</h4>
            <div className="flex gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#1877F2] to-amber-500 text-white flex items-center justify-center font-black text-sm shrink-0">
                AS
              </div>
              <div>
                <h5 className="text-xs font-black text-neutral-900 flex items-center gap-1">
                  <span>Akin S. Sokpah</span>
                  <Award className="w-3.5 h-3.5 text-blue-600 fill-current" />
                </h5>
                <p className="text-[10px] text-neutral-400 font-bold leading-normal">System Administrator & Premium Lead Registrar</p>
              </div>
            </div>
            
            <p className="text-[10.5px] text-neutral-500 leading-normal">
              AkiPah Lite's primary catalog is updated directly by executive administrators. All videos and picture reviews undergo cryptographic source checks before publication.
            </p>
          </div>

          {/* SIMULATED MONROVIA CHAT CHANNELS */}
          <div className="bg-white p-4 rounded-2xl border border-neutral-200 text-left space-y-3 shadow-xs">
            <h4 className="text-xs font-black uppercase tracking-wider text-neutral-450 flex items-center justify-between">
              <span>Active Administrators</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h4>

            <div className="space-y-3.5 pt-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <div className="w-7 h-7 rounded-full bg-slate-203 text-neutral-700 flex items-center justify-center font-black text-[10px]">
                      AS
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                  </div>
                  <div>
                    <p className="font-extrabold text-neutral-850">Akin S. Sokpah</p>
                    <p className="text-[9px] text-neutral-400">Main Admin</p>
                  </div>
                </div>
                <span className="text-[9px] font-mono text-emerald-600 font-bold">Active</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <div className="w-7 h-7 rounded-full bg-slate-203 text-neutral-700 flex items-center justify-center font-black text-[10px]">
                      LN
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                  </div>
                  <div>
                    <p className="font-extrabold text-neutral-850">Lucky Global News</p>
                    <p className="text-[9px] text-neutral-400">Moderator Desk</p>
                  </div>
                </div>
                <span className="text-[9px] font-mono text-emerald-600 font-bold">Active</span>
              </div>
            </div>
          </div>

        </aside>

      </div>

      {/* ADMIN CREATOR HUB MODAL OVERLAY */}
      <AnimatePresence>
        {creatorModalOpen && (
          <div id="publisher-ad-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative text-left"
            >
              {/* Modal header (Facebook styled blue bar) */}
              <div className="bg-[#1877F2] text-white px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-white" />
                  <h3 className="text-sm font-black uppercase tracking-wider">AkiPah Lite Creator Upload Node</h3>
                </div>
                <button 
                  onClick={() => setCreatorModalOpen(false)}
                  className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitPost} className="p-5 md:p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                <div className="p-3 bg-blue-50 border border-blue-105 rounded-xl text-xs text-blue-900 leading-normal font-semibold">
                  👑 You are authenticated as an Administrator. This media file post will be immediately synchronized onto all clients' feeds live.
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-1 bg-neutral-100 rounded-xl border text-[11px]">
                  <button
                    type="button"
                    onClick={() => setPostType('reel')}
                    className={`py-2 rounded-lg font-bold transition text-center px-1 ${postType === 'reel' ? 'bg-[#1877F2] text-white shadow-xs' : 'text-neutral-600 hover:bg-neutral-200'}`}
                  >
                    Reel
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostType('video')}
                    className={`py-2 rounded-lg font-bold transition text-center px-1 ${postType === 'video' ? 'bg-[#1877F2] text-white shadow-xs' : 'text-neutral-600 hover:bg-neutral-200'}`}
                  >
                    Video
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostType('picture')}
                    className={`py-2 rounded-lg font-bold transition text-center px-1 ${postType === 'picture' ? 'bg-[#1877F2] text-white shadow-xs' : 'text-neutral-600 hover:bg-neutral-200'}`}
                  >
                    Pic
                  </button>
                  <button
                    type="button"
                    disabled
                    title="Promotional/commercial posts are permanently disabled."
                    className="py-2 rounded-lg font-bold transition text-center px-1 bg-rose-50 text-rose-500 border border-rose-100/50 cursor-not-allowed opacity-60 line-through"
                  >
                    Ad (Blocked)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostType('music')}
                    className={`py-2 rounded-lg font-bold transition text-center px-1 ${postType === 'music' ? 'bg-[#1877F2] text-white shadow-xs' : 'text-neutral-600 hover:bg-neutral-200'}`}
                  >
                    Music
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-neutral-410 mb-1">Asset Headline / Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Modern Titanium Handheld Brewer"
                    className="w-full bg-neutral-50 border rounded-xl text-xs py-2 px-3"
                  />
                </div>

                <div className="space-y-2 border-b border-neutral-100 pb-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-mono font-bold uppercase text-neutral-400">
                      Media Source File
                    </label>
                    <div className="flex gap-2 text-[9px] border bg-neutral-100 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setUploadSource('upload')}
                        className={`py-1 px-2.5 rounded-md font-bold transition ${uploadSource === 'upload' ? 'bg-white text-neutral-900 shadow-3xs' : 'text-neutral-500 hover:text-neutral-900'}`}
                      >
                        📱 Phone Upload
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadSource('link')}
                        className={`py-1 px-2.5 rounded-md font-bold transition ${uploadSource === 'link' ? 'bg-white text-neutral-900 shadow-3xs' : 'text-neutral-500 hover:text-neutral-900'}`}
                      >
                        🔗 Paste Link
                      </button>
                    </div>
                  </div>

                  {uploadSource === 'upload' ? (
                    <div className="mt-1">
                      {mediaUrl ? (
                        <div className="border border-emerald-250 bg-emerald-50/40 rounded-xl p-3 flex flex-col items-center gap-2 relative">
                          <Check className="w-8 h-8 text-white bg-emerald-500 rounded-full p-1.5" />
                          <div className="text-center">
                            <p className="text-xs font-extrabold text-emerald-950">Successfully Loaded Direct Asset!</p>
                            <p className="text-[10px] text-neutral-500 font-mono truncate max-w-[280px]">
                              {uploadedFileName || 'device_file_reference'}
                            </p>
                          </div>
                          
                          {/* Live preview of direct video or image */}
                          <div className="w-full max-w-[240px] aspect-video rounded-lg overflow-hidden border bg-black shadow-2xs">
                            {(postType === 'picture' || postType === 'store') ? (
                              <img src={mediaUrl} className="w-full h-full object-cover" alt="Preview" referrerPolicy="no-referrer" />
                            ) : (
                              <video src={mediaUrl} className="w-full h-full object-cover" controls playsInline />
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setMediaUrl('');
                              setUploadedFileName(null);
                            }}
                            className="mt-1 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-black uppercase px-3 py-1 rounded-lg transition"
                          >
                            Remove File
                          </button>
                        </div>
                      ) : (
                        <div className="border border-dashed border-neutral-300 rounded-xl p-6 text-center hover:bg-neutral-50 transition cursor-pointer relative bg-neutral-50/50">
                          {uploadingFile ? (
                            <div className="flex flex-col items-center gap-2 py-2">
                              <RefreshCw className="w-6 h-6 text-[#1877F2] animate-spin" />
                              <p className="text-xs font-bold text-neutral-600">Uploading stream asset from your phone...</p>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center gap-2 cursor-pointer py-2">
                              {postType === 'picture' || postType === 'store' ? (
                                <>
                                  <Image className="w-8 h-8 text-neutral-400 hover:text-neutral-600" />
                                  <div>
                                    <p className="text-xs font-extrabold text-[#1877F2]">Tap to Select Image from Phone</p>
                                    <p className="text-[10px] text-neutral-400 font-bold mt-0.5">Supports PNG, JPG, JPEG, WEBP up to 150MB</p>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <Film className="w-8 h-8 text-neutral-400 hover:text-neutral-600" />
                                  <div>
                                    <p className="text-xs font-extrabold text-[#1877F2]">Tap to Upload Video from Phone</p>
                                    <p className="text-[10px] text-neutral-400 font-bold mt-0.5">Supports MP4, MOV, WEBM up to 150MB</p>
                                  </div>
                                </>
                              )}
                              <input
                                type="file"
                                accept={postType === 'picture' || postType === 'store' ? 'image/*' : 'video/*'}
                                onChange={handleFileChange}
                                className="hidden"
                              />
                            </label>
                          )}

                          {uploadError && (
                            <div className="mt-2 text-[10px] text-rose-600 bg-rose-50 p-2 rounded-lg font-bold">
                              ⚠️ {uploadError}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1">
                      <input
                        type="text"
                        required
                        value={mediaUrl}
                        onChange={(e) => setMediaUrl(e.target.value)}
                        placeholder={
                          postType === 'picture' || postType === 'store' 
                            ? "e.g. https://images.unsplash.com/photo-..." 
                            : "e.g. https://assets.mixkit.co/videos/preview/..."
                        }
                        className="w-full bg-neutral-50 border rounded-xl text-xs py-2 px-3 font-mono focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase text-neutral-410 mb-1">Location tag</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Monrovia Media Core"
                      className="w-full bg-neutral-50 border rounded-xl text-xs py-2 px-3"
                    />
                  </div>

                  {postType !== 'store' ? (
                    <div>
                      <label className="block text-[10px] font-mono font-bold uppercase text-neutral-410 mb-1">Duration tag</label>
                      <input
                        type="text"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        placeholder="e.g. 0:59 or 15:42"
                        className="w-full bg-neutral-50 border rounded-xl text-xs py-2 px-3"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-mono font-bold uppercase text-neutral-410 mb-1">Sell Price ($USD)</label>
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="199"
                        className="w-full bg-neutral-50 border rounded-xl text-xs py-2 px-3"
                      />
                    </div>
                  )}
                </div>

                {postType === 'store' && (
                  <div className="grid grid-cols-2 gap-3.5 pt-1">
                    <div>
                      <label className="block text-[10px] font-mono font-bold uppercase text-neutral-410 mb-1">Store Url</label>
                      <input
                        type="text"
                        value={storeUrl}
                        onChange={(e) => setStoreUrl(e.target.value)}
                        placeholder="https://luckyglobalnews.wixsite.com/..."
                        className="w-full bg-neutral-50 border rounded-xl text-xs py-2 px-3 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono font-bold uppercase text-neutral-410 mb-1">Seller Call/WhatsApp No.</label>
                      <input
                        type="text"
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value)}
                        placeholder="+231778932145"
                        className="w-full bg-neutral-50 border rounded-xl text-xs py-2 px-3"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-neutral-410 mb-1">Narrative Description / Caption</label>
                  <textarea
                    rows={4}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide hashtags and bullet features of the item..."
                    className="w-full bg-neutral-50 border rounded-xl text-xs py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCreatorModalOpen(false)}
                    className="bg-neutral-100 text-neutral-700 font-bold text-xs py-2.5 px-4 rounded-xl hover:bg-neutral-200 transition"
                  >
                    Dismiss
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPost}
                    className="bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold text-xs py-2.5 px-6 rounded-xl transition disabled:bg-neutral-300 shadow-md"
                  >
                    {isSubmittingPost ? 'Syncing...' : 'Dispatch Live Stream'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 pb-[safe-area-inset-bottom] shadow-[0_-2px_10px_rgba(0,0,0,0.05)] px-4 py-2">
        <div className="flex items-center justify-around text-neutral-500">
          <button
            onClick={() => { setActiveTab('feed'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex-1 py-1 flex flex-col items-center justify-center transition cursor-pointer ${
              activeTab === 'feed' ? 'text-[#1877F2]' : 'hover:text-black'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-0.5">Feed</span>
          </button>
          <button
            onClick={() => { setActiveTab('reels'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex-1 py-1 flex flex-col items-center justify-center transition cursor-pointer ${
              activeTab === 'reels' ? 'text-[#1877F2]' : 'hover:text-black'
            }`}
          >
            <Film className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-0.5">Reels</span>
          </button>
          <button
            onClick={() => { setActiveTab('videos'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex-1 py-1 flex flex-col items-center justify-center transition cursor-pointer ${
              activeTab === 'videos' ? 'text-[#1877F2]' : 'hover:text-black'
            }`}
          >
            <Tv className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-0.5">Watch</span>
          </button>
          <button
            onClick={() => { setActiveTab('pictures'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex-1 py-1 flex flex-col items-center justify-center transition cursor-pointer ${
              activeTab === 'pictures' ? 'text-[#1877F2]' : 'hover:text-black'
            }`}
          >
            <Image className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-0.5">Photos</span>
          </button>
          <button
            onClick={() => { setActiveTab('music'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex-1 py-1 flex flex-col items-center justify-center transition cursor-pointer ${
              activeTab === 'music' ? 'text-[#1877F2]' : 'hover:text-black'
            }`}
          >
            <Music className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-0.5">Music</span>
          </button>
          <button
            onClick={() => { setActiveTab('seo'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex-1 py-1 flex flex-col items-center justify-center transition cursor-pointer ${
              activeTab === 'seo' ? 'text-[#1877F2]' : 'hover:text-black'
            }`}
          >
            <Globe className="w-5 h-5 text-emerald-600 animate-pulse" />
            <span className="text-[10px] font-bold mt-0.5">Hub</span>
          </button>
          {userProfile?.role === 'admin' && (
            <button
              onClick={() => { setActiveTab('admin'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`flex-1 py-1 flex flex-col items-center justify-center transition cursor-pointer ${
                activeTab === 'admin' ? 'text-amber-600 bg-amber-50/40' : 'hover:text-black'
              }`}
            >
              <Settings className="w-5 h-5 text-amber-600" />
              <span className="text-[10px] font-bold mt-0.5">Admin</span>
            </button>
          )}
        </div>
      </div>

      {/* AUTHENTICATION BACKDROP DIALOG (AkiPah style) */}
      <AnimatePresence>
        {showAuthModal && (
          <AuthModal 
            onClose={() => setShowAuthModal(false)}
            onSuccess={(uid, role) => {
              // Refreshes the local profiles
              console.log("Logged in profile successfully logged UID", uid, role);
            }}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
