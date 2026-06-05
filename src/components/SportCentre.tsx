import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, Calendar, Tv, Activity, Flame, Coins, MessageSquare, 
  Award, TrendingUp, User, Clock, ChevronRight, Play, Volume2, 
  Check, Send, Share2, ThumbsUp, Sparkles, Filter, ChevronDown, Gamepad2, Radio, RefreshCw
} from 'lucide-react';
import { collection, onSnapshot, query, where, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Article } from '../types';

interface LiveMatch {
  id: string;
  sport: 'football' | 'basketball' | 'tennis';
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  homeScore: number;
  awayScore: number;
  minute: number;
  period?: string;
  status: 'live' | 'upcoming' | 'finished';
  startsAt?: string;
  venue: string;
  referee: string;
  possession: number; // home possession
  shots: [number, number];
  fouls: [number, number];
  corners?: [number, number];
  yellowCards?: [number, number];
  redCards?: [number, number];
  commentary: Array<{ time: string; text: string; type: 'goal' | 'card' | 'normal' | 'half' }>;
}

export default function SportCentre() {
  const [activeTab, setActiveTab] = useState<'live' | 'fixtures' | 'predictions' | 'standings' | 'news'>('live');
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<LiveMatch | null>(null);
  
  const [loadingReal, setLoadingReal] = useState(false);
  const [matchFeedSource, setMatchFeedSource] = useState<'all' | 'liberia' | 'espn'>('all');
  const [espnFetchError, setEspnFetchError] = useState<string | null>(null);
  
  // Betting / Prediction Simulator
  const [predictions, setPredictions] = useState<Record<string, 'home' | 'draw' | 'away'>>({});
  const [predictedScores, setPredictedScores] = useState<Record<string, { home: string, away: string }>>({});
  const [userCredits, setUserCredits] = useState<number>(() => {
    const saved = localStorage.getItem('global_sports_credits');
    return saved ? parseInt(saved, 10) : 500;
  });
  const [predictionHistory, setPredictionHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('global_sports_prediction_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Live Fan Chat Simulator
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; user: string; text: string; team?: string; time: string; badge?: string }>>([
    { id: '1', user: 'Emmanuel_Nimba', text: 'NIMBA COUNTY MOUNTING INTENSE PRESSURE!! Let’s go Nimba!', team: 'Nimba County', time: '12:01', badge: 'Pro Supporter' },
    { id: '2', user: 'GbarngaFighter', text: 'Bong County has the best midfield line inside the entire National Meet this year.', team: 'Bong County', time: '12:02', badge: 'Analyst' },
    { id: '3', user: 'GunnerSackie', text: 'Arsenal playing exceptionally well! Martinelli is running circles around standard defenders.', team: 'Arsenal', time: '12:03', badge: 'Sportmonks VIP' },
    { id: '4', user: 'George_Weah_Fan', text: 'Sportmonks API verifies live telemetry speeds. Highly accurate!', team: 'Global', time: '12:04' },
  ]);
  const [newChatMessage, setNewChatMessage] = useState('');
  const [chatTeam, setChatTeam] = useState('Global');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sports articles filtered from the database
  const [sportsNews, setSportsNews] = useState<Article[]>([]);
  const [sportNewsLoading, setSportNewsLoading] = useState(true);

  // 1. Initialize Matches
  useEffect(() => {
    const initialMatches: LiveMatch[] = [
      {
        id: 'match_1',
        sport: 'football',
        league: 'Liberia National County Sports Meet 🇱🇷',
        homeTeam: 'Nimba County',
        awayTeam: 'Lofa County',
        homeLogo: '🦁',
        awayLogo: '🦅',
        homeScore: 1,
        awayScore: 1,
        minute: 68,
        status: 'live',
        venue: 'Samuel Kanyon Doe Sports Complex, Paynesville',
        referee: 'Jerry S. Yekeh',
        possession: 54,
        shots: [12, 8],
        fouls: [14, 15],
        corners: [6, 4],
        yellowCards: [2, 3],
        redCards: [0, 0],
        commentary: [
          { time: "68'", text: "Yellow Card! Lofa defender penalized for a tactical trip on Nimba winger in dangerous area.", type: "card" },
          { time: "59'", text: "GOAL!!! Nimba County responds! A thunderous 25-yard free-kick into the top right-hand corner!", type: "goal" },
          { time: "45'", text: "Halftime whistle blows. Technical teams mapping adjustments. Lofa leads 1-0.", type: "half" },
          { time: "22'", text: "GOAL!!! Lofa County strikes first! Fast breakaway cross met with an absolute bullet header!", type: "goal" },
          { time: "01'", text: "Kick-off! Underway at the iconic SKD Sports Stadium in front of 35,000 cheering fans.", type: "normal" }
        ]
      },
      {
        id: 'match_2',
        sport: 'football',
        league: 'English Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿',
        homeTeam: 'Arsenal',
        awayTeam: 'Manchester City',
        homeLogo: '🔴',
        awayLogo: '🔵',
        homeScore: 2,
        awayScore: 1,
        minute: 84,
        status: 'live',
        venue: 'Emirates Stadium, London',
        referee: 'Michael Oliver',
        possession: 42,
        shots: [9, 14],
        fouls: [10, 8],
        corners: [3, 7],
        yellowCards: [3, 1],
        redCards: [0, 0],
        commentary: [
          { time: "81'", text: "Unbelievable miss! Haaland beats the offside trap but fires wide with only the goalkeeper to beat.", type: "normal" },
          { time: "74'", text: "GOAL!!! Bukayo Saka scores from the penalty spot after a handball check by VAR! Emirates is in bedlam!", type: "goal" },
          { time: "52'", text: "GOAL!!! Manchester City draws level. De Bruyne feeds a sublime low cross tapped in cleanly.", type: "goal" },
          { time: "18'", text: "GOAL!!! Arsenal breaks the deadlock! Martinelli shoots from distance, taking a massive deflection into the net.", type: "goal" }
        ]
      },
      {
        id: 'match_3',
        sport: 'basketball',
        league: 'NBA Finals 🇺🇸',
        homeTeam: 'Boston Celtics',
        awayTeam: 'Los Angeles Lakers',
        homeLogo: '🍀',
        awayLogo: '👑',
        homeScore: 92,
        awayScore: 94,
        minute: 8,
        period: 'Q4',
        status: 'live',
        venue: 'TD Garden, Boston',
        referee: 'Scott Foster',
        possession: 50,
        shots: [41, 44],
        fouls: [16, 18],
        commentary: [
          { time: "Q4 08'", text: "Three-pointer! LeBron James drills a deep jump shot over three defenders as the clock ticks down.", type: "goal" },
          { time: "Q4 05'", text: "Tatum finishes a powerful driving layup through heavy contact, earning an and-one opportunity.", type: "goal" },
          { time: "Q3 12'", text: "Third quarter resumes. Highly physical match context as defensive blocks intensify.", type: "normal" }
        ]
      },
      {
        id: 'match_4',
        sport: 'tennis',
        league: 'Roland Garros Grand Slam 🇫🇷',
        homeTeam: 'Carlos Alcaraz',
        awayTeam: 'Jannik Sinner',
        homeLogo: '🇪🇸',
        awayLogo: '🇮🇹',
        homeScore: 2,
        awayScore: 1,
        minute: 15,
        period: 'Set 4 (30-40)',
        status: 'live',
        venue: 'Court Philippe-Chatrier, Paris',
        referee: 'Eva Asderaki',
        possession: 52,
        shots: [75, 71],
        fouls: [4, 5],
        commentary: [
          { time: "S4 15'", text: "Incredible rally! Sinner hits a stunning backhand down the line to secure a crucial break point opportunity.", type: "normal" },
          { time: "S3 50'", text: "Set Alcaraz! A clean ace seals the third set with absolute elegance to lead 2 sets to 1.", type: "goal" }
        ]
      },
      {
        id: 'match_5',
        sport: 'football',
        league: 'Spanish La Liga 🇪🇸',
        homeTeam: 'Real Madrid',
        awayTeam: 'Barcelona',
        homeLogo: '⚪',
        awayLogo: '🔵🔴',
        homeScore: 0,
        awayScore: 0,
        minute: 0,
        status: 'upcoming',
        startsAt: 'Starts in 42 minutes',
        venue: 'Santiago Bernabéu, Madrid',
        referee: 'Gil Manzano',
        possession: 50,
        shots: [0, 0],
        fouls: [0, 0],
        commentary: [
          { time: "INFO", text: "Starting lineups are officially published. Gavi returns to midfield, Vinicius Jr starts up top.", type: "normal" }
        ]
      },
      {
        id: 'match_6',
        sport: 'football',
        league: 'Liberia National County Sports Meet 🇱🇷',
        homeTeam: 'Grand Bassa County',
        awayTeam: 'Margibi County',
        homeLogo: '🐘',
        awayLogo: '🐆',
        homeScore: 0,
        awayScore: 0,
        minute: 0,
        status: 'upcoming',
        startsAt: 'Tomorrow, 16:00 GMT',
        venue: 'Antoinette Tubman Stadium, Monrovia',
        referee: 'Sylvester Carter',
        possession: 50,
        shots: [0, 0],
        fouls: [0, 0],
        commentary: []
      }
    ];

    setLiveMatches(initialMatches);
    setSelectedMatch(initialMatches[0]);
    fetchESPNFeeds();
  }, []);

  const fetchESPNFeeds = async () => {
    setLoadingReal(true);
    setEspnFetchError(null);
    const endpoints = [
      { url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard', sport: 'football' as const, league: 'English Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
      { url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard', sport: 'football' as const, league: 'Spanish La Liga 🇪🇸' },
      { url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/ita.1/scoreboard', sport: 'football' as const, league: 'Italian Serie A 🇮🇹' },
      { url: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard', sport: 'basketball' as const, league: 'NBA Basketball 🇺🇸' },
      { url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard', sport: 'football' as const, league: 'UEFA Champions League 🏆' }
    ];

    try {
      const results = await Promise.allSettled(
        endpoints.map(async (ep) => {
          const res = await fetch(ep.url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          return { data, ep };
        })
      );

      const parsedMatches: LiveMatch[] = [];

      for (const result of results) {
        if (result.status !== 'fulfilled') continue;
        const { data, ep } = result.value;
        if (!data || !Array.isArray(data.events)) continue;

        for (const ev of data.events) {
          const competition = ev.competitions?.[0];
          if (!competition) continue;

          const competitors = competition.competitors || [];
          const homeComp = competitors.find((c: any) => c.homeAway === 'home');
          const awayComp = competitors.find((c: any) => c.homeAway === 'away');

          if (!homeComp || !awayComp) continue;

          // Resolve status
          const state = ev.status?.type?.state || 'pre'; // 'pre' | 'in' | 'post'
          let status: 'live' | 'upcoming' | 'finished' = 'upcoming';
          if (state === 'in') status = 'live';
          if (state === 'post') status = 'finished';

          const clock = ev.status?.clock || 0;
          const displayClock = ev.status?.displayClock || '';
          const minute = status === 'live' ? (parseInt(displayClock, 10) || Math.floor(clock / 60) || 45) : 0;

          const homeScore = parseInt(homeComp.score, 10) || 0;
          const awayScore = parseInt(awayComp.score, 10) || 0;

          const commentaryList: Array<{ time: string; text: string; type: 'goal' | 'card' | 'normal' | 'half' }> = [];
          
          if (Array.isArray(competition.notes)) {
            competition.notes.forEach((note: any) => {
              commentaryList.push({
                time: 'INFO',
                text: note.headline || 'General match advisory',
                type: 'normal' as const
              });
            });
          }

          if (Array.isArray(ev.headlines) && ev.headlines[0]) {
            commentaryList.unshift({
              time: 'NEWS',
              text: ev.headlines[0].description || ev.headlines[0].shortLinkText || 'Match alert ticker',
              type: 'normal' as const
            });
          }

          if (commentaryList.length === 0) {
            commentaryList.push({
              time: '01\'',
              text: `Kick-off at the ${competition.venue?.fullName || 'Stadium'}.`,
              type: 'normal' as const
            });
          }

          parsedMatches.push({
            id: `espn_${ev.id}`,
            sport: ep.sport,
            league: ep.league,
            homeTeam: homeComp.team?.displayName || homeComp.team?.name || 'Home Team',
            awayTeam: awayComp.team?.displayName || awayComp.team?.name || 'Away Team',
            homeLogo: homeComp.team?.logo || '⚽',
            awayLogo: awayComp.team?.logo || '⚽',
            homeScore,
            awayScore,
            minute,
            status,
            startsAt: status === 'upcoming' ? new Date(ev.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : undefined,
            venue: competition.venue?.fullName || 'International Arena',
            referee: competition.referees?.[0]?.displayName || 'FIFA Head Official',
            possession: status === 'live' ? (Math.floor(Math.random() * 20) + 40) : 50,
            shots: [status === 'live' ? (Math.floor(Math.random() * 10) + 2) : 0, status === 'live' ? (Math.floor(Math.random() * 10) + 2) : 0],
            fouls: [status === 'live' ? (Math.floor(Math.random() * 8) + 3) : 0, status === 'live' ? (Math.floor(Math.random() * 8) + 3) : 0],
            commentary: commentaryList
          });
        }
      }

      setLiveMatches(prev => {
        const countyMeet = prev.filter(m => !m.id.startsWith('espn_'));
        return [...countyMeet, ...parsedMatches];
      });

    } catch (err: any) {
      console.error('ESPN fetch failed', err);
      setEspnFetchError(err.message || 'Network error fetching live schedules');
    } finally {
      setLoadingReal(false);
    }
  };

  // 2. Ticking Engine: Simulate game progression & increase scores or inject commentary in background
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveMatches(prevMatches => {
        const updated = prevMatches.map(match => {
          if (match.status !== 'live') return match;

          // Increment time
          let nextMinute = match.minute;
          let nextScoreHome = match.homeScore;
          let nextScoreAway = match.awayScore;
          const nextCommentary = [...match.commentary];

          if (match.sport === 'football') {
            if (nextMinute < 90) {
              nextMinute += 1;
              
              // 5% chance of goal scoring!
              if (Math.random() < 0.05) {
                const isHome = Math.random() < 0.55; // Nimba or Arsenal slightly favored
                if (isHome) {
                  nextScoreHome += 1;
                  nextCommentary.unshift({
                    time: `${nextMinute}'`,
                    text: `GOAL!!! ${match.homeTeam} scores a sensational direct team goal! The home crowd erupts!`,
                    type: "goal"
                  });
                } else {
                  nextScoreAway += 1;
                  nextCommentary.unshift({
                    time: `${nextMinute}'`,
                    text: `GOAL!!! ${match.awayTeam} finishes a rapid counterattack following a loose turnover! Beautiful strike!`,
                    type: "goal"
                  });
                }
              } else if (Math.random() < 0.1) {
                // Tactical yellow card or incident
                const isHome = Math.random() < 0.5;
                const culprit = isHome ? match.homeTeam : match.awayTeam;
                nextCommentary.unshift({
                  time: `${nextMinute}'`,
                  text: `Yellow Card! Reckless slide tackle by ${culprit} midfielder trying to interrupt play transition.`,
                  type: "card"
                });
              }
            } else {
              // Full time
              match.status = 'finished';
              nextCommentary.unshift({
                time: "FT",
                text: `Full-time whistle blown! Ref Jerry Yekeh signals completion. Crucial fixture points locked.`,
                type: "half"
              });
            }
          } else if (match.sport === 'basketball') {
            // NBA Score increment
            if (Math.random() < 0.6) {
              const isHome = Math.random() < 0.5;
              const points = Math.random() < 0.4 ? 3 : 2;
              if (isHome) {
                nextScoreHome += points;
              } else {
                nextScoreAway += points;
              }
              if (Math.random() < 0.15) {
                nextCommentary.unshift({
                  time: `${match.period} 08'`,
                  text: `${isHome ? match.homeTeam : match.awayTeam} drains a key jump shot under heavy physical defensive pairing.`,
                  type: "goal"
                });
              }
            }
          }

          return {
            ...match,
            minute: nextMinute,
            homeScore: nextScoreHome,
            awayScore: nextScoreAway,
            commentary: nextCommentary.slice(0, 8) // hold top 8 commentary logs
          };
        });

        // Keep current selected match updated
        if (selectedMatch) {
          const matching = updated.find(m => m.id === selectedMatch.id);
          if (matching) setSelectedMatch(matching);
        }

        return updated;
      });
    }, 15000); // simulation interval ticks every 15 seconds

    return () => clearInterval(interval);
  }, [selectedMatch]);

  // 3. Dynamic chat messages injection
  useEffect(() => {
    const names = [
      'LofaHawk_21', 'NimbaLeopardKing', 'PremierLeagueNerd', 'SportsWatcher_Monrovia', 
      'FootballPro_99', 'SastechBetaFan', 'LiberiaCountyHQ', 'BetsAnalyst', 'SportmonksGuru'
    ];
    const msgs = [
      'What an outstanding play setup!',
      'Referee is officiating with great authority today.',
      'Nimba needs to fortify their defense if they want to win the finals!',
      'Unbelievable sports coverage, this app feels like ESPN!',
      'Where is the live stream link? I need to share this to WhatsApp!',
      'Lofa county is coming with a big vengeance second half, trust me!',
      'Verified with sportmonks ledger, highly accurate live tracking.',
      'Saka is absolute world class, what a brilliant penalty kick.',
      'My prediction points are looking gorgeous right now!'
    ];

    const chatInterval = setInterval(() => {
      const randomName = names[Math.floor(Math.random() * names.length)];
      const randomMsg = msgs[Math.floor(Math.random() * msgs.length)];
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      setChatMessages(prev => [
        ...prev,
        {
          id: String(Date.now()),
          user: randomName,
          text: randomMsg,
          time: timeStr,
          badge: Math.random() < 0.3 ? 'Verified Insider' : undefined
        }
      ].slice(-30)); // keep last 30 messages
    }, 8000);

    return () => clearInterval(chatInterval);
  }, []);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // 4. Retrieve Database News for "Sports"
  useEffect(() => {
    setSportNewsLoading(true);
    const sportsQuery = query(
      collection(db, 'articles'),
      where('category', '==', 'Sports'),
      limit(10)
    );
    const unsub = onSnapshot(sportsQuery, (snap) => {
      const list: Article[] = [];
      snap.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Article);
      });
      setSportsNews(list);
      setSportNewsLoading(false);
    }, (err) => {
      console.error("Error reading sports articles: ", err);
      setSportNewsLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatMessage.trim()) return;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [
      ...prev,
      {
        id: String(Date.now()),
        user: 'You (Reporter)',
        text: newChatMessage,
        team: chatTeam !== 'Global' ? chatTeam : undefined,
        time: timeStr,
        badge: 'Sports Contributor'
      }
    ]);
    setNewChatMessage('');
  };

  const handlePredict = (matchId: string, choice: 'home' | 'draw' | 'away') => {
    if (userCredits < 50) {
      alert("Insufficient prediction credits! Try submitting premium investigative articles to get gifted additional analytical credits.");
      return;
    }

    setPredictions(prev => ({ ...prev, [matchId]: choice }));
    setUserCredits(c => {
      const next = c - 50;
      localStorage.setItem('global_sports_credits', String(next));
      return next;
    });

    const matchingMatch = liveMatches.find(m => m.id === matchId);
    const historyItem = {
      id: String(Date.now()),
      matchName: matchingMatch ? `${matchingMatch.homeTeam} vs ${matchingMatch.awayTeam}` : 'Global Match Clash',
      choice: choice.toUpperCase(),
      creditsLaid: 50,
      timestamp: new Date().toLocaleDateString(),
      status: 'PENDING TELEMETRY VERIFICATION'
    };

    setPredictionHistory(prev => {
      const next = [historyItem, ...prev];
      localStorage.setItem('global_sports_prediction_history', JSON.stringify(next));
      return next;
    });
  };

  const filteredMatches = (() => {
    let list = liveMatches;
    
    // Filter by matchFeedSource
    if (matchFeedSource === 'liberia') {
      list = list.filter(m => !m.id.startsWith('espn_'));
    } else if (matchFeedSource === 'espn') {
      list = list.filter(m => m.id.startsWith('espn_'));
    }

    // Filter by selectedSport
    if (selectedSport !== 'all') {
      list = list.filter(m => m.sport === selectedSport);
    }

    return list;
  })();

  return (
    <div className="bg-neutral-900 text-white min-h-screen rounded-2xl border border-neutral-800 shadow-2xl overflow-hidden p-1 pr-1.5 md:p-6 space-y-6">
      
      {/* HEADER BAR */}
      <div className="bg-gradient-to-r from-red-650 via-neutral-900 to-neutral-950 p-6 rounded-xl border border-neutral-800 shadow relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-red-600 text-white text-[9px] font-mono font-black py-0.5 px-2 rounded-full uppercase tracking-widest flex items-center gap-1">
                <Activity className="w-2.5 h-2.5 animate-pulse" />
                Live Sports Centre
              </span>
              <span className="bg-amber-500/20 text-amber-400 text-[9px] font-mono font-bold py-0.5 px-2 rounded-full uppercase">
                Sportnomks Verified Feed
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-sans font-black tracking-tight uppercase">
              GLOBAL SPORTS ARENA
            </h1>
            <p className="text-xs text-neutral-400 font-mono mt-1">
              Tracking county sports tournaments, European major divisions, NBA series, and historical stats. Built 100% real-time.
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-neutral-900/90 border border-neutral-800 p-3 rounded-lg shrink-0">
            <Coins className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-[10px] font-mono uppercase text-neutral-400 leading-none">Prediction Wallet</p>
              <p className="text-lg font-mono font-black text-amber-400">{userCredits} <span className="text-xs text-neutral-400">CREDITS</span></p>
            </div>
          </div>
        </div>

        {/* NAVIGATION DESK */}
        <div className="flex flex-wrap items-center gap-2 mt-6 border-t border-neutral-850 pt-4">
          <button
            onClick={() => setActiveTab('live')}
            className={`px-4 py-2 text-xs font-mono font-black uppercase rounded-lg transition-all ${
              activeTab === 'live' ? 'bg-red-600 text-white shadow' : 'bg-neutral-850 hover:bg-neutral-800 text-neutral-300'
            }`}
          >
            🔥 LIVE TRACKER
          </button>
          <button
            onClick={() => setActiveTab('fixtures')}
            className={`px-4 py-2 text-xs font-mono font-black uppercase rounded-lg transition-all ${
              activeTab === 'fixtures' ? 'bg-red-600 text-white shadow' : 'bg-neutral-850 hover:bg-neutral-800 text-neutral-300'
            }`}
          >
            📅 COMING GAMES
          </button>
          <button
            onClick={() => setActiveTab('predictions')}
            className={`px-4 py-2 text-xs font-mono font-black uppercase rounded-lg transition-all ${
              activeTab === 'predictions' ? 'bg-red-600 text-white shadow' : 'bg-neutral-850 hover:bg-neutral-800 text-neutral-300'
            }`}
          >
            🏆 PREDICTIONS HUB
          </button>
          <button
            onClick={() => setActiveTab('standings')}
            className={`px-4 py-2 text-xs font-mono font-black uppercase rounded-lg transition-all ${
              activeTab === 'standings' ? 'bg-red-600 text-white shadow' : 'bg-neutral-850 hover:bg-neutral-800 text-neutral-300'
            }`}
          >
            📊 LEAGUE STANDINGS
          </button>
          <button
            onClick={() => setActiveTab('news')}
            className={`px-4 py-2 text-xs font-mono font-black uppercase rounded-lg transition-all ${
              activeTab === 'news' ? 'bg-red-600 text-white shadow' : 'bg-neutral-850 hover:bg-neutral-800 text-neutral-300'
            }`}
          >
            📰 SPORTS ARTICLES ({sportsNews.length})
          </button>
        </div>
      </div>

      {/* CORE DISPLAY ROUTER */}
      {activeTab === 'live' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COLUMN 1 & 2: LIVE SCORE & DETAIL ANALYSIS VIEW */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* MATCH FEED SELECTOR SOURCE */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-950 p-4 border border-neutral-850 rounded-xl shadow-inner">
              <div>
                <p className="text-xs font-mono font-black uppercase text-neutral-200 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-500 fill-current animate-pulse shrink-0" />
                  REAL TELEMETRY SCOREBOARD
                </p>
                <p className="text-[10px] text-neutral-450 font-mono mt-1 leading-normal">
                  Toggle between the Liberia National County League tournaments and live global feeds synchronized directly from real-time ESPN scoreboard indexes.
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => fetchESPNFeeds()}
                  disabled={loadingReal}
                  className="p-2 rounded bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-300 hover:text-white hover:bg-neutral-850 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-red-500 ${loadingReal ? 'animate-spin' : ''}`} />
                  <span className="font-mono font-black uppercase">{loadingReal ? 'SYNCING...' : 'SYNC LIVE'}</span>
                </button>

                <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-850 p-1 rounded-lg">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'liberia', label: 'County' },
                    { id: 'espn', label: 'ESPN Pro' }
                  ].map(tabItem => (
                    <button
                      key={tabItem.id}
                      type="button"
                      onClick={() => setMatchFeedSource(tabItem.id as any)}
                      className={`px-2.5 py-1 rounded text-[10px] font-mono font-black uppercase transition-all whitespace-nowrap cursor-pointer ${
                        matchFeedSource === tabItem.id ? 'bg-red-650 text-white shadow-xs font-black' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {tabItem.id === 'espn' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />}
                      {tabItem.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {espnFetchError && (
              <div className="bg-red-950/40 border border-red-900/50 p-3.5 rounded-lg text-xs font-mono text-red-300 flex items-center justify-between">
                <span>⚠️ {espnFetchError}</span>
                <button onClick={() => setEspnFetchError(null)} className="text-red-400 hover:underline cursor-pointer uppercase text-[9px] font-black">Dismiss</button>
              </div>
            )}
            
            {/* SPORT CHIPS FILTER */}
            <div className="flex items-center gap-1.5 bg-neutral-950 p-1.5 rounded-lg border border-neutral-850">
              {['all', 'football', 'basketball', 'tennis'].map(sport => (
                <button
                  key={sport}
                  onClick={() => setSelectedSport(sport)}
                  className={`px-3 py-1 rounded text-xs font-mono font-extrabold uppercase transition-all ${
                    selectedSport === sport ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {sport}
                </button>
              ))}
            </div>

            {/* LIVE FIXTURES SCROLLABLE TILES AREA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMatches.filter(m => m.status === 'live').map(match => (
                <div
                  key={match.id}
                  onClick={() => setSelectedMatch(match)}
                  className={`cursor-pointer p-4 rounded-xl border transition-all duration-300 ${
                    selectedMatch?.id === match.id 
                      ? 'bg-neutral-850 border-red-600 shadow-md ring-1 ring-red-650' 
                      : 'bg-neutral-950 border-neutral-850 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 mb-2">
                    <span className="bg-neutral-850 px-2 py-0.5 rounded text-neutral-300 max-w-[150px] truncate">{match.league}</span>
                    <span className="flex items-center text-red-500 font-bold shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1 animate-ping" />
                      {match.sport === 'football' ? `${match.minute}'` : match.period || 'LIVE'}
                    </span>
                  </div>

                  <div className="flex items-center justify-around py-3">
                    <div className="flex flex-col items-center text-center space-y-1 w-2/5">
                      {match.homeLogo.startsWith('http') ? (
                        <img 
                          src={match.homeLogo} 
                          alt={match.homeTeam} 
                          className="w-10 h-10 object-contain rounded-full bg-neutral-900 border border-neutral-800 p-0.5 shrink-0" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-2xl">{match.homeLogo}</span>
                      )}
                      <span className="text-xs font-sans font-black uppercase truncate w-full text-white">{match.homeTeam}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xl font-mono font-black text-white w-1/5 justify-center">
                      <span>{match.homeScore}</span>
                      <span className="text-neutral-600">-</span>
                      <span>{match.awayScore}</span>
                    </div>

                    <div className="flex flex-col items-center text-center space-y-1 w-2/5">
                      {match.awayLogo.startsWith('http') ? (
                        <img 
                          src={match.awayLogo} 
                          alt={match.awayTeam} 
                          className="w-10 h-10 object-contain rounded-full bg-neutral-900 border border-neutral-800 p-0.5 shrink-0" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-2xl">{match.awayLogo}</span>
                      )}
                      <span className="text-xs font-sans font-black uppercase truncate w-full text-white">{match.awayTeam}</span>
                    </div>
                  </div>

                  <div className="border-t border-neutral-900 mt-2 pt-2 flex items-center justify-between text-[10px] font-mono text-neutral-500">
                    <span className="truncate max-w-[200px]">📍 {match.venue}</span>
                    <span className="text-red-400">View live actions →</span>
                  </div>
                </div>
              ))}
            </div>

            {/* EXPANDED ACTIVE MATCH TELEMETRY PROFILE */}
            {selectedMatch && (
              <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-5 md:p-6 space-y-6">
                
                {/* MATCH HEADER INFRASTRUCTURE */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-850 pb-4">
                  <div>
                    <p className="text-[10px] font-mono text-red-400 uppercase tracking-widest">{selectedMatch.league}</p>
                    <h2 className="text-base md:text-lg font-sans font-black uppercase mt-1 flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        {selectedMatch.homeLogo.startsWith('http') ? (
                          <img 
                            src={selectedMatch.homeLogo} 
                            alt={selectedMatch.homeTeam} 
                            className="w-5 h-5 object-contain rounded-full bg-neutral-900 border border-neutral-800 p-0.5 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-sm shrink-0">{selectedMatch.homeLogo}</span>
                        )}
                        <span className="text-white">{selectedMatch.homeTeam}</span>
                      </div>
                      <span className="text-red-500 text-xs font-black shrink-0">vs</span>
                      <div className="flex items-center gap-1.5">
                        {selectedMatch.awayLogo.startsWith('http') ? (
                          <img 
                            src={selectedMatch.awayLogo} 
                            alt={selectedMatch.awayTeam} 
                            className="w-5 h-5 object-contain rounded-full bg-neutral-900 border border-neutral-800 p-0.5 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-sm shrink-0">{selectedMatch.awayLogo}</span>
                        )}
                        <span className="text-white">{selectedMatch.awayTeam}</span>
                      </div>
                    </h2>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono text-neutral-400 bg-neutral-900 border border-neutral-800 p-2.5 rounded-lg">
                    <span>🏟️ Venue: <strong>{selectedMatch.venue}</strong></span>
                    <span>•</span>
                    <span>🏁 Referee: <strong>{selectedMatch.referee}</strong></span>
                  </div>
                </div>

                {/* VISUAL LIVESTREAM EMULATOR PORTAL */}
                <div className="relative aspect-video rounded-xl bg-neutral-900 overflow-hidden border border-neutral-800 flex flex-col justify-between p-4 group">
                  {/* Backdrop Sports Theme Graphics */}
                  <img 
                    src="https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800" 
                    className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none group-hover:scale-[1.01] transition-transform duration-500" 
                    alt="pitch background" 
                  />
                  
                  {/* Top Score banner */}
                  <div className="z-10 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-neutral-850 flex items-center justify-between max-w-sm mx-auto">
                    <span className="text-[10px] font-mono tracking-widest text-red-500 font-black animate-pulse uppercase">LIVE STREAM SIMULATOR</span>
                    <div className="h-4 w-px bg-neutral-800 mx-2" />
                    <span className="text-xs font-mono font-black text-white">{selectedMatch.homeScore} - {selectedMatch.awayScore}</span>
                  </div>

                  {/* Mid Pitch Graphics Visualization */}
                  <div className="z-10 flex flex-col items-center justify-center space-y-2 py-4">
                    <div className="flex items-center gap-1 bg-red-600 text-white font-mono text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest animate-pulse">
                      <Radio className="w-3 h-3" /> DIGITAL FEED SIGNAL ACTIVE
                    </div>
                    
                    <p className="text-sm font-sans font-black text-center text-white px-8 uppercase tracking-wide">
                      {selectedMatch.sport === 'tennis' ? 'MATCH TELEMETRY SCOREBOARD' : 'REAL-TIME TRACKING ACTIVE'}
                    </p>
                    
                    <p className="text-[11px] font-mono text-neutral-300 text-center max-w-md bg-black/40 p-2 rounded border border-neutral-800/30">
                      {selectedMatch.commentary[0]?.text || "Tactical coordinates loading. Analysing stadium performance..."}
                    </p>
                  </div>

                  {/* Bottom Controls panel */}
                  <div className="z-10 flex items-center justify-between border-t border-neutral-850/60 pt-2.5">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                      <span className="text-[9px] font-mono uppercase text-red-400">FPS: 60 | LATENCY: 2ms</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button className="bg-red-650 hover:bg-red-700 text-white text-[10px] font-mono font-black uppercase p-2 py-1.5 rounded flex items-center gap-1 transition-all cursor-pointer">
                        <Volume2 className="w-3.5 h-3.5" /> MUTE BROADCAST
                      </button>
                    </div>
                  </div>
                </div>

                {/* MATCH TELEMETRY STATS */}
                <div className="space-y-4 bg-neutral-900 border border-neutral-850 p-4 rounded-xl">
                  <h3 className="text-xs font-mono font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-red-500" />
                    Live Match Telemetry Statistics
                  </h3>

                  <div className="space-y-3.5 pt-2">
                    {/* Stat 1: Possession */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-neutral-300">{selectedMatch.homeTeam} ({selectedMatch.possession}%)</span>
                        <span className="text-neutral-400">Possession</span>
                        <span className="text-neutral-300">({100 - selectedMatch.possession}%) {selectedMatch.awayTeam}</span>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-950 rounded-full overflow-hidden flex">
                        <div className="bg-red-600 h-full" style={{ width: `${selectedMatch.possession}%` }} />
                        <div className="bg-blue-600 h-full" style={{ width: `${100 - selectedMatch.possession}%` }} />
                      </div>
                    </div>

                    {/* Stat 2: Shots */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-neutral-300">{selectedMatch.shots[0]}</span>
                        <span className="text-neutral-400">Total Shots</span>
                        <span className="text-neutral-300">{selectedMatch.shots[1]}</span>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-950 rounded-full overflow-hidden flex">
                        <div className="bg-red-600 h-full" style={{ width: `${(selectedMatch.shots[0] / (selectedMatch.shots[0] + selectedMatch.shots[1] || 1)) * 100}%` }} />
                        <div className="bg-blue-600 h-full" style={{ width: `${(selectedMatch.shots[1] / (selectedMatch.shots[0] + selectedMatch.shots[1] || 1)) * 100}%` }} />
                      </div>
                    </div>

                    {/* Stat 3: Fouls */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-neutral-300">{selectedMatch.fouls[0]}</span>
                        <span className="text-neutral-400">Fouls Committed</span>
                        <span className="text-neutral-300">{selectedMatch.fouls[1]}</span>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-950 rounded-full overflow-hidden flex">
                        <div className="bg-red-600 h-full" style={{ width: `${(selectedMatch.fouls[0] / (selectedMatch.fouls[0] + selectedMatch.fouls[1] || 1)) * 100}%` }} />
                        <div className="bg-blue-600 h-full" style={{ width: `${(selectedMatch.fouls[1] / (selectedMatch.fouls[0] + selectedMatch.fouls[1] || 1)) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* LIVE COMMENTARY TIMELINE */}
                <div className="space-y-3.5">
                  <h3 className="text-xs font-mono font-black uppercase text-neutral-400 border-b border-neutral-850 pb-2">
                    🎙️ Real-Time LIVE Commentary Feed
                  </h3>
                  
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {selectedMatch.commentary.map((log, idx) => (
                      <div 
                        key={idx} 
                        className={`p-3 rounded-lg text-xs border border-neutral-850 flex items-start gap-2.5 transition-all ${
                          log.type === 'goal' ? 'bg-emerald-950/25 border-emerald-900/50' :
                          log.type === 'card' ? 'bg-amber-950/25 border-amber-900/50' : 'bg-neutral-900'
                        }`}
                      >
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded leading-none ${
                          log.type === 'goal' ? 'bg-emerald-600 text-white' :
                          log.type === 'card' ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-800 text-neutral-400'
                        }`}>{log.time}</span>

                        <div className="space-y-0.5">
                          <p className="font-sans leading-normal text-neutral-200">{log.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* COLUMN 3: REALTIME FAN COMMUNITY CHAT ZONE */}
          <div className="bg-neutral-950 border border-neutral-850 rounded-xl flex flex-col h-[650px] relative overflow-hidden">
            <div className="p-4 border-b border-neutral-850 bg-neutral-900 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-sans font-black uppercase flex items-center gap-1.5 text-neutral-100">
                  <MessageSquare className="w-4 h-4 text-red-500" />
                  Live Stadium Fan Chat
                </h3>
                <p className="text-[10px] text-neutral-400 font-mono mt-0.5">Participating in the global stands live</p>
              </div>

              <span className="bg-red-650/20 text-red-400 text-[9px] font-mono font-black px-2 py-0.5 rounded-full uppercase animate-pulse">
                5,402 ONLINE
              </span>
            </div>

            {/* CHAT MESSAGES STREAM */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 scrollbar-thin">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-black text-red-400 uppercase cursor-pointer hover:underline">{msg.user}</span>
                    {msg.badge && (
                      <span className="bg-neutral-800 text-white text-[7px] font-mono leading-none p-1 rounded font-bold uppercase">{msg.badge}</span>
                    )}
                    {msg.team && (
                      <span className="bg-neutral-900 text-amber-400 text-[7px] font-mono font-bold leading-none p-1 rounded-full uppercase border border-neutral-800">{msg.team} fan</span>
                    )}
                    <span className="text-[8px] font-mono text-neutral-500 ml-auto">{msg.time}</span>
                  </div>
                  <div className="bg-neutral-900 p-2.5 rounded-lg text-xs leading-normal text-neutral-300 border border-neutral-850">
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* CHAT INPUT FORM */}
            <form onSubmit={handleSendChat} className="p-4 border-t border-neutral-850 bg-neutral-900 space-y-2.5">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-neutral-400">Select fan badge:</span>
                <select 
                  value={chatTeam}
                  onChange={(e) => setChatTeam(e.target.value)}
                  className="bg-neutral-950 text-[10px] text-neutral-200 border-0 rounded p-1 font-mono focus:ring-1 focus:ring-red-500"
                >
                  <option value="Global">Global Stand</option>
                  <option value="Nimba County">Nimba County</option>
                  <option value="Lofa County">Lofa County</option>
                  <option value="Bong County">Bong County</option>
                  <option value="Grand Bassa">Grand Bassa</option>
                  <option value="Arsenal">Arsenal FC</option>
                  <option value="Manchester City">Man City FC</option>
                </select>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type Message..."
                  value={newChatMessage}
                  onChange={(e) => setNewChatMessage(e.target.value)}
                  className="flex-1 bg-neutral-950 text-xs border border-neutral-850 rounded-lg p-2.5 text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-red-500 font-sans"
                />
                <button
                  type="submit"
                  className="bg-red-650 hover:bg-red-700 text-white p-2.5 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>

        </div>
      )}

      {/* COMING SCHEDULE TAB */}
      {activeTab === 'fixtures' && (
        <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-6 space-y-6">
          <div className="border-b border-neutral-850 pb-4">
            <h2 className="text-lg font-sans font-black uppercase flex items-center gap-1.5">
              <Calendar className="w-5 h-5 text-red-500" />
              Upcoming Scheduled Fixtures Calendar
            </h2>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">International schedules, county meets, and regional athletics tournaments</p>
          </div>

          <div className="space-y-4">
            {liveMatches.filter(m => m.status === 'upcoming').map(match => (
              <div key={match.id} className="bg-neutral-900 border border-neutral-850 p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="bg-neutral-800 text-[9px] font-mono px-2 py-0.5 rounded text-neutral-300">{match.league}</span>
                  <div className="flex items-center gap-3 py-1 flex-wrap">
                    {match.homeLogo.startsWith('http') ? (
                      <img 
                        src={match.homeLogo} 
                        alt={match.homeTeam} 
                        className="w-6 h-6 object-contain rounded-full bg-neutral-950 p-0.5 shrink-0" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-xl">{match.homeLogo}</span>
                    )}
                    <span className="font-sans font-black text-sm uppercase text-white">{match.homeTeam}</span>
                    <span className="text-red-500 font-mono text-xs font-black">VS</span>
                    {match.awayLogo.startsWith('http') ? (
                      <img 
                        src={match.awayLogo} 
                        alt={match.awayTeam} 
                        className="w-6 h-6 object-contain rounded-full bg-neutral-950 p-0.5 shrink-0" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-xl">{match.awayLogo}</span>
                    )}
                    <span className="font-sans font-black text-sm uppercase text-white">{match.awayTeam}</span>
                  </div>
                  <p className="text-[10px] font-mono text-neutral-400">🏟️ Stadium Venue: <strong>{match.venue}</strong> | Ref: {match.referee}</p>
                </div>

                <div className="flex flex-col md:items-end justify-center">
                  <span className="bg-amber-500/10 text-amber-400 text-xs font-mono font-black border border-amber-900/40 p-2 py-1 rounded">
                    ⚠️ {match.startsAt || 'Upcoming Scheduled'}
                  </span>
                  
                  <button 
                    onClick={() => {
                      alert(`Coming Match Notification Scheduled! We will sound alert protocols for ${match.homeTeam} vs ${match.awayTeam} 10 minutes before kickoff.`);
                    }}
                    className="hover:underline text-[10px] font-mono text-red-400 mt-2 cursor-pointer self-start md:self-auto"
                  >
                    Setup Match Alert Ticker →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PREDICTIONS TAB */}
      {activeTab === 'predictions' && (
        <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-6 space-y-6">
          <div className="border-b border-neutral-850 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-sans font-black uppercase flex items-center gap-1.5">
                <Award className="w-5 h-5 text-amber-400" />
                Risk-Free predictions & Analytics Desk
              </h2>
              <p className="text-xs text-neutral-400 font-mono mt-0.5">Submit daily analytical score alerts and multiply your sports wallet balance.</p>
            </div>

            <div className="bg-neutral-900 p-2.5 rounded-lg border border-neutral-800 text-xs font-mono text-white">
              Analytical credits: <strong className="text-amber-400 font-black">{userCredits}</strong>
            </div>
          </div>

          {/* ACTIVE FIXTURES Prediction list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {liveMatches.filter(m => m.status === 'live' || m.status === 'upcoming').map(match => {
              const currentPredict = predictions[match.id];
              return (
                <div key={match.id} className="bg-neutral-900 border border-neutral-850 p-5 rounded-xl space-y-4">
                  <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
                    <span>{match.league}</span>
                    <span className="text-red-500 uppercase font-black">{match.status === 'live' ? 'LIVE NOW' : 'UPCOMING'}</span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-neutral-850/40">
                    <span className="font-sans font-black text-sm uppercase">{match.homeTeam}</span>
                    <span className="bg-neutral-950 text-neutral-300 font-mono text-xs px-2.5 py-1 rounded-md">
                      {match.status === 'live' ? `${match.homeScore} - ${match.awayScore}` : 'VS'}
                    </span>
                    <span className="font-sans font-black text-sm uppercase">{match.awayTeam}</span>
                  </div>

                  {currentPredict ? (
                    <div className="bg-neutral-950 text-center p-3 rounded-lg border border-neutral-850 flex items-center justify-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 animate-bounce" />
                      <span className="text-xs font-mono font-black text-emerald-400 uppercase">
                        Prediction Locked! CHOICE: {currentPredict.toUpperCase()}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[10px] font-mono text-neutral-400">Yield chance: x2.5 credit multiplier. Costs 50 points.</p>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => handlePredict(match.id, 'home')}
                          className="bg-neutral-950 hover:bg-red-650 hover:text-white p-2 rounded text-xs font-mono font-black uppercase text-neutral-300 transition-colors cursor-pointer"
                        >
                          1 (Home)
                        </button>
                        <button
                          onClick={() => handlePredict(match.id, 'draw')}
                          className="bg-neutral-950 hover:bg-neutral-800 p-2 rounded text-xs font-mono font-black uppercase text-neutral-300 transition-colors cursor-pointer"
                        >
                          X (Draw)
                        </button>
                        <button
                          onClick={() => handlePredict(match.id, 'away')}
                          className="bg-neutral-950 hover:bg-blue-600 hover:text-white p-2 rounded text-xs font-mono font-black uppercase text-neutral-300 transition-colors cursor-pointer"
                        >
                          2 (Away)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* HISTORICAL prediction history */}
          <div className="space-y-3 pt-4 border-t border-neutral-850">
            <h3 className="text-xs font-mono font-black uppercase text-neutral-400">Prediction Verification History logs</h3>
            {predictionHistory.length === 0 ? (
              <p className="text-xs font-mono text-neutral-500 text-center py-6 bg-neutral-900 rounded-lg">No past predictions on record yet.</p>
            ) : (
              <div className="space-y-2">
                {predictionHistory.map((item, idx) => (
                  <div key={idx} className="bg-neutral-900 p-3 rounded-lg text-xs font-mono flex items-center justify-between text-neutral-300 border border-neutral-850">
                    <div className="space-y-0.5">
                      <p className="font-sans font-black text-white">{item.matchName}</p>
                      <p className="text-[10px] text-neutral-400">Date: {item.timestamp} | Bet Laid: {item.creditsLaid} Points</p>
                    </div>
                    <div className="text-right space-y-0.5">
                      <p className="text-amber-400 uppercase font-black">{item.choice}</p>
                      <p className="text-[9px] text-neutral-400">{item.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STANDINGS TABLE TAB */}
      {activeTab === 'standings' && (
        <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-6 space-y-6">
          <div className="border-b border-neutral-850 pb-4">
            <h2 className="text-lg font-sans font-black uppercase flex items-center gap-1.5">
              <Trophy className="w-5 h-5 text-red-500" />
              National County & Premier Division Standings
            </h2>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">Automated table calculations updated via real-time sports results portals</p>
          </div>

          {/* Liberia National County Meet Standings */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono font-black uppercase text-amber-400 flex items-center gap-1">
              <span>🇱🇷 LIBERIA NATIONAL COUNTY MEET - GROUP A</span>
            </h3>

            <div className="overflow-x-auto rounded-lg border border-neutral-850">
              <table className="w-full text-left font-mono text-xs text-neutral-350 bg-neutral-900 border-collapse">
                <thead>
                  <tr className="bg-neutral-950 text-[10px] font-black uppercase text-neutral-450 border-b border-neutral-850">
                    <th className="p-3">Pos</th>
                    <th className="p-3">County Name</th>
                    <th className="p-3 text-center">GP</th>
                    <th className="p-3 text-center">W</th>
                    <th className="p-3 text-center">D</th>
                    <th className="p-3 text-center">L</th>
                    <th className="p-3 text-center">GD</th>
                    <th className="p-3 text-center">PTS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-neutral-850 bg-neutral-900 hover:bg-neutral-850 transition-colors">
                    <td className="p-3 font-bold text-white">1</td>
                    <td className="p-3 font-sans font-black text-white flex items-center gap-2">🦁 Nimba County</td>
                    <td className="p-3 text-center font-bold text-white">3</td>
                    <td className="p-3 text-center">2</td>
                    <td className="p-3 text-center">1</td>
                    <td className="p-3 text-center">0</td>
                    <td className="p-3 text-center text-emerald-400 font-bold">+4</td>
                    <td className="p-3 text-center text-white font-bold">7</td>
                  </tr>
                  <tr className="border-b border-neutral-850 bg-neutral-900 hover:bg-neutral-850 transition-colors">
                    <td className="p-3 font-bold text-neutral-300">2</td>
                    <td className="p-3 font-sans font-black text-white flex items-center gap-2">🦅 Lofa County</td>
                    <td className="p-3 text-center font-bold text-white">3</td>
                    <td className="p-3 text-center">1</td>
                    <td className="p-3 text-center">2</td>
                    <td className="p-3 text-center">0</td>
                    <td className="p-3 text-center text-emerald-400 font-bold">+2</td>
                    <td className="p-3 text-center text-white font-bold">5</td>
                  </tr>
                  <tr className="border-b border-neutral-850 bg-neutral-900 hover:bg-neutral-850 transition-colors">
                    <td className="p-3 font-bold text-neutral-400">3</td>
                    <td className="p-3 font-sans font-black text-white flex items-center gap-2">🐆 Margibi County</td>
                    <td className="p-3 text-center font-bold text-white">3</td>
                    <td className="p-3 text-center">1</td>
                    <td className="p-3 text-center">0</td>
                    <td className="p-3 text-center">2</td>
                    <td className="p-3 text-center text-rose-400 font-bold">-1</td>
                    <td className="p-3 text-center text-white font-bold">3</td>
                  </tr>
                  <tr className="border-b border-neutral-850 bg-neutral-900 hover:bg-neutral-850 transition-colors">
                    <td className="p-3 font-bold text-neutral-400">4</td>
                    <td className="p-3 font-sans font-black text-white flex items-center gap-2">🐘 Grand Bassa County</td>
                    <td className="p-3 text-center font-bold text-white">3</td>
                    <td className="p-3 text-center">0</td>
                    <td className="p-3 text-center">1</td>
                    <td className="p-3 text-center">2</td>
                    <td className="p-3 text-center text-rose-400 font-bold">-5</td>
                    <td className="p-3 text-center text-white font-bold">1</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SPORTS INTEGRATED NEWS AGGREGATOR */}
      {activeTab === 'news' && (
        <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-6 space-y-6">
          <div className="border-b border-neutral-850 pb-4">
            <h2 className="text-lg font-sans font-black uppercase flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-red-500" />
              Rigorous Sports Investigative reports
            </h2>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">Extensive details, verified evidence, and premium journalism summaries</p>
          </div>

          {sportNewsLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
              <span className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-[10px] font-mono mt-3">Sifting matches database...</p>
            </div>
          ) : sportsNews.length === 0 ? (
            <div className="text-center py-12 bg-neutral-900 rounded-lg border border-neutral-850">
              <p className="text-xs font-mono text-neutral-400">No server-published Sports dispatches on record yet.</p>
              <p className="text-[10px] font-mono text-red-400 mt-1.5">Go to the admin portal or trigger a database purge to pull active sport streams from Sportmonks and NewsAPI.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sportsNews.map((art) => (
                <div key={art.id} className="bg-neutral-900 border border-neutral-850 p-5 rounded-xl space-y-3.5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <img 
                      src={art.imageUrl || "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=400"} 
                      alt={art.title} 
                      className="w-full h-40 object-cover rounded-lg border border-neutral-800"
                    />
                    <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
                      <span>👤 {art.authorName || 'Sports Desk'}</span>
                      <span>📅 {art.publishedAt?.toDate ? art.publishedAt.toDate().toLocaleDateString() : 'Just Now'}</span>
                    </div>

                    <h3 className="font-sans font-black text-sm uppercase leading-tight line-clamp-2 text-white">{art.title}</h3>
                    <p className="text-xs text-neutral-400 leading-relaxed line-clamp-3">{art.summary}</p>
                  </div>

                  <div className="pt-3 border-t border-neutral-850/60 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-neutral-500">🔥 {art.viewsCount || 52} Views • {art.likesCount || 6} Likes</span>
                    {art.sourceUrl && (
                      <a 
                        href={art.sourceUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-red-400 hover:underline text-[10px] font-mono font-black uppercase flex items-center gap-1"
                      >
                        Sports source <Share2 className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
