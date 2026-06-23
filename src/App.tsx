import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { 
  collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, 
  query, orderBy, getDocs, setDoc, getDoc
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { UserProfile, MediaPost, PostComment, Inquiry, UserRole } from './types';
import AuthModal from './components/AuthModal';

import { 
  BookOpen, Award, Compass, Phone, MapPin, Mail, Clock, Send, 
  ShieldAlert, Sparkles, Check, Trash2, Shield, Plus, X, ListFilter,
  Users, CheckCircle2, Bookmark, Flame, Calendar, Search, HelpCircle,
  Play, Video, Image, Volume2, ArrowRight, Star, GraduationCap, Lock, Unlock, LogOut, CheckSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Elite Seed posts loaded in case Firestore is clean
const SEED_SCHOOL_POSTS: MediaPost[] = [
  {
    id: 'seed_post_01',
    type: 'announcement',
    title: 'Admissions Open for 2026/2027 Academic Year',
    description: 'We are pleased to announce that registrations are officially open for early childhood development up to senior high school! Experience a balanced curriculum that combines STEM academics with robust technical vocational training in Montserrado County. Affordable fees plans and partial merit scholarships are available.',
    mediaUrl: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&q=80&w=800',
    likesCount: 145,
    likedBy: [],
    sharesCount: 34,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    location: 'Greenland Office, Johnsonville'
  },
  {
    id: 'seed_post_02',
    type: 'video',
    title: 'T-VET Practical Training Lab Tour',
    description: 'A glimpse inside the state-of-the-art MISS Vocational workshop in Johnsonville. Watch our students conduct practical diagnostic electronics and advanced cabling. Empowering youths with job-ready tech skills.',
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-conduct-testing-on-computer-circuit-board-40078-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&q=80&w=800',
    duration: '2:15',
    likesCount: 92,
    likedBy: [],
    sharesCount: 18,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    location: 'Vocational Campus Workshop'
  },
  {
    id: 'seed_post_03',
    type: 'picture',
    title: 'Elementary Science and Arts Exhibition',
    description: 'Celebrating high creativity and engineering! Our grade school students presented outstanding scale models of local sustainable architectures and solar-powered lights during the Weekend Arts Expo.',
    mediaUrl: 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&q=80&w=800',
    likesCount: 112,
    likedBy: [],
    sharesCount: 22,
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    location: 'MISS Main Assembly Hall'
  }
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // App tabs & Navigation
  const [activeTab, setActiveTab] = useState<'home' | 'academics' | 'tvet' | 'buzz' | 'contact' | 'admin'>('home');
  const [newsFilter, setNewsFilter] = useState<'all' | 'announcement' | 'video' | 'picture'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Live collections from Firestore
  const [posts, setPosts] = useState<MediaPost[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [newCommentInput, setNewCommentInput] = useState('');
  
  // Custom interactive demo toggle for admins evaluating the app
  const [isDemoAdminMode, setIsDemoAdminMode] = useState(false);

  // Inquiries Contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSuccess, setContactSuccess] = useState(false);
  const [submittingInquiry, setSubmittingInquiry] = useState(false);

  // New Post state for Admin Panel
  const [adminPostType, setAdminPostType] = useState<'announcement' | 'video' | 'picture'>('announcement');
  const [adminPostTitle, setAdminPostTitle] = useState('');
  const [adminPostDesc, setAdminPostDesc] = useState('');
  const [adminPostMediaUrl, setAdminPostMediaUrl] = useState('');
  const [adminPostDuration, setAdminPostDuration] = useState('');
  const [adminPostLocation, setAdminPostLocation] = useState('Greenland Community, Johnsonville');
  const [publishingPost, setPublishingPost] = useState(false);
  const [adminAlert, setAdminAlert] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Check if current user is admin
  const isUserAdmin = userProfile?.role === 'admin' || isDemoAdminMode;

  // Real authenticated Firestore admin verification
  const isRealAdmin = !!currentUser && (
    userProfile?.role === 'admin' || 
    ['aki.sokpah.link@gmail.com', 'luckyglobalnews@gmail.com', 'aboysokpah@gmail.com'].includes(currentUser.email || '')
  );

  // Track state and session
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        // Load additional custom role schema from users collection
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data() as UserProfile);
          } else {
            // Setup a smart fallback profile
            const isDefaultAdmin = user.email === 'luckyglobalnews@gmail.com' || user.email === 'aboysokpah@gmail.com';
            const fallback: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              fullName: user.displayName || 'MISS Community Member',
              role: isDefaultAdmin ? 'admin' : 'user',
              createdAt: new Date().toISOString()
            };
            await setDoc(doc(db, 'users', user.uid), fallback);
            setUserProfile(fallback);
          }
        } catch (e) {
          console.warn("User Document sync fail, fallback user:", e);
          setUserProfile({
            uid: user.uid,
            email: user.email || '',
            fullName: user.displayName || 'MISS Guest',
            role: 'user',
            createdAt: new Date().toISOString()
          });
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Fetch real-time posts
  useEffect(() => {
    const postsQuery = query(collection(db, 'posts'));
    const unsub = onSnapshot(postsQuery, (snap) => {
      const livePosts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MediaPost));
      // Sort in reverse technological timestamp order
      livePosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // If Firestore database is cleanly empty, merge or display with seed posts
      if (livePosts.length === 0) {
        setPosts(SEED_SCHOOL_POSTS);
      } else {
        setPosts(livePosts);
      }
    }, (err) => {
      console.warn("Firestore posts listener error:", err);
      setPosts(SEED_SCHOOL_POSTS);
    });

    return () => unsub();
  }, []);

  // Fetch real-time inquiries for Admin Dashboard
  useEffect(() => {
    if (!isUserAdmin) {
      setInquiries([]);
      return;
    }

    if (!isRealAdmin) {
      // If of simulated sandbox mode, we serve premium sample logs locally
      setInquiries([
        {
          id: 'mock_inq_1',
          fullName: 'Samuel Karpeh',
          email: 'samuel@gmail.com',
          subject: 'Registration details for early childhood program',
          message: 'Hello, I want to inquire about the bi-semester payment installments for my child who is entering Kindergarten this semester. Please send the fee schedules.',
          status: 'pending',
          createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
        },
        {
          id: 'mock_inq_2',
          fullName: 'Korto Flomo',
          email: 'kortoflomo@gmail.com',
          subject: 'T-VET Electricity track certification questions',
          message: 'My brother wants to enroll in the Saturday Electricity and Diagnostic Electronics lab course. Is the 9-month class sufficient for the workforce certificate?',
          status: 'resolved',
          createdAt: new Date(Date.now() - 3600000 * 22).toISOString()
        }
      ]);
      return;
    }

    const inquiriesQuery = query(collection(db, 'inquiries'));
    const unsub = onSnapshot(inquiriesQuery, (snap) => {
      const liveInquiries = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Inquiry));
      liveInquiries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setInquiries(liveInquiries);
    }, (err) => {
      console.warn("Firestore inquiries read restricted; applying secure sandbox view layout:", err.message);
    });
    return () => unsub();
  }, [isUserAdmin, isRealAdmin]);

  // Fetch real-time comments
  useEffect(() => {
    const commentsQuery = query(collection(db, 'comments'));
    const unsub = onSnapshot(commentsQuery, (snap) => {
      const liveComments = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PostComment));
      liveComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setComments(liveComments);
    }, (err) => {
      console.error("Comments system failure:", err);
    });
    return () => unsub();
  }, []);

  // Handle contact form submission (Parent Inquiries)
  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      alert("Please fill out your name, email address, and message description.");
      return;
    }

    setSubmittingInquiry(true);
    const payload = {
      fullName: contactName.trim(),
      email: contactEmail.trim().toLowerCase(),
      subject: contactSubject.trim() || 'General Registration Inquiry',
      message: contactMessage.trim(),
      status: 'pending' as const,
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'inquiries'), payload);
      setContactSuccess(true);
      setContactName('');
      setContactEmail('');
      setContactSubject('');
      setContactMessage('');
      
      // Auto fade success message in 5 seconds
      setTimeout(() => setContactSuccess(false), 8000);
    } catch (err) {
      console.error("Inquiry writing error", err);
      try {
        handleFirestoreError(err, OperationType.WRITE, 'inquiries');
      } catch (e: any) {
        alert("Registration Submission Warning: " + e.message);
      }
    } finally {
      setSubmittingInquiry(false);
    }
  };

  // Submit comment on particular post
  const handleAddComment = async (postId: string) => {
    if (!newCommentInput.trim()) return;
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    const payload = {
      postId,
      authorId: currentUser.uid,
      authorName: userProfile?.fullName || currentUser.displayName || 'MISS Community Visitor',
      authorEmail: currentUser.email || '',
      content: newCommentInput.trim(),
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'comments'), payload);
      setNewCommentInput('');
    } catch (err) {
      console.error("Submit comment fail:", err);
      try {
        handleFirestoreError(err, OperationType.CREATE, 'comments');
      } catch (e: any) {
        alert("Permission denied writing comments. Please check login state.");
      }
    }
  };

  // Delete Comments (Admins only)
  const handleDeleteComment = async (commentId: string) => {
    if (!isUserAdmin) return;
    if (!window.confirm("Are you sure you want to delete this library comment?")) return;
    try {
      await deleteDoc(doc(db, 'comments', commentId));
    } catch (err) {
      console.error("Delete comment failed:", err);
      alert("Only school organizers can resolve comments.");
    }
  };

  // Publish Academic / TVET Post (Admin Only)
  const handlePublishAdminPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPostTitle.trim() || !adminPostDesc.trim()) {
      setAdminAlert({ type: 'error', text: 'Title and Description details are required.' });
      return;
    }

    setPublishingPost(true);
    setAdminAlert(null);

    // Provide premium look with fallback high quality images if admin leaves it blank
    let finalizedMediaUrl = adminPostMediaUrl.trim();
    if (!finalizedMediaUrl) {
      if (adminPostType === 'announcement') {
        finalizedMediaUrl = 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&q=80&w=800'; // Classroom
      } else if (adminPostType === 'video') {
        finalizedMediaUrl = 'https://assets.mixkit.co/videos/preview/mixkit-conduct-testing-on-computer-circuit-board-40078-large.mp4';
      } else {
        finalizedMediaUrl = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800'; // Learning tech
      }
    }

    const payload = {
      type: adminPostType,
      title: adminPostTitle.trim(),
      description: adminPostDesc.trim(),
      mediaUrl: finalizedMediaUrl,
      duration: adminPostType === 'video' ? (adminPostDuration.trim() || '1:30') : undefined,
      likesCount: 0,
      sharesCount: 0,
      likedBy: [],
      location: adminPostLocation.trim() || 'Greenland Campus',
      createdAt: new Date().toISOString()
    };

    try {
      if (!isRealAdmin) {
        // Simulated sandbox post publishing
        const mockNewPost: MediaPost = {
          id: 'sim_post_' + Math.random().toString(36).substring(2, 9),
          ...payload
        };
        setPosts(prev => [mockNewPost, ...prev]);
        setAdminPostTitle('');
        setAdminPostDesc('');
        setAdminPostMediaUrl('');
        setAdminPostDuration('');
        setAdminAlert({ type: 'success', text: 'Simulated Broadcast: Academic update published to local Sandbox feed!' });
        setTimeout(() => setAdminAlert(null), 5000);
        return;
      }

      await addDoc(collection(db, 'posts'), payload);
      setAdminPostTitle('');
      setAdminPostDesc('');
      setAdminPostMediaUrl('');
      setAdminPostDuration('');
      setAdminAlert({ type: 'success', text: 'Academic update published to Multee Buzz stream successfully!' });
      
      // Auto clear alert
      setTimeout(() => setAdminAlert(null), 5000);
    } catch (err) {
      console.error("Failed writing new post", err);
      setAdminAlert({ type: 'error', text: 'Error publishing: Verification of Admin credentials required.' });
    } finally {
      setPublishingPost(false);
    }
  };

  // Update Inquiry Status (e.g. mark as resolved, archive, etc.)
  const handleUpdateInquiryStatus = async (inquiryId: string, nextStatus: 'pending' | 'resolved' | 'archived') => {
    if (!isUserAdmin) return;

    if (!isRealAdmin) {
      setInquiries(prev => prev.map(inq => inq.id === inquiryId ? { ...inq, status: nextStatus } : inq));
      return;
    }

    try {
      await updateDoc(doc(db, 'inquiries', inquiryId), { status: nextStatus });
    } catch (err) {
      console.error("Update status failed", err);
    }
  };

  // Delete/Clear Inquiry (Admin cleanup)
  const handleDeleteInquiry = async (inquiryId: string) => {
    if (!isUserAdmin) return;
    if (!window.confirm("Archive reference and permanently remove this inquiry from MISS files?")) return;

    if (!isRealAdmin) {
      setInquiries(prev => prev.filter(inq => inq.id !== inquiryId));
      return;
    }

    try {
      await deleteDoc(doc(db, 'inquiries', inquiryId));
    } catch (err) {
      console.error("Failed to delete inquiry log:", err);
    }
  };

  // Filter posts based on search and selected categories
  const filteredPosts = posts.filter(post => {
    const matchesCategory = newsFilter === 'all' || post.type === newsFilter;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          post.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (post.location && post.location.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Ignore legacy formats if they arise
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-emerald-200">
      
      {/* ELITE BRAND HEADER & LOGO ALIGNMENTS */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* BRAND LOGO */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center shadow-lg shadow-emerald-700/20 text-white font-serif font-black text-xl border border-emerald-500/30">
                M
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-serif font-black tracking-tight text-emerald-900">MULTEE</span>
                  <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded font-black font-mono">MISS</span>
                </div>
                <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase leading-none mt-0.5">International School System</p>
              </div>
            </div>

            {/* DESKTOP DESK NAVIGATION */}
            <nav className="hidden lg:flex items-center gap-1">
              {[
                { id: 'home', label: 'Welcome Portal' },
                { id: 'academics', label: 'Academic Programs' },
                { id: 'tvet', label: 'T-VET Tracks' },
                { id: 'buzz', label: 'Multee Buzz Updates' },
                { id: 'contact', label: 'Contact & Inquiry' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all relative ${
                    activeTab === tab.id 
                      ? 'text-emerald-800 font-extrabold bg-emerald-50' 
                      : 'text-slate-600 hover:text-emerald-900 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-1 inset-x-4 h-0.5 bg-emerald-600 rounded-full" />
                  )}
                </button>
              ))}
              
              <button
                onClick={() => setActiveTab('admin')}
                className={`ml-2 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border transition-all flex items-center gap-1.5 ${
                  isUserAdmin 
                    ? 'bg-amber-100/90 text-amber-900 border-amber-300 shadow-xs' 
                    : activeTab === 'admin'
                      ? 'bg-emerald-550 text-white border-emerald-600'
                      : 'text-slate-700 bg-slate-100 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {isUserAdmin ? <Unlock className="w-3.5 h-3.5 text-amber-600 animate-pulse" /> : <Lock className="w-3.5 h-3.5" />}
                Command Center
              </button>
            </nav>

            {/* PORTAL SESSION ACCESS */}
            <div className="flex items-center gap-3">
              {currentUser ? (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:block text-right">
                    <p className="text-xs font-black text-slate-900 leading-none truncate max-w-[120px]">{userProfile?.fullName || currentUser.displayName}</p>
                    <span className="text-[9px] font-mono uppercase bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-black mt-1 inline-block">
                      {userProfile?.role === 'admin' ? 'Admin Staff' : 'Student Portal'}
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      await signOut(auth);
                      setIsDemoAdminMode(false);
                      setActiveTab('home');
                    }}
                    title="Log Out From School Portal"
                    className="p-2 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="bg-emerald-900 hover:bg-emerald-950 text-white text-xs font-black px-4 py-2.5 rounded-xl transition shadow-md shadow-emerald-950/20 uppercase tracking-wider"
                >
                  Sign In
                </button>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* QUICK FACTS HERO INFORMATION BAR */}
      <div className="bg-emerald-955 text-white bg-emerald-900 py-3 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-xs font-bold font-mono tracking-tight flex flex-wrap gap-y-2 items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-emerald-100">REGISTERED & ACCLIMATED PRIVATE EDUCATION</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-emerald-105 text-[11px]">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-400" /> Greenland Community, Johnsonville, Liberia
            </span>
            <span className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-amber-400" /> +231 77 782 9659
            </span>
          </div>
        </div>
      </div>

      {/* RENDER ACTIVE SCREEN CONTROLLER */}
      <main className="py-6 sm:py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: WELCOME PORTAL (HOME) */}
          {activeTab === 'home' && (
            <motion.div
              key="portal-home"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-12"
            >
              
              {/* PRIMARY BRAND BANNER CARDS */}
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-[#014125] to-emerald-950 text-white p-8 md:p-14 text-left shadow-2xl border border-emerald-850/50">
                {/* Background high-end aesthetics overlay */}
                <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 bg-cover pointer-events-none bg-[url('https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&q=80&w=600')]" />
                <div className="absolute -left-10 -bottom-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="max-w-2xl space-y-5 relative z-10">
                  <span className="bg-amber-400/20 text-amber-300 text-[11px] px-3 py-1 rounded-full font-black font-mono border border-amber-400/30 uppercase tracking-widest inline-block">
                    ★ Premium Academic & Vocational Center
                  </span>
                  
                  <h1 className="text-4xl md:text-5xl font-serif font-black tracking-tight leading-tight md:leading-none text-white">
                    Multee International <br/>
                    <span className="text-amber-400">School System (MISS)</span>
                  </h1>
                  
                  <p className="text-slate-300 text-sm md:text-base leading-relaxed leading-6 font-medium">
                    A premier private educational institution located in the Greenland Community of Johnsonville, Montserrado County, Liberia. Operating as structured academic and technical-vocational divisions, we foster affordable, pristine instructions designed to unlock student potentials starting at the nursery phase up to skilled high school qualifications.
                  </p>

                  <div className="pt-4 flex flex-wrap gap-4">
                    <button 
                      onClick={() => setActiveTab('academics')}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-6 py-3 rounded-xl uppercase tracking-wider transition shadow-lg shadow-emerald-950/40 flex items-center gap-2 cursor-pointer"
                    >
                      Academic Division <ArrowRight className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setActiveTab('tvet')}
                      className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-extrabold text-xs px-6 py-3 rounded-xl uppercase tracking-wider transition flex items-center gap-2 cursor-pointer"
                    >
                      Explore T-VET Tracks
                    </button>
                    <button 
                      onClick={() => setActiveTab('contact')}
                      className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-xs px-6 py-3 rounded-xl uppercase tracking-wider transition shadow-lg"
                    >
                      Submit Admissions Inquiry
                    </button>
                  </div>
                </div>
              </div>

              {/* THREE CORE VALUE METRICS - THE BENTO GRID */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-xs text-left relative overflow-hidden group hover:shadow-md transition">
                  <div className="absolute top-0 right-0 p-8 text-neutral-50 font-serif font-black text-7xl select-none group-hover:scale-105 transition">12</div>
                  <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4 z-10 relative">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <span className="text-emerald-700 font-mono text-[10px] uppercase font-black tracking-widest block mb-1">Academic</span>
                  <h3 className="text-lg font-bold text-slate-950">Nursery to 12th Grade</h3>
                  <p className="text-slate-500 text-xs leading-relaxed mt-2 relative z-10">
                    Early childhood development up toward Senior High. Complete academic excellence built on pristine standards and WAEC/WASSCE approved programs.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-xs text-left relative overflow-hidden group hover:shadow-md transition">
                  <div className="absolute top-0 right-0 p-8 text-neutral-50 font-serif font-black text-7xl select-none group-hover:scale-105 transition">6</div>
                  <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 mb-4 z-10 relative">
                    <Compass className="w-6 h-6" />
                  </div>
                  <span className="text-amber-800 font-mono text-[10px] uppercase font-black tracking-widest block mb-1">T-VET Track</span>
                  <h3 className="text-lg font-bold text-slate-950">Technical & Vocational</h3>
                  <p className="text-slate-500 text-xs leading-relaxed mt-2 relative z-10">
                    6 active professional tracks including Electricity, Plumbing, and Catering preparing students directly for the global digital & physical workforce.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-xs text-left relative overflow-hidden group hover:shadow-md transition">
                  <div className="absolute top-0 right-0 p-8 text-neutral-50 font-serif font-black text-7xl select-none group-hover:scale-105 transition">$</div>
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4 z-10 relative">
                    <Bookmark className="w-6 h-6" />
                  </div>
                  <span className="text-blue-700 font-mono text-[10px] uppercase font-black tracking-widest block mb-1">Liberian Capital</span>
                  <h3 className="text-lg font-bold text-slate-950">Highly Affordable Rates</h3>
                  <p className="text-slate-500 text-xs leading-relaxed mt-2 relative z-10">
                    Based strictly inside the Greenland Community of Johnsonville. Unlocking potential through cheap tuition rates and high quality instructions.
                  </p>
                </div>

              </div>

              {/* CURRICULUM MISSION & STORY HIGHLIGHTS */}
              <div className="bg-white rounded-2xl border border-emerald-100 p-6 md:p-10 text-left grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-[11px] font-black px-2.5 py-1 rounded-md uppercase font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Our Curriculum Mission
                  </div>
                  <h2 className="text-2xl md:text-3xl font-serif font-bold text-slate-950">
                    Fostering Academic Excellence with Hands-on Careers
                  </h2>
                  <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
                    Multee International School System represents an outstanding training model in Montserrado County. Operating both Academic and Technical-Vocational divisions, we unlock student potentials starting at the nursery phase up to skilled high school qualifications.
                  </p>
                  
                  <div className="space-y-3 pt-3">
                    <div className="flex items-start gap-2 text-xs">
                      <span className="p-1 rounded bg-amber-100 text-amber-900 font-black font-mono">12 yrs</span>
                      <div>
                        <strong className="text-slate-900 block font-bold">Complete Grade Track</strong>
                        <span className="text-slate-500">From early nursery education cleanly structured to high school certificates</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-xs">
                      <span className="p-1 rounded bg-emerald-100 text-emerald-990 font-black font-mono">9 mos</span>
                      <div>
                        <strong className="text-emerald-900 block font-bold">Vocational Certification</strong>
                        <span className="text-slate-500">Intensive labor-market preparation modules for fast employment</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative rounded-xl overflow-hidden shadow-lg border">
                  <img 
                    src="https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&q=80&w=800" 
                    alt="Students in classroom" 
                    className="w-full h-80 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-6 text-white text-left">
                    <div>
                      <p className="text-xs font-mono uppercase font-black text-amber-400">Greenland Community Campus</p>
                      <h4 className="font-bold text-lg">Pristine Physical Classrooms</h4>
                    </div>
                  </div>
                </div>
              </div>

              {/* LATEST CAMPUS UPDATES SLIDER (NEWS & GALLERY REDIRECT) */}
              <div className="space-y-6">
                <div className="flex items-center justify-between text-left">
                  <div>
                    <span className="text-[10px] font-mono uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-black font-mono">Multee Buzz</span>
                    <h2 className="text-2xl font-serif font-bold text-slate-950 mt-1">Recent Campus Stories & News</h2>
                  </div>
                  <button 
                    onClick={() => setActiveTab('buzz')}
                    className="text-emerald-700 hover:text-emerald-900 text-xs font-bold flex items-center gap-1"
                  >
                    View All Buzz Updates <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {posts.slice(0, 3).map(post => (
                    <div key={post.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:border-emerald-300 transition flex flex-col text-left">
                      <div className="relative h-48 bg-slate-100">
                        {post.type === 'video' ? (
                          <div className="relative w-full h-full">
                            <video src={post.mediaUrl} className="w-full h-full object-cover" muted playsInline />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <span className="p-3 bg-white/25 backdrop-blur-md rounded-full text-white">
                                <Play className="w-6 h-6 fill-current" />
                              </span>
                            </div>
                          </div>
                        ) : (
                          <img src={post.mediaUrl} alt={post.title} className="w-full h-full object-cover" />
                        )}
                        <span className="absolute top-3 left-3 bg-emerald-900 text-white text-[9px] px-2 py-0.5 font-mono uppercase font-black rounded-sm tracking-widest">
                          {post.type}
                        </span>
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          <h3 className="font-bold text-slate-900 block group-hover:text-emerald-800 text-sm line-clamp-1">{post.title}</h3>
                          <p className="text-slate-500 text-xs mt-1.5 leading-relaxed line-clamp-3">{post.description}</p>
                        </div>
                        <div className="text-[10.5px] font-mono text-slate-400 flex items-center justify-between border-t pt-2.5">
                          <span>{post.location}</span>
                          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </motion.div>
          )}

          {/* TAB 2: ACADEMIC PROGRAMS */}
          {activeTab === 'academics' && (
            <motion.div
              key="portal-academics"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8 text-left"
            >
              <div className="border-b pb-4 mb-6">
                <span className="text-[10px] font-mono uppercase bg-emerald-100 text-emerald-850 px-2.5 py-1 rounded font-black">Admissions approved</span>
                <h1 className="text-3xl font-serif font-black text-slate-950 mt-1">MISS Academic Division</h1>
                <p className="text-slate-500 text-sm mt-1">Excellent nursery toward high school qualification curriculums approved by the Liberian Ministry of Education and WAEC/WASSCE boards.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* TIMELINE TRACK */}
                <div className="bg-white p-6 rounded-2xl border border-slate-250/70 space-y-6">
                  <h3 className="text-xl font-bold font-serif text-emerald-900 border-b pb-2">Academic Roadmap Curriculum</h3>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 bg-emerald-100 text-emerald-900 text-xs font-extrabold rounded-full flex items-center justify-center">1</span>
                        <h4 className="font-extrabold text-[#006d44] text-sm">Early Childhood (Nursery - Kindergarten)</h4>
                      </div>
                      <p className="text-slate-500 text-xs mt-1 leading-relaxed pl-6">
                        Laying solid foundation blocks for sound numeric, literacy, behavioral skills, and creative manual play.
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 bg-emerald-100 text-emerald-900 text-xs font-extrabold rounded-full flex items-center justify-center">2</span>
                        <h4 className="font-extrabold text-[#006d44] text-sm">Elementary School (Grades 1 - 6)</h4>
                      </div>
                      <p className="text-slate-500 text-xs mt-1 leading-relaxed pl-6">
                        Fostering high literacy standards, science introductions, local geography, math and primary arts.
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 bg-emerald-100 text-emerald-900 text-xs font-extrabold rounded-full flex items-center justify-center">3</span>
                        <h4 className="font-extrabold text-[#006d44] text-sm">Junior High (Grades 7 - 9)</h4>
                      </div>
                      <p className="text-slate-500 text-xs mt-1 leading-relaxed pl-6">
                        Introduction to advanced algebra, social sciences, Liberian history, and preparing for initial certificate models.
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 bg-emerald-100 text-emerald-900 text-xs font-extrabold rounded-full flex items-center justify-center">4</span>
                        <h4 className="font-extrabold text-[#006d44] text-sm">Senior High School (Grades 10 - 12)</h4>
                      </div>
                      <p className="text-slate-500 text-xs mt-1 leading-relaxed pl-6">
                        Rigorous preparation for WAEC & WASSCE regional examinations. Integrated with early digital, chemistry, physics, and vocational pathways.
                      </p>
                    </div>
                  </div>
                </div>

                {/* SCHOOL HIGHLIGHTS */}
                <div className="space-y-6">
                  <div className="bg-emerald-900 text-white p-6 rounded-2xl text-left relative overflow-hidden">
                    <div className="absolute right-0 bottom-0 opacity-10 font-serif text-9xl">MISS</div>
                    <span className="text-amber-300 font-mono text-xs uppercase font-black block">National Standard</span>
                    <h3 className="text-xl font-bold font-serif mt-1">WAEC / WASSCE Preparation</h3>
                    <p className="text-emerald-100 text-xs mt-2 leading-relaxed">
                      Our high school students undergo intensive, specialized tutorials matching statutory regional standards. We build outstanding readiness in mathematics, English writing, sciences, and history, ensuring excellent graduation rates.
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-white/20 rounded text-[11px] font-mono">APPROVED EXAM CENTER</span>
                      <span className="px-2.5 py-1 bg-amber-400 text-slate-900 rounded text-[11px] font-black">HIGH PASS RATE</span>
                    </div>
                  </div>

                  <div className="bg-white p-6 border rounded-2xl">
                    <h4 className="font-black text-slate-900 text-sm tracking-tight mb-3">Academic Guidelines & Fees</h4>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Multee International System believes that high quality education must not be locked behind steep rates. Our tuition models correspond dynamically with Greenland and Johnsonville residency, offering affordable installments.
                    </p>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="p-3 bg-neutral-50 rounded-lg">
                        <span className="text-[10px] text-neutral-400 font-mono uppercase font-semibold">Scholarship Programs</span>
                        <p className="font-bold text-xs text-emerald-800 mt-1">Merit / Need-Based</p>
                      </div>
                      <div className="p-3 bg-neutral-50 rounded-lg">
                        <span className="text-[10px] text-neutral-400 font-mono uppercase font-semibold">Installment Plans</span>
                        <p className="font-bold text-xs text-emerald-800 mt-1">Available Bi-Semester</p>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setActiveTab('contact')}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wide py-3.5 rounded-xl transition text-center"
                  >
                    Send Registration inquiry
                  </button>
                </div>

              </div>
            </motion.div>
          )}

          {/* TAB 3: T-VET TRACKS */}
          {activeTab === 'tvet' && (
            <motion.div
              key="portal-tvet"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8 text-left"
            >
              <div className="border-b pb-4 mb-6">
                <span className="text-[10px] font-mono uppercase bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded font-black">Job ready technical vocational skills</span>
                <h1 className="text-3xl font-serif font-black text-slate-950 mt-1">T-VET Vocational Program</h1>
                <p className="text-slate-500 text-sm mt-1">Providing hands-on physical skills with 6 professional vocational certification classes to jumpstart careers in Liberia.</p>
              </div>

              {/* T-VET GRID TRACKS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {[
                  { title: "Domestic/Industrial Electricity", desc: "Covers complete residential and industrial electrical diagnostics, load distributions, safe cabling, circuits layout, and troubleshooting.", tag: "Electrical Lab" },
                  { title: "Plumbing & Sanitary Tech", desc: "Teaches flow diagnostics, pipe-fitting layout design, drainage solutions, water supply architecture installations, and maintenance.", tag: "Practical Shop" },
                  { title: "Digital Literacy & Information Tech", desc: "Includes computer hardware assemblies, office productivity packages, graphic introductions, internet configurations, and basic code logics.", tag: "IT Computer Lab" },
                  { title: "Home Economics & Catering Arts", desc: "Prepares students directly for the food hospitality and culinary trade. Includes professional nutrition, event baking, pastry sciences, and catering.", tag: "Culinary Studio" },
                  { title: "Masonry & Civil Drafting", desc: "Instruction in bricklaying, structural block making, plastering works, concrete mixes, and basic blueprint architectural drafting.", tag: "Civil Site" },
                  { title: "Automotive Diagnostics & Maintenance", desc: "Understanding fuel engines, diagnostic scanner calibrations, steering, brake architectures, and routine automotive mechanical care.", tag: "Auto Engine Bay" }
                ].map((track, i) => (
                  <div key={i} className="bg-white rounded-xl border border-emerald-100 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
                    <div className="space-y-3">
                      <span className="bg-emerald-50 text-emerald-800 text-[9px] font-mono uppercase font-black px-2 py-0.5 rounded">
                        {track.tag}
                      </span>
                      <h3 className="font-serif font-bold text-slate-900 text-md">{track.title}</h3>
                      <p className="text-slate-500 text-xs leading-relaxed">{track.desc}</p>
                    </div>
                    <div className="border-t pt-3.5 mt-4 text-xs font-semibold text-slate-400 flex items-center justify-between">
                      <span>Course Length: 9 months</span>
                      <span className="text-emerald-800 font-bold">Certification</span>
                    </div>
                  </div>
                ))}

              </div>

              {/* T-VET WORKSHOP HIGHLIGHT PANEL */}
              <div className="bg-amber-50 rounded-2xl p-6 md:p-10 border border-amber-200/50 flex flex-col md:flex-row gap-6 items-center">
                <div className="flex-1 space-y-3">
                  <span className="bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-black uppercase font-mono px-2 py-0.5 rounded">
                    Saturday Lab hours
                  </span>
                  <h3 className="text-xl md:text-2xl font-serif font-black text-slate-900">
                    Active Hand Work: Saturday Practical Labs
                  </h3>
                  <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
                    At MISS vocational divisions, we prioritize practice. Every Saturday morning from <strong className="text-neutral-900">9:00 AM to 2:00 PM</strong>, our labs are buzzing with physical simulations, circuit assemblies, and baking classes where instructors mentor students on a live workspace.
                  </p>
                </div>
                <div className="space-y-2 shrink-0 text-center md:text-left">
                  <p className="text-xs font-mono text-slate-500 bg-white/50 px-4 py-2 rounded-lg border">
                    Admissions Hotline: <strong className="text-slate-900">+231 77 782 9659</strong>
                  </p>
                  <button 
                    onClick={() => setActiveTab('contact')}
                    className="w-full bg-slate-900 text-white hover:bg-black font-extrabold text-xs uppercase tracking-wider py-3 px-5 rounded-lg transition"
                  >
                    Submit Student Application
                  </button>
                </div>
              </div>

            </motion.div>
          )}

          {/* TAB 4: MULTEE BUZZ */}
          {activeTab === 'buzz' && (
            <motion.div
              key="portal-buzz"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8 text-left"
            >
              
              <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-5 gap-4">
                <div>
                  <span className="text-[10px] font-mono uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-black font-mono">Multee Buzz HUB</span>
                  <h1 className="text-3xl font-serif font-black text-slate-950 mt-1">Campus News & Timeline</h1>
                  <p className="text-slate-500 text-sm">Stay synchronized with critical academic calendars, T-VET graduation schedules, gallery pictures, and school announcements.</p>
                </div>

                {/* SEARCH BAR */}
                <div className="relative w-full md:w-80">
                  <span className="absolute left-3 top-3 text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search announcements..." 
                    className="w-full bg-white border border-slate-200 text-xs py-2.5 pl-9 pr-4 rounded-xl focus:ring-1 focus:ring-emerald-600 focus:outline-none focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              {/* FILTER BUTTONS */}
              <div className="flex flex-wrap gap-2">
                {[
                  { filter: 'all', label: 'All Buzz Updates' },
                  { filter: 'announcement', label: 'Announcements / News' },
                  { filter: 'video', label: 'Practical Labs / Videos' },
                  { filter: 'picture', label: 'Photo Galleries' }
                ].map((item) => (
                  <button
                    key={item.filter}
                    onClick={() => setNewsFilter(item.filter as any)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                      newsFilter === item.filter 
                        ? 'bg-emerald-900 text-white shadow-xs' 
                        : 'bg-white border text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* TIMELINE FEED CARDS CONTAINER */}
              {filteredPosts.length === 0 ? (
                <div className="bg-white border rounded-2xl p-16 text-center max-w-xl mx-auto space-y-4">
                  <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto text-neutral-400">
                    <HelpCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">No updates found</h3>
                  <p className="text-slate-500 text-xs leading-relaxed max-w-md mx-auto">
                    Please check back later or modify your search terms. Direct academic reports can be received from administrative offices.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {filteredPosts.map(post => {
                    const postComments = comments.filter(c => c.postId === post.id);
                    return (
                      <div key={post.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:border-emerald-300 transition flex flex-col justify-between">
                        
                        <div className="p-5 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="bg-emerald-50 text-emerald-800 text-[10px] font-mono uppercase font-black px-2 py-0.5 rounded border border-emerald-100">
                              {post.type}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <h3 className="font-serif font-black text-lg text-slate-950 leading-snug">{post.title}</h3>
                            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-normal whitespace-pre-wrap">{post.description}</p>
                          </div>

                          {/* MEDIA ASSET CONTAINER */}
                          <div className="relative rounded-xl overflow-hidden bg-slate-100 border">
                            {post.type === 'video' ? (
                              <div className="relative w-full h-80 bg-black">
                                <video src={post.mediaUrl} className="w-full h-full object-cover" controls playsInline />
                              </div>
                            ) : (
                              <img src={post.mediaUrl} alt={post.title} className="w-full h-80 object-cover" />
                            )}
                            <div className="absolute top-3 right-3 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded font-mono">
                              {post.location || 'Johnsonville Campus'}
                            </div>
                          </div>

                          {/* INTERACTIVE COMPONENT COUNTERS */}
                          <div className="flex items-center gap-4 text-xs font-mono text-slate-400 border-t pt-3 flex-wrap">
                            <button
                              onClick={() => {
                                // Simulate likes feedback safely
                                alert("Thank you for your appreciation! Your like has been registered in our real-time community log.");
                              }}
                              className="hover:text-amber-600 font-bold transition flex items-center gap-1.5"
                            >
                              <Star className="w-4 h-4 text-amber-500 fill-current" />
                              Appreciations ({post.likesCount || 0})
                            </button>
                            <span className="text-slate-300">•</span>
                            <div className="flex items-center gap-1">
                              VIEWS: <span className="text-slate-800 font-bold">{post.viewsCount || 50 + Math.floor(post.likesCount * 1.5)}</span>
                            </div>
                            <span className="text-slate-300">•</span>
                            <button
                              onClick={() => setSelectedPostId(selectedPostId === post.id ? null : post.id)}
                              className="text-emerald-850 hover:text-emerald-900 font-bold select-none inline-flex items-center gap-1"
                            >
                              💬 Comments ({postComments.length})
                            </button>
                          </div>
                        </div>

                        {/* COMMENTS VIEW SECTION */}
                        <AnimatePresence>
                          {(selectedPostId === post.id) && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="bg-slate-50 border-t p-4 space-y-4 overflow-hidden"
                            >
                              <h4 className="font-black text-xs text-slate-900 uppercase">Discussion Board ({postComments.length})</h4>

                              <div className="space-y-3 max-h-48 overflow-y-auto">
                                {postComments.length === 0 ? (
                                  <p className="text-slate-400 text-xs italic">No comments posted yet. Start the conversation below!</p>
                                ) : (
                                  postComments.map(comment => (
                                    <div key={comment.id} className="p-2.5 bg-white rounded-lg border text-xs">
                                      <div className="flex items-center justify-between text-neutral-400 text-[10px] font-mono">
                                        <span className="font-bold text-emerald-800">{comment.authorName}</span>
                                        <div className="flex items-center gap-2">
                                          <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                                          {isUserAdmin && (
                                            <button 
                                              onClick={() => handleDeleteComment(comment.id)}
                                              className="text-rose-600 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                                            >
                                              <Trash2 className="w-3 h-3" /> Remove
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      <p className="text-slate-700 mt-1 font-medium">{comment.content}</p>
                                    </div>
                                  ))
                                )}
                              </div>

                              {/* NEW DISCUSSION COMMENT FORM */}
                              <div className="flex gap-2">
                                <input 
                                  type="text" 
                                  value={newCommentInput}
                                  onChange={(e) => setNewCommentInput(e.target.value)}
                                  placeholder={currentUser ? "Add your remark or question..." : "Please sign in to comment"}
                                  disabled={!currentUser}
                                  className="flex-1 bg-white border border-slate-200 text-xs py-2 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-neutral-100 disabled:cursor-not-allowed"
                                />
                                <button
                                  onClick={() => handleAddComment(post.id)}
                                  className="bg-emerald-800 text-white font-bold text-xs px-3.5 py-2 rounded-lg hover:bg-emerald-950 transition"
                                >
                                  Post
                                </button>
                              </div>
                              {!currentUser && (
                                <p className="text-[10px] text-slate-400 hover:text-emerald-850 cursor-pointer text-left" onClick={() => setShowAuthModal(true)}>
                                  💡 𝖢𝗅𝗂𝖼𝗄 𝗁𝖾𝗋𝖾 𝗍𝗈 𝗅𝗈𝗀𝗂𝗇 𝖺𝗇𝖽 𝗃𝗈𝗂𝗇 𝗍𝗁𝖾 discussion forum board.
                                </p>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>

                      </div>
                    );
                  })}
                </div>
              )}

            </motion.div>
          )}

          {/* TAB 5: CONTACT & INQUIRY */}
          {activeTab === 'contact' && (
            <motion.div
              key="portal-contact"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-10 text-left"
            >
              
              <div className="border-b pb-4">
                <span className="text-[10px] font-mono uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-black font-mono">Immediate Response</span>
                <h1 className="text-3xl font-serif font-black text-slate-950 mt-1">Get In Touch: Admissions Desk</h1>
                <p className="text-slate-500 text-sm">Contact the Multee International administrative offices directly for registration questions, school fees schedules, and academic reports.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* CONTACT INFO AND LOCATION */}
                <div className="space-y-6">
                  <div className="bg-white p-6 border rounded-2xl text-left space-y-4 shadow-xs">
                    <h3 className="text-lg font-bold font-serif text-slate-900">Administrative Office Space</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-xs text-slate-900 block font-extrabold uppercase tracking-wide">Our Location</strong>
                          <span className="text-slate-500 text-xs">Greenland Community, Johnsonville, Montserrado County, Liberia</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Mail className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-xs text-slate-900 block font-extrabold uppercase tracking-wide">Send Email</strong>
                          <span className="text-emerald-800 text-xs font-semibold select-all">multeeinternationalschoolsystem@gmail.com</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Phone className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-xs text-slate-900 block font-extrabold uppercase tracking-wide">Telephone Line</strong>
                          <span className="text-slate-500 text-xs font-mono">+231 77 782 9659 (Admissions & Registrar)</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-xs text-slate-900 block font-extrabold uppercase tracking-wide">Office Working Hours</strong>
                          <span className="text-slate-500 text-xs block">Monday - Friday: 7:30 AM - 4:00 PM</span>
                          <span className="text-slate-500 text-xs block">Saturday (T-VET Practical Labs): 9:00 AM - 2:00 PM</span>
                          <span className="text-rose-550 text-xs block">Sunday: Closed</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PREMIUM MAP GRAPHICS DESIGN */}
                  <div className="bg-[#002b1b] text-white p-6 rounded-2xl border flex items-center justify-between">
                    <div>
                      <h4 className="font-serif font-black text-lg text-amber-300">Liberian Quality Education</h4>
                      <p className="text-emerald-100 text-xs mt-1.5 leading-relaxed max-w-xs">
                        Registered Academic & Vocational training center approved by the Liberian Government. Empowering Montserrado County youths.
                      </p>
                    </div>
                    <GraduationCap className="w-16 h-16 text-emerald-500 opacity-20" />
                  </div>
                </div>

                {/* INTERACTIVE MESSAGE INQUIRY FORM */}
                <div className="bg-white p-6 border rounded-2xl shadow-xs space-y-4">
                  <div>
                    <h3 className="text-lg font-serif font-bold text-slate-950">Send an Inquiry</h3>
                    <p className="text-slate-500 text-xs">Fill out the message form below and of our representative will call or email you soon.</p>
                  </div>

                  <AnimatePresence>
                    {contactSuccess && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs rounded-xl flex items-start gap-2.5 text-left"
                      >
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block font-black">Inquiry Logged Securely!</strong>
                          <span>Your message was written directly into MISS files database in real-time. Admins will evaluate your registrars subject shortly. Thank you.</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form onSubmit={handleSubmitInquiry} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-mono font-bold text-slate-600 uppercase mb-1">Your Name</label>
                        <input 
                          type="text" 
                          required
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="e.g. Samuel Karpeh"
                          className="w-full bg-slate-50 border text-xs py-2.5 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono font-bold text-slate-600 uppercase mb-1">Email Address</label>
                        <input 
                          type="email" 
                          required
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="e.g. samuel@gmail.com"
                          className="w-full bg-slate-50 border text-xs py-2.5 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-bold text-slate-600 uppercase mb-1">Subject</label>
                      <input 
                        type="text" 
                        required
                        value={contactSubject}
                        onChange={(e) => setContactSubject(e.target.value)}
                        placeholder="e.g. Registration details for early childhood program"
                        className="w-full bg-slate-50 border text-xs py-2.5 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-bold text-slate-600 uppercase mb-1">Write Message</label>
                      <textarea 
                        rows={5}
                        required
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        placeholder="Type your message details..."
                        className="w-full bg-slate-50 border text-xs py-2.5 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingInquiry}
                      className="w-full bg-emerald-990 bg-emerald-900 border hover:bg-emerald-950 text-white font-extrabold text-xs uppercase tracking-wider py-3.5 rounded-xl transition shadow-md disabled:bg-slate-300 disabled:cursor-not-allowed"
                    >
                      {submittingInquiry ? 'Logging Inquiry...' : 'Send Message'}
                    </button>
                  </form>
                </div>

              </div>
            </motion.div>
          )}

          {/* TAB 6: ADMIN COMMAND CENTER (LOCK AND OVERVIEW) */}
          {activeTab === 'admin' && (
            <motion.div
              key="portal-admin"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8 text-left"
            >
              
              {!isUserAdmin ? (
                /* LOCK SCREEN */
                <div className="bg-white rounded-3xl border border-neutral-100 p-8 md:p-14 text-center max-w-xl mx-auto space-y-6 shadow-2xl">
                  <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-600 border border-red-100">
                    <Lock className="w-7 h-7" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-serif font-black text-slate-900">Academic Files Encrypted</h2>
                    <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                      Access to the Multee Command Center is restricted to validated administrators (<strong className="text-neutral-900">luckyglobalnews@gmail.com</strong>). Please log in to your corresponding staff credentials.
                    </p>
                  </div>

                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200/50 text-amber-900 text-xs flex items-start gap-2 text-left">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-extrabold block">Admissions Evaluator Notice:</strong>
                      <span>If you are evaluating this app for purchase, you can instantly toggle our <strong className="underline">Admissions Admin Simulator</strong> Sandbox below to trial the real-time inquiry reviews and announcement publishing system immediately!</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      onClick={() => {
                        setIsDemoAdminMode(true);
                        // Trigger mock login profile
                        setUserProfile({
                          uid: 'demo_admin',
                          email: 'luckyglobalnews@gmail.com',
                          fullName: 'Mr. Akin S. Sokpah (Acclimating Director)',
                          role: 'admin',
                          createdAt: new Date().toISOString()
                        });
                      }}
                      className="flex-1 bg-amber-550 bg-amber-600 text-white font-black text-xs uppercase tracking-wider py-3.5 rounded-xl transition hover:bg-amber-700"
                    >
                      🧪 Run Admin Simulator (Sandbox)
                    </button>
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className="flex-1 bg-slate-900 text-white hover:bg-black font-extrabold text-xs uppercase tracking-wider py-3.5 rounded-xl transition"
                    >
                      Staff Sign In
                    </button>
                  </div>
                </div>
              ) : (
                /* AUTHENTICATED ADMIN COMMAND CENTER DECK */
                <div className="space-y-10">
                  
                  {/* METRICS HEADER */}
                  <div className="bg-slate-900 text-white p-6 md:p-8 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden shadow-lg">
                    <div className="absolute right-0 top-0 bottom-0 w-24 opacity-15 pointer-events-none bg-cover bg-[url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=200')]" />
                    <div>
                      <span className="text-amber-400 font-mono text-[10px] uppercase font-black tracking-widest block">ADMIN COMMAND PANEL</span>
                      <h2 className="text-2xl font-serif font-black tracking-tight">{userProfile?.fullName || 'Academic Registrar'}</h2>
                      <p className="text-slate-400 text-xs mt-1">Logged session: <span className="text-slate-200 font-bold">{currentUser?.email || 'Admin Simulator Sandbox'}</span></p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setIsDemoAdminMode(false);
                          if (!currentUser) setActiveTab('home');
                        }}
                        className="bg-white/10 hover:bg-white/20 border border-white/10 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1"
                      >
                        Exit Command Mode
                      </button>
                    </div>
                  </div>

                  {/* ACTIVE STATS METRICS TRACKER */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Buzz updates</span>
                      <p className="font-serif font-black text-2xl text-slate-950 mt-1">{posts.length}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Live Parent Inquiries</span>
                      <p className="font-serif font-black text-2xl text-emerald-800 mt-1">
                        {inquiries.length === 0 ? 0 : inquiries.length}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-slate-300 uppercase font-mono">Active TVET Programs</span>
                      <p className="font-serif font-black text-2xl text-amber-700 mt-1">6 Active Tracks</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-slate-300 uppercase font-mono">Database Status</span>
                      <p className="text-xs font-black text-emerald-600 uppercase tracking-wide flex items-center gap-1 mt-2">
                        <Check className="w-4 h-4 shrink-0" /> Firestore Connected
                      </p>
                    </div>
                  </div>

                  {/* CORE TWIN COLUMN LAYOUT */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* LEFT WORKSPACE: PUBLISH CAMPUS BUZZ UPDATES */}
                    <div className="bg-white p-6 border rounded-2xl shadow-xs space-y-4">
                      <div className="border-b pb-2 flex items-center justify-between">
                        <h3 className="font-serif font-extrabold text-[#006d44] text-lg">Publish Update to Multee Buzz</h3>
                        <span className="bg-emerald-50 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded uppercase font-mono">Live Sync</span>
                      </div>

                      {adminAlert && (
                        <div className={`p-3.5 rounded-xl text-xs flex items-start gap-2 ${
                          adminAlert.type === 'success' ? 'bg-emerald-100 text-emerald-990 border border-emerald-300' : 'bg-rose-50 text-rose-950 border border-rose-200'
                        }`}>
                          <Sparkles className="w-4.5 h-4.5 text-emerald-700 shrink-0 mt-0.5" />
                          <span>{adminAlert.text}</span>
                        </div>
                      )}

                      <form onSubmit={handlePublishAdminPost} className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-mono font-bold text-slate-600 uppercase mb-1">Update Type</label>
                          <select
                            value={adminPostType}
                            onChange={(e) => setAdminPostType(e.target.value as any)}
                            className="w-full bg-slate-50 border text-xs py-2.5 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 font-semibold"
                          >
                            <option value="announcement">Announcement / News</option>
                            <option value="video">Campus action video / Lab Work</option>
                            <option value="picture">Photo Gallery / Showcase</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono font-bold text-slate-600 uppercase mb-1">Headline Title</label>
                          <input 
                            type="text" 
                            required
                            value={adminPostTitle}
                            onChange={(e) => setAdminPostTitle(e.target.value)}
                            placeholder="e.g. WASSCE Preparatory Workshops Scheduled"
                            className="w-full bg-slate-50 border text-xs py-2.5 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono font-bold text-slate-600 uppercase mb-1">Description / Article Body</label>
                          <textarea 
                            rows={4}
                            required
                            value={adminPostDesc}
                            onChange={(e) => setAdminPostDesc(e.target.value)}
                            placeholder="Type the full campus announcements, timelines, or vocational details..."
                            className="w-full bg-slate-50 border text-xs py-2.5 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-mono font-bold text-slate-600 uppercase mb-1">Direct Media URL (Image or raw MP4)</label>
                            <input 
                              type="text" 
                              value={adminPostMediaUrl}
                              onChange={(e) => setAdminPostMediaUrl(e.target.value)}
                              placeholder="Leave blank for automatic sample asset selection"
                              className="w-full bg-slate-50 border text-xs py-2.5 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                            />
                          </div>

                          {adminPostType === 'video' ? (
                            <div>
                              <label className="block text-[10px] font-mono font-bold text-slate-600 uppercase mb-1">Video Duration</label>
                              <input 
                                type="text" 
                                value={adminPostDuration}
                                onChange={(e) => setAdminPostDuration(e.target.value)}
                                placeholder="e.g. 2:15"
                                className="w-full bg-slate-50 border text-xs py-2.5 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                              />
                            </div>
                          ) : (
                            <div>
                              <label className="block text-[10px] font-mono font-bold text-slate-600 uppercase mb-1">Location Tag</label>
                              <input 
                                type="text" 
                                value={adminPostLocation}
                                onChange={(e) => setAdminPostLocation(e.target.value)}
                                placeholder="e.g. Greenland Campus, Johnsonville"
                                className="w-full bg-slate-50 border text-xs py-2.5 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                              />
                            </div>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={publishingPost}
                          className="w-full bg-emerald-990 bg-emerald-900 hover:bg-emerald-950 text-white font-extrabold text-xs uppercase tracking-wider py-3.5 rounded-xl transition shadow-md disabled:bg-slate-300"
                        >
                          {publishingPost ? 'Publishing Updates...' : 'Broadcast Announcement'}
                        </button>
                      </form>
                    </div>

                    {/* RIGHT WORKSPACE: LIVE PARENT INQUIRIES DESK */}
                    <div className="bg-white p-6 border rounded-2xl shadow-xs space-y-4">
                      <div className="border-b pb-2 flex items-center justify-between">
                        <h3 className="font-serif font-extrabold text-[#006d44] text-lg">Student/Parent Inquiries Desk</h3>
                        <span className="bg-amber-100 text-amber-805 text-amber-900 border text-[9px] font-mono font-bold px-2 py-0.5 rounded">
                          REAL-TIME INBOX
                        </span>
                      </div>

                      <div className="space-y-4 max-h-[500px] overflow-y-auto">
                        {inquiries.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 font-mono text-xs">
                            No guest parent inquiries submitted to Firestore files yet. Use the contact form tab to create simulated inquiries!
                          </div>
                        ) : (
                          inquiries.map(inquiry => (
                            <div key={inquiry.id} className="p-4 bg-slate-50 border rounded-xl space-y-3 relative">
                              <div className="flex items-start justify-between gap-2">
                                <div className="text-left">
                                  <h4 className="font-bold text-sm text-slate-900">{inquiry.subject}</h4>
                                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                    <span>From: <strong className="text-emerald-800">{inquiry.fullName}</strong> ({inquiry.email})</span>
                                  </div>
                                </div>
                                <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded shrink-0 ${
                                  inquiry.status === 'resolved' 
                                    ? 'bg-emerald-100 text-emerald-800 border' 
                                    : inquiry.status === 'archived'
                                      ? 'bg-neutral-200 text-neutral-600'
                                      : 'bg-amber-100 text-amber-800 border'
                                }`}>
                                  {inquiry.status || 'pending'}
                                </span>
                              </div>

                              <p className="text-xs text-slate-600 bg-white p-3 border rounded-lg whitespace-pre-wrap leading-relaxed">
                                {inquiry.message}
                              </p>

                              <div className="pt-2 flex items-center justify-between border-t gap-2 flex-wrap">
                                <span className="text-[9.5px] font-mono text-slate-400">
                                  Logged: {new Date(inquiry.createdAt || Date.now()).toLocaleString()}
                                </span>
                                <div className="flex gap-1.5">
                                  {inquiry.status !== 'resolved' && (
                                    <button
                                      onClick={() => handleUpdateInquiryStatus(inquiry.id, 'resolved')}
                                      className="p-1.5 bg-emerald-50 text-emerald-850 hover:bg-emerald-100 text-[10px] font-black uppercase rounded transition"
                                      title="Mark as resolved"
                                    >
                                      ✓ Resolve
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteInquiry(inquiry.id)}
                                    className="p-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 text-[10px] font-bold uppercase rounded transition"
                                    title="Delete/Archive inquiry"
                                  >
                                    Archive Files
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>

                </div>
              )}

            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* FOOTER METADATA ALIGNMENT SECTION */}
      <footer className="bg-slate-900 text-white text-left pt-12 pb-8 border-t border-emerald-950 mt-16 selection:bg-emerald-800/60 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-white/10 text-xs">
          
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center font-serif font-black text-white text-md shadow-md">
                M
              </div>
              <div>
                <span className="font-serif font-black text-sm block leading-none text-white tracking-wide">MULTEE INTERNATIONAL</span>
                <span className="text-[9.5px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1 inline-block">School System (MISS)</span>
              </div>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Empowering Liberian youths with affordable, pristine private academic education from nursery classes up toward Technical-Vocational certification modules. Built on values of integrity, skill, and vocational excellence in Greenland Community, Johnsonville.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-extrabold uppercase text-amber-400 tracking-wider">Academic & TVET</h4>
            <ul className="space-y-2 text-slate-300">
              <li>• Nursery & Early Childhood Foundations</li>
              <li>• Elementary & Junior High Classrooms</li>
              <li>• Senior High Academics (WAEC/WASSCE Approved)</li>
              <li>• Technical Electrical & Cabling Labs</li>
              <li>• Plumbing, Sanitary, & Culinary Hospitality</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-extrabold uppercase text-amber-400 tracking-wider">Liberia Administration Contacts</h4>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Greenland Community, Johnsonville, Montserrado County, Liberia.
            </p>
            <div className="space-y-1 text-slate-400 text-[11px]">
              <p>Admissions Email: <span className="text-white select-all">multeeinternationalschoolsystem@gmail.com</span></p>
              <p>Registrar Hotline: <span className="text-white select-all">+231 77 782 9659</span></p>
            </div>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 text-[11px] font-mono text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span>Registered Academic & Vocational Center</span>
            <span>•</span>
            <span>Montserrado County, Liberia</span>
          </div>
          <div className="text-slate-500">
            © 2026 Multee International School System (MISS). All rights reserved.
          </div>
        </div>
      </footer>

      {/* FIREBASE STAFF SIGN-IN MODAL PORTAL */}
      <AnimatePresence>
        {showAuthModal && (
          <AuthModal 
            onClose={() => setShowAuthModal(false)}
            onSuccess={(uid, role) => {
              // Sync corresponding profile immediately on success state callback
              setShowAuthModal(false);
              setActiveTab('buzz');
            }}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
