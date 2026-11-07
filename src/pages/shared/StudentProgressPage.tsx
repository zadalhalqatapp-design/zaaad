import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { useIsWide } from '@/hooks/useIsWide';
import { api } from '@/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge, EmptyState } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/Progress';
import { Input, Select } from '@/components/ui/Input';
import { bookStats } from '@/lib/books';
import { AchievementApproval, GRADE_PRESETS } from '@/components/books/AchievementApproval';
import type { ProgressRecord, Hadith, Book, RosterRow, BulkApproveResult } from '@/types';
import { APPS_CONFIG } from '@/config';
import { Search, BookMarked, Headphones, Users, BadgeCheck, CheckCheck, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/components/ui/Toast';

export function StudentProgressPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const wide = useIsWide();
  const [chosenBook, setChosenBook] = useState('');
  const { data, loading, reload } = useAsync(() => api.getAchievementsRoster(chosenBook || undefined), [chosenBook]);
  const [search, setSearch] = useState('');
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkGrade, setBulkGrade] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkReport, setBulkReport] = useState<{ result: BulkApproveResult; names: Record<string, string> } | null>(null);
  const [detail, setDetail] = useState<RosterRow | null>(null);

  const rows = data?.rows || [];
  const book = data?.book || null;
  const books = data?.books || [];
  const filtered = rows.filter((r) => r.name.includes(search.trim()) || r.email.includes(search.trim()));
  const isAdmin = user?.role === 'admin';

  const gradeOf = (r: RosterRow) => grades[r.studentId] ?? r.grade;
  const isDirty = (r: RosterRow) => gradeOf(r).trim() !== '' && gradeOf(r).trim() !== r.grade;
  const selectedRows = rows.filter((r) => selected[r.studentId]);

  /** اعتماد جماعي: طلب واحد للخادم (الذي يتحقق من الصلاحية لكل طالب)، مع رجوع للطريقة القديمة إن لم يُحدَّث الخادم. */
  const runBulk = async (targets: RosterRow[], gradeFor: (r: RosterRow) => string) => {
    const items = targets
      .map((r) => ({ studentId: r.studentId, grade: gradeFor(r).trim(), notes: r.notes }))
      .filter((it) => it.grade);
    if (items.length === 0) {
      notify('اكتب تقدير الدرجة أولًا.', 'warning');
      return;
    }
    setBulkBusy(true);
    const names = Object.fromEntries(rows.map((r) => [r.studentId, r.name]));
    try {
      let result: BulkApproveResult;
      try {
        result = await api.approveAchievementsBulk(book?.id, items);
      } catch (err) {
        if (!(err instanceof Error) || !err.message.includes('غير معروفة')) throw err;
        // خادم قديم بلا الاعتماد الجماعي: نعتمد واحدًا واحدًا
        const results: BulkApproveResult['results'] = [];
        for (const it of items) {
          try {
            await api.approveAchievement(it.studentId, book?.id, it.grade, it.notes);
            results.push({ studentId: it.studentId, ok: true });
          } catch (e) {
            results.push({ studentId: it.studentId, ok: false, error: e instanceof Error ? e.message : 'فشل الاعتماد.' });
          }
        }
        const approved = results.filter((x) => x.ok).length;
        result = { success: approved > 0, total: items.length, approved, failed: items.length - approved, results };
      }
      if (result.failed === 0) notify(`تم اعتماد ${result.approved} طالب بنجاح`, 'success');
      else {
        notify(`اعتُمد ${result.approved} وتعذّر ${result.failed} — راجع التفاصيل`, result.approved > 0 ? 'warning' : 'error');
        setBulkReport({ result, names });
      }
      // نُفرغ تقديرات من نجح اعتمادهم فقط؛ الفاشلون يبقون محدّدين للمحاولة مجددًا
      const okIds = new Set(result.results.filter((x) => x.ok).map((x) => x.studentId));
      setGrades((s) => Object.fromEntries(Object.entries(s).filter(([id]) => !okIds.has(id))));
      setSelected((s) => Object.fromEntries(Object.entries(s).filter(([id]) => !okIds.has(id))));
      reload();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'فشل الاعتماد الجماعي.', 'error');
    } finally {
      setBulkBusy(false);
    }
  };

  const saveOne = async (r: RosterRow) => {
    const g = gradeOf(r).trim();
    if (!g) {
      notify('اكتب تقدير الدرجة أولًا.', 'warning');
      return false;
    }
    setSaving((s) => ({ ...s, [r.studentId]: true }));
    try {
      await api.approveAchievement(r.studentId, book?.id, g, r.notes);
      notify(`تم اعتماد ${r.name}: ${g}`, 'success');
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
  const toggleSelected = useCallback(
    (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] })),
    [],
  );

  const dirtyRows = rows.filter(isDirty);
  const allFilteredSelected = filtered.length > 0 && filtered.every((r) => selected[r.studentId]);
  const toggleAll = () =>
    setSelected((s) => {
      const next = { ...s };
      for (const r of filtered) next[r.studentId] = !allFilteredSelected;
      return next;
    });

  const applyBulkGradeToSelected = () => {
    const g = bulkGrade.trim();
    if (!g) {
      notify('اكتب التقدير الموحّد أولًا.', 'warning');
      return;
    }
    setGrades((s) => {
      const next = { ...s };
      for (const r of selectedRows) next[r.studentId] = g;
      return next;
    });
  };

  const approvalSupported = !!data?.approvalSupported;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="إنجاز الطلاب"
        subtitle={isAdmin ? 'كشف بجميع الطلاب' : 'كشف بطلاب دورتك'}
        action={
          dirtyRows.length > 0 ? (
            <Button icon={<BadgeCheck size={18} />} loading={bulkBusy} onClick={() => runBulk(dirtyRows, gradeOf)}>
              اعتماد كل التقديرات المكتوبة ({dirtyRows.length})
            </Button>
          ) : undefined
        }
      />

      {books.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {books.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => { setChosenBook(b.id); setGrades({}); setSelected({}); }}
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
        <PageSkeleton rows={6} />
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

          {approvalSupported && selectedRows.length > 0 && (
            <div className="sticky top-16 z-20 mb-4 flex flex-col gap-3 rounded-2xl border border-primary-200 bg-primary-50 p-3 shadow-sm sm:flex-row sm:items-center">
              <p className="shrink-0 text-sm font-semibold text-primary-800">
                <CheckCheck size={16} className="me-1 inline" /> محدَّد: {selectedRows.length}
              </p>
              <input
                list="grade-presets"
                value={bulkGrade}
                maxLength={40}
                onChange={(e) => setBulkGrade(e.target.value)}
                placeholder="تقدير موحّد للمحدَّدين"
                className="min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outlined" onClick={applyBulkGradeToSelected}>تطبيق التقدير</Button>
                <Button
                  size="sm"
                  icon={<BadgeCheck size={16} />}
                  loading={bulkBusy}
                  onClick={() => runBulk(selectedRows, (r) => (bulkGrade.trim() && !grades[r.studentId] ? bulkGrade : gradeOf(r)))}
                >
                  اعتماد المحدَّدين
                </Button>
                <Button size="sm" variant="text" onClick={() => setSelected({})}>إلغاء التحديد</Button>
              </div>
            </div>
          )}

          {wide ? (
            <Card padded={false}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-dim text-on-surface-variant">
                      {approvalSupported && (
                        <th className="w-10 px-4 py-3">
                          <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} aria-label="تحديد الكل" className="h-4 w-4 accent-primary-600" />
                        </th>
                      )}
                      <th className="px-4 py-3 text-start font-semibold">#</th>
                      <th className="px-4 py-3 text-start font-semibold">اسم الطالب</th>
                      {isAdmin && <th className="px-4 py-3 text-start font-semibold">الدورة</th>}
                      <th className="px-4 py-3 text-start font-semibold">نسبة الإنجاز</th>
                      <th className="px-4 py-3 text-start font-semibold">التقدير</th>
                      <th className="px-4 py-3 text-start font-semibold">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => (
                      <RosterItem
                        key={r.studentId}
                        layout="row"
                        row={r}
                        index={i}
                        isAdmin={isAdmin}
                        approvalSupported={approvalSupported}
                        grade={gradeOf(r)}
                        dirty={isDirty(r)}
                        saving={!!saving[r.studentId]}
                        checked={!!selected[r.studentId]}
                        onToggle={toggleSelected}
                        onGrade={setGrade}
                        onSave={saveRow}
                        onOpen={setDetail}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {approvalSupported && (
                <label className="flex items-center gap-2 px-1 text-sm text-on-surface-variant">
                  <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} className="h-4 w-4 accent-primary-600" /> تحديد الكل
                </label>
              )}
              {filtered.map((r, i) => (
                <RosterItem
                  key={r.studentId}
                  layout="card"
                  row={r}
                  index={i}
                  isAdmin={isAdmin}
                  approvalSupported={approvalSupported}
                  grade={gradeOf(r)}
                  dirty={isDirty(r)}
                  saving={!!saving[r.studentId]}
                  checked={!!selected[r.studentId]}
                  onToggle={toggleSelected}
                  onGrade={setGrade}
                  onSave={saveRow}
                  onOpen={setDetail}
                />
              ))}
            </div>
          )}
          <datalist id="grade-presets">
            {GRADE_PRESETS.map((g) => <option key={g} value={g} />)}
          </datalist>
          <p className="mt-3 text-xs text-on-surface-variant">
            النسبة = الحفظ 50% + السماع (صوت أو فيديو) 50%. اكتب التقدير ثم «اعتماد»، أو حدّد عدة طلاب واعتمدهم دفعة واحدة. اضغط اسم الطالب لعرض تفاصيل إنجازه.
          </p>
        </>
      )}

      <Dialog open={!!detail} onClose={() => { setDetail(null); reload(); }} title={detail ? `إنجاز ${detail.name}` : ''} size="lg">
        {detail && <StudentProgressDetail studentId={detail.studentId} studentName={detail.name} />}
      </Dialog>

      <Dialog
        open={!!bulkReport}
        onClose={() => setBulkReport(null)}
        title="نتيجة الاعتماد الجماعي"
        actions={<Button onClick={() => setBulkReport(null)}>حسنًا</Button>}
      >
        {bulkReport && (
          <div className="space-y-3 text-sm">
            <p>
              <span className="font-semibold text-success-700">نجح {bulkReport.result.approved}</span>
              {' · '}
              <span className="font-semibold text-error-700">تعذّر {bulkReport.result.failed}</span>
              {' من '}{bulkReport.result.total}
            </p>
            <ul className="divide-y divide-outline-variant rounded-xl border border-outline-variant">
              {bulkReport.result.results.filter((x) => !x.ok).map((x) => (
                <li key={x.studentId} className="flex items-start gap-2 p-3">
                  <XCircle size={16} className="mt-0.5 shrink-0 text-error-600" />
                  <div>
                    <p className="font-medium text-on-surface">{bulkReport.names[x.studentId] || x.studentId}</p>
                    <p className="text-xs text-on-surface-variant">{x.error}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Dialog>
    </div>
  );
}

interface RosterItemProps {
  layout: 'row' | 'card';
  row: RosterRow;
  index: number;
  isAdmin: boolean;
  approvalSupported: boolean;
  grade: string;
  dirty: boolean;
  saving: boolean;
  checked: boolean;
  onToggle: (id: string) => void;
  onGrade: (id: string, value: string) => void;
  onSave: (row: RosterRow) => void;
  onOpen: (row: RosterRow) => void;
}

const RosterItem = memo(function RosterItem({
  layout, row: r, index, isAdmin, approvalSupported, grade, dirty, saving, checked, onToggle, onGrade, onSave, onOpen,
}: RosterItemProps) {
  const gradeInput = approvalSupported ? (
    <input
      list="grade-presets"
      value={grade}
      maxLength={40}
      onChange={(e) => onGrade(r.studentId, e.target.value)}
      placeholder="اكتب التقدير"
      aria-label={`تقدير ${r.name}`}
      className="w-full min-w-0 rounded-lg border border-outline-variant bg-surface px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 sm:w-36"
    />
  ) : (
    <span className="text-xs text-on-surface-variant">يتطلب تحديث الخادم</span>
  );
  const action = approvalSupported && (
    <div className="flex items-center gap-2">
      <Button size="sm" variant={dirty ? 'filled' : 'outlined'} disabled={!dirty} loading={saving} onClick={() => onSave(r)}>
        {r.approved ? 'تحديث' : 'اعتماد'}
      </Button>
      {r.approved && !dirty && <Badge variant="success">معتمد</Badge>}
    </div>
  );
  const nameBtn = (
    <button type="button" onClick={() => onOpen(r)} className="font-medium text-on-surface hover:text-primary-700 hover:underline">
      {r.name}
    </button>
  );

  if (layout === 'card') {
    return (
      <div className={`rounded-2xl border bg-surface p-4 shadow-sm ${checked ? 'border-primary-400 ring-1 ring-primary-300' : 'border-outline-variant'}`}>
        <div className="mb-2 flex items-start gap-3">
          {approvalSupported && (
            <input type="checkbox" checked={checked} onChange={() => onToggle(r.studentId)} aria-label={`تحديد ${r.name}`} className="mt-1 h-5 w-5 shrink-0 accent-primary-600" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {nameBtn}
              {r.certIssued && <Badge variant="success">صدرت شهادته</Badge>}
            </div>
            {isAdmin && r.cycleName && <p className="text-xs text-on-surface-variant">{r.cycleName}</p>}
          </div>
          <span className="shrink-0 font-bold text-primary-700">{r.progressPercent}%</span>
        </div>
        <ProgressBar value={r.progressPercent} color={r.progressPercent >= 100 ? 'success' : 'primary'} />
        <div className="mt-3 flex items-center gap-2">
          <div className="min-w-0 flex-1">{gradeInput}</div>
          {action}
        </div>
      </div>
    );
  }

  return (
    <tr className={`border-b border-outline-variant last:border-0 hover:bg-surface-dim/50 ${checked ? 'bg-primary-50/50' : ''}`}>
      {approvalSupported && (
        <td className="px-4 py-2.5">
          <input type="checkbox" checked={checked} onChange={() => onToggle(r.studentId)} aria-label={`تحديد ${r.name}`} className="h-4 w-4 accent-primary-600" />
        </td>
      )}
      <td className="px-4 py-2.5 text-on-surface-variant">{index + 1}</td>
      <td className="px-4 py-2.5">
        {nameBtn}
        {r.certIssued && <span className="ms-2"><Badge variant="success">صدرت شهادته</Badge></span>}
      </td>
      {isAdmin && <td className="px-4 py-2.5 text-on-surface-variant">{r.cycleName || '—'}</td>}
      <td className="min-w-[160px] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex-1"><ProgressBar value={r.progressPercent} color={r.progressPercent >= 100 ? 'success' : 'primary'} /></div>
          <span className="w-10 text-end font-semibold text-on-surface">{r.progressPercent}%</span>
        </div>
      </td>
      <td className="px-4 py-2.5">{gradeInput}</td>
      <td className="px-4 py-2.5">{action}</td>
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
