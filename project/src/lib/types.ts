export type AppRole = 'student' | 'supervisor' | 'manager';

export type AccountStatus = 'pending' | 'approved' | 'suspended' | 'rejected';

export type RecordStatus = 'active' | 'archived';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: AppRole;
  status: AccountStatus;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Book {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  category: string | null;
  language: string;
  cover_url: string | null;
  content_type: string;
  is_public: boolean;
  status: RecordStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface BookUnit {
  id: string;
  book_id: string;
  parent_id: string | null;
  title: string;
  unit_type: string;
  unit_order: number;
  content: string | null;
  media_url: string | null;
  metadata: Record<string, unknown>;
  status: RecordStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProgramRules {
  daily_units?: number;
  passing_score?: number;
  allow_adaptive_plan?: boolean;
  [key: string]: unknown;
}

export interface Program {
  id: string;
  name: string;
  description: string | null;
  program_type: string;
  start_date: string | null;
  end_date: string | null;
  rules: ProgramRules;
  published: boolean;
  status: RecordStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProgramBook {
  id: string;
  program_id: string;
  book_id: string;
  created_at: string;
}

export interface Group {
  id: string;
  program_id: string;
  name: string;
  description: string | null;
  status: RecordStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  member_role: AppRole;
  joined_at: string;
  left_at: string | null;
  status: RecordStatus;
}

export interface Enrollment {
  id: string;
  student_id: string;
  program_id: string;
  group_id: string | null;
  supervisor_id: string | null;
  status: string;
  progress: number;
  points: number;
  started_at: string | null;
  completed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  enrollment_id: string;
  total_days: number;
  adaptive_enabled: boolean;
  status: RecordStatus;
  created_at: string;
  updated_at: string;
}

export interface DailyPlan {
  id: string;
  plan_id: string;
  day_number: number;
  planned_date: string | null;
  unit_ids: string[];
  completed_units: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ListeningRecord {
  id: string;
  enrollment_id: string;
  student_id: string;
  unit_id: string;
  supervisor_id: string | null;
  operation_type: string;
  attempt_number: number;
  score: number | null;
  errors: unknown[];
  notes: string | null;
  recorded_at: string;
  created_at: string;
}

export interface Test {
  id: string;
  program_id: string;
  title: string;
  description: string | null;
  passing_score: number;
  scheduled_at: string | null;
  status: RecordStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TestResult {
  id: string;
  test_id: string;
  enrollment_id: string;
  score: number;
  passed: boolean;
  errors: unknown[];
  notes: string | null;
  tested_at: string;
  created_by: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  kind: string;
  read_at: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
