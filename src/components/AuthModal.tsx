import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  updateProfile, GoogleAuthProvider, signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Mail, Lock, User, ShieldAlert, X, Eye, EyeOff, Globe } from 'lucide-react';
import { motion } from 'motion/react';
import { UserRole } from '../types';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: (uid: string, role: UserRole) => void;
}

export default function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const checkIsAdmin = (trimmedEmail: string) => {
    return trimmedEmail === 'aboysokpah@gmail.com' || trimmedEmail === 'luckyglobalnews@gmail.com';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    setErrorMsg('');

    const trimmedEmail = email.trim().toLowerCase();
    const finalRole: UserRole = checkIsAdmin(trimmedEmail) ? 'admin' : 'user';

    try {
      if (isRegister) {
        if (!fullName.trim()) {
          throw new Error("Please enter your name or dynamic handle.");
        }
        
        const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        
        await updateProfile(userCredential.user, {
          displayName: fullName.trim()
        });

        // Set profile document in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: trimmedEmail,
          fullName: fullName.trim(),
          role: finalRole,
          createdAt: new Date().toISOString()
        });

        onSuccess(userCredential.user.uid, finalRole);
      } else {
        // Sign in
        const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
        
        // Ensure profile doc exists, seed if missing
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (!userDoc.exists() || checkIsAdmin(trimmedEmail)) {
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            uid: userCredential.user.uid,
            email: trimmedEmail,
            fullName: userCredential.user.displayName || (checkIsAdmin(trimmedEmail) ? 'Akin S. Sokpah (Admin)' : 'AkiPah Citizen'),
            role: finalRole,
            createdAt: new Date().toISOString()
          }, { merge: true });
        }
        
        onSuccess(userCredential.user.uid, finalRole);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      let friendlyMessage = 'Authentication failed. Please verify your internet or credentials.';
      if (err.code === 'auth/user-not-found') {
        friendlyMessage = 'No registered account found for this email. Click register below to make one.';
      } else if (err.code === 'auth/wrong-password') {
        friendlyMessage = 'Invalid credentials. Please retry.';
      } else if (err.code === 'auth/email-already-in-use') {
        friendlyMessage = 'This email direction is already taken on AkiPah Lite.';
      } else if (err.code === 'auth/weak-password') {
        friendlyMessage = 'Password must be at least 6 characters.';
      } else if (err.message) {
        friendlyMessage = err.message;
      }
      setErrorMsg(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      const trimmedEmail = user.email ? user.email.toLowerCase() : '';
      const finalRole: UserRole = checkIsAdmin(trimmedEmail) ? 'admin' : 'user';

      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (!userDocSnap.exists() || checkIsAdmin(trimmedEmail)) {
        await setDoc(userDocRef, {
          uid: user.uid,
          email: trimmedEmail,
          fullName: user.displayName || (checkIsAdmin(trimmedEmail) ? 'Akin S. Sokpah (Admin)' : 'AkiPah Citizen'),
          role: finalRole,
          createdAt: new Date().toISOString()
        }, { merge: true });
      }

      onSuccess(user.uid, finalRole);
      onClose();
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      let friendlyMsg = 'Google login failed or was cancelled.';
      if (err.message) friendlyMsg = err.message;
      setErrorMsg(friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-md bg-white border border-neutral-100 shadow-2xl rounded-2xl overflow-hidden font-sans"
      >
        {/* Sleek Dark Header Accent */}
        <div className="bg-gradient-to-r from-neutral-900 via-blue-950 to-neutral-950 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="bg-emerald-600 px-2 py-1 rounded-lg text-white font-mono font-black text-xs">
              MISS
            </span>
            <div>
              <span className="text-[9px] font-mono uppercase tracking-widest text-emerald-300 font-bold">Multee School System Portal</span>
              <h3 className="text-sm font-black tracking-tight">{isRegister ? 'Create School Account' : 'Portal Terminal Sign-In'}</h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 md:p-8 max-h-[85vh] overflow-y-auto">
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-red-50 border-l-4 border-emerald-650 rounded-xl text-red-950 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4.5 h-4.5 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-[10px] font-mono font-bold text-neutral-510 uppercase mb-1.5">Your Full Name</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-neutral-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Samuel Karpeh"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl text-xs py-2.5 pl-10 pr-4 focus:ring-1 focus:ring-emerald-600 focus:outline-none focus:bg-white font-semibold text-neutral-850"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-mono font-bold text-neutral-510 uppercase mb-1.5">Email Address</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-neutral-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl text-xs py-2.5 pl-10 pr-4 focus:ring-1 focus:ring-emerald-600 focus:outline-none focus:bg-white font-semibold text-neutral-850"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold text-neutral-510 uppercase mb-1.5">Password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-neutral-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl text-xs py-2.5 pl-10 pr-10 focus:ring-1 focus:ring-emerald-600 focus:outline-none focus:bg-white font-semibold text-neutral-850"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-900 hover:bg-emerald-950 text-white text-xs font-black uppercase tracking-wider py-3 rounded-xl transition cursor-pointer shadow-md text-center mt-2 disabled:bg-neutral-300"
            >
              {loading ? 'Validating Account...' : isRegister ? 'Register Account' : 'Login to MISS Portal'}
            </button>
          </form>

          <div className="relative flex py-5 items-center">
            <div className="flex-grow border-t border-neutral-150"></div>
            <span className="flex-shrink mx-4 text-neutral-400 text-[10px] font-mono uppercase font-black">or utilize</span>
            <div className="flex-grow border-t border-neutral-150"></div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white border border-neutral-200 hover:border-neutral-300 text-neutral-700 text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.39-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Express Connect with Google</span>
          </button>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-neutral-500 hover:text-emerald-900 font-bold text-xs"
            >
              {isRegister 
                ? 'Already have an account? Login here' 
                : 'Need school account? Click to register'}
            </button>
          </div>
          
          <div className="mt-5 p-3 bg-neutral-50 border rounded-xl text-center text-[10px] text-neutral-400 font-mono">
            Securely protected by Multee International Admissions Layer.
          </div>
        </div>
      </motion.div>
    </div>
  );
}
