import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge, EmptyState } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/Progress';
import { Input, Select } from '@/components/ui/Input';
import { bookStats } from '@/lib/books';
import { AchievementApproval, GRADE_PRESETS } from '@/components/books/AchievementApproval';
import type { ProgressRecord, Hadith, Book, RosterRow } from '@/types';
import { APPS_CONFIG } from '@/config';
import { Search, BookMarked, Headphones, Users, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/components/ui/Toast';

export function StudentProgressPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const [chosenBook, setChosenBook] = useState('');
  const { data, loading, reload } = useAsync(() => api.getAchievementsRoster(chosenBook || undefined), [chosenBook]);
  const [search, setSearch] = useState('');
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [detail, setDetail] = useState<RosterRow | null>(null);

  const rows = data?.rows || [];
  const book = data?.book || null;
  const books = data?.books || [];
  const filtered = rows.filter((r) => r.name.includes(search.trim()) || r.email.includes(search.trim()));
  const isAdmin = user?.role === 'admin';

  const gradeOf = (r: RosterRow) => grades[r.studentId] ?? r.grade;
  const isDirty = (r: RosterRow) => gradeOf(r).trim() !== '' && gradeOf(r).trim() !== r.grade;

  const saveOne = async (r: RosterRow, quiet = false) => {
    const g = gradeOf(r).trim();
    if (!g) {
      notify('اكتب تقدير الدرجة أولًا.', 'warning');
      return false;
    }
    setSaving((s) => ({ ...s, [r.studentId]: true }));
    try {
      await api.approveAchievement(r.studentId, book?.id, g, r.notes);
      if (!quiet) notify(`تم اعتماد ${r.name}: ${g}`, 'success');
      return true;
    } catch (err) {
      notify(err instanceof Error ? err.message : 'فشل الاعتماد.', 'error');
      return false;
    } finally {
      setSaving((s) => ({ ...s, [r.studentId]: false }));
    }
  };

  const handleSave = async (r: RosterRow) => {
    if (await saveOne(r)) {
      setGrades((s) => {
        const next = { ...s };
        delete next[r.studentId];
        return next;
      });
      reload();
    }
  };

  // دوال ثابتة المرجع للصفوف المحفوظة بـ memo: الكتابة في خانة تقدير طالب لا تعيد رسم بقية الصفوف
  const handleSaveRef = useRef(handleSave);
  useEffect(() => {
    handleSaveRef.current = handleSave;
  });
  const saveRow = useCallback((r: RosterRow) => handleSaveRef.current(r), []);
  const setGrade = useCallback(
    (id: string, value: string) => setGrades((s) => ({ ...s, [id]: value })),
    [],
  );

  const dirtyRows = rows.filter(isDirty);
  const handleSaveAll = async () => {
    let done = 0;
    for (const r of dirtyRows) {
      if (await saveOne(r, true)) done++;
    }
    if (done > 0) notify(`تم حفظ ${done} من ${dirtyRows.length} تقدير`, 'success');
    setGrades({});
    reload();
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="إنجاز الطلاب"
        subtitle={isAdmin ? 'كشف بجميع الطلاب' : 'كشف بطلاب دورتك'}
        action={dirtyRows.length > 0 ? <Button icon={<BadgeCheck size={18} />} onClick={handleSaveAll}>حفظ كل التقديرات ({dirtyRows.length})</Button> : undefined}
      />

      {books.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {books.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => { setChosenBook(b.id); setGrades({}); }}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                book?.id === b.id ? 'border-primary-600 bg-primary-600 text-white' : 'border-outline-variant bg-surface hover:border-primary-300'
              }`}
            >
              {b.title}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-on-surface-variant">جارٍ التحميل...</div>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users size={40} />}
            title="لا يوجد طلاب معتمدون بعد"
            description={!isAdmin ? 'تظهر هنا طلاب الدورة المخصَّصة لك فقط.' : undefined}
          />
        </Card>
      ) : (
        <>
          <div className="mb-4">
            <Input placeholder="ابحث عن طالب..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search size={18} />} />
          </div>
          <Card padded={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-dim text-on-surface-variant">
                    <th className="px-4 py-3 text-right font-semibold">#</th>
                    <th className="px-4 py-3 text-right font-semibold">اسم الطالب</th>
                    {isAdmin && <th className="px-4 py-3 text-right font-semibold">الدورة</th>}
                    <th className="px-4 py-3 text-right font-semibold">نسبة الإنجاز</th>
                    <th className="px-4 py-3 text-right font-semibold">التقدير</th>
                    <th className="px-4 py-3 text-right font-semibold">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <RosterTableRow
                      key={r.studentId}
                      row={r}
                      index={i}
                      isAdmin={isAdmin}
                      approvalSupported={!!data?.approvalSupported}
                      grade={gradeOf(r)}
                      dirty={isDirty(r)}
                      saving={!!saving[r.studentId]}
                      onGrade={setGrade}
                      onSave={saveRow}
                      onOpen={setDetail}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <datalist id="grade-presets">
              {GRADE_PRESETS.map((g) => <option key={g} value={g} />)}
            </datalist>
          </Card>
          <p className="mt-3 text-xs text-on-surface-variant">
            النسبة = الحفظ 50% + السماع (صوت أو فيديو) 50%. اكتب التقدير ثم «اعتماد» (أو «حفظ كل التقديرات»). اضغط اسم الطالب لعرض تفاصيل إنجازه.
          </p>
        </>
      )}

      <Dialog open={!!detail} onClose={() => { setDetail(null); reload(); }} title={detail ? `إنجاز ${detail.name}` : ''} size="lg">
        {detail && <StudentProgressDetail studentId={detail.studentId} studentName={detail.name} />}
      </Dialog>
    </div>
  );
}

interface RosterTableRowProps {
  row: RosterRow;
  index: number;
  isAdmin: boolean;
  approvalSupported: boolean;
  grade: string;
  dirty: boolean;
  saving: boolean;
  onGrade: (id: string, value: string) => void;
  onSave: (row: RosterRow) => void;
  onOpen: (row: RosterRow) => void;
}

const RosterTableRow = memo(function RosterTableRow({
  row: r, index, isAdmin, approvalSupported, grade, dirty, saving, onGrade, onSave, onOpen,
}: RosterTableRowProps) {
  return (
    <tr className="border-b border-outline-variant last:border-0 hover:bg-surface-dim/50">
      <td className="px-4 py-2.5 text-on-surface-variant">{index + 1}</td>
      <td className="px-4 py-2.5">
        <button type="button" onClick={() => onOpen(r)} className="font-medium text-on-surface hover:text-primary-700 hover:underline">
          {r.name}
        </button>
        {r.certIssued && <span className="ms-2"><Badge variant="success">صدرت شهادته</Badge></span>}
      </td>
      {isAdmin && <td className="px-4 py-2.5 text-on-surface-variant">{r.cycleName || '—'}</td>}
      <td className="min-w-[160px] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex-1"><ProgressBar value={r.progressPercent} color={r.progressPercent >= 100 ? 'success' : 'primary'} /></div>
          <span className="w-10 text-left font-semibold text-on-surface">{r.progressPercent}%</span>
        </div>
      </td>
      <td className="px-4 py-2.5">
        {approvalSupported ? (
          <input
            list="grade-presets"
            value={grade}
            maxLength={40}
            onChange={(e) => onGrade(r.studentId, e.target.value)}
            placeholder="اكتب التقدير"
            className="w-36 rounded-lg border border-outline-variant bg-surface px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />
        ) : (
          <span className="text-xs text-on-surface-variant">يتطلب تحديث الخادم</span>
        )}
      </td>
      <td className="px-4 py-2.5">
        {approvalSupported && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant={dirty ? 'filled' : 'outlined'} disabled={!dirty} loading={saving} onClick={() => onSave(r)}>
              {r.approved ? 'تحديث' : 'اعتماد'}
            </Button>
            {r.approved && !dirty && <Badge variant="success">معتمد</Badge>}
          </div>
        )}
      </td>
    </tr>
  );
});

function StudentProgressDetail({ studentId, studentName }: { studentId: string; studentName: string }) {
  const { notify } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const { data: progressData, loading: progressLoading, reload: reloadProgress } = useAsync(
    () => api.getProgress(studentId) as Promise<ProgressRecord[]>,
    [studentId],
  );
  // كتب الطالب المعيَّنة (وإن لم توجد تعيينات — أو خادم قديم — نعرض كل الكتب)
  const { data: booksData, loading: booksLoading } = useAsync(async () => {
    try {
      const [all, assigned] = await Promise.all([api.getBooks(), api.getBookAssignments(studentId)]);
      const mine = new Set(assigned.map((a) => a.bookId));
      const list = all.filter((b) => mine.has(b.id));
      return list.length > 0 ? list : all;
    } catch {
      return [] as Book[];
    }
  }, [studentId]);
  const books = booksData || [];
  const [chosen, setChosen] = useState('');
  const bookId = chosen && books.some((b) => b.id === chosen) ? chosen : books[0]?.id;
  const { data: hadithsData, loading: hadithsLoading } = useAsync(
    () => (booksLoading ? Promise.resolve([] as Hadith[]) : (api.getHadiths(bookId) as Promise<Hadith[]>)),
    [booksLoading, bookId],
  );
  const loading = progressLoading || booksLoading || hadithsLoading;

  const progress = progressData || [];
  const hadiths = hadithsData || [];
  const stats = bookStats(hadiths, progress);
  const total = stats.total || APPS_CONFIG.HADITHS_COUNT;
  const { memorized, mediaDone, completed, overall } = stats;

  const progressOf = (hid: string) => progress.find((p) => p.hadithId === hid);
  const toggle = async (h: Hadith, field: 'memorized' | 'media', value: boolean) => {
    setBusy(h.id + field);
    try {
      await api.setStudentProgress(studentId, h.id, field, value);
      await reloadProgress();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'فشل التعديل.', 'error');
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <Card><div className="py-10 text-center text-on-surface-variant">جارٍ التحميل...</div></Card>;

  return (
    <Card>
      <CardHeader title={studentName} subtitle="تفاصيل الإنجاز" />
      {books.length > 1 && (
        <div className="mb-4 max-w-xs">
          <Select label="الكتاب" value={bookId || ''} onChange={(e) => setChosen(e.target.value)}>
            {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
          </Select>
        </div>
      )}
      {books.length === 1 && <p className="mb-4 text-sm text-on-surface-variant">الكتاب: {books[0].title}</p>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Stat label="الأحاديث المكتملة" value={`${completed}/${total}`} color="success" />
        <Stat label="نسبة الإنجاز" value={`${Math.round(overall)}%`} color="primary" />
        <Stat label="الحفظ" value={`${memorized}`} color="info" />
        <Stat label="السماع" value={`${mediaDone}`} color="warning" />
      </div>
      <div className="space-y-4">
        <ProgressRow icon={<BookMarked size={18} />} label="الحفظ (50%)" count={memorized} total={total} weight={50} />
        <ProgressRow icon={<Headphones size={18} />} label="السماع — صوت أو فيديو (50%)" count={mediaDone} total={total} weight={50} />
      </div>
      <div className="mt-5 pt-5 border-t border-outline-variant">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-on-surface">الإنجاز الإجمالي</span>
          <Badge variant={overall >= 100 ? 'success' : overall >= 50 ? 'warning' : 'error'}>{Math.round(overall)}%</Badge>
        </div>
        <ProgressBar value={overall} color={overall >= 100 ? 'success' : 'primary'} />
      </div>

      <div className="mt-5 border-t border-outline-variant pt-5">
        <h4 className="mb-1 font-semibold text-on-surface">تعديل الإنجاز لكل حديث</h4>
        <p className="mb-3 text-xs text-on-surface-variant">سجّل الحفظ أو السماع نيابةً عن الطالب (مثلًا حفظ شفهيًا)، وتُعاد النسبة فورًا.</p>
        <div className="max-h-80 divide-y divide-outline-variant overflow-y-auto rounded-xl border border-outline-variant">
          {hadiths.map((h) => {
            const p = progressOf(h.id);
            return (
              <div key={h.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="w-7 shrink-0 font-bold text-primary-600">{h.number}</span>
                <span className="flex-1 truncate font-arabic">{h.text}</span>
                <label className="flex shrink-0 cursor-pointer items-center gap-1.5">
                  <input type="checkbox" className="accent-primary-600" checked={!!p?.memorized} disabled={busy === h.id + 'memorized'} onChange={(e) => toggle(h, 'memorized', e.target.checked)} />
                  حفظ
                </label>
                <label className="flex shrink-0 cursor-pointer items-center gap-1.5">
                  <input type="checkbox" className="accent-primary-600" checked={!!(p?.listened || p?.watched)} disabled={busy === h.id + 'media'} onChange={(e) => toggle(h, 'media', e.target.checked)} />
                  سماع
                </label>
              </div>
            );
          })}
        </div>
      </div>

      <AchievementApproval
        studentId={studentId}
        bookId={bookId}
        bookTitle={books.find((b) => b.id === bookId)?.title}
        overall={overall}
      />
    </Card>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: 'success' | 'primary' | 'info' | 'warning' }) {
  const colors = { success: 'text-success-600', primary: 'text-primary-600', info: 'text-accent-600', warning: 'text-warning-600' };
  return (
    <div className="bg-surface-dim rounded-xl p-3 text-center">
      <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
      <p className="text-xs text-on-surface-variant mt-1">{label}</p>
    </div>
  );
}

function ProgressRow({ icon, label, count, total, weight }: { icon: React.ReactNode; label: string; count: number; total: number; weight: number }) {
  const pct = total ? (count / total) * weight : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="flex items-center gap-2 font-medium text-on-surface">{icon} {label}</span>
        <span className="text-on-surface-variant">{count}/{total}</span>
      </div>
      <ProgressBar value={pct * (100 / weight)} />
    </div>
  );
}
