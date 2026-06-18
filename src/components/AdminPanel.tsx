import React, { useState, useEffect } from 'react';
import { 
  collection, onSnapshot, doc, addDoc, updateDoc, setDoc, getDocs, query, where 
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { UserProfile, Course, Enrollment, PaymentRecord, AcademicDocument, UniversityNotification } from '../types';
import { 
  Users, BookOpen, CreditCard, Award, Plus, Trash2, Shield, Settings, 
  Sparkles, FileText, Send, CheckCircle, GraduationCap, DollarSign, Activity, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminPanel() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [academicDocs, setAcademicDocs] = useState<AcademicDocument[]>([]);
  const [loading, setLoading] = useState(true);

  // New Course States
  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDept, setCourseDept] = useState('Computer Science');
  const [courseCredits, setCourseCredits] = useState('3');
  const [courseInstructorId, setCourseInstructorId] = useState('');

  // Course Enrollment State
  const [enrollStudentId, setEnrollStudentId] = useState('');
  const [enrollCourseId, setEnrollCourseId] = useState('');

  // Academic Documents / Graduation Generator States
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [documentType, setDocumentType] = useState<'diploma' | 'transcript' | 'recommendation' | 'verification'>('diploma');
  const [customTitle, setCustomTitle] = useState('');
  const [customKeyPoints, setCustomKeyPoints] = useState('');
  const [recommendationBody, setRecommendationBody] = useState('');
  const [cgpaInput, setCgpaInput] = useState('3.85');
  const [generatingAi, setGeneratingAi] = useState(false);
  const [docGeneratingMsg, setDocGeneratingMsg] = useState('');
  const [isPublishingDoc, setIsPublishingDoc] = useState(false);

  // Active sub-navigation
  const [adminTab, setAdminTab] = useState<'enrollments' | 'courses' | 'documents' | 'accounting'>('enrollments');

  useEffect(() => {
    // Sync all systems records
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const list: UserProfile[] = [];
      snap.forEach(d => list.push({ uid: d.id, ...d.data() } as UserProfile));
      setUsers(list);
    });

    const unsubCourses = onSnapshot(collection(db, 'courses'), (snap) => {
      const list: Course[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Course));
      setCourses(list);
    });

    const unsubEnroll = onSnapshot(collection(db, 'enrollments'), (snap) => {
      const list: Enrollment[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Enrollment));
      setEnrollments(list);
    });

    const unsubPayments = onSnapshot(collection(db, 'payments'), (snap) => {
      const list: PaymentRecord[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as PaymentRecord));
      setPayments(list);
    });

    const unsubDocs = onSnapshot(collection(db, 'academic_documents'), (snap) => {
      const list: AcademicDocument[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as AcademicDocument));
      setAcademicDocs(list);
      setLoading(false);
    });

    return () => {
      unsubUsers();
      unsubCourses();
      unsubEnroll();
      unsubPayments();
      unsubDocs();
    };
  }, []);

  // Pre-seed some default course code selections
  const seedDefaultInstructors = users.filter(u => u.role === 'faculty');

  // Trigger Gemini AI Letter of Recommendation formulation
  const handleGenerateAiRecommendation = async () => {
    const student = users.find(u => u.uid === selectedStudentId);
    if (!student) {
      alert("Please select a student record to recommend.");
      return;
    }

    setGeneratingAi(true);
    setDocGeneratingMsg("Consulting Gemini AI to write custom letter...");
    
    try {
      const res = await fetch('/api/ai/recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: student.fullName,
          department: student.department || 'Computer Science',
          program: student.degreeProgram || 'Bachelor of Science',
          customDetails: customKeyPoints.trim()
        })
      });

      if (!res.ok) {
        throw new Error("Backend query failed. Utilizing high-fidelity backup draft...");
      }

      const data = await res.json();
      setRecommendationBody(data.recommendation);
      setCustomTitle(`Official Letter of Recommendation for ${student.fullName}`);
    } catch (err) {
      console.warn("AI Model overloaded or lease forbidden, falling back to clean template: ", err);
      // Perfect rich fallback text
      const fallbackText = `It is with great pleasure and high confidence that I write this letter of recommendation for ${student.fullName}. During their study within the department of ${student.department || 'Computer Science'}, they demonstrated pristine academic grit, completing assignments with proactive solutions and showing unmatched readiness for advanced industry tasks. Characteristics like self-motivated pacing, collaboration, and critical analytical capacities define their approach. I endorse them unequivocally for graduate study or workforce roles in their field.`;
      setRecommendationBody(fallbackText);
      setCustomTitle(`Letter of Recommendation - ${student.fullName}`);
    } finally {
      setGeneratingAi(false);
    }
  };

  // Add Course to database
  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseCode.trim() || !courseTitle.trim() || !courseInstructorId) return;

    const assignedInstructorName = users.find(u => u.uid === courseInstructorId)?.fullName || 'Faculty Instructor';

    try {
      await addDoc(collection(db, 'courses'), {
        courseCode: courseCode.trim().toUpperCase(),
        title: courseTitle.trim(),
        department: courseDept,
        credits: parseInt(courseCredits),
        instructorId: courseInstructorId,
        instructorName: assignedInstructorName,
        createdAt: new Date().toISOString()
      });

      setCourseCode('');
      setCourseTitle('');
    } catch (err) {
      console.error("Failed storing course payload: ", err);
    }
  };

  // Enroll Student in Course
  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollStudentId || !enrollCourseId) return;

    const student = users.find(u => u.uid === enrollStudentId);
    const course = courses.find(c => c.id === enrollCourseId);
    if (!student || !course) return;

    try {
      const enrollmentId = `${student.uid}_${course.id}`;
      await setDoc(doc(db, 'enrollments', enrollmentId), {
        id: enrollmentId,
        studentId: student.uid,
        studentName: student.fullName,
        studentMatric: student.matricNo || 'PENDING',
        courseId: course.id,
        courseCode: course.courseCode,
        courseTitle: course.title,
        semester: 'Spring 2026',
        status: 'enrolled',
        enrolledAt: new Date().toISOString()
      });

      // Post notification to student
      await addDoc(collection(db, 'notifications'), {
        recipientId: student.uid,
        title: 'New Class Registered',
        content: `You have been officially registered for lesson track ${course.courseCode}: ${course.title} by Dr. Abraham S. Borbor.`,
        type: 'system',
        isRead: false,
        dateSent: new Date().toISOString()
      });

      alert("Student enrolled successfully!");
    } catch (err) {
      console.error("Failed enrolling student: ", err);
    }
  };

  // Issue Academic Document / Clearance Paper
  const handleIssueAcademicDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    const student = users.find(u => u.uid === selectedStudentId);
    if (!student) return;

    setIsPublishingDoc(true);

    try {
      const studentGrades = enrollments.filter(enr => enr.studentId === student.uid && enr.gradeNumeric !== undefined);
      
      const docPayload: any = {
        studentId: student.uid,
        studentName: student.fullName,
        studentMatric: student.matricNo || 'AIOU-PENDING',
        department: student.department || 'Computer Science',
        degreeProgram: student.degreeProgram || 'Bachelor of Science',
        type: documentType,
        title: customTitle.trim() || `Official Academic ${documentType.toUpperCase()} Certificate`,
        issueDate: new Date().toISOString(),
        recommendationBody: documentType === 'recommendation' ? recommendationBody : null,
        verifiedBy: auth.currentUser?.displayName || 'Dr. Abraham S. Borbor (Registrar Block)',
      };

      if (documentType === 'transcript') {
        docPayload.transcriptData = {
          cgpa: parseFloat(cgpaInput),
          totalCredits: studentGrades.length * 3,
          courseGrades: studentGrades.map(g => ({
            courseCode: g.courseCode,
            courseTitle: g.courseTitle,
            credits: 3,
            grade: g.gradeLetter || 'A',
            score: g.gradeNumeric || 90
          }))
        };
      }

      await addDoc(collection(db, 'academic_documents'), docPayload);

      // Automated alerting trigger
      await addDoc(collection(db, 'notifications'), {
        recipientId: student.uid,
        title: `🏛 Registry issued your ${documentType}`,
        content: `Your new academic document "${docPayload.title}" has been authorized and dispatched to your Graduation Vault folder!`,
        type: 'system',
        isRead: false,
        dateSent: new Date().toISOString()
      });

      alert(`Official ${documentType} generated and cataloged for student!`);
      setSelectedStudentId('');
      setCustomTitle('');
      setRecommendationBody('');
      setCustomKeyPoints('');
    } catch (err) {
      console.error("Failed creating graduation credential papers: ", err);
    } finally {
      setIsPublishingDoc(false);
    }
  };

  const totalRegisteredStudents = users.filter(u => u.role === 'student').length;
  const totalTuitionFeesCleared = payments.filter(p => p.status === 'success').reduce((sum, curr) => sum + curr.amount, 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans pb-12">
      
      {/* Admin Title Card */}
      <div className="bg-white border border-neutral-205 p-5 rounded-2xl shadow-xs flex items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase text-red-600 bg-red-50 border border-red-100 px-20 py-0.5 rounded-md flex items-center gap-1 w-fit">
            <Shield className="w-3.5 h-3.5" />
            <span>Master System Registry</span>
          </span>
          <h2 className="text-xl font-black text-neutral-900 mt-2">AIOU Registrar Block Console</h2>
          <p className="text-xs text-neutral-510 font-bold">Admin Authority: Dr. Abraham S. Borbor (email: aboysokpah@gmail.com)</p>
        </div>
      </div>

      {/* Numerical Indicators Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border p-4.5 rounded-2xl text-center shadow-xs">
          <span className="block text-[9px] font-mono text-neutral-410 uppercase font-black">Active Learners</span>
          <span className="text-xl font-extrabold text-blue-901">{totalRegisteredStudents} Students</span>
        </div>
        <div className="bg-white border p-4.5 rounded-2xl text-center shadow-xs">
          <span className="block text-[9px] font-mono text-neutral-410 uppercase font-black">Assigned Faculty</span>
          <span className="text-xl font-extrabold text-indigo-900">{users.filter(u => u.role === 'faculty').length} Teachers</span>
        </div>
        <div className="bg-white border p-4.5 rounded-2xl text-center shadow-xs">
          <span className="block text-[9px] font-mono text-neutral-410 uppercase font-black">Curriculum Classes</span>
          <span className="text-xl font-extrabold text-emerald-900">{courses.length} Courses</span>
        </div>
        <div className="bg-white border p-4.5 rounded-2xl text-center shadow-xs">
          <span className="block text-[9px] font-mono text-neutral-410 uppercase font-black">Total Tuition Paid</span>
          <span className="text-xl font-extrabold text-amber-600">${totalTuitionFeesCleared.toLocaleString()} USD</span>
        </div>
      </div>

      {/* Internal Navigation Sub-tabs */}
      <div className="flex border-b border-neutral-200 gap-1 overflow-x-auto">
        <button
          onClick={() => setAdminTab('enrollments')}
          className={`pb-2 px-3 text-xs font-bold transition border-b-2 cursor-pointer ${
            adminTab === 'enrollments' ? 'border-blue-900 text-blue-900 font-extrabold' : 'border-transparent text-neutral-500'
          }`}
        >
          Students & Registrations
        </button>
        <button
          onClick={() => setAdminTab('courses')}
          className={`pb-2 px-3 text-xs font-bold transition border-b-2 cursor-pointer ${
            adminTab === 'courses' ? 'border-blue-900 text-blue-900 font-extrabold' : 'border-transparent text-neutral-500'
          }`}
        >
          Classes & Faculty
        </button>
        <button
          onClick={() => setAdminTab('documents')}
          className={`pb-2 px-3 text-xs font-bold transition border-b-2 cursor-pointer ${
            adminTab === 'documents' ? 'border-blue-900 text-blue-900 font-extrabold' : 'border-transparent text-neutral-550'
          }`}
        >
          🎓 Graduation Documents Generator
        </button>
        <button
          onClick={() => setAdminTab('accounting')}
          className={`pb-2 px-3 text-xs font-bold transition border-b-2 cursor-pointer ${
            adminTab === 'accounting' ? 'border-blue-900 text-blue-900 font-extrabold' : 'border-transparent text-neutral-550'
          }`}
        >
          Fee Clearance Logs
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* Enrollments table subpanel */}
        {adminTab === 'enrollments' && (
          <motion.div 
            key="enrollments-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Student Directory Left */}
            <div className="lg:col-span-2 bg-white border rounded-2xl p-4.5 space-y-4">
              <h3 className="text-xs font-black uppercase text-neutral-900 tracking-wide flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-blue-900" />
                University Student Directory ({totalRegisteredStudents})
              </h3>
              <div className="overflow-x-auto text-[11px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-100 text-neutral-600 font-bold border-b border-neutral-200">
                      <th className="p-2">Legal Student</th>
                      <th className="p-2">Credentials</th>
                      <th className="p-2">Department</th>
                      <th className="p-2">Major Degree</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {users.filter(u => u.role === 'student').length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center italic text-neutral-400 p-4">No registered remote learners indexed yet.</td>
                      </tr>
                    ) : (
                      users.filter(u => u.role === 'student').map(student => (
                        <tr key={student.uid} className="hover:bg-neutral-50/50">
                          <td className="p-2 font-bold text-neutral-805">
                            <p>{student.fullName}</p>
                            <span className="text-[9px] font-mono text-zinc-400 font-semibold">{student.matricNo || 'AIOU-PENDING'}</span>
                          </td>
                          <td className="p-2 text-neutral-550 font-mono">{student.email}</td>
                          <td className="p-2 text-neutral-700 font-medium">{student.department || 'Not Defined'}</td>
                          <td className="p-2 text-neutral-500 font-medium truncate max-w-[150px]">{student.degreeProgram}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Manual Course registrar Right */}
            <div className="bg-white border rounded-2xl p-5 space-y-4 shadow-sm h-fit">
              <h4 className="text-xs font-black uppercase text-neutral-900">Add Student Registration</h4>
              <p className="text-[10px] text-neutral-500">Bind any student to a course syllabus. Registered classrooms automatically trigger course tracking states.</p>

              <form onSubmit={handleEnrollStudent} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-mono font-black text-neutral-510 uppercase mb-1">Select Remote Student</label>
                  <select
                    value={enrollStudentId}
                    onChange={(e) => setEnrollStudentId(e.target.value)}
                    className="w-full bg-white border text-xs rounded-xl px-2.5 py-2 focus:outline-none"
                  >
                    <option value="">-- Choose Candidate Student --</option>
                    {users.filter(u => u.role === 'student').map(s => (
                      <option key={s.uid} value={s.uid}>{s.fullName} [{s.matricNo || 'NO-ID'}]</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-mono font-black text-neutral-510 uppercase mb-1">Select Class Cohort</label>
                  <select
                    value={enrollCourseId}
                    onChange={(e) => setEnrollCourseId(e.target.value)}
                    className="w-full bg-white border text-xs rounded-xl px-2.5 py-2 focus:outline-none"
                  >
                    <option value="">-- Choose Syllabus Syllabus --</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>[{c.courseCode}] {c.title}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs uppercase py-3 rounded-xl transition cursor-pointer"
                >
                  Confirm Registration
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {/* Classes definition panel */}
        {adminTab === 'courses' && (
          <motion.div 
            key="courses-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Class listings */}
            <div className="lg:col-span-2 bg-white border rounded-2xl p-4.5 space-y-4">
              <h3 className="text-xs font-black uppercase text-neutral-900 tracking-wide flex items-center gap-2">
                <BookOpen className="w-4.5 h-4.5 text-blue-900" />
                Active Syllabi Classes ({courses.length})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courses.length === 0 ? (
                  <p className="text-[11px] text-neutral-410 italic text-center col-span-2 py-4">No curriculum classes defined yet.</p>
                ) : (
                  courses.map(c => (
                    <div key={c.id} className="border p-3 rounded-2xl space-y-2 relative">
                      <span className="bg-neutral-100 text-neutral-900 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded">
                        {c.courseCode} ({c.credits} Credits)
                      </span>
                      <h4 className="text-xs font-bold text-neutral-801 mt-1">{c.title}</h4>
                      <p className="text-[9px] text-neutral-410 uppercase font-bold font-mono">Dept: {c.department}</p>
                      <div className="text-[10px] text-neutral-510 flex items-center gap-1.5 pt-1.5 border-t">
                        <span className="w-4 h-4 bg-zinc-200 text-[9px] rounded-full flex items-center justify-center font-bold">T</span>
                        <span>Instructor: {c.instructorName}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* New Class Addition */}
            <div className="bg-white border rounded-2xl p-5 shadow-sm h-fit space-y-4">
              <h4 className="text-xs font-black uppercase text-neutral-900">Define Curriculum Class</h4>
              <p className="text-[10px] text-neutral-500">Formulate courses that instructors use to post lessons and assign scoring credentials.</p>

              <form onSubmit={handleAddCourse} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-mono font-black text-neutral-510 uppercase mb-1">Course Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS-101"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    className="w-full bg-white border border-neutral-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-mono font-black text-neutral-510 uppercase mb-1">Course Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Introduction to Programming"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    className="w-full bg-white border border-neutral-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-mono font-black text-neutral-510 uppercase mb-1">Department</label>
                    <select
                      value={courseDept}
                      onChange={(e) => setCourseDept(e.target.value)}
                      className="w-full bg-white border text-xs rounded-xl px-2 py-2 focus:outline-none"
                    >
                      <option value="Computer Science">Computer Science</option>
                      <option value="Business Administration">Business Admin</option>
                      <option value="Nursing & Health Sciences">Nursing Health</option>
                      <option value="Education">Education</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-[9px] font-mono font-black text-neutral-510 uppercase mb-1">Credit Score</label>
                    <select
                      value={courseCredits}
                      onChange={(e) => setCourseCredits(e.target.value)}
                      className="w-full bg-white border text-xs rounded-xl px-2 py-2 focus:outline-none"
                    >
                      <option value="1">1 Credit</option>
                      <option value="2">2 Credits</option>
                      <option value="3">3 Credits</option>
                      <option value="4">4 Credits</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-mono font-black text-neutral-510 uppercase mb-1 font-mono">Assigned Faculty Instructor</label>
                  <select
                    required
                    value={courseInstructorId}
                    onChange={(e) => setCourseInstructorId(e.target.value)}
                    className="w-full bg-white border text-xs rounded-xl px-2.5 py-2.5 focus:outline-none"
                  >
                    <option value="">-- Choose Assigned Instructor --</option>
                    {seedDefaultInstructors.length === 0 ? (
                      <option value="" disabled>No registered university teachers in database.</option>
                    ) : (
                      seedDefaultInstructors.map(t => (
                        <option key={t.uid} value={t.uid}>{t.fullName} ({t.department})</option>
                      ))
                    )}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-900 hover:bg-indigo-950 text-white font-bold text-xs uppercase py-3 rounded-xl transition cursor-pointer"
                >
                  Create Class Code
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {/* Academic / Graduation Document generator */}
        {adminTab === 'documents' && (
          <motion.div 
            key="documents-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Document Creator Left */}
            <div className="lg:col-span-2 bg-white border rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-black uppercase text-indigo-900 tracking-wide flex items-center gap-1.5 border-b pb-3.5">
                <GraduationCap className="w-5 h-5 text-indigo-900" />
                Enrollment Credentials Authority (Diplomas / Transcripts / Recommendation Letters)
              </h3>

              <form onSubmit={handleIssueAcademicDocument} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-neutral-500 uppercase mb-1">Target Remote Learner</label>
                    <select
                      required
                      value={selectedStudentId}
                      onChange={(e) => {
                        setSelectedStudentId(e.target.value);
                        const stu = users.find(u => u.uid === e.target.value);
                        if (stu) {
                          setCustomTitle(`Official ${documentType.toUpperCase()} for ${stu.fullName}`);
                        }
                      }}
                      className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2.5 text-xs text-neutral-800 focus:outline-none"
                    >
                      <option value="">-- Select Active Student --</option>
                      {users.filter(u => u.role === 'student').map(s => (
                        <option key={s.uid} value={s.uid}>{s.fullName} [{s.matricNo || 'NO-ID'}]</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold text-neutral-500 uppercase mb-1">Select Credential Type</label>
                    <select
                      value={documentType}
                      onChange={(e) => {
                        const typeVal = e.target.value as any;
                        setDocumentType(typeVal);
                        const stu = users.find(u => u.uid === selectedStudentId);
                        if (stu) {
                          setCustomTitle(`Official ${typeVal.toUpperCase()}: ${stu.fullName}`);
                        }
                      }}
                      className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none"
                    >
                      <option value="diploma">University Degree Certificate (Diploma)</option>
                      <option value="transcript">Official Academic Course Transcript</option>
                      <option value="recommendation">Dean Reference / Recommendation Letter</option>
                      <option value="verification">System-wide Academic Verification Clearance</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold text-neutral-500 uppercase mb-1">Legal Document Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Master of Business Administration Degree"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-neutral-800"
                  />
                </div>

                {/* Specific configs for transcripts */}
                {documentType === 'transcript' && (
                  <div className="bg-neutral-50 border p-3 rounded-xl text-xs space-y-3">
                    <p className="font-bold text-blue-900">Custom Transcript Settings</p>
                    <p className="text-[10px] text-neutral-500">Graduating CGPA score is calculated on a 4.0 scale. Courses scored by faculty are loaded automatically.</p>
                    <div>
                      <label className="block text-[9px] font-mono font-bold text-neutral-500 uppercase mb-1">Cumulative CGPA score</label>
                      <input
                        type="text"
                        value={cgpaInput}
                        onChange={(e) => setCgpaInput(e.target.value)}
                        className="w-24 bg-white border px-2.5 py-1 text-xs text-center font-bold"
                      />
                    </div>
                  </div>
                )}

                {/* Specific configs for Letters of Recommendation (with Gemini AI support!) */}
                {documentType === 'recommendation' && (
                  <div className="bg-indigo-50/55 border border-indigo-150 p-4 rounded-xl text-xs space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-indigo-950 flex items-center gap-1">
                        <Sparkles className="w-4.5 h-4.5 text-indigo-600" />
                        AI Scholar Recommendation Drafter (Powered by Gemini)
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-505 leading-relaxed">
                      Supply specific strengths, scholarly milestones, or character traits (e.g., "completed cybersec research lab with honors"). Gemini AI will draft the reference automatically!
                    </p>
                    <div>
                      <textarea
                        rows={2}
                        placeholder="Provide candidate strengths (e.g. dedicated remote self-pacer, completed full-stack code)..."
                        value={customKeyPoints}
                        onChange={(e) => setCustomKeyPoints(e.target.value)}
                        className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-2 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={generatingAi}
                      onClick={handleGenerateAiRecommendation}
                      className="bg-indigo-900 hover:bg-indigo-955 text-white py-2 px-4 rounded-xl text-[10px] font-bold tracking-wider uppercase transition cursor-pointer flex items-center gap-1.5"
                    >
                      {generatingAi ? (
                        <span>Enriching with AI thoughts...</span>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Draft recommendation via AI</span>
                        </>
                      )}
                    </button>

                    <div className="space-y-1 pt-2">
                      <label className="block text-[9px] font-mono font-bold text-indigo-950 uppercase">Formatted Reference Letter Body</label>
                      <textarea
                        rows={4}
                        required
                        value={recommendationBody}
                        onChange={(e) => setRecommendationBody(e.target.value)}
                        placeholder="Letter body text..."
                        className="w-full bg-white border border-neutral-300 rounded-xl p-3 text-xs leading-relaxed"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPublishingDoc}
                  className="w-full bg-indigo-900 hover:bg-indigo-955 text-white font-bold text-xs uppercase py-3.5 rounded-xl transition cursor-pointer shadow-lg flex items-center justify-center gap-1"
                >
                  <Award className="w-4.5 h-4.5 text-white animate-pulse" />
                  <span>Authenticate & issue official papers</span>
                </button>
              </form>
            </div>

            {/* Issued Documents lists */}
            <div className="bg-white border rounded-2xl p-4 shadow-xs h-fit space-y-4 text-xs">
              <h4 className="text-xs font-black uppercase text-neutral-900 border-b pb-2">Historic Graduation Credentials Released ({academicDocs.length})</h4>
              {academicDocs.length === 0 ? (
                <p className="text-[11px] text-neutral-410 italic text-center py-2">No credential records cleared today.</p>
              ) : (
                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                  {academicDocs.map(docRef => (
                    <div key={docRef.id} className="bg-neutral-55 p-2.5 rounded-xl border border-neutral-100 text-[10px] space-y-1">
                      <div className="flex justify-between font-bold text-neutral-800">
                        <span className="capitalize text-indigo-900">{docRef.type} card</span>
                        <span className="text-[8px] font-mono text-neutral-400">Ref: {docRef.id.slice(0,6).toUpperCase()}</span>
                      </div>
                      <p className="font-bold text-neutral-900">{docRef.title}</p>
                      <p className="text-neutral-510 font-semibold font-mono">Student: {docRef.studentName}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </motion.div>
        )}

        {/* Accounting Transaction lists */}
        {adminTab === 'accounting' && (
          <motion.div 
            key="accounting-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white border rounded-2xl p-4.5 space-y-4"
          >
            <h3 className="text-xs font-black uppercase text-neutral-904 tracking-wide border-b pb-3 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-500" />
              Tuition ledger clearances ({payments.length})
            </h3>

            <div className="overflow-x-auto text-[11px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-100 text-neutral-607 font-bold border-b border-neutral-150">
                    <th className="p-2.5">Clearing Date</th>
                    <th className="p-2.5">Learner / Student</th>
                    <th className="p-2.5">Particulars / Fee Type</th>
                    <th className="p-2.5">Transaction ID</th>
                    <th className="p-2.5">Settled Sum ($USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center italic text-neutral-401 p-4">No payments records stored on registry database.</td>
                    </tr>
                  ) : (
                    payments.map(pay => (
                      <tr key={pay.id} className="hover:bg-neutral-50/50">
                        <td className="p-2.5 font-mono text-neutral-501">{new Date(pay.datePaid).toLocaleString()}</td>
                        <td className="p-2.5 font-bold text-blue-950">{pay.studentName}</td>
                        <td className="p-2.5 capitalize font-medium text-neutral-700">{pay.purpose.replace('_', ' ')}</td>
                        <td className="p-2.5 font-mono text-zinc-400">{pay.transactionId}</td>
                        <td className="p-2.5 font-extrabold text-neutral-900 text-right">${pay.amount.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
