import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { 
  collection, onSnapshot, query, orderBy, doc, getDoc, setDoc, 
  updateDoc, writeBatch, addDoc
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './lib/firebase';
import { PRESET_ARTICLES } from './data/presets';
import { Article, UserPreference } from './types';
import ArticleCard from './components/ArticleCard';
import ArticleDetail from './components/ArticleDetail';
import AdminDashboard from './components/AdminDashboard';
import AuthModal from './components/AuthModal';
import TVPortal from './components/TVPortal';
import { 
  Globe, User as UserIcon, Shield, Search, Sliders, Bell, 
  BellOff, Bookmark, History, Sparkles, Filter, X, Grid,
  Plus, TerminalSquare, MessageCircle, Megaphone, ExternalLink,
  Mail, Phone, Facebook, ArrowRight, Tv
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CATEGORIES = [
  'Politics', 'Economy', 'Technology', 'Science', 'Sports', 'Health', 'Culture'
];

function SponsorBanner({ placement, adsList, registerView, onClick }: { placement: string, adsList: any[], registerView: (id: string) => void, onClick: (ad: any) => void }) {
  const activeAds = adsList.filter(ad => ad.placement === placement && ad.active);
  if (activeAds.length === 0) return null;
  const ad = activeAds[0];
  
  useEffect(() => {
    registerView(ad.id);
  }, [ad.id]);
  
  return (
    <div className={`my-4 overflow-hidden rounded-xl border border-amber-200 bg-amber-50/10 relative group transition-all duration-300 ${
      placement === 'header_banner' ? 'w-full max-h-[140px]' : 
      placement === 'sidebar' ? 'w-full aspect-[16/9]' : 'w-full max-h-[120px]'
    }`}>
      <a 
        href={ad.redirectUrl} 
        target="_blank" 
        rel="noopener noreferrer" 
        onClick={() => onClick(ad)}
        className="block w-full h-full relative"
      >
        <img 
          referrerPolicy="no-referrer"
          src={ad.imageUrl} 
          alt={ad.title} 
          className="w-full h-full object-cover transition-transform group-hover:scale-[1.03] duration-500"
        />
        <div className="absolute top-2 right-2 bg-neutral-900/85 text-[6px] font-mono tracking-widest text-white px-1.5 py-0.5 rounded uppercase leading-none select-none z-10">
          Sponsor Ad
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-neutral-950/90 to-transparent p-3 text-white transition-opacity duration-200">
          <p className="text-[9px] font-mono uppercase tracking-widest opacity-80 leading-none mb-1">Sponsored Promotion</p>
          <p className="text-xs font-sans font-black uppercase leading-tight line-clamp-1">{ad.title}</p>
        </div>
      </a>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [feedMode, setFeedMode] = useState<'all' | 'personalized' | 'tv'>('all');
  const [showPrefPanel, setShowPrefPanel] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'likes'>('latest');
  const [whatsappGroups, setWhatsappGroups] = useState<any[]>([]);
  const [cinemaStream, setCinemaStream] = useState<Article | null>(null);
  const [ads, setAds] = useState<any[]>([]);
  const [selectedActiveStreamId, setSelectedActiveStreamId] = useState<string>('');

  // Dynamic Indexing and Link Preview Customizer (SEO & Open Graph for WhatsApp, FB, Twitter, etc.)
  useEffect(() => {
    // Locate meta tag elements
    const metaTitle = document.querySelector('meta[property="og:title"]');
    const metaDesc = document.querySelector('meta[property="og:description"]');
    const metaImg = document.querySelector('meta[property="og:image"]');
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    const twitterDesc = document.querySelector('meta[name="twitter:description"]');
    const twitterImg = document.querySelector('meta[name="twitter:image"]');
    const primDesc = document.querySelector('meta[name="description"]');
    const ogUrl = document.querySelector('meta[property="og:url"]');

    if (selectedArticle) {
      const titleText = `${selectedArticle.title} | Global News`;
      const descText = selectedArticle.summary || (selectedArticle.content ? `${selectedArticle.content.substring(0, 150)}...` : '');
      const imgUrl = selectedArticle.imageUrl || 'https://www.image2url.com/r2/default/images/1780266180882-a407e5fa-d664-4a39-92e8-ed32345ae958.jpg';
      const rawShareUrl = `${window.location.origin}${window.location.pathname}?articleId=${selectedArticle.id}`;
      const shareUrl = rawShareUrl.replace('-dev-', '-pre-');

      document.title = titleText;
      if (metaTitle) metaTitle.setAttribute('content', titleText);
      if (metaDesc) metaDesc.setAttribute('content', descText);
      if (metaImg) metaImg.setAttribute('content', imgUrl);
      if (twitterTitle) twitterTitle.setAttribute('content', titleText);
      if (twitterDesc) twitterDesc.setAttribute('content', descText);
      if (twitterImg) twitterImg.setAttribute('content', imgUrl);
      if (primDesc) primDesc.setAttribute('content', descText);
      if (ogUrl) ogUrl.setAttribute('content', shareUrl);
    } else {
      const defaultTitle = "Global News - Liberia’s Premier Independent News Portal";
      const defaultDesc = "Global News is Liberia's leading independent national news portal. Stay informed with direct political dispatches, financial analysis, daily updates, breaking bulletins, and trusted community reports from and about Liberia.";
      const defaultImg = "https://www.image2url.com/r2/default/images/1780266180882-a407e5fa-d664-4a39-92e8-ed32345ae958.jpg";
      const rawCurrentUrl = window.location.href;
      const currentUrl = rawCurrentUrl.replace('-dev-', '-pre-');

      document.title = defaultTitle;
      if (metaTitle) metaTitle.setAttribute('content', defaultTitle);
      if (metaDesc) metaDesc.setAttribute('content', defaultDesc);
      if (metaImg) metaImg.setAttribute('content', defaultImg);
      if (twitterTitle) twitterTitle.setAttribute('content', defaultTitle);
      if (twitterDesc) twitterDesc.setAttribute('content', defaultDesc);
      if (twitterImg) twitterImg.setAttribute('content', defaultImg);
      if (primDesc) primDesc.setAttribute('content', defaultDesc);
      if (ogUrl) ogUrl.setAttribute('content', currentUrl);
    }
  }, [selectedArticle]);

  // Synchronise deep links from URL search parameters on load
  useEffect(() => {
    if (articles.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const articleId = params.get('articleId') || params.get('article');
      if (articleId) {
        const matched = articles.find(a => a.id === articleId);
        if (matched) {
          setSelectedArticle(matched);
        }
      }
    }
  }, [articles]);

  // Support perfect browser Back/Forward navigation on deep-linked articles
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const articleId = params.get('articleId') || params.get('article');
      if (articleId && articles.length > 0) {
        const matched = articles.find(a => a.id === articleId);
        if (matched) {
          setSelectedArticle(matched);
          return;
        }
      }
      setSelectedArticle(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [articles]);

  const selectArticleAndSetUrl = (art: Article) => {
    setSelectedArticle(art);
    setShowAdminDashboard(false);
    const newUrl = `${window.location.origin}${window.location.pathname}?articleId=${art.id}`;
    window.history.pushState({ articleId: art.id }, '', newUrl);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const resetSelectedArticleAndUrl = () => {
    setSelectedArticle(null);
    const newUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.pushState(null, '', newUrl);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // PWA installation state triggers
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    const handleAppInstalled = () => {
      console.log('App registered in user workspace homescreen successfully!');
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerPWAInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User installation status outcome: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  // Local preferences state (synchronized to Firebase if logged in, local storage if guest)
  const [userPrefs, setUserPrefs] = useState<UserPreference>({
    userId: 'guest',
    categories: ['Politics', 'Technology', 'Science'], // Default interests
    alertEnabled: true,
    savedArticles: [],
    updatedAt: new Date()
  });

  const [isUserAdminDB, setIsUserAdminDB] = useState<boolean>(false);
  const isAdmin = !!user && isUserAdminDB;

  useEffect(() => {
    if (!user) {
      setIsUserAdminDB(false);
      return;
    }
    // Grant administrative and publishing privileges to specified production admin and tester
    if (user.email === 'aki.sokpah.link@gmail.com' || user.email === 'luckyglobalnews@gmail.com') {
      setIsUserAdminDB(true);
    } else {
      setIsUserAdminDB(false);
    }
  }, [user]);

  // 1. Subscribe to Auth Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);

      if (currentUser) {
        // Fetch or create user preferences from Firestore
        const prefsRef = doc(db, 'user_preferences', currentUser.uid);
        try {
          const prefSnap = await getDoc(prefsRef);
          if (prefSnap.exists()) {
            setUserPrefs(prefSnap.data() as UserPreference);
          } else {
            // Setup initial default preferences in DB
            const initialPrefs: UserPreference = {
              userId: currentUser.uid,
              categories: ['Politics', 'Technology', 'Science'],
              alertEnabled: true,
              savedArticles: [],
              updatedAt: new Date()
            };
            await setDoc(prefsRef, initialPrefs);
            setUserPrefs(initialPrefs);
          }
        } catch (err) {
          console.warn("Could not synchronize user preferences, falling back to local state.", err);
        }
      } else {
        // Retrieve guest preferences from localStorage
        const local = localStorage.getItem('global_news_pro_prefs');
        if (local) {
          try {
            setUserPrefs(JSON.parse(local));
          } catch {
            // reset to guest default
          }
        } else {
          setUserPrefs({
            userId: 'guest',
            categories: ['Politics', 'Technology', 'Science'],
            alertEnabled: true,
            savedArticles: [],
            updatedAt: new Date()
          });
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Persist guest preferences
  useEffect(() => {
    if (!user) {
      localStorage.setItem('global_news_pro_prefs', JSON.stringify(userPrefs));
    }
  }, [userPrefs, user]);

  // 2. Real-Time Articles Listener & Seeder
  useEffect(() => {
    const q = query(collection(db, 'articles'), orderBy('publishedAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetchedArticles: Article[] = [];
      snapshot.forEach((docSnap) => {
        fetchedArticles.push({ id: docSnap.id, ...docSnap.data() } as Article);
      });

      // Seeding mechanism: If the database is empty, seed with preset articles!
      if (fetchedArticles.length === 0 && snapshot.metadata.fromCache === false) {
        setLoading(true);
        try {
          const articlesCol = collection(db, 'articles');
          for (const item of PRESET_ARTICLES) {
            await addDoc(articlesCol, {
              ...item,
              publishedAt: new Date()
            });
          }
          // The snapshot listener will trigger again automatically when the articles are added
        } catch (err) {
          console.error("Could not seed default articles", err);
          // Fallback to local presets in state to guarantee beautiful UI
          const seedFallback = PRESET_ARTICLES.map((art, idx) => ({
            id: `seed-art-${idx}`,
            ...art,
            publishedAt: new Date()
          })) as Article[];
          setArticles(seedFallback);
          setLoading(false);
        }
      } else {
        setArticles(fetchedArticles);
        setLoading(false);
      }
    }, (err) => {
      console.warn("Firestore snapshot error. Providing offline/seeding simulation fallback stats", err);
      // Fallback
      const seedFallback = PRESET_ARTICLES.map((art, idx) => ({
        id: `seed-art-${idx}`,
        ...art,
        publishedAt: new Date()
      })) as Article[];
      setArticles(seedFallback);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-Time WhatsApp Groups Listener
  useEffect(() => {
    const q = query(collection(db, 'whatsapp_groups'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      if (list.length === 0) {
        setWhatsappGroups([
          {
            id: 'preset-wp-1',
            title: 'GN Liberia Politics Forum',
            description: 'Direct national briefing dispatches and debate on Liberia political issues.',
            url: 'https://chat.whatsapp.com/invite/LiberiaPoliticsForumGN'
          },
          {
            id: 'preset-wp-2',
            title: 'Global News Daily Alerts',
            description: 'Get breaking updates and immediate push broadcasts straight on your phone.',
            url: 'https://chat.whatsapp.com/invite/GlobalNewsDailyAlerts'
          }
        ]);
      } else {
        setWhatsappGroups(list);
      }
    }, (err) => {
      console.warn("Could not load WhatsApp groups, using default custom fallbacks", err);
      setWhatsappGroups([
        {
          id: 'preset-wp-1',
          title: 'GN Liberia Politics Forum',
          description: 'Direct national briefing dispatches and debate on Liberia political issues.',
          url: 'https://chat.whatsapp.com/invite/LiberiaPoliticsForumGN'
        }
      ]);
    });
    return () => unsubscribe();
  }, []);

  // Real-Time Advertisements Listener
  useEffect(() => {
    const q = query(collection(db, 'advertisements'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      if (list.length === 0) {
        setAds([
          {
            id: 'preset-ad-1',
            title: 'Lonestar Cell MTN Liberia Promo',
            imageUrl: 'https://images.unsplash.com/photo-1542744094-3a31f103e35f?auto=format&fit=crop&q=80&w=1200',
            redirectUrl: 'https://www.lonestarcell.com/',
            placement: 'header_banner',
            active: true,
            viewsCount: 382,
            clicksCount: 42
          },
          {
            id: 'preset-ad-2',
            title: 'Orange Liberia Unlimited LTE Deal',
            imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=600',
            redirectUrl: 'https://www.orange.com.lr/',
            placement: 'sidebar',
            active: true,
            viewsCount: 154,
            clicksCount: 19
          }
        ]);
      } else {
        setAds(list);
      }
    }, (err) => {
      console.warn("Could not load promotions database, using defaults", err);
    });
    return () => unsubscribe();
  }, []);

  // Increment ad views count with full Firestore persistence
  const registerAdView = async (adId: string) => {
    if (adId.startsWith('preset-')) return; // skip for preset local ads
    try {
      const adRef = doc(db, 'advertisements', adId);
      const adDoc = await getDoc(adRef);
      if (adDoc.exists()) {
        const currentViews = adDoc.data().viewsCount || 0;
        await updateDoc(adRef, { viewsCount: currentViews + 1 });
      }
    } catch (err) {
      console.warn("Could not register ad impression stats", err);
    }
  };

  // Increment ad clicks count
  const handleAdClick = async (ad: any) => {
    if (ad.id.startsWith('preset-')) return; // skip for preset local ads
    try {
      const adRef = doc(db, 'advertisements', ad.id);
      const adDoc = await getDoc(adRef);
      if (adDoc.exists()) {
        const currentClicks = adDoc.data().clicksCount || 0;
        await updateDoc(adRef, { clicksCount: currentClicks + 1 });
      }
    } catch (err) {
      console.warn("Could not register ad routing stats", err);
    }
  };

  // Sync Preferences Handler
  const savePreferences = async (updated: UserPreference) => {
    setUserPrefs(updated);
    if (user) {
      const prefsRef = doc(db, 'user_preferences', user.uid);
      try {
        await setDoc(prefsRef, updated);
      } catch (err) {
        console.warn("Could not sync preference state to DB", err);
      }
    }
  };

  // Toggle interest category checkbox
  const handleToggleCategory = (cat: string) => {
    const alreadyInterested = userPrefs.categories.includes(cat);
    const updatedCats = alreadyInterested
      ? userPrefs.categories.filter(c => c !== cat)
      : [...userPrefs.categories, cat];
    
    savePreferences({
      ...userPrefs,
      categories: updatedCats,
      updatedAt: new Date()
    });
  };

  // Toggle Bookmark
  const handleToggleBookmark = async (articleId: string) => {
    const isBookmarked = userPrefs.savedArticles.includes(articleId);
    const updatedSaves = isBookmarked
      ? userPrefs.savedArticles.filter(id => id !== articleId)
      : [...userPrefs.savedArticles, articleId];

    await savePreferences({
      ...userPrefs,
      savedArticles: updatedSaves,
      updatedAt: new Date()
    });
  };

  // Logout handle
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setShowAdminDashboard(false);
      setSelectedArticle(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Extract 24/7 Multiple Live Stream Documents
  const activeLiveStreams = articles.filter(a => a.isLiveStream247 === true && a.liveEmbedEnabled === true);
  const liveStreamDoc = activeLiveStreams.find(s => s.id === selectedActiveStreamId) || activeLiveStreams[0];
  const nonStreamArticles = articles.filter(a => a.isLiveStream247 !== true && a.id !== 'live_stream_24_7');

  // Filtering Logic
  const filteredArticles = nonStreamArticles.filter(art => {
    // 1. Search Query filter
    const matchesSearch = searchQuery.trim() === '' || 
      art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    // 2. Personalization feed mode or Standard category tab filter
    if (feedMode === 'personalized') {
      return userPrefs.categories.length === 0 || userPrefs.categories.includes(art.category);
    } else {
      return activeCategory === 'All' || art.category === activeCategory;
    }
  });

  // Highlight stories for breaking alerts ticker (only if category matches user's interest categories, or general)
  const alertStories = nonStreamArticles.filter(art => {
    if (!art.isAlert) return false;
    // Alerts match user interests if customized alertEnabled is true
    if (userPrefs.alertEnabled) {
      return userPrefs.categories.includes(art.category);
    }
    return true;
  });

  // Trending Sidebar news items
  const trendingArticles = [...nonStreamArticles]
    .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0))
    .slice(0, 5);

  // Bookmarked articles list
  const bookmarkedArticles = nonStreamArticles.filter(art => userPrefs.savedArticles.includes(art.id));

  // Sort the articles dynamically based on selected option
  const sortedArticles = [...filteredArticles].sort((a, b) => {
    if (sortBy === 'popular') {
      return (b.viewsCount || 0) - (a.viewsCount || 0);
    }
    if (sortBy === 'likes') {
      return (b.likesCount || 0) - (a.likesCount || 0);
    }
    // Default 'latest'
    try {
      const dateA = a.publishedAt?.toDate ? a.publishedAt.toDate().getTime() : new Date(a.publishedAt).getTime();
      const dateB = b.publishedAt?.toDate ? b.publishedAt.toDate().getTime() : new Date(b.publishedAt).getTime();
      return dateB - dateA;
    } catch {
      return 0;
    }
  });

  // Determine standard headline (hero) story
  const headlinerArticle = sortedArticles.length > 0 ? sortedArticles[0] : null;
  const gridArticles = sortedArticles.length > 1 ? sortedArticles.slice(1) : [];

  return (
    <div id="main-news-shell" className="min-h-screen bg-neutral-50/70 text-neutral-900 pb-16 font-sans">
      
      {/* 1. BBC NEWS LAYOUT BRAND HEADER */}
      <header className="bg-neutral-900 text-white shadow-xl select-none font-sans sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between py-3.5 border-b border-neutral-800">
            {/* Logo */}
            <div 
              className="flex items-center space-x-2.5 cursor-pointer"
              onClick={() => {
                resetSelectedArticleAndUrl();
                setShowAdminDashboard(false);
                setFeedMode('all');
                setActiveCategory('All');
              }}
            >
              <div className="bg-neutral-805 hover:bg-neutral-800 text-white font-black font-sans tracking-tight text-lg rounded-xl pl-1.5 pr-3 py-1.5 text-center shadow-lg uppercase transition-all flex items-center gap-2 border border-neutral-750">
                <img 
                  src="https://www.image2url.com/r2/default/images/1780266180882-a407e5fa-d664-4a39-92e8-ed32345ae958.jpg" 
                  className="w-7 h-7 object-cover rounded-full border border-red-500 shadow animate-spin-slow shrink-0" 
                  alt="GN" 
                  referrerPolicy="no-referrer"
                />
                <span className="text-white">Global <span className="text-red-500">News</span></span>
              </div>
              <span className="hidden sm:inline text-[10px] font-mono tracking-widest text-neutral-450 font-bold uppercase transition-colors">
                • Powered by SASTECH Inc. based in Liberia •
              </span>
            </div>

            {/* Quick clock & Utility panel */}
            <div className="flex items-center space-x-4">
              <span className="hidden lg:inline text-xs font-mono text-neutral-300">
                {new Date().toLocaleDateString('en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>

              {/* PWA Download Button is active when installable */}
              {deferredPrompt && (
                <button
                  onClick={triggerPWAInstall}
                  className="bg-red-650 hover:bg-red-750 text-white animate-pulse p-2 rounded-lg cursor-pointer transition flex items-center gap-1.5 text-xs font-mono font-bold shadow-lg"
                  title="Download and Install Mobile/Desktop PWA App"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Download App</span>
                </button>
              )}

              {/* Preferences Button */}
              <button
                onClick={() => setShowPrefPanel(!showPrefPanel)}
                className={`p-2 rounded-lg cursor-pointer transition flex items-center gap-1 text-xs font-mono font-bold ${
                  showPrefPanel || feedMode === 'personalized'
                    ? 'bg-red-600 text-white'
                    : 'bg-neutral-800 hover:bg-neutral-755 text-neutral-300'
                }`}
                title="Personalize Feed"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Personalize Feed</span>
              </button>

              {/* Admin Gate Trigger if logged in */}
              {user && (
                <button
                  onClick={() => {
                    setShowAdminDashboard(!showAdminDashboard);
                    setSelectedArticle(null);
                  }}
                  className={`p-2 rounded-lg cursor-pointer text-xs font-mono font-bold transition flex items-center gap-1 ${
                    showAdminDashboard 
                      ? 'bg-red-650 text-white' 
                      : 'bg-neutral-800 hover:bg-neutral-755 text-neutral-300'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 text-red-500" />
                  <span className="hidden md:inline">{isAdmin ? 'Editor Hub' : 'Request Editor'}</span>
                </button>
              )}

              {/* Profile login badge */}
              {authReady && (
                user ? (
                  <div className="flex items-center space-x-2 border-l border-neutral-700 pl-4">
                    <div className="w-8 h-8 rounded-full bg-red-750 flex items-center justify-center text-white font-bold text-xs shadow-md">
                      {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <button 
                      onClick={handleSignOut}
                      className="text-xs font-mono text-neutral-400 hover:text-red-500 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="bg-white hover:bg-neutral-100 text-neutral-900 font-sans font-bold text-xs uppercase px-4 py-2 rounded-md shadow-md cursor-pointer transition"
                  >
                    Sign In
                  </button>
                )
              )}
            </div>
          </div>

          {/* Subheader category list */}
          {!showAdminDashboard && !selectedArticle && (
            <div className="flex items-center justify-between py-2 overflow-x-auto gap-4 no-scrollbar">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => {
                    setFeedMode('all');
                    setActiveCategory('All');
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-black uppercase transition-all ${
                    feedMode === 'all' && activeCategory === 'All'
                      ? 'bg-white text-neutral-900 shadow'
                      : 'hover:bg-neutral-800 text-neutral-300'
                  }`}
                >
                  All News
                </button>

                <button
                  onClick={() => setFeedMode('personalized')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-black uppercase transition-all flex items-center gap-1 ${
                    feedMode === 'personalized'
                      ? 'bg-red-650 text-white shadow'
                      : 'hover:bg-neutral-800 text-neutral-300'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-yellow-400 fill-current" />
                  My Highlights
                </button>

                <button
                  onClick={() => {
                    setFeedMode('tv');
                    setSelectedArticle(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-black uppercase transition-all flex items-center gap-1.5 shrink-0 ${
                    feedMode === 'tv'
                      ? 'bg-red-650 text-white shadow'
                      : 'hover:bg-neutral-800 text-neutral-300'
                  }`}
                >
                  <Tv className="w-3.5 h-3.5 text-red-500 fill-current animate-pulse shrink-0" />
                  Global TV
                </button>

                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => {
                      setFeedMode('all');
                      setActiveCategory(cat);
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-black uppercase transition-all ${
                      feedMode === 'all' && activeCategory === cat
                        ? 'bg-white text-neutral-900 shadow'
                        : 'hover:bg-neutral-800 text-neutral-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Mini Search input */}
              <div className="relative max-w-xs hidden md:block">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-neutral-800 text-xs text-white placeholder-neutral-450 border-0 rounded-lg pl-8 pr-3 py-1.5 w-48 focus:w-60 focus:bg-neutral-750 transition-all focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 2. REAL-TIME RUNNING ALERT TICKER */}
      {(alertStories.length > 0 || activeLiveStreams.some(s => s.liveIsAlert)) && !showAdminDashboard && (
        <div className="bg-red-600 text-white font-sans overflow-hidden select-none border-b border-red-750">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-2.5 flex items-center space-x-3.5">
            <span className="flex items-center shrink-0 bg-neutral-900 text-white text-[10px] font-mono font-black uppercase px-2.5 py-1 rounded shadow-md border border-neutral-800">
              <span className="w-2 h-2 rounded-full bg-red-600 mr-1.5 animate-ping" />
              Breaking Alert
            </span>
            <div className="relative flex-1 overflow-hidden h-5">
              <div className="absolute whitespace-nowrap animate-marquee flex items-center space-x-12 scroll-smooth text-xs md:text-sm font-sans font-extrabold pb-0.5">
                {/* Active alert live streams */}
                {activeLiveStreams.filter(s => s.liveIsAlert).map((stream) => (
                  <button
                    key={stream.id}
                    onClick={() => {
                      setSelectedActiveStreamId(stream.id);
                      setCinemaStream(stream);
                    }}
                    className="hover:underline flex items-center gap-2 text-red-100 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded text-xs select-none font-sans font-black tracking-wide"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping inline-block shrink-0" />
                    <span>📡 LIVE NOW: {stream.liveEmbedTitle} — WATCH BROADCAST 24/7!</span>
                  </button>
                ))}

                {alertStories.map((story) => (
                  <button
                    key={story.id}
                    onClick={() => {
                      selectArticleAndSetUrl(story);
                    }}
                    className="hover:underline flex items-center gap-2 text-left"
                  >
                    <span>[{story.category.toUpperCase()}]</span>
                    <span>{story.title}</span>
                    <span className="text-[10px] opacity-75 font-mono select-none font-medium">★ tap to read</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid Content container */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-6">

        {/* HEADER SPONSOR BILLBOARD */}
        {!showAdminDashboard && (
          <SponsorBanner 
            placement="header_banner" 
            adsList={ads} 
            registerView={registerAdView} 
            onClick={handleAdClick} 
          />
        )}

        {/* PERSONALIZATION OPTIONS BOX PANEL */}
        <AnimatePresence>
          {showPrefPanel && (
            <motion.div
              key="pref-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-8 overflow-hidden bg-white rounded-xl border border-gray-150 shadow-md"
            >
              <div className="p-5 md:p-6 border-b border-gray-100 flex items-center justify-between bg-neutral-50">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-red-600" />
                  <div>
                    <h3 className="text-sm font-sans font-black text-neutral-900">Custom Interactivity Preferences</h3>
                    <p className="text-xs text-neutral-500 font-mono">Setup news alerts and topic coverage filters.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPrefPanel(false)}
                  className="text-neutral-400 hover:text-neutral-700 p-1 bg-white border border-gray-200 rounded-md shadow-sm transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8">
                  <h4 className="text-xs font-mono font-black uppercase text-neutral-550 mb-3 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5" /> Follow News Desks (Personalization Categories)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => {
                      const isSelected = userPrefs.categories.includes(cat);
                      return (
                        <button
                          key={cat}
                          onClick={() => handleToggleCategory(cat)}
                          className={`px-3.5 py-2 font-sans font-extrabold text-xs rounded-xl border flex items-center space-x-2 transition ${
                            isSelected 
                              ? 'bg-neutral-900 border-neutral-900 text-white' 
                              : 'bg-white hover:bg-neutral-50 border-gray-200 text-neutral-600'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-red-500' : 'bg-neutral-300'}`} />
                          <span>{cat}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="md:col-span-4 border-t md:border-t-0 md:border-l border-gray-100 pt-5 md:pt-0 md:pl-6 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-mono font-black uppercase text-neutral-550 mb-3 flex items-center gap-1.5">
                      {userPrefs.alertEnabled ? <Bell className="w-3.5 h-3.5 text-red-500 animate-bounce" /> : <BellOff className="w-3.5 h-3.5" />}
                      Breaking Alerts
                    </h4>
                    <p className="text-xs text-neutral-500 mb-4 leading-normal">
                      Only receive alert announcements that match your designated interest folders.
                    </p>
                  </div>

                  <button
                    onClick={() => savePreferences({
                      ...userPrefs,
                      alertEnabled: !userPrefs.alertEnabled,
                      updatedAt: new Date()
                    })}
                    className={`w-full py-2.5 rounded-lg text-xs font-mono font-bold border transition ${
                      userPrefs.alertEnabled
                        ? 'bg-red-50 border-red-200 text-red-600'
                        : 'bg-white border-gray-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    {userPrefs.alertEnabled ? 'Alerts Enabled (Following Categories)' : 'Alerts Disabled (Show General)'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CORE CONDITIONAL VIEWS OUTLET */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-3 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-xs font-mono text-neutral-400">Syncing live bulletins from Global News network...</p>
          </div>
        ) : showAdminDashboard ? (
          /* ADMIN PORTAL */
          <AdminDashboard
            articles={articles}
            onRefreshArticles={async () => {}} // snapshot takes care of this instantly!
            onSignOut={handleSignOut}
          />
        ) : selectedArticle ? (
          /* ARTICLE DETAILED VIEW */
          <ArticleDetail
            article={selectedArticle}
            onBack={resetSelectedArticleAndUrl}
            userPrefs={userPrefs}
            onToggleBookmark={handleToggleBookmark}
          />
        ) : feedMode === 'tv' ? (
          /* GLOBAL SATELLITE TV PORTAL */
          <TVPortal />
        ) : (
          /* STANDARD HERO FEED + TAB DIVISION */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Feed Section: Cols 1 to 8 */}
            <div className="lg:col-span-8 space-y-8">
              {feedMode === 'personalized' && (
                <div className="bg-gradient-to-r from-red-650 to-neutral-850 text-white rounded-xl p-6 shadow-md flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold tracking-widest text-red-200 uppercase">Interactive Filter</span>
                    <h3 className="text-xl font-sans font-black mt-0.5">Your Curated Spotlight</h3>
                    <p className="text-xs mt-1 text-neutral-200 leading-normal max-w-md">
                      Displaying news categorized in: <strong className="text-white">{userPrefs.categories.join(', ') || 'No selections (showing general)'}</strong>. Custom settings apply close to real-time.
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowPrefPanel(true)}
                    className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-mono font-bold transition flex items-center gap-1 shrink-0"
                  >
                    Adjust Interests
                  </button>
                </div>
              )}

              {/* Feed headline display (Hero Grid) */}
              {filteredArticles.length === 0 ? (
                <div className="bg-white border rounded-xl p-12 text-center text-neutral-500 border-gray-150">
                  <Grid className="w-10 h-10 mx-auto text-neutral-300 mb-4" />
                  <p className="text-sm font-sans font-bold">No match found inside this category branch.</p>
                  <button
                    onClick={() => {
                      setFeedMode('all');
                      setActiveCategory('All');
                      setSearchQuery('');
                    }}
                    className="mt-4 text-xs font-mono text-red-650 hover:underline font-bold border border-red-150 px-4 py-2 rounded-lg"
                  >
                    Reset Coverage Filters
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Dynamic Category Description & Sort selection */}
                  <div className="bg-white border border-gray-150 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
                    <div>
                      <h4 className="text-sm font-sans font-black text-neutral-950 uppercase flex items-center gap-1.5 leading-none">
                        <span className="w-2.5 h-2.5 bg-red-650 rounded-full inline-block animate-pulse shrink-0" />
                        <span>{activeCategory === 'All' ? 'All Coverage Dispatch' : `${activeCategory} Bulletin`}</span>
                      </h4>
                      <p className="text-[11px] text-neutral-500 font-mono mt-1">
                        Tracking {filteredArticles.length} exclusive real-time publications.
                      </p>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0 bg-neutral-100 p-1 rounded-lg">
                      <span className="hidden sm:inline text-[9px] font-mono uppercase font-black text-neutral-450 px-1.5">Sort:</span>
                      <button
                        onClick={() => setSortBy('latest')}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold uppercase transition-all duration-150 ${
                          sortBy === 'latest' 
                            ? 'bg-neutral-900 text-white shadow-xs' 
                            : 'text-neutral-500 hover:text-neutral-900 cursor-pointer'
                        }`}
                      >
                        🕒 Latest
                      </button>
                      <button
                        onClick={() => setSortBy('popular')}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold uppercase transition-all duration-150 ${
                          sortBy === 'popular' 
                            ? 'bg-neutral-900 text-white shadow-xs' 
                            : 'text-neutral-500 hover:text-neutral-900 cursor-pointer'
                        }`}
                      >
                        🔥 Popular
                      </button>
                      <button
                        onClick={() => setSortBy('likes')}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold uppercase transition-all duration-150 ${
                          sortBy === 'likes' 
                            ? 'bg-neutral-900 text-white shadow-xs' 
                            : 'text-neutral-500 hover:text-neutral-900 cursor-pointer'
                        }`}
                      >
                        ❤️ Liked
                      </button>
                    </div>
                  </div>

                  {/* Lead Highlight Hero (BBC style banner) */}
                  {headlinerArticle && (
                    <ArticleCard
                      article={headlinerArticle}
                      layout="featured"
                      onClick={() => {
                        selectArticleAndSetUrl(headlinerArticle);
                      }}
                    />
                  )}

                  {/* IN-FEED SPONSOR PROMOTION */}
                  <SponsorBanner 
                    placement="in_feed" 
                    adsList={ads} 
                    registerView={registerAdView} 
                    onClick={handleAdClick} 
                  />

                  {/* Grid layout */}
                  {gridArticles.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-mono font-black uppercase tracking-widest text-neutral-450 border-b border-gray-150 pb-2 flex items-center gap-1.5">
                        <Grid className="w-3.5 h-3.5" /> Latest Press Broadcasts
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {gridArticles.map((art) => (
                          <ArticleCard
                            key={art.id}
                            article={art}
                            layout="standard"
                            onClick={() => {
                              selectArticleAndSetUrl(art);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Side-Columns: Cols 9 to 12 */}
            <aside id="news-sidebar" className="lg:col-span-4 space-y-8">
              
              {/* PERSISTENT 24/7 LIVE STREAM PLAYER */}
              {liveStreamDoc && liveStreamDoc.liveEmbedEnabled && (
                <div className="p-5 border border-red-200 bg-red-50/10 rounded-xl space-y-3.5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-red-100 pb-2">
                    <h4 className="text-xs font-mono font-black uppercase text-red-750 flex items-center gap-1.5 leading-none">
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-650"></span>
                      </span>
                      <span className="tracking-widest">24/7 LIVE COVERAGE</span>
                    </h4>
                    <span className="text-[9px] bg-red-105 text-red-800 px-2 py-0.5 rounded font-mono font-black uppercase select-none tracking-wider">
                      ON AIR
                    </span>
                  </div>

                  <p className="font-sans font-black text-xs text-neutral-900 leading-tight uppercase">
                    {liveStreamDoc.liveEmbedTitle || 'Global News Live Broadcast'}
                  </p>

                  {activeLiveStreams.length > 1 && (
                    <div className="flex flex-wrap gap-1 bg-red-50/50 p-1 rounded-md border border-red-100">
                      {activeLiveStreams.map((stream, idx) => {
                        const isCurrent = stream.id === liveStreamDoc.id;
                        return (
                          <button
                            key={stream.id}
                            type="button"
                            onClick={() => setSelectedActiveStreamId(stream.id)}
                            className={`flex-1 text-center py-1 px-1.5 rounded transition text-[8px] font-mono font-black uppercase ${
                              isCurrent
                                ? 'bg-red-650 text-white shadow-xs'
                                : 'bg-white text-neutral-500 hover:bg-neutral-100 border border-neutral-200 cursor-pointer'
                            }`}
                          >
                            📡 Stream {idx + 1}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="aspect-video w-full rounded-lg overflow-hidden bg-black flex items-center justify-center border border-gray-150 shadow-inner relative group bg-neutral-950">
                    {/* Dynamic Player according to source */}
                    {liveStreamDoc.liveEmbedSource === 'youtube' && (
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${
                          liveStreamDoc.liveEmbedUrl.includes('v=') 
                            ? liveStreamDoc.liveEmbedUrl.split('v=')[1]?.split('&')[0] 
                            : liveStreamDoc.liveEmbedUrl.includes('youtu.be/') 
                              ? liveStreamDoc.liveEmbedUrl.split('youtu.be/')[1]?.split('?')[0] 
                              : liveStreamDoc.liveEmbedUrl
                        }?autoplay=0&mute=1&controls=1&enablejsapi=1`}
                        title={liveStreamDoc.liveEmbedTitle}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    )}

                    {liveStreamDoc.liveEmbedSource === 'twitch' && (
                      <iframe
                        src={`https://player.twitch.tv/?channel=${liveStreamDoc.liveEmbedUrl}&parent=${window.location.hostname}&muted=true&autoplay=false`}
                        parent={window.location.hostname}
                        frameBorder="0"
                        scrolling="no"
                        allowFullScreen={true}
                        width="100%"
                        height="100%"
                        className="w-full h-full"
                      />
                    )}

                    {liveStreamDoc.liveEmbedSource === 'facebook' && (
                      <iframe
                        src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(liveStreamDoc.liveEmbedUrl)}&show_text=false&t=0&autoplay=false&mute=true`}
                        width="100%"
                        height="100%"
                        style={{ border: 'none', overflow: 'hidden' }}
                        scrolling="no"
                        frameBorder="0"
                        allowFullScreen={true}
                        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                        className="w-full h-full"
                      />
                    )}

                    {liveStreamDoc.liveEmbedSource === 'm3u8' && (
                      <video
                        src={liveStreamDoc.liveEmbedUrl}
                        controls
                        autoPlay={false}
                        muted
                        playsInline
                        className="w-full h-full object-contain"
                      />
                    )}

                    {liveStreamDoc.liveEmbedSource === 'custom_embed' && (
                      <div 
                        className="w-full h-full flex items-center justify-center [&_iframe]:w-full [&_iframe]:h-full"
                        dangerouslySetInnerHTML={{ __html: liveStreamDoc.liveEmbedCode || '' }}
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-neutral-450 font-mono select-none pt-0.5">
                    <span>⚙️ Native low-latency feed</span>
                    <button
                      onClick={() => setCinemaStream(liveStreamDoc)}
                      className="text-red-750 hover:text-red-900 font-black hover:underline flex items-center gap-1 uppercase bg-red-100 hover:bg-red-200 transition px-2 py-0.5 rounded cursor-pointer text-[9px]"
                    >
                      Maximize Stream
                    </button>
                  </div>
                </div>
              )}

              {/* CONNECT & CONTACT EDITORIAL DESK COMPACT PANEL */}
              <div className="p-5 border border-red-200 bg-gradient-to-br from-white to-red-50/10 rounded-xl space-y-4 shadow-sm">
                <h4 className="text-xs font-mono font-black uppercase text-red-800 pb-2 border-b border-red-100 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Megaphone className="w-3.5 h-3.5 text-red-600" />
                    Connect & News Tips
                  </span>
                  <span className="text-[10px] bg-red-100 text-red-900 px-2 py-0.5 rounded font-mono font-black uppercase select-none tracking-wider">
                    24/7 Desk
                  </span>
                </h4>
                
                <p className="text-[11px] text-neutral-600 leading-relaxed font-sans">
                  Have a hot news scoop, press release, advertisement query, or feedback? Get in touch directly with <strong>Global News by SASTECH Inc.</strong> across any channel below!
                </p>

                <div className="space-y-2.5">
                  {/* WhatsApp Business */}
                  <a 
                    href="https://wa.me/231889824005" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg group transition text-left"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-500 rounded text-white group-hover:scale-110 transition">
                        <MessageCircle className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-[9px] font-mono font-black uppercase tracking-wider text-emerald-800 block leading-tight">WhatsApp Business</span>
                        <span className="text-xs font-sans font-black text-neutral-800 leading-none">+231 88 982 4005</span>
                      </div>
                    </div>
                    <ExternalLink className="w-3 h-3 text-emerald-600 group-hover:translate-x-0.5 transition" />
                  </a>

                  {/* Facebook Page */}
                  <a 
                    href="https://www.facebook.com/profile.php?id=61590294191822" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg group transition text-left"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-600 rounded text-white group-hover:scale-110 transition">
                        <Facebook className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-[9px] font-mono font-black uppercase tracking-wider text-blue-800 block leading-tight">Official Facebook Page</span>
                        <span className="text-xs font-sans font-black text-neutral-800 leading-none">Global News Feed</span>
                      </div>
                    </div>
                    <ExternalLink className="w-3 h-3 text-blue-600 group-hover:translate-x-0.5 transition" />
                  </a>

                  {/* Call Line */}
                  <a 
                    href="tel:+231889792996" 
                    className="flex items-center justify-between p-2.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg group transition text-left"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-neutral-800 rounded text-white group-hover:scale-110 transition">
                        <Phone className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-[9px] font-mono font-black uppercase tracking-wider text-neutral-600 block leading-tight">Direct Call Desk</span>
                        <span className="text-xs font-sans font-black text-neutral-800 leading-none">+231 88 979 2996</span>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-500 group-hover:translate-x-0.5 transition" />
                  </a>

                  {/* Email */}
                  <a 
                    href="mailto:globalnews.official@gmail.com" 
                    className="flex items-center justify-between p-2.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg group transition text-left"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-red-500 rounded text-white group-hover:scale-110 transition">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-[9px] font-mono font-black uppercase tracking-wider text-red-800 block leading-tight">Official Inbox</span>
                        <span className="text-[11px] font-sans font-black text-neutral-800 leading-none break-all">globalnews.official@gmail.com</span>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-red-550 group-hover:translate-x-0.5 transition" />
                  </a>
                </div>

                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[9px] font-mono text-neutral-450 leading-none">
                  <span>Developed by SASTECH Inc.</span>
                  <span>Liberia</span>
                </div>
              </div>

              {/* SIDEBAR SPONSOR PROMOTION */}
              <SponsorBanner 
                placement="sidebar" 
                adsList={ads} 
                registerView={registerAdView} 
                onClick={handleAdClick} 
              />
              
              {/* WHATSAPP CHANNELS WIDGET */}
              {whatsappGroups.length > 0 && (
                <div className="p-5 border border-emerald-200 bg-emerald-50/15 rounded-xl space-y-4 shadow-sm">
                  <h4 className="text-xs font-mono font-black uppercase text-emerald-800 pb-2 border-b border-emerald-150 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 animate-pulse">
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                      Official WhatsApp Groups
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold uppercase">
                      Join Live
                    </span>
                  </h4>
                  
                  <div className="space-y-3">
                    {whatsappGroups.slice(0, 3).map((group) => (
                      <div key={group.id || Math.random().toString()} className="p-3 bg-white border border-emerald-100 rounded-xl shadow-sm space-y-2">
                        <h5 className="font-sans font-black text-xs text-neutral-800 uppercase tracking-tight">{group.title}</h5>
                        <p className="text-[11px] text-neutral-550 leading-normal">{group.description}</p>
                        <a 
                          href={group.url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="w-full py-2 flex items-center justify-center gap-1.5 text-center text-xs font-sans font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow"
                        >
                          <MessageCircle className="w-3.5 h-3.5 shadow-sm" />
                          <span>JOIN GROUP CHAT</span>
                          <ExternalLink className="w-3 h-3 text-emerald-150" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Profile setup card if standard reader needs credentials */}
              {authReady && !user && (
                <div className="p-5 border border-red-200 bg-red-50/20 rounded-xl space-y-3.5">
                  <h4 className="text-xs font-mono font-black uppercase text-red-600 flex items-center gap-1">
                    <TerminalSquare className="w-4 h-4" /> Editor login gateway
                  </h4>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Access the secure publishing dashboard to release multimedia articles and manage real-time analytics.
                  </p>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="w-full bg-neutral-900 hover:bg-black text-white font-sans font-black text-xs uppercase py-2.5 rounded-lg shadow transition cursor-pointer"
                  >
                    Verify Admin Credentials
                  </button>
                </div>
              )}

              {/* SAVED ARTICLES (BOOKMARKS) SCREEN */}
              <div className="p-5 border border-gray-200 bg-white rounded-xl space-y-4 shadow-sm">
                <h4 className="text-xs font-mono font-black uppercase text-neutral-700 pb-2 border-b border-gray-100 flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Bookmark className="w-3.5 h-3.5 text-red-600" /> My Bookmark Folder</span>
                  <span className="text-[10px] bg-neutral-100 px-2 py-0.5 rounded font-mono font-bold text-neutral-500">
                    {userPrefs.savedArticles.length} Saved
                  </span>
                </h4>

                <div className="divide-y divide-gray-100">
                  {bookmarkedArticles.length === 0 ? (
                    <p className="text-xs text-neutral-450 py-4 font-sans text-center">
                      Your bookmarked articles appear here for offline reading.
                    </p>
                  ) : (
                    bookmarkedArticles.map(art => (
                      <div 
                        key={art.id}
                        className="py-3 flex items-center justify-between gap-3 text-xs font-sans group hover:bg-neutral-50/50 px-1 rounded transition"
                      >
                        <span 
                          onClick={() => {
                            selectArticleAndSetUrl(art);
                          }}
                          className="font-bold text-neutral-800 hover:text-red-650 cursor-pointer truncate flex-1 block"
                        >
                          {art.title}
                        </span>
                        <button
                          onClick={() => handleToggleBookmark(art.id)}
                          className="text-[10px] text-red-655 font-mono hover:underline px-2"
                        >
                          remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* TRENDING BAR COLUMN */}
              <div className="p-5 border border-gray-200 bg-white rounded-xl space-y-4 shadow-sm">
                <h4 className="text-xs font-mono font-black uppercase text-neutral-700 pb-2 border-b border-gray-100 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-neutral-400" /> Trending Headlines
                </h4>

                <div className="space-y-2">
                  {trendingArticles.length === 0 ? (
                    <p className="text-xs text-neutral-455 text-center py-4">No data available.</p>
                  ) : (
                    trendingArticles.map((art) => (
                      <ArticleCard
                        key={art.id}
                        article={art}
                        layout="compact"
                        onClick={() => {
                          selectArticleAndSetUrl(art);
                        }}
                      />
                    ))
                  )}
                </div>
              </div>

            </aside>
          </div>
        )}
      </main>

      {/* Elegantly Crafted Brand Footer */}
      <footer className="mt-16 bg-neutral-900 text-white py-12 border-t-4 border-red-600 select-none">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-neutral-800">
            {/* Column 1: Editorial Agency Info */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2.5">
                <div className="bg-red-650 text-white font-black font-sans tracking-tight text-xs rounded px-2.5 py-1 uppercase flex items-center gap-1.5 shadow">
                  <Globe className="w-3.5 h-3.5 animate-spin-slow" />
                  <span>Global News</span>
                </div>
                <span className="text-[10px] font-mono tracking-widest text-neutral-450 font-bold uppercase">
                  BY SASTECH Inc.
                </span>
              </div>
              <p className="text-xs text-neutral-450 leading-relaxed font-sans mt-2">
                Providing standard-setting journalism, real-time live video broadcasts, and verified national bulletin briefings across Liberia and the globe.
              </p>
              <p className="text-[10px] text-neutral-500 font-mono">
                © {new Date().getFullYear()} Global News by SASTECH Inc. All rights reserved.
              </p>
            </div>

            {/* Column 2: Direct Contacts Board */}
            <div className="space-y-3">
              <span className="text-[9px] font-mono text-neutral-400 font-extrabold uppercase tracking-widest block">
                NEWS EDITORIAL BOARD CONTACTS
              </span>
              <ul className="space-y-2 text-xs text-neutral-300 font-sans">
                <li className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <a href="mailto:globalnews.official@gmail.com" className="hover:underline hover:text-red-400 break-all">
                    globalnews.official@gmail.com
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <a href="tel:+231889792996" className="hover:underline hover:text-red-400">
                    +231 88 979 2996 (Direct Hotline)
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <a href="https://wa.me/231889824005" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-emerald-400">
                    +231 88 982 4005 (WhatsApp Business)
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: Social Profile Links & Agency Credit */}
            <div className="space-y-3 md:text-right">
              <span className="text-[9px] font-mono text-neutral-400 font-extrabold uppercase tracking-widest block md:hidden">
                OFFICIAL SOCIAL LINKS & BRANDING
              </span>
              <span className="text-[9px] font-mono text-neutral-400 font-extrabold uppercase tracking-widest hidden md:block">
                OFFICIAL CONNECTIVITY
              </span>
              <div className="flex items-center md:justify-end gap-3 mt-1">
                <a 
                  href="https://www.facebook.com/profile.php?id=61590294191822" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition shadow-md flex items-center gap-1.5 text-xs font-bold leading-none cursor-pointer"
                >
                  <Facebook className="w-3.5 h-3.5" />
                  <span>Facebook Page</span>
                </a>
                <a 
                  href="https://wa.me/231889824005" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition shadow-md flex items-center gap-1.5 text-xs font-bold leading-none cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp Chat</span>
                </a>
              </div>
              <div className="pt-2">
                <p className="text-[10px] text-neutral-450">
                  Engineering Partner & Global Web Publisher
                </p>
                <p className="text-xs font-bold text-neutral-200 mt-0.5">
                  SASTECH Inc. <span className="text-[10px] font-normal text-neutral-500">• Founded in Liberia</span>
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 flex flex-col md:flex-row items-center justify-between text-[10px] font-mono text-neutral-500 gap-3">
            <span>Server Nodes: Liberia Backbone</span>
            <span>Optimized for Google Search Indexing & RSS Feeds</span>
            <span>Designed with desktop-first precision for the global workspace</span>
          </div>
        </div>
      </footer>

      {/* LOGIN & REGISTER MODAL */}
      <AnimatePresence>
        {showAuthModal && (
          <AuthModal
            key="auth-modal"
            onClose={() => setShowAuthModal(false)}
            onSuccess={() => {
              // Automatic redirects on successful authentication can apply
            }}
          />
        )}
      </AnimatePresence>

      {/* PWA Floating Slide-In Installation Prompt */}
      <AnimatePresence>
        {showInstallBanner && deferredPrompt && (
          <motion.div
            key="pwa-install-prompt"
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 260, damping: 25 }}
            className="fixed bottom-6 right-6 z-55 max-w-sm w-[90vw] p-5 bg-neutral-900 border border-neutral-750 text-white rounded-2xl shadow-2xl flex flex-col gap-4 select-none"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3 items-center">
                <img 
                  src="https://www.image2url.com/r2/default/images/1780266180882-a407e5fa-d664-4a39-92e8-ed32345ae958.jpg" 
                  className="w-12 h-12 rounded-xl object-cover border border-red-500 shadow-md shrink-0" 
                  alt="App Icon" 
                />
                <div>
                  <h4 className="text-sm font-sans font-black tracking-tight text-white uppercase">Install Global News</h4>
                  <p className="text-[11px] text-neutral-400 font-sans leading-relaxed mt-0.5">
                    Download & add our premier national portal on your home screen for instant offline access and direct notifications.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowInstallBanner(false)}
                className="text-neutral-450 hover:text-white p-1 rounded transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowInstallBanner(false)}
                className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-750 text-white rounded-lg text-xs font-sans font-bold transition cursor-pointer"
              >
                Later
              </button>
              <button
                onClick={triggerPWAInstall}
                className="flex-1 py-2 bg-red-600 hover:bg-red-750 text-white rounded-lg text-xs font-sans font-extrabold uppercase tracking-wide transition shadow cursor-pointer"
              >
                Install App
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cinematic Cinema Stream Overlay Television View */}
      <AnimatePresence>
        {cinemaStream && (
          <motion.div
            key="cinema-stream-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 md:p-8"
          >
            {/* Header control line */}
            <div className="w-full max-w-5xl flex items-center justify-between mb-4 text-white shrink-0">
              <div className="flex items-center space-x-3">
                <span className="relative flex h-3.5 w-3.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-600"></span>
                </span>
                <div>
                  <h2 className="text-sm md:text-base font-sans font-black uppercase text-white tracking-wider">
                    {cinemaStream.liveEmbedTitle || '24/7 Global News Live Broadcast'}
                  </h2>
                  <p className="text-[10px] font-mono text-neutral-450 uppercase tracking-widest leading-none mt-1">
                    Cinema Mode Online • Secure Delivery Network
                  </p>
                </div>
              </div>

              {activeLiveStreams.length > 1 && (
                <div className="hidden md:flex items-center gap-1.5 bg-neutral-900 px-3 py-1 rounded-lg border border-neutral-800">
                  <span className="text-[9px] font-mono text-neutral-400 uppercase shrink-0">Switch Feed:</span>
                  {activeLiveStreams.map((stream, idx) => {
                    const isCurrent = stream.id === cinemaStream.id;
                    return (
                      <button
                        key={stream.id}
                        type="button"
                        onClick={() => {
                          setSelectedActiveStreamId(stream.id);
                          setCinemaStream(stream);
                        }}
                        className={`px-2.5 py-1 rounded text-[9px] font-mono font-black uppercase transition-all ${
                          isCurrent
                            ? 'bg-red-650 text-white'
                            : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white cursor-pointer'
                        }`}
                      >
                        📡 Channel {idx + 1}
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                onClick={() => setCinemaStream(null)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded-lg text-xs font-mono font-black uppercase transition cursor-pointer"
              >
                <X className="w-4 h-4 text-red-500" />
                <span>Exit Cinema View</span>
              </button>
            </div>

            {/* Core Wide aspect video player stage */}
            <div className="w-full max-w-5xl aspect-video rounded-xl overflow-hidden bg-black border border-neutral-800 shadow-2xl relative flex items-center justify-center">
              {cinemaStream.liveEmbedSource === 'youtube' && (
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${
                    cinemaStream.liveEmbedUrl.includes('v=') 
                      ? cinemaStream.liveEmbedUrl.split('v=')[1]?.split('&')[0] 
                      : cinemaStream.liveEmbedUrl.includes('youtu.be/') 
                        ? cinemaStream.liveEmbedUrl.split('youtu.be/')[1]?.split('?')[0] 
                        : cinemaStream.liveEmbedUrl
                  }?autoplay=1&mute=0&controls=1`}
                  title={cinemaStream.liveEmbedTitle}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full"
                />
              )}

              {cinemaStream.liveEmbedSource === 'twitch' && (
                <iframe
                  src={`https://player.twitch.tv/?channel=${cinemaStream.liveEmbedUrl}&parent=${window.location.hostname}&muted=false&autoplay=true`}
                  parent={window.location.hostname}
                  frameBorder="0"
                  scrolling="no"
                  allowFullScreen={true}
                  width="100%"
                  height="100%"
                  className="w-full h-full"
                />
              )}

              {cinemaStream.liveEmbedSource === 'facebook' && (
                <iframe
                  src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(cinemaStream.liveEmbedUrl)}&show_text=false&t=0&autoplay=true&mute=false`}
                  width="100%"
                  height="100%"
                  style={{ border: 'none', overflow: 'hidden' }}
                  scrolling="no"
                  frameBorder="0"
                  allowFullScreen={true}
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                  className="w-full h-full"
                />
              )}

              {cinemaStream.liveEmbedSource === 'm3u8' && (
                <video
                  src={cinemaStream.liveEmbedUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              )}

              {cinemaStream.liveEmbedSource === 'custom_embed' && (
                <div 
                  className="w-full h-full flex items-center justify-center [&_iframe]:w-full [&_iframe]:h-full"
                  dangerouslySetInnerHTML={{ __html: cinemaStream.liveEmbedCode || '' }}
                />
              )}
            </div>

            {/* Bottom status and instructions bar */}
            <div className="w-full max-w-5xl flex flex-col md:flex-row md:items-center justify-between text-neutral-450 mt-4 text-[10px] gap-2.5 font-mono select-none">
              <span className="flex items-center gap-1.5 uppercase text-red-500 font-extrabold animate-pulse shrink-0">
                <span className="w-2 h-2 rounded-full bg-red-600" />
                Live Broadcast Active
              </span>
              <p className="text-neutral-500 leading-normal text-center md:text-right">
                Watch continuous live television stream from broadcast servers on the global web portal. Stream is loaded securely with standard sandbox permissions.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
