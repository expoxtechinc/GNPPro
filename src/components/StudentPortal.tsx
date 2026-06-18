import React, { useState, useEffect } from 'react';
import { 
  collection, query, where, onSnapshot, doc, addDoc, updateDoc, getDocs, setDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, Course, Lesson, Enrollment, PaymentRecord, AcademicDocument, UniversityNotification } from '../types';
import { 
  BookOpen, CreditCard, Award, FileText, CheckCircle, Clock, ShieldAlert, 
  DollarSign, Send, Users, Compass, Bell, ArrowRight, Share2, Printer, 
  ExternalLink, LogIn, ChevronRight, Activity, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StudentPortalProps {
  userProfile: UserProfile;
}

export default function StudentPortal({ userProfile }: StudentPortalProps) {
  const [activeTab, setActiveTab] = useState<'courses' | 'billing' | 'graduation'>('courses');
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [gradPapers, setGradPapers] = useState<AcademicDocument[]>([]);
  const [notifications, setNotifications] = useState<UniversityNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Fee payment states
  const [paymentAmount, setPaymentAmount] = useState('1200');
  const [paymentPurpose, setPaymentPurpose] = useState<'tuition' | 'admission' | 'graduation_fee'>('tuition');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState(userProfile.fullName);
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [payGatewayActive, setPayGatewayActive] = useState(false);
  const [payProcessing, setPayProcessing] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);

  // Email notifications log simulator
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);

  useEffect(() => {
    // 1. Fetch Students Enrollments
    const qEnroll = query(collection(db, 'enrollments'), where('studentId', '==', userProfile.uid));
    const unsubEnroll = onSnapshot(qEnroll, (snap) => {
      const list: Enrollment[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Enrollment));
      setEnrollments(list);
    }, (err) => console.error("Enrollment read failure: ", err));

    // 2. Fetch All Available Courses and Lessons
    const unsubCourses = onSnapshot(collection(db, 'courses'), (snap) => {
      const list: Course[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Course));
      setAllCourses(list);
    });

    // 3. Fetch Student Payments
    const qPay = query(collection(db, 'payments'), where('studentId', '==', userProfile.uid));
    const unsubPay = onSnapshot(qPay, (snap) => {
      const list: PaymentRecord[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as PaymentRecord));
      setPayments(list);
    });

    // 4. Fetch Issued Graduation Papers
    const qDocs = query(collection(db, 'academic_documents'), where('studentId', '==', userProfile.uid));
    const unsubDocs = onSnapshot(qDocs, (snap) => {
      const list: AcademicDocument[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as AcademicDocument));
      setGradPapers(list);
    });

    // 5. Fetch Automated Logs / Alerts (Assignments and Exam Schedules)
    const qNotif = query(collection(db, 'notifications'), where('recipientId', 'in', ['all', userProfile.uid]));
    const unsubNotif = onSnapshot(qNotif, (snap) => {
      const list: UniversityNotification[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as UniversityNotification));
      // sort by date limit
      list.sort((a, b) => new Date(b.dateSent).getTime() - new Date(a.dateSent).getTime());
      setNotifications(list);
      setLoading(false);
    });

    return () => {
      unsubEnroll();
      unsubCourses();
      unsubPay();
      unsubDocs();
      unsubNotif();
    };
  }, [userProfile.uid]);

  // Fetch Lessons from enrolled courses subcollections
  useEffect(() => {
    if (enrollments.length === 0) return;
    const loadEnrolledLessons = async () => {
      const list: Lesson[] = [];
      for (const enr of enrollments) {
        try {
          const lSnap = await getDocs(collection(db, `courses/${enr.courseId}/lessons`));
          lSnap.forEach(ldoc => {
            list.push({ id: ldoc.id, ...ldoc.data() } as Lesson);
          });
        } catch (e) {
          console.warn("Failed retrieving lessons for: ", enr.courseCode);
        }
      }
      setLessons(list);
    };
    void loadEnrolledLessons();
  }, [enrollments]);

  // Handle tuition fee simulation payment
  const handleTuitionPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !cardExpiry || !cardCvv || !paymentAmount) return;

    setPayProcessing(true);
    
    // Simulate gateway handshakes
    setTimeout(async () => {
      try {
        const transId = 'TXN-' + Math.floor(10000000 + Math.random() * 90000000);
        await addDoc(collection(db, 'payments'), {
          studentId: userProfile.uid,
          studentName: userProfile.fullName,
          amount: parseFloat(paymentAmount),
          purpose: paymentPurpose,
          transactionId: transId,
          status: 'success',
          paymentMethod: 'Credit/Debit Card',
          cardBrand: cardNumber.startsWith('4') ? 'Visa' : 'Mastercard',
          datePaid: new Date().toISOString()
        });

        // Push systemic receipt notification (automated alerting)
        await addDoc(collection(db, 'notifications'), {
          recipientId: userProfile.uid,
          title: 'Invoice Payment Completed',
          content: `Your payment of $${paymentAmount} for ${paymentPurpose.replace('_', ' ')} was verified successfully. Txn Ref ID: ${transId}.`,
          type: 'payment',
          isRead: false,
          dateSent: new Date().toISOString()
        });

        setPayProcessing(false);
        setPaySuccess(true);
        setTimeout(() => {
          setPaySuccess(false);
          setPayGatewayActive(false);
        }, 2200);

      } catch (err) {
        console.error("Failed storing payment invoice: ", err);
        setPayProcessing(false);
      }
    }, 1800);
  };

  // Helper calculation of cumulative CGPA
  const calculateCGPA = () => {
    const scoredCourses = enrollments.filter(e => e.gradeNumeric !== undefined && e.status === 'completed');
    if (scoredCourses.length === 0) return '0.00';
    let sum = 0;
    scoredCourses.forEach(e => {
      const g = e.gradeNumeric || 0;
      if (g >= 90) sum += 4.0;
      else if (g >= 80) sum += 3.0;
      else if (g >= 70) sum += 2.0;
      else if (g >= 60) sum += 1.0;
      else sum += 0.0;
    });
    return (sum / scoredCourses.length).toFixed(2);
  };

  const tuitionPaidSum = payments.filter(p => p.status === 'success' && p.purpose === 'tuition').reduce((sum, current) => sum + current.amount, 0);
  const tuitionBalance = Math.max(0, 4800 - tuitionPaidSum); // Base tuition rate is $4,800/yr

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans pb-12">
      
      {/* Dynamic Student Overview Banner Card */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-indigo-950 text-white rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
          <BookOpen className="w-64 h-64 -mr-16 -mt-16" />
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="bg-blue-550/35 border border-blue-450/40 text-blue-200 text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg">
                Remote Learner
              </span>
              <span className="text-[10px] text-indigo-200 uppercase font-mono font-bold tracking-widest">
                Matric: {userProfile.matricNo || 'AIOU-PENDING'}
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight">{userProfile.fullName}</h2>
            <p className="text-xs text-indigo-100 font-medium">{userProfile.degreeProgram}</p>
            <p className="text-[11px] text-indigo-200/80 font-semibold">College of {userProfile.department}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 px-4 flex items-center gap-4 border border-white/10 self-start md:self-auto shrink-0 shadow-sm">
            <div className="text-center">
              <span className="block text-[9px] font-mono text-indigo-200 uppercase font-bold tracking-wider">AIOU GPA</span>
              <span className="text-xl font-bold tracking-tight text-white">{calculateCGPA()}</span>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="text-center">
              <span className="block text-[9px] font-mono text-indigo-200 uppercase font-bold tracking-wider">Credits Enrolled</span>
              <span className="text-xl font-bold tracking-tight text-white">
                {enrollments.reduce((sum, enr) => {
                  const course = allCourses.find(c => c.id === enr.courseId);
                  return sum + (course ? course.credits : 3);
                }, 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Quick automated alert indicator */}
        <div className="mt-5 border-t border-white/10 pt-3 flex items-center justify-between text-xs">
          <button 
            onClick={() => setShowNotificationCenter(!showNotificationCenter)}
            className="flex items-center gap-1.5 text-blue-200 hover:text-white transition focus:outline-none text-[11px] font-bold"
          >
            <Bell className="w-4 h-4 text-blue-300" />
            <span>Alerts & Assignment Reminders ({notifications.length})</span>
          </button>
          <span className="text-[10px] text-indigo-200 font-bold font-mono">
            Admission: {userProfile.admissionYear || 'Spring 2026'}
          </span>
        </div>
      </div>

      {/* Automated Email Notifications & Due Date Panel Drawer */}
      <AnimatePresence>
        {showNotificationCenter && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-neutral-80 border border-neutral-200 rounded-2xl overflow-hidden p-4 space-y-3"
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-510 flex items-center gap-1">
                <Bell className="w-3.5 h-3.5 text-blue-800" />
                Automated System & Email Notifications (Deadlines / Schedule)
              </span>
              <button 
                onClick={() => setShowNotificationCenter(false)}
                className="text-xs font-bold text-neutral-500 hover:text-neutral-700"
              >
                Close
              </button>
            </div>
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <p className="text-[11px] text-neutral-400 italic text-center py-4">No active notifications logged yet.</p>
              ) : (
                notifications.map(notif => (
                  <div 
                    key={notif.id} 
                    className={`p-3 rounded-xl border text-[11px] leading-relaxed flex items-start gap-2.5 transition ${
                      notif.type === 'exam' 
                        ? 'bg-red-50/55 border-red-100 text-red-950' 
                        : notif.type === 'assignment' 
                        ? 'bg-amber-50/55 border-amber-100 text-amber-950' 
                        : 'bg-white border-neutral-150 text-neutral-800'
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {notif.type === 'exam' ? '🔴' : notif.type === 'assignment' ? '🟡' : '🔵'}
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex justify-between items-center gap-4">
                        <span className="font-bold">{notif.title}</span>
                        <span className="text-[9px] font-mono text-neutral-400">
                          {new Date(notif.dateSent).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-700">{notif.content}</p>
                      {notif.deadlineDate && (
                        <div className="text-[9px] font-mono uppercase font-black text-red-700 flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3 text-red-500" />
                          <span>Deadline Schedule: {new Date(notif.deadlineDate).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screen Interface Navigation Tabs */}
      <div className="flex border-b border-neutral-200 gap-1.5 shrink-0 overflow-x-auto">
        <button
          onClick={() => setActiveTab('courses')}
          className={`pb-3 px-4.5 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'courses' 
              ? 'border-blue-900 text-blue-900 font-extrabold' 
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Curriculum & Grades</span>
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`pb-3 px-4.5 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'billing' 
              ? 'border-blue-900 text-blue-900 font-extrabold' 
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Tuition & Payment Gateway</span>
        </button>
        <button
          onClick={() => setActiveTab('graduation')}
          className={`pb-3 px-4.5 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'graduation' 
              ? 'border-blue-900 text-blue-900 font-extrabold' 
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Graduation Vault</span>
          {gradPapers.length > 0 && (
            <span className="bg-amber-500 text-white rounded-full text-[9px] px-1.5 py-0.2 shrink-0">{gradPapers.length}</span>
          )}
        </button>
      </div>

      {/* Main Tab Panels */}
      <AnimatePresence mode="wait">
        {activeTab === 'courses' && (
          <motion.div 
            key="courses-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Grade cards grid */}
            <div>
              <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest mb-3.5">Enrolled Course Grades</h3>
              {enrollments.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 border text-center space-y-2">
                  <BookOpen className="w-8 h-8 text-neutral-300 mx-auto" />
                  <p className="text-xs font-bold text-neutral-700">No active classes yet.</p>
                  <p className="text-[11px] text-neutral-500">Contact the academic administration panel to register you for semester lectures.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {enrollments.map(enr => (
                    <div key={enr.id} className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <span className="bg-neutral-100 text-neutral-800 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                          {enr.courseCode}
                        </span>
                        <h4 className="text-xs font-bold text-neutral-900 mt-1 leading-snug">{enr.courseTitle}</h4>
                        <div className="flex gap-2 text-[10px] text-neutral-500 font-medium">
                          <span>Semester: {enr.semester}</span>
                          <span>•</span>
                          <span className="capitalize">{enr.status}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {enr.gradeNumeric !== undefined ? (
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold font-mono text-neutral-400 text-[10px]">Grade Issued:</span>
                            <div className="text-lg font-black tracking-tight text-blue-900 bg-blue-50/50 px-2.5 py-1 rounded-xl border border-blue-100 text-center">
                              {enr.gradeNumeric}% ({enr.gradeLetter})
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-100 uppercase">
                            Progressing
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Syllabus Lectures Section */}
            <div>
              <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest mb-3.5">Campus Lectures & Assignments</h3>
              {lessons.length === 0 ? (
                <p className="text-[11px] text-neutral-400 italic bg-white p-5 rounded-2xl text-center border">
                  Your instructors haven't posted any lessons or study curriculum yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {lessons.map(les => (
                    <div key={les.id} className="bg-white border border-neutral-200 rounded-2xl p-4 hover:border-neutral-300 transition shadow-xs space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="text-[9px] font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-lg mr-2 uppercase">
                            {les.courseCode}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-bold font-mono">
                            Posted: {new Date(les.datePosted).toLocaleDateString()}
                          </span>
                          <h4 className="text-xs font-black text-neutral-900 mt-1.5 leading-tight">{les.title}</h4>
                        </div>
                      </div>

                      <p className="text-[11px] text-neutral-700 whitespace-pre-line leading-relaxed border-l-2 border-neutral-100 pl-3.5">
                        {les.content}
                      </p>

                      {les.videoUrl && (
                        <div className="bg-blue-50/30 rounded-xl p-2 px-3 text-[10px] flex items-center justify-between text-blue-900 border border-blue-100/50">
                          <span className="font-semibold">Interactive lecture video link attached:</span>
                          <a 
                            href={les.videoUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-blue-900 text-white px-2.5 py-1 rounded font-bold hover:bg-blue-950 transition text-[9px] flex items-center gap-1"
                          >
                            <span>Join Stream</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      )}

                      {les.assignmentTitle && (
                        <div className="bg-amber-50/40 border border-amber-100 rounded-xl p-3 flex items-start gap-2 text-[10px]">
                          <span className="text-base mt-0.5">📝</span>
                          <div className="flex-1 space-y-0.5">
                            <p className="font-bold text-amber-950">Assignment: {les.assignmentTitle}</p>
                            {les.assignmentDeadline && (
                              <p className="text-[9px] font-mono text-red-700 font-bold uppercase">
                                Scheduled Due: {new Date(les.assignmentDeadline).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'billing' && (
          <motion.div 
            key="billing-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Balance Overview & Transactions card */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Financial Status */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="space-y-1">
                  <span className="text-[9px] font-mono uppercase font-bold text-neutral-400">Statement of Academic Account</span>
                  <h4 className="text-xl font-bold tracking-tight text-neutral-900">Total Semester Billing Rate</h4>
                  <p className="text-[11px] text-neutral-500">Regular tuition pricing is calculated annually at $4,800.00 USD.</p>
                </div>

                <div className="bg-neutral-50 rounded-xl p-3 px-4 shrink-0 text-center border border-neutral-150">
                  <span className="block text-[9px] font-mono uppercase tracking-widest text-neutral-550 font-bold">Unpaid Tuition Balance</span>
                  <span className="text-2xl font-black text-red-650 tracking-tight">${tuitionBalance.toFixed(2)} USD</span>
                </div>
              </div>

              {/* Payments History log */}
              <div>
                <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest mb-3.5">Fee Clearance Invoices ({payments.length})</h3>
                {payments.length === 0 ? (
                  <p className="text-[11px] text-neutral-400 italic bg-white p-5 rounded-2xl text-center border">
                    No payment history recorded under this account.
                  </p>
                ) : (
                  <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-xs divide-y divide-neutral-100">
                    {payments.map(pay => (
                      <div key={pay.id} className="p-3.5 text-[11px] flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="font-bold text-neutral-800 capitalize">{pay.purpose.replace('_', ' ')} Invoice cleared</p>
                          <div className="flex gap-2 text-[9px] text-neutral-400 font-mono">
                            <span>{pay.paymentMethod} • {pay.cardBrand}</span>
                            <span>|</span>
                            <span>Ref: {pay.transactionId}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="block font-bold text-neutral-905">${pay.amount.toFixed(2)}</span>
                          <span className="text-[9px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                            SUCCESS
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar visual payment form */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs h-fit space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-900" />
                <h4 className="text-xs font-black uppercase text-neutral-900">Make Secured Tuition Payment</h4>
              </div>

              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Clear library, graduation, or course fees instantly. Transactions process mock handshakes safely on our sandbox protocol.
              </p>

              <button
                type="button"
                onClick={() => {
                  setPayGatewayActive(true);
                  setPaySuccess(false);
                }}
                className="w-full bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition shadow-md cursor-pointer flex items-center justify-center gap-1"
              >
                <DollarSign className="w-4 h-4" />
                <span>Open Payment Gateway</span>
              </button>

              <AnimatePresence>
                {payGatewayActive && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="border-t border-neutral-100 pt-4 space-y-3"
                  >
                    <form onSubmit={handleTuitionPayment} className="space-y-3">
                      <div>
                        <label className="block text-[9px] font-mono font-bold text-neutral-505 uppercase mb-1">Invoice Purpose</label>
                        <select
                          value={paymentPurpose}
                          onChange={(e) => setPaymentPurpose(e.target.value as any)}
                          className="w-full bg-neutral-51 border border-neutral-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
                        >
                          <option value="tuition">Semester Tuition Fee / Academic Rate</option>
                          <option value="graduation_fee">Graduation Clearances / Caps & Papers</option>
                          <option value="admission">Admissions Processing Charge</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-mono font-bold text-neutral-505 uppercase mb-1">Amount to pay ($USD)</label>
                        <input
                          type="number"
                          required
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs font-bold text-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-mono font-bold text-neutral-505 uppercase mb-1">Card Number</label>
                        <input
                          type="text"
                          required
                          placeholder="4000 1234 5678 9010"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-mono font-bold text-neutral-505 uppercase mb-1">Expiration</label>
                          <input
                            type="text"
                            required
                            placeholder="MM/YY"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs text-center focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-mono font-bold text-neutral-505 uppercase mb-1">CVC Code</label>
                          <input
                            type="password"
                            required
                            placeholder="•••"
                            maxLength={3}
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs text-center focus:outline-none"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={payProcessing}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 text-white font-bold text-[10px] uppercase py-2.5 rounded-lg transition mt-2 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {payProcessing ? (
                          <span>Authorizing Sandbox Handshake...</span>
                        ) : paySuccess ? (
                          <span>Success! Payment Cleared ✔</span>
                        ) : (
                          <span>Submit Payment of ${paymentAmount}</span>
                        )}
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {activeTab === 'graduation' && (
          <motion.div 
            key="graduation-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs leading-relaxed text-amber-900 flex gap-2.5">
              <span className="text-xl shrink-0 mt-0.5">🏛</span>
              <div>
                <p className="font-bold text-amber-950">AIOU Graduation and Registry Clearance Requirements</p>
                <p className="text-amber-900 mt-1">
                  Once your core courses are scored, administrators will generate and issue your degree papers, academic transcripts, and official letters. Approved items can be immediately printed or saved below for academic verification purposes.
                </p>
              </div>
            </div>

            {gradPapers.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 border border-neutral-200 text-center space-y-2.5">
                <Award className="w-10 h-10 text-neutral-300 mx-auto" />
                <h4 className="text-xs font-bold text-neutral-700">Your Academic Graduation vault is currently empty.</h4>
                <p className="text-[11px] text-neutral-400 max-w-sm mx-auto">
                  If you have completed your degree path, contact the administrator block of <strong>Dr. Abraham S. Borbor (email: aboysokpah@gmail.com)</strong>. They can post lessons, fill your transcript, and generate legal graduation credentials.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {gradPapers.map(paper => (
                  <div key={paper.id} className="bg-white border-2 border-neutral-200 rounded-2xl p-5 md:p-6 shadow-sm space-y-6 relative overflow-hidden">
                    
                    {/* Backing seals for diplomas */}
                    {paper.type === 'diploma' && (
                      <div className="absolute right-4 bottom-4 w-28 h-28 border-8 border-yellow-500/10 rounded-full flex items-center justify-center pointer-events-none">
                        <Award className="w-12 h-12 text-yellow-500/10" />
                      </div>
                    )}

                    {/* Metadata summary */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-neutral-100 pb-4 gap-2">
                      <div>
                        <span className="bg-indigo-50 text-indigo-950 text-[9px] font-mono font-bold px-2.5 py-1 rounded-xl uppercase">
                          Official University {paper.type}
                        </span>
                        <h4 className="text-sm font-black text-neutral-900 mt-1.5">{paper.title}</h4>
                      </div>
                      <div className="text-right text-[10px] text-neutral-400 font-mono">
                        <p>Issued: {new Date(paper.issueDate).toLocaleDateString()}</p>
                        <p>Verification Code: VER-{paper.id.substring(0, 8).toUpperCase()}</p>
                      </div>
                    </div>

                    {/* Rich text / design mockup of credential papers */}
                    <div className="bg-neutral-50/50 border border-neutral-200/50 rounded-xl p-4 md:p-6 font-serif max-w-2xl mx-auto space-y-4">
                      
                      {paper.type === 'diploma' && (
                        <div className="text-center space-y-4 py-4">
                          <h2 className="text-blue-900 text-lg md:text-xl font-bold tracking-wide uppercase">Akin International Online University</h2>
                          <p className="text-neutral-510 font-bold italic text-xs">By virtue of the authority vested in the Faculty Senate and Board of Regents</p>
                          <p className="text-neutral-501 font-semibold text-[11px] uppercase tracking-wider">Hereby Confers On</p>
                          <h3 className="text-base md:text-lg font-black text-neutral-900 border-b border-neutral-205 py-1 w-fit mx-auto px-6">{paper.studentName}</h3>
                          <p className="text-neutral-500 text-[11px] leading-relaxed max-w-md mx-auto">
                            The academic degree program degree of <strong>{paper.degreeProgram}</strong> with all rights, privileges, and honors pertaining hereunto, having successfully satisfied all matriculated courses in the department of <strong>{paper.department}</strong>.
                          </p>
                          <div className="pt-4 flex justify-around items-center text-[9px] font-sans text-neutral-510 font-bold">
                            <div>
                              <p className="border-t border-neutral-300 pt-1 px-4 text-center">Dr. Abraham S. Borbor</p>
                              <p className="text-neutral-400">President, Registrar Block</p>
                            </div>
                            <div className="w-10 h-10 border-4 border-yellow-500 rounded-full flex items-center justify-center font-bold text-yellow-600 font-mono text-[8px] tracking-tighter">
                              SEAL 2026
                            </div>
                          </div>
                        </div>
                      )}

                      {paper.type === 'recommendation' && (
                        <div className="space-y-3 py-2 text-xs leading-relaxed text-neutral-800">
                          <p className="text-right font-mono text-[10px] text-neutral-400">Date: {new Date(paper.issueDate).toLocaleDateString()}</p>
                          <p className="font-bold">TO WHOM IT MAY CONCERN,</p>
                          <p className="indent-4 leading-relaxed text-justify">
                            It is with great pleasure and highest confidence that I write this official letter of recommendation for <strong>{paper.studentName}</strong> (Matric No: {paper.studentMatric}). As a remote learner inside our curriculum department of <strong>{paper.department}</strong>, they demonstrated pristine analytical dexterity, active community collaboration, and excellent self-pacing.
                          </p>
                          <p className="indent-4 leading-relaxed text-justify">
                            {paper.recommendationBody || "Throughout their timeline at Akin International Online University, they showed unparalleled grit in solving practical engineering structures. We endorse them unequivocally for graduate study or advanced workforce roles."}
                          </p>
                          <div className="pt-6 font-sans text-[10px] text-neutral-600 space-y-1">
                            <p className="font-bold text-neutral-800">Sincerely endorsed,</p>
                            <p className="font-semibold text-blue-900">Dr. Abraham S. Borbor</p>
                            <p>Provost & Registrar Block, AIOU International Committee</p>
                          </div>
                        </div>
                      )}

                      {paper.type === 'transcript' && (
                        <div className="space-y-4 font-sans py-2">
                          <div className="text-center">
                            <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-800">Official Graduation Transcript</h3>
                            <p className="text-[10px] text-neutral-405 font-mono">Student: {paper.studentName} | Matric: {paper.studentMatric}</p>
                          </div>

                          <table className="w-full text-[10px] text-neutral-700 leading-relaxed border-collapse">
                            <thead>
                              <tr className="bg-neutral-100 text-left border-b border-neutral-200 font-bold">
                                <th className="p-1 px-2">Course Code</th>
                                <th className="p-1 px-2">Course Title</th>
                                <th className="p-1 px-2 text-center">Credits</th>
                                <th className="p-1 px-2 text-center">Numeric</th>
                                <th className="p-1 px-2 text-center">Letter</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paper.transcriptData?.courseGrades && paper.transcriptData.courseGrades.length > 0 ? (
                                paper.transcriptData.courseGrades.map((g, idx) => (
                                  <tr key={idx} className="border-b border-neutral-200/50 hover:bg-neutral-100/50">
                                    <td className="p-1 px-2 font-mono text-neutral-900">{g.courseCode}</td>
                                    <td className="p-1 px-2 font-semibold text-neutral-800">{g.courseTitle}</td>
                                    <td className="p-1 px-2 text-center">{g.credits}</td>
                                    <td className="p-1 px-2 text-center">{g.score}%</td>
                                    <td className="p-1 px-2 text-center font-bold text-blue-900">{g.grade}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={5} className="text-center italic text-neutral-450 p-3">No graded courses populated on graduation record.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>

                          <div className="bg-neutral-100 rounded-lg p-2.5 flex justify-between items-center text-[10px] font-bold text-neutral-850">
                            <span>Total Completed Credits: {paper.transcriptData?.totalCredits || 0} CH</span>
                            <span>Calculated Cumulative CGPA: {paper.transcriptData?.cgpa?.toFixed(2) || '0.00'} / 4.00</span>
                          </div>
                        </div>
                      )}

                      {paper.type === 'verification' && (
                        <div className="space-y-3 py-2 text-xs leading-relaxed text-neutral-800 font-sans">
                          <p className="text-right font-mono text-[10px] text-neutral-400">Verification ID: AIOU-VR-{paper.id.substring(0,8).toUpperCase()}</p>
                          <h4 className="font-bold text-blue-900 border-b pb-1">University Registry Academic Verification Sheet</h4>
                          <p>
                            Akin International Online University confirms that remote student <strong>{paper.studentName}</strong> has fully cleared all financial and curriculum balances.
                          </p>
                          <div className="bg-neutral-100 p-2 text-[10px] font-mono grid grid-cols-2 gap-2 text-neutral-600 rounded">
                            <p>Degree: {paper.degreeProgram}</p>
                            <p>Department: {paper.department}</p>
                            <p>Matriculation: {paper.studentMatric}</p>
                            <p>Clearing Date: {new Date(paper.issueDate).toLocaleDateString()}</p>
                          </div>
                          <p className="text-[10px] text-neutral-500 italic">
                            This document serves as primary legal clearance pending the dispatch of physically embossed certificates.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Copy print share controls */}
                    <div className="flex justify-end gap-2 text-xs">
                      <button 
                        onClick={() => window.print()}
                        className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Document</span>
                      </button>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `Verified Academic Paper:\nTitle: ${paper.title}\nStudent: ${paper.studentName}\nMatric No: ${paper.studentMatric}\nDepartment: ${paper.department}\nVerify Code: VER-${paper.id.substring(0,8).toUpperCase()}`
                          );
                          alert("Credential text details copied to clipboard!");
                        }}
                        className="bg-blue-900 text-white hover:bg-blue-950 px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share Verification Details</span>
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
