import { useEffect, useState, useRef } from 'react';
import { Article } from '../types';
import { doc, updateDoc, increment, getDoc, setDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  ArrowLeft, Clock, Eye, ThumbsUp, Bookmark, BookmarkCheck, 
  Share2, Volume2, VolumeX, Type, Play, Pause, ChevronLeft 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ArticleDetailProps {
  article: Article;
  onBack: () => void;
  userPrefs: { savedArticles: string[] } | null;
  onToggleBookmark: (articleId: string) => Promise<void>;
}

export default function ArticleDetail({ article, onBack, userPrefs, onToggleBookmark }: ArticleDetailProps) {
  const [hasLiked, setHasLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(article.likesCount);
  const [viewsCount, setViewsCount] = useState(article.viewsCount);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  const [scrollPercent, setScrollPercent] = useState(0);

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
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.summary,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
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
            {article.videoUrl.startsWith('data:video/') || 
             article.videoUrl.endsWith('.mp4') || 
             article.videoUrl.endsWith('.webm') || 
             article.videoUrl.endsWith('.mov') || 
             (!article.videoUrl.includes('youtube.com') && !article.videoUrl.includes('youtu.be') && !article.videoUrl.includes('vimeo.com')) ? (
              <video 
                src={article.videoUrl} 
                controls 
                className="w-full h-full object-contain"
                playsInline
                preload="metadata"
              />
            ) : (
              <iframe
                src={article.videoUrl.replace('watch?v=', 'embed/')}
                title={article.title}
                className="w-full h-full border-0 absolute inset-0"
                allowFullScreen
              />
            )}
          </div>
        ) : article.embedCode ? (
          <div 
            className="w-full h-full flex items-center justify-center bg-black"
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
            {/* Font Adjuster */}
            <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1.5 space-x-1">
              <Type className="w-3.5 h-3.5 text-neutral-400 mr-1 ml-1" />
              {(['sm', 'base', 'lg', 'xl'] as const).map(size => (
                <button
                  key={size}
                  onClick={() => setFontSize(size)}
                  className={`px-2.5 py-1 text-xs font-mono font-black rounded-md uppercase transition-all ${
                    fontSize === size 
                      ? 'bg-neutral-900 text-white' 
                      : 'hover:bg-neutral-100 text-neutral-500'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>

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

        {/* Lead Summary Bullet Box */}
        {article.summary && (
          <div className="bg-red-50/50 border-l-4 border-red-600 p-5 rounded-r-xl mb-8">
            <h5 className="font-sans font-extrabold text-red-800 text-xs uppercase tracking-widest mb-2">
              Summary Keynotes (AI Summarized)
            </h5>
            <p className="text-neutral-700 text-sm md:text-base leading-relaxed font-sans font-medium">
              {article.summary}
            </p>
          </div>
        )}

        {/* Main Immersive Narrative Content */}
        <div className={`prose max-w-none text-neutral-800 tracking-normal ${getFontSizeClass()} font-sans space-y-6 whitespace-pre-line`}>
          {article.content}
        </div>
      </div>
    </motion.article>
  );
}
