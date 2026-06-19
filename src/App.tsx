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
  BookOpen, Compass, Award, Bookmark, ThumbsUp, MessageSquare, AlertCircle, RefreshCw
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
  },
  {
    id: 'seed_store_01',
    type: 'store',
    title: 'AkiPah Lite Dual-Boiler Espresso Machine',
    description: 'An absolute masterpiece for remote builders and designers. Built with commercial-grade copper pipes, a mechanical extraction lever, and real-time pressure gauge indicators. Supports high-performance coffee crafting from your desk.',
    mediaUrl: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=800',
    price: 199,
    storeUrl: 'https://luckyglobalnews.wixsite.com/akipah-espresso',
    contactNumber: '+231778932145',
    likesCount: 310,
    likedBy: [],
    sharesCount: 125,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    location: 'AkiPah Premium Store'
  }
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Active Main Navigation tab: 'feed' (All), 'reels' (Only short video reels), 'videos' (long videos), 'pictures' (Photos), 'store' (Sponsor promos)
  const [activeTab, setActiveTab] = useState<'feed' | 'reels' | 'videos' | 'pictures' | 'store'>('feed');
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
    const postsQuery = query(collection(db, 'posts'));
    const unsub = onSnapshot(postsQuery, (snapshot) => {
      const dbPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MediaPost));
      
      // Sort posts chronologically
      dbPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Merge dbPosts with any seed posts that do not already exist inside Firestore
      const merged = [...dbPosts];
      SEED_POSTS.forEach(seed => {
        if (!merged.some(p => p.id === seed.id)) {
          merged.push(seed);
        }
      });
      setPosts(merged);
    }, (err) => {
      console.error("Firestore snapshot error ignored:", err);
      // Fallback display
      setPosts(SEED_POSTS);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setUploadError(null);
    setUploadedFileName(file.name);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Content = reader.result as string;
          const response = await fetch('/api/upload-direct', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              filename: file.name,
              mimeType: file.type,
              base64Content: base64Content,
            }),
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Server upload failed');
          }

          const data = await response.json();
          setMediaUrl(data.url);
        } catch (err: any) {
          console.error("Direct upload error:", err);
          setUploadError(err.message || 'File upload failed.');
        } finally {
          setUploadingFile(false);
        }
      };
      reader.onerror = () => {
        setUploadError("Error reading file.");
        setUploadingFile(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error("FileReader error:", err);
      setUploadError(err.message || 'Error parsing file.');
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
          
          {/* Logo & Search Block */}
          <div className="flex items-center gap-2 flex-grow sm:flex-grow-0 max-w-xs md:max-w-md">
            <div className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center font-black text-white text-xl tracking-tighter shrink-0 shadow-sm border border-blue-600/30">
              ap
            </div>
            <div className="relative flex-1 hidden sm:block">
              <span className="absolute left-3 top-2.5 text-neutral-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search AkiPah..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-100 border border-transparent rounded-full text-xs py-2.5 pl-9 pr-4 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition font-medium"
              />
            </div>
            {/* Short app designation */}
            <span className="bg-blue-50 text-[#1877F2] border border-blue-100 text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-md ml-1 shrink-0 font-mono">
              Lite
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
              onClick={() => { setActiveTab('store'); }}
              className={`flex-1 py-1.5 px-3 rounded-xl flex flex-col items-center justify-center hover:bg-neutral-100 transition relative ${
                activeTab === 'store' ? 'text-[#1877F2] bg-blue-50/50' : 'hover:text-black'
              }`}
              title="Store Shop"
            >
              <Store className="w-5.5 h-5.5" />
              <span className="text-[9px] font-bold mt-0.5 hidden md:block">Market</span>
              {activeTab === 'store' && <span className="absolute bottom-0 inset-x-4 h-1 bg-[#1877F2] rounded-full" />}
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

            {/* If simple visitor, encourage admin test */}
            {!currentUser && (
              <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-[10.5px] text-blue-900 leading-relaxed font-semibold">
                Want admin privileges to post videos, reels and pictures? Use login: <strong className="underline font-bold text-blue-950">aboysokpah@gmail.com</strong> with password <span className="font-mono bg-blue-105 p-0.5 rounded text-neutral-900">Admin@2026</span> to try the system!
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
                onClick={() => setActiveTab('store')}
                className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  activeTab === 'store' ? 'bg-blue-50 text-[#1877F2]' : 'hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                <Store className="w-4.5 h-4.5" />
                <span>Promoted Market</span>
              </button>
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
            <p className="font-mono text-[9.5px]">Lat: 6.301° N | Lon: 10.797° W</p>
          </div>
        </aside>

        {/* CENTER COLUMN: Top Stories Tray, Creator publish pill, and Feed lists */}
        <main className="flex-1 min-w-0 max-w-2xl mx-auto space-y-5">
          
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
                    src={reel.thumbnailUrl || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=200'} 
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
                    
                    {/* IF VIDEO OR REEL TYPE */}
                    {(post.type === 'video' || post.type === 'reel') ? (
                      <div className="w-full h-full relative">
                        <video
                          ref={el => { videoRefs.current[post.id] = el; }}
                          src={post.mediaUrl}
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
                          src={post.mediaUrl} 
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

        </main>

        {/* RIGHT COLUMN: Promoted Store catalog always in view, Admin Profile Card & Simulated Active chat (Hidden on small/med screens) */}
        <aside className="w-72 shrink-0 hidden md:block space-y-5 text-neutral-700">
          
          {/* ALWAYS VISIBLE PROMOTED PRODUCTS CATALOG SPACES */}
          <div className="bg-white p-4 rounded-2xl shadow-xs border border-neutral-200 text-left space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-450 flex items-center justify-between border-b pb-2 mb-1">
              <span>Sponsor Store Promos</span>
              <span className="bg-amber-100 text-amber-800 text-[8px] px-1.5 py-0.2 rounded font-black font-mono">PROMOTED</span>
            </h3>

            {storePromos.length === 0 ? (
              <p className="text-[11px] text-neutral-400 italic">No products listed by administrator yet.</p>
            ) : (
              <div className="space-y-3">
                {storePromos.slice(0, 3).map(promo => (
                  <div key={promo.id} className="bg-neutral-50/55 rounded-xl border p-2.5 flex gap-2 hover:border-slate-350 transition">
                    <img 
                      src={promo.mediaUrl} 
                      alt="" 
                      className="w-12 h-12 rounded-lg object-cover bg-neutral-200"
                    />
                    <div className="min-w-0 flex-1 text-left text-[11px]">
                      <h4 className="font-extrabold text-neutral-900 truncate mb-0.5">{promo.title}</h4>
                      <p className="text-emerald-700 font-extrabold font-mono">${promo.price}</p>
                      
                      <div className="mt-1.5 flex items-center gap-1.5">
                        {promo.storeUrl && (
                          <a 
                            href={promo.storeUrl}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-blue-50 text-[#1877F2] hover:bg-blue-100 text-[9px] font-black px-2 py-0.5 rounded transition"
                          >
                            Explore ad
                          </a>
                        )}
                        <span className="text-[8px] text-neutral-400">{promo.location}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                  👑 You are authenticated as an Administrator. This media file post will be immediately synchronized onto all clients' feeds around the world.
                </div>

                <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 rounded-xl border text-xs">
                  <button
                    type="button"
                    onClick={() => setPostType('reel')}
                    className={`py-2 px-3 rounded-lg font-bold transition ${postType === 'reel' ? 'bg-[#1877F2] text-white' : 'text-neutral-600'}`}
                  >
                    Short Reel
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostType('video')}
                    className={`py-2 px-3 rounded-lg font-bold transition ${postType === 'video' ? 'bg-[#1877F2] text-white' : 'text-neutral-600'}`}
                  >
                    Long Video
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostType('picture')}
                    className={`py-2 px-3 rounded-lg font-bold transition ${postType === 'picture' ? 'bg-[#1877F2] text-white' : 'text-neutral-600'}`}
                  >
                    Snap Pic
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostType('store')}
                    className={`py-2 px-3 rounded-lg font-bold transition ${postType === 'store' ? 'bg-[#1877F2] text-white' : 'text-neutral-600'}`}
                  >
                    Sponsor promo
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
            onClick={() => { setActiveTab('store'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex-1 py-1 flex flex-col items-center justify-center transition cursor-pointer ${
              activeTab === 'store' ? 'text-[#1877F2]' : 'hover:text-black'
            }`}
          >
            <Store className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-0.5">Market</span>
          </button>
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
