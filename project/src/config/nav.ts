import type { UserRole } from '@/types';
import {
  LayoutDashboard, Users, UserCheck, BookOpen, Settings, Award,
  Bell, MessageSquare, FileText, DatabaseBackup, History, GraduationCap,
  ShieldCheck, BookMarked, CalendarDays, FolderOpen, UserCog, UserPlus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  roles: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'لوحة التحكم', path: 'dashboard', icon: LayoutDashboard, roles: ['admin', 'supervisor', 'student'] },

  // Student
  { label: 'المقرر اليومي', path: 'daily', icon: CalendarDays, roles: ['student'] },
  { label: 'الأحاديث', path: 'hadiths', icon: BookOpen, roles: ['student'] },
  { label: 'إنجازي', path: 'progress', icon: BookMarked, roles: ['student'] },
  { label: 'الشهادات', path: 'certificates', icon: Award, roles: ['student'] },
  { label: 'مراسلتنا', path: 'messages', icon: MessageSquare, roles: ['student'] },
  { label: 'الإشعارات', path: 'notifications', icon: Bell, roles: ['student'] },
  { label: 'الملف الشخصي', path: 'profile', icon: UserCog, roles: ['student'] },

  // Supervisor + Admin
  { label: 'متابعة الطلاب', path: 'students', icon: Users, roles: ['admin', 'supervisor'] },
  { label: 'طلبات التسجيل', path: 'approvals', icon: UserCheck, roles: ['admin', 'supervisor'] },
  { label: 'إنجاز الطلاب', path: 'student-progress', icon: BookMarked, roles: ['admin', 'supervisor'] },
  { label: 'إصدار الشهادات', path: 'issue-certificates', icon: Award, roles: ['admin', 'supervisor'] },
  { label: 'الرسائل', path: 'messages', icon: MessageSquare, roles: ['admin', 'supervisor'] },
  { label: 'الإشعارات', path: 'notifications', icon: Bell, roles: ['admin', 'supervisor'] },
  { label: 'الملف الشخصي', path: 'profile', icon: UserCog, roles: ['admin', 'supervisor'] },

  // Admin
  { label: 'إدارة المشرفين', path: 'supervisors', icon: ShieldCheck, roles: ['admin'] },
  { label: 'إدارة المديرين', path: 'admins', icon: UserPlus, roles: ['admin'] },
  { label: 'إدارة الأحاديث', path: 'manage-hadiths', icon: BookOpen, roles: ['admin'] },
  { label: 'إدارة البرنامج', path: 'cycles', icon: GraduationCap, roles: ['admin'] },
  { label: 'إدارة الملفات', path: 'files', icon: FolderOpen, roles: ['admin'] },
  { label: 'الإعدادات', path: 'settings', icon: Settings, roles: ['admin'] },
  { label: 'سجل العمليات', path: 'logs', icon: History, roles: ['admin'] },
  { label: 'النسخ الاحتياطية', path: 'backups', icon: DatabaseBackup, roles: ['admin'] },
];

export function getNavForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((n) => n.roles.includes(role));
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'مدير عام',
  supervisor: 'مشرف',
  student: 'طالب',
};
