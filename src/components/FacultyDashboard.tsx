import React, { useState, useEffect } from 'react';
import { 
  collection, query, where, onSnapshot, doc, addDoc, updateDoc, deleteDoc, getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, Course, Lesson, Enrollment, UniversityNotification } from '../types';
import { 
  BookOpen, Plus, Trash2, Edit2, Check, Award, Calendar, Clock, Sparkles, 
  User, CheckCircle, ArrowRight, AlertTriangle, Send, RefreshCw, Layers 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FacultyDashboardProps {
  userProfile: UserProfile;
}

export default function FacultyDashboard({ userProfile }: FacultyDashboardProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  // Lesson formulation state
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentDeadline, setAssignmentDeadline] = useState('');
  const [examSchedule, setExamSchedule] = useState('');
  const [isPostingLesson, setIsPostingLesson] = useState(false);

  // Grading states
  const [gradingEnrollment, setGradingEnrollment] = useState<Enrollment | null>(null);
  const [gradeNumeric, setGradeNumeric] = useState<number>(85);
  const [semesterTerm, setSemesterTerm] = useState('Spring 2026');
  const [isSavingGrade, setIsSavingGrade] = useState(false);

  // Load faculty's courses
  useEffect(() => {
    // If not admin, filter courses where instructorId matches
    const isSystemAdmin = userProfile.role === 'admin';
    const cQuery = isSystemAdmin 
      ? collection(db, 'courses') 
      : query(collection(db, 'courses'), where('instructorId', '==', userProfile.uid));

    const unsubCourses = onSnapshot(cQuery, (snap) => {
      const list: Course[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as Course);
      });
      setCourses(list);
      if (list.length > 0 && !selectedCourse) {
        setSelectedCourse(list[0]);
      }
      setLoading(false);
    }, (err) => {
      console.error("Error reading instructor courses: ", err);
      setLoading(false);
    });

    return () => unsubCourses();
  }, [userProfile.uid, userProfile.role]);

  // Load selected course subcollections / records
  useEffect(() => {
    if (!selectedCourse) {
      setEnrollments([]);
      setLessons([]);
      return;
    }

    // A. Load Student Enrollments for this course
    const qEnroll = query(collection(db, 'enrollments'), where('courseId', '==', selectedCourse.id));
    const unsubEnroll = onSnapshot(qEnroll, (snap) => {
      const list: Enrollment[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as Enrollment);
      });
      setEnrollments(list);
    });

    // B. Load Course Syllabus Lessons
    const qLess = query(collection(db, `courses/${selectedCourse.id}/lessons`));
    const unsubLess = onSnapshot(qLess, (snap) => {
      const list: Lesson[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as Lesson);
      });
      list.sort((a,b)=> new Date(b.datePosted).getTime() - new Date(a.datePosted).getTime());
      setLessons(list);
    });

    return () => {
      unsubEnroll();
      unsubLess();
    };
  }, [selectedCourse]);

  // Translate numeric grade to classical scale letter
  const getLetterGrade = (score: number) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  // Submit student grade assessment
  const handleSaveStudentGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingEnrollment) return;

    setIsSavingGrade(true);
    const scoreVal = Number(gradeNumeric);
    const letterVal = getLetterGrade(scoreVal);

    try {
      const docRef = doc(db, 'enrollments', gradingEnrollment.id);
      await updateDoc(docRef, {
        gradeNumeric: scoreVal,
        gradeLetter: letterVal,
        status: 'completed',
        semester: semesterTerm
      });

      // Issue dynamic notification (alert email simulator)
      await addDoc(collection(db, 'notifications'), {
        recipientId: gradingEnrollment.studentId,
        title: `Grade Received: ${selectedCourse?.courseCode}`,
        content: `Your final grade for ${selectedCourse?.title} was released. Performance Score: ${scoreVal}% (${letterVal}).`,
        type: 'grade',
        isRead: false,
        dateSent: new Date().toISOString()
      });

      setGradingEnrollment(null);
    } catch (err) {
      console.error("Failed submitting student score card: ", err);
    } finally {
      setIsSavingGrade(false);
    }
  };

  // Post lesson in syllabus curriculum
  const handlePostLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !lessonTitle.trim() || !lessonContent.trim()) return;

    setIsPostingLesson(true);

    try {
      const lessonPayload = {
        courseId: selectedCourse.id,
        courseCode: selectedCourse.courseCode,
        title: lessonTitle.trim(),
        content: lessonContent.trim(),
        videoUrl: videoUrl.trim() || null,
        assignmentTitle: assignmentTitle.trim() || null,
        assignmentDeadline: assignmentDeadline ? new Date(assignmentDeadline).toISOString() : null,
        examSchedule: examSchedule ? new Date(examSchedule).toISOString() : null,
        datePosted: new Date().toISOString()
      };

      // Add as subcollection item inside course document
      await addDoc(collection(db, `courses/${selectedCourse.id}/lessons`), lessonPayload);

      // Automated announcements/alert system triggers: Send assignment/exam notification alerts to enrolling students!
      if (assignmentTitle.trim()) {
        const studentQueryRef = query(collection(db, 'enrollments'), where('courseId', '==', selectedCourse.id));
        const stSnap = await getDocs(studentQueryRef);
        stSnap.forEach(async (enrDoc) => {
          const enrollData = enrDoc.data();
          await addDoc(collection(db, 'notifications'), {
            recipientId: enrollData.studentId,
            title: `New Homework: ${selectedCourse.courseCode}`,
            content: `Instructor ${userProfile.fullName} assigned high priority homework task: "${assignmentTitle.trim()}" in your class ${selectedCourse.title}. Due date listed below.`,
            type: 'assignment',
            deadlineDate: assignmentDeadline ? new Date(assignmentDeadline).toISOString() : null,
            isRead: false,
            dateSent: new Date().toISOString()
          });
        });
      }

      if (examSchedule) {
        const studentQueryRef = query(collection(db, 'enrollments'), where('courseId', '==', selectedCourse.id));
        const stSnap = await getDocs(studentQueryRef);
        stSnap.forEach(async (enrDoc) => {
          const enrollData = enrDoc.data();
          await addDoc(collection(db, 'notifications'), {
            recipientId: enrollData.studentId,
            title: `🚨 EXAM ARRANGED: ${selectedCourse.courseCode}`,
            content: `Final/Midterm examination has been officially scheduled for ${selectedCourse.title}. Prepare accordingly.`,
            type: 'exam',
            deadlineDate: new Date(examSchedule).toISOString(),
            isRead: false,
            dateSent: new Date().toISOString()
          });
        });
      }

      setLessonTitle('');
      setLessonContent('');
      setVideoUrl('');
      setAssignmentTitle('');
      setAssignmentDeadline('');
      setExamSchedule('');
    } catch (err) {
      console.error("Failed adding syllabus lesson direction: ", err);
    } finally {
      setIsPostingLesson(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!selectedCourse) return;
    try {
      await deleteDoc(doc(db, `courses/${selectedCourse.id}/lessons`, lessonId));
    } catch (err) {
      console.error("Failed removing lecture module: ", err);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs font-mono text-neutral-5100">Loading academic faculty desk...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans pb-12">
      {/* Welcome Board */}
      <div className="bg-white border border-neutral-200 p-5 rounded-2xl shadow-xs flex items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md">University Portal Desk</span>
          <h2 className="text-lg font-black text-neutral-900 mt-2">Faculty Management Portal</h2>
          <p className="text-xs text-neutral-500 font-medium">Instructor: {userProfile.fullName} • Academic Department: {userProfile.department}</p>
        </div>
        <div className="bg-neutral-100 p-2.5 rounded-xl border flex items-center gap-2">
          <Layers className="w-5 h-4.5 text-neutral-600" />
          <span className="text-xs font-bold text-neutral-700">{courses.length} Assigned Classes</span>
        </div>
      </div>

      {/* Course select sidebar / dropdown */}
      <div className="bg-neutral-100 p-3 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3">
        <span className="text-xs font-bold text-neutral-750">Active Class Cohort Section:</span>
        <select
          value={selectedCourse?.id || ''}
          onChange={(e) => {
            const course = courses.find(c => c.id === e.target.value);
            if (course) setSelectedCourse(course);
          }}
          className="bg-white border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 text-neutral-850 font-bold min-w-[200px]"
        >
          {courses.map(c => (
            <option key={c.id} value={c.id}>
              [{c.courseCode}] {c.title}
            </option>
          ))}
        </select>
      </div>

      {selectedCourse ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Main Left - Students list, Grading */}
          <div className="space-y-6">
            
            {/* Student list card */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b pb-3.5">
                <h3 className="text-xs font-black uppercase text-neutral-900 tracking-wide flex items-center gap-2">
                  <User className="w-4.5 h-4.5 text-blue-900" />
                  Cohort Enrollees ({enrollments.length})
                </h3>
                <span className="text-[10px] font-mono text-neutral-400">Class Limit: 300</span>
              </div>

              {enrollments.length === 0 ? (
                <p className="text-[11px] text-neutral-401 italic py-4 text-center">Currently, no remote learners are registered in this class.</p>
              ) : (
                <div className="divide-y divide-neutral-100 max-h-[350px] overflow-y-auto pr-1">
                  {enrollments.map(enr => (
                    <div key={enr.id} className="py-3 text-[11px] flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <p className="font-bold text-neutral-800">{enr.studentName}</p>
                        <p className="text-[9px] font-mono text-neutral-400">ID: {enr.studentMatric || 'PENDING'}</p>
                      </div>

                      <div className="text-right">
                        {enr.gradeNumeric !== undefined ? (
                          <div className="flex items-center gap-2.5">
                            <span className="text-[10px] font-mono text-neutral-400">Score Card:</span>
                            <span className="bg-emerald-50 text-emerald-800 font-extrabold border border-emerald-100 rounded px-2.5 py-0.5 text-[11px]">
                              {enr.gradeNumeric}% ({enr.gradeLetter})
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setGradingEnrollment(enr);
                              setGradeNumeric(85);
                            }}
                            className="bg-blue-900 hover:bg-blue-950 text-white text-[9px] px-2.5 py-1 rounded-md font-bold transition cursor-pointer"
                          >
                            Grade Class
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Grading dialog overlay drawer style */}
            <AnimatePresence>
              {gradingEnrollment && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-blue-50/70 border border-blue-200 rounded-2xl p-5 space-y-4"
                >
                  <div className="flex justify-between items-center border-b border-blue-200/50 pb-2.5">
                    <span className="text-[10px] font-bold text-blue-900 font-mono uppercase">Grade Input Card:</span>
                    <button 
                      onClick={() => setGradingEnrollment(null)}
                      className="text-neutral-400 hover:text-neutral-700 font-bold text-xs"
                    >
                      Cancel
                    </button>
                  </div>

                  <p className="text-xs text-neutral-700 font-medium">
                    Submit grade scoring cards for <strong>{gradingEnrollment.studentName}</strong> in <strong>[{selectedCourse.courseCode}] {selectedCourse.title}</strong>.
                  </p>

                  <form onSubmit={handleSaveStudentGrade} className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-mono font-bold text-neutral-500 uppercase mb-1">Semester Term</label>
                        <input
                          type="text"
                          required
                          value={semesterTerm}
                          onChange={(e) => setSemesterTerm(e.target.value)}
                          className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[9px] font-mono font-bold text-neutral-500 uppercase mb-1">Numeric Score (0 - 100)</label>
                        <input
                          type="number"
                          required
                          min={0}
                          max={100}
                          value={gradeNumeric}
                          onChange={(e) => setGradeNumeric(Number(e.target.value))}
                          className="w-full bg-white border border-neutral-205 rounded-lg px-2.5 py-2 text-xs text-center font-bold focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingGrade}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase py-2.5 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer shadow-md"
                    >
                      <Check className="w-4 h-4" />
                      <span>Authenticate final grade ({getLetterGrade(gradeNumeric)})</span>
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Main Right - Post Syllabus Lectures, assignments, alerts */}
          <div className="space-y-6">
            
            {/* Form to insert syllabus */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="border-b pb-3.5 flex items-center gap-2">
                <BookOpen className="w-4.5 h-4.5 text-blue-900" />
                <h4 className="text-xs font-black uppercase text-neutral-900 tracking-wide">Publish Syllabus Lecture Topic</h4>
              </div>

              <form onSubmit={handlePostLesson} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono font-bold text-neutral-500 uppercase mb-1">Lecture Module Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Overview of Symmetric Key Cryptography"
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2.5 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold text-neutral-500 uppercase mb-1">Syllabus / Lecture Summary Course text</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Provide lecture key notes or syllabus references here. Custom paragraphs format works well."
                    value={lessonContent}
                    onChange={(e) => setLessonContent(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2.5 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-neutral-500 uppercase mb-1">Interactive Video URL / Zoom (Opt)</label>
                    <input
                      type="url"
                      placeholder="e.g. https://zoom.us/abc"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-neutral-500 uppercase mb-1">Assignment Prompt (Opt)</label>
                    <input
                      type="text"
                      placeholder="e.g. Lab exercise 1 writeup"
                      value={assignmentTitle}
                      onChange={(e) => setAssignmentTitle(e.target.value)}
                      className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-neutral-500 uppercase mb-1">Assignment Deadline (Opt)</label>
                    <input
                      type="datetime-local"
                      value={assignmentDeadline}
                      onChange={(e) => setAssignmentDeadline(e.target.value)}
                      className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-neutral-500 uppercase mb-1">Schedule Major Exam Date (Opt)</label>
                    <input
                      type="datetime-local"
                      value={examSchedule}
                      onChange={(e) => setExamSchedule(e.target.value)}
                      className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-700 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPostingLesson}
                  className="w-full bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs uppercase py-3.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 shadow-md"
                >
                  <Plus className="w-4.5 h-4.5" />
                  <span>Publish Lesson module</span>
                </button>
              </form>
            </div>

            {/* Published syllabus history logs */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-4">
              <h4 className="text-xs font-black uppercase text-neutral-900 tracking-wide border-b pb-3.5">Historic Syllabus Dispatches ({lessons.length})</h4>
              {lessons.length === 0 ? (
                <p className="text-[11px] text-neutral-401 italic text-center py-2">No custom lesson dispatches created yet.</p>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {lessons.map(les => (
                    <div key={les.id} className="bg-neutral-50/50 p-3 rounded-xl border border-neutral-150 text-[11px] space-y-2 relative">
                      <button 
                        onClick={() => handleDeleteLesson(les.id)}
                        className="absolute right-2 top-2 text-neutral-400 hover:text-red-650 p-1 rounded-md"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="pr-6 space-y-0.5">
                        <p className="font-extrabold text-neutral-900 leading-tight">{les.title}</p>
                        <p className="text-[9px] font-mono text-neutral-400">Date Posted: {new Date(les.datePosted).toLocaleString()}</p>
                      </div>
                      <p className="text-neutral-600 line-clamp-2 leading-relaxed border-l border-neutral-200 pl-2">{les.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      ) : (
        <div className="bg-white rounded-2xl p-8 border border-dashed text-center">
          <BookOpen className="w-8 h-8 text-neutral-350 mx-auto mb-2" />
          <p className="text-xs text-neutral-510 font-bold">Please define a course first inside the admin area to manage cohort modules.</p>
        </div>
      )}

    </div>
  );
}
