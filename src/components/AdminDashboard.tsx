import React, { useState, useEffect } from 'react';
import { Article } from '../types';
import { 
  collection, addDoc, doc, deleteDoc, Timestamp, onSnapshot
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  Plus, Trash2, LineChart, Layers, Eye, ThumbsUp, FileText, 
  LogOut, Image as ImageIcon, Video, CheckCircle2, Shield,
  ArrowRight, MessageCircle, Megaphone, ExternalLink, Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';

// Preset high-res visual templates in case the admin does not have a URL ready
const IMAGE_PRESETS = [
  { name: 'World Politics', url: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=800' },
  { name: 'Global Finance', url: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=800' },
  { name: 'Tech Innovations', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800' },
  { name: 'Climate & Science', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800' },
  { name: 'Sports Spotlight', url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800' },
  { name: 'Medical & Health', url: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800' },
];

const CATEGORIES = [
  'Politics', 'Economy', 'Technology', 'Science', 'Sports', 'Health', 'Culture'
];

interface AdminDashboardProps {
  articles: Article[];
  onRefreshArticles: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

export default function AdminDashboard({ articles, onRefreshArticles, onSignOut }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'publish' | 'manage' | 'analytics' | 'whatsapp' | 'advertisements'>('publish');

  const currentEmail = auth.currentUser?.email;
  // aki.sokpah.link@gmail.com is strictly the SOLE verified administrator (with luckyglobalnews@gmail.com for workspace dev)
  const isSuperAdmin = currentEmail === 'aki.sokpah.link@gmail.com' || currentEmail === 'luckyglobalnews@gmail.com';

  // State lists for WhatsApp and Advertisements
  const [whatsappList, setWhatsappList] = useState<any[]>([]);
  const [adsList, setAdsList] = useState<any[]>([]);

  // Form states for News Article
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [category, setCategory] = useState('Politics');
  const [imageUrl, setImageUrl] = useState(IMAGE_PRESETS[0].url);
  const [videoUrl, setVideoUrl] = useState('');
  const [embedCode, setEmbedCode] = useState('');
  const [isAlert, setIsAlert] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  
  // Form states for WhatsApp Groups
  const [wpTitle, setWpTitle] = useState('');
  const [wpDescription, setWpDescription] = useState('');
  const [wpUrl, setWpUrl] = useState('');
  const [isPublishingWp, setIsPublishingWp] = useState(false);

  // Form states for Advertisements
  const [adSponsor, setAdSponsor] = useState('');
  const [adTitle, setAdTitle] = useState('');
  const [adDescription, setAdDescription] = useState('');
  const [adUrl, setAdUrl] = useState('');
  const [adImageUrl, setAdImageUrl] = useState('');
  const [isPublishingAd, setIsPublishingAd] = useState(false);
  
  // Floating messages
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Analytics helper states
  const [stats, setStats] = useState({
    totalArticles: 0,
    totalViews: 0,
    totalLikes: 0,
  });

  // Load WhatsApp and Advertisements in Admin Dashboard
  useEffect(() => {
    const unsubWp = onSnapshot(collection(db, 'whatsapp_groups'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setWhatsappList(list);
    }, (err) => {
      console.warn("Error streaming whatsapp collection: ", err);
    });

    const unsubAds = onSnapshot(collection(db, 'advertisements'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setAdsList(list);
    }, (err) => {
      console.warn("Error streaming ads collection: ", err);
    });

    return () => {
      unsubWp();
      unsubAds();
    };
  }, []);

  useEffect(() => {
    // Calculate total statistics
    const totalViews = articles.reduce((sum, art) => sum + (art.viewsCount || 0), 0);
    const totalLikes = articles.reduce((sum, art) => sum + (art.likesCount || 0), 0);
    setStats({
      totalArticles: articles.length,
      totalViews,
      totalLikes,
    });
  }, [articles]);

  const showFloatingMsg = (success: string, error = '') => {
    setSuccessMessage(success);
    setErrorMessage(error);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      setSuccessMessage('');
      setErrorMessage('');
    }, 5000);
  };

  // Helper function to read and compress phone/device photos in real time
  const handleDevicePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, targetMode: 'news' | 'ad') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize down to max 800px width/height while maintaining aspect ratio
        const MAX_DIM = 800;
        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Convert to tiny high-contrast JPEG Base64 data url
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          
          if (targetMode === 'news') {
            setImageUrl(compressedBase64);
            showFloatingMsg('Photo uploaded from device successfully! Ready to publish.', '');
          } else {
            setAdImageUrl(compressedBase64);
            showFloatingMsg('Ad banner photo uploaded from device successfully!', '');
          }
        }
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  // News publishing
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert("Title and content are required.");
      return;
    }

    setIsPublishing(true);

    const timestampNow = Timestamp.now();
    const newArticle = {
      title: title.trim(),
      content: content.trim(),
      summary: summary.trim(),
      category,
      imageUrl: imageUrl.trim(),
      videoUrl: videoUrl.trim() || null,
      embedCode: embedCode.trim() || null,
      publishedAt: timestampNow,
      authorId: auth.currentUser?.uid || 'admin',
      authorName: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Senior Editor',
      viewsCount: 0,
      likesCount: 0,
      isAlert
    };

    try {
      const articlesCollectionRef = collection(db, 'articles');
      await addDoc(articlesCollectionRef, newArticle);
      
      showFloatingMsg('Article published successfully close to real-time! It is now live.');
      
      // Reset form (except category/image preset to permit quick entries)
      setTitle('');
      setContent('');
      setSummary('');
      setVideoUrl('');
      setEmbedCode('');
      setIsAlert(false);

      await onRefreshArticles();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'articles');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDelete = async (articleId: string) => {
    if (!confirm("Are you sure you want to delete this article? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'articles', articleId));
      await onRefreshArticles();
      showFloatingMsg('Article deleted cleanly.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `articles/${articleId}`);
    }
  };

  // WhatsApp group publishing
  const handleWpPublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wpTitle.trim() || !wpUrl.trim()) {
      alert("Group title and Invite invitation URL are required.");
      return;
    }

    setIsPublishingWp(true);
    try {
      await addDoc(collection(db, 'whatsapp_groups'), {
        title: wpTitle.trim(),
        description: wpDescription.trim() || 'Join our official news channel.',
        url: wpUrl.trim(),
        publishedAt: Timestamp.now()
      });
      showFloatingMsg('WhatsApp Group invite published successfully!');
      setWpTitle('');
      setWpDescription('');
      setWpUrl('');
    } catch (err: any) {
      alert("Error adding WhatsApp Group: " + err.message);
    } finally {
      setIsPublishingWp(false);
    }
  };

  const handleWpDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this WhatsApp group shortcut?")) return;
    try {
      await deleteDoc(doc(db, 'whatsapp_groups', id));
      showFloatingMsg('WhatsApp group shortcut deleted successfully.');
    } catch (err: any) {
      alert("Error deleting WhatsApp group: " + err.message);
    }
  };

  // Advertisement publishing
  const handleAdPublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adSponsor.trim() || !adTitle.trim() || !adUrl.trim()) {
      alert("Sponsor name, Title, and Link URL are required.");
      return;
    }

    setIsPublishingAd(true);
    try {
      await addDoc(collection(db, 'advertisements'), {
        sponsor: adSponsor.trim(),
        title: adTitle.trim(),
        description: adDescription.trim() || 'Premium showcase events partner.',
        url: adUrl.trim(),
        imageUrl: adImageUrl.trim() || 'https://images.unsplash.com/photo-1614680376593-902f74fa0d41?auto=format&fit=crop&w=800',
        publishedAt: Timestamp.now()
      });
      showFloatingMsg('Advertisement banner published successfully!');
      setAdSponsor('');
      setAdTitle('');
      setAdDescription('');
      setAdUrl('');
      setAdImageUrl('');
    } catch (err: any) {
      alert("Error adding ad banner: " + err.message);
    } finally {
      setIsPublishingAd(false);
    }
  };

  const handleAdDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this advertisement?")) return;
    try {
      await deleteDoc(doc(db, 'advertisements', id));
      showFloatingMsg('Advertisement banner removed.');
    } catch (err: any) {
      alert("Error deleting advertisement: " + err.message);
    }
  };

  // Compute category distributions
  const categoryCounts: Record<string, number> = {};
  CATEGORIES.forEach(c => { categoryCounts[c] = 0; });
  articles.forEach(art => {
    if (categoryCounts[art.category] !== undefined) {
      categoryCounts[art.category]++;
    } else {
      categoryCounts[art.category] = 1;
    }
  });

  return (
    <div id="admin-dashboard-root" className="bg-white rounded-xl shadow-sm border border-gray-150 p-6">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 pb-5 mb-6 gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-neutral-900 text-white p-2 rounded-lg">
            <Shield className="w-5 h-5 text-red-500 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-sans font-black text-neutral-900 flex items-center gap-2">
              Global News Editor Hub
              <span className="text-xs font-mono bg-red-100 text-red-750 px-2 py-0.5 rounded-full font-bold">Authorized Admin</span>
            </h2>
            <p className="text-xs font-mono text-neutral-500">Logged in as {auth.currentUser?.email}</p>
          </div>
        </div>

        <button
          onClick={onSignOut}
          className="flex items-center space-x-1.5 px-4 py-2 hover:bg-neutral-100 border border-gray-205 text-neutral-600 rounded-lg text-sm font-sans font-medium transition cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-red-500" />
          <span>Exit Hub</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-2 mb-6">
        <button
          onClick={() => setActiveTab('publish')}
          className={`px-4 py-2.5 text-xs font-mono font-black uppercase rounded-lg transition-all flex items-center cursor-pointer ${
            activeTab === 'publish'
              ? 'bg-neutral-900 text-white'
              : 'hover:bg-neutral-100 text-neutral-500'
          }`}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Publish Article
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={`px-4 py-2.5 text-xs font-mono font-black uppercase rounded-lg transition-all flex items-center cursor-pointer ${
            activeTab === 'manage'
              ? 'bg-neutral-900 text-white'
              : 'hover:bg-neutral-100 text-neutral-500'
          }`}
        >
          <Layers className="w-3.5 h-3.5 mr-1" />
          Manage Content ({articles.length})
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2.5 text-xs font-mono font-black uppercase rounded-lg transition-all flex items-center cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-neutral-900 text-white'
              : 'hover:bg-neutral-100 text-neutral-500'
          }`}
        >
          <LineChart className="w-3.5 h-3.5 mr-1" />
          Realtime Analytics
        </button>
        {isSuperAdmin && (
          <>
            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`px-4 py-2.5 text-xs font-mono font-black uppercase rounded-lg transition-all flex items-center cursor-pointer ${
                activeTab === 'whatsapp'
                  ? 'bg-emerald-600 text-white'
                  : 'hover:bg-emerald-50 text-emerald-700 font-black'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
              WhatsApp Channels ({whatsappList.length})
            </button>
            <button
              onClick={() => setActiveTab('advertisements')}
              className={`px-4 py-2.5 text-xs font-mono font-black uppercase rounded-lg transition-all flex items-center cursor-pointer ${
                activeTab === 'advertisements'
                  ? 'bg-red-650 text-white'
                  : 'hover:bg-red-50 text-red-600 font-black'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5 mr-1.5 animate-bounce" />
              App Advertisements ({adsList.length})
            </button>
          </>
        )}
      </div>

      {/* FLOAT ALERTS */}
      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-sm font-sans font-medium">{successMessage}</p>
        </div>
      )}
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-800 rounded-lg flex items-center gap-3">
          <Shield className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm font-sans font-medium">{errorMessage}</p>
        </div>
      )}

      {/* TAB 1: PUBLISH */}
      {activeTab === 'publish' && (
        <form onSubmit={handlePublish} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 space-y-5">
              {/* Title input */}
              <div>
                <label className="block text-xs font-mono font-black uppercase text-neutral-550 mb-2">Headline Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Global Economic Alliance Announces Core Trade Policy Overhaul"
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500 text-base font-sans font-extrabold"
                />
              </div>

              {/* Content input */}
              <div>
                <label className="block text-xs font-mono font-black uppercase text-neutral-550 mb-2">Article Body (Markdown Supported)</label>
                <textarea
                  required
                  rows={14}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Draft your immersive article here. Use blank lines for paragraphs."
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-sans leading-relaxed"
                />
              </div>
            </div>

            <div className="md:col-span-4 space-y-5">
              {/* Category selector */}
              <div>
                <label className="block text-xs font-mono font-black uppercase text-neutral-550 mb-2">News Desk / Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-neutral-900 font-sans font-bold text-sm focus:ring-2 focus:ring-red-500 focus:outline-none cursor-pointer"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Alert Switch */}
              <div className="flex items-center justify-between border border-dashed border-gray-200 p-4 rounded-lg bg-red-55/10">
                <div>
                  <h4 className="text-xs font-sans font-black text-neutral-800">Push Breaking Alert?</h4>
                  <p className="text-[10px] text-neutral-500">Flags article on readers' personalization tickers.</p>
                </div>
                <input
                  type="checkbox"
                  checked={isAlert}
                  onChange={(e) => setIsAlert(e.target.checked)}
                  className="w-5 h-5 border-gray-300 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                />
              </div>

              {/* Summarized Preview */}
              <div>
                <label className="block text-xs font-mono font-black uppercase text-neutral-550 mb-2">Short Summary Bullet (Highlight)</label>
                <textarea
                  rows={3}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Quick summary bullet point..."
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-neutral-700 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Media input sections */}
              <div className="p-4 bg-neutral-50 border border-gray-200 rounded-lg space-y-4">
                <h4 className="text-xs font-mono font-black uppercase text-neutral-600 flex items-center gap-1.5 border-b border-gray-200 pb-2">
                  <ImageIcon className="w-3.5 h-3.5 text-neutral-500 animate-spin-slow" /> Cover Image Setting
                </h4>

                {/* DEVICE MOBILE FILE UPLOADER */}
                <div>
                  <p className="block text-[10px] font-mono font-black text-red-650 uppercase mb-2">📸 Photo from phone / device</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleDevicePhotoUpload(e, 'news')}
                    id="phone-news-image"
                    className="hidden"
                  />
                  <label 
                    htmlFor="phone-news-image"
                    className="w-full py-2.5 px-3 bg-neutral-900 hover:bg-black text-white text-[11px] font-sans font-black uppercase tracking-wide rounded-lg cursor-pointer transition shadow flex items-center justify-center gap-1.5"
                  >
                    <span>Choose Photo from Device</span>
                  </label>
                  <p className="text-[9px] text-neutral-500 font-mono mt-1 text-center">Compresses & uploads straight from user phone</p>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-neutral-55 px-2 text-[10px] text-neutral-400 font-mono">OR USE INTERNET URL</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-black text-neutral-500 uppercase mb-1">Image URL</label>
                  <input
                    type="url"
                    value={imageUrl.startsWith('data:') ? 'Custom Compressed base64 string' : imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-neutral-800 focus:ring-1 focus:ring-red-500 focus:outline-none"
                  />
                </div>

                {/* Preset Picker */}
                <div>
                  <p className="block text-[10px] font-mono font-black text-neutral-500 uppercase mb-1.5">Preset Theme fallback covers</p>
                  <div className="grid grid-cols-2 gap-1.5 overflow-x-hidden">
                    {IMAGE_PRESETS.map((p, i) => (
                      <button
                        type="button"
                        key={i}
                        onClick={() => setImageUrl(p.url)}
                        className={`text-[10px] font-sans font-medium text-left truncate p-1.5 border rounded cursor-pointer ${
                          imageUrl === p.url 
                            ? 'bg-neutral-900 text-white border-neutral-900' 
                            : 'bg-white hover:bg-neutral-50 text-neutral-600 border-gray-200'
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Multimedia video url */}
              <div className="p-4 bg-neutral-50 border border-gray-200 rounded-lg space-y-3">
                <h4 className="text-xs font-mono font-black uppercase text-neutral-600 flex items-center gap-1.5 border-b border-gray-200 pb-2">
                  <Video className="w-3.5 h-3.5 text-neutral-500" /> Video & Embedding (Optional)
                </h4>

                <div>
                  <label className="block text-[10px] font-mono font-black text-neutral-500 uppercase mb-1">YouTube Video Link</label>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-black text-neutral-500 uppercase mb-1">IFrame Embed Code</label>
                  <input
                    type="text"
                    value={embedCode}
                    onChange={(e) => setEmbedCode(e.target.value)}
                    placeholder="e.g. <iframe ...></iframe>"
                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={isPublishing}
              className="bg-red-650 hover:bg-red-750 disabled:opacity-50 text-white px-8 py-3 rounded-lg font-sans font-extrabold text-sm flex items-center gap-2 transition-all cursor-pointer shadow-md uppercase tracking-wide"
            >
              <span>{isPublishing ? 'Publishing News...' : 'Publish Headline Cover'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: MANAGE */}
      {activeTab === 'manage' && (
        <div className="space-y-4">
          <div className="text-xs font-mono text-neutral-500 mb-2">Showing all {articles.length} news articles dynamically loaded.</div>
          
          <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-150">
            {articles.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 font-sans text-sm">
                No articles found. Use the "Publish Article" section to release the first headlines.
              </div>
            ) : (
              articles.map(art => (
                <div key={art.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white hover:bg-neutral-50/70 transition-colors">
                  <div className="flex items-start gap-3 min-w-0">
                    <img 
                      src={art.imageUrl} 
                      className="w-16 h-10 object-cover rounded" 
                      alt="" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <span className="text-[9px] font-mono font-bold bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded uppercase mr-1.5">
                        {art.category}
                      </span>
                      <h4 className="text-sm font-sans font-bold text-neutral-900 truncate mt-0.5">{art.title}</h4>
                      <div className="flex space-x-3 text-[10px] font-mono text-neutral-400 mt-0.5">
                        <span>{art.publishedAt?.toDate ? art.publishedAt.toDate().toLocaleDateString() : 'Draft'}</span>
                        <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{art.viewsCount}</span>
                        <span className="flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" />{art.likesCount}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(art.id)}
                    className="p-2 border border-red-100 hover:bg-red-50 text-red-655 rounded-lg self-end sm:self-auto transition cursor-pointer"
                    title="Delete Article"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Main highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 border border-gray-200 rounded-xl bg-neutral-50">
              <span className="text-xs font-mono font-black uppercase text-neutral-450">Impressions Total</span>
              <h3 className="text-3xl font-sans font-black text-neutral-900 mt-1 flex items-center gap-2">
                <Eye className="w-6 h-6 text-red-600" />
                {stats.totalViews}
              </h3>
              <p className="text-[10px] text-neutral-500 font-mono mt-1">Real-time unique reads count</p>
            </div>

            <div className="p-5 border border-gray-200 rounded-xl bg-neutral-50">
              <span className="text-xs font-mono font-black uppercase text-neutral-450">User Likes Total</span>
              <h3 className="text-3xl font-sans font-black text-neutral-900 mt-1 flex items-center gap-2">
                <ThumbsUp className="w-6 h-6 text-red-600" />
                {stats.totalLikes}
              </h3>
              <p className="text-[10px] text-neutral-500 font-mono mt-1">Reader engagement likes</p>
            </div>

            <div className="p-5 border border-gray-200 rounded-xl bg-neutral-50">
              <span className="text-xs font-mono font-black uppercase text-neutral-450">Active Articles</span>
              <h3 className="text-3xl font-sans font-black text-neutral-900 mt-1 flex items-center gap-2">
                <FileText className="w-6 h-6 text-red-600" />
                {stats.totalArticles}
              </h3>
              <p className="text-[10px] text-neutral-500 font-mono mt-1">Articles published live</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
            {/* Category ratio */}
            <div className="md:col-span-5 p-5 border border-gray-200 rounded-xl space-y-4">
              <h4 className="text-sm font-sans font-black text-neutral-900 uppercase tracking-tight">Category Distribution Ratio</h4>
              <div className="space-y-3">
                {CATEGORIES.map(cat => {
                  const count = categoryCounts[cat] || 0;
                  const pct = stats.totalArticles > 0 ? (count / stats.totalArticles) * 100 : 0;
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-neutral-700 font-bold">{cat}</span>
                        <span className="text-neutral-500">{count} art. ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
                        <motion.div 
                           className="bg-red-600 h-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Trending stories list */}
            <div className="md:col-span-7 p-5 border border-gray-200 rounded-xl space-y-4">
              <h4 className="text-sm font-sans font-black text-neutral-900 uppercase tracking-tight">Top Trending Stories (Engagement Tracker)</h4>
              <div className="space-y-3">
                {[...articles]
                  .sort((a,b) => (b.viewsCount || 0) - (a.viewsCount || 0))
                  .slice(0, 5)
                  .map((art, idx) => (
                    <div key={art.id} className="flex items-center justify-between text-xs border-b border-gray-100 pb-2 mb-2 last:border-none">
                      <div className="flex items-center space-x-3 truncate">
                        <span className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-[10px] font-bold text-red-700 select-none">
                          {idx + 1}
                        </span>
                        <span className="font-sans font-bold text-neutral-800 truncate">{art.title}</span>
                      </div>
                      <div className="text-neutral-500 font-mono shrink-0 font-semibold space-x-2">
                        <span>{art.viewsCount} reads</span>
                        <span className="text-red-600">★ {art.likesCount}</span>
                      </div>
                    </div>
                  ))
                }
                {articles.length === 0 && (
                  <p className="text-neutral-500 text-xs text-center">No trending stories available.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW TAB: WHATSAPP GROUP CHAT PUBLISHING */}
      {isSuperAdmin && activeTab === 'whatsapp' && (
        <div className="space-y-6">
          <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 rounded-r-lg">
            <h4 className="text-xs font-sans font-black uppercase tracking-wider flex items-center gap-1">
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              Publish Official WhatsApp Groups
            </h4>
            <p className="text-[11px] text-neutral-600 leading-normal mt-1">
              Add direct invitation links to targeted national, political, or broadcast forum communities. These links appear prominently in the web portal sidebar for immediately building your reader base.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form onSubmit={handleWpPublish} className="lg:col-span-5 p-5 border border-gray-200 rounded-xl space-y-4 bg-neutral-50/40">
              <h3 className="text-xs font-mono font-black text-neutral-900 uppercase">Publish Group Shortcut</h3>
              
              <div>
                <label className="block text-[10px] font-mono font-black text-neutral-500 uppercase mb-1">Group Title</label>
                <input
                  type="text"
                  required
                  value={wpTitle}
                  onChange={(e) => setWpTitle(e.target.value)}
                  placeholder="e.g., Liberia Political Forum"
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-black text-neutral-500 uppercase mb-1">Short Mission Description</label>
                <textarea
                  rows={2}
                  value={wpDescription}
                  onChange={(e) => setWpDescription(e.target.value)}
                  placeholder="e.g., Get real-time updates and speak directly with political leaders."
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-left"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-black text-neutral-500 uppercase mb-1">WhatsApp Invite URL</label>
                <input
                  type="url"
                  required
                  value={wpUrl}
                  onChange={(e) => setWpUrl(e.target.value)}
                  placeholder="https://chat.whatsapp.com/..."
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isPublishingWp}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-bold text-xs py-2.5 rounded transition shadow uppercase tracking-wide cursor-pointer flex justify-center items-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4 shadow-sm" />
                <span>Publish WhatsApp Group</span>
              </button>
            </form>

            <div className="lg:col-span-7 p-5 border border-gray-200 rounded-xl space-y-4">
              <h3 className="text-xs font-mono font-black text-neutral-900 uppercase">Currently Published WhatsApp Hubs ({whatsappList.length})</h3>
              
              <div className="divide-y divide-gray-150 max-h-96 overflow-y-auto">
                {whatsappList.length === 0 ? (
                  <p className="text-xs text-neutral-450 py-6 text-center">No custom channels saved in Firestore. Falls back to standard defaults.</p>
                ) : (
                  whatsappList.map(wp => (
                    <div key={wp.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <h4 className="text-xs font-extrabold text-neutral-900">{wp.title}</h4>
                        <p className="text-[10px] text-neutral-500 line-clamp-1 mt-0.5">{wp.description}</p>
                        <a href={wp.url} target="_blank" rel="noreferrer" className="text-[10px] font-mono text-emerald-600 underline truncate block mt-0.5">{wp.url}</a>
                      </div>
                      <button 
                        onClick={() => handleWpDelete(wp.id)}
                        className="p-1.5 border border-red-50 hover:bg-red-50 text-red-500 rounded transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW TAB: ADVERTISEMENTS PUBLISHING */}
      {isSuperAdmin && activeTab === 'advertisements' && (
        <div className="space-y-6">
          <div className="p-4 bg-red-50/40 border-l-4 border-red-600 text-red-800 rounded-r-lg">
            <h4 className="text-xs font-sans font-black uppercase tracking-wider flex items-center gap-1">
              <Megaphone className="w-4 h-4 text-red-500 animate-bounce" />
              Custom Advertisements Management (Audiomack Style)
            </h4>
            <p className="text-[11px] text-neutral-600 leading-normal mt-1">
              Inject monetization sponsor banners precisely like the Audiomack streaming platform. Add advertisements horizontally right above the mainstream hero news grid and vertically as showcase partner cards inside readers' search-sidebar directories.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form onSubmit={handleAdPublish} className="lg:col-span-5 p-5 border border-gray-200 rounded-xl space-y-4 bg-neutral-50/30">
              <h3 className="text-xs font-mono font-black text-neutral-900 uppercase">Publish Sponsor Banner ad</h3>
              
              <div>
                <label className="block text-[10px] font-mono font-black text-neutral-500 uppercase mb-1">Company / Sponsor Name</label>
                <input
                  type="text"
                  required
                  value={adSponsor}
                  onChange={(e) => setAdSponsor(e.target.value)}
                  placeholder="e.g., Audiomack Music"
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-black text-neutral-500 uppercase mb-1">Sponsor Offer Slogan / Title</label>
                <input
                  type="text"
                  required
                  value={adTitle}
                  onChange={(e) => setAdTitle(e.target.value)}
                  placeholder="e.g., Stream Unlimited ad-free music today!"
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-black text-neutral-500 uppercase mb-1">Ad Details / Description</label>
                <textarea
                  rows={2}
                  value={adDescription}
                  onChange={(e) => setAdDescription(e.target.value)}
                  placeholder="e.g., Download the official premium player and enjoy complete offline streams."
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-black text-neutral-500 uppercase mb-1">Landing Redirection URL</label>
                <input
                  type="url"
                  required
                  value={adUrl}
                  onChange={(e) => setAdUrl(e.target.value)}
                  placeholder="https://audiomack.com/..."
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
                />
              </div>

              {/* SPONSOR DEVICE BANNER PHOTO UPLOADER */}
              <div className="p-3 bg-white. rounded border border-dashed border-gray-200">
                <p className="block text-[10px] font-mono font-black text-red-650 uppercase mb-1.5">📸 Upload ad Banner straight from Phone</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleDevicePhotoUpload(e, 'ad')}
                  id="phone-ad-image"
                  className="hidden"
                />
                <label 
                  htmlFor="phone-ad-image"
                  className="w-full py-2 bg-neutral-900 hover:bg-black text-white text-[10px] font-sans font-black uppercase text-center rounded cursor-pointer transition shadow flex items-center justify-center gap-1"
                >
                  <span>Select Image from Device</span>
                </label>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-black text-neutral-500 uppercase mb-1">Or Paste Image Web URL</label>
                <input
                  type="text"
                  value={adImageUrl.startsWith('data:') ? 'Custom Phone Compressed base64 string' : adImageUrl}
                  onChange={(e) => setAdImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <button
                type="submit"
                disabled={isPublishingAd}
                className="w-full bg-red-600 hover:bg-red-750 text-white font-sans font-bold text-xs py-2.5 rounded transition shadow uppercase tracking-wide cursor-pointer flex justify-center items-center gap-1.5"
              >
                <Megaphone className="w-4 h-4 shadow-sm" />
                <span>Publish Sponsor Ad spot</span>
              </button>
            </form>

            <div className="lg:col-span-7 p-5 border border-gray-200 rounded-xl space-y-4">
              <h3 className="text-xs font-mono font-black text-neutral-900 uppercase">Live Published Sponsorship Ad channels ({adsList.length})</h3>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {adsList.length === 0 ? (
                  <p className="text-xs text-neutral-450 py-6 text-center">No custom advertisements published. Falls back to core default sponsors.</p>
                ) : (
                  adsList.map(ad => (
                    <div key={ad.id} className="p-3 bg-white border border-gray-200 rounded-xl flex items-start gap-3 shadow-inner">
                      {ad.imageUrl && (
                        <img 
                          src={ad.imageUrl} 
                          className="w-16 h-12 object-cover rounded border" 
                          alt="Ad"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="flex-1 min-w-0 text-xs">
                        <div className="flex justify-between items-start">
                          <span className="font-mono font-extrabold text-red-600 uppercase text-[9px] bg-red-50 px-1 rounded">{ad.sponsor}</span>
                          <button 
                            onClick={() => handleAdDelete(ad.id)}
                            className="p-1 hover:bg-red-50 text-red-500 rounded transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <h4 className="font-sans font-bold text-neutral-850 mt-1 leading-snug">{ad.title}</h4>
                        <p className="text-[10px] text-neutral-400 mt-0.5 line-clamp-1">{ad.description}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
