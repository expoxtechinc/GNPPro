import React, { useState } from 'react';
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Mail, Lock, User, ShieldAlert, X, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthModalProps {
  key?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    setErrorMsg('');

    try {
      if (isRegister) {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName.trim()) {
          await updateProfile(userCredential.user, {
            displayName: displayName.trim()
          });
        }
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      let friendlyMessage = 'Authentication failed. Please check your credentials.';
      if (err.code === 'auth/user-not-found') {
        friendlyMessage = 'No account associated with this email. Click "Register New Account".';
      } else if (err.code === 'auth/wrong-password') {
        friendlyMessage = 'Incorrect password. Please verify and try again.';
      } else if (err.code === 'auth/email-already-in-use') {
        friendlyMessage = 'This email is already registered. Please login instead.';
      } else if (err.code === 'auth/weak-password') {
        friendlyMessage = 'Password should contain at least 6 characters.';
      }
      setErrorMsg(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md bg-white border border-gray-150 shadow-2xl rounded-2xl overflow-hidden font-sans"
      >
        {/* Red Theme Header Accent */}
        <div className="bg-neutral-900 px-6 py-5 text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-red-500 font-bold">Global News Portal</span>
            <h3 className="text-lg font-black tracking-tight">{isRegister ? 'Register Account' : 'Gateway Verification'}</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-full hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 md:p-8">
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-red-50 border-l-3 border-red-600 rounded text-red-800 text-xs font-mono flex items-start gap-2">
              <ShieldAlert className="w-4.5 h-4.5 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-[10px] font-mono font-black text-neutral-500 uppercase mb-1">Display Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-4 py-2.5 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-mono font-black text-neutral-500 uppercase mb-1">Email Coordinates</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-4 h-4 text-neutral-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-4 py-2.5 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono font-black text-neutral-500 uppercase mb-1">Credential Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-4 h-4 text-neutral-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-10 py-2.5 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-neutral-400 hover:text-neutral-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-neutral-900 hover:bg-black disabled:bg-neutral-650 text-white font-sans font-black text-xs uppercase tracking-widest py-3 rounded-lg transition-transform focus:ring-2 focus:ring-red-500 shadow-md cursor-pointer mt-2"
            >
              {loading ? 'Processing State...' : (isRegister ? 'Register Account' : 'Authenticate Sign-In')}
            </button>
          </form>

          {/* Form Switcher */}
          <div className="mt-6 pt-5 border-t border-gray-100 text-center text-xs text-neutral-500">
            {isRegister ? (
              <p>
                Already have accounts registered?{' '}
                <button 
                  onClick={() => setIsRegister(false)}
                  className="text-red-650 hover:underline font-bold"
                >
                  Sign In Here
                </button>
              </p>
            ) : (
              <p>
                First time reading or want alerts?{' '}
                <button 
                  onClick={() => setIsRegister(true)}
                  className="text-red-650 hover:underline font-bold"
                >
                  Create Subscriber Profile
                </button>
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
