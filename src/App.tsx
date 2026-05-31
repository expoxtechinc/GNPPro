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
import { 
  Globe, User as UserIcon, Shield, Search, Sliders, Bell, 
  BellOff, Bookmark, History, Sparkles, Filter, X, Grid,
  Plus, TerminalSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CATEGORIES = [
  'Politics', 'Economy', 'Technology', 'Science', 'Sports', 'Health', 'Culture'
];

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [feedMode, setFeedMode] = useState<'all' | 'personalized'>('all');
  const [showPrefPanel, setShowPrefPanel] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
    let active = true;
    const checkAdminDB = async () => {
      if (!user) {
        setIsUserAdminDB(false);
        return;
      }
      if (user.email === 'aki.sokpah.link@gmail.com' || user.email === 'luckyglobalnews@gmail.com') {
        setIsUserAdminDB(true);
        return;
      }
      try {
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        if (active) {
          setIsUserAdminDB(adminDoc.exists());
        }
      } catch (err) {
        console.warn("User has custom role check outcome: standard user tier.", err);
        if (active) {
          setIsUserAdminDB(false);
        }
      }
    };
    checkAdminDB();
    return () => {
      active = false;
    };
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

  // Sync Preferences to Database on modification
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

  // Filtering Logic
  const filteredArticles = articles.filter(art => {
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
  const alertStories = articles.filter(art => {
    if (!art.isAlert) return false;
    // Alerts match user interests if customized alertEnabled is true
    if (userPrefs.alertEnabled) {
      return userPrefs.categories.includes(art.category);
    }
    return true;
  });

  // Trending Sidebar news items
  const trendingArticles = [...articles]
    .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0))
    .slice(0, 5);

  // Bookmarked articles list
  const bookmarkedArticles = articles.filter(art => userPrefs.savedArticles.includes(art.id));

  // Determine standard headline (hero) story
  const headlinerArticle = filteredArticles.length > 0 ? filteredArticles[0] : null;
  const gridArticles = filteredArticles.length > 1 ? filteredArticles.slice(1) : [];

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
                setSelectedArticle(null);
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
      {alertStories.length > 0 && !showAdminDashboard && (
        <div className="bg-red-600 text-white font-sans overflow-hidden select-none border-b border-red-750">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-2.5 flex items-center space-x-3.5">
            <span className="flex items-center shrink-0 bg-neutral-900 text-white text-[10px] font-mono font-black uppercase px-2.5 py-1 rounded shadow-md border border-neutral-800">
              <span className="w-2 h-2 rounded-full bg-red-600 mr-1.5 animate-ping" />
              Breaking Alert
            </span>
            <div className="relative flex-1 overflow-hidden h-5">
              <div className="absolute whitespace-nowrap animate-marquee flex items-center space-x-12 scroll-smooth text-xs md:text-sm font-sans font-extrabold pb-0.5">
                {alertStories.map((story) => (
                  <button
                    key={story.id}
                    onClick={() => {
                      setSelectedArticle(story);
                      setShowAdminDashboard(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
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

        {/* PERSONALIZATION OPTIONS BOX PANEL */}
        <AnimatePresence>
          {showPrefPanel && (
            <motion.div
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
            onBack={() => {
              setSelectedArticle(null);
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            userPrefs={userPrefs}
            onToggleBookmark={handleToggleBookmark}
          />
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
                  {/* Lead Highlight Hero (BBC style banner) */}
                  {headlinerArticle && (
                    <ArticleCard
                      article={headlinerArticle}
                      layout="featured"
                      onClick={() => {
                        setSelectedArticle(headlinerArticle);
                        window.scrollTo({ top: 0, behavior: 'instant' });
                      }}
                    />
                  )}

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
                              setSelectedArticle(art);
                              window.scrollTo({ top: 0, behavior: 'instant' });
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
                            setSelectedArticle(art);
                            window.scrollTo({ top: 0, behavior: 'instant' });
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
                          setSelectedArticle(art);
                          window.scrollTo({ top: 0, behavior: 'instant' });
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
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start space-x-2.5 mb-2">
              <div className="bg-red-650 text-white font-black font-sans tracking-tight text-xs rounded px-2 py-0.5 uppercase flex items-center gap-1.5 shadow">
                <Globe className="w-3.5 h-3.5 animate-spin-slow" />
                <span>Global News</span>
              </div>
              <span className="text-[10px] font-mono tracking-widest text-neutral-450 font-bold uppercase">
                • INDEPENDENT MONROVIA BULLETIN •
              </span>
            </div>
            <p className="text-xs text-neutral-450 max-w-lg mt-1 font-sans">
              © {new Date().getFullYear()} Global News. All rights reserved. Providing authoritative coverage on national, regional, and worldwide issues.
            </p>
          </div>
          
          <div className="text-center md:text-right border-t border-neutral-800 md:border-t-0 pt-4 md:pt-0 shrink-0">
            <span className="text-[9px] font-mono text-neutral-400 font-extrabold uppercase tracking-widest block mb-1">
              SYSTEM HOSTING INTEGRATION
            </span>
            <p className="text-[13px] font-sans text-neutral-200">
              Powered by <span className="font-extrabold text-red-500 hover:text-red-400 transition-colors">SASTECH Inc.</span> based in Liberia
            </p>
          </div>
        </div>
      </footer>

      {/* LOGIN & REGISTER MODAL */}
      <AnimatePresence>
        {showAuthModal && (
          <AuthModal
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
    </div>
  );
}
