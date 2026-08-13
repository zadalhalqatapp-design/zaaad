import { useState } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/api';
import { useToast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { DataTable } from '@/components/ui/DataTable';
import { Badge, EmptyState } from '@/components/ui/Badge';
import type { Cycle, User } from '@/types';
import { APPS_CONFIG } from '@/config';
import { GraduationCap, Play, CheckCircle, Calendar } from 'lucide-react';

export function CyclesPage() {
  const { notify } = useToast();
  const { data: cyclesData, loading, reload } = useAsync(() => api.getCycles() as Promise<Cycle[]>, []);
  const { data: studentsData } = useAsync(() => api.getStudents() as Promise<User[]>, []);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const cycles = cyclesData || [];
  const approvedStudents = (studentsData || []).filter((s) => s.status === 'approved');

  const handleStart = async () => {
    if (!name.trim()) {
      notify('يرجى إدخال اسم الدورة.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await api.startCycle(name.trim(), selectedStudents);
      notify('تم بدء دورة جديدة', 'success');
      setOpen(false);
      setName('');
      setSelectedStudents([]);
      reload();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'فشل بدء الدورة.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (cycle: Cycle) => {
    if (!confirm(`هل تريد إنهاء الدورة "${cycle.name}"؟`)) return;
    setSaving(true);
    try {
      await api.completeCycle(cycle.id);
      notify('تم إنهاء الدورة', 'success');
      reload();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'فشلت العملية.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  if (loading) return <div className="py-20 text-center text-on-surface-variant">جارٍ التحميل...</div>;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="إدارة البرنامج"
        subtitle={`${cycles.length} دورة — مدة كل دورة ${APPS_CONFIG.PROGRAM_DAYS} يومًا`}
        action={<Button icon={<Play size={18} />} onClick={() => setOpen(true)}>بدء دورة جديدة</Button>}
      />

      {cycles.length === 0 ? (
        <Card><EmptyState icon={<GraduationCap size={40} />} title="لا توجد دورات" description="ابدأ بإنشاء أول دورة لبرنامج زاد الحلقات." /></Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {cycles.map((c) => (
            <Card key={c.id}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${c.status === 'active' ? 'bg-primary-100 text-primary-600' : 'bg-surface-dim text-on-surface-variant'}`}>
                    <GraduationCap size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-on-surface">{c.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-on-surface-variant mt-0.5">
                      <Calendar size={12} /> {c.startDate}
                    </div>
                  </div>
                </div>
                <Badge variant={c.status === 'active' ? 'success' : 'neutral'}>
                  {c.status === 'active' ? 'نشطة' : 'مكتملة'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div><span className="text-on-surface-variant">الطلاب:</span> <span className="font-medium">{c.studentIds.length}</span></div>
                <div><span className="text-on-surface-variant">النهاية:</span> <span className="font-medium">{c.endDate}</span></div>
              </div>
              {c.status === 'active' && (
                <Button variant="outlined" fullWidth icon={<CheckCircle size={16} />} onClick={() => handleComplete(c)} disabled={saving}>
                  إنهاء الدورة
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="بدء دورة جديدة"
        size="lg"
        actions={
          <>
            <Button variant="text" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={handleStart} loading={saving} icon={<Play size={18} />}>بدء الدورة</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="اسم الدورة" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: دورة رمضان 2026" />
          <div>
            <label className="text-sm font-medium text-on-surface mb-2 block">الطلاب المشاركون ({selectedStudents.length})</label>
            <div className="max-h-60 overflow-y-auto border border-outline-variant rounded-xl divide-y divide-outline-variant">
              {approvedStudents.length === 0 ? (
                <p className="p-3 text-sm text-on-surface-variant text-center">لا يوجد طلاب معتمدون</p>
              ) : (
                approvedStudents.map((s) => (
                  <label key={s.id} className="flex items-center gap-3 p-3 hover:bg-surface-dim cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(s.id)}
                      onChange={() => toggleStudent(s.id)}
                      className="w-4 h-4 rounded accent-primary-600"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-on-surface">{s.name}</p>
                      <p className="text-xs text-on-surface-variant" dir="ltr">{s.email}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
            {approvedStudents.length > 0 && (
              <div className="flex gap-2 mt-2">
                <button onClick={() => setSelectedStudents(approvedStudents.map((s) => s.id))} className="text-xs text-primary-600 hover:underline">تحديد الكل</button>
                <button onClick={() => setSelectedStudents([])} className="text-xs text-on-surface-variant hover:underline">إلغاء التحديد</button>
              </div>
            )}
          </div>
        </div>
      </Dialog>
    </div>
  );
}
