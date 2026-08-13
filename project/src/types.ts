export type UserRole = 'admin' | 'supervisor' | 'student';

export type AccountStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: AccountStatus;
  rejectionReason?: string;
  suspensionReason?: string;
  createdAt: string;
  approvedAt?: string;
  avatarUrl?: string;
}

export interface Session {
  token: string;
  userId: string;
  role: UserRole;
  name: string;
  email: string;
  expiresAt: number;
}

export interface Hadith {
  id: string;
  number: number;
  text: string;
  explanation: string;
  youtubeUrl: string;
  audioUrl: string;
  pdfUrl: string;
  category: string;
  narrator?: string;
}

export interface ProgressRecord {
  id: string;
  studentId: string;
  hadithId: string;
  memorized: boolean;
  listened: boolean;
  read: boolean;
  watched: boolean;
  videoPercent: number;
  videoPosition: number;
  audioPercent: number;
  audioPosition: number;
  pdfPercent: number;
  pdfLastPage: number;
  pdfTotalPages: number;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
}

export type MediaType = 'video' | 'audio' | 'pdf';

export interface DailyLesson {
  day: number;
  date: string;
  hadiths: Hadith[];
}

export interface Cycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed';
  studentIds: string[];
}

export interface Certificate {
  id: string;
  certificateNumber: string;
  studentId: string;
  studentName: string;
  cycleId: string;
  cycleName: string;
  issueDate: string;
  progressPercent: number;
  qrCode: string;
}

export interface Message {
  id: string;
  fromId: string;
  fromName: string;
  fromRole: UserRole;
  toId: string;
  toName: string;
  toRole: UserRole;
  subject: string;
  body: string;
  sentAt: string;
  read: boolean;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  target: 'all' | 'students' | 'supervisors' | 'student' | 'group';
  targetId?: string;
  createdAt: string;
  createdBy: string;
}

export interface OperationLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  operation: string;
  details: string;
  timestamp: string;
}

export interface AppSettings {
  appName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  aboutText: string;
  contactEmail: string;
  contactPhone: string;
  videoCompletionThreshold: number;
  audioCompletionThreshold: number;
  pdfCompletionThreshold: number;
}

export interface Backup {
  id: string;
  name: string;
  createdAt: string;
  size: string;
  createdBy: string;
}

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

export interface LoginResponse {
  session: Session;
  user: User;
}

export interface DashboardData {
  stats: {
    totalStudents: number;
    pendingStudents: number;
    approvedStudents: number;
    activeCycle: Cycle | null;
    hadithsCount: number;
    certificatesCount: number;
  };
  recentOperations: OperationLog[];
  recentRegistrations: User[];
}
