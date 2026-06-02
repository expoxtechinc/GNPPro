import React, { useState, useEffect, useRef } from 'react';
import { 
  Tv, 
  Search, 
  Heart, 
  Share2, 
  ExternalLink, 
  AlertCircle, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Sparkles, 
  Maximize, 
  ChevronRight, 
  RefreshCw,
  Globe,
  Radio,
  Clock,
  Check
} from 'lucide-react';
import { TV_CHANNELS, TVChannel } from '../data/tvChannels';

export default function TVPortal() {
  const [channels, setChannels] = useState<TVChannel[]>(TV_CHANNELS);
  const [selectedChannel, setSelectedChannel] = useState<TVChannel>(TV_CHANNELS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('global_news_tv_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playError, setPlayError] = useState<string | null>(null);
  const [customM3uUrl, setCustomM3uUrl] = useState('');
  const [shareTooltip, setShareTooltip] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsInstanceRef = useRef<any>(null);

  // Load and save favorites
  useEffect(() => {
    localStorage.setItem('global_news_tv_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Extract unique groups for tabs
  const groups = ['All', 'Favorites', ...Array.from(new Set(TV_CHANNELS.map(c => c.group)))];

  // Map YouTube and Twitch URLs to correct embed format
  const getEmbedUrl = (channel: TVChannel): string | null => {
    const url = channel.url;
    if (channel.type === 'twitch') {
      // Extract twitch channel
      const match = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
      const name = match ? match[1] : 'abcnewsal';
      return `https://player.twitch.tv/?channel=${name}&parent=${window.location.hostname}&muted=false&autoplay=true`;
    }
    
    if (channel.type === 'youtube') {
      // Extract YouTube video ID
      const videoMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube-nocookie\.com\/embed\/)([a-zA-Z0-9_-]+)/);
      if (videoMatch && videoMatch[1]) {
        return `https://www.youtube.com/embed/${videoMatch[1]}?autoplay=1&mute=${isMuted ? 1 : 0}`;
      }
      
      // Live channel handle fallback handles (convert to official IDs if possible or embed handle interface)
      // Todo Noticias
      if (url.includes('todonoticias')) {
        return `https://www.youtube.com/embed/live_stream?channel=UCj6PcySAt_t_u_T9b98n83A&autoplay=1`;
      }
      // Canal 26
      if (url.includes('canal26')) {
        return `https://www.youtube.com/embed/live_stream?channel=UCuG8U0U_K6a7_pWhg_X6W_Q&autoplay=1`;
      }
      // Encuentro
      if (url.includes('encuentro')) {
        return `https://www.youtube.com/embed/live_stream?channel=UCvR_0Z6l8U_6uK4M8gE0Xtw&autoplay=1`;
      }
      // TV Publica
      if (url.includes('TVPublica')) {
        return `https://www.youtube.com/embed/live_stream?channel=UC9SkaIDBi796p080gEonMvA&autoplay=1`;
      }
      // C5N
      if (url.includes('c5n')) {
        return `https://www.youtube.com/embed/live_stream?channel=UC70jN84N0Pq1zY9QZ45mEFA&autoplay=1`;
      }
      // Euronews Albania
      if (url.includes('EuronewsAlbania')) {
        return `https://www.youtube.com/embed/live_stream?channel=UC5mN-fG3lB9Qz7C4q044T0A&autoplay=1`;
      }
      // France 24
      if (url.includes('FRANCE24')) {
        return `https://www.youtube.com/embed/live_stream?channel=UCCCPCZNChQdGa9EkATye6gA&autoplay=1`;
      }

      // Default embed query
      return `https://www.youtube.com/embed?listType=live&list=${channel.name}&autoplay=1`;
    }

    return null;
  };

  // Setup HLS Player
  useEffect(() => {
    setPlayError(null);
    const video = videoRef.current;
    if (selectedChannel.type !== 'hls' || !video) {
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
      return;
    }

    let hls: any = null;

    const initHls = () => {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = selectedChannel.url;
        video.muted = isMuted;
        video.volume = volume;
        if (isPlaying) {
          video.play().catch((err) => {
            console.warn("Native play failed, requiring interaction:", err);
            setIsPlaying(false);
          });
        }
      } else {
        const HlsClass = (window as any).Hls;
        if (HlsClass && HlsClass.isSupported()) {
          if (hlsInstanceRef.current) {
            hlsInstanceRef.current.destroy();
          }
          hls = new HlsClass({
            maxMaxBufferLength: 10,
            enableWorker: true,
            lowLatencyMode: true
          });
          hlsInstanceRef.current = hls;
          hls.loadSource(selectedChannel.url);
          hls.attachMedia(video);
          hls.on(HlsClass.Events.MANIFEST_PARSED, () => {
            video.muted = isMuted;
            video.volume = volume;
            if (isPlaying) {
              video.play().catch(() => setIsPlaying(false));
            }
          });
          hls.on(HlsClass.Events.ERROR, (event: any, data: any) => {
            if (data.fatal) {
              console.warn("HLS fatal error:", data);
              if (data.type === HlsClass.ErrorTypes.NETWORK_ERROR) {
                hls.startLoad();
              } else if (data.type === HlsClass.ErrorTypes.MEDIA_ERROR) {
                hls.recoverMediaError();
              } else {
                setPlayError("Could not load streaming media. It might be blocked by CORS or offline.");
              }
            }
          });
        } else {
          setPlayError("This browser doesn't support live HLS playback codecs. Try opening the direct link below.");
        }
      }
    };

    // Load HLS library from CDN dynamically, ensuring 0 bundle footprint
    if (!(window as any).Hls) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.4.12';
      script.async = true;
      script.onload = () => {
        initHls();
      };
      document.body.appendChild(script);
    } else {
      initHls();
    }

    return () => {
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
    };
  }, [selectedChannel, isPlaying]);

  // Sync volume & mute state
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = isMuted;
      video.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0) {
      setIsMuted(false);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (selectedChannel.type === 'hls' && video) {
      if (isPlaying) {
        video.pause();
      } else {
        video.play().catch(() => {});
      }
    }
    setIsPlaying(!isPlaying);
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (favorites.includes(id)) {
      setFavorites(favorites.filter(favId => favId !== id));
    } else {
      setFavorites([...favorites, id]);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setShareTooltip(true);
    setTimeout(() => {
      setShareTooltip(false);
    }, 2000);
  };

  // Filter channels based on search & tab selections
  const filteredChannels = channels.filter(channel => {
    const matchesSearch = channel.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          channel.group.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedGroup === 'All') return matchesSearch;
    if (selectedGroup === 'Favorites') return matchesSearch && favorites.includes(channel.id);
    return matchesSearch && channel.group === selectedGroup;
  });

  // Dynamic schedule simulator based on local hour
  const getSimulatedPrograms = () => {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Pick unique show names based on static hashes
    const shows = [
      { name: "Global Mornings & Press Review", desc: "First hand briefings, daily newspapers outline, and live reports." },
      { name: "Live World Dispatch Bulletin", desc: "Interactive global correspondence, breaking updates, and political dispatch." },
      { name: "The National Hour & Finance Debate", desc: "Industrial updates, economic analysis, stakeholder perspectives." },
      { name: "Global Investigative Reports", desc: "Special features on global affairs, documentary loops, and ground investigations." },
      { name: "Prime Time News & Opinion Panel", desc: "In-depth summary of critical events with live roundtables and political commentary." },
      { name: "World Bulletin Late Dispatch", desc: "Evening digest summarizing international dispatches, weather bulletins, and sports." }
    ];

    const currentIdx = Math.floor(currentHour / 4) % shows.length;
    const nextIdx = (currentIdx + 1) % shows.length;

    return {
      current: shows[currentIdx],
      next: shows[nextIdx],
      nextTime: `${((Math.floor(currentHour / 4) + 1) * 4) % 24}:00 Local Hour`
    };
  };

  const program = getSimulatedPrograms();

  const handleCustomM3uLoad = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customM3uUrl) return;

    // Fast-add temporary channel
    const newChan: TVChannel = {
      id: `custom_${Date.now()}`,
      name: customM3uUrl.split('/').pop() || 'Custom IPTV Raw Stream',
      logo: 'https://i.imgur.com/rL2v9pM.png',
      country: 'IPTV',
      group: 'Custom URL',
      url: customM3uUrl,
      type: customM3uUrl.includes('youtube.com') || customM3uUrl.includes('youtu.be') ? 'youtube' : 
            customM3uUrl.includes('twitch.tv') ? 'twitch' : 'hls'
    };

    setChannels([newChan, ...channels]);
    setSelectedChannel(newChan);
    setSelectedGroup('All');
    setCustomM3uUrl('');
  };

  return (
    <div className="space-y-6" id="global-tv-portal">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-red-850 via-neutral-900 to-red-950 text-white rounded-xl p-6 shadow-md border border-neutral-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-red-600 animate-pulse text-white text-[10px] uppercase font-mono font-black px-2 py-0.5 rounded flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-white rounded-full"></span> Live Stream
              </span>
              <span className="text-[10px] font-mono tracking-wider text-red-300 uppercase">Interactive Satellite Television Terminal</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-sans font-black mt-2 tracking-tight flex items-center gap-2">
              <Tv className="w-8 h-8 text-red-500" /> Global Satellite Portal
            </h2>
            <p className="text-xs text-neutral-300 mt-1 max-w-xl leading-relaxed">
              Explore 100+ national television broadcasts directly streamed from satellite links. Toggle stations, search global channels, compile your favorite lineup, or write custom streams.
            </p>
          </div>
          
          {/* Custom Stream Input Form */}
          <form onSubmit={handleCustomM3uLoad} className="flex flex-col sm:flex-row gap-2 shrink-0 md:max-w-md w-full">
            <input 
              type="text" 
              placeholder="Paste HLS URL (.m3u8)"
              className="bg-neutral-950/75 text-xs text-white placeholder-neutral-450 border border-neutral-800 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
              value={customM3uUrl}
              onChange={(e) => setCustomM3uUrl(e.target.value)}
            />
            <button 
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-mono font-bold uppercase py-2 px-3.5 rounded-lg shrink-0 flex items-center gap-1 justify-center transition cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current" /> Load
            </button>
          </form>
        </div>
      </div>

      {/* 2. Main Terminal Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* VIEWING MONITOR FRAME (Cols 1-8) */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-neutral-800 flex flex-col group/player aspect-video">
            {/* Playback Content */}
            <div className="relative flex-1 bg-neutral-950 flex items-center justify-center overflow-hidden">
              
              {/* Fallback Error Overlay */}
              {playError && (
                <div className="absolute inset-0 z-20 bg-neutral-950/95 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-12 h-12 bg-red-950 rounded-full flex items-center justify-center text-red-500 mb-3 border border-red-800">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-sans font-black text-white uppercase tracking-wide">Stream Access Interrupted</h4>
                  <p className="text-xs text-neutral-400 mt-1 max-w-sm leading-relaxed">
                    {playError}
                  </p>
                  <p className="text-[10px] text-neutral-500 mt-1.5 font-mono">
                    URL: {selectedChannel.url}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <a 
                      href={selectedChannel.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-neutral-850 hover:bg-neutral-800 text-white font-mono text-xs font-bold uppercase rounded-lg border border-neutral-700 transition flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Direct Play Link
                    </a>
                    <button 
                      onClick={() => setPlayError(null)}
                      className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white font-mono text-xs font-bold uppercase rounded-lg transition"
                    >
                      Retry Load
                    </button>
                  </div>
                </div>
              )}

              {/* HLS Video Element */}
              {selectedChannel.type === 'hls' && (
                <video 
                  key={`hls-video-${selectedChannel.id}`}
                  ref={videoRef}
                  id="hls-satellite-video"
                  className="w-full h-full object-contain cursor-pointer"
                  onClick={togglePlay}
                  playsInline
                  autoPlay
                />
              )}

              {/* YouTube Live Embed */}
              {selectedChannel.type === 'youtube' && (
                <iframe 
                  key={`yt-iframe-${selectedChannel.id}`}
                  id="yt-satellite-embed"
                  title={selectedChannel.name}
                  src={getEmbedUrl(selectedChannel) || ''}
                  className="w-full h-full border-0 absolute inset-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              )}

              {/* Twitch Embed */}
              {selectedChannel.type === 'twitch' && (
                <iframe 
                  key={`tw-iframe-${selectedChannel.id}`}
                  id="tw-satellite-embed"
                  title={selectedChannel.name}
                  src={getEmbedUrl(selectedChannel) || ''}
                  className="w-full h-full border-0 absolute inset-0 font-sans"
                  allowFullScreen
                />
              )}

              {/* Screen Station Overlay/Overlay details */}
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-white text-xs z-10 flex items-center gap-2 pointer-events-none transition-opacity duration-350 opacity-100 group-hover/player:opacity-100 md:opacity-0">
                <img 
                  src={selectedChannel.logo} 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://i.imgur.com/rL2v9pM.png";
                  }}
                  className="w-4 h-4 object-contain rounded-full bg-white p-0.5" 
                  alt={selectedChannel.name} 
                />
                <span className="font-sans font-black tracking-tight">{selectedChannel.name}</span>
                <span className="text-[10px] font-mono text-neutral-400 bg-white/10 px-1.5 py-0.5 rounded uppercase">
                  {selectedChannel.group}
                </span>
              </div>
            </div>

            {/* Custom Interactive Player Bar (Exclusive to HLS) */}
            {selectedChannel.type === 'hls' && (
              <div className="bg-neutral-900 border-t border-neutral-800 px-4 py-3 flex items-center justify-between gap-4 select-none">
                <div className="flex items-center space-x-3.5">
                  <button 
                    onClick={togglePlay}
                    className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition shrink-0 cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current pl-0.5" />}
                  </button>

                  <button 
                    onClick={toggleMute}
                    className="text-neutral-300 hover:text-white transition cursor-pointer"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4" />}
                  </button>

                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 md:w-24 accent-red-600 h-1 bg-neutral-700 rounded-lg cursor-pointer appearance-none"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <span className="flex items-center gap-1.5 bg-red-950 border border-red-900 px-2.5 py-0.5 rounded text-[10px] font-mono font-black uppercase text-red-400">
                    <span className="w-1.5 h-1.5 bg-red-500 animate-ping rounded-full inline-block"></span>
                    HQ Stream
                  </span>
                  
                  <span className="text-[10px] font-mono text-neutral-400 font-bold hidden sm:inline">
                    LIVE
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Simulated EPG / Program Guide */}
          <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-mono font-black uppercase tracking-wider text-neutral-400 pb-2 border-b border-neutral-100 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-red-500" /> Satellite Live TV Guide
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Now Playing */}
              <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 relative overflow-hidden">
                <span className="absolute top-3 right-3 bg-red-600 text-white text-[8px] font-mono font-black uppercase tracking-widest px-1.5 py-0.5 rounded animate-pulse">
                  Playing Now
                </span>
                <span className="text-[10px] font-mono text-red-600 uppercase font-black tracking-wider">Broadcasting:</span>
                <h4 className="text-sm font-sans font-black text-neutral-950 mt-1">{program.current.name}</h4>
                <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                  {program.current.desc}
                </p>
              </div>

              {/* Next Show */}
              <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-150/75">
                <span className="text-[10px] font-mono text-neutral-400 uppercase font-black tracking-wider">Coming Up:</span>
                <h4 className="text-sm font-sans font-black text-neutral-900 mt-1">{program.next.name}</h4>
                <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                  {program.next.desc}
                </p>
                <span className="text-[9px] font-mono text-neutral-400 block mt-2">
                  Starts at: {program.nextTime}
                </span>
              </div>
            </div>

            {/* Quick Action Link Tools */}
            <div className="flex flex-wrap items-center justify-between pt-2 gap-3">
              <div className="flex items-center space-x-2 text-[11px] text-neutral-400 font-mono">
                <Globe className="w-3.5 h-3.5" />
                <span>Station country: <strong className="text-neutral-750 font-bold">{selectedChannel.group}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={handleShare}
                  className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] font-mono font-bold uppercase rounded-lg transition flex items-center gap-1.5 relative cursor-pointer"
                >
                  {shareTooltip ? (
                    <>
                      <Check className="w-3 h-3 text-red-600" /> Dynamic URL Copied
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" /> Share Satellite
                    </>
                  )}
                </button>
                
                <a 
                  href={selectedChannel.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-[11px] font-mono font-bold uppercase rounded-lg transition flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-red-500" /> Watch External
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* SIDE SATELLITE DIRECTORY BOARD (Cols 9-12) */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          
          <div className="bg-white border border-gray-150 rounded-2xl shadow-sm flex flex-col h-[550px] overflow-hidden">
            {/* Header with search */}
            <div className="p-4 border-b border-gray-100 space-y-3.5 bg-neutral-50/50">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-sans font-black uppercase text-neutral-900 tracking-tight flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-red-600 fill-current animate-pulse" /> Station Directory
                </h3>
                <span className="text-[10px] font-mono text-neutral-400 font-bold shrink-0 bg-neutral-205 p-1 rounded">
                  {filteredChannels.length} listed
                </span>
              </div>

              {/* Directory Filter Search Input */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-neutral-450" />
                <input 
                  type="text"
                  placeholder="Filter station or country..."
                  className="bg-white text-xs border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 w-full focus:outline-none focus:ring-1 focus:ring-red-500 font-sans text-neutral-800 shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Scrolling Groups Bar selection */}
            <div className="border-b border-gray-100 py-2.5 px-3 bg-neutral-50/30 overflow-x-auto whitespace-nowrap scrollbar-thin">
              <div className="flex space-x-1">
                {groups.map(grp => (
                  <button
                    key={grp}
                    onClick={() => setSelectedGroup(grp)}
                    className={`px-3 py-1.25 text-[10px] font-mono font-bold uppercase rounded-lg transition-all flex items-center gap-1 shrink-0 select-none cursor-pointer ${
                      selectedGroup === grp 
                        ? 'bg-neutral-900 text-white shadow' 
                        : 'text-neutral-500 hover:bg-neutral-100'
                    }`}
                  >
                    {grp === 'Favorites' && <Heart className="w-3 h-3 text-red-500 fill-current" />}
                    {grp}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Scrolling Channel items list */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 no-scrollbar">
              {filteredChannels.length === 0 ? (
                <div className="py-20 px-6 text-center">
                  <AlertCircle className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                  <p className="text-xs font-sans text-neutral-500 font-medium">No satellite stations found in this filter branch.</p>
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedGroup('All');
                    }}
                    className="mt-3 font-mono text-[10px] text-red-600 font-bold uppercase hover:underline"
                  >
                    Clear Filter
                  </button>
                </div>
              ) : (
                filteredChannels.map(channel => {
                  const isCurrent = channel.id === selectedChannel.id;
                  const isFavorite = favorites.includes(channel.id);

                  return (
                    <div
                      key={channel.id}
                      onClick={() => {
                        setSelectedChannel(channel);
                        setPlayError(null);
                        setIsPlaying(true);
                      }}
                      className={`p-3.5 flex items-center justify-between gap-3 transition-colors cursor-pointer select-none group/item ${
                        isCurrent 
                          ? 'bg-red-50/70 border-l-3 border-red-600' 
                          : 'hover:bg-neutral-50 border-l-3 border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-3 truncate">
                        <div className="relative">
                          <img 
                            src={channel.logo}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://i.imgur.com/rL2v9pM.png";
                            }}
                            alt={channel.name}
                            className="w-9 h-9 rounded-lg object-contain bg-white border border-gray-150 p-1 flex-shrink-0"
                          />
                          {isCurrent && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-600 rounded-full border border-white animate-ping"></span>
                          )}
                        </div>
                        <div className="truncate text-left">
                          <h4 className={`text-xs font-sans font-black truncate leading-tight ${
                            isCurrent ? 'text-red-750 font-black' : 'text-neutral-900 group-hover/item:text-neutral-950'
                          }`}>
                            {channel.name}
                          </h4>
                          <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider block mt-0.5">
                            {channel.group} ({channel.country})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 opacity-100 lg:opacity-0 group-hover/item:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => toggleFavorite(channel.id, e)}
                          className="p-1.5 hover:bg-neutral-200/50 rounded-lg transition"
                        >
                          <Heart 
                            className={`w-3.5 h-3.5 transition ${
                              isFavorite 
                                ? 'text-red-500 fill-current' 
                                : 'text-neutral-400 group-hover/item:text-neutral-600'
                            }`} 
                          />
                        </button>
                        <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* User Broadcast Tips */}
          <div className="bg-neutral-900 text-neutral-300 rounded-2xl p-4 border border-neutral-850 space-y-2 text-xs">
            <h4 className="font-sans font-bold text-white uppercase tracking-wider flex items-center gap-1 text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> Satellite Signal Tips
            </h4>
            <p className="text-[11px] leading-relaxed text-neutral-400">
              Raw HLS URL streams depend directly on regional broadcaster health and cross-origin (CORS) configurations. If a channel displays a loading block or gets interrupted:
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px] pl-1 font-mono text-neutral-400">
              <li>Open direct video via <strong className="text-white">Watch External</strong></li>
              <li>Toggle between satellite channels</li>
              <li>Check your internet connection speed</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
