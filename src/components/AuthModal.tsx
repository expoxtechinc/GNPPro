import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Mail, Lock, User, ShieldAlert, X, Eye, EyeOff, GraduationCap, Building2 } from 'lucide-react';
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
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [selectedDept, setSelectedDept] = useState('Computer Science');
  const [degreeProgram, setDegreeProgram] = useState('Bachelor of Science in Computer Science');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const DEPARTMENTS = [
    { code: 'CS', name: 'Computer Science', degrees: ['Bachelor of Science in Computer Science', 'Bachelor of Science in Cybersecurity'] },
    { code: 'BA', name: 'Business Administration', degrees: ['Bachelor of Science in Business Management', 'Master of Business Administration (MBA)'] },
    { code: 'NUR', name: 'Nursing & Health Sciences', degrees: ['Bachelor of Science in Nursing', 'Bachelor of Science in Public Health'] },
    { code: 'EDU', name: 'Education', degrees: ['Bachelor of Arts in Remote Learning Pedagogy'] }
  ];

  const currentDegrees = DEPARTMENTS.find(d => d.name === selectedDept)?.degrees || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    setErrorMsg('');

    const trimmedEmail = email.trim().toLowerCase();
    const isAdminUser = trimmedEmail === 'aboysokpah@gmail.com';
    const finalRole: UserRole = isAdminUser ? 'admin' : selectedRole;

    try {
      if (isRegister) {
        if (!fullName.trim()) {
          throw new Error("Please enter your full legal name.");
        }
        
        // Use standard signup
        const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        
        await updateProfile(userCredential.user, {
          displayName: fullName.trim()
        });

        const studentMatric = finalRole === 'student' 
          ? 'AIOU-' + new Date().getFullYear() + '-' + Math.floor(100000 + Math.random() * 900000) 
          : undefined;

        // Set profile document in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: trimmedEmail,
          fullName: fullName.trim(),
          role: finalRole,
          matricNo: studentMatric || null,
          department: finalRole === 'admin' ? 'University Administration' : selectedDept,
          degreeProgram: finalRole === 'student' ? degreeProgram : (finalRole === 'faculty' ? 'Faculty Instructor' : 'System Admin'),
          admissionYear: finalRole === 'student' ? String(new Date().getFullYear()) : null,
          status: 'active',
          createdAt: new Date().toISOString()
        });

        onSuccess(userCredential.user.uid, finalRole);
      } else {
        // Sign in
        const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
        
        // In case profile doesn't exist, seed it for admin
        if (isAdminUser || trimmedEmail === 'aboysokpah@gmail.com') {
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            uid: userCredential.user.uid,
            email: trimmedEmail,
            fullName: 'Dr. Abraham S. Borbor (AIOU Admin)',
            role: 'admin',
            department: 'University Administration',
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
        friendlyMessage = 'No registered university record found for this email direction. Please Register above.';
      } else if (err.code === 'auth/wrong-password') {
        friendlyMessage = 'Invalid password credential provided. Please reset or contact IT support.';
      } else if (err.code === 'auth/email-already-in-use') {
        friendlyMessage = 'This email direction is already registered at AIOU. Please sign in instead.';
      } else if (err.code === 'auth/weak-password') {
        friendlyMessage = 'Security warning: Password should contain at least 6 characters.';
      } else if (err.message) {
        friendlyMessage = err.message;
      }
      setErrorMsg(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-md p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-lg bg-white border border-neutral-100 shadow-2xl rounded-2xl overflow-hidden font-sans"
      >
        {/* Academic Blue Header Accent */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-indigo-950 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-blue-300 font-bold">Akin International Online University</span>
              <h3 className="text-sm font-bold tracking-tight">{isRegister ? 'Academic Enrollment Form' : 'University Portal Sign-In'}</h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 md:p-8 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-red-50 border-l-4 border-red-650 rounded-xl text-red-950 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4.5 h-4.5 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="space-y-4">
                {/* Role selection tab */}
                <div>
                  <label className="block text-[10px] font-mono font-bold text-neutral-500 uppercase mb-2">Academic Affiliation</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedRole('student')}
                      className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                        selectedRole === 'student' 
                          ? 'bg-blue-50 border-blue-600 text-blue-900' 
                          : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600'
                      }`}
                    >
                      <GraduationCap className="w-4 h-4" />
                      <span>Remote Student</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRole('faculty')}
                      className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                        selectedRole === 'faculty' 
                          ? 'bg-blue-50 border-blue-600 text-blue-900' 
                          : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      <span>Faculty Instructor</span>
                    </button>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-[10px] font-mono font-bold text-neutral-500 uppercase mb-1">Full Legal Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Samuel K. Johnson"
                      className="w-full bg-white border border-neutral-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                {/* Department Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-neutral-500 uppercase mb-1">College/Department</label>
                    <select
                      value={selectedDept}
                      onChange={(e) => {
                        setSelectedDept(e.target.value);
                        const dep = DEPARTMENTS.find(d => d.name === e.target.value);
                        if (dep && dep.degrees.length > 0) {
                          setDegreeProgram(dep.degrees[0]);
                        }
                      }}
                      className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2.5 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      {DEPARTMENTS.map(dept => (
                        <option key={dept.code} value={dept.name}>{dept.name}</option>
                      ))}
                    </select>
                  </div>

                  {selectedRole === 'student' && (
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-neutral-500 uppercase mb-1">Degree Major Program</label>
                      <select
                        value={degreeProgram}
                        onChange={(e) => setDegreeProgram(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2.5 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-600 text-ellipsis overflow-hidden"
                      >
                        {currentDegrees.map(deg => (
                          <option key={deg} value={deg}>{deg}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-mono font-bold text-neutral-500 uppercase mb-1">University Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. aboysokpah@gmail.com"
                  className="w-full bg-white border border-neutral-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-mono font-bold text-neutral-500 uppercase">Gateway Access Password</label>
                {!isRegister && (
                  <span className="text-[9px] font-mono text-zinc-400">Admin hint: Admin@2026</span>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-neutral-200 rounded-xl pl-9 pr-10 py-2.5 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-3 w-full bg-blue-900 hover:bg-blue-950 disabled:bg-neutral-300 text-white font-sans font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition shadow-lg cursor-pointer flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <span>Validating Registry...</span>
              ) : (
                <>
                  <GraduationCap className="w-4 h-4" />
                  <span>{isRegister ? 'Enroll In University' : 'Bridge Portal Access'}</span>
                </>
              )}
            </button>
          </form>

          {/* Form Switcher */}
          <div className="mt-6 pt-5 border-t border-neutral-100 text-center text-xs text-neutral-500">
            {isRegister ? (
              <p>
                Already have a student or faculty account?{' '}
                <button 
                  type="button"
                  onClick={() => setIsRegister(false)}
                  className="text-blue-700 hover:underline font-bold"
                >
                  Login to Portal
                </button>
              </p>
            ) : (
              <p>
                Prospective remote learner lookup?{' '}
                <button 
                  type="button"
                  onClick={() => setIsRegister(true)}
                  className="text-blue-700 hover:underline font-bold"
                >
                  Create University Registration
                </button>
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
