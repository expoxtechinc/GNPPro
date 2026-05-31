import React, { useState, useEffect } from 'react';
import { Article } from '../types';
import { 
  collection, addDoc, doc, deleteDoc, getDocs, query, orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  Plus, Trash2, LineChart, Layers, Eye, ThumbsUp, FileText, 
  LogOut, Image as ImageIcon, Video, Code, CheckCircle2, Shield,
  ArrowRight
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
  const [activeTab, setActiveTab] = useState<'publish' | 'manage' | 'analytics'>('publish');
  
  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [category, setCategory] = useState('Politics');
  const [imageUrl, setImageUrl] = useState(IMAGE_PRESETS[0].url);
  const [videoUrl, setVideoUrl] = useState('');
  const [embedCode, setEmbedCode] = useState('');
  const [isAlert, setIsAlert] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Analytics helper states
  const [stats, setStats] = useState({
    totalArticles: 0,
    totalViews: 0,
    totalLikes: 0,
  });

  useEffect(() => {
    // Calculcate total statistics
    const totalViews = articles.reduce((sum, art) => sum + (art.viewsCount || 0), 0);
    const totalLikes = articles.reduce((sum, art) => sum + (art.likesCount || 0), 0);
    setStats({
      totalArticles: articles.length,
      totalViews,
      totalLikes,
    });
  }, [articles]);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert("Title and content are required.");
      return;
    }

    setIsPublishing(true);
    setSuccessMessage('');

    const timestampNow = Timestamp.now();
    const articleId = title.trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `news-${Date.now()}`;

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
      // Add doc directly to the articles collection using title-based ID to keep it structured and clean
      const articlesCollectionRef = collection(db, 'articles');
      await addDoc(articlesCollectionRef, newArticle);
      
      setSuccessMessage('Article published successfully close to real-time! It is now live.');
      
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
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `articles/${articleId}`);
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
            <Shield className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-sans font-black text-neutral-900 flex items-center gap-2">
              Global News Editor Hub
              <span className="text-xs font-mono bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">Admin Privileges</span>
            </h2>
            <p className="text-xs font-mono text-neutral-500">Logged in as {auth.currentUser?.email}</p>
          </div>
        </div>

        <button
          onClick={onSignOut}
          className="flex items-center space-x-1.5 px-4 py-2 hover:bg-neutral-100 border border-gray-205 text-neutral-600 rounded-lg text-sm font-sans font-medium transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Exit Hub</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-gray-100 pb-2 mb-6">
        <button
          onClick={() => setActiveTab('publish')}
          className={`px-4 py-2 text-xs font-mono font-black uppercase rounded-lg transition-all flex items-center ${
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
          className={`px-4 py-2 text-xs font-mono font-black uppercase rounded-lg transition-all flex items-center ${
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
          className={`px-4 py-2 text-xs font-mono font-black uppercase rounded-lg transition-all flex items-center ${
            activeTab === 'analytics'
              ? 'bg-neutral-900 text-white'
              : 'hover:bg-neutral-100 text-neutral-500'
          }`}
        >
          <LineChart className="w-3.5 h-3.5 mr-1" />
          Realtime Analytics
        </button>
      </div>

      {/* SUCCESS BANNER */}
      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <p className="text-sm font-sans font-medium">{successMessage}</p>
        </div>
      )}

      {/* TAB 1: PUBLISH */}
      {activeTab === 'publish' && (
        <form onSubmit={handlePublish} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 space-y-5">
              {/* Title input */}
              <div>
                <label className="block text-xs font-mono font-black uppercase text-neutral-505 mb-2">Headline Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Global Economic Alliance Announces Core Trade Policy Overhaul"
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-neutral-800 placeholder-neutral-450 focus:outline-none focus:ring-2 focus:ring-red-500 text-base font-sans font-extrabold"
                />
              </div>

              {/* Content input */}
              <div>
                <label className="block text-xs font-mono font-black uppercase text-neutral-505 mb-2">Article Body (Markdown Supported)</label>
                <textarea
                  required
                  rows={14}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Draft your immersive article here. Use blank lines for paragraphs."
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-neutral-800 placeholder-neutral-450 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-sans leading-relaxed"
                />
              </div>
            </div>

            <div className="md:col-span-4 space-y-5">
              {/* Category selector */}
              <div>
                <label className="block text-xs font-mono font-black uppercase text-neutral-505 mb-2">News Desk / Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-neutral-800 font-sans font-bold text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Alert Switch */}
              <div className="flex items-center justify-between border border-dashed border-gray-200 p-4 rounded-lg bg-red-50/10">
                <div>
                  <h4 className="text-xs font-sans font-black text-neutral-800">Push Breaking Alert?</h4>
                  <p className="text-[10px] text-neutral-505">Flags article on readers' personalization tickers.</p>
                </div>
                <input
                  type="checkbox"
                  checked={isAlert}
                  onChange={(e) => setIsAlert(e.target.checked)}
                  className="w-5 h-5 border-gray-300 rounded text-red-600 focus:ring-red-500"
                />
              </div>

              {/* Summarized Preview */}
              <div>
                <label className="block text-xs font-mono font-black uppercase text-neutral-505 mb-2">Short Summary Bullet (Highlight)</label>
                <textarea
                  rows={3}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Quick summary bullet point..."
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-neutral-700 placeholder-neutral-450 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Media input sections */}
              <div className="p-4 bg-neutral-50 border border-gray-200 rounded-lg space-y-4">
                <h4 className="text-xs font-mono font-black uppercase text-neutral-600 flex items-center gap-1.5 border-b border-gray-200 pb-2">
                  <ImageIcon className="w-3.5 h-3.5 text-neutral-500" /> Image Cover Setting
                </h4>

                <div>
                  <label className="block text-[10px] font-mono font-black text-neutral-550 uppercase mb-1">Image URL</label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-neutral-800 focus:ring-1 focus:ring-red-500 focus:outline-none"
                  />
                </div>

                {/* Preset Picker */}
                <div>
                  <p className="block text-[10px] font-mono font-black text-neutral-505 uppercase mb-1.5">Preset High-Res Images</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {IMAGE_PRESETS.map((p, i) => (
                      <button
                        type="button"
                        key={i}
                        onClick={() => setImageUrl(p.url)}
                        className={`text-[10px] font-sans font-medium text-left truncate p-1.5 border rounded ${
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
                  <label className="block text-[10px] font-mono font-black text-neutral-505 uppercase mb-1">YouTube Video Link</label>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-black text-neutral-505 uppercase mb-1">IFrame Embed Code</label>
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
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-8 py-3 rounded-lg font-sans font-extrabold text-sm flex items-center gap-2 transition-all cursor-pointer shadow-md"
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
                    className="p-2 border border-red-100 hover:bg-red-50 text-red-650 rounded-lg self-end sm:self-auto transition"
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
                  <p className="text-neutral-505 text-xs text-center">No trending stories available.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
