import type { UserRole } from '@/types';
import {
  LayoutDashboard, Users, UserCheck, BookOpen, Settings, Award,
  Bell, MessageSquare, DatabaseBackup, History, GraduationCap,
  ShieldCheck, BookMarked, CalendarDays, FolderOpen, UserCog, UserPlus, Library, ScanLine, Palette,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type NavSection = 'main' | 'learn' | 'follow' | 'comms' | 'manage' | 'account';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  roles: UserRole[];
  section: NavSection;
}

export const SECTION_LABELS: Record<NavSection, string> = {
  main: 'الرئيسية',
  learn: 'التعلّم',
  follow: 'المتابعة',
  comms: 'التواصل',
  manage: 'الإدارة',
  account: 'الحساب',
};

export const NAV_ITEMS: NavItem[] = [
  { label: 'لوحة التحكم', path: 'dashboard', icon: LayoutDashboard, roles: ['admin', 'supervisor', 'student'], section: 'main' },

  // Student
  { label: 'المقرر اليومي', path: 'daily', icon: CalendarDays, roles: ['student'], section: 'learn' },
  { label: 'الأحاديث', path: 'hadiths', icon: BookOpen, roles: ['student'], section: 'learn' },
  { label: 'إنجازي', path: 'progress', icon: BookMarked, roles: ['student'], section: 'learn' },
  { label: 'الشهادات', path: 'certificates', icon: Award, roles: ['student'], section: 'learn' },
  { label: 'التحقق من شهادة', path: 'verify', icon: ScanLine, roles: ['student'], section: 'learn' },

  // Supervisor + Admin
  { label: 'متابعة الطلاب', path: 'students', icon: Users, roles: ['admin', 'supervisor'], section: 'follow' },
  { label: 'طلبات التسجيل', path: 'approvals', icon: UserCheck, roles: ['admin', 'supervisor'], section: 'follow' },
  { label: 'إنجاز الطلاب', path: 'student-progress', icon: BookMarked, roles: ['admin', 'supervisor'], section: 'follow' },
  { label: 'إصدار الشهادات', path: 'issue-certificates', icon: Award, roles: ['admin'], section: 'follow' },
  { label: 'التحقق من شهادة', path: 'verify', icon: ScanLine, roles: ['admin', 'supervisor'], section: 'follow' },

  { label: 'الرسائل', path: 'messages', icon: MessageSquare, roles: ['student', 'admin', 'supervisor'], section: 'comms' },
  { label: 'الإشعارات', path: 'notifications', icon: Bell, roles: ['student', 'admin', 'supervisor'], section: 'comms' },

  // Admin
  { label: 'إدارة المشرفين', path: 'supervisors', icon: ShieldCheck, roles: ['admin'], section: 'manage' },
  { label: 'إدارة المديرين', path: 'admins', icon: UserPlus, roles: ['admin'], section: 'manage' },
  { label: 'إدارة الكتب', path: 'books', icon: Library, roles: ['admin'], section: 'manage' },
  { label: 'إدارة الأحاديث', path: 'manage-hadiths', icon: BookOpen, roles: ['admin'], section: 'manage' },
  { label: 'إدارة البرنامج', path: 'cycles', icon: GraduationCap, roles: ['admin'], section: 'manage' },
  { label: 'إدارة الملفات', path: 'files', icon: FolderOpen, roles: ['admin'], section: 'manage' },
  { label: 'الإعدادات', path: 'settings', icon: Settings, roles: ['admin'], section: 'manage' },
  { label: 'إعدادات المظهر والهوية البصرية', path: 'appearance', icon: Palette, roles: ['admin'], section: 'manage' },
  { label: 'سجل العمليات', path: 'logs', icon: History, roles: ['admin'], section: 'manage' },
  { label: 'النسخ الاحتياطية', path: 'backups', icon: DatabaseBackup, roles: ['admin'], section: 'manage' },

  { label: 'الملف الشخصي', path: 'profile', icon: UserCog, roles: ['student', 'admin', 'supervisor'], section: 'account' },
];

export function getNavForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((n) => n.roles.includes(role));
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'مدير عام',
  supervisor: 'مشرف',
  student: 'طالب',
};
