import React, { useEffect, useState, useRef } from 'react';
import { Article } from '../types';
import { doc, updateDoc, increment, getDoc, setDoc, deleteDoc, runTransaction, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  ArrowLeft, Clock, Eye, ThumbsUp, Bookmark, BookmarkCheck, 
  Share2, Volume2, VolumeX, Type, Play, Pause, ChevronLeft,
  Paperclip, Download, FileText, FileSpreadsheet, X,
  GraduationCap, Tag, Music, ExternalLink, Calendar, Phone,
  Sliders, ZoomIn, ZoomOut, Palette
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ArticleDetailProps {
  article: Article;
  onBack: () => void;
  userPrefs: { savedArticles: string[] } | null;
  onToggleBookmark: (articleId: string) => Promise<void>;
  onSelectArticle?: (article: Article) => void;
}

// Google AdSense In-Article Ad Component with automated script pushing
function InArticleAd() {
  useEffect(() => {
    try {
      const adsbygoogle = (window as any).adsbygoogle || [];
      adsbygoogle.push({});
    } catch (e) {
      console.warn("Could not push to adsbygoogle stack", e);
    }
  }, []);

  return (
    <div className="my-6 py-4 border-y border-dashed border-neutral-200/60 flex flex-col items-center justify-center bg-neutral-50/20 rounded-lg select-none">
      <ins className="adsbygoogle"
           style={{ display: 'block', textAlign: 'center' }}
           data-ad-layout="in-article"
           data-ad-format="fluid"
           data-ad-client="ca-pub-9420626875880418"
           data-ad-slot="5171722195" />
      <span className="text-[7px] font-mono tracking-widest text-neutral-400 uppercase mt-1">Sponsored Advertisement</span>
    </div>
  );
}

export default function ArticleDetail({ article, onBack, userPrefs, onToggleBookmark, onSelectArticle }: ArticleDetailProps) {
  const [hasLiked, setHasLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(article.likesCount);
  const [viewsCount, setViewsCount] = useState(article.viewsCount);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);

  // New Reader Custom Accessibility states
  const [fontScale, setFontScale] = useState<number>(100);
  const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'mono'>('sans');
  const [lineHeight, setLineHeight] = useState<'cozy' | 'normal' | 'relaxed'>('normal');
  const [readingTheme, setReadingTheme] = useState<'default' | 'sepia' | 'dark'>('default');
  const [showAccessibilityToolbar, setShowAccessibilityToolbar] = useState(true);

  // Related Articles States
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  // WAEC PIN verification states
  const storageKey = `unlocked_waec_${article.id}`;
  const [isUnlocked, setIsUnlocked] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === 'true';
    } catch {
      return false;
    }
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const isAdminUser = () => {
    const currentUser = auth.currentUser;
    if (!currentUser?.email) return false;
    return [
      'aki.sokpah.link@gmail.com',
      'luckyglobalnews@gmail.com'
    ].includes(currentUser.email);
  };

  const isPinRequired = article.waecPin && article.waecPin.trim() !== '';

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (article.waecPin && pinInput.trim() === article.waecPin.trim()) {
      setIsUnlocked(true);
      setPinError('');
      try {
        localStorage.setItem(storageKey, 'true');
      } catch (err) {
        console.warn('Failed to serialise unlock status', err);
      }
    } else {
      setPinError('Invalid Secure PIN Code. Please check & try again.');
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        const percent = (window.scrollY / scrollHeight) * 100;
        setScrollPercent(Math.min(100, Math.max(0, percent)));
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isBookmarked = userPrefs?.savedArticles?.includes(article.id) || false;

  // Format timestamp
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  // 1. Increment Views Count on Load
  useEffect(() => {
    const incrementViews = async () => {
      const articleRef = doc(db, 'articles', article.id);
      try {
        await updateDoc(articleRef, {
          viewsCount: increment(1)
        });
        setViewsCount(prev => prev + 1);
      } catch (err) {
        console.warn("Could not increment view count", err);
      }
    };
    void incrementViews();
  }, [article.id]);

  // 1b. Fetch Related Articles based on Category
  useEffect(() => {
    const fetchRelated = async () => {
      if (!article?.category) return;
      setLoadingRelated(true);
      try {
        const q = query(
          collection(db, 'articles'),
          where('category', '==', article.category),
          limit(12)
        );
        const querySnapshot = await getDocs(q);
        let list: Article[] = [];
        querySnapshot.forEach((docSnap) => {
          if (docSnap.id !== article.id) {
            list.push({ id: docSnap.id, ...docSnap.data() } as Article);
          }
        });

        // Fallback: If not enough match the category, fetch other latest articles
        if (list.length < 4) {
          const fallbackQ = query(
            collection(db, 'articles'),
            limit(12)
          );
          const fallbackSnapshot = await getDocs(fallbackQ);
          fallbackSnapshot.forEach((docSnap) => {
            if (docSnap.id !== article.id && !list.some(item => item.id === docSnap.id)) {
              list.push({ id: docSnap.id, ...docSnap.data() } as Article);
            }
          });
        }
        
        // Pick 4 related articles
        setRelatedArticles(list.slice(0, 4));
      } catch (err) {
        console.warn("Could not load related articles from Firestore", err);
      } finally {
        setLoadingRelated(false);
      }
    };
    void fetchRelated();
  }, [article.id, article.category]);

  // 2. Load User Liking State with guest and signed-in reader support
  useEffect(() => {
    const checkLikingState = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        try {
          const localLikes = JSON.parse(localStorage.getItem('gn_liked_articles') || '[]');
          setHasLiked(localLikes.includes(article.id));
        } catch {
          setHasLiked(false);
        }
        return;
      }

      const likeDocRef = doc(db, 'articles', article.id, 'likes', currentUser.uid);
      try {
        const docSnap = await getDoc(likeDocRef);
        setHasLiked(docSnap.exists());
      } catch (err) {
        console.warn("Could not load liking state from Firestore", err);
        try {
          const localLikes = JSON.parse(localStorage.getItem('gn_liked_articles') || '[]');
          setHasLiked(localLikes.includes(article.id));
        } catch {
          setHasLiked(false);
        }
      }
    };
    void checkLikingState();
  }, [article.id]);

  // Handle Liking for anyone (guests & signed-in readers alike)
  const handleLike = async () => {
    const currentUser = auth.currentUser;
    const articleRef = doc(db, 'articles', article.id);

    try {
      const isNowLiked = !hasLiked;
      let localLikes: string[] = [];
      try {
        localLikes = JSON.parse(localStorage.getItem('gn_liked_articles') || '[]');
      } catch {
        localLikes = [];
      }

      if (isNowLiked) {
        setHasLiked(true);
        setLikesCount(prev => prev + 1);
        if (!localLikes.includes(article.id)) {
          localLikes.push(article.id);
        }
        localStorage.setItem('gn_liked_articles', JSON.stringify(localLikes));

        await updateDoc(articleRef, {
          likesCount: increment(1)
        });

        if (currentUser) {
          const likeDocRef = doc(db, 'articles', article.id, 'likes', currentUser.uid);
          await setDoc(likeDocRef, {
            articleId: article.id,
            userId: currentUser.uid,
            timestamp: new Date()
          });
        }
      } else {
        setHasLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
        localLikes = localLikes.filter(id => id !== article.id);
        localStorage.setItem('gn_liked_articles', JSON.stringify(localLikes));

        await updateDoc(articleRef, {
          likesCount: increment(-1)
        });

        if (currentUser) {
          const likeDocRef = doc(db, 'articles', article.id, 'likes', currentUser.uid);
          await deleteDoc(likeDocRef);
        }
      }
    } catch (err) {
      // Revert states on error
      setHasLiked(!hasLiked);
      setLikesCount(article.likesCount);
      handleFirestoreError(err, OperationType.WRITE, `articles/${article.id}/likes`);
    }
  };

  // Native Speech Synthesis System (TTS)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const handleSpeech = () => {
    if (!synthRef.current) return;

    if (isSpeaking) {
      if (isPaused) {
        synthRef.current.resume();
        setIsPaused(false);
      } else {
        synthRef.current.pause();
        setIsPaused(true);
      }
    } else {
      synthRef.current.cancel();
      
      const textToSpeak = `${article.title}. Published in ${article.category} category. ${article.summary}. ${article.content}`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      
      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
      };
      
      utterance.onerror = () => {
        setIsSpeaking(false);
        setIsPaused(false);
      };

      utteranceRef.current = utterance;
      setIsSpeaking(true);
      setIsPaused(false);
      synthRef.current.speak(utterance);
    }
  };

  const stopSpeech = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  };

  const handleShare = () => {
    const rawUrl = window.location.href;
    const cleanUrl = rawUrl.replace('-dev-', '-pre-');
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.summary,
        url: cleanUrl,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(cleanUrl);
      setShowShareTooltip(true);
      setTimeout(() => setShowShareTooltip(false), 2000);
    }
  };

  // Get font size class
  const getFontSizeClass = () => {
    switch(fontSize) {
      case 'sm': return 'text-sm';
      case 'lg': return 'text-xl md:text-2xl leading-relaxed';
      case 'xl': return 'text-2xl md:text-3xl leading-relaxed';
      default: return 'text-base md:text-lg leading-relaxed';
    }
  };

  // Check if the URL should be rendered inside an iframe (like YouTube, Vimeo, Dailymotion, or generic web pages/embeds)
  // or a native <video> tag (like MP4, WEBM, MOV, storage objects, data/blob URLs)
  const isEmbeddableVideoUrl = (url: string) => {
    if (!url) return false;
    const lowercase = url.toLowerCase();
    
    // Check if it's explicitly a direct media file / source
    if (
      lowercase.startsWith('data:video/') || 
      lowercase.startsWith('blob:') || 
      lowercase.includes('.mp4') || 
      lowercase.includes('.webm') || 
      lowercase.includes('.mov') || 
      lowercase.includes('.m3u8') ||
      lowercase.includes('.ogg')
    ) {
      return false; // Render via <video> tag
    }
    
    // Check if it's a known video embed provider (or generic iframe pages)
    if (
      lowercase.includes('youtube.com') || 
      lowercase.includes('youtu.be') || 
      lowercase.includes('youtube-nocookie.com') ||
      lowercase.includes('vimeo.com') ||
      lowercase.includes('twitch.tv') ||
      lowercase.includes('dailymotion.com') ||
      lowercase.includes('dai.ly')
    ) {
      return true; // Render via <iframe> tag
    }

    // Default: If it doesn't have direct video file extensions and looks like a URL, treat as embeddable iframe fallback
    return true;
  };

  // Robust YouTube URL encoder to ensure native embedded playback
  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return '';
    try {
      const lowercase = url.toLowerCase();
      
      // Handle Vimeo
      if (lowercase.includes('vimeo.com')) {
        const vimeoIdMatch = url.match(/vimeo\.com\/(?:channels\/[^\/]+\/|groups\/[^\/]+\/|album\/[^\/]+\/video\/|video\/|showcase\/[^\/]+\/|)?([0-9]+)/i);
        if (vimeoIdMatch && vimeoIdMatch[1]) {
          return `https://player.vimeo.com/video/${vimeoIdMatch[1]}?autoplay=0`;
        }
        return url;
      }

      // Handle YouTube nocookie
      if (lowercase.includes('youtube-nocookie.com/embed/')) {
        return url;
      }
      
      // Handle normal YouTube embed
      if (lowercase.includes('youtube.com/embed/')) {
        return url;
      }

      if (lowercase.includes('youtube.com/watch')) {
        const urlObj = new URL(url);
        const videoId = urlObj.searchParams.get('v');
        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}`;
        }
      }
      if (lowercase.includes('youtu.be/')) {
        const parts = url.split('youtu.be/');
        const id = parts[1]?.split(/[?#&]/)[0];
        if (id) {
          return `https://www.youtube.com/embed/${id}`;
        }
      }
      if (lowercase.includes('youtube.com/shorts/')) {
        const parts = url.split('/shorts/');
        const id = parts[1]?.split(/[?#&]/)[0];
        if (id) {
          return `https://www.youtube.com/embed/${id}`;
        }
      }
      
      // Fallback
      if (url.includes('watch?v=')) {
        return url.replace('watch?v=', 'embed/');
      }
      
      return url;
    } catch {
      return url;
    }
  };

  return (
    <motion.article 
      id={`article-detail-${article.id}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative"
    >
      {/* Scroll Progress Bar */}
      <div className="sticky top-0 left-0 w-full h-1 bg-neutral-100 z-50">
        <div 
          className="h-full bg-gradient-to-r from-red-650 via-red-500 to-amber-500 transition-all duration-75" 
          style={{ width: `${scrollPercent}%` }}
        />
      </div>

      {/* Editorial Category Header */}
      <div className="bg-neutral-900 text-white px-6 py-4 flex items-center justify-between border-b border-red-650">
        <button 
          onClick={onBack}
          className="flex items-center space-x-2 text-neutral-300 hover:text-white transition-colors text-sm font-sans font-medium"
        >
          <ArrowLeft className="w-4 h-4 text-red-500" />
          <span>Back to Feed</span>
        </button>
        <div className="font-mono text-xs text-red-500 uppercase font-extrabold tracking-widest bg-red-950/40 px-3 py-1 rounded">
          {article.category}
        </div>
      </div>

      {/* Visual Header Image / Embed Media */}
      <div className="relative w-full aspect-video md:h-[420px] bg-neutral-950 overflow-hidden">
        {article.videoUrl ? (
          <div className="w-full h-full relative group flex items-center justify-center bg-black">
            {!isEmbeddableVideoUrl(article.videoUrl) ? (
              <video 
                src={article.videoUrl} 
                controls 
                className="w-full h-full object-contain"
                playsInline
                preload="metadata"
              />
            ) : (
              <iframe
                src={getYouTubeEmbedUrl(article.videoUrl)}
                title={article.title}
                className="w-full h-full border-0 absolute inset-0"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              />
            )}
          </div>
        ) : article.embedCode ? (
          <div 
            className="w-full h-full relative flex items-center justify-center bg-black [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:border-0"
            dangerouslySetInnerHTML={{ __html: article.embedCode }}
          />
        ) : (
          <img
            src={article.imageUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200'}
            alt={article.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        )}
      </div>

      {/* Text Article Area */}
      <div className="p-6 md:p-10">
        {/* Title */}
        <h1 className="text-3xl md:text-5xl font-sans font-black text-neutral-900 tracking-tight leading-tight mb-6">
          {article.title}
        </h1>

        {/* Article Metadata bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-8 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-red-750 flex items-center justify-center text-white font-bold text-sm select-none">
              {article.authorName ? article.authorName.charAt(0).toUpperCase() : 'G'}
            </div>
            <div>
              <p className="text-sm font-sans font-extrabold text-neutral-800">
                By {article.authorName || 'Global News Reporter'}
              </p>
              <p className="text-xs font-mono text-neutral-500 flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1 text-red-500" />
                {formatDate(article.publishedAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono text-neutral-500">
            <span className="flex items-center bg-neutral-100 px-3 py-1.5 rounded" title="Reading Time">
              <Clock className="w-3.5 h-3.5 mr-1 text-neutral-400" />
              {Math.ceil(((article.content || '').trim().split(/\s+/).length) / 200)} min read
            </span>
            <span className="flex items-center bg-neutral-100 px-3 py-1.5 rounded">
              <Eye className="w-3.5 h-3.5 mr-1 text-neutral-400" />
              {viewsCount} Views
            </span>
          </div>
        </div>

        {isPinRequired && !isUnlocked && !isAdminUser() ? (
          <div className="my-8 max-w-xl mx-auto border border-neutral-300 rounded-2xl bg-neutral-900 text-white shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-red-750 to-red-650 p-6 text-center border-b border-neutral-800">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 shadow">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </div>
              <h4 className="text-lg font-sans font-black uppercase tracking-wider text-red-100">
                WAEC Liberia Secure Archive
              </h4>
              <p className="text-[10px] font-mono text-red-200 mt-1 uppercase tracking-widest">
                🔒 Password Protection Enabled
              </p>
            </div>

            <form onSubmit={handleVerifyPin} className="p-6 md:p-8 space-y-5">
              <div className="text-center space-y-2">
                <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                  The documents, past papers, score answers, and visual briefs for this WAEC Liberia 🇱🇷 release are locked under editorial protocol.
                </p>
                <p className="text-[11px] text-amber-500 font-mono font-black uppercase leading-relaxed animate-pulse">
                  Please enter the correct viewing PIN code to unlock access.
                </p>
              </div>

              <div className="space-y-4">
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError('');
                  }}
                  placeholder="••••"
                  className="w-full text-center bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-lg font-mono tracking-[0.5em] focus:ring-2 focus:ring-red-600 focus:outline-none placeholder-neutral-700 text-red-500 font-extrabold"
                  maxLength={12}
                  autoFocus
                />
                
                {pinError && (
                  <p className="text-xs text-center text-red-400 font-sans font-bold flex items-center justify-center gap-1.5 animate-bounce">
                    ✕ {pinError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-red-650 hover:bg-red-750 text-white font-sans font-bold py-3.5 px-4 rounded-xl shadow-md transition-all active:scale-[0.98] text-xs uppercase tracking-widest cursor-pointer"
              >
                Unlock Content Drafts & Assets
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Premium Tools Strip (Font Size / Audio Speech / Bookmark / Like) */}
            <div className="bg-neutral-50/70 border border-neutral-150/70 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center space-x-2">
            {/* Audio Synthesis Panel */}
            <button
              onClick={handleSpeech}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-mono font-medium transition-all ${
                isSpeaking 
                  ? 'bg-red-600 text-white animate-pulse' 
                  : 'bg-white hover:bg-neutral-100 border border-gray-200 text-neutral-700'
              }`}
            >
              <Volume2 className="w-4 h-4" />
              <span>{isSpeaking ? (isPaused ? 'Resume Audio' : 'Pause Audio') : 'Listen to Article'}</span>
            </button>
            {isSpeaking && (
              <button
                onClick={stopSpeech}
                className="bg-neutral-150 hover:bg-neutral-200 text-neutral-700 p-2 rounded-lg text-xs"
                title="Stop audio reading"
              >
                <VolumeX className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {/* Accessibility Toggle Button */}
            <button
              onClick={() => setShowAccessibilityToolbar(!showAccessibilityToolbar)}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg border text-xs font-mono font-bold transition-all ${
                showAccessibilityToolbar 
                  ? 'bg-red-650 border-red-750 text-white shadow-sm' 
                  : 'bg-white hover:bg-neutral-50 border-gray-200 text-neutral-700'
              }`}
              title="Toggle Reader Accessibility Toolbar"
            >
              <Sliders className="w-4 h-4 shrink-0" />
              <span>Accessibility</span>
            </button>

            {/* Like Toggle */}
            <button
              onClick={handleLike}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg border text-xs font-mono font-bold transition-all ${
                hasLiked 
                  ? 'bg-red-50 border-red-200 text-red-600' 
                  : 'bg-white hover:bg-neutral-50 border-gray-200 text-neutral-700'
              }`}
            >
              <ThumbsUp className={`w-4 h-4 ${hasLiked ? 'fill-current' : ''}`} />
              <span>{likesCount} Likes</span>
            </button>

            {/* Bookmark Bookmark */}
            <button
              onClick={() => onToggleBookmark(article.id)}
              className={`p-2 rounded-lg border transition-all ${
                isBookmarked 
                  ? 'bg-neutral-900 border-neutral-900 text-white' 
                  : 'bg-white hover:bg-neutral-50 border-gray-200 text-neutral-700'
              }`}
              title={isBookmarked ? 'Remove Bookmark' : 'Save Article'}
            >
              {isBookmarked ? (
                <BookmarkCheck className="w-4 h-4" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </button>

            {/* Share Share */}
            <div className="relative">
              <button
                onClick={handleShare}
                className="p-2 rounded-lg border bg-white hover:bg-neutral-50 border-gray-200 text-neutral-700 transition"
                title="Share Article"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {showShareTooltip && (
                  <motion.div
                    key="share-tooltip"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute bottom-full right-0 mb-2 whitespace-nowrap bg-neutral-900 text-white text-xs px-2.5 py-1 rounded shadow-md font-mono"
                  >
                    Link copied!
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Collapsible Accessibility Reading Suite */}
        <AnimatePresence>
          {showAccessibilityToolbar && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-neutral-50/90 border border-neutral-200 rounded-xl p-5 mb-8 shadow-inner select-none"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200/80 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-red-655" />
                  <span className="text-xs font-mono font-black uppercase tracking-wider text-neutral-800">
                    Accessibility & Reader Comfort Controls
                  </span>
                </div>
                <button 
                  onClick={() => {
                    setFontScale(100);
                    setFontFamily('sans');
                    setLineHeight('normal');
                    setReadingTheme('default');
                  }}
                  className="text-[9px] font-mono uppercase bg-neutral-200 text-neutral-700 hover:bg-neutral-300 font-extrabold px-2.5 py-1 rounded transition cursor-pointer"
                >
                  Reset Defaults
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-left">
                {/* Sizing Controls */}
                <div className="bg-white border border-neutral-150 p-3 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] font-mono text-neutral-450 uppercase font-black tracking-widest mb-2 flex items-center justify-between">
                    <span>Font Scale</span>
                    <span className="text-red-650 font-black">{fontScale}%</span>
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setFontScale(prev => Math.max(80, prev - 10))}
                      className="flex-1 bg-neutral-50 hover:bg-neutral-100 border border-neutral-150 text-neutral-700 py-1.5 rounded-lg flex items-center justify-center font-bold text-xs cursor-pointer"
                      title="Smaller text"
                    >
                      <ZoomOut className="w-3.5 h-3.5 mr-1" />
                      <span>Smaller</span>
                    </button>
                    <button
                      onClick={() => setFontScale(prev => Math.min(200, prev + 10))}
                      className="flex-1 bg-neutral-50 hover:bg-neutral-100 border border-neutral-150 text-neutral-700 py-1.5 rounded-lg flex items-center justify-center font-bold text-xs cursor-pointer"
                      title="Larger text"
                    >
                      <ZoomIn className="w-3.5 h-3.5 mr-1" />
                      <span>Larger</span>
                    </button>
                  </div>
                </div>

                {/* Font Face selection */}
                <div className="bg-white border border-neutral-150 p-3 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] font-mono text-neutral-450 uppercase font-black tracking-widest mb-2">
                    Font Face Style
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {(['sans', 'serif', 'mono'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setFontFamily(f)}
                        className={`py-1.5 text-[10px] font-mono font-black uppercase rounded transition cursor-pointer text-center ${
                          fontFamily === f 
                            ? 'bg-neutral-900 border border-neutral-900 text-white' 
                            : 'bg-neutral-50 hover:bg-neutral-100 border border-neutral-150 text-neutral-500'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reading Line Spacing */}
                <div className="bg-white border border-neutral-150 p-3 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] font-mono text-neutral-450 uppercase font-black tracking-widest mb-2">
                    Line Spacing
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {(['cozy', 'normal', 'relaxed'] as const).map(l => (
                      <button
                        key={l}
                        onClick={() => setLineHeight(l)}
                        className={`py-1.5 text-[10px] font-mono font-black uppercase rounded transition cursor-pointer text-center ${
                          lineHeight === l 
                            ? 'bg-neutral-900 border border-neutral-900 text-white' 
                            : 'bg-neutral-50 hover:bg-neutral-100 border border-neutral-150 text-neutral-500'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Style tones / Contrast */}
                <div className="bg-white border border-neutral-150 p-3 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] font-mono text-neutral-450 uppercase font-black tracking-widest mb-2 flex items-center gap-1">
                    <Palette className="w-3.5 h-3.5 text-red-550 mr-1 shrink-0" />
                    <span>Comfort Theme</span>
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {(['default', 'sepia', 'dark'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setReadingTheme(t)}
                        className={`py-1.5 text-[10px] font-mono font-black uppercase rounded transition cursor-pointer text-center ${
                          readingTheme === t 
                            ? t === 'dark' ? 'bg-neutral-950 border border-neutral-800 text-emerald-400 font-extrabold' : 'bg-neutral-900 border border-neutral-900 text-white font-extrabold' 
                            : 'bg-neutral-50 hover:bg-neutral-100 border border-neutral-150 text-neutral-500'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lead Summary Bullet Box */}
        {article.summary && (
          <div className="bg-red-50/50 border-l-4 border-red-600 p-5 rounded-r-xl mb-8">
            <h5 className="font-sans font-extrabold text-red-800 text-xs uppercase tracking-widest mb-2">
              Summary Keynotes (AI Summarized)
            </h5>
            <p className="text-neutral-700 text-sm md:text-base leading-relaxed font-sans font-medium">
              {article.summary.replace(/[*#_]/g, '').trim()}
            </p>
          </div>
        )}

        {/* Customized Premium Card for Scholarships */}
        {article.category === 'Scholarships' && (
          <div className="bg-gradient-to-br from-red-50/40 via-white to-red-50/10 border border-neutral-200 rounded-2xl p-6 mb-8 shadow-sm">
            <div className="flex items-center gap-3 border-b border-red-100 pb-3 mb-4">
              <div className="p-2.5 bg-red-650 text-white rounded-xl shadow-md">
                <GraduationCap className="w-5 h-5 shrink-0" />
              </div>
              <div>
                <h4 className="font-sans font-extrabold text-neutral-900 text-sm uppercase tracking-wider">
                  Verified Scholarship Offer
                </h4>
                <p className="text-[10px] font-mono text-neutral-400 uppercase">
                  Education Bulletin • Open Enrollment
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {article.scholarshipSponsor && (
                <div className="bg-neutral-50/45 border border-neutral-100 p-3 rounded-lg text-left">
                  <span className="block text-[9px] font-mono text-neutral-455 uppercase font-bold tracking-widest mb-1">Awarding Body / Sponsor</span>
                  <span className="font-sans font-bold text-sm text-neutral-800">{article.scholarshipSponsor}</span>
                </div>
              )}
              {article.scholarshipAmount && (
                <div className="bg-neutral-50/45 border border-neutral-100 p-3 rounded-lg text-left">
                  <span className="block text-[9px] font-mono text-neutral-455 uppercase font-bold tracking-widest mb-1">Financial Value</span>
                  <span className="font-sans font-black text-sm text-red-650">{article.scholarshipAmount}</span>
                </div>
              )}
              {article.scholarshipEligibility && (
                <div className="md:col-span-2 bg-neutral-50/45 border border-neutral-100 p-3 rounded-lg text-left">
                  <span className="block text-[9px] font-mono text-neutral-455 uppercase font-bold tracking-widest mb-1">Eligibility Benchmarks</span>
                  <p className="font-sans font-semibold text-xs text-neutral-700 leading-relaxed">{article.scholarshipEligibility}</p>
                </div>
              )}
              {article.scholarshipDeadline && (
                <div className="bg-neutral-50/45 border border-neutral-100 p-3 rounded-lg flex items-center gap-2.5 text-left">
                  <Calendar className="w-4 h-4 text-red-500 shrink-0" />
                  <div>
                    <span className="block text-[9px] font-mono text-neutral-455 uppercase font-bold tracking-widest">Application Deadline</span>
                    <span className="font-sans font-extrabold text-xs text-neutral-800">{article.scholarshipDeadline}</span>
                  </div>
                </div>
              )}
              {article.scholarshipLink && (
                <a 
                  href={article.scholarshipLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-red-650 hover:bg-red-750 text-white rounded-lg p-3 text-xs font-sans font-bold flex items-center justify-center gap-2 transition"
                >
                  <span>Apply / Verify Opportunity</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Customized Premium Card for Products */}
        {article.category === 'Products' && (
          <div className="bg-gradient-to-br from-amber-50/40 via-white to-amber-50/10 border border-neutral-200 rounded-2xl p-6 mb-8 shadow-sm">
            <div className="flex items-center gap-3 border-b border-amber-100 pb-3 mb-4">
              <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-md">
                <Tag className="w-5 h-5 shrink-0" />
              </div>
              <div>
                <h4 className="font-sans font-extrabold text-neutral-900 text-sm uppercase tracking-wider">
                  Featured Product Offer & Review
                </h4>
                <p className="text-[10px] font-mono text-amber-600 uppercase">
                  Classifieds Desk • Verified Seller
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {article.productPrice && (
                <div className="bg-neutral-50/45 border border-neutral-100 p-3 rounded-lg text-left">
                  <span className="block text-[9px] font-mono text-neutral-455 uppercase font-bold tracking-widest mb-1">Listed Value / Price</span>
                  <span className="font-sans font-black text-base text-amber-600">{article.productPrice}</span>
                </div>
              )}
              {article.productSeller && (
                <div className="bg-neutral-50/45 border border-neutral-100 p-3 rounded-lg text-left">
                  <span className="block text-[9px] font-mono text-neutral-455 uppercase font-bold tracking-widest mb-1">Offered By / Merchant</span>
                  <span className="font-sans font-bold text-sm text-neutral-800">{article.productSeller}</span>
                </div>
              )}
              {article.productLocation && (
                <div className="md:col-span-2 bg-neutral-50/45 border border-neutral-100 p-3 rounded-lg text-left">
                  <span className="block text-[9px] font-mono text-neutral-455 uppercase font-bold tracking-widest mb-1">PickUp / Merchant Location</span>
                  <span className="font-sans font-semibold text-xs text-neutral-700">{article.productLocation}</span>
                </div>
              )}
              {article.productContact && (
                <div className="bg-neutral-50/45 border border-neutral-100 p-3 rounded-lg flex items-center gap-2.5 text-left">
                  <Phone className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <span className="block text-[9px] font-mono text-neutral-455 uppercase font-bold tracking-widest">Inquire / Phone / Email</span>
                    <span className="font-sans font-extrabold text-xs text-neutral-800">{article.productContact}</span>
                  </div>
                </div>
              )}
              {article.productBuyLink && (
                <a 
                  href={article.productBuyLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg p-3 text-xs font-sans font-bold flex items-center justify-center gap-2 transition"
                >
                  <span>Purchase directly online</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Customized Premium Card for Artist, Musicians & Entertainment Promotions */}
        {article.category === 'Promotions' && (
          <div className="bg-gradient-to-br from-emerald-50/40 via-white to-emerald-50/10 border border-neutral-200 rounded-2xl p-6 mb-8 shadow-sm">
            <div className="flex items-center gap-3 border-b border-emerald-100 pb-3 mb-4">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-md">
                <Music className="w-5 h-5 shrink-0" />
              </div>
              <div>
                <h4 className="font-sans font-extrabold text-neutral-900 text-sm uppercase tracking-wider">
                  Senior Desk Featured Artist & Track Promotion
                </h4>
                <p className="text-[10px] font-mono text-emerald-600 uppercase">
                  Entertainment & Creative Desk • Lib Sound Spotlight
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {article.promoArtistName && (
                <div className="bg-neutral-50/45 border border-neutral-100 p-3 rounded-lg text-left">
                  <span className="block text-[9px] font-mono text-neutral-455 uppercase font-bold tracking-widest mb-1">Featured Musician / Creator</span>
                  <span className="font-sans font-black text-sm text-neutral-800">{article.promoArtistName}</span>
                </div>
              )}
              {article.promoReleaseTitle && (
                <div className="bg-neutral-50/45 border border-neutral-100 p-3 rounded-lg text-left">
                  <span className="block text-[9px] font-mono text-neutral-455 uppercase font-bold tracking-widest mb-1">Exclusive Track / Album Title</span>
                  <span className="font-sans font-bold text-sm text-emerald-700 italic">"{article.promoReleaseTitle}"</span>
                </div>
              )}
              {article.promoBookingInfo && (
                <div className="md:col-span-2 bg-neutral-50/45 border border-neutral-100 p-3 rounded-lg text-left">
                  <span className="block text-[9px] font-mono text-neutral-455 uppercase font-bold tracking-widest mb-1">Bookings & Management Info</span>
                  <span className="font-sans font-semibold text-xs text-neutral-700">{article.promoBookingInfo}</span>
                </div>
              )}
              
              {/* Promotional Player embed (SoundCloud, Spotify iframe players, Youtube links) */}
              {article.promoDirectEmbed && (
                <div className="md:col-span-2 bg-neutral-950 border border-neutral-800 p-2.5 rounded-xl flex flex-col justify-center select-none overflow-hidden [&_iframe]:w-full [&_iframe]:max-h-[160px] [&_iframe]:rounded-lg text-left">
                  <span className="text-[8px] font-mono text-emerald-500 uppercase mb-2 tracking-widest block font-black text-center">🔊 Premium Sound Streaming Player</span>
                  <div dangerouslySetInnerHTML={{ __html: article.promoDirectEmbed }} />
                </div>
              )}

              {article.promoMusicUrl && (
                <a 
                  href={article.promoMusicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-neutral-900 hover:bg-neutral-950 text-white rounded-lg p-3 text-xs font-sans font-bold flex items-center justify-center gap-2 transition"
                >
                  <span>Listen on Streaming Platform</span>
                  <Music className="w-3.5 h-3.5 text-emerald-400" />
                </a>
              )}
              {article.promoVideoUrl && (
                <a 
                  href={article.promoVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-red-600 hover:bg-red-750 text-white rounded-lg p-3 text-xs font-sans font-bold flex items-center justify-center gap-2 transition"
                >
                  <span>Watch Music Video Clip</span>
                  <Play className="w-3.5 h-3.5 fill-current text-white" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Supplementary Picture (if hero is occupied by video or embed) */}
        {(article.videoUrl || article.embedCode) && article.imageUrl && (
          <div className="mb-8 rounded-xl overflow-hidden border border-gray-150 shadow-sm bg-neutral-50 p-2.5">
            <img
              src={article.imageUrl}
              alt={article.title}
              className="w-full h-auto max-h-[460px] object-cover rounded-lg"
              referrerPolicy="no-referrer"
            />
            <p className="text-[11px] font-mono text-neutral-500 mt-2 text-center uppercase tracking-wider font-extrabold">
              📷 Featured Coverage Photo
            </p>
          </div>
        )}

        {/* Editorial Correction, Dispatch, or Update Note */}
        {article.publishingNote && (
          <div className="bg-amber-50/70 border border-amber-200/85 rounded-xl p-5 mb-8 flex items-start gap-3.5 shadow-sm">
            <div className="p-1 px-2.5 bg-amber-600 text-white rounded text-[9px] font-mono font-black tracking-wider uppercase shrink-0 mt-0.5 select-none shadow-sm">
              Update Note
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono font-black uppercase text-amber-950 tracking-wider mb-1">EDITORIAL DISPATCH & BULLETIN CORRECTION</div>
              <p className="text-neutral-800 text-xs md:text-sm font-sans font-semibold italic leading-relaxed">
                "{article.publishingNote}"
              </p>
            </div>
          </div>
        )}

        {/* Main Immersive Narrative Content */}
        <div 
          className={`prose max-w-none tracking-normal transition-all duration-300 ${
            fontFamily === 'serif' ? 'font-serif' : fontFamily === 'mono' ? 'font-mono text-xs md:text-sm' : 'font-sans'
          } ${
            lineHeight === 'cozy' ? 'leading-snug space-y-4' : lineHeight === 'relaxed' ? 'leading-loose space-y-8' : 'leading-relaxed space-y-6'
          } ${
            readingTheme === 'sepia' 
              ? 'bg-[#fcf7ee] text-[#402e15] border border-[#f1dfbf] p-6 rounded-2xl shadow-inner [&_p]:text-[#402e15]' 
              : readingTheme === 'dark'
                ? 'bg-[#121212] text-neutral-200 border border-neutral-800 p-6 rounded-2xl shadow-inner [&_p]:text-neutral-200'
                : 'text-neutral-800'
          } mb-8`}
          style={{ fontSize: `${fontScale}%` }}
        >
          {(() => {
            const rawParagraphs = (article.content || '').split(/\n+/).filter(p => p.trim() !== '');
            const paragraphs = rawParagraphs.map(p => {
              return p
                .replace(/[*#_]/g, '') // Strips all markdown symbols *, #, _
                .replace(/^\s*[-•]\s*/gm, '') // Strips bullet marks
                .replace(/&nbsp;/g, ' ')
                .trim();
            }).filter(p => p !== '');
            
            if (paragraphs.length === 0) return null;
            
            if (paragraphs.length <= 2) {
              return (
                <>
                  {paragraphs.map((p, idx) => (
                    <p key={idx} className="leading-relaxed mb-4">{p}</p>
                  ))}
                  <InArticleAd />
                </>
              );
            }
            
            return (
              <>
                {paragraphs.slice(0, 2).map((p, idx) => (
                  <p key={idx} className="leading-relaxed mb-4">{p}</p>
                ))}
                <InArticleAd />
                {paragraphs.slice(2).map((p, idx) => (
                  <p key={idx + 2} className="leading-relaxed mb-4">{p}</p>
                ))}
              </>
            );
          })()}
        </div>

        {/* Associated Attached Documents (PDF, DOC, DOCX, XLSX, etc.) */}
        {article.documents && article.documents.length > 0 && (
          <div className="my-10 border border-neutral-200 bg-neutral-50/50 rounded-2xl p-6 shadow-sm">
            <h4 className="text-sm font-sans font-extrabold text-neutral-900 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-red-650 shrink-0" />
              Attached Official Documents & Briefs
            </h4>
            <p className="text-xs text-neutral-500 mb-4 font-mono leading-relaxed">
              These documents have been authenticated by the editorial desk and published as primary source files for this dispatch.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {article.documents.map((doc, idx) => {
                const isExcel = doc.type === 'XLSX' || doc.type === 'XLS';
                const isPdf = doc.type === 'PDF';
                const isDoc = doc.type === 'DOC' || doc.type === 'DOCX';
                
                const handleDownload = (e: React.MouseEvent) => {
                  e.preventDefault();
                  try {
                    if (doc.url.startsWith('data:')) {
                      const link = document.createElement('a');
                      link.href = doc.url;
                      link.download = doc.name;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    } else {
                      window.open(doc.url, '_blank');
                    }
                  } catch (err) {
                    console.error("Download failed:", err);
                  }
                };

                return (
                  <button
                    key={idx}
                    onClick={handleDownload}
                    className="flex items-center justify-between p-3.5 bg-white border border-gray-200 rounded-lg hover:border-red-650 transition-all cursor-pointer group text-left shadow-sm hover:shadow active:scale-[0.99] w-full"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className={`p-2 rounded-md shrink-0 ${
                        isExcel ? 'bg-emerald-50 text-emerald-700' : isPdf ? 'bg-red-50 text-red-700' : isDoc ? 'bg-blue-50 text-blue-700' : 'bg-neutral-100 text-neutral-700'
                      }`}>
                        {isExcel ? (
                          <FileSpreadsheet className="w-5 h-5 shrink-0" />
                        ) : (
                          <FileText className="w-5 h-5 shrink-0" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-sans font-bold text-xs text-neutral-900 group-hover:text-red-700 truncate" title={doc.name}>
                          {doc.name}
                        </p>
                        <p className="text-[10px] font-mono text-neutral-400 mt-0.5 uppercase">
                          {doc.type} • {doc.size || 'Attachment Record'}
                        </p>
                      </div>
                    </div>
                    <div className="p-1 px-2.5 bg-neutral-900 group-hover:bg-red-650 text-white rounded text-[10px] font-mono transition shrink-0 uppercase tracking-wider font-extrabold flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Additional Media & Pictures Gallery Slideshow */}
        {article.additionalImages && article.additionalImages.length > 0 && (
          <div className="my-10 border-t border-gray-150 pt-8">
            <h4 className="text-sm font-sans font-black text-neutral-950 uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block shrink-0"></span>
              Supplementary Coverage Photo Gallery
            </h4>
            <p className="text-xs text-neutral-550 mb-5 font-mono">
              Click any coverage photo below to access the high-performance media slide reader.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {article.additionalImages.map((image, idx) => (
                <div 
                  key={idx}
                  onClick={() => setActiveLightboxImage(image)}
                  className="relative aspect-[4/3] rounded-xl overflow-hidden border border-gray-150 bg-neutral-900 cursor-pointer group shadow-sm"
                >
                  <img
                    src={image}
                    alt={`${article.title} - Galleried ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-[10px] font-mono font-black text-white uppercase bg-black/60 px-2 py-1 rounded shadow">
                      Maximize Fullscale
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
          </>
        )}
      </div>

      {/* RELATED ARTICLES AND BROADCASTS */}
      <div className="border-t border-gray-150 p-6 md:p-10 bg-neutral-50/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2.5">
            <span className="w-3 h-6 bg-red-650 rounded-sm inline-block shrink-0"></span>
            <h3 className="text-lg md:text-xl font-sans font-black uppercase text-neutral-900 tracking-tight">
              Recommended Related Bulletins
            </h3>
          </div>
          <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase">
            Category: {article.category}
          </span>
        </div>

        {loadingRelated ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-red-650 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-mono ml-3 text-neutral-500">Querying same category briefs...</span>
          </div>
        ) : relatedArticles.length === 0 ? (
          <div className="text-center py-8 text-xs font-mono text-neutral-400">
            No additional dispatches found in this category.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-left">
            {relatedArticles.map((rel) => (
              <div
                key={rel.id}
                onClick={() => {
                  if (onSelectArticle) {
                    onSelectArticle(rel);
                  }
                }}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md hover:border-red-650 transition-all cursor-pointer group flex flex-col justify-between h-full hover:-translate-y-0.5 active:translate-y-0 duration-200"
              >
                <div>
                  {/* Related Card Thumbnail */}
                  <div className="aspect-video w-full bg-neutral-900 overflow-hidden relative">
                    <img
                      src={rel.imageUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=400'}
                      alt={rel.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute bottom-2 left-2 bg-neutral-900/80 text-white text-[8px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded">
                      {rel.category}
                    </span>
                  </div>

                  {/* Content metadata */}
                  <div className="p-4">
                    <h4 className="font-sans font-extrabold text-xs text-neutral-800 tracking-tight leading-snug line-clamp-2 group-hover:text-red-750 transition-colors">
                      {rel.title}
                    </h4>
                    <p className="text-[10px] text-neutral-500 line-clamp-2 mt-1.5 font-sans leading-relaxed">
                      {rel.summary || (rel.content ? `${rel.content.substring(0, 80)}...` : '')}
                    </p>
                  </div>
                </div>

                {/* Footer Stats block */}
                <div className="px-4 pb-3.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[9px] font-mono text-neutral-400">
                  <span className="flex items-center">
                    <Clock className="w-3 h-3 mr-1 text-red-500" />
                    {rel.publishedAt ? (
                      new Date(rel.publishedAt.toDate ? rel.publishedAt.toDate() : rel.publishedAt).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short'
                      })
                    ) : 'Recent'}
                  </span>
                  <span className="flex items-center">
                    <Eye className="w-3 h-3 mr-1 text-neutral-400" />
                    {rel.viewsCount || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* IMMERSIVE LIGHTBOX PORTAL */}
      <AnimatePresence>
        {activeLightboxImage && article.additionalImages && (
          <motion.div 
            key="lightbox-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 md:p-6"
          >
            {/* Lightbox Header Controls */}
            <div className="flex items-center justify-between text-white py-2">
              <div className="text-xs font-mono font-black uppercase tracking-widest text-neutral-400">
                Coverage Photo {article.additionalImages.indexOf(activeLightboxImage) + 1} of {article.additionalImages.length}
              </div>
              <button
                onClick={() => setActiveLightboxImage(null)}
                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
                title="Close Photo Viewer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Immersive Photo Carousel container */}
            <div className="flex-1 flex items-center justify-between gap-4 max-w-6xl mx-auto w-full relative">
              {/* Previous button */}
              {article.additionalImages.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const currentIdx = article.additionalImages!.indexOf(activeLightboxImage);
                    const prevIdx = (currentIdx - 1 + article.additionalImages!.length) % article.additionalImages!.length;
                    setActiveLightboxImage(article.additionalImages![prevIdx]);
                  }}
                  className="p-3 bg-white/10 hover:bg-white/20 hover:scale-105 active:scale-95 text-white rounded-full transition-all cursor-pointer shrink-0"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* Central Image rendering */}
              <div className="flex-1 h-full flex items-center justify-center p-2 relative">
                <motion.img
                  key={activeLightboxImage}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  src={activeLightboxImage}
                  alt="Coverage"
                  className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl select-none"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Next button */}
              {article.additionalImages.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const currentIdx = article.additionalImages!.indexOf(activeLightboxImage);
                    const nextIdx = (currentIdx + 1) % article.additionalImages!.length;
                    setActiveLightboxImage(article.additionalImages![nextIdx]);
                  }}
                  className="p-3 bg-white/10 hover:bg-white/20 hover:scale-105 active:scale-95 text-white rounded-full transition-all cursor-pointer shrink-0"
                >
                  {/* Reuse arrow layout */}
                  <span className="block transform rotate-180">
                    <ChevronLeft className="w-6 h-6" />
                  </span>
                </button>
              )}
            </div>

            {/* Lightbox Footer Metadata */}
            <div className="text-center py-4 bg-black/45 rounded-lg border border-white/5 max-w-3xl mx-auto w-full mb-2">
              <p className="text-white text-xs md:text-sm font-sans font-bold px-4">
                {article.title}
              </p>
              <p className="text-neutral-500 text-[10px] uppercase font-mono mt-1">
                📷 Senior Desk Photo • Fullscreen Capture View
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
