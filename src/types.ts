export type UserRole = 'student' | 'faculty' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  matricNo?: string;          // e.g. AIOU-2026-0493
  department?: string;        // e.g. Computer Science (CS), Business Administration (BA), Nursing
  degreeProgram?: string;     // e.g. Bachelor of Science in Cybersecurity
  admissionYear?: string;
  status?: 'active' | 'graduated' | 'suspended';
  gradeLevel?: string;        // e.g., Freshman, Sophomore, Junior, Senior, or PG
  createdAt: any;
}

export interface Course {
  id: string;
  courseCode: string;         // e.g. CS-101
  title: string;
  department: string;
  description: string;
  credits: number;
  instructorId: string;
  instructorName: string;
  createdAt: any;
}

export interface Lesson {
  id: string;
  courseId: string;
  courseCode: string;
  title: string;
  content: string;            // supports Markdown
  videoUrl?: string;          // optional zoom/youtube links
  assignmentTitle?: string;
  assignmentDeadline?: any;   // Firestore Timestamp
  examSchedule?: any;         // Firestore Exam Date Timestamp
  datePosted: any;
}

export interface Enrollment {
  id: string;                 // studentId_courseId
  studentId: string;
  studentName: string;
  studentMatric?: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  gradeNumeric?: number;      // 0 to 100
  gradeLetter?: string;       // A, B, C, D, F
  semester: string;           // Fall 2026, Spring 2026
  status: 'enrolled' | 'completed' | 'dropped';
  enrolledAt: any;
}

export interface PaymentRecord {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  purpose: 'tuition' | 'graduation_fee' | 'library_access' | 'admission';
  transactionId: string;
  status: 'pending' | 'success' | 'failed';
  paymentMethod: string;
  cardBrand?: string;
  datePaid: any;
}

export interface ForumPost {
  id: string;
  courseId: string;           // 'general' or specific courseId
  courseCode?: string;        // e.g. General Discussion or CS-101
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  title: string;
  content: string;
  likesCount: number;
  commentsCount: number;
  datePosted: any;
}

export interface ForumComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  content: string;
  datePosted: any;
}

export interface AcademicDocument {
  id: string;
  studentId: string;
  studentName: string;
  studentMatric: string;
  department: string;
  degreeProgram: string;
  type: 'diploma' | 'transcript' | 'recommendation' | 'verification';
  title: string;              // e.g., Certificate of Graduation, Official Transcript of Academic Records, Letter of Recommendation for Graduate Studies
  issueDate: any;
  recipientOrg?: string;      // optional recipient verification request
  contentHtml?: string;       // generated letter or document layout
  transcriptData?: {
    cgpa: number;
    totalCredits: number;
    courseGrades: Array<{
      courseCode: string;
      courseTitle: string;
      credits: number;
      grade: string;
      score: number;
    }>;
  };
  recommendationBody?: string;
  verifiedBy: string;         // Admin display name
}

export interface UniversityNotification {
  id: string;
  recipientId: string;        // 'all' or specific student UID
  title: string;
  content: string;
  type: 'assignment' | 'exam' | 'payment' | 'grade' | 'system';
  isRead: boolean;
  deadlineDate?: any;         // deadline timestamp
  dateSent: any;
}
