import { useState } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/api';
import { useToast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/Badge';
import type { Hadith } from '@/types';
import { BookPlus, Pencil, Trash2, BookOpen } from 'lucide-react';

export function HadithsManagementPage() {
  const { notify } = useToast();
  const { data, loading, reload } = useAsync(() => api.getHadiths() as Promise<Hadith[]>, []);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Hadith | null>(null);
  const [form, setForm] = useState({ number: '', text: '', explanation: '', youtubeUrl: '', audioUrl: '', pdfUrl: '', category: '', narrator: '' });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Hadith | null>(null);

  const hadiths = data || [];

  const openAdd = () => {
    setEditing(null);
    setForm({ number: String(hadiths.length + 1), text: '', explanation: '', youtubeUrl: '', audioUrl: '', pdfUrl: '', category: '', narrator: '' });
    setOpen(true);
  };

  const openEdit = (h: Hadith) => {
    setEditing(h);
    setForm({ number: String(h.number), text: h.text, explanation: h.explanation, youtubeUrl: h.youtubeUrl, audioUrl: h.audioUrl, pdfUrl: h.pdfUrl, category: h.category, narrator: h.narrator || '' });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.text.trim() || !form.explanation.trim()) {
      notify('النص والشرح مطلوبان.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        number: Number(form.number),
        text: form.text.trim(),
        explanation: form.explanation.trim(),
        youtubeUrl: form.youtubeUrl.trim(),
        audioUrl: form.audioUrl.trim(),
        pdfUrl: form.pdfUrl.trim(),
        category: form.category.trim(),
        narrator: form.narrator.trim(),
      };
      if (editing) {
        await api.updateHadith(editing.id, payload);
        notify('تم تحديث الحديث', 'success');
      } else {
        await api.addHadith(payload);
        notify('تمت إضافة الحديث', 'success');
      }
      setOpen(false);
      reload();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'فشلت العملية.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await api.deleteHadith(deleteTarget.id);
      notify('تم حذف الحديث', 'success');
      setDeleteTarget(null);
      reload();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'فشل الحذف.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-20 text-center text-on-surface-variant">جارٍ التحميل...</div>;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="إدارة الأحاديث"
        subtitle={`${hadiths.length} حديث`}
        action={<Button icon={<BookPlus size={18} />} onClick={openAdd}>إضافة حديث</Button>}
      />

      {hadiths.length === 0 ? (
        <Card><EmptyState icon={<BookOpen size={40} />} title="لا توجد أحاديث" description="ابدأ بإضافة أحاديث البرنامج." action={<Button onClick={openAdd} icon={<BookPlus size={18} />}>إضافة حديث</Button>} /></Card>
      ) : (
        <Card padded={false}>
          <DataTable<Hadith>
            columns={[
              { key: 'number', label: '#', render: (h) => <span className="font-bold text-primary-600">{h.number}</span> },
              { key: 'text', label: 'النص', render: (h) => <span className="font-arabic line-clamp-1 max-w-md inline-block align-middle">{h.text}</span> },
              { key: 'category', label: 'التصنيف', render: (h) => <span className="text-xs bg-surface-dim px-2 py-0.5 rounded-full">{h.category || '—'}</span> },
              { key: 'narrator', label: 'الراوي', render: (h) => h.narrator || '—' },
              {
                key: 'actions', label: 'إجراءات', render: (h) => (
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(h)} className="p-1.5 rounded-lg hover:bg-surface-dim text-on-surface-variant"><Pencil size={16} /></button>
                    <button onClick={() => setDeleteTarget(h)} className="p-1.5 rounded-lg hover:bg-error-50 text-error-600"><Trash2 size={16} /></button>
                  </div>
                ),
              },
            ]}
            rows={hadiths}
            emptyMessage="لا توجد أحاديث"
          />
        </Card>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'تعديل الحديث' : 'إضافة حديث'}
        size="lg"
        actions={
          <>
            <Button variant="text" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} loading={saving}>حفظ</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="رقم الحديث" type="number" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
            <Input label="التصنيف" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="مثال: الإيمان" />
          </div>
          <Textarea label="نص الحديث" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} className="font-arabic text-base" />
          <Textarea label="الشرح" value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} />
          <Input label="الراوي" value={form.narrator} onChange={(e) => setForm({ ...form, narrator: e.target.value })} placeholder="مثال: البخاري" />
          <Input label="رابط YouTube" value={form.youtubeUrl} onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })} dir="ltr" />
          <Input label="رابط الملف الصوتي" value={form.audioUrl} onChange={(e) => setForm({ ...form, audioUrl: e.target.value })} dir="ltr" />
          <Input label="رابط صفحة PDF" value={form.pdfUrl} onChange={(e) => setForm({ ...form, pdfUrl: e.target.value })} dir="ltr" />
        </div>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="تأكيد الحذف"
        actions={
          <>
            <Button variant="text" onClick={() => setDeleteTarget(null)}>إلغاء</Button>
            <Button variant="error" onClick={handleDelete} loading={saving}>حذف</Button>
          </>
        }
      >
        <p className="text-sm text-on-surface-variant">هل تريد حذف الحديث رقم {deleteTarget?.number}؟</p>
      </Dialog>
    </div>
  );
}
