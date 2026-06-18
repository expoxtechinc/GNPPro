import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, collection, onSnapshot } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { UserProfile } from './types';

// Component Imports
import AuthModal from './components/AuthModal';
import ForumArea from './components/ForumArea';
import StudentPortal from './components/StudentPortal';
import FacultyDashboard from './components/FacultyDashboard';
import AdminPanel from './components/AdminPanel';

import { 
  GraduationCap, BookOpen, Users, Compass, Shield, LogOut, 
  ChevronRight, Award, MessageSquare, Menu, X, ArrowUpRight, Sparkles, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'portal' | 'forum'>('home');

  // Monitor Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setCurrentUser(user);
      if (user) {
        try {
          const profileDoc = await getDoc(doc(db, 'users', user.uid));
          if (profileDoc.exists()) {
            setUserProfile(profileDoc.data() as UserProfile);
          } else {
            // Self-healing default fallback if registration was interrupted
            const name = user.displayName || user.email?.split('@')[0] || 'Remote Scholar';
            const role = user.email === 'aboysokpah@gmail.com' ? 'admin' : 'student';
            const fallback: UserProfile = {
              uid: user.uid,
              email: user.email!,
              fullName: name,
              role: role,
              department: 'Computer Science',
              degreeProgram: 'Bachelor of Science (B.Sc.)',
              matricNo: `AIOU-${Math.floor(1000 + Math.random() * 9000)}`,
              createdAt: new Date().toISOString()
            };
            setUserProfile(fallback);
          }
        } catch (error) {
          console.error("Error fetching user profile: ", error);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setUserProfile(null);
      setCurrentView('home');
      setMobileMenuOpen(false);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleLoginSuccess = (uid: string) => {
    setShowAuthModal(false);
    getDoc(doc(db, 'users', uid)).then(snap => {
      if (snap.exists()) {
        const profile = snap.data() as UserProfile;
        setUserProfile(profile);
        setCurrentView('portal'); // direct redirect on success
      }
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white font-sans p-6">
        <GraduationCap className="w-12 h-12 text-amber-500 animate-bounce mb-4" />
        <h1 className="text-xl font-bold tracking-tight">Akin International Online University</h1>
        <p className="text-xs text-slate-400 font-mono mt-2 animate-pulse">Synchronizing academic registers...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-slate-900 font-sans flex flex-col">
      
      {/* HEADER / NAVIGATION BAR */}
      <header className="bg-white/90 backdrop-blur-md border-b sticky top-0 z-40 shadow-xs select-none">
        <div className="mx-auto flex max-w-7xl items-center justify-between p-4 px-6">
          
          {/* Logo & Brand title */}
          <div 
            onClick={() => setCurrentView('home')} 
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-10 h-10 bg-blue-900 rounded-xl flex items-center justify-center shadow-lg border border-yellow-500">
              <GraduationCap className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-sm font-black text-blue-950 leading-none">AIOU</h1>
              <p className="text-[9px] font-mono font-bold text-yellow-600 tracking-wider">AKIN INTERNATIONAL</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-x-8 text-xs font-bold text-slate-650 uppercase tracking-widest pl-6">
            <button 
              onClick={() => setCurrentView('home')} 
              className={`hover:text-blue-900 cursor-pointer transition ${currentView === 'home' ? 'text-blue-900 underline underline-offset-4 font-black' : ''}`}
            >
              Overview
            </button>
            <button 
              onClick={() => {
                if (!currentUser) {
                  setShowAuthModal(true);
                } else {
                  setCurrentView('forum');
                }
              }} 
              className={`hover:text-blue-900 cursor-pointer transition flex items-center gap-1.5 ${currentView === 'forum' ? 'text-blue-900 underline underline-offset-4 font-black' : ''}`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
              <span>Discussion Forums</span>
            </button>
            {currentUser && (
              <button 
                onClick={() => setCurrentView('portal')} 
                className={`hover:text-blue-900 cursor-pointer transition flex items-center gap-1.5 ${currentView === 'portal' ? 'text-blue-900 underline underline-offset-4 font-black' : ''}`}
              >
                <Compass className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                <span>My Academic Portal</span>
              </button>
            )}
          </div>

          {/* Desktop Auth badge */}
          <div className="hidden md:flex items-center gap-4">
            {currentUser ? (
              <div className="flex items-center gap-3 bg-slate-50 border px-3 py-1.5 rounded-xl text-xs">
                <span className="font-semibold text-slate-700">
                  Welcome, <span className="font-black text-blue-950">{userProfile?.fullName || currentUser.email}</span> 
                  <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-[9px] rounded-md font-mono text-blue-900 capitalize font-bold">
                    {userProfile?.role || 'student'}
                  </span>
                </span>
                <button 
                  onClick={handleSignOut}
                  className="text-slate-420 hover:text-red-650 cursor-pointer transition"
                  title="Sign out of portal"
                >
                  <LogOut className="w-4 h-4 text-slate-400 hover:text-red-600" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowAuthModal(true)}
                className="bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs uppercase px-4.5 py-2.5 rounded-xl shadow-md transition cursor-pointer"
              >
                Access Academic Portal &rarr;
              </button>
            )}
          </div>

          {/* Mobile Menu Actions */}
          <div className="flex md:hidden items-center gap-2">
            {!currentUser && (
              <button 
                onClick={() => setShowAuthModal(true)}
                className="bg-blue-900 text-white font-bold text-[10px] uppercase px-3 py-2 rounded-lg"
              >
                Join
              </button>
            )}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1 rounded-lg hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </header>

      {/* MOBILE EXPENSES NAV DRAWER */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b overflow-hidden select-none"
          >
            <div className="p-4 space-y-3 font-semibold text-xs text-slate-700 uppercase tracking-wider">
              <button 
                onClick={() => { setCurrentView('home'); setMobileMenuOpen(false); }}
                className="block w-full text-left py-2 hover:text-blue-900"
              >
                Overview
              </button>
              <button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (!currentUser) setShowAuthModal(true);
                  else setCurrentView('forum');
                }}
                className="block w-full text-left py-2 hover:text-blue-900 flex items-center gap-1"
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-500" /> Students Forums
              </button>
              {currentUser && (
                <button 
                  onClick={() => { setCurrentView('portal'); setMobileMenuOpen(false); }}
                  className="block w-full text-left py-2 hover:text-blue-900 flex items-center gap-1 text-slate-800"
                >
                  <Compass className="w-3.5 h-3.5 text-indigo-500" /> My Academic Portal
                </button>
              )}
              {currentUser && (
                <div className="pt-3 border-t flex items-center justify-between text-[11px] text-slate-500">
                  <span>Logged in: {userProfile?.fullName} [{userProfile?.role}]</span>
                  <button onClick={handleSignOut} className="text-red-600 flex items-center gap-1 hover:underline capitalize">
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CORE VIEWPORT */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-6 py-6">

        {/* VIEW 1: HOME PAGE OVERVIEW */}
        {currentView === 'home' && (
          <div className="space-y-12">
            
            {/* Hero Section */}
            <div className="relative bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-3xl p-6 md:p-12 shadow-xl overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl" />
              <div className="relative max-w-2xl space-y-6">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/10 border border-blue-400/20 text-[10px] font-mono tracking-widest text-blue-400 uppercase font-black rounded-full">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  Now Enrolling for Semester Fall 2026
                </span>
                <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-none text-white">
                  Akin International <br className="hidden md:inline" />
                  <span className="text-yellow-400">Online University</span>
                </h2>
                <p className="text-sm md:text-md text-slate-300 leading-relaxed max-w-xl font-medium">
                  Empowering remote scholars worldwide with fully accredited distance learning, rigorous interactive curriculums, proactive faculty mentoring, and secure micro-ledger degree tracking.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button 
                    onClick={() => {
                      if (!currentUser) setShowAuthModal(true);
                      else setCurrentView('portal');
                    }}
                    className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-extrabold text-xs uppercase px-6 py-3.5 rounded-xl cursor-pointer transition shadow-md flex items-center gap-1.5"
                  >
                    <span>View Your Portal Dashboard</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      if (!currentUser) setShowAuthModal(true);
                      else setCurrentView('forum');
                    }}
                    className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs uppercase px-5 py-3.5 rounded-xl cursor-pointer transition"
                  >
                    Enter Student Forums
                  </button>
                </div>
              </div>
            </div>

            {/* Curriculum Degrees grid */}
            <div className="space-y-4">
              <div className="text-center md:text-left">
                <span className="text-[10px] font-mono font-bold uppercase text-yellow-600 tracking-widest block mb-1">DIVERSE SYLLABUS DISCIPLIANARY CARRIER PATHWAYS</span>
                <h3 className="text-xl font-black text-slate-900">Remote Undergraduate Programs</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border rounded-2xl p-5 space-y-3 shadow-xs">
                  <div className="w-9 h-9 bg-blue-50 text-blue-900 rounded-lg flex items-center justify-center font-bold">CS</div>
                  <h4 className="text-xs font-black text-slate-900 uppercase">Computer Science (B.Sc.)</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">Algorithmic engineering, full-stack microprojects development, cloud computing configurations, and artificial intelligence.</p>
                </div>
                <div className="bg-white border rounded-2xl p-5 space-y-3 shadow-xs">
                  <div className="w-9 h-9 bg-emerald-50 text-emerald-900 rounded-lg flex items-center justify-center font-bold">BA</div>
                  <h4 className="text-xs font-black text-slate-900 uppercase">Business Administration</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">Financial modeling, strategic logistics management, corporate governance, microeconomics trends and commerce.</p>
                </div>
                <div className="bg-white border rounded-2xl p-5 space-y-3 shadow-xs">
                  <div className="w-9 h-9 bg-amber-50 text-amber-900 rounded-lg flex items-center justify-center font-bold">NS</div>
                  <h4 className="text-xs font-black text-slate-900 uppercase">Nursing & Health Sciences</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">Patient evaluation protocol, pharmacology, health science ethics, emergency care models, and national healthcare systems.</p>
                </div>
                <div className="bg-white border rounded-2xl p-5 space-y-3 shadow-xs">
                  <div className="w-9 h-9 bg-indigo-50 text-indigo-900 rounded-lg flex items-center justify-center font-bold">ED</div>
                  <h4 className="text-xs font-black text-slate-900 uppercase">Education studies (B.A.)</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">Advanced pedagogy theory, modern classroom curriculum development design, child cognitive growth, and educational systems.</p>
                </div>
              </div>
            </div>

            {/* Direct Admin contact details box */}
            <div className="bg-amber-50/50 border border-amber-200/60 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex gap-3">
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-black uppercase text-amber-950">Pre-Configured Registrar Account</h4>
                  <p className="text-[11px] text-amber-900 leading-relaxed mt-1">
                    To access the Registrar and Systems Enrollment Admin Dashboard, use credential email <span className="font-bold underline text-blue-900">aboysokpah@gmail.com</span> with password <span className="font-bold underline text-blue-900">Admin@2026</span> in the portal access terminal. Other students may register unique individual emails directly.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* VIEW 2: SYSTEM PORTAL DASHBOARDS */}
        {currentView === 'portal' && (
          <div>
            {!currentUser ? (
              <div className="text-center p-12 bg-white border border-gray-200 rounded-2xl max-w-md mx-auto space-y-4 shadow-sm">
                <LockIcon />
                <h3 className="text-sm font-bold text-slate-900">Authenticated Session Required</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">Please register or log into your scholar/faculty roster credentials to view academic resources, submit tuition invoices, or manage curriculum cohorts.</p>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="bg-blue-900 text-white font-bold text-xs uppercase py-2 px-5 rounded-xl cursor-pointer hover:bg-blue-950"
                >
                  Authorize Now
                </button>
              </div>
            ) : (
              <div>
                {/* Conditionally Display portal based on user profiles of the user */}
                {userProfile?.role === 'admin' ? (
                  <AdminPanel />
                ) : userProfile?.role === 'faculty' ? (
                  <FacultyDashboard userProfile={userProfile} />
                ) : (
                  <StudentPortal userProfile={userProfile!} />
                )}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: DISCUSSIONS FORUM AREA */}
        {currentView === 'forum' && (
          <div>
            {!currentUser ? (
              <div className="text-center p-12 bg-white border border-gray-200 rounded-2xl max-w-md mx-auto space-y-4">
                <MessageSquare className="w-10 h-10 text-blue-950 mx-auto" />
                <h3 className="text-sm font-bold">Scholar Forums Locked</h3>
                <p className="text-[11px] text-slate-500">Sign in to join interactive Q&As, research exchanges, and campus discussions.</p>
                <button onClick={() => setShowAuthModal(true)} className="bg-blue-900 text-white text-xs px-5 py-2.5 rounded-xl font-bold">Sign In</button>
              </div>
            ) : (
              <ForumArea userProfile={userProfile!} />
            )}
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 select-none border-t border-slate-800 py-6 mt-12 text-center text-xs">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="font-bold text-slate-300">© 2026 Akin International Online University (AIOU). All Rights Reserved.</p>
          <p className="text-[10px] text-slate-500 font-mono">Registry: Dr. Abraham S. Borbor (aboysokpah@gmail.com) | Monrovia Block & Remote Learner Servers</p>
        </div>
      </footer>

      {/* AUTHENTICATION MODAL DIALOG */}
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)} 
          onSuccess={handleLoginSuccess}
        />
      )}

    </div>
  );
}

// Simple Lock icon
const LockIcon = () => (
  <div className="w-12 h-12 bg-blue-50 text-blue-900 rounded-full flex items-center justify-center mx-auto mb-2.5">
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  </div>
);
