import React, { useState, useEffect } from 'react';
import { Article, Advertisement } from '../types';
import { 
  collection, addDoc, doc, deleteDoc, Timestamp, onSnapshot, setDoc
} from 'firebase/firestore';
import { db, auth, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  Plus, Trash2, LineChart, Layers, Eye, ThumbsUp, FileText, 
  LogOut, Image as ImageIcon, Video, CheckCircle2, Shield,
  ArrowRight, MessageCircle, Megaphone, ExternalLink, Sparkles,
  Paperclip, Upload, X, FileSpreadsheet, Tv, Radio
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
  'Politics', 'Economy', 'Technology', 'Science', 'Sports', 'Health', 'Culture', 'Scholarships', 'Products', 'Promotions', 'WAEC Liberia 🇱🇷'
];

interface AdminDashboardProps {
  articles: Article[];
  onRefreshArticles: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

export default function AdminDashboard({ articles, onRefreshArticles, onSignOut }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'publish' | 'manage' | 'analytics' | 'whatsapp' | 'livestream' | 'advertisements' | 'ai-publish'>('publish');

  const currentEmail = auth.currentUser?.email;
  // aki.sokpah.link@gmail.com is strictly the SOLE verified administrator (with luckyglobalnews@gmail.com for workspace dev)
  const isSuperAdmin = currentEmail === 'aki.sokpah.link@gmail.com' || currentEmail === 'luckyglobalnews@gmail.com';

  // State lists for WhatsApp
  const [whatsappList, setWhatsappList] = useState<any[]>([]);

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

  // Scholarships special states
  const [scholarshipSponsor, setScholarshipSponsor] = useState('');
  const [scholarshipAmount, setScholarshipAmount] = useState('');
  const [scholarshipEligibility, setScholarshipEligibility] = useState('');
  const [scholarshipDeadline, setScholarshipDeadline] = useState('');
  const [scholarshipLink, setScholarshipLink] = useState('');

  // Products special states
  const [productPrice, setProductPrice] = useState('');
  const [productSeller, setProductSeller] = useState('');
  const [productLocation, setProductLocation] = useState('');
  const [productContact, setProductContact] = useState('');
  const [productBuyLink, setProductBuyLink] = useState('');

  // Promotions special states
  const [promoArtistName, setPromoArtistName] = useState('');
  const [promoReleaseTitle, setPromoReleaseTitle] = useState('');
  const [promoMusicUrl, setPromoMusicUrl] = useState('');
  const [promoVideoUrl, setPromoVideoUrl] = useState('');
  const [promoDirectEmbed, setPromoDirectEmbed] = useState('');
  const [promoBookingInfo, setPromoBookingInfo] = useState('');

  // WAEC Special states
  const [waecPin, setWaecPin] = useState('');
  
  // Custom attachments additions (Publishing Notes, documents, additional picture streams)
  const [publishingNote, setPublishingNote] = useState('');
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [documents, setDocuments] = useState<Array<{ name: string; url: string; type: string; size?: string }>>([]);
  
  // Form states for WhatsApp Groups
  const [wpTitle, setWpTitle] = useState('');
  const [wpDescription, setWpDescription] = useState('');
  const [wpUrl, setWpUrl] = useState('');
  const [isPublishingWp, setIsPublishingWp] = useState(false);

  // 24/7 Live Stream States (Support Multiple Streams)
  const [selectedLiveStreamId, setSelectedLiveStreamId] = useState<string | null>(null);
  const [liveStreamEnabled, setLiveStreamEnabled] = useState(true);
  const [liveStreamTitle, setLiveStreamTitle] = useState('🔴 24/7 Global News Live Broadcast');
  const [liveStreamSource, setLiveStreamSource] = useState<'youtube' | 'twitch' | 'facebook' | 'custom_embed' | 'm3u8'>('youtube');
  const [liveStreamUrl, setLiveStreamUrl] = useState('');
  const [liveStreamCode, setLiveStreamCode] = useState('');
  const [liveStreamIsAlert, setLiveStreamIsAlert] = useState(false);
  const [liveStreamIsUpdate, setLiveStreamIsUpdate] = useState(false);
  const [isSavingLiveStream, setIsSavingLiveStream] = useState(false);

  // Advertisements management States
  const [adsList, setAdsList] = useState<Advertisement[]>([]);
  const [editingAdId, setEditingAdId] = useState<string | null>(null);
  const [adTitle, setAdTitle] = useState('');
  const [adImageUrl, setAdImageUrl] = useState('');
  const [adRedirectUrl, setAdRedirectUrl] = useState('');
  const [adPlacement, setAdPlacement] = useState<'header_banner' | 'sidebar' | 'in_feed'>('sidebar');
  const [adActive, setAdActive] = useState(true);
  const [isSavingAd, setIsSavingAd] = useState(false);

  // AI 24/7 Auto-Publisher states
  const [isAiPublisherActive, setIsAiPublisherActive] = useState(true);
  const [isMoviePublisherActive, setIsMoviePublisherActive] = useState(true);
  const [aiIntervalSpeed, setAiIntervalSpeed] = useState<number>(60000); // default 60 seconds
  const [aiSelectedCategories, setAiSelectedCategories] = useState<string[]>(['Politics', 'Economy', 'Technology', 'Science', 'WAEC Liberia 🇱🇷']);
  const [aiLogs, setAiLogs] = useState<Array<{ timestamp: string; message: string; type: 'info' | 'success' | 'warn' | 'error' }>>([]);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);

  // Poll server AI background daemon status
  useEffect(() => {
    if (activeTab !== 'ai-publish') return;

    const fetchDaemonStatus = async () => {
      try {
        const res = await fetch('/api/ai-publish/status');
        if (res.ok) {
          const data = await res.json();
          setIsAiPublisherActive(data.isRunning);
          setAiIntervalSpeed(data.intervalSpeed);
          setGeneratedCount(data.totalGenerated);
          setAiLogs(data.logs);
          setIsMoviePublisherActive(data.isMovieRunning !== false);
        }
      } catch (err) {
        console.warn("Error polling server status: ", err);
      }
    };

    fetchDaemonStatus();
    const intervalId = setInterval(fetchDaemonStatus, 3000);

    return () => clearInterval(intervalId);
  }, [activeTab]);

