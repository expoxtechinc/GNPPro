import React, { useState, useEffect } from 'react';
import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, 
  deleteDoc, query, orderBy, onSnapshot, Timestamp 
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { 
  GraduationCap, User, Users, FileText, Plus, Trash2, 
  ShieldAlert, CheckCircle, ExternalLink, Mail, Phone, 
  MapPin, Facebook, ArrowRight, Lock, Calendar, BookOpen, 
  Calculator, LogIn, LogOut, UserPlus, FileSpreadsheet, Search, Filter, Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Slogan/School Information Constants
const SCHOOL_NAME = "LR. Online School System (LOSN)";
const LOGO_URL = "https://www.image2url.com/r2/default/images/1780845091129-72ef205c-ec0e-4094-ab80-0cd92282f531.jpg";
const SCHOOL_EMAIL = "lr.onlineschoolsystem@gmail.com";
const SCHOOL_PHONE = "+231 77 563 3880";
const SCHOOL_LOCATION = "Monrovia, Montserrado, Liberia";
const SCHOOL_FACEBOOK = "https://www.facebook.com/LOSNAcademy";
const SCHOOL_SLOGAN = "A unified, curriculum-aligned virtual school system transforming and building up the minds of future generations. Here, our AI-powered teachers curate lessons to guide you from primary education straight into verified degree certifications!";

interface StudentGrades {
  subjectName: string;
  grade: number;
}

interface StudentReport {
  studentId: string;
  fullName: string;
  gradeLevel: string;
  gpa: number;
  averageGrade: number;
  grades: StudentGrades[];
  term: string;
  updatedAt: any;
}

export default function SchoolPortal() {
  // Splash Screen State
  const [showSplash, setShowSplash] = useState(true);

  // Application Modes: 'home' | 'announcements' | 'portal' | 'admin' | 'contact' | 'academy'
  const [activeTab, setActiveTab] = useState<'home' | 'announcements' | 'portal' | 'admin' | 'contact' | 'academy'>('home');

  // Authentication states
  const [studentUser, setStudentUser] = useState<any | null>(null);
  const [adminUser, setAdminUser] = useState<boolean>(false);
  const [studentIdInput, setStudentIdInput] = useState('');
  const [studentPasswordInput, setStudentPasswordInput] = useState('');
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // Portal sign up states
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [signUpStudentId, setSignUpStudentId] = useState('');
  const [signUpFullName, setSignUpFullName] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpGradeLevel, setSignUpGradeLevel] = useState('Grade 10');
  const [signUpParentName, setSignUpParentName] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpParentPhone, setSignUpParentPhone] = useState('');
  const [signUpGender, setSignUpGender] = useState('Male');

  // Reports feed state (viewed by student)
  const [activeReport, setActiveReport] = useState<StudentReport | null>(null);

  // Admin Data states
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('All');

  // Selected Student on Admin workspace
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<any | null>(null);
  const [inputSubjects, setInputSubjects] = useState<StudentGrades[]>([]);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectGrade, setNewSubjectGrade] = useState<number | ''>('');
  const [selectedTerm, setSelectedTerm] = useState('1st Period Semester');
  const [gradeSubmitSuccess, setGradeSubmitSuccess] = useState('');
  const [gradeSubmitError, setGradeSubmitError] = useState('');

  // --- Online Academy States (LOSN) ---
  const [academyLessons, setAcademyLessons] = useState<any[]>([]);
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('All');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('All');
  const [selectedLesson, setSelectedLesson] = useState<any | null>(null);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);
  
  // Quiz Mode states
  const [showQuiz, setShowQuiz] = useState(false);
  const [activeQuizIndex, setActiveQuizIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [quizScorePercent, setQuizScorePercent] = useState(0);
  const [quizPassed, setQuizPassed] = useState(false);
  const [certificateClaimed, setCertificateClaimed] = useState(false);
  const [claimedCertificatesList, setClaimedCertificatesList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('claimed_certificates');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // On-demand AI generator inputs
  const [genLevel, setGenLevel] = useState('Grade 10');
  const [genSubject, setGenSubject] = useState('Mathematics');
  const [isGeneratingLesson, setIsGeneratingLesson] = useState(false);
  const [genError, setGenError] = useState('');
  const [genSuccess, setGenSuccess] = useState('');

  // Degree Enrollment Track
  const [enrolledTrack, setEnrolledTrack] = useState<string | null>(() => {
    return localStorage.getItem('enrolled_degree_track') || null;
  });

  // School Platform Official Announcements State
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [newAnnounceTitle, setNewAnnounceTitle] = useState('');
  const [newAnnounceContent, setNewAnnounceContent] = useState('');
  const [newAnnounceImage, setNewAnnounceImage] = useState('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200');
  const [announceSuccess, setAnnounceSuccess] = useState('');

  // Handle Splash expiration
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Sync and Pre-seed curriculum academy lessons in real time
  useEffect(() => {
    try {
      const q = query(collection(db, 'curriculum_lessons'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snap) => {
        const list: any[] = [];
        snap.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        if (list.length === 0) {
          // Robust pre-loaded lessons to allow immediate testing of quizzes and certificate prints
          const seedLessons = [
            {
              lessonId: 'seed-lesson-1',
              title: 'Mastering Quadratic Equations and Factoring Methods',
              level: 'Grade 10',
              subject: 'Mathematics',
              curriculumStandard: 'Ministry of Education & WAEC Grade 10-12 Curriculum Compliant',
              introduction: 'Quadratic equations are mathematical expressions of the second degree, containing at least one squared term. They represent parabolas and are vital for projectile motion calculations, physics modeling, and financial curve forecasting.',
              sections: [
                {
                  title: '1. Standard Form and Discriminant Roots',
                  content: 'Every quadratic equation is in the form ax² + bx + c = 0. Solving roots are determined via the formula: x = [-b ± √(b² - 4ac)] / (2a). The discriminant expression b² - 4ac dictates whether roots are real or imaginary.'
                },
                {
                  title: '2. Solving by Binomial Factoring',
                  content: 'Breaking factors like x² - 5x + 6 = 0 into (x-2)(x-3) = 0 yields solution roots x = 2 and x = 3 immediately, saving considerable exam time during high-stakes testing.'
                },
                {
                  title: '3. Ballistics Mechanics Orbit Application',
                  content: 'Engineers project orbits, satellite focal trajectories, and trajectory arcs by modeling vertical velocity quadratic formulas and ground collision coordinates.'
                }
              ],
              summary: "By completing this module, students master second-degree standard formulas, roots determinations, and parabolic graphs for WAEC examination readiness.",
              quiz: [
                {
                  questionText: "What is the standard algebraic form of a quadratic equation?",
                  options: ["y = mx + b", "ax² + bx + c = 0", "a² + b² = c²", "A = πr²"],
                  correctOptionIndex: 1,
                  explanation: "The quadratic form is ax² + bx + c = 0."
                },
                {
                  questionText: "What represents the discriminant under the radical in quadratic formula calculations?",
                  options: ["b² - 4ac", "2a / b", "b² + c²", "√(a*b*c)"],
                  correctOptionIndex: 0,
                  explanation: "The discriminant is strictly (b² - 4ac)."
                },
                {
                  questionText: "Factor and solve: x² - 7x + 12 = 0. What are the solution roots?",
                  options: ["x = -3 and -4", "x = 3 and 4", "x = 2 and 6", "x = 1 and 12"],
                  correctOptionIndex: 1,
                  explanation: "The factors are (x-3)(x-4) = 0, which yields x=3 and x=4."
                },
                {
                  questionText: "Under what condition will a quadratic equation have real and equal roots?",
                  options: ["Discriminant is greater than 0", "Discriminant is exactly equal to 0", "Discriminant is less than 0", "Coefficient a is negative"],
                  correctOptionIndex: 1,
                  explanation: "A discriminant of zero means there is exactly one double root solution."
                },
                {
                  questionText: "Which real-world application uses quadratic calculations extensively?",
                  options: ["Linear server queues", "Satellite parabolic shapes and projectile ballistics", "Standard email notifications", "Sorting algorithms in Javascript"],
                  correctOptionIndex: 1,
                  explanation: "Any physical ballistic arc or parabolic surface uses second-degree quadratic constraints."
                }
              ],
              createdAt: "2026-06-01T12:00:00.000Z"
            },
            {
              lessonId: 'seed-lesson-2',
              title: 'Neural Networks, Synapses, and Transformers',
              level: 'Degree Program',
              subject: 'Computer Science & AI',
              curriculumStandard: 'International Professional STEM Computer Science & AI Curriculum',
              introduction: 'This module introduces the evolution of machine computation, starting from basic decision trees up to feed-forward deep layers and self-attention transformers.',
              sections: [
                {
                  title: '1. Biological to Computational Model',
                  content: 'Node weight optimization adjustments model biological synapses, passing net sums across activation triggers like Sigmoid, Tanh, or ReLU. Gradient descent backpropagates the local loss error gradients.'
                },
                {
                  title: '2. Transformers and Attention Maps',
                  content: 'Generative models like Gemini utilize self-attention mechanisms (such as dot-product multi-head attention) to map context relations across rich token vectors simultaneously.'
                },
                {
                  title: '3. Ethical Deployment and Future Career Tracks',
                  content: 'Engineers must maintain security safeguards, avoid biases, handle data privacy securely, and design models aligned to transparent guidelines.'
                }
              ],
              summary: "Prepares software developers to write machine learning systems, leverage neural layer activation formulas, and prompt generative AI APIs.",
              quiz: [
                {
                  questionText: "What role does the activation function (like ReLU) play inside artificial neural node layers?",
                  options: ["Deletes database records", "Injects non-linearity for complex pattern learning", "Translates Javascript to code", "Turns the server power off"],
                  correctOptionIndex: 1,
                  explanation: "Activation functions introduce non-linear mapping capabilities so deeper networks can model non-linear boundaries."
                },
                {
                  questionText: "What core mechanism introduced in 2017 allows Transformers to handle long context relationships efficiently?",
                  options: ["Binary search", "Dynamic hashing", "Self-Attention", "Relational indexing"],
                  correctOptionIndex: 2,
                  explanation: "Self-Attention empowers the model to weigh the importance of different words compared to other items in the sequence."
                },
                {
                  questionText: "LLMs predict the most likely subsequent ___ in a contextual sequence.",
                  options: ["Audio wave", "Image pixel", "Semantic Token / word", "Database index"],
                  correctOptionIndex: 2,
                  explanation: "Language models guess subsequent tokens based on probability distributions computed over training corpora."
                }
              ],
              createdAt: "2026-06-02T12:00:00.000Z"
            },
            {
              lessonId: 'seed-lesson-3',
              title: 'Newton\'s Laws of Motion & Fields of Gravity',
              level: 'Grade 12',
              subject: 'Physics',
              curriculumStandard: 'Ministry of Education & WAEC Certified Gravitation Syllabus Compliance',
              introduction: 'Physics studies matter, forces, and motion. This module masterfully reviews Isaac Newton\'s laws of mechanical motion and universal attraction.',
              sections: [
                {
                  title: '1. Inertia, Force, and Action-Reaction',
                  content: 'Newton\'s 1st Law guarantees inertia exists. The 2nd Law defines F=ma (Force equals mass times acceleration). The 3rd Law establishes that action-reaction pairs are equal and opposite.'
                },
                {
                  title: '2. Universal Gravitational Formula',
                  content: 'Objects pull each other proportional to masses and inversely to the squared separation distance: F = G*(m1*m2)/r².'
                },
                {
                  title: '3. Kinetic vs Potential Conversions',
                  content: 'Descending bodies translate PE = mgh directly into KE = 0.5 * m * v², conserving mechanical energy total sums.'
                }
              ],
              summary: "Master gravity, kinetic equations, mechanics equations, and vector forces checked across regional exams.",
              quiz: [
                {
                  questionText: "What represents Newton's Second Law equation?",
                  options: ["E = mc²", "F = ma", "PV = nRT", "v = d/t"],
                  correctOptionIndex: 1,
                  explanation: "Newton's second law is defined by Force = mass x acceleration."
                },
                {
                  questionText: "What happens to Potential Energy (PE) when an object falls freely in a vacuum?",
                  options: ["Increases", "Remains unchanged", "Converts into Kinetic Energy", "Disappears entirely"],
                  correctOptionIndex: 2,
                  explanation: "Conserved potential energy changes directly to kinetic speed mechanics."
                }
              ],
              createdAt: "2026-06-03T12:00:00.000Z"
            }
          ];
          setAcademyLessons(seedLessons);
        } else {
          setAcademyLessons(list);
        }
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Could not load real-time lessons: ", e);
    }
  }, []);

  // Sync Student login from LocalStorage on load
  useEffect(() => {
    const storedStudent = localStorage.getItem('borbor_student');
    if (storedStudent) {
      try {
        setStudentUser(JSON.parse(storedStudent));
      } catch {
        localStorage.removeItem('borbor_student');
      }
    }
    const isSchoolAdmin = localStorage.getItem('borbor_admin_active');
    if (isSchoolAdmin === 'true') {
      setAdminUser(true);
    }
  }, []);

  // Fetch registered school students & reports (if admin tab or student portal is selected)
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const qStudents = query(collection(db, 'school_students'), orderBy('fullName', 'asc'));
        const unsubStudents = onSnapshot(qStudents, (snap) => {
          const list: any[] = [];
          snap.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() });
          });
          setStudentsList(list);
        });

        const qReports = collection(db, 'student_reports');
        const unsubReports = onSnapshot(qReports, (snap) => {
          const list: any[] = [];
          snap.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() });
          });
          setReportsList(list);
        });

        return () => {
          unsubStudents();
          unsubReports();
        };
      } catch (err) {
        console.warn("Could not load school databases from Firestore", err);
      }
    };

    fetchStudents();
  }, [adminUser]);

  // Read real-time Announcements / School platform posts
  useEffect(() => {
    const q = query(collection(db, 'school_announcements'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      if (list.length === 0) {
        // Feed mock seed data for announcements if empty
        setAnnouncements([
          {
            id: 'seed-announce-1',
            title: 'Welcome to the New School Term!',
            content: `${SCHOOL_NAME} opens its gates for the new academic semester. Registration is currently ongoing for e-learning across all grade levels and our advanced undergrad Tracks.`,
            imageUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200',
            createdAt: new Date(),
            author: 'Administration office'
          }
        ]);
      } else {
        setAnnouncements(list);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync Logged-In Student Report Card
  useEffect(() => {
    if (studentUser) {
      const reportRef = doc(db, 'student_reports', studentUser.studentId);
      const unsubReport = onSnapshot(reportRef, (docSnap) => {
        if (docSnap.exists()) {
          setActiveReport(docSnap.data() as StudentReport);
        } else {
          setActiveReport(null);
        }
      });
      return () => unsubReport();
    } else {
      setActiveReport(null);
    }
  }, [studentUser]);

  // GPA & Letter Grade Calculator based on Liberia High School System
  const calculateLetterAndPoints = (numGrade: number) => {
    if (numGrade >= 90) return { letter: 'A', status: 'Pass', points: 4.0, color: 'text-emerald-600 bg-emerald-50' };
    if (numGrade >= 80) return { letter: 'B', status: 'Pass', points: 3.0, color: 'text-indigo-600 bg-indigo-50' };
    if (numGrade >= 75) return { letter: 'C', status: 'Pass', points: 2.0, color: 'text-blue-600 bg-blue-50' };
    // 74 below fails as requested!
    return { letter: 'F', status: 'Fails', points: 0.0, color: 'text-red-600 bg-red-50' };
  };

  const computeGPA = (grades: StudentGrades[]) => {
    if (grades.length === 0) return { gpa: 0, average: 0 };
    let totalPoints = 0;
    let totalScore = 0;
    grades.forEach(g => {
      const calc = calculateLetterAndPoints(g.grade);
      totalPoints += calc.points;
      totalScore += g.grade;
    });
    const calculatedGpa = parseFloat((totalPoints / grades.length).toFixed(2));
    const calculatedAverage = parseFloat((totalScore / grades.length).toFixed(1));
    return { gpa: calculatedGpa, average: calculatedAverage };
  };

  // Student Sign-Up Handle
  const handleStudentSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!signUpStudentId || !signUpFullName || !signUpPassword) {
      setAuthError('Please fill in all required registration fields.');
      return;
    }

    const cleanId = signUpStudentId.trim().toUpperCase();

    try {
      // Check if student ID already exists
      const docRef = doc(db, 'school_students', cleanId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setAuthError(`Student ID# "${cleanId}" is already registered. Please login or contact administration.`);
        return;
      }

      await setDoc(docRef, {
        studentId: cleanId,
        fullName: signUpFullName.trim(),
        password: signUpPassword,
        gradeLevel: signUpGradeLevel,
        parentName: signUpParentName.trim() || 'Not Specified',
        phone: signUpPhone || 'Not Specified',
        parentPhone: signUpParentPhone || 'Not Specified',
        gender: signUpGender,
        approved: true, // Autoapprove on signup for ease of preview testing
        createdAt: new Date().toISOString()
      });

      setAuthSuccess(`Registration successful! ID: ${cleanId}. Log in now.`);
      setIsSignUpMode(false);
      setStudentIdInput(cleanId);
    } catch (err: any) {
      setAuthError(`SignUp error: ${err.message}`);
    }
  };

  // Student Login Handle
  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!studentIdInput || !studentPasswordInput) {
      setAuthError('Please enter Student ID# and credential password.');
      return;
    }

    const cleanId = studentIdInput.trim().toUpperCase();

    try {
      const docRef = doc(db, 'school_students', cleanId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        setAuthError(`No student registered under ID# "${cleanId}".`);
        return;
      }

      const studData = docSnap.data();
      if (studData.password !== studentPasswordInput) {
        setAuthError('Invalid credential password. Please verify and try again.');
        return;
      }

      const activeStud = { studentId: cleanId, fullName: studData.fullName, gradeLevel: studData.gradeLevel };
      localStorage.setItem('borbor_student', JSON.stringify(activeStud));
      setStudentUser(activeStud);
      setStudentPasswordInput('');
      setAuthSuccess('Logged in successfully!');
    } catch (err: any) {
      setAuthError(`Login error: ${err.message}`);
    }
  };

  // Admin Login Handle (Check user credentials aki.sokpah.link@gmail.com / Admin@2026)
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    const cleanEmail = adminEmailInput.trim().toLowerCase();

    // Verify Admin credentials
    const isLocalMatch = cleanEmail === 'aki.sokpah.link@gmail.com' && adminPasswordInput === 'Admin@2026';
    // Workspace developer test escape
    const isDevMatch = cleanEmail === 'luckyglobalnews@gmail.com' && adminPasswordInput === 'Admin@2026';

    if (isLocalMatch || isDevMatch) {
      setAdminUser(true);
      localStorage.setItem('borbor_admin_active', 'true');
      setAdminPasswordInput('');
      setAuthSuccess('Authorized Admin access granted!');
    } else {
      setAuthError('Access Denied. Invalid admin email or secure password.');
    }
  };

  // Logouts
  const handleLogOutStudent = () => {
    localStorage.removeItem('borbor_student');
    setStudentUser(null);
  };

  const handleLogOutAdmin = () => {
    localStorage.removeItem('borbor_admin_active');
    setAdminUser(false);
  };

  // Grade Entry Logic
  const handleAddSubjectGrade = () => {
    if (!newSubjectName.trim()) return;
    if (newSubjectGrade === '' || newSubjectGrade < 0 || newSubjectGrade > 100) {
      setGradeSubmitError('Grade must be a premium numeric percentage score from 0 to 100.');
      return;
    }
    setInputSubjects([
      ...inputSubjects,
      { subjectName: newSubjectName.trim(), grade: Number(newSubjectGrade) }
    ]);
    setNewSubjectName('');
    setNewSubjectGrade('');
    setGradeSubmitError('');
  };

  const handleRemoveSubjectGrade = (index: number) => {
    setInputSubjects(inputSubjects.filter((_, idx) => idx !== index));
  };

  // Save student academic grades report card
  const handleSaveStudentReport = async () => {
    if (!selectedStudentForReport) return;
    if (inputSubjects.length === 0) {
      setGradeSubmitError('Please enter at least one academic subject grade first.');
      return;
    }

    try {
      const { gpa, average } = computeGPA(inputSubjects);
      const reportId = selectedStudentForReport.studentId;

      const reportData: StudentReport = {
        studentId: reportId,
        fullName: selectedStudentForReport.fullName,
        gradeLevel: selectedStudentForReport.gradeLevel,
        gpa,
        averageGrade: average,
        grades: inputSubjects,
        term: selectedTerm,
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'student_reports', reportId), reportData);
      setGradeSubmitSuccess(`Success! Uploaded and calculated reports for ${selectedStudentForReport.fullName}.`);
      
      // Auto-load updated details
      setSelectedStudentForReport(null);
      setInputSubjects([]);
    } catch (err: any) {
      setGradeSubmitError(`Database save failure: ${err.message}`);
    }
  };

  // Delete Student Profile
  const handleDeleteStudent = async (studentId: string) => {
    if (window.confirm(`Are you absolutely sure you want to delete profile for student ID# ${studentId}?`)) {
      try {
        await deleteDoc(doc(db, 'school_students', studentId));
        await deleteDoc(doc(db, 'student_reports', studentId));
      } catch (err: any) {
        alert(`Error deleting: ${err.message}`);
      }
    }
  };

  // --- Online Academy Action Methods (LOSN) ---
  const handleEnrollTrack = (trackName: string) => {
    setEnrolledTrack(trackName);
    localStorage.setItem('enrolled_degree_track', trackName);
  };

  const handleAbandonTrack = () => {
    if (window.confirm("Are you sure you want to change or drop your active degree track? Your certified progress will still be recorded.")) {
      setEnrolledTrack(null);
      localStorage.removeItem('enrolled_degree_track');
    }
  };

  const handleGenerateAiLessonOnDemand = async () => {
    setIsGeneratingLesson(true);
    setGenError('');
    setGenSuccess('');
    try {
      const response = await fetch('/api/courses/generate-lesson', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          level: genLevel,
          subject: genSubject
        })
      });

      const resData = await response.json();
      if (resData.success) {
        setGenSuccess(`Incredible! AI Teacher successfully compiled and posted "${resData.lesson.title}" conforming with national standards.`);
        // Select the newly created lesson instantly for study!
        setSelectedLesson(resData.lesson);
        setShowQuiz(false);
        setActiveQuizIndex(0);
        setSelectedAnswers({});
        setShowQuizResults(false);
        setCertificateClaimed(false);
      } else {
        setGenError(resData.message || 'AI compilation of course curriculum hit a transient roadblock.');
      }
    } catch (err: any) {
      setGenError(err.message || 'Could not communicate with Online School AI Teachers.');
    } finally {
      setIsGeneratingLesson(false);
    }
  };

  const startLessonQuiz = () => {
    if (!selectedLesson) return;
    setShowQuiz(true);
    setActiveQuizIndex(0);
    setSelectedAnswers({});
    setShowQuizResults(false);
    setCertificateClaimed(false);
  };

  const handleAnswerSelect = (qIdx: number, oIdx: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [qIdx]: oIdx
    }));
  };

  const handleQuizSubmit = () => {
    if (!selectedLesson || !selectedLesson.quiz) return;
    const quizList = selectedLesson.quiz;
    let correctCount = 0;
    
    quizList.forEach((qObj: any, index: number) => {
      if (selectedAnswers[index] === qObj.correctOptionIndex) {
        correctCount++;
      }
    });

    const percent = Math.round((correctCount / quizList.length) * 100);
    setQuizScorePercent(percent);
    const passed = percent >= 80; // 80% passing grade requirement
    setQuizPassed(passed);
    setShowQuizResults(true);

    if (passed) {
      // Auto-register completion in local storage
      const updatedList = [...claimedCertificatesList];
      if (!updatedList.includes(selectedLesson.lessonId)) {
        updatedList.push(selectedLesson.lessonId);
        setClaimedCertificatesList(updatedList);
        localStorage.setItem('claimed_certificates', JSON.stringify(updatedList));
      }
    }
  };

  const handleClaimCertificate = () => {
    setCertificateClaimed(true);
  };

  // Publish Announcement directly on school platform
  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnnounceSuccess('');
    if (!newAnnounceTitle || !newAnnounceContent) return;

    try {
      const docId = `announcement-${Date.now()}`;
      await setDoc(doc(db, 'school_announcements', docId), {
        title: newAnnounceTitle.trim(),
        content: newAnnounceContent.trim(),
        imageUrl: newAnnounceImage,
        createdAt: new Date().toISOString(),
        author: 'Administrator'
      });

      // Also publish to the Global News "articles" tab to broadcast on official platform
      const newsArticleId = `borbor-news-${Date.now()}`;
      await setDoc(doc(db, 'articles', newsArticleId), {
        title: `[School News] ${newAnnounceTitle.trim()}`,
        content: `### Announcement from ${SCHOOL_NAME}\n\n${newAnnounceContent.trim()}\n\nContact Office: ${SCHOOL_EMAIL} | ${SCHOOL_PHONE}\nLocation: ${SCHOOL_LOCATION}`,
        summary: `Official announcement posted by school admin of ${SCHOOL_NAME}.`,
        category: 'WAEC Liberia 🇱🇷',
        imageUrl: newAnnounceImage,
        publishedAt: new Date(),
        authorId: 'SchoolAdmin',
        authorName: 'School Principal Office',
        viewsCount: 1,
        likesCount: 0,
        publishedByAI: false,
        systemWriteToken: "ai_editor_bot_secure_token_fe365be9"
      });

      setNewAnnounceTitle('');
      setNewAnnounceContent('');
      setAnnounceSuccess('Announcement published on school platform and global news feeds!');
    } catch (err: any) {
      alert(`Publishing failure: ${err.message}`);
    }
  };

  // Filter and Search logic for student database
  const filteredStudents = studentsList.filter(stu => {
    const matchesSearch = stu.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          stu.studentId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = gradeFilter === 'All' || stu.gradeLevel === gradeFilter;
    return matchesSearch && matchesGrade;
  });

  return (
    <div id="school-portal-root" className="min-h-screen bg-[#fafbfc] text-slate-900 border-x border-gray-150 py-2.5">
      
      {/* 🚀 SPLASH SCREEN LOADER */}
      <AnimatePresence>
        {showSplash && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 bg-[#0e1e38] z-50 flex flex-col items-center justify-center p-6 text-white text-center"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center"
            >
              <img 
                src={LOGO_URL} 
                alt={`${SCHOOL_NAME} Logo`} 
                className="w-36 h-36 rounded-full object-cover border-4 border-amber-400 shadow-2xl mb-6 shadow-[#ca8a04]/40 animate-pulse"
                referrerPolicy="no-referrer"
              />
              <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400 mb-2 font-bold block bg-[#ca8a04]/20 px-3.5 py-1.5 rounded-full border border-amber-400/35">
                🏫 Welcome to Excellence
              </span>
              <h2 className="text-xl md:text-3xl font-serif font-black text-amber-400 tracking-tight leading-normal max-w-2xl px-4">
                {SCHOOL_NAME}
              </h2>
              <div className="w-16 h-1.5 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full my-4"></div>
              <p className="text-slate-300 text-xs font-serif font-medium tracking-wide italic max-w-lg mb-6">
                "A School of your choice that is transforming & building up the lives of our future generations."
              </p>
              <div className="flex gap-2.5 items-center bg-slate-900/60 p-2.5 px-4 rounded-xl border border-slate-700/50">
                <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0"></div>
                <span className="text-slate-350 text-[10px] font-mono tracking-wider font-extrabold uppercase select-none animate-pulse">Launching Portal Layout...</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PORTAL COVER HEADER BRAND & NAV BAR */}
      <div className="max-w-7xl mx-auto bg-white rounded-2xl border border-gray-150 shadow-md mb-8 overflow-hidden">
        {/* Banner with School logo */}
        <div className="bg-gradient-to-r from-[#0d1f3d] via-[#152e55] to-[#122442] p-6 md:p-10 relative overflow-hidden flex flex-col md:flex-row items-center justify-between text-white border-b border-[#ca8a04]/30 gap-6">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#ca8a04]/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-85 h-85 bg-blue-500/5 rounded-full blur-3xl -ml-20 -mb-20"></div>

          <div className="flex flex-col md:flex-row items-center gap-6 relative z-10 text-center md:text-left">
            <img 
              src={LOGO_URL} 
              alt="School Logo" 
              className="w-24 h-24 rounded-full object-cover border-3 border-amber-400 shadow-xl bg-slate-900 shrink-0" 
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1.5">
                <span className="bg-amber-400/10 text-amber-400 border border-amber-400/30 text-[9px] font-mono font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-full">
                  OFFICIAL PORTAL
                </span>
                <span className="bg-blue-400/10 text-blue-350 border border-blue-400/20 text-[9px] font-mono font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-full">
                  Grade 1st - 12th EXCELLENCE
                </span>
              </div>
              <h1 className="text-xl md:text-3xl font-serif font-black tracking-tight text-amber-400 mr-2">
                {SCHOOL_NAME}
              </h1>
              <p className="text-xs md:text-sm text-slate-300 italic font-medium leading-relaxed max-w-3xl mt-1 font-serif">
                "Where learning is just not the goal, we also inspire!"
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end justify-center text-center md:text-right shrink-0 relative z-10 gap-1.5">
            <span className="text-[10px] font-mono font-bold text-slate-300">{SCHOOL_LOCATION}</span>
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/25 p-1 px-2 rounded-lg font-black">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              PORTAL SYSTEM LIVE
            </span>
          </div>
        </div>

        {/* Dynamic navigation links */}
        <div className="bg-slate-50 border-b border-gray-150 p-2.5 overflow-x-auto">
          <div className="flex space-x-1.5 max-w-7xl mx-auto px-1.5 shrink-0">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition ${
                activeTab === 'home'
                  ? 'bg-[#0d1f3d] text-white'
                  : 'hover:bg-gray-150 text-slate-600'
              }`}
            >
              School Website
            </button>
            <button
              onClick={() => setActiveTab('announcements')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition ${
                activeTab === 'announcements'
                  ? 'bg-[#0d1f3d] text-white'
                  : 'hover:bg-gray-150 text-slate-600'
              }`}
            >
              School Platform Posts ({announcements.length})
            </button>
            <button
              onClick={() => setActiveTab('portal')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition flex items-center gap-1.5 ${
                activeTab === 'portal'
                  ? 'bg-[#0d1f3d] text-white'
                  : 'hover:bg-gray-150 text-slate-600'
              }`}
            >
              <User className="w-3.5 h-3.5 text-amber-500" />
              Student Portal {studentUser ? `(${studentUser.fullName})` : ''}
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition flex items-center gap-1.5 ${
                activeTab === 'admin'
                  ? 'bg-[#0d1f3d] text-white'
                  : 'hover:bg-gray-150 text-slate-600'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
              Admin Access {adminUser ? '(Active)' : ''}
            </button>
            <button
              onClick={() => setActiveTab('academy')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition flex items-center gap-1.5 ${
                activeTab === 'academy'
                  ? 'bg-[#005fb8] text-white'
                  : 'hover:bg-gray-150 text-slate-600'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              LOSN Online Academy 🎓
            </button>
            <button
              onClick={() => setActiveTab('contact')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition ${
                activeTab === 'contact'
                  ? 'bg-[#0d1f3d] text-white'
                  : 'hover:bg-gray-150 text-slate-600'
              }`}
            >
              Contact School
            </button>
          </div>
        </div>
      </div>

      {/* CORE DISPLAY OUTLET PANEL */}
      <div id="school-content-canvas" className="max-w-7xl mx-auto px-4 md:px-0">
        
        {/* TAB 1: WEBSITE HOME PAGE */}
        {activeTab === 'home' && (
          <div className="space-y-8 animate-fade-in font-sans">
            {/* HERO INTRODUCTION BLOCK */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
              <div className="md:col-span-7 bg-white rounded-2xl border border-gray-150 p-6 md:p-8 flex flex-col justify-between shadow-sm">
                <div>
                  <h3 className="text-xl md:text-2xl font-serif font-black text-[#0d1f3d] tracking-tight leading-snug mb-4">
                    Transforming & Building Up Futures in Mt Barclay, Liberia
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-4">
                    Welcome to the {SCHOOL_NAME} OFFICIAL platform. We are dedicated to delivering academic and moral standards for student academic elevation.
                  </p>
                  <p className="text-slate-600 text-sm leading-relaxed mb-6 font-serif italic">
                    "Here, learning is just not the goal, we also inspire our future generations to become national and academic flagbearers!"
                  </p>
                </div>

                <div className="border-t border-gray-150 pt-5 flex flex-wrap gap-4 items-center">
                  <button 
                    onClick={() => setActiveTab('portal')}
                    className="bg-[#0d1f3d] hover:bg-slate-900 text-white font-mono font-bold text-xs uppercase tracking-wide px-5 py-3 rounded-xl flex items-center gap-1.5 transition shadow"
                  >
                    <span>Enter Student Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setActiveTab('contact')}
                    className="border border-gray-300 hover:bg-slate-50 text-[#0d1f3d] font-mono font-bold text-xs uppercase tracking-wide px-5 py-3 rounded-xl transition"
                  >
                    Contact Administration
                  </button>
                </div>
              </div>

              {/* PHOTO / MOTTO BANNER COLUMN */}
              <div className="md:col-span-5 bg-gradient-to-br from-[#0d1f3d] to-[#1a3866] rounded-2xl p-6 flex flex-col justify-between text-white relative overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/5 rounded-full blur-2xl"></div>
                
                <div>
                  <GraduationCap className="w-10 h-10 text-amber-400 mb-4 animate-bounce" />
                  <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider font-extrabold mb-1 block">OUR CORE MOTTO</span>
                  <p className="text-lg font-serif italic tracking-wide text-amber-200 font-bold leading-normal">
                    "A School of your choice that is transforming & building up the lives of our future generations."
                  </p>
                </div>

                <div className="space-y-3 bg-slate-900/40 p-4 rounded-xl border border-white/10 mt-6 md:mt-0">
                  <div className="flex items-center gap-3 text-xs font-mono text-slate-205">
                    <CheckCircle className="w-4.5 h-4.5 text-amber-400 shrink-0" />
                    <span>Highly Qualified Academic Instructors</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono text-slate-205">
                    <CheckCircle className="w-4.5 h-4.5 text-amber-400 shrink-0" />
                    <span>State of Art Academic Curriculum</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono text-slate-205">
                    <CheckCircle className="w-4.5 h-4.5 text-amber-400 shrink-0" />
                    <span>Clean and Safe Learning Campus</span>
                  </div>
                </div>
              </div>
            </div>

            {/* QUICK FACTS BENTO GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm text-center">
                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-3.5">
                  <BookOpen className="w-6 h-6 text-amber-600" />
                </div>
                <h4 className="text-sm font-bold text-[#0d1f3d] mb-1">Modern High School Portal</h4>
                <p className="text-xs text-slate-500 leading-normal">
                  Grades 1st through 12th grade completely documented with persistent, automated report card storage.
                </p>
              </div>

              <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm text-center">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-3.5">
                  <Calculator className="w-6 h-6 text-emerald-600" />
                </div>
                <h4 className="text-sm font-bold text-[#0d1f3d] mb-1">Automatic GPA Grade Calculator</h4>
                <p className="text-xs text-slate-500 leading-normal">
                  Grade entry with automated pass/fail flags (<span className="text-red-500 font-bold">74 & below is fails</span>) and student individual average computations.
                </p>
              </div>

              <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm text-center">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3.5">
                  <Facebook className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="text-sm font-bold text-[#0d1f3d] mb-1">Official platform</h4>
                <p className="text-xs text-slate-500 leading-normal">
                  Connect direct with our facebook media channel feed or join live conversations regarding Liberia public school updates.
                </p>
              </div>
            </div>

            {/* RECENT ANNOUNCEMENTS PREVIEW */}
            <div className="bg-white rounded-2xl border border-gray-150 p-6 md:p-8 shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-150 pb-4 mb-5">
                <div>
                  <h3 className="text-lg font-serif font-black text-[#0d1f3d]">Latest School Announcements</h3>
                  <p className="text-xs text-slate-500">Official bulletins published by school administrations.</p>
                </div>
                <button 
                  onClick={() => setActiveTab('announcements')}
                  className="text-xs font-mono text-amber-600 hover:underline font-bold flex items-center gap-1"
                >
                  <span>See all dispatches</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {announcements.slice(0, 2).map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-xs hover:border-gray-300 transition duration-300 flex flex-col justify-between">
                    <div>
                      <img src={item.imageUrl} alt={item.title} className="w-full h-44 object-cover border-b border-gray-250" />
                      <div className="p-4">
                        <span className="text-[9px] font-mono font-bold bg-[#ca8a04]/10 text-amber-600 p-1 px-2.5 rounded-full uppercase mb-2 inline-block">
                          Platform Alert
                        </span>
                        <h4 className="text-sm font-black font-sans text-[#0d1f3d] mb-2 leading-tight uppercase">{item.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed truncate-2-lines">{item.content}</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3.5 px-4 pb-4 border-t border-gray-205 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>By: {item.author || 'Admin Office'}</span>
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ANNOUNCEMENTS BOARD */}
        {activeTab === 'announcements' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-xl border border-gray-150 p-5 md:p-8 shadow-sm">
              <h2 className="text-xl md:text-2xl font-serif font-black text-[#0d1f3d] mb-2">School Official Communications Desk</h2>
              <p className="text-slate-505 text-xs max-w-3xl leading-relaxed">
                Stay updated with official bulletins, event declarations, WAEC exam updates, registration pin procedures, and announcements from {SCHOOL_NAME}.
              </p>
            </div>

            <div className="space-y-6">
              {announcements.map((item) => (
                <div key={item.id} className="bg-white rounded-xl border border-gray-150 overflow-hidden shadow-xs grid grid-cols-1 md:grid-cols-12 gap-0 items-stretch">
                  <div className="md:col-span-4 min-h-48 md:min-h-0 relative">
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover absolute inset-0" />
                  </div>
                  <div className="md:col-span-8 p-6 md:p-8 flex flex-col justify-between">
                    <div>
                      <div className="flex gap-2 items-center mb-2 text-[10px] font-mono text-slate-500">
                        <span className="bg-[#ca8a04]/10 text-amber-600 p-1 px-2.5 rounded-full uppercase font-bold">Official Publication</span>
                        <span>•</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                      <h3 className="text-base md:text-lg font-black text-[#0d1f3d] mb-3 leading-snug uppercase">{item.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{item.content}</p>
                    </div>

                    <div className="border-t border-gray-150 pt-4 mt-6 flex items-center justify-between text-xs text-slate-500 font-mono">
                      <span>Issued By: <span className="font-bold text-[#0d1f3d]">{item.author || 'Administrative Board'}</span></span>
                      <span className="text-[#ca8a04] font-bold">Mount Barclay Campus, Liberia</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: STUDENT PORTAL (SIGN UP, LOGIN & PERFORMANCE DASHBOARD) */}
        {activeTab === 'portal' && (
          <div className="space-y-8 animate-fade-in font-sans">
            
            {/* IF STUDENT IS LOGGED IN, SHOW PERFORMANCE PROFILE DASHBOARD */}
            {studentUser ? (
              <div className="space-y-8">
                {/* 💳 Student Header Card */}
                <div className="bg-white rounded-2xl border border-gray-150 p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-[#0d1f3d] text-white rounded-full flex items-center justify-center font-bold font-mono text-lg shadow-lg">
                      {studentUser.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-serif font-black text-[#0d1f3d]">{studentUser.fullName}</h3>
                      <div className="flex flex-wrap gap-2.5 items-center mt-1">
                        <span className="text-[10px] bg-slate-900/10 text-slate-800 font-mono p-1 px-2.5 rounded font-bold uppercase">
                          ID: {studentUser.studentId}
                        </span>
                        <span className="text-[10px] bg-amber-400/15 text-amber-600 font-mono p-1 px-2.5 rounded font-black uppercase">
                          {studentUser.gradeLevel || 'Secondary High School'}
                        </span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-500/20 font-mono p-1 px-2.5 rounded font-black uppercase flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-650" /> Profile Verified
                        </span>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleLogOutStudent}
                    className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-mono font-bold text-xs uppercase px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out Student Session</span>
                  </button>
                </div>

                {/* Report Card content section */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                  
                  {/* Left stats panel */}
                  <div className="md:col-span-4 bg-[#0d1f3d] text-white rounded-2xl p-6 shadow-sm border border-[#ca8a04]/20 space-y-6">
                    <div className="text-center relative py-6 border-b border-white/10">
                      <GraduationCap className="w-10 h-10 text-amber-400 mx-auto mb-2.5" />
                      <span className="text-[10px] font-mono uppercase text-amber-400 font-bold block mb-1">Academic Status</span>
                      <h4 className="text-lg font-serif font-bold text-white">Honor Roll Audit</h4>
                      
                      {activeReport ? (
                        <div className="mt-6 space-y-2">
                          <div className="text-4xl font-serif font-black text-amber-400">
                            {activeReport.gpa.toFixed(2)}
                          </div>
                          <span className="text-xs font-mono text-slate-300 block">Overall Accumulator GPA</span>
                          <div className="bg-slate-900/40 border border-white/5 p-2 rounded-lg mt-2 font-mono text-[10px] uppercase text-amber-400 font-black">
                            {activeReport.gpa >= 3.5 ? '🏆 High Distinction Honor' : activeReport.gpa >= 3.0 ? '🌟 Distinguish Scholar' : 'Passed Academic Standing'}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-6 text-xs text-slate-300 border border-dashed border-white/20 p-4 rounded-xl font-mono leading-relaxed bg-slate-900/40">
                          Grades reports and transcript cards are currently pending upload from secondary admin staff.
                        </div>
                      )}
                    </div>

                    {activeReport && (
                      <div className="space-y-4 pt-2 font-mono">
                        <div className="flex justify-between items-center text-xs">
                          <span className="opacity-75">Period Semester:</span>
                          <span className="font-bold text-amber-400">{activeReport.term}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="opacity-75">Average Score:</span>
                          <span className="font-bold text-amber-400">{activeReport.averageGrade}%</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="opacity-75">Courses Count:</span>
                          <span className="font-bold text-amber-400">{activeReport.grades?.length || 0} Subjects</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="opacity-75">Failed Subjects:</span>
                          <span className="font-bold text-red-400">
                            {activeReport.grades.filter(g => g.grade <= 74).length} Courses
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right grades details card */}
                  <div className="md:col-span-8 bg-white rounded-2xl border border-gray-150 p-6 md:p-8 shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-150 pb-4 mb-6">
                      <div>
                        <h4 className="text-lg font-serif font-black text-[#0d1f3d]">Academic Report Card</h4>
                        <p className="text-xs text-slate-500">LR. Online School System (LOSN) Official Grading Scale</p>
                      </div>
                      {activeReport && (
                        <button
                          onClick={() => window.print()}
                          className="bg-slate-100 hover:bg-slate-150 text-slate-700 font-mono text-xs font-bold p-2 px-3.5 rounded-lg border border-gray-200 gap-1.5 transition uppercase flex items-center justify-center cursor-pointer shadow-xs"
                          title="Print Student Report Card"
                        >
                          <Printer className="w-4 h-4" />
                          <span>Print Card</span>
                        </button>
                      )}
                    </div>

                    {activeReport && activeReport.grades && activeReport.grades.length > 0 ? (
                      <div className="space-y-6">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs font-mono border-collapse">
                            <thead>
                              <tr className="bg-slate-50 text-slate-550 border-b border-gray-200">
                                <th className="p-4 uppercase font-black tracking-wider">Subject Name</th>
                                <th className="p-4 uppercase font-black tracking-wider text-center">Score %</th>
                                <th className="p-4 uppercase font-black tracking-wider text-center">Letter Grade</th>
                                <th className="p-4 uppercase font-black tracking-wider text-center">Scale Points</th>
                                <th className="p-4 uppercase font-black tracking-wider text-right">Pass Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {activeReport.grades.map((gradeObj, idx) => {
                                const evalGrade = calculateLetterAndPoints(gradeObj.grade);
                                return (
                                  <tr key={idx} className="border-b border-gray-100 hover:bg-slate-50 transition">
                                    <td className="p-4 font-bold text-slate-800 uppercase">{gradeObj.subjectName}</td>
                                    <td className="p-4 text-center text-sm font-bold text-slate-900">{gradeObj.grade}%</td>
                                    <td className="p-4 text-center">
                                      <span className={`p-1 px-2 text-[10px] rounded font-black ${evalGrade.color}`}>
                                        Grade {evalGrade.letter}
                                      </span>
                                    </td>
                                    <td className="p-4 text-center font-bold text-slate-650">{evalGrade.points.toFixed(1)}</td>
                                    <td className="p-4 text-right">
                                      <span className={`font-mono text-[10px] p-1 px-2.5 rounded font-black uppercase shrink-0 ${
                                        gradeObj.grade <= 74 
                                          ? 'bg-red-50 text-red-650 border border-red-200 animate-pulse' 
                                          : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                      }`}>
                                        {gradeObj.grade <= 74 ? 'Fails' : 'Pass'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Grading Policy Disclaimer footer */}
                        <div className="p-4 bg-slate-50 rounded-xl border border-gray-205 text-[11px] text-slate-500 leading-relaxed">
                          <span className="font-bold text-[#ca8a04]">Grading Scale Alert:</span> In compliance with regional academic guidelines established at LOSN, any grade scoring <span className="font-bold text-red-500 text-xs font-mono">74 and below constitutes an academic failure ("Fails")</span>. Accumulating GPA averages will adjust based on corresponding score parameters. Please contact administrative registries for grade correction claims.
                        </div>

                        {/* Authentic Registrar & Administrator Signatures */}
                        <div className="pt-6 border-t border-gray-150 flex justify-between items-end gap-x-12 px-2 mt-6">
                          <div className="text-left font-mono">
                            <span className="text-[9px] text-slate-400 block pb-0.5 uppercase tracking-wider">OFFICIAL REGISTRAR STAMP:</span>
                            <span className="text-xs font-bold block text-emerald-600">LR. ONLINE SCHOOL REGISTERED</span>
                            <span className="text-[8px] text-slate-400 block border-t border-gray-150 mt-1 pt-1">School Verification Registry Seal</span>
                          </div>

                          <div className="text-right flex flex-col items-center select-none font-mono">
                            <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase block mb-1">AUTHORIZED SIGNATURE:</span>
                            <span className="font-serif italic text-sm font-black tracking-widest text-[#005fb8] block bg-blue-50 px-3 py-1 rounded border border-blue-100">
                              sokpahakin
                            </span>
                            <span className="text-[8px] font-bold text-slate-800 block border-t border-gray-150 mt-1 pt-0.5">
                              Aki Sokpah, Executive Academic Chair
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-20 bg-slate-50 border border-dashed border-gray-250 rounded-xl">
                        <FileSpreadsheet className="w-12 h-12 text-slate-350 mx-auto mb-3" />
                        <h4 className="text-sm font-bold text-slate-700 uppercase">Grades Ledger Pending</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-normal">
                          The administration has verified your registration successfully. Individual semester report cards and subject lists are currently loading into system archives.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* STUDENT LOGGED OUT: DISPLAY LOGIN / SIGNUP TABS */
              <div className="max-w-md mx-auto bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-xl">
                <div className="bg-[#0d1f3d] text-white p-6 text-center border-b border-amber-400">
                  <GraduationCap className="w-10 h-10 text-amber-400 mx-auto mb-2" />
                  <span className="text-[9px] font-mono uppercase tracking-widest text-amber-400 font-bold">DASBMSE Students Desk</span>
                  <h3 className="text-lg font-serif font-bold text-white mt-1">Individual Student Portal</h3>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed font-serif italic">
                    Log in with your choose Student ID# & Password to access your academic transcripts and GPA.
                  </p>
                </div>

                <div className="p-6 md:p-8">
                  {authError && (
                    <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded text-red-800 text-xs font-mono flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{authError}</span>
                    </div>
                  )}

                  {authSuccess && (
                    <div className="mb-4 p-3 bg-emerald-50 border-l-4 border-emerald-500 rounded text-emerald-800 text-xs font-mono flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{authSuccess}</span>
                    </div>
                  )}

                  {/* IS SIGN UP ACTIVE VS LOGIN */}
                  {isSignUpMode ? (
                    /* SIGN UP INSTRUCTIONS AND REGISTRATION FORM */
                    <form onSubmit={handleStudentSignUp} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1 font-bold">Choose Student ID# (Required)</label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            required
                            value={signUpStudentId}
                            onChange={(e) => setSignUpStudentId(e.target.value)}
                            placeholder="e.g. DAS-2026-004"
                            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-850 placeholder-slate-400 uppercase font-mono focus:outline-none focus:border-[#ca8a04]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1 font-bold">Student Full Name (Required)</label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            required
                            value={signUpFullName}
                            onChange={(e) => setSignUpFullName(e.target.value)}
                            placeholder="First Name & Last Name"
                            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-850 placeholder-slate-400 focus:outline-none focus:border-[#ca8a04]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono id-password uppercase text-slate-500 mb-1 font-bold">Portal Secure Password (Required)</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                          <input
                            type="password"
                            required
                            value={signUpPassword}
                            onChange={(e) => setSignUpPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-8c focus:outline-none focus:border-[#ca8a04]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1 font-bold">Grade Level</label>
                          <select 
                            value={signUpGradeLevel}
                            onChange={(e) => setSignUpGradeLevel(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm text-slate-800 bg-white focus:outline-none focus:border-[#ca8a04]"
                          >
                            {Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`).map(g => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1 font-bold">Gender</label>
                          <select 
                            value={signUpGender}
                            onChange={(e) => setSignUpGender(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm text-slate-800 bg-white focus:outline-none focus:border-[#ca8a04]"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1 font-bold">Student Phone #</label>
                        <input
                          type="text"
                          value={signUpPhone}
                          onChange={(e) => setSignUpPhone(e.target.value)}
                          placeholder="+231..."
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm text-slate-850 focus:outline-none"
                        />
                      </div>

                      <div className="pt-2 border-t border-gray-150">
                        <span className="text-[9px] font-mono text-slate-400 uppercase font-black block mb-2">Secondary Parent Records</span>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <input
                              type="text"
                              value={signUpParentName}
                              onChange={(e) => setSignUpParentName(e.target.value)}
                              placeholder="Parent Full Name"
                              className="w-full border border-gray-300 rounded-lg p-2 text-sm text-slate-850 focus:outline-none"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={signUpParentPhone}
                              onChange={(e) => setSignUpParentPhone(e.target.value)}
                              placeholder="Parent Phone Number"
                              className="w-full border border-gray-300 rounded-lg p-2 text-sm text-slate-850 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-[#ca8a04] hover:bg-amber-600 text-white font-mono font-bold text-xs uppercase py-3 rounded-lg transition shadow-md cursor-pointer flex items-center justify-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Register Student Profile</span>
                      </button>

                      <div className="text-center pt-4 border-t border-gray-100 text-xs text-slate-500">
                        Already have matching credentials ID?{' '}
                        <button 
                          type="button"
                          onClick={() => setIsSignUpMode(false)}
                          className="text-[#ca8a04] hover:underline font-bold"
                        >
                          Sign In Student Tab
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* STUDENT PORTAL SIGN IN */
                    <form onSubmit={handleStudentLogin} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1 font-bold">Enter Student ID# (DAS-XXXX-XXX)</label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            required
                            value={studentIdInput}
                            onChange={(e) => setStudentIdInput(e.target.value)}
                            placeholder="e.g. DAS-2026-001"
                            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-850 placeholder-slate-400 uppercase font-mono focus:outline-none focus:border-[#ca8a04]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1 font-bold">Portal Secure Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                          <input
                            type="password"
                            required
                            value={studentPasswordInput}
                            onChange={(e) => setStudentPasswordInput(e.target.value)}
                            placeholder="••••••••"
                            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-850 focus:outline-none focus:border-[#ca8a04]"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-[#0d1f3d] hover:bg-slate-900 text-white font-mono font-bold text-xs uppercase py-3 rounded-lg transition shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Sign In Student Portal</span>
                      </button>

                      <div className="text-center pt-4 border-t border-gray-100 text-xs text-slate-500">
                        First time or student has no portal?{' '}
                        <button 
                          type="button"
                          onClick={() => setIsSignUpMode(true)}
                          className="text-[#ca8a04] hover:underline font-bold"
                        >
                          Register Student Sign Up
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SCHOOL PLATFORM ADMIN GATEWAY */}
        {activeTab === 'admin' && (
          <div className="space-y-8 animate-fade-in font-sans">
            
            {/* IF COMPLETED VALID ADMIN LOGIN: RENDER ADMIN WORKSPACE */}
            {adminUser ? (
              <div className="space-y-8">
                {/* Admin Header with logout */}
                <div className="bg-white rounded-2xl border border-gray-150 p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-650 text-white rounded-lg flex items-center justify-center font-bold">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-serif font-black text-[#0d1f3d] uppercase">School Administration Portal Control</h3>
                      <p className="text-xs text-slate-500 font-mono">Verified Access: President Office — Mount Barclay Administration Hub</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleLogOutAdmin}
                    className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-mono font-bold text-xs uppercase px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Deauthorize and Logout</span>
                  </button>
                </div>

                {/* Main Admin work segments: Post Announcement vs Grade Calculator Management */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Column: Register Student Database */}
                  <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-150 p-6 md:p-8 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-150 pb-4 mb-4">
                      <div>
                        <h4 className="text-base font-serif font-black text-[#0d1f3d] uppercase">Registered Students List ({filteredStudents.length})</h4>
                        <p className="text-xs text-slate-400">Total school student databases currently in secure cloud archives.</p>
                      </div>

                      {/* Grade Selector */}
                      <select 
                        value={gradeFilter}
                        onChange={(e) => setGradeFilter(e.target.value)}
                        className="border border-gray-300 rounded-lg p-1 px-2.5 text-xs text-slate-700 bg-white font-mono focus:outline-none"
                      >
                        <option value="All">All Grades (1st-12th)</option>
                        {Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`).map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>

                    {/* Search Field */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-3 w-4 h-4 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Search student by Name or unique ID#..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-gray-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                      />
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse font-sans">
                        <thead>
                          <tr className="bg-slate-50 text-slate-550 border-b border-gray-200">
                            <th className="p-3 font-mono text-[10px] font-black uppercase">ID & Name</th>
                            <th className="p-3 font-mono text-[10px] font-black uppercase text-center">Grade</th>
                            <th className="p-3 font-mono text-[10px] font-black uppercase text-center">GPA Status</th>
                            <th className="p-3 font-mono text-[10px] font-black uppercase text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredStudents.length > 0 ? (
                            filteredStudents.map((stu) => {
                              const relatedReport = reportsList.find(rep => rep.studentId === stu.studentId);
                              return (
                                <tr key={stu.id} className="border-b border-gray-100 hover:bg-slate-50 transition">
                                  <td className="p-3">
                                    <div className="font-bold text-[#0d1f3d]">{stu.fullName}</div>
                                    <span className="font-mono text-[10px] text-slate-400 uppercase font-black bg-slate-50 border border-gray-200 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                      {stu.studentId}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center font-bold text-slate-650">{stu.gradeLevel}</td>
                                  <td className="p-3 text-center">
                                    {relatedReport ? (
                                      <span className="bg-amber-450/15 text-amber-600 border border-amber-400/25 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                                        GPA: {relatedReport.gpa.toFixed(2)}
                                      </span>
                                    ) : (
                                      <span className="text-slate-350 text-[10px] font-mono italic">No Report</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-right space-x-1.5 text-[11px] font-mono">
                                    <button
                                      onClick={() => {
                                        setSelectedStudentForReport(stu);
                                        // Load existing report grades if any
                                        if (relatedReport && relatedReport.grades) {
                                          setInputSubjects(relatedReport.grades);
                                          setSelectedTerm(relatedReport.term || '1st Period Semester');
                                        } else {
                                          setInputSubjects([]);
                                        }
                                        setGradeSubmitSuccess('');
                                        setGradeSubmitError('');
                                      }}
                                      className="bg-blue-50 text-blue-650 border border-blue-200 hover:bg-blue-100 p-1 px-2.5 rounded font-black cursor-pointer transition uppercase"
                                    >
                                      Grades
                                    </button>
                                    <button
                                      onClick={() => handleDeleteStudent(stu.studentId)}
                                      className="bg-red-50 text-red-600 hover:bg-red-100 p-1 px-2.5 rounded font-black cursor-pointer transition uppercase"
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={4} className="p-8 text-center text-slate-400 text-xs font-mono">
                                No student records found. Wait for registrations or invite signups.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Column Workspace: Grades Calculator Form & Announcement Publisher */}
                  <div className="lg:col-span-5 space-y-8">
                    
                    {/* GRADE CALCULATOR AND ARCHIVER SUBPANEL */}
                    {selectedStudentForReport ? (
                      <div className="bg-[#0e1e38] text-white rounded-2xl p-6 shadow-md border border-amber-400/20 space-y-5">
                        <div className="flex justify-between items-start border-b border-white/10 pb-3">
                          <div>
                            <span className="text-[9px] font-mono text-amber-400 uppercase tracking-wider font-extrabold block">Active Editor Grade Card</span>
                            <h4 className="text-sm font-sans font-black text-white uppercase">{selectedStudentForReport.fullName}</h4>
                            <span className="text-[10px] text-slate-300 font-mono">ID: {selectedStudentForReport.studentId} | {selectedStudentForReport.gradeLevel}</span>
                          </div>
                          <button
                            onClick={() => setSelectedStudentForReport(null)}
                            className="text-slate-350 hover:text-white font-mono text-xs font-black uppercase p-1 shrink-0"
                          >
                            Cancel
                          </button>
                        </div>

                        {gradeSubmitSuccess && (
                          <div className="p-3 bg-emerald-500/20 border-l-3 border-emerald-400 rounded text-emerald-200 text-xs font-mono leading-normal">
                            {gradeSubmitSuccess}
                          </div>
                        )}

                        {gradeSubmitError && (
                          <div className="p-3 bg-red-500/20 border-l-3 border-red-400 rounded text-red-200 text-xs font-mono leading-normal">
                            {gradeSubmitError}
                          </div>
                        )}

                        {/* Period/Term Selector */}
                        <div className="space-y-1.5 font-mono">
                          <label className="block text-[10px] uppercase text-amber-400 font-black">Academic Grading Period:</label>
                          <select
                            value={selectedTerm}
                            onChange={(e) => setSelectedTerm(e.target.value)}
                            className="w-full bg-[#152e55] border border-white/10 rounded-lg p-2 text-xs text-white uppercase focus:outline-none"
                          >
                            <option value="1st Period Semester">1st Period Semester</option>
                            <option value="2nd Period Semester">2nd Period Semester</option>
                            <option value="Mid-Term Exams">Mid-Term Exams</option>
                            <option value="3rd Period Semester">3rd Period Semester</option>
                            <option value="Final Term Exams Cumulative">Final Term Exams Cumulative</option>
                          </select>
                        </div>

                        {/* Subject Grade Inputs */}
                        <div className="space-y-3 pt-2">
                          <span className="text-[10px] font-mono text-amber-400 uppercase font-black block">Spell Subject and Enter Grade:</span>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <input 
                                type="text"
                                placeholder="Subject spell (e.g. Biology)"
                                value={newSubjectName}
                                onChange={(e) => setNewSubjectName(e.target.value)}
                                className="w-full bg-[#152e55] border border-white/10 rounded-lg p-2 text-xs text-white placeholder-slate-400 uppercase focus:outline-none"
                              />
                            </div>
                            <div>
                              <input 
                                type="number"
                                placeholder="Grade score (0 - 100)"
                                value={newSubjectGrade}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setNewSubjectGrade(val === '' ? '' : Number(val));
                                }}
                                className="w-full bg-[#152e55] border border-white/10 rounded-lg p-2 text-xs text-white placeholder-slate-400 focus:outline-none font-mono"
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleAddSubjectGrade}
                            className="w-full bg-[#ca8a04] hover:bg-amber-600 text-white font-mono text-xs font-black uppercase py-2 rounded-lg transition shrink-0 cursor-pointer"
                          >
                            + Calculate & Add This Grade
                          </button>
                        </div>

                        {/* Live Grades Table and Averages */}
                        {inputSubjects.length > 0 ? (
                          <div className="space-y-4 pt-3 border-t border-white/10">
                            <span className="text-[10px] font-mono text-slate-300 uppercase block font-bold">Entered Subjects GPA calculations:</span>
                            <div className="max-h-48 overflow-y-auto space-y-2 border border-white/5 bg-[#09152a] p-2 rounded-xl">
                              {inputSubjects.map((sub, idx) => {
                                const analysis = calculateLetterAndPoints(sub.grade);
                                return (
                                  <div key={idx} className="flex justify-between items-center text-xs p-1.5 border-b border-white/5 font-mono">
                                    <div className="font-bold text-white uppercase truncate max-w-[150px]">{sub.subjectName}</div>
                                    <div className="flex gap-2 items-center">
                                      <span className="font-bold text-white">{sub.grade}%</span>
                                      <span className={`text-[9px] p-0.5 px-1.5 rounded font-black uppercase ${
                                        sub.grade <= 74 ? 'bg-red-500/25 text-red-300' : 'bg-emerald-500/25 text-emerald-300'
                                      }`}>
                                        {sub.grade <= 74 ? 'Fails' : 'Pass'}
                                      </span>
                                      <button 
                                        type="button"
                                        onClick={() => handleRemoveSubjectGrade(idx)}
                                        className="text-red-400 hover:text-red-300 font-bold px-1"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Summary points */}
                            <div className="bg-[#152e55] p-3 rounded-xl border border-white/5 font-mono text-xs flex justify-between items-center text-center">
                              <div>
                                <span className="text-[9px] opacity-75 uppercase block select-none">Average Out</span>
                                <span className="font-bold text-white text-sm">{computeGPA(inputSubjects).average}%</span>
                              </div>
                              <div className="border-l border-white/15 h-8"></div>
                              <div>
                                <span className="text-[9px] opacity-75 uppercase block select-none">Failed count</span>
                                <span className="font-bold text-red-350 text-sm">
                                  {inputSubjects.filter(s => s.grade <= 74).length} courses
                                </span>
                              </div>
                              <div className="border-l border-white/15 h-8"></div>
                              <div>
                                <span className="text-[9px] opacity-75 uppercase block select-none">Total GPA</span>
                                <span className="font-bold text-amber-400 text-sm">{computeGPA(inputSubjects).gpa.toFixed(2)}</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={handleSaveStudentReport}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-black uppercase py-3 rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-1.5 border border-emerald-500"
                            >
                              <FileText className="w-4 h-4" />
                              <span>Save & Upload Report Card</span>
                            </button>
                          </div>
                        ) : (
                          <div className="p-4 bg-slate-900/40 rounded-xl text-center text-xs text-slate-400 font-mono">
                            Add subjects grades to begin calculus matrix.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-sm text-center">
                        <FileSpreadsheet className="w-10 h-10 text-slate-350 mx-auto mb-2" />
                        <h5 className="text-xs font-bold text-slate-700 uppercase">Grades Assistant Active</h5>
                        <p className="text-[11px] text-slate-400 leading-normal max-w-sm mx-auto">
                          Select any registered student in the database on the Left, then press <span className="font-bold text-[#ca8a04]">"Grades"</span> button to manage academic transcripts, term grades and automatic GPA averages.
                        </p>
                      </div>
                    )}

                    {/* OFFICIAL PLATFORM POSTER / SCHOOL BOARD WRITER */}
                    <div className="bg-white rounded-2xl border border-gray-150 p-6 md:p-8 shadow-sm space-y-4">
                      <div>
                        <h4 className="text-sm font-serif font-black text-[#0d1f3d] uppercase flex items-center gap-1.5">
                          <Plus className="w-4.5 h-4.5 text-amber-600" /> Posting on school platform (News Builder)
                        </h4>
                        <p className="text-[11px] text-slate-400">Post news and official announcements broadcasted to users.</p>
                      </div>

                      {announceSuccess && (
                        <div className="p-3 bg-emerald-50 border-l-4 border-emerald-500 rounded text-emerald-800 text-xs font-mono">
                          {announceSuccess}
                        </div>
                      )}

                      <form onSubmit={handlePublishAnnouncement} className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1 font-bold">Post Title</label>
                          <input 
                            type="text"
                            required
                            placeholder="e.g. WAEC Register Deadline Extensions"
                            value={newAnnounceTitle}
                            onChange={(e) => setNewAnnounceTitle(e.target.value)}
                            className="w-full bg-slate-50 border border-gray-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1 font-bold">Post Image Link (URL)</label>
                          <input 
                            type="text"
                            placeholder="Image Url (preset applied by default)"
                            value={newAnnounceImage}
                            onChange={(e) => setNewAnnounceImage(e.target.value)}
                            className="w-full bg-slate-50 border border-gray-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none font-mono text-[11px]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1 font-bold">Announcement Content</label>
                          <textarea
                            required
                            rows={4}
                            placeholder="Type news text regarding secondary updates..."
                            value={newAnnounceContent}
                            onChange={(e) => setNewAnnounceContent(e.target.value)}
                            className="w-full bg-slate-50 border border-gray-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-[#0d1f3d] hover:bg-slate-900 text-white font-mono font-bold text-xs uppercase py-2.5 rounded-lg transition shadow cursor-pointer text-center"
                        >
                          Publish On Platforms NOW
                        </button>
                      </form>
                    </div>

                  </div>
                </div>
              </div>
            ) : (
              /* ADMIN LOGGED OUT: SHOW ACCESS GATE VERIFICATION FORM */
              <div className="max-w-md mx-auto bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-xl">
                <div className="bg-red-750 text-white p-6 text-center border-b border-amber-400">
                  <ShieldAlert className="w-10 h-10 text-white mx-auto mb-2" />
                  <span className="text-[9px] font-mono uppercase tracking-widest text-amber-200 font-bold">RESTRICTED SPACE</span>
                  <h3 className="text-lg font-serif font-black text-white mt-1 uppercase">Admin Authority Gateway</h3>
                  <p className="text-xs text-slate-200 mt-1.5 leading-relaxed font-serif italic">
                    Verify secure coordinates to unlock student rosters, enter academic GPA scores, and publish official announcements.
                  </p>
                </div>

                <div className="p-6 md:p-8">
                  {authError && (
                    <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded text-red-800 text-xs font-mono flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{authError}</span>
                    </div>
                  )}

                  {authSuccess && (
                    <div className="mb-4 p-3 bg-emerald-50 border-l-4 border-emerald-500 rounded text-emerald-800 text-xs font-mono flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span>{authSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleAdminLogin} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1 font-bold">Authority Email Credentials</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <input
                          type="email"
                          required
                          value={adminEmailInput}
                          onChange={(e) => setAdminEmailInput(e.target.value)}
                          placeholder="aki.sokpah.link@gmail.com"
                          className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-850 placeholder-slate-400 focus:outline-none focus:border-red-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1 font-bold">Secure Administrative Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <input
                          type="password"
                          required
                          value={adminPasswordInput}
                          onChange={(e) => setAdminPasswordInput(e.target.value)}
                          placeholder="••••••••"
                          className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-850 focus:outline-none focus:border-red-500"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-red-700 hover:bg-red-850 text-white font-mono font-bold text-xs uppercase py-3 rounded-lg transition shadow-md cursor-pointer flex items-center justify-center gap-1.5 border border-red-800"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Unlock System Board</span>
                    </button>
                    
                    <div className="p-4 bg-slate-50 border border-gray-205 rounded-xl text-[10px] text-slate-500 font-mono leading-relaxed mt-4">
                      <span className="font-bold text-red-600 block mb-1">DEFAULT SYSTEM CONFIG:</span>
                      Admin login is authorized for <span className="font-bold">aki.sokpah.link@gmail.com</span> with default credentials password provided by school directors.
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4.5: LOSN ONLINE ACADEMY & DEGREE LEVEL CONVERTER */}
        {activeTab === 'academy' && (
          <div className="space-y-8 animate-fade-in font-sans pb-16">
            
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-[#0e1d35] rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <GraduationCap className="w-48 h-48 text-white" />
              </div>
              <div className="relative z-10 max-w-3xl">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30">
                  ⚡ INTEGRATED MOE & INTERNATIONAL STANDARDS
                </span>
                <h2 className="text-3xl font-serif font-black tracking-tight text-white mt-3 uppercase">
                  LOSN AI Curriculum Academy
                </h2>
                <p className="text-slate-300 text-xs md:text-sm mt-2 leading-relaxed">
                  Welcome to the virtual gates of {SCHOOL_NAME}. Here, our advanced Artificial Intelligence engine acts as certified virtual teachers, instant curriculum publishers, and examiners aligned directly with West African and international academic standards.
                </p>
              </div>
            </div>

            {/* TRACK PROGRESS OR ENROLLMENT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Panel: Enrolled Program Progress Monitor */}
              <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-150 p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-sm font-mono font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-gray-100">
                    <GraduationCap className="w-4 h-4 text-emerald-500" />
                    My Degree Program
                  </h3>
                  
                  {!enrolledTrack ? (
                    <div className="pt-4 space-y-4">
                      <p className="text-xs text-slate-500 leading-relaxed">
                        You are currently auditing individual courses. Select a verified academic track below to enroll, begin graduating credit checks, and track certificate achievements:
                      </p>
                      <div className="space-y-2">
                        {[
                          "High School Diploma Track (Mined & WAEC)",
                          "Associate Degree in Software Engineering",
                          "Bachelor of Science in Information Technology & AI",
                          "Bachelor of Arts in Business Administration"
                        ].map((track) => (
                          <button
                            key={track}
                            onClick={() => handleEnrollTrack(track)}
                            className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/20 text-xs font-mono font-bold transition flex items-center justify-between group"
                          >
                            <span>{track}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-4 space-y-4">
                      <div className="p-4 bg-gradient-to-br from-indigo-50/60 to-blue-50/60 border border-indigo-100 rounded-xl relative group">
                        <span className="text-[9px] font-mono text-indigo-600 font-bold uppercase tracking-wider block mb-1">REGISTERED TRACK:</span>
                        <span className="text-xs font-bold text-slate-900 block leading-tight">{enrolledTrack}</span>
                        <button 
                          onClick={handleAbandonTrack}
                          className="mt-3 text-[10px] text-red-500 font-mono hover:underline font-bold"
                        >
                          Change Registered Track
                        </button>
                      </div>

                      <div className="space-y-3">
                        <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block tracking-wider">
                          PROGRAM MILESTONES:
                        </span>
                        
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-600">Certified Modules Passed</span>
                            <span className="font-bold text-slate-900">
                              {claimedCertificatesList.length} Completed
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 transition-all duration-500" 
                              style={{ width: `${Math.min(100, claimedCertificatesList.length * 25)}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <div className="p-2.5 bg-slate-50 border border-gray-150 rounded-lg text-center">
                            <span className="text-[9px] font-mono text-slate-400 font-bold block uppercase">CURRENT LEVEL</span>
                            <span className="text-sm font-mono font-black text-slate-800">
                              {claimedCertificatesList.length >= 4 ? 'Distinguished Graduate' : claimedCertificatesList.length >= 2 ? 'Senior Status' : 'Freshman'}
                            </span>
                          </div>
                          <div className="p-2.5 bg-slate-50 border border-gray-150 rounded-lg text-center">
                            <span className="text-[9px] font-mono text-slate-400 font-bold block uppercase">ESTIMATED GPA</span>
                            <span className="text-sm font-mono font-black text-slate-800">
                              {claimedCertificatesList.length > 0 ? '3.85 / 4.0' : '4.0 N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Teacher Room: Generate custom course lesson */}
                <div className="pt-4 border-t border-gray-100 space-y-4">
                  <div className="p-4 bg-gradient-to-br from-indigo-950 to-slate-900 text-white rounded-xl space-y-3 border border-indigo-900/60 shadow-md">
                    <span className="text-[10px] font-mono font-bold uppercase text-indigo-400 tracking-wider block">
                      🤖 AI TEACHERS STATION
                    </span>
                    <h4 className="text-xs font-bold leading-normal text-slate-100">
                      Instantly formulate and post a high-fidelity curriculum lesson of any level on demand!
                    </h4>
                    
                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="text-[10px] font-mono text-indigo-300 font-black block uppercase mb-1">Target Class Level:</label>
                        <select
                          value={genLevel}
                          onChange={(e) => setGenLevel(e.target.value)}
                          className="w-full bg-slate-800 border border-indigo-800/80 rounded-lg p-2 font-mono font-bold text-white text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                        >
                          <option value="Grade 1">Grade 1</option>
                          <option value="Grade 5">Grade 5</option>
                          <option value="Grade 9">Grade 9</option>
                          <option value="Grade 10">Grade 10</option>
                          <option value="Grade 11">Grade 11</option>
                          <option value="Grade 12">Grade 12</option>
                          <option value="Degree Program">Undergrad Degree Level</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-indigo-300 font-black block uppercase mb-1">Course / Subject Matter:</label>
                        <select
                          value={genSubject}
                          onChange={(e) => setGenSubject(e.target.value)}
                          className="w-full bg-slate-800 border border-indigo-800/80 rounded-lg p-2 font-mono font-bold text-white text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                        >
                          <option value="Mathematics">Mathematics</option>
                          <option value="Computer Science & AI">Computer Science & AI</option>
                          <option value="Physics">Physics</option>
                          <option value="English Language">English Language</option>
                          <option value="Chemistry">Chemistry</option>
                          <option value="Biology">Biology</option>
                          <option value="Economics">Economics</option>
                          <option value="History">History</option>
                        </select>
                      </div>

                      <button
                        onClick={handleGenerateAiLessonOnDemand}
                        disabled={isGeneratingLesson}
                        className={`w-full mt-2 font-mono font-bold py-2.5 rounded-lg text-xs uppercase cursor-pointer text-white shadow transition text-center flex justify-center items-center gap-1.5 ${
                          isGeneratingLesson ? 'bg-indigo-800 cursor-not-allowed opacity-80' : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:opacity-90'
                        }`}
                      >
                        {isGeneratingLesson ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                            <span>AI TEACHER IS COMPILING LAWS...</span>
                          </>
                        ) : (
                          <span>⚡ Post AI Lesson On Demand</span>
                        )}
                      </button>
                    </div>

                    {genError && (
                      <p className="text-[10px] font-mono text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20 mt-2">
                        {genError}
                      </p>
                    )}

                    {genSuccess && (
                      <p className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 mt-2">
                        {genSuccess}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Panel: Main Course Exploration Suite */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Lesson Explorer View */}
                {!selectedLesson ? (
                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-sm">
                      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between pb-4 border-b border-gray-100">
                        <div>
                          <h3 className="text-md font-serif font-black text-slate-900 uppercase">Available Academy Courses</h3>
                          <p className="text-xs text-slate-500">Read modules, complete examinations, and checkout verified degree transcripts.</p>
                        </div>
                        
                        {/* Filters */}
                        <div className="flex flex-wrap gap-2">
                          <div>
                            <select
                              value={selectedGradeFilter}
                              onChange={(e) => setSelectedGradeFilter(e.target.value)}
                              className="bg-slate-50 hover:bg-slate-100 border border-gray-200 rounded-lg p-1.5 text-[11px] font-mono font-bold outline-none cursor-pointer"
                            >
                              <option value="All">All Levels</option>
                              <option value="Grade 1">Grade 1</option>
                              <option value="Grade 5">Grade 5</option>
                              <option value="Grade 9">Grade 9</option>
                              <option value="Grade 10">Grade 10</option>
                              <option value="Grade 11">Grade 11</option>
                              <option value="Grade 12">Grade 12</option>
                              <option value="Degree Program">Degree Level</option>
                            </select>
                          </div>
                          <div>
                            <select
                              value={selectedSubjectFilter}
                              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                              className="bg-slate-50 hover:bg-slate-100 border border-gray-200 rounded-lg p-1.5 text-[11px] font-mono font-bold outline-none cursor-pointer"
                            >
                              <option value="All">All Subjects</option>
                              <option value="Mathematics">Mathematics</option>
                              <option value="Computer Science & AI">Computer Science & AI</option>
                              <option value="Physics">Physics</option>
                              <option value="English Language">English Language</option>
                              <option value="History">History</option>
                              <option value="Chemistry">Chemistry</option>
                              <option value="Biology">Biology</option>
                              <option value="Economics">Economics</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Course listing layout */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
                        {academyLessons
                          .filter((less) => selectedGradeFilter === 'All' || less.level === selectedGradeFilter)
                          .filter((less) => selectedSubjectFilter === 'All' || less.subject === selectedSubjectFilter)
                          .map((less) => {
                            const isPassed = claimedCertificatesList.includes(less.lessonId);
                            return (
                              <div 
                                key={less.lessonId || less.id}
                                className="group relative border border-gray-150 hover:border-indigo-400 bg-white hover:bg-indigo-50/5 p-4 rounded-xl transition-all shadow-sm flex flex-col justify-between"
                              >
                                {isPassed && (
                                  <span className="absolute top-2 right-2 text-[8px] font-mono font-black uppercase text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    ✓ CERTIFIED
                                  </span>
                                )}
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] font-mono font-bold text-[#005fb8] bg-blue-100/60 px-2 py-0.5 rounded">
                                      {less.subject}
                                    </span>
                                    <span className="text-[9px] font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                      {less.level}
                                    </span>
                                  </div>
                                  <h4 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-indigo-600 transition">
                                    {less.title}
                                  </h4>
                                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                                    {less.introduction}
                                  </p>
                                </div>

                                <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
                                  <span className="text-[9px] font-mono text-slate-400">
                                    Mines Compliant System
                                  </span>
                                  <button
                                    onClick={() => setSelectedLesson(less)}
                                    className="bg-slate-800 hover:bg-[#005fb8] text-white font-mono font-bold text-[10px] uppercase px-3 py-1.5 rounded-lg transition"
                                  >
                                    Study Lesson →
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                        {academyLessons.length === 0 && (
                          <div className="col-span-full p-8 text-center bg-slate-50 border border-dashed rounded-xl">
                            <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs font-mono text-slate-600">No lessons generated yet. Select choices on the AI side-panel to instruct your teacher!</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Detailed Lesson Desk View
                  <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden flex flex-col items-stretch">
                    
                    {/* Header bar and Close */}
                    <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
                          {selectedLesson.level} • {selectedLesson.subject}
                        </span>
                        <span className="text-xs font-bold text-slate-300 hidden md:inline">
                          Module Study Room
                        </span>
                      </div>
                      <button 
                        onClick={() => {
                          setSelectedLesson(null);
                          setShowQuiz(false);
                          setShowQuizResults(false);
                        }}
                        className="text-xs font-mono font-bold hover:text-red-400 bg-white/10 px-3 py-1 rounded-lg transition"
                      >
                        ← Exit Study Desk
                      </button>
                    </div>

                    {/* Lesson Core Text Sheet */}
                    <div id="print-sheet-segment" className="p-6 md:p-8 space-y-6">
                      
                      {!showQuiz ? (
                        <div className="space-y-6">
                          {/* Syllabus metadata */}
                          <div className="pb-4 border-b border-gray-100 space-y-2">
                            <span className="text-[9px] font-mono text-[#005fb8] uppercase font-bold block">
                              APPROVED STANDARD CURRICULUM SYLLABUS:
                            </span>
                            <h3 className="text-xl md:text-2xl font-serif font-black text-slate-900 leading-tight">
                              {selectedLesson.title}
                            </h3>
                            <p className="text-xs text-slate-500 font-mono italic flex items-center gap-1">
                              <span>Compliance Standard:</span>
                              <span className="text-indigo-600 font-bold">{selectedLesson.curriculumStandard}</span>
                            </p>
                          </div>

                          {/* Introduction paragraph */}
                          <div className="bg-slate-50/70 border border-gray-200 rounded-xl p-4 md:p-6 italic font-serif text-sm leading-relaxed text-slate-700">
                            "{selectedLesson.introduction}"
                          </div>

                          {/* Dynamic detailed lecture subsections */}
                          <div className="space-y-6 pt-2">
                            {(selectedLesson.sections || []).map((sec: any, idx: number) => (
                              <div key={idx} className="space-y-2 leading-relaxed">
                                <h4 className="text-md font-serif font-black text-slate-900">
                                  {sec.title}
                                </h4>
                                <p className="text-xs md:text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                                  {sec.content}
                                </p>
                              </div>
                            ))}
                          </div>

                          {/* Module closure Summary */}
                          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 md:p-6 mt-6 leading-relaxed">
                            <span className="text-[10px] font-mono font-bold text-emerald-600 block uppercase mb-1">MODULE SUMMARY MATRIX:</span>
                            <p className="text-xs font-mono text-slate-600 leading-relaxed">
                              {selectedLesson.summary}
                            </p>
                          </div>

                          {/* Take standard examination button */}
                          <div className="pt-6 border-t border-gray-150 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div>
                              <p className="text-xs text-slate-500">Upon complete comprehension, activate the board examination test-bank:</p>
                              <span className="text-[10px] font-mono font-bold text-indigo-650 font-black uppercase">
                                {"Requires >= 80% correct score to achieve completion credit"}
                              </span>
                            </div>
                            <button
                              onClick={startLessonQuiz}
                              className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-mono font-bold text-xs uppercase px-6 py-3 rounded-xl transition shadow cursor-pointer text-center"
                            >
                              🚀 INITIATE CERTIFIED EXAMINATION
                            </button>
                          </div>
                        </div>
                      ) : (
                        // QUIZ INTERACTIVE VIEW MODE
                        <div className="space-y-6">
                          
                          {!showQuizResults ? (
                            <div className="space-y-6">
                              <div className="pb-4 border-b border-gray-100 flex justify-between items-center">
                                <div>
                                  <span className="text-[9px] font-mono text-indigo-600 uppercase font-bold block">ACTIVE EXAMINATION CODES:</span>
                                  <h4 className="text-md font-serif font-black text-slate-900">
                                    Test Bank: {selectedLesson.title}
                                  </h4>
                                </div>
                                <span className="text-xs font-mono font-bold text-slate-500">
                                  Question {activeQuizIndex + 1} of {selectedLesson.quiz.length}
                                </span>
                              </div>

                              {/* Question display */}
                              <div className="p-4 bg-slate-50 border rounded-xl leading-relaxed">
                                <span className="text-[10px] font-mono font-black text-slate-400 block mb-1">QUESTION STATEMENT:</span>
                                <p className="text-sm font-bold text-slate-900 leading-relaxed">
                                  {selectedLesson.quiz[activeQuizIndex].questionText}
                                </p>
                              </div>

                              {/* Multiple Choice Options selection */}
                              <div className="grid grid-cols-1 gap-3">
                                {selectedLesson.quiz[activeQuizIndex].options.map((opt: string, oIdx: number) => {
                                  const isSelected = selectedAnswers[activeQuizIndex] === oIdx;
                                  return (
                                    <button
                                      key={oIdx}
                                      onClick={() => handleAnswerSelect(activeQuizIndex, oIdx)}
                                      className={`text-left p-3.5 rounded-xl border-2 text-xs font-mono font-bold transition-all flex items-center gap-3 ${
                                        isSelected 
                                          ? 'border-indigo-600 bg-indigo-50/30 text-indigo-900 shadow-sm' 
                                          : 'border-gray-200 bg-white hover:border-gray-300 text-slate-700'
                                      }`}
                                    >
                                      <span className={`w-5 h-5 rounded-full flex items-center justify-center border font-mono font-bold ${
                                        isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 bg-slate-50'
                                      }`}>
                                        {String.fromCharCode(65 + oIdx)}
                                      </span>
                                      <span>{opt}</span>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Bottom Navigation on Quiz */}
                              <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                                <button
                                  disabled={activeQuizIndex === 0}
                                  onClick={() => setActiveQuizIndex(p => p - 1)}
                                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg text-xs font-mono font-bold transition"
                                >
                                  ← Back Option
                                </button>
                                
                                {activeQuizIndex < selectedLesson.quiz.length - 1 ? (
                                  <button
                                    onClick={() => setActiveQuizIndex(p => p + 1)}
                                    className="px-4 py-2 bg-[#0d1f3d] hover:opacity-90 rounded-lg text-xs font-mono font-bold text-white transition"
                                  >
                                    Next Question →
                                  </button>
                                ) : (
                                  <button
                                    onClick={handleQuizSubmit}
                                    disabled={Object.keys(selectedAnswers).length < selectedLesson.quiz.length}
                                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-xs font-mono font-bold uppercase text-white rounded-lg transition"
                                  >
                                    ✓ SUBMIT EXAM ANSWERS
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            // EXAM RESULT WRAPPER DISPLAY & CERTIFICATE
                            <div className="space-y-6">
                              
                              <div className="text-center max-w-xl mx-auto space-y-3 p-4">
                                <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
                                  quizPassed ? 'bg-emerald-100 text-emerald-600 animate-bounce' : 'bg-red-100 text-red-600'
                                }`}>
                                  <GraduationCap className="w-8 h-8" />
                                </div>
                                
                                <h3 className="text-lg font-serif font-black uppercase tracking-tight">
                                  {quizPassed ? 'CONGRATULATIONS! COURSE MASTERED' : 'EXAMINATION NOT YET PASSED'}
                                </h3>
                                
                                <p className="text-xs text-slate-500 font-mono">
                                  Subject Code: {selectedLesson.subject} | Grade Score: <span className="font-bold text-slate-800">{quizScorePercent}%</span> {"(Required: >= 80% to pass)"}
                                </p>
                              </div>

                              {quizPassed ? (
                                <div className="space-y-6">
                                  
                                  {/* Certified completion claim state */}
                                  {!certificateClaimed ? (
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 text-center space-y-3">
                                      <h4 className="text-sm font-bold text-indigo-950">
                                        Your academic achievement is verified by {SCHOOL_NAME}.
                                      </h4>
                                      <p className="text-xs text-slate-650 max-w-md mx-auto">
                                        Click the signature key button below to generate your official course completion certificate bearing Aki Sokpah's handwritten signature <span className="font-bold italic">sokpahakin</span>.
                                      </p>
                                      <button
                                        onClick={handleClaimCertificate}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-mono font-bold text-xs uppercase px-6 py-3 rounded-lg shadow transition cursor-pointer"
                                      >
                                        🎓 Generate My Certified Certificate
                                      </button>
                                    </div>
                                  ) : (
                                    // GORGEOUS PRINTABLE PHYSICAL CERTIFICATE (STRICT SOKPAHAKIN REQUIREMENT)
                                    <div className="space-y-6">
                                      
                                      {/* Certificate sheet to print */}
                                      <div 
                                        id="printable-academic-certificate" 
                                        className="bg-[#faf7f0] border-8 border-amber-800 p-8 rounded-2xl relative shadow-xl text-center space-y-6 max-w-2xl mx-auto border-double text-slate-950"
                                      >
                                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                          <GraduationCap className="w-48 h-48 text-amber-900" />
                                        </div>
                                        
                                        <div className="space-y-1">
                                          <span className="text-[10px] font-mono tracking-widest text-[#005fb8] font-bold block">
                                            LR. ONLINE SCHOOL SYSTEM (LOSN)
                                          </span>
                                          <p className="text-[9px] font-mono text-amber-800 font-bold uppercase tracking-widest">
                                            OFFICIAL CERTIFICATE OF COURSE MASTERMENT
                                          </p>
                                        </div>

                                        <div className="py-2">
                                          <p className="text-xs font-serif italic text-slate-600">This certifies that through rigorous online curriculum examination,</p>
                                          <h2 className="text-xl font-serif font-black text-amber-950 mt-1 uppercase underline decoration-amber-900">
                                            {studentUser ? studentUser.fullName : 'Distinguished Academy Auditor'}
                                          </h2>
                                          <p className="text-xs font-serif italic text-slate-600 mt-1">has comprehensively mastered all syllabus instruction for</p>
                                          
                                          <h3 className="text-md font-serif font-black text-slate-900 uppercase mt-1">
                                            {selectedLesson.title}
                                          </h3>
                                          <p className="text-[10px] font-mono text-[#005fb8] font-bold">
                                            ({selectedLesson.level} • {selectedLesson.subject})
                                          </p>
                                        </div>

                                        <p className="text-[10px] text-slate-500 max-w-md mx-auto leading-relaxed italic">
                                          "Granted compliance under Liberian Ministry of Education national guidelines and international STEM frameworks with full credit weights recorded."
                                        </p>

                                        {/* Physical Signature Section */}
                                        <div className="pt-6 border-t border-gray-150 flex justify-between items-end gap-x-12 px-6">
                                          <div className="text-left">
                                            <span className="text-[9px] font-mono text-slate-400 block pb-0.5">DATE OF TRIAL:</span>
                                            <span className="text-xs font-mono font-bold block text-slate-800">
                                              {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                            </span>
                                            <span className="text-[8px] font-mono text-slate-400 block border-t border-gray-200 mt-1">Verified Registry ID</span>
                                          </div>

                                          {/* Verified signature logo - sokpahakin cursive signature */}
                                          <div className="text-right flex flex-col items-center">
                                            <span className="text-[9px] font-mono text-[#005fb8] font-bold tracking-widest uppercase block mb-1">APPROVED SIGN-OFF:</span>
                                            <span className="font-serif italic text-base font-black tracking-widest text-[#005fb8] select-none block bg-blue-50/50 rounded p-1 px-3 border border-blue-500/10">
                                              sokpahakin
                                            </span>
                                            <span className="text-[8px] font-mono font-bold text-slate-800 block border-t border-gray-200 mt-1 pt-0.5">
                                              Aki Sokpah, Executive Academic Chair
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Trigger printing action */}
                                      <div className="flex justify-center pt-2">
                                        <button
                                          onClick={() => {
                                            // Open specific print canvas layout
                                            window.print();
                                          }}
                                          className="bg-[#0d1f3d] hover:bg-slate-800 text-white font-mono font-bold text-xs uppercase px-6 py-2.5 rounded-lg flex items-center gap-2 shadow transition cursor-pointer"
                                        >
                                          <Printer className="w-4 h-4 text-emerald-400" />
                                          <span>Print Verified Certificate</span>
                                        </button>
                                      </div>

                                    </div>
                                  )}

                                </div>
                              ) : (
                                <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-center space-y-3">
                                  <h4 className="text-sm font-bold text-red-950">Need some additional review?</h4>
                                  <p className="text-xs text-red-700 max-w-sm mx-auto">
                                    Our school system encourages diligence. Head back to the study desk, reread the formulas, and try again!
                                  </p>
                                  <button
                                    onClick={() => {
                                      setShowQuiz(false);
                                      setShowQuizResults(false);
                                    }}
                                    className="bg-slate-800 hover:bg-slate-900 text-white font-mono font-bold text-[10px] uppercase px-4 py-2 rounded-lg transition"
                                  >
                                    Reread Lecture Notes
                                  </button>
                                </div>
                              )}

                            </div>
                          )}

                        </div>
                      )}

                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        )}

        {/* TAB 5: CONTACT SCHOOL OR FB LINK FEED */}
        {activeTab === 'contact' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch animate-fade-in font-sans pb-16">
            
            {/* Contact Coordinates */}
            <div className="md:col-span-5 bg-white rounded-2xl border border-gray-150 p-6 md:p-8 shadow-sm flex flex-col justify-between space-y-6">
              <div>
                <h3 className="text-xl font-serif font-black text-[#0d1f3d] mb-4 uppercase">Direct Campus Coordinates</h3>
                <p className="text-slate-550 text-xs leading-relaxed mb-6">
                  Get in contact with {SCHOOL_NAME} admissions registry for fee schedules, class curricula, transcript approvals, or regional WAEC exams.
                </p>

                <div className="space-y-4">
                  <div className="flex items-start gap-3 text-xs">
                    <MapPin className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900 block font-mono">CAMPUS ADDRESS:</span>
                      <span className="text-slate-600">{SCHOOL_LOCATION}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 text-xs">
                    <Mail className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900 block font-mono">EMAIL DISPATCH:</span>
                      <a href={`mailto:${SCHOOL_EMAIL}`} className="text-blue-650 hover:underline">{SCHOOL_EMAIL}</a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 text-xs">
                    <Phone className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900 block font-mono">TELEPHONE INQUIRIES:</span>
                      <a href={`tel:${SCHOOL_PHONE}`} className="text-blue-650 hover:underline">{SCHOOL_PHONE}</a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Channels buttons */}
              <div className="pt-6 border-t border-gray-150 space-y-3">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-bold">School platform Channels</span>
                <div className="flex gap-3">
                  <a 
                    href={SCHOOL_FACEBOOK}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-650 border border-blue-200 py-3 rounded-xl font-mono text-xs font-bold uppercase transition flex items-center justify-center gap-2"
                  >
                    <Facebook className="w-4 h-4 fill-current text-blue-600" />
                    <span>Facebook Profile</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Inspiring School introduction story */}
            <div className="md:col-span-7 bg-[#0d1f3d] text-white rounded-2xl p-6 md:p-8 shadow-sm flex flex-col justify-between">
              <div>
                <GraduationCap className="w-12 h-12 text-amber-400 mb-4" />
                <h3 className="text-lg font-serif font-bold text-amber-400 mb-3 uppercase">Academic Excellence Mission Statement</h3>
                <p className="text-slate-300 text-xs leading-relaxed mb-4">
                  {SCHOOL_NAME} has stood as a beacon of scholastic transformation, molding Liberia’s future builders with unmatched academic rigor and moral discipline. We believe that learning is an inspired ongoing journey.
                </p>
                <p className="text-slate-300 text-xs leading-relaxed mb-4">
                  Our fully digitalized portal system serves as a progressive step towards ensuring academic transcripts transparency, faster grade deliveries, parent synchronization, and instant portal access from any Android or iOS device wrapper.
                </p>
              </div>

              <div className="p-4 bg-slate-900/60 rounded-xl border border-white/10 mt-6 md:mt-0 font-serif text-[11px] leading-relaxed text-amber-400/90 italic">
                "Welcome again to {SCHOOL_NAME} — A School of your choice that is transforming and building up the lives of our future generations."
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
