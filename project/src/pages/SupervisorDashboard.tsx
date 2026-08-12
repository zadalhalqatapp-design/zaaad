import { useCallback, useEffect, useState } from 'react';
import { listEnrollments, listListeningRecords, listTestResults } from '@/api';
import { useAuth } from '@/lib/auth';
import { LoadingState, EmptyState, ErrorState, StatusBadge } from '@/components/ui/Feedback';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Users, ClipboardCheck, Search, ChevronLeft } from 'lucide-react';
import type { Enrollment, Profile, Program, Group, ListeningRecord, TestResult } from '@/lib/types';

interface StudentRow {
  enrollment: Enrollment;
  profile: Pick<Profile, 'id' | 'full_name' | 'email' | 'phone'>;
  program: Pick<Program, 'id' | 'name'>;
  group: Pick<Group, 'id' | 'name'> | null;
}

export function SupervisorDashboard() {
  const { profile } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<StudentRow | null>(null);
  const [detail, setDetail] = useState<{ records: ListeningRecord[]; results: TestResult[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listEnrollments({ supervisorId: profile.id });
      setRows(data as StudentRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل قائمة الطلاب.');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const openStudent = async (row: StudentRow) => {
    setSelected(row);
    setDetailLoading(true);
    try {
      const [records, results] = await Promise.all([
        listListeningRecords({ enrollmentId: row.enrollment.id, limit: 10 }),
        listTestResults({ enrollmentId: row.enrollment.id, limit: 5 }),
      ]);
      setDetail({ records, results });
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'تعذر تحميل ملف الطالب.');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const filtered = rows.filter((r) => r.profile.full_name.includes(query) || r.profile.email.includes(query));

  if (loading) return <LoadingState label="جارٍ تحميل طلابك…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary-800 dark:text-primary-100">لوحة الإشراف</h1>
        <p className="text-sm text-primary-500 dark:text-primary-400">متابعة طلابك وتسجيل التسميع والاختبارات.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="عدد الطلاب" value={String(rows.length)} />
        <StatCard label="الجاهزون للاختبار" value={String(rows.filter((r) => r.enrollment.status === 'ready_for_test').length)} />
        <StatCard label="المكتملون" value={String(rows.filter((r) => r.enrollment.status === 'completed').length)} />
      </div>

      <section>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="section-title">قائمة الطلاب</h2>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث بالاسم أو البريد"
              className="input pr-9 py-2 text-sm w-48 sm:w-64"
            />
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="card divide-y divide-primary-100/60 dark:divide-primary-800/60">
            {filtered.map((r) => (
              <button key={r.enrollment.id} onClick={() => openStudent(r)} className="flex w-full items-center justify-between gap-3 p-4 text-right hover:bg-primary-50/50 dark:hover:bg-primary-800/30 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-800/60 text-primary-600 dark:text-primary-300 font-bold shrink-0">
                    {r.profile.full_name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-primary-800 dark:text-primary-100 truncate">{r.profile.full_name}</p>
                    <p className="text-xs text-primary-500 dark:text-primary-400 truncate">{r.program.name} · {r.group?.name ?? 'بدون حلقة'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-left hidden sm:block">
                    <p className="text-xs text-primary-500 dark:text-primary-400">الإنجاز</p>
                    <p className="text-sm font-bold text-primary-700 dark:text-primary-200">{r.enrollment.progress}%</p>
                  </div>
                  <StatusBadge status={r.enrollment.status} />
                  <ChevronLeft className="h-4 w-4 text-primary-400" />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="card p-6">
            <EmptyState icon={Users} title={rows.length === 0 ? 'لا يوجد طلاب موكولون إليك بعد' : 'لا نتائج مطابقة'} description={rows.length === 0 ? 'عند تسجيل طلاب في حلقتك سيظهرون هنا.' : undefined} />
          </div>
        )}
      </section>

      <Modal open={!!selected} onClose={() => { setSelected(null); setDetail(null); }} title={selected?.profile.full_name ?? ''} size="lg">
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info label="البرنامج" value={selected.program.name} />
              <Info label="الحلقة" value={selected.group?.name ?? 'بدون حلقة'} />
              <Info label="البريد" value={selected.profile.email} />
              <Info label="الهاتف" value={selected.profile.phone ?? '—'} />
              <Info label="الحالة" value={<StatusBadge status={selected.enrollment.status} />} />
              <Info label="نسبة الإنجاز" value={`${selected.enrollment.progress}%`} />
            </div>

            <div>
              <h3 className="font-bold text-primary-800 dark:text-primary-100 mb-2 flex items-center gap-2"><ClipboardCheck className="h-4 w-4" /> آخر التسميعات</h3>
              {detailLoading ? (
                <div className="skeleton h-24" />
              ) : detail && detail.records.length > 0 ? (
                <div className="space-y-2">
                  {detail.records.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg bg-primary-50/60 dark:bg-primary-800/30 px-3 py-2 text-sm">
                      <span className="text-primary-700 dark:text-primary-200">{r.operation_type === 'new_memorization' ? 'حفظ جديد' : 'مراجعة'}</span>
                      <span className="text-primary-500 dark:text-primary-400">{new Date(r.recorded_at).toLocaleDateString('ar-SA')}</span>
                      {r.score != null && <span className="font-bold text-primary-700 dark:text-primary-200">{r.score}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-primary-500 dark:text-primary-400">لا توجد سجلات تسميع.</p>
              )}
            </div>

            <div>
              <h3 className="font-bold text-primary-800 dark:text-primary-100 mb-2">آخر الاختبارات</h3>
              {detailLoading ? (
                <div className="skeleton h-20" />
              ) : detail && detail.results.length > 0 ? (
                <div className="space-y-2">
                  {detail.results.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg bg-primary-50/60 dark:bg-primary-800/30 px-3 py-2 text-sm">
                      <span className="text-primary-700 dark:text-primary-200">{(r as unknown as { test?: { title?: string } }).test?.title ?? 'اختبار'}</span>
                      <span className={`font-bold ${r.passed ? 'text-success-600 dark:text-success-300' : 'text-error-600 dark:text-error-300'}`}>{r.score} · {r.passed ? 'ناجح' : 'راسب'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-primary-500 dark:text-primary-400">لا توجد نتائج اختبارات.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-primary-500 dark:text-primary-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-primary-800 dark:text-primary-100">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-primary-50/50 dark:bg-primary-800/30 px-3 py-2">
      <p className="text-xs text-primary-500 dark:text-primary-400">{label}</p>
      <p className="text-sm font-medium text-primary-800 dark:text-primary-100 mt-0.5">{value}</p>
    </div>
  );
}