  const handleToggleServerDaemon = async () => {
    try {
      const res = await fetch('/api/ai-publish/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle' })
      });
      if (res.ok) {
        const data = await res.json();
        setIsAiPublisherActive(data.isRunning);
        setAiLogs(data.logs);
      }
    } catch (err) {
      console.error("Error setting toggle state: ", err);
    }
  };

  const handleUpdateServerIntervalSpeed = async (speed: number) => {
    try {
      const res = await fetch('/api/ai-publish/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speed })
      });
      if (res.ok) {
        const data = await res.json();
        setAiIntervalSpeed(data.intervalSpeed);
        setAiLogs(data.logs);
      }
    } catch (err) {
      console.error("Error setting frequency speed: ", err);
    }
  };

  const executeAiAutoPublishTick = async () => {
    if (isAiGenerating) return;
    setIsAiGenerating(true);
    try {
      const res = await fetch('/api/ai-publish/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'force' })
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedCount(data.totalGenerated);
        setAiLogs(data.logs);
      }
    } catch (error: any) {
      console.error("Error manual force publication: ", error);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handlePurgeAllNews = async () => {
    const doubleCheck = window.confirm("ARE YOU ABSOLUTELY SURE? This will permanently delete ALL articles in the database for a clean, live, high-stack reboot!");
    if (!doubleCheck) return;
    try {
      const res = await fetch('/api/ai-publish/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear-all' })
      });
      if (res.ok) {
        window.alert("Success! All articles purged. A new investigative global news thread will automatically begin formulating shortly.");
      }
    } catch (err: any) {
      console.error("Purge error: ", err);
      window.alert("Error during purge: " + err.message);
    }
  };

  const handleToggleMovieDaemon = async () => {
    try {
      const res = await fetch('/api/ai-publish/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieAction: 'toggleMovie' })
      });
      if (res.ok) {
        const data = await res.json();
        setIsMoviePublisherActive(data.isMovieRunning !== false);
        setAiLogs(data.logs);
      }
    } catch (err) {
      console.error("Error setting toggle state for movie daemon: ", err);
    }
  };

  const forceMoviePublishTick = async () => {
    try {
      const res = await fetch('/api/ai-publish/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieAction: 'forceMovie' })
      });
      if (res.ok) {
        const data = await res.json();
        setAiLogs(data.logs);
      }
    } catch (err) {
      console.error("Error manual force movies: ", err);
    }
  };

  // Load Advertisements in real-time
  useEffect(() => {
    const unsubAds = onSnapshot(collection(db, 'advertisements'), (snapshot) => {
      const list: Advertisement[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Advertisement);
      });
      setAdsList(list);
    }, (err) => {
      console.warn("Error streaming advertisements collection: ", err);
    });

    return () => unsubAds();
  }, []);

  // Filter out live stream documents from our loaded articles list
  const liveStreamsList = articles.filter(a => a.isLiveStream247 || a.id === 'live_stream_24_7');

  // Trigger populating live stream values when selecting an existing stream
  const handleSelectLiveStream = (stream: Article | null) => {
    if (stream) {
      setSelectedLiveStreamId(stream.id);
      setLiveStreamEnabled(stream.liveEmbedEnabled !== false);
      setLiveStreamTitle(stream.liveEmbedTitle || stream.title);
      setLiveStreamSource(stream.liveEmbedSource || 'youtube');
      setLiveStreamUrl(stream.liveEmbedUrl || '');
      setLiveStreamCode(stream.liveEmbedCode || '');
      setLiveStreamIsAlert(!!stream.liveIsAlert || !!stream.isAlert);
      setLiveStreamIsUpdate(!!stream.liveIsUpdate);
    } else {
      // Clear fields for a brand new Live Stream
      setSelectedLiveStreamId(null);
      setLiveStreamEnabled(true);
      setLiveStreamTitle('🔴 GNTV Live - Channel ' + (liveStreamsList.length + 1));
      setLiveStreamSource('youtube');
      setLiveStreamUrl('');
      setLiveStreamCode('');
      setLiveStreamIsAlert(false);
      setLiveStreamIsUpdate(false);
    }
  };

  // Auto populate first stream or clear on mount if none exists
  useEffect(() => {
    if (liveStreamsList.length > 0 && !selectedLiveStreamId) {
      handleSelectLiveStream(liveStreamsList[0]);
    }
  }, [articles]);
  
  // Floating messages
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Analytics helper states
  const [stats, setStats] = useState({
    totalArticles: 0,
    totalViews: 0,
    totalLikes: 0,
  });

  // Load WhatsApp in Admin Dashboard
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

    return () => {
      unsubWp();
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
  const handleDevicePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          
          canvas.toBlob(async (blob) => {
            if (blob) {
              try {
                showFloatingMsg('Uploading banner image to Firebase Storage...', '');
                const fileRef = ref(storage, `banners/${Date.now()}_banner.jpg`);
                const snapshot = await uploadBytes(fileRef, blob);
                const downloadUrl = await getDownloadURL(snapshot.ref);
                setImageUrl(downloadUrl);
                showFloatingMsg('Banner uploaded to Firebase Storage successfully! Ready to publish.', '');
              } catch (err: any) {
                console.error("Storage upload failed", err);
                showFloatingMsg('', `Warning: Firebase Storage upload failed (${err.message}). Using local base64 preview fallback.`);
                setImageUrl(compressedBase64);
              }
            } else {
              setImageUrl(compressedBase64);
              showFloatingMsg('Photo uploaded from device successfully! Ready to publish.', '');
            }
          }, 'image/jpeg', 0.7);
        }
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  // Helper function to read and convert raw device video file in real time
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [isLargeVideoWarning, setIsLargeVideoWarning] = useState(false);

  const handleDeviceVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // A 1MB limit check for Firestore base64 compatibility
    const maxBase64Bytes = 1.2 * 1024 * 1024; // ~1.2MB limit for direct Firestore upload
    
    if (file.size > maxBase64Bytes) {
      // For large streams/broadcasts (up to 6 hours), Base64 string will crash the memory & exceed Firestore 1MB limits.
      // So we use a high-performance Blob URL for immediate native preview without any memory duplication!
      try {
        const objectUrl = URL.createObjectURL(file);
        setVideoUrl(objectUrl);
        setIsLargeVideoWarning(true);
        showFloatingMsg('Successfully loaded large broadcast media! Ready to preview.', '');
      } catch (err) {
        alert("Failed to initialize stream pointer for large video.");
      }
      return;
    }

    setIsLargeVideoWarning(false);
    setIsVideoUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setVideoUrl(event.target.result as string);
        showFloatingMsg('Video file successfully loaded from your device! Ready to publish.');
      } else {
        alert("Failed to read video file content.");
      }
      setIsVideoUploading(false);
    };
    reader.onerror = () => {
      alert("Error reading video file.");
      setIsVideoUploading(false);
    };
    reader.readAsDataURL(file);
  };

  // Compress and attach additional gallery pictures
  const handleAdditionalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: any) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
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
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.65);

            canvas.toBlob(async (blob) => {
              if (blob) {
                try {
                  showFloatingMsg('Uploading picture to Firebase Storage...', '');
                  const fileRef = ref(storage, `gallery/${Date.now()}_img.jpg`);
                  const snapshot = await uploadBytes(fileRef, blob);
                  const downloadUrl = await getDownloadURL(snapshot.ref);
                  setAdditionalImages(prev => [...prev, downloadUrl]);
                  showFloatingMsg('Picture uploaded to Firebase Storage successfully!', '');
                } catch (err: any) {
                  console.error("Storage upload failed", err);
                  showFloatingMsg('', `Warning: Firebase Storage upload failed (${err.message}). Using local base64 preview fallback.`);
                  setAdditionalImages(prev => [...prev, compressedBase64]);
                }
              } else {
                setAdditionalImages(prev => [...prev, compressedBase64]);
                showFloatingMsg('Picture attached successfully!', '');
              }
            }, 'image/jpeg', 0.65);
          }
        };
        if (event.target?.result) {
          img.src = event.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Convert and attach business files (PDF, DOCX, DOC, XLSX, etc.) and upload to Firebase Storage
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    showFloatingMsg('Uploading document(s) to Firebase Storage...', '');
    const fileList = Array.from(files) as File[];
    for (const file of fileList) {
      try {
        const fileRef = ref(storage, `documents/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(fileRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        
        const sizeStr = file.size > 1024 * 1024 
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
          : `${Math.round(file.size / 1024)} KB`;
          
        const docType = file.name.split('.').pop()?.toUpperCase() || 'DOC';
        
        setDocuments(prev => [...prev, {
          name: file.name,
          url: downloadUrl,
          type: docType,
          size: sizeStr
        }]);
        showFloatingMsg(`Successfully uploaded ${file.name} to Firebase Storage!`, '');
      } catch (err: any) {
        console.error("Document upload failed", err);
        showFloatingMsg('', `Error uploading document: ${err.message}. Please try again.`);
      }
    }
  };

  const addDocumentByUrl = (name: string, url: string) => {
    if (!name || !url) return;
    const docType = url.split('.').pop()?.split(/[?#]/)[0]?.toUpperCase() || 'LINK';
    setDocuments(prev => [...prev, {
      name,
      url,
      type: docType,
      size: 'Remote Link'
    }]);
    showFloatingMsg('External document linked successfully!', '');
  };

  const addAdditionalImageByUrl = (url: string) => {
    if (!url) return;
    setAdditionalImages(prev => [...prev, url]);
    showFloatingMsg('External picture URL linked successfully!', '');
  };

  // News publishing
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert("Title and content are required.");
      return;
    }

    if (category === 'WAEC Liberia 🇱🇷') {
      if (!waecPin.trim()) {
        alert("A Secure PIN code is strictly required to lock all WAEC Liberia materials. Please configure a viewing passcode.");
        return;
      }
    }

    setIsPublishing(true);

    const timestampNow = Timestamp.now();
    
    // Ensure manual publishes get completely unique, beautiful cover images if they are generic or empty!
    let finalImageUrl = imageUrl.trim();
    if (!finalImageUrl || (finalImageUrl.includes("images.unsplash.com") && !finalImageUrl.includes("sig="))) {
      const sig = Math.floor(Math.random() * 100000);
      const queryWords = title.trim().split(/\s+/).map(w => w.replace(/[^a-zA-Z]/g, "")).filter(w => w.length > 3).slice(0, 3).join(",");
      finalImageUrl = `https://images.unsplash.com/featured/?${encodeURIComponent(category.toLowerCase() + "," + queryWords)}&sig=${sig}`;
    }

    const newArticle: any = {
      title: title.trim(),
      content: content.trim(),
      summary: summary.trim(),
      category,
      imageUrl: finalImageUrl,
      videoUrl: videoUrl.trim() || null,
      embedCode: embedCode.trim() || null,
      publishedAt: timestampNow,
      authorId: auth.currentUser?.uid || 'admin',
      authorName: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Senior Editor',
      viewsCount: 0,
      likesCount: 0,
      isAlert,
      publishingNote: publishingNote.trim() || null,
      documents: documents.length > 0 ? documents : null,
      additionalImages: additionalImages.length > 0 ? additionalImages : null
    };

    if (category === 'Scholarships') {
      newArticle.scholarshipSponsor = scholarshipSponsor.trim() || null;
      newArticle.scholarshipAmount = scholarshipAmount.trim() || null;
      newArticle.scholarshipEligibility = scholarshipEligibility.trim() || null;
      newArticle.scholarshipDeadline = scholarshipDeadline.trim() || null;
      newArticle.scholarshipLink = scholarshipLink.trim() || null;
    } else if (category === 'Products') {
      newArticle.productPrice = productPrice.trim() || null;
      newArticle.productSeller = productSeller.trim() || null;
      newArticle.productLocation = productLocation.trim() || null;
      newArticle.productContact = productContact.trim() || null;
      newArticle.productBuyLink = productBuyLink.trim() || null;
    } else if (category === 'Promotions') {
      newArticle.promoArtistName = promoArtistName.trim() || null;
      newArticle.promoReleaseTitle = promoReleaseTitle.trim() || null;
      newArticle.promoMusicUrl = promoMusicUrl.trim() || null;
      newArticle.promoVideoUrl = promoVideoUrl.trim() || null;
      newArticle.promoDirectEmbed = promoDirectEmbed.trim() || null;
      newArticle.promoBookingInfo = promoBookingInfo.trim() || null;
    } else if (category === 'WAEC Liberia 🇱🇷') {
      newArticle.waecPin = waecPin.trim() || null;
    }

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
      setPublishingNote('');
      setAdditionalImages([]);
      setDocuments([]);

      setScholarshipSponsor('');
      setScholarshipAmount('');
      setScholarshipEligibility('');
      setScholarshipDeadline('');
      setScholarshipLink('');

      setProductPrice('');
      setProductSeller('');
      setProductLocation('');
      setProductContact('');
      setProductBuyLink('');

      setPromoArtistName('');
      setPromoReleaseTitle('');
      setPromoMusicUrl('');
      setPromoVideoUrl('');
      setPromoDirectEmbed('');
      setPromoBookingInfo('');

      setWaecPin('');

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

  // Save 24/7 Live Stream Settings to Firestore (Multi stream Support)
  const handleSaveLiveStream = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingLiveStream(true);
    try {
      const targetId = selectedLiveStreamId || ('live_stream_' + Date.now());
      await setDoc(doc(db, 'articles', targetId), {
        title: liveStreamTitle.trim(),
        content: `Live Broadcast settings. Source: ${liveStreamSource}. URL: ${liveStreamUrl}.`,
        summary: 'System metadata for 24/7 live stream player.',
        category: 'System',
        imageUrl: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=800',
        publishedAt: Timestamp.now(),
        authorId: auth.currentUser?.uid || 'unknown_admin',
        authorName: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Senior Editor',
        viewsCount: 0,
        likesCount: 0,
        isAlert: liveStreamIsAlert,

        // Custom live stream settings
        isLiveStream247: true,
        liveEmbedEnabled: liveStreamEnabled,
        liveEmbedTitle: liveStreamTitle.trim(),
        liveEmbedSource: liveStreamSource,
        liveEmbedUrl: liveStreamUrl.trim(),
        liveEmbedCode: liveStreamCode.trim(),
        liveIsAlert: liveStreamIsAlert,
        liveIsUpdate: liveStreamIsUpdate,
      });

      showFloatingMsg(`Live Stream dynamic feed "${liveStreamTitle}" has been deployed successfully to standard cloud database! Loaded in real-time by all page readers.`);
      await onRefreshArticles();
      setSelectedLiveStreamId(targetId);
    } catch (err: any) {
      alert("Error saving live stream configuration: " + err.message);
    } finally {
      setIsSavingLiveStream(false);
    }
  };

  const handleDeleteLiveStream = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this live stream? Active viewers will lose access.")) return;
    try {
      await deleteDoc(doc(db, 'articles', id));
      showFloatingMsg("Live Stream Broadcast successfully removed from server.");
      await onRefreshArticles();
      setSelectedLiveStreamId(null);
    } catch (err: any) {
      alert("Error deleting stream: " + err.message);
    }
  };

  // Save Advertisement to Firestore (Header, Sidebar, In-feed campaign Support)
  const handleSaveAd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAd(true);
    try {
      const isNew = !editingAdId;
      const adId = editingAdId || ('ad_' + Date.now());
      
      const payload: any = {
        title: adTitle.trim(),
        imageUrl: adImageUrl.trim(),
        redirectUrl: adRedirectUrl.trim(),
        placement: adPlacement,
        active: adActive,
        publishedAt: Timestamp.now()
      };

      if (isNew) {
        payload.viewsCount = 0;
        payload.clicksCount = 0;
      }

      await setDoc(doc(db, 'advertisements', adId), payload, { merge: true });
      showFloatingMsg(`Advertisement Campaign "${adTitle}" saved successfully. Status is auto-synced live.`);
      
      // Reset advertisement form
      setEditingAdId(null);
      setAdTitle('');
      setAdImageUrl('');
      setAdRedirectUrl('');
      setAdPlacement('sidebar');
      setAdActive(true);
    } catch (err: any) {
      alert("Error saving advertisement details: " + err.message);
    } finally {
      setIsSavingAd(false);
    }
  };

  const handleDeleteAd = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this advertisement? Campaigns cannot be recovered.")) return;
    try {
      await deleteDoc(doc(db, 'advertisements', id));
      showFloatingMsg("Advertisement campaign deleted permanently.");
    } catch (err: any) {
      alert("Error deleting ad: " + err.message);
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

  const renderPublishForm = () => {
    if (category === 'WAEC Liberia 🇱🇷') {
      return (
        <div className="space-y-6">
          {/* Category Desk Selector at the top of the WAEC portal */}
          <div className="bg-neutral-50 border border-gray-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left shadow-sm">
            <div>
              <h3 className="font-sans font-black uppercase text-xs text-neutral-800 tracking-wider">Publication Desk</h3>
              <p className="text-[10px] font-mono text-neutral-400 uppercase">Current Panel: WAEC Liberia Archive Uploads</p>
            </div>
            <div className="w-full sm:w-64">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-neutral-900 font-sans font-bold text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Mandatory PIN and Info banner */}
          <div className="bg-gradient-to-r from-blue-900 via-blue-950 to-neutral-900 border border-blue-800/60 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 text-left shadow-lg text-white">
            <div className="space-y-1">
              <h3 className="text-sm font-sans font-black uppercase text-blue-400 flex items-center gap-1.5">
                🔑 Mandatory Security PIN Lock Protocol
              </h3>
              <p className="text-[11px] text-neutral-300 leading-relaxed font-semibold">
                All images, documents, past papers, and text uploaded under WAEC Liberia are locked inside a secure vault. Readers must provide this PIN code before viewing anything.
              </p>
            </div>
            <div className="w-full md:w-auto shrink-0 bg-white/5 border border-white/10 p-3.5 rounded-xl">
              <label className="block text-[9px] font-mono font-black uppercase text-blue-300 mb-1">Set Secure Viewing PIN Code *</label>
              <input
                type="text"
                required
                value={waecPin}
                onChange={(e) => setWaecPin(e.target.value)}
                placeholder="e.g. 2026 or LIB99"
                className="bg-neutral-950 border border-blue-500 rounded-lg px-3 py-2 font-mono text-center tracking-widest text-xs font-black text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm placeholder-blue-700 w-full md:w-44"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left side: Upload files */}
            <div className="md:col-span-6 space-y-5">
              {/* Upload Associated Documents (Exam PDFs, solutions) */}
              <div className="p-5 bg-neutral-50 border border-gray-200 rounded-xl space-y-4 text-left shadow-sm">
                <h4 className="text-xs font-mono font-black uppercase text-neutral-600 flex items-center gap-1.5 border-b border-gray-150 pb-2">
                  <Paperclip className="w-4 h-4 text-neutral-500" /> Attached Documents & Exam Past Papers (PDF, etc.)
                </h4>

                <div className="grid grid-cols-1 gap-3">
                  <div className="p-3 bg-white rounded border border-dashed border-gray-200 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-mono font-black text-neutral-500 uppercase mb-0.5">Device Documents</p>
                      <p className="text-[9px] text-neutral-450 mb-3">Upload PDF, Word, or Spreadsheet files straight to the locked database.</p>
                    </div>
                    <input
                      type="file"
                      id="waec-doc-upload"
                      multiple
                      accept=".pdf,.docx,.doc,.xls,.xlsx,.txt"
                      onChange={handleDocumentUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="waec-doc-upload"
                      className="py-2 bg-neutral-950 hover:bg-black text-white text-[10px] font-sans font-black uppercase text-center rounded-lg cursor-pointer transition shadow flex items-center justify-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose Document Files</span>
                    </label>
                  </div>

                  <div className="p-3 bg-white rounded border border-dashed border-gray-200 space-y-2 text-left">
                    <p className="text-[10px] font-mono font-black text-neutral-500 uppercase">Or Add External PDF/Doc URL</p>
                    <input
                      type="text"
                      id="waec-remote-doc-name"
                      placeholder="Document Label (e.g., Mathematics Solutions PDF)"
                      className="w-full bg-white border border-gray-200 rounded p-1.5 text-[10px] text-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <div className="flex gap-1.5 mt-1.5">
                      <input
                        type="url"
                        id="waec-remote-doc-url"
                        placeholder="https://example.com/file.pdf"
                        className="flex-1 bg-white border border-gray-200 rounded p-1.5 text-[10px] text-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const nameEl = document.getElementById('waec-remote-doc-name') as HTMLInputElement;
                          const urlEl = document.getElementById('waec-remote-doc-url') as HTMLInputElement;
                          if (nameEl && urlEl && nameEl.value && urlEl.value) {
                            addDocumentByUrl(nameEl.value.trim(), urlEl.value.trim());
                            nameEl.value = '';
                            urlEl.value = '';
                          } else {
                            alert("Please provide both a label and a valid URL link.");
                          }
                        }}
                        className="px-3 bg-neutral-900 hover:bg-black text-white rounded text-[10px] font-black uppercase transition shrink-0 cursor-pointer text-center"
                      >
                        Add file
                      </button>
                    </div>
                  </div>
                </div>

                {documents.length > 0 && (
                  <div className="space-y-2 text-left">
                    <p className="text-[9px] font-mono font-black uppercase text-neutral-400">Locked Documents uploaded ({documents.length}):</p>
                    <div className="space-y-1.5">
                      {documents.map((doc, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 pl-3 bg-white border border-gray-200 rounded text-xs select-none">
                          <div className="flex items-center gap-2 truncate text-left">
                            <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="font-extrabold text-neutral-800 truncate">{doc.name}</span>
                            <span className="text-[9px] font-mono bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-400">{doc.type} • {doc.size}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDocuments(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 hover:bg-red-50 text-neutral-400 hover:text-red-650 rounded transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Images / Pictures (for exam previews) */}
              <div className="p-5 bg-neutral-50 border border-gray-200 rounded-xl space-y-4 text-left shadow-sm">
                <h4 className="text-xs font-mono font-black uppercase text-neutral-600 flex items-center gap-1.5 border-b border-gray-150 pb-2">
                  <ImageIcon className="w-4 h-4 text-neutral-500" /> Attached Photo Sheets & Images
                </h4>

                {/* Main artwork */}
                <div>
                  <p className="block text-[10px] font-mono font-black text-blue-800 uppercase mb-2">📸 Main Exam Preview Cover Picture</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleDevicePhotoUpload}
                    id="waec-lead-photo"
                    className="hidden"
                  />
                  <label 
                    htmlFor="waec-lead-photo"
                    className="w-full py-2 px-3 bg-neutral-900 hover:bg-black text-white text-[10px] font-sans font-black uppercase tracking-wide rounded-lg cursor-pointer transition shadow flex items-center justify-center gap-1.5"
                  >
                    <span>Choose Cover Picture</span>
                  </label>
                  {imageUrl && (
                    <div className="mt-2 relative aspect-video rounded-lg border border-gray-300 overflow-hidden bg-neutral-950">
                      <img src={imageUrl} alt="Core Cover" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="absolute top-1.5 right-1.5 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full shadow-md transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-gray-150"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-neutral-55 px-2 text-[9px] text-neutral-400 font-mono">OR ADD ADDITIONAL PHOTO PREVIEWS</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  <div className="p-3 bg-white rounded border border-dashed border-gray-200 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-mono font-black text-neutral-500 uppercase mb-1">Batch Upload Sheets</p>
                    </div>
                    <input
                      type="file"
                      id="waec-sheets-upload"
                      multiple
                      accept="image/*"
                      onChange={handleAdditionalImageUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="waec-sheets-upload"
                      className="py-1.5 bg-neutral-900 hover:bg-black text-white text-[10px] font-sans font-black uppercase text-center rounded-md cursor-pointer transition shadow flex items-center justify-center gap-1.5"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Select Batch Photos</span>
                    </label>
                  </div>

                  <div className="p-3 bg-white rounded border border-dashed border-gray-200 space-y-1.5">
                    <p className="text-[10px] font-mono font-black text-neutral-500 uppercase">Or Add Image URL</p>
                    <div className="flex gap-1.5">
                      <input
                        type="url"
                        id="waec-remote-img-url"
                        placeholder="https://example.com/photo.png"
                        className="flex-1 bg-white border border-gray-200 rounded p-1.5 text-[10px] text-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('waec-remote-img-url') as HTMLInputElement;
                          if (el && el.value) {
                            addAdditionalImageByUrl(el.value.trim());
                            el.value = '';
                          }
                        }}
                        className="px-2.5 bg-neutral-950 hover:bg-black text-white rounded text-[10px] font-black uppercase transition shrink-0 cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {additionalImages.length > 0 && (
                  <div className="space-y-1.5 text-left">
                    <p className="text-[9px] font-mono font-black uppercase text-neutral-400">Attached preview sheets ({additionalImages.length}):</p>
                    <div className="grid grid-cols-3 gap-2">
                      {additionalImages.map((img, idx) => (
                        <div key={idx} className="relative aspect-video rounded border border-gray-200 overflow-hidden group bg-neutral-900">
                          <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <button
                            type="button"
                            onClick={() => setAdditionalImages(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-0.5 rounded-full shadow-md transition-all cursor-pointer"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right side: Texts & Details */}
            <div className="md:col-span-6 space-y-5 text-left">
              <div className="p-5 bg-neutral-50 border border-gray-200 rounded-xl space-y-4 shadow-sm">
                <h4 className="text-xs font-mono font-black uppercase text-neutral-600 flex items-center gap-1.5 border-b border-gray-150 pb-2">
                  📝 Archive Release Metadata & Instructions
                </h4>

                <div>
                  <label className="block text-xs font-mono font-black uppercase text-neutral-550 mb-2">WAEC Archive Release Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., WAEC Liberia 2026 Core Mathematics Answer Key & Marking Scheme"
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-sans font-extrabold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-black uppercase text-neutral-550 mb-2">Instructions & Guidelines Text (Markdown Supported) *</label>
                  <textarea
                    required
                    rows={16}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Draft the core guidelines, solutions description, or detailed reference text here."
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-sans leading-relaxed text-left"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

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
              onClick={() => setActiveTab('livestream')}
              className={`px-4 py-2.5 text-xs font-mono font-black uppercase rounded-lg transition-all flex items-center cursor-pointer ${
                activeTab === 'livestream'
                  ? 'bg-red-600 text-white'
                  : 'hover:bg-red-50 text-red-700 font-black'
              }`}
            >
              <Tv className="w-3.5 h-3.5 mr-1.5" />
              24/7 Live Stream ({liveStreamsList.length})
            </button>
            <button
              onClick={() => setActiveTab('advertisements')}
              className={`px-4 py-2.5 text-xs font-mono font-black uppercase rounded-lg transition-all flex items-center cursor-pointer ${
                activeTab === 'advertisements'
                  ? 'bg-amber-600 text-white'
                  : 'hover:bg-amber-50 text-amber-700 font-black'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5 mr-1.5" />
              Advertisements ({adsList.length})
            </button>
            <button
              onClick={() => setActiveTab('ai-publish')}
              className={`px-4 py-2.5 text-xs font-mono font-black uppercase rounded-lg transition-all flex items-center cursor-pointer relative overflow-hidden ${
                activeTab === 'ai-publish'
                  ? 'bg-gradient-to-r from-indigo-700 via-purple-705 to-pink-700 text-white shadow-md'
                  : 'hover:bg-purple-50 text-purple-750 font-black border border-purple-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 animate-pulse text-indigo-500" />
              AI Newsroom {isAiPublisherActive && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />}
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
          {renderPublishForm() || (
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

              {/* Publishing Note / Correction Notes (Optional) */}
              <div className="p-4 bg-neutral-50 border border-gray-200 rounded-lg space-y-2">
                <h4 className="text-xs font-mono font-black uppercase text-neutral-600 flex items-center gap-1.5 border-b border-gray-150 pb-2">
                  <FileText className="w-3.5 h-3.5 text-neutral-500" /> Editor's Publishing Note & Update Ticker
                </h4>
                <textarea
                  rows={2}
                  value={publishingNote}
                  onChange={(e) => setPublishingNote(e.target.value)}
                  placeholder="e.g. Note: This article has been updated to include reactions from the central treasury and live budget documents."
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <p className="text-[9px] text-neutral-500 font-mono">Appended with high visibility format at the top of the article body.</p>
              </div>

              {/* Upload Associated Documents (PDF, DOCX, XLSX) */}
              <div className="p-4 bg-neutral-50 border border-gray-200 rounded-lg space-y-4">
                <h4 className="text-xs font-mono font-black uppercase text-neutral-600 flex items-center gap-1.5 border-b border-gray-150 pb-2">
                  <Paperclip className="w-3.5 h-3.5 text-neutral-500" /> Attached Documents (PDF, DOCX, Spreadsheets)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Local file uploader */}
                  <div className="p-3 bg-white rounded border border-dashed border-gray-200 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-mono font-black text-neutral-500 uppercase mb-1">Upload files from Device</p>
                      <p className="text-[9px] text-neutral-450 mb-3">Instant base64 integration for PDF, Word, Excel records.</p>
                    </div>
                    <input
                      type="file"
                      id="doc-attachment-upload"
                      multiple
                      accept=".pdf,.docx,.doc,.xls,.xlsx,.txt"
                      onChange={handleDocumentUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="doc-attachment-upload"
                      className="py-1.5 bg-neutral-900 hover:bg-black text-white text-[10px] font-sans font-black uppercase text-center rounded-md cursor-pointer transition shadow flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Select Local Documents</span>
                    </label>
                  </div>

                  {/* Remote link addition */}
                  <div className="p-3 bg-white rounded border border-dashed border-gray-200 space-y-2">
                    <p className="text-[10px] font-mono font-black text-neutral-500 uppercase">Or Add External Record URL</p>
                    <input
                      type="text"
                      id="remote-doc-name"
                      placeholder="Document Label (e.g. Budget PDF)"
                      className="w-full bg-white border border-gray-200 rounded p-1.5 text-[10px] text-neutral-800 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                    <div className="flex gap-1.5">
                      <input
                        type="url"
                        id="remote-doc-url"
                        placeholder="https://example.com/file.pdf"
                        className="flex-1 bg-white border border-gray-200 rounded p-1.5 text-[10px] text-neutral-800 focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const nameEl = document.getElementById('remote-doc-name') as HTMLInputElement;
                          const urlEl = document.getElementById('remote-doc-url') as HTMLInputElement;
                          if (nameEl && urlEl && nameEl.value && urlEl.value) {
                            addDocumentByUrl(nameEl.value.trim(), urlEl.value.trim());
                            nameEl.value = '';
                            urlEl.value = '';
                          } else {
                            alert("Please provide both a label and a valid URL link.");
                          }
                        }}
                        className="px-2.5 bg-red-650 hover:bg-red-750 text-white rounded text-[10px] font-black uppercase transition shrink-0 cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Render listed documents if any */}
                {documents.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-mono font-black uppercase text-neutral-400">Documents to be published ({documents.length}):</p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {documents.map((doc, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 pl-3 bg-white border border-gray-200 rounded text-xs select-none">
                          <div className="flex items-center gap-2 truncate">
                            {doc.type === 'XLSX' || doc.type === 'XLS' ? (
                              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <FileText className="w-3.5 h-3.5 text-red-650 shrink-0" />
                            )}
                            <span className="font-extrabold text-neutral-800 truncate" title={doc.name}>{doc.name}</span>
                            <span className="text-[9px] font-mono bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-400">{doc.type} • {doc.size}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDocuments(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 hover:bg-red-50 text-neutral-400 hover:text-red-650 rounded transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Additional Photos / Images (Slideshow / Multi-image) */}
              <div className="p-4 bg-neutral-50 border border-gray-200 rounded-lg space-y-4">
                <h4 className="text-xs font-mono font-black uppercase text-neutral-600 flex items-center gap-1.5 border-b border-gray-150 pb-2">
                  <ImageIcon className="w-3.5 h-3.5 text-neutral-500" /> Additional Pictures Gallery & Event Slideshow (Optional)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-white rounded border border-dashed border-gray-200 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-mono font-black text-neutral-500 uppercase mb-1">Choose device files</p>
                      <p className="text-[9px] text-neutral-450 mb-3">Compresses and uploads multiple photos in high fidelity.</p>
                    </div>
                    <input
                      type="file"
                      id="additional-images-upload"
                      multiple
                      accept="image/*"
                      onChange={handleAdditionalImageUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="additional-images-upload"
                      className="py-1.5 bg-neutral-900 hover:bg-black text-white text-[10px] font-sans font-black uppercase text-center rounded-md cursor-pointer transition shadow flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Select Gallery Images</span>
                    </label>
                  </div>

                  <div className="p-3 bg-white rounded border border-dashed border-gray-200 space-y-1.5">
                    <p className="text-[10px] font-mono font-black text-neutral-500 uppercase mb-1">Or Add Remote Image URL</p>
                    <div className="flex gap-1.5">
                      <input
                        type="url"
                        id="remote-img-url"
                        placeholder="https://example.com/photo.jpg"
                        className="flex-1 bg-white border border-gray-200 rounded p-1.5 text-[10px] text-neutral-800 focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('remote-img-url') as HTMLInputElement;
                          if (el && el.value) {
                            addAdditionalImageByUrl(el.value.trim());
                            el.value = '';
                          }
                        }}
                        className="px-2.5 bg-red-650 hover:bg-red-750 text-white rounded text-[10px] font-black uppercase transition shrink-0 cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                    <p className="text-[8px] text-neutral-450 font-mono">Input any valid image link to map directly</p>
                  </div>
                </div>

                {/* Render thumbnail grid for attached additional images */}
                {additionalImages.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-mono font-black uppercase text-neutral-400">Attached gallery pictures ({additionalImages.length}):</p>
                    <div className="grid grid-cols-4 gap-2">
                      {additionalImages.map((img, idx) => (
                        <div key={idx} className="relative aspect-video rounded border border-gray-200 overflow-hidden group bg-neutral-900">
                          <img
                            src={img}
                            alt=""
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() => setAdditionalImages(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-0.5 rounded-full shadow-md transition-all opacity-90 hover:opacity-100 cursor-pointer"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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

              {/* Conditional special custom inputs for categories */}
              {category === 'Scholarships' && (
                <div className="bg-red-50/15 border border-red-100 p-4 rounded-xl space-y-3.5 shadow-sm text-left">
                  <h4 className="text-xs font-mono font-black uppercase text-red-750 flex items-center gap-1.5 border-b border-red-100 pb-2">
                    🎓 Scholarship Details
                  </h4>
                  <div>
                    <label className="block text-[10px] font-mono font-black uppercase text-neutral-500 mb-1">Organization / Sponsor</label>
                    <input
                      type="text"
                      value={scholarshipSponsor}
                      onChange={(e) => setScholarshipSponsor(e.target.value)}
                      placeholder="e.g. Ministry of Education"
                      className="w-full bg-white border border-gray-200 rounded p-2 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-black uppercase text-neutral-500 mb-1">Scholarship Coverage Amount</label>
                    <input
                      type="text"
                      value={scholarshipAmount}
                      onChange={(e) => setScholarshipAmount(e.target.value)}
                      placeholder="e.g. Fully Funded or $5,000"
                      className="w-full bg-white border border-gray-200 rounded p-2 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-black uppercase text-neutral-500 mb-1">Eligibility Criteria</label>
                    <textarea
                      rows={2}
                      value={scholarshipEligibility}
                      onChange={(e) => setScholarshipEligibility(e.target.value)}
                      placeholder="e.g. High school graduates with minimum GPA 3.2"
                      className="w-full bg-white border border-gray-200 rounded p-2 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-mono font-black uppercase text-neutral-500 mb-1">Deadline Date</label>
                      <input
                        type="date"
                        value={scholarshipDeadline}
                        onChange={(e) => setScholarshipDeadline(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded p-2 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono font-black uppercase text-neutral-500 mb-1">Inquiry / Apply Link</label>
                      <input
                        type="url"
                        value={scholarshipLink}
                        onChange={(e) => setScholarshipLink(e.target.value)}
                        placeholder="https://apply-portal.gov"
                        className="w-full bg-white border border-gray-200 rounded p-2 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {category === 'Products' && (
                <div className="bg-amber-50/15 border border-amber-100 p-4 rounded-xl space-y-3.5 shadow-sm text-left">
                  <h4 className="text-xs font-mono font-black uppercase text-amber-750 flex items-center gap-1.5 border-b border-amber-150 pb-2">
                    📦 Product / Service Details
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-mono font-black uppercase text-neutral-500 mb-1">Price</label>
                      <input
                        type="text"
                        value={productPrice}
                        onChange={(e) => setProductPrice(e.target.value)}
                        placeholder="e.g., $150 USD"
                        className="w-full bg-white border border-gray-200 rounded p-2 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono font-black uppercase text-neutral-500 mb-1">Seller / Business</label>
                      <input
                        type="text"
                        value={productSeller}
                        onChange={(e) => setProductSeller(e.target.value)}
                        placeholder="e.g., Monrovia Tech Hub"
                        className="w-full bg-white border border-gray-200 rounded p-2 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-black uppercase text-neutral-500 mb-1">PickUp or Contact Location</label>
                    <input
                      type="text"
                      value={productLocation}
                      onChange={(e) => setProductLocation(e.target.value)}
                      placeholder="e.g., Broad Street, Monrovia, Liberia"
                      className="w-full bg-white border border-gray-200 rounded p-2 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-mono font-black uppercase text-neutral-500 mb-1">Contact Phone/Email</label>
                      <input
                        type="text"
                        value={productContact}
                        onChange={(e) => setProductContact(e.target.value)}
                        placeholder="e.g., +231 88 123 456"
                        className="w-full bg-white border border-gray-200 rounded p-2 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono font-black uppercase text-neutral-500 mb-1">Direct Purchase Url</label>
                      <input
                        type="url"
                        value={productBuyLink}
                        onChange={(e) => setProductBuyLink(e.target.value)}
                        placeholder="https://buy-now-portal.com"
                        className="w-full bg-white border border-gray-200 rounded p-2 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {category === 'Promotions' && (
                <div className="bg-emerald-50/15 border border-emerald-100 p-4 rounded-xl space-y-3.5 shadow-sm text-left">
                  <h4 className="text-xs font-mono font-black uppercase text-emerald-800 flex items-center gap-1.5 border-b border-emerald-150 pb-2">
                    🎵 Artist & Asset Promotions
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-mono font-black uppercase text-neutral-500 mb-1">Artist / Musician</label>
                      <input
                        type="text"
                        value={promoArtistName}
                        onChange={(e) => setPromoArtistName(e.target.value)}
                        placeholder="e.g., MC Caro or Kobazolo"
                        className="w-full bg-white border border-gray-200 rounded p-2 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono font-black uppercase text-neutral-500 mb-1">Song / Video Title</label>
                      <input
                        type="text"
                        value={promoReleaseTitle}
                        onChange={(e) => setPromoReleaseTitle(e.target.value)}
                        placeholder="e.g., Lib Star Reloaded"
                        className="w-full bg-white border border-gray-200 rounded p-2 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-black uppercase text-neutral-500 mb-1">Audio Streaming/Song URL (SoundCloud, Audiomack, etc.)</label>
                    <input
                      type="url"
                      value={promoMusicUrl}
                      onChange={(e) => setPromoMusicUrl(e.target.value)}
                      placeholder="https://soundcloud.com/artist/song"
                      className="w-full bg-white border border-gray-200 rounded p-2 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-black uppercase text-neutral-500 mb-1">Video Clip URL (YouTube representation)</label>
                    <input
                      type="url"
                      value={promoVideoUrl}
                      onChange={(e) => setPromoVideoUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full bg-white border border-gray-200 rounded p-2 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-black uppercase text-neutral-500 mb-1">Direct Audio/Video Player iframe embed code</label>
                    <textarea
                      rows={2}
                      value={promoDirectEmbed}
                      onChange={(e) => setPromoDirectEmbed(e.target.value)}
                      placeholder='<iframe src="https://open.spotify.com/embed/..." ...></iframe>'
                      className="w-full bg-white border border-gray-200 p-2 rounded text-[11px] font-mono focus:ring-1 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-black uppercase text-neutral-500 mb-1">Booking Info & Contacts</label>
                    <input
                      type="text"
                      value={promoBookingInfo}
                      onChange={(e) => setPromoBookingInfo(e.target.value)}
                      placeholder="e.g. For bookings: info@artistmanagement.com"
                      className="w-full bg-white border border-gray-200 p-2 rounded text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {category === 'WAEC Liberia 🇱🇷' && (
                <div className="bg-blue-50/15 border border-blue-100 p-4 rounded-xl space-y-3.5 shadow-sm text-left">
                  <h4 className="text-xs font-mono font-black uppercase text-blue-800 flex items-center gap-1.5 border-b border-blue-150 pb-2 animate-pulse">
                    🔒 WAEC Liberia Lock Configuration
                  </h4>
                  <div>
                    <label className="block text-[10px] font-mono font-black uppercase text-neutral-500 mb-1">Set Secure Viewing PIN Code (Optional)</label>
                    <input
                      type="text"
                      value={waecPin}
                      onChange={(e) => setWaecPin(e.target.value)}
                      placeholder="e.g., 2026, or empty for open access"
                      className="w-full bg-white border border-gray-200 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono tracking-widest"
                    />
                    <p className="text-[10px] text-neutral-500 mt-1">
                      If configured, readers will be prompted to enter this exact passcode before their device can stream or read associated pictures, exam prep files, or text.
                    </p>
                  </div>
                </div>
              )}

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
                    onChange={handleDevicePhotoUpload}
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
                  <Video className="w-3.5 h-3.5 text-neutral-500 animate-pulse" /> Video & Embedding (Optional)
                </h4>

                {/* DEVICE MOBILE VIDEO UPLOADER */}
                <div className="p-3 bg-white rounded border border-dashed border-gray-200">
                  <p className="block text-[10px] font-mono font-black text-red-650 uppercase mb-1.5">📹 Video Clip from Phone / Device</p>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleDeviceVideoUpload}
                    id="phone-news-video"
                    className="hidden"
                  />
                  <label 
                    htmlFor="phone-news-video"
                    className="w-full py-2 bg-neutral-900 hover:bg-black text-white text-[10px] font-sans font-black uppercase text-center rounded-lg cursor-pointer transition shadow flex items-center justify-center gap-1.5"
                  >
                    <span>{isVideoUploading ? 'Reading video...' : 'Select Video from Device'}</span>
                  </label>
                  <p className="text-[9px] text-neutral-450 font-mono mt-1 text-center">Supports MP4, MOV, WEBM broadcasts up to 6 hours</p>
                </div>

                {isLargeVideoWarning && videoUrl && videoUrl.startsWith('blob:') && (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg space-y-1.5 text-[11px] leading-relaxed">
                    <div className="font-extrabold flex items-center gap-1 text-xs">
                      ⚡ 6-HOUR STREAM PREVIEW ACTIVE
                    </div>
                    <p>
                      Your massive broadcast is streamable instantly in this current browser!
                    </p>
                    <p className="text-[10px] font-mono text-neutral-600 bg-white/60 p-1.5 rounded">
                      <strong>To share with global readers:</strong> Since local files cannot be sent directly as multi-gigabyte files to Firestore database, please host this video on YouTube, Vimeo, AWS S3, or Google Drive, then paste the streaming link below.
                    </p>
                  </div>
                )}

                {videoUrl && videoUrl.startsWith('data:video/') && (
                  <div className="p-2 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded text-[10px] font-mono break-all line-clamp-2">
                    ✅ Loaded custom device clip: {videoUrl.substring(0, 80)}...
                  </div>
                )}

                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-gray-150"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-neutral-50 px-2 text-[9px] text-neutral-400 font-mono">OR INTERNET STREAM LINK</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-black text-neutral-500 uppercase mb-1">YouTube / Raw Video URL</label>
                  <input
                    type="url"
                    value={videoUrl.startsWith('data:video/') ? 'Custom Device MP4' : videoUrl.startsWith('blob:') ? 'Custom Locally Streamed Media Preview' : videoUrl}
                    onChange={(e) => {
                      setVideoUrl(e.target.value);
                      setIsLargeVideoWarning(false);
                    }}
                    placeholder="https://www.youtube.com/watch?v=... or .mp4 link"
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
          </div>)}

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

      {/* NEW TAB: 24/7 LIVE STREAM BROADCAST CONFIGURATION */}
      {activeTab === 'livestream' && (
        <div className="space-y-6">
          <div className="p-4 bg-red-50 border-l-4 border-red-650 text-red-900 rounded-r-lg">
            <h4 className="text-xs font-sans font-black uppercase tracking-wider flex items-center gap-1.5">
              <Tv className="w-4 h-4 text-red-650" />
              24/7 Global Live Feed & Multiple Stream Embed Controller
            </h4>
            <p className="text-[11px] text-neutral-605 leading-normal mt-1">
              Configure multiple live television streams, broadcast feeds, or generic iframe embeds. Turn individual streams ON or OFF, assign them labels, delete old feeds, and toggle them as <strong>Breaking Alerts</strong> or <strong>Live Updates</strong>.
            </p>
          </div>

          {/* Multiple Stream Selection / Navigation Board */}
          <div className="p-4 bg-white border border-gray-150 rounded-xl space-y-3.5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <span className="text-xs font-sans font-extrabold text-neutral-950 uppercase tracking-wide block">Select Stream Configuration</span>
                <span className="text-[10px] text-neutral-500 font-mono">Choose a stream to modify, or register a new one</span>
              </div>
              <button
                type="button"
                onClick={() => handleSelectLiveStream(null)}
                className="px-3 py-1.5 bg-red-600 hover:bg-neutral-950 text-white rounded text-[10px] font-mono font-black uppercase transition-all flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Register New Stream</span>
              </button>
            </div>

            {liveStreamsList.length === 0 ? (
              <p className="text-[11px] text-neutral-450 font-mono italic">No live streams found. Click above to configure Liberian television channels or youtube links.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {liveStreamsList.map((stream) => {
                  const isSelected = selectedLiveStreamId === stream.id;
                  return (
                    <div
                      key={stream.id}
                      onClick={() => handleSelectLiveStream(stream)}
                      className={`p-3 border rounded-lg cursor-pointer transition flex flex-col justify-between ${
                        isSelected 
                          ? 'border-red-605 bg-red-50/20 shadow-sm' 
                          : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1.5 mb-1">
                          <span className="text-[9px] font-mono font-black uppercase text-neutral-500">{stream.liveEmbedSource || 'youtube'}</span>
                          <span className={`w-2 h-2 rounded-full ${stream.liveEmbedEnabled ? 'bg-red-605 animate-pulse' : 'bg-neutral-350'}`} />
                        </div>
                        <h5 className="text-[11px] font-sans font-black text-neutral-900 line-clamp-1">{stream.liveEmbedTitle || stream.title}</h5>
                      </div>

                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-neutral-200 text-[9px] font-mono">
                        <span className="text-neutral-500">
                          {stream.liveIsAlert || stream.isAlert ? '🚨 Breaking' : stream.liveIsUpdate ? '⚡ Update' : '📡 Stream'}
                        </span>
                        <span className={`font-black ${stream.liveEmbedEnabled ? 'text-red-700' : 'text-neutral-500'}`}>
                          {stream.liveEmbedEnabled ? 'ACTIVE/ON_AIR' : 'OFFLINE'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Form and Preview Monitor */}
          <form onSubmit={handleSaveLiveStream} className="p-5 border border-gray-200 rounded-xl space-y-5 bg-neutral-50/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white border border-gray-150 rounded-lg">
              <div>
                <span className="text-xs font-sans font-extrabold text-neutral-950 uppercase tracking-wide block">
                  {selectedLiveStreamId ? '✏️ Editing Loaded Stream Details' : '🌟 Creating A New Live Stream'}
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">
                  {selectedLiveStreamId ? `Doc ID Reference: ${selectedLiveStreamId}` : 'Will create a premium native feed document'}
                </span>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                {selectedLiveStreamId && (
                  <button
                    type="button"
                    onClick={() => handleDeleteLiveStream(selectedLiveStreamId)}
                    className="px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-700 rounded text-[10px] font-mono font-black uppercase transition cursor-pointer"
                  >
                    Delete Stream
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setLiveStreamEnabled(prev => !prev)}
                  className={`px-4 py-1.5 rounded text-[10px] font-mono font-black uppercase transition-colors cursor-pointer ${
                    liveStreamEnabled 
                      ? 'bg-red-650 text-white hover:bg-neutral-950' 
                      : 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300'
                  }`}
                >
                  {liveStreamEnabled ? '🔴 Enabled / Visible' : '⚪ Disabled / Hidden'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono font-black text-neutral-500 uppercase mb-1">Live Broadcast Label / Title</label>
                <input
                  type="text"
                  required
                  value={liveStreamTitle}
                  onChange={(e) => setLiveStreamTitle(e.target.value)}
                  placeholder="e.g. 🔴 LNTV Liberia - 24/7 Live Television Stream"
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <p className="text-[9px] text-neutral-450 font-mono mt-1">Displayed above the media container inside user portal sidebars.</p>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-black text-neutral-500 uppercase mb-1">Streaming Video Source Host</label>
                <select
                  value={liveStreamSource}
                  onChange={(e: any) => setLiveStreamSource(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="youtube">YouTube Live Stream (Channel or Video ID)</option>
                  <option value="twitch">Twitch Stream (Username)</option>
                  <option value="facebook">Facebook Live (Public Stream Link)</option>
                  <option value="m3u8">Raw Video URL (HLS / .m3u8 or .mp4)</option>
                  <option value="custom_embed">Custom Raw HTML / Iframe Embed Code</option>
                </select>
                <p className="text-[9px] text-neutral-450 font-mono mt-1">Select the hosting platform. We sanitize rendering inside frames automatically.</p>
              </div>
            </div>

            {/* LIVE STREAM BREAKING & UPDATE DISPATCH CHECKBOXES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 bg-neutral-100/50 rounded-lg border border-neutral-200/50">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={liveStreamIsAlert}
                  onChange={(e) => setLiveStreamIsAlert(e.target.checked)}
                  className="mt-1 accent-red-650"
                />
                <div>
                  <span className="text-xs font-sans font-black text-neutral-900 uppercase block tracking-tight">Put on Breaking News Ticker</span>
                  <span className="text-[10px] text-neutral-500 font-mono block mt-0.5 leading-snug">
                    If toggled, this stream produces a blinking global marquee alert telling readers: "🔴 LIVE BROADCAST BREAKING COVERAGE - CLICK HERE TO WATCH"!
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={liveStreamIsUpdate}
                  onChange={(e) => setLiveStreamIsUpdate(e.target.checked)}
                  className="mt-1 accent-red-650"
                />
                <div>
                  <span className="text-xs font-sans font-black text-neutral-900 uppercase block tracking-tight">Highlight as Live News Update</span>
                  <span className="text-[10px] text-neutral-500 font-mono block mt-0.5 leading-snug">
                    Highlights this stream inside updates segments, giving it high visibility on search feeds.
                  </span>
                </div>
              </label>
            </div>

            {liveStreamSource !== 'custom_embed' ? (
              <div>
                <label className="block text-[10px] font-mono font-black text-neutral-500 uppercase mb-1">
                  {liveStreamSource === 'youtube' && 'YouTube Live Video URL or 11-character Video ID'}
                  {liveStreamSource === 'twitch' && 'Twitch Channel Name (e.g. lntvnews)'}
                  {liveStreamSource === 'facebook' && 'Facebook Live Video URL'}
                  {liveStreamSource === 'm3u8' && 'Raw Stream Link (.m3u8 index or streaming server URL)'}
                </label>
                <input
                  type="text"
                  required={liveStreamEnabled && liveStreamSource !== 'custom_embed'}
                  value={liveStreamUrl}
                  onChange={(e) => setLiveStreamUrl(e.target.value)}
                  placeholder={
                    liveStreamSource === 'youtube' ? 'https://www.youtube.com/watch?v=jfKfPfyJRdk  or  jfKfPfyJRdk' :
                    liveStreamSource === 'twitch' ? 'e.g. lntv_liberia' :
                    liveStreamSource === 'facebook' ? 'e.g. https://www.facebook.com/watch/live/?v=12345' : 
                    'e.g. https://example.com/live/stream.m3u8'
                  }
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
                />
                <p className="text-[9px] text-neutral-450 font-mono mt-1">Specify parameters or address strings from direct server platforms.</p>
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-mono font-black text-neutral-500 uppercase mb-1">Custom Embedded Code / Raw Iframe Snippet</label>
                <textarea
                  rows={4}
                  required={liveStreamEnabled && liveStreamSource === 'custom_embed'}
                  value={liveStreamCode}
                  onChange={(e) => setLiveStreamCode(e.target.value)}
                  placeholder='e.g. <iframe width="100%" height="315" src="https://example.com/embed" frameborder="0" allowfullscreen></iframe>'
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-left inline-block"
                />
                <p className="text-[9px] text-neutral-450 font-mono mt-1">
                  Ensure iframe tags include custom width values like <code className="bg-neutral-100 px-1 rounded">width="100%"</code> so it matches sidebars dynamically!
                </p>
              </div>
            )}

            {/* PREVIEW WIDGET FOR ADMIN */}
            {liveStreamEnabled && (
              <div className="p-4 border border-neutral-800 rounded-xl bg-neutral-900 text-white space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <span className="text-[10px] font-mono font-black uppercase text-red-500 tracking-wider flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-655 animate-ping inline-block animate-pulse bg-red-600" />
                    Live Preview Monitor
                  </span>
                  <span className="text-[9px] font-mono text-neutral-450 uppercase">{liveStreamSource} Engine</span>
                </div>
                
                <div className="aspect-video w-full rounded-md overflow-hidden bg-black flex items-center justify-center border border-neutral-800 relative">
                  {liveStreamSource === 'youtube' && liveStreamUrl && (
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${
                        liveStreamUrl.includes('v=') 
                          ? liveStreamUrl.split('v=')[1]?.split('&')[0] 
                          : liveStreamUrl.includes('youtu.be/') 
                            ? liveStreamUrl.split('youtu.be/')[1]?.split('?')[0] 
                            : liveStreamUrl
                      }?autoplay=0&mute=1&controls=1`}
                      title="YouTube Live Stream Preview"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  )}

                  {liveStreamSource === 'twitch' && liveStreamUrl && (
                    <iframe
                      src={`https://player.twitch.tv/?channel=${liveStreamUrl}&parent=${window.location.hostname}&muted=true&autoplay=false`}
                      parent={window.location.hostname}
                      frameBorder="0"
                      scrolling="no"
                      allowFullScreen={true}
                      width="100%"
                      height="100%"
                      className="w-full h-full"
                    />
                  )}

                  {liveStreamSource === 'facebook' && liveStreamUrl && (
                    <iframe
                      src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(liveStreamUrl)}&show_text=false&t=0&autoplay=false&mute=true`}
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

                  {liveStreamSource === 'm3u8' && liveStreamUrl && (
                    <video
                      src={liveStreamUrl}
                      controls
                      autoPlay={false}
                      muted
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  )}

                  {liveStreamSource === 'custom_embed' && liveStreamCode && (
                    <div 
                      className="w-full h-full flex items-center justify-center [&_iframe]:w-full [&_iframe]:h-full"
                      dangerouslySetInnerHTML={{ __html: liveStreamCode }}
                    />
                  )}

                  {(!liveStreamUrl && liveStreamSource !== 'custom_embed') && (
                    <p className="text-[10px] text-neutral-500 font-mono">Fill in stream URL parameters to test playback channel.</p>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSavingLiveStream}
              className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-950 text-white text-xs font-sans font-black uppercase tracking-wider rounded-lg transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-red-505" />
              <span>{isSavingLiveStream ? 'Deploying feed...' : selectedLiveStreamId ? 'Update Live Stream Changes' : 'Publish / Add New Live Stream'}</span>
            </button>
          </form>
        </div>
      )}

      {/* NEW TAB: ADVERTISEMENTS MANAGEMENT CONSOLE */}
      {activeTab === 'advertisements' && (
        <div className="space-y-6">
          <div className="p-4 bg-amber-50 border-l-4 border-amber-550 text-amber-900 rounded-r-lg">
            <h4 className="text-xs font-sans font-black uppercase tracking-wider flex items-center gap-1.5">
              <Megaphone className="w-4 h-4 text-amber-600" />
              National & Global Advertisement Campaign Panel
            </h4>
            <p className="text-[11px] text-neutral-605 leading-normal mt-1">
              Publish advertisement banners that integrated seamlessly with core page layouts: <strong>Header Billboard</strong>, <strong>Sidebar Cards</strong>, and <strong>In-feed Paragraphs</strong>. Tracks live clicks and redirects readers to any destination.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Ad editor form (Cols 1 & 2) */}
            <div className="lg:col-span-2 space-y-4">
              <form onSubmit={handleSaveAd} className="p-5 border border-amber-200 rounded-xl bg-amber-50/10 space-y-4">
                <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                  <div>
                    <span className="text-xs font-sans font-black text-amber-950 uppercase block">
                      {editingAdId ? '✏️ Edit Ad Campaign Details' : '📢 Create New Ad Campaign'}
                    </span>
                    <span className="text-[9px] font-mono text-neutral-500">
                      {editingAdId ? `AD REFERENCE CODE: ${editingAdId}` : 'Ad is updated across all browsers instantly'}
                    </span>
                  </div>
                  {editingAdId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAdId(null);
                        setAdTitle('');
                        setAdImageUrl('');
                        setAdRedirectUrl('');
                        setAdPlacement('sidebar');
                        setAdActive(true);
                      }}
                      className="text-[10px] font-mono font-black text-neutral-600 hover:underline uppercase bg-white border border-neutral-300 px-2.5 py-1 rounded"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-mono font-black text-neutral-500 uppercase mb-1">Campaign Administrative Title</label>
                    <input
                      type="text"
                      required
                      value={adTitle}
                      onChange={(e) => setAdTitle(e.target.value)}
                      placeholder="e.g. Lonestar Cell MTN Liberia - 4G Internet Deal Banner"
                      className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <p className="text-[9px] text-neutral-400 font-mono mt-1">Administrative tracker for analytics logs.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[10px] font-mono font-black text-neutral-500 uppercase mb-1 font-extrabold text-neutral-500">Placement Slot Position</label>
                      <select
                        value={adPlacement}
                        onChange={(e: any) => setAdPlacement(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="header_banner">Header Billboard Banner (Top page marquee)</option>
                        <option value="sidebar">Sidebar Banner Slot (Column sidebar item)</option>
                        <option value="in_feed">Integrated In-Feed Ad (Inline with lists)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-black text-neutral-500 uppercase mb-1">Campaign Visibility Toggle</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setAdActive(true)}
                          className={`flex-1 py-2 text-center rounded text-[10px] font-mono font-black uppercase border transition cursor-pointer ${
                            adActive ? 'bg-amber-600 text-white border-amber-600 shadow-sm' : 'bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-50'
                          }`}
                        >
                          🟢 Active Live
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdActive(false)}
                          className={`flex-1 py-2 text-center rounded text-[10px] font-mono font-black uppercase border transition cursor-pointer ${
                            !adActive ? 'bg-neutral-800 text-white border-neutral-800 shadow-sm' : 'bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-50'
                          }`}
                        >
                          ⚪ Paused/Hidden
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-black text-neutral-500 uppercase mb-1">Ad Visual Banner Photo URL</label>
                    <input
                      type="url"
                      required
                      value={adImageUrl}
                      onChange={(e) => setAdImageUrl(e.target.value)}
                      placeholder="Enter visual banner image link (e.g. from unsplash or storage)"
                      className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                    <p className="text-[9px] text-neutral-400 font-mono mt-1">Recommended dimensions: Headers (970x120px), Sidebars (300x250px), In-feed (720x90px).</p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-black text-neutral-500 uppercase mb-1 font-extrabold text-neutral-500">Destination Redirect Link URL</label>
                    <input
                      type="url"
                      required
                      value={adRedirectUrl}
                      onChange={(e) => setAdRedirectUrl(e.target.value)}
                      placeholder="https://example-sponsor-website.net/campaign-deal"
                      className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                    <p className="text-[9px] text-neutral-450 font-mono mt-1">When readers click this banner, they will securely pop open this redirect destination.</p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSavingAd}
                  className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-950 text-white text-xs font-mono font-extrabold uppercase rounded-lg transition shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-amber-500" />
                  <span>{isSavingAd ? 'Saving Campaign...' : editingAdId ? 'Apply Campaign Edits' : 'Deploy Live Ad Campaign'}</span>
                </button>
              </form>
            </div>

            {/* Existing campaign list and preview (Col 3) */}
            <div className="space-y-4">
              <span className="text-[10px] font-mono font-black uppercase text-neutral-500 tracking-wider block">Live Banner Display Preview</span>
              
              <div className="p-3 border border-neutral-200 bg-neutral-50 rounded-xl space-y-3">
                {adImageUrl ? (
                  <a href={adRedirectUrl} target="_blank" rel="noopener noreferrer" className="block relative group overflow-hidden rounded-lg border border-neutral-300">
                    <img referrerPolicy="no-referrer" src={adImageUrl} alt="Ad Visual Preview" className="w-full h-auto object-cover max-h-[140px]" />
                    <div className="absolute top-1 right-1 bg-black/70 text-white font-mono text-[7px] px-1 rounded uppercase tracking-widest leading-none py-0.5">Sponsor Ad</div>
                    <div className="absolute inset-x-0 bottom-0 bg-black/80 p-1 text-[8px] font-mono text-center text-white line-clamp-1 opacity-0 group-hover:opacity-100 transition duration-200">
                      Redirects to: {adRedirectUrl}
                    </div>
                  </a>
                ) : (
                  <div className="w-full aspect-video bg-neutral-200 border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center rounded-lg text-neutral-400">
                    <p className="text-[10px] font-mono uppercase">IMAGE PREVIEW BOX</p>
                  </div>
                )}
                <div className="text-[9px] font-mono text-neutral-500 text-center leading-none">
                  Layout: <strong className="uppercase">{adPlacement}</strong>
                </div>
              </div>

              <span className="text-[10px] font-mono font-black uppercase text-neutral-500 tracking-wider block">Active Ad Banners ({adsList.length})</span>
              <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                {adsList.length === 0 ? (
                  <p className="text-[11px] font-mono text-neutral-400 italic">No ad campaigns registered on cloud database.</p>
                ) : (
                  adsList.map(ad => (
                    <div key={ad.id} className="p-3 bg-white border border-gray-150 rounded-lg space-y-2 relative shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className={`text-[8px] font-mono font-black px-1.5 py-0.5 rounded leading-none uppercase ${
                          ad.active ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-600'
                        }`}>
                          {ad.active ? '🟢 ACTIVE' : '⚪ PAUSED'}
                        </span>
                        <span className="text-[9px] font-mono bg-neutral-100 px-1 py-0.5 rounded text-neutral-500 uppercase">{ad.placement}</span>
                      </div>

                      <h6 className="text-xs font-black text-neutral-900 leading-tight line-clamp-1">{ad.title}</h6>
                      <p className="text-[9px] text-neutral-450 font-mono break-all line-clamp-1">Destination: {ad.redirectUrl}</p>

                      <div className="grid grid-cols-2 gap-1.5 text-center text-[10px] font-mono p-1 bg-neutral-55 rounded text-neutral-600 border border-neutral-100">
                        <div>
                          <span className="text-[8px] text-neutral-400 block tracking-wider leading-none">IMPRESSIONS</span>
                          <span className="font-extrabold text-neutral-800">{ad.viewsCount || 0}</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-neutral-400 block tracking-wider leading-none">CTR CLICKS</span>
                          <span className="font-extrabold text-amber-850 text-neutral-800">{ad.clicksCount || 0}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1.5 border-t border-gray-100 justify-end">
                        <button
                          onClick={() => {
                            setEditingAdId(ad.id);
                            setAdTitle(ad.title);
                            setAdImageUrl(ad.imageUrl);
                            setAdRedirectUrl(ad.redirectUrl);
                            setAdPlacement(ad.placement);
                            setAdActive(ad.active);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="px-2 py-0.5 text-[9px] font-sans font-bold uppercase hover:bg-neutral-100 text-neutral-700 hover:text-neutral-950 transition border border-neutral-200 rounded cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteAd(ad.id)}
                          className="px-2 py-0.5 text-[9px] font-sans font-bold uppercase hover:bg-neutral-150 text-red-700 hover:bg-red-50 transition border border-red-150 rounded cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: AI NEWSROOM / AUTO-PUBLISHER */}
      {activeTab === 'ai-publish' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-purple-950 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden border border-indigo-500/30">
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-550/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-550/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10 text-left">
              <div className="space-y-1">
                <span className="bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 font-mono text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase">
                  ⚡ Fully Automated Journalism
                </span>
                <h3 className="text-2xl font-sans font-black tracking-tight text-white mt-2">
                  WAEC News AI Auto-Publisher 24/7
                </h3>
                <p className="text-xs text-indigo-400 max-w-xl font-medium leading-relaxed font-sans">
                  Sarness the power of artificial intelligence to continuously research, write, and broadcast authentic Liberian news and WAEC resource notices. Powered by <strong>Gemini 3.5 Flash</strong>, it generates high-fidelity headers, markdown texts, and tags them securely.
                </p>
              </div>

              <div className="flex items-center gap-4 bg-black/30 p-4 rounded-xl border border-white/5 shadow-inner">
                <div className="text-center">
                  <span className="text-[9px] font-mono text-indigo-300 block mb-0.5 uppercase tracking-wider">LIVE IN DATABASE</span>
                  <span className="text-3xl font-sans font-black text-rose-450 text-white leading-none">
                    {articles.filter(a => a.authorId === 'ai_editor_bot').length}
                  </span>
                  <span className="text-[8px] font-mono text-neutral-400 block mt-0.5 uppercase">AI Articles</span>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div className="text-center">
                  <span className="text-[9px] font-mono text-indigo-300 block mb-0.5 uppercase tracking-wider">SESSION RUNS</span>
                  <span className="text-3xl font-sans font-black text-green-400 leading-none">
                    {generatedCount}
                  </span>
                  <span className="text-[8px] font-mono text-neutral-400 block mt-0.5 uppercase">Ticks Generated</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Command & Configuration Controls (4 cols) */}
            <div className="lg:col-span-5 space-y-6 text-left">
              
              {/* Card 1: Power & Engine Switch */}
              <div className="p-5 border border-gray-150 bg-white rounded-xl shadow-sm space-y-4">
                <h4 className="text-xs font-mono font-black text-neutral-600 block uppercase border-b border-gray-100 pb-2">
                  🕹️ ENGINE INITIALIZER & LAUNCHPAD
                </h4>

                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                  <div>
                    <span className="text-xs font-sans font-black text-neutral-900 block uppercase">
                      Enable 24/7 AI Thread
                    </span>
                    <span className="text-[10px] text-neutral-450 font-mono block">
                      {isAiPublisherActive 
                        ? '🟢 ONLINE & FORMULATING' 
                        : '⚪ OFFLINE & STANDBY'}
                    </span>
                  </div>

                  <button
                    onClick={handleToggleServerDaemon}
                    className={`relative w-14 h-7.5 rounded-full p-1 transition-colors duration-300 cursor-pointer ${
                      isAiPublisherActive ? 'bg-indigo-600' : 'bg-neutral-300'
                    }`}
                  >
                    <div
                      className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                        isAiPublisherActive ? 'translate-x-[26px]' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Interval Speed Selector */}
                <div>
                  <label className="block text-[10px] font-mono font-black text-neutral-500 uppercase mb-2">
                    Generation Loop Speed Interval
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    {[
                      { label: '1 SEC', val: 1000 },
                      { label: '5 SEC', val: 5000 },
                      { label: '15 SEC', val: 15000 },
                      { label: '60 SEC', val: 60000 }
                    ].map(item => (
                      <button
                        key={item.val}
                        onClick={() => handleUpdateServerIntervalSpeed(item.val)}
                        className={`py-2 rounded text-[10px] font-mono font-bold uppercase transition border cursor-pointer ${
                          aiIntervalSpeed === item.val
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm font-black'
                            : 'bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-500'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Instant Force Button */}
                <button
                  onClick={() => executeAiAutoPublishTick()}
                  disabled={isAiGenerating}
                  className="w-full bg-gray-900 hover:bg-black text-white py-2.5 rounded-lg text-xs font-mono font-black uppercase shadow transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                  {isAiGenerating ? 'AI IS INVESTIGATING...' : 'FORCE INSTANT PUBLISH'}
                </button>

                {/* Purge / Clear all AI news option to start off with real live stack news */}
                <button
                  onClick={handlePurgeAllNews}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-lg text-xs font-mono font-black uppercase shadow transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-100" />
                  PURGE ALL AI NEWS & REBOOT FEED
                </button>
              </div>

              {/* Card 1B: Cinema & TV Series Auto-Publisher */}
              <div className="p-5 border border-purple-150 bg-gradient-to-br from-purple-50/10 to-white rounded-xl shadow-sm space-y-4 border-l-4 border-l-purple-600">
                <h4 className="text-xs font-mono font-black text-purple-950 block uppercase border-b border-purple-50 pb-2 flex items-center justify-between">
                  <span>🎬 CINEMA & MOVIE AUTO-PUBLISHER</span>
                  <span className="bg-purple-150 text-purple-750 text-[8px] font-black leading-none p-1 px-1.5 rounded uppercase">Every 15s</span>
                </h4>

                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                  <div>
                    <span className="text-xs font-sans font-black text-neutral-900 block uppercase">
                      Enable 15s Cinema Loop
                    </span>
                    <span className="text-[10px] text-neutral-450 font-mono block">
                      {isMoviePublisherActive 
                        ? '🟢 CINEMA AI ACTIVE' 
                        : '⚪ CINEMA AI SUSPENDED'}
                    </span>
                  </div>

                  <button
                    onClick={handleToggleMovieDaemon}
                    className={`relative w-14 h-7.5 rounded-full p-1 transition-colors duration-300 cursor-pointer ${
                      isMoviePublisherActive ? 'bg-purple-600' : 'bg-neutral-300'
                    }`}
                  >
                    <div
                      className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                        isMoviePublisherActive ? 'translate-x-[26px]' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <button
                  onClick={forceMoviePublishTick}
                  className="w-full bg-purple-950 hover:bg-purple-900 text-white py-2.5 rounded-lg text-xs font-mono font-black uppercase shadow transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Tv className="w-3.5 h-3.5 text-purple-300" />
                  FORCE INSTANT MOVIE TICK
                </button>
              </div>

              {/* Card 2: Editorial Focus Domains */}
              <div className="p-5 border border-gray-150 bg-white rounded-xl shadow-sm space-y-3">
                <h4 className="text-xs font-mono font-black text-neutral-600 block uppercase border-b border-gray-100 pb-2">
                  📂 EDITORIAL FOCUS DOMAINS
                </h4>
                <p className="text-[10px] text-neutral-450 font-mono leading-relaxed">
                  Toggle domains to control what fields the AI investigative reporter explores.
                </p>

                <div className="space-y-2 mt-2 max-h-[160px] overflow-y-auto pr-1">
                  {CATEGORIES.map(cat => {
                    const checked = aiSelectedCategories.includes(cat);
                    return (
                      <label key={cat} className="flex items-center gap-2 p-1.5 hover:bg-neutral-50/70 rounded cursor-pointer transition select-none">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            if (checked) {
                              setAiSelectedCategories(prev => prev.filter(c => c !== cat));
                            } else {
                              setAiSelectedCategories(prev => [...prev, cat]);
                            }
                          }}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-550 w-3.5 h-3.5"
                        />
                        <span className="text-xs font-sans font-bold text-neutral-700">{cat}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Card 3: Advanced AI Global SysOp Control Tower */}
              <div className="p-5 border border-red-950 bg-neutral-900 rounded-xl shadow-md space-y-4 text-white">
                <h4 className="text-xs font-mono font-black text-red-500 block uppercase border-b border-neutral-800 pb-2 flex items-center justify-between">
                  <span>🚨 SYSTEM OPERATOR BROADCASTER</span>
                  <span className="bg-red-950 text-red-400 text-[8px] px-1.5 py-0.5 rounded font-black uppercase">SYSOP LEVEL 10</span>
                </h4>
                <p className="text-[10px] text-neutral-400 font-mono leading-relaxed">
                  Override active client user views in real-time. Broadcast flash news, scrolling banners, or regulatory messages globally.
                </p>

                {/* Submitting custom real-time warning ribbon */}
                <div className="space-y-2">
                  <label className="block text-[9px] font-mono text-neutral-300 uppercase font-black">
                    Urgent Alert Ribbon Text:
                  </label>
                  <textarea
                    id="sysop-alert-msg"
                    rows={2}
                    placeholder="E.g., WARNING: Liberian Ministry warns on WAEC deadlines..."
                    className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded text-xs text-white placeholder-neutral-600 font-mono focus:border-red-650"
                  />
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <button
                      onClick={async () => {
                        const el = document.getElementById('sysop-alert-msg') as HTMLTextAreaElement;
                        if (!el || !el.value.trim()) return;
                        try {
                          await setDoc(doc(db, "config", "broadcast_alert"), {
                            message: el.value.trim(),
                            active: true,
                            type: "warning",
                            timestamp: Timestamp.now()
                          });
                          alert("Global alert broadcast activated successfully!");
                        } catch (err: any) {
                          alert("Error sending alert: " + err.message);
                        }
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-mono font-black py-2 cursor-pointer uppercase tracking-tight"
                    >
                      🚀 Launch Broadcast
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await setDoc(doc(db, "config", "broadcast_alert"), {
                            message: "",
                            active: false,
                            timestamp: Timestamp.now()
                          });
                          const el = document.getElementById('sysop-alert-msg') as HTMLTextAreaElement;
                          if (el) el.value = "";
                          alert("Global alert cleared successfully!");
                        } catch (err: any) {
                          alert("Error clearing alert: " + err.message);
                        }
                      }}
                      className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-[10px] font-mono font-black py-2 cursor-pointer uppercase tracking-tight"
                    >
                      ❌ Clear Broadcast
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Sleek Tech Terminal Live Console (7 cols) */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="border border-neutral-800 bg-neutral-950 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[480px]">
                
                {/* Terminal Header */}
                <div className="bg-neutral-900 px-4 py-3 border-b border-neutral-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                      <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full" />
                      <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400 block uppercase">
                      ai-editor-bot@globalnews: ~/live-reporter-terminal
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
                    <span className="text-[9px] font-mono text-indigo-300 font-bold uppercase">
                      LIVE SOCKET
                    </span>
                  </div>
                </div>

                {/* Console Output Area */}
                <div className="flex-1 p-4 overflow-y-auto font-mono text-xs leading-relaxed space-y-2.5 bg-neutral-950 text-neutral-300 selection:bg-indigo-500 selection:text-white">
                  {aiLogs.length === 0 ? (
                    <div className="text-neutral-500 italic text-center py-20">
                      Terminal initialized... Ready to generate. Click "Enable 24/7 AI Thread" or manual "Force Instant Publish" to witness live AI-powered journalism actions!
                    </div>
                  ) : (
                    aiLogs.map((log, idx) => {
                      const colorClass = 
                        log.type === 'success' ? 'text-emerald-400' :
                        log.type === 'warn' ? 'text-amber-400' :
                        log.type === 'error' ? 'text-rose-450 text-red-400' : 'text-indigo-400';
                      
                      const prefix = 
                        log.type === 'success' ? '✔' :
                        log.type === 'warn' ? '⚠' :
                        log.type === 'error' ? '✘' : 'ℹ';

                      return (
                        <div key={idx} className="border-b border-white/5 pb-1">
                          <span className="text-neutral-500 mr-2">[{log.timestamp}]</span>
                          <span className={`${colorClass} mr-2 font-bold`}>{prefix}</span>
                          <span className="text-neutral-250 font-medium">{log.message}</span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Terminal Footer */}
                <div className="bg-neutral-900/40 px-4 py-2 hover:bg-neutral-900 border-t border-neutral-900/60 flex items-center justify-between text-[10px] font-mono text-neutral-450">
                  <span>Engine: {isAiPublisherActive ? 'RUNNING' : 'PAUSED'}</span>
                  <span>Buffer: {aiLogs.length}/100 Logs</span>
                </div>
              </div>
            </div>

          </div>

          {/* AI-Generated Article Registry List */}
          <div className="p-5 border border-gray-150 bg-white rounded-xl shadow-sm space-y-4 text-left">
            <h4 className="text-xs font-mono font-black text-neutral-600 block uppercase border-b border-gray-100 pb-2 flex items-center gap-1">
              📝 RECENTLY AI-BROADCASTED HEADLINES ({articles.filter(a => a.authorId === 'ai_editor_bot').length})
            </h4>

            <div className="overflow-x-auto">
              {articles.filter(a => a.authorId === 'ai_editor_bot').length === 0 ? (
                <div className="p-6 text-center text-xs text-neutral-400 font-mono italic">
                  No automated articles live yet. Enable the engine to see the news archive grow instantly!
                </div>
              ) : (
                <table className="w-full text-xs font-sans">
                  <thead>
                    <tr className="border-b border-gray-100 text-neutral-400 uppercase font-mono text-[10px]">
                      <th className="py-2.5 font-bold text-left">Article Title</th>
                      <th className="py-2.5 font-bold text-center">Category</th>
                      <th className="py-2.5 font-bold text-center">AI Reporter</th>
                      <th className="py-2.5 font-bold text-center">Alert?</th>
                      <th className="py-2.5 font-bold text-right">Publication Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {articles.filter(a => a.authorId === 'ai_editor_bot').slice(0, 10).map(art => (
                      <tr key={art.id} className="hover:bg-neutral-50/50 transition duration-150">
                        <td className="py-3 font-extrabold text-neutral-900 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="bg-purple-100 text-purple-750 font-mono text-[8px] font-black px-1.5 py-0.5 rounded leading-none">AI</span>
                            <span className="line-clamp-1">{art.title}</span>
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <span className="bg-neutral-100 text-neutral-600 font-mono text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                            {art.category}
                          </span>
                        </td>
                        <td className="py-3 text-center font-mono text-neutral-500 font-medium">{art.authorName}</td>
                        <td className="py-3 text-center">
                          {art.isAlert ? (
                            <span className="text-xs">🚨</span>
                          ) : (
                            <span className="text-neutral-300 font-mono">-</span>
                          )}
                        </td>
                        <td className="py-3 text-right font-mono text-neutral-450">
                          {art.publishedAt?.toDate ? art.publishedAt.toDate().toLocaleTimeString() : 'Draft'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
