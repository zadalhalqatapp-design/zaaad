import { useAsync } from '@/hooks/useAsync';
import { api } from '@/api';
import { useToast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { DataTable } from '@/components/ui/DataTable';
import type { AppSettings, OperationLog, Backup } from '@/types';
import { useEffect, useState } from 'react';
import { Save, Upload, DatabaseBackup, History, FolderOpen } from 'lucide-react';

export function SettingsPage() {
  const { notify } = useToast();
  const { data, loading, reload } = useAsync(() => api.getSettings() as unknown as Promise<AppSettings>, []);

  const [form, setForm] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await api.updateSettings(form as unknown as Record<string, unknown>);
      notify('تم حفظ الإعدادات', 'success');
      reload();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'فشل الحفظ.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) return <div className="py-20 text-center text-on-surface-variant">جارٍ التحميل...</div>;

  return (
    <div className="animate-fade-in">
      <PageHeader title="الإعدادات" subtitle="إعدادات النظام والهوية البصرية" />

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="الهوية البصرية" subtitle="اسم الموقع والشعار والألوان" />
          <div className="space-y-4">
            <Input label="اسم الموقع" value={form.appName} onChange={(e) => setForm({ ...form, appName: e.target.value })} />
            <Input label="رابط الشعار" value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} dir="ltr" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-on-surface mb-1.5 block">اللون الأساسي</label>
                <input type="color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} className="w-full h-11 rounded-xl border border-outline-variant cursor-pointer" />
              </div>
              <div>
                <label className="text-sm font-medium text-on-surface mb-1.5 block">اللون الثانوي</label>
                <input type="color" value={form.secondaryColor} onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })} className="w-full h-11 rounded-xl border border-outline-variant cursor-pointer" />
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="معلومات التواصل" subtitle="البريد والجوال ونص التعريف" />
          <div className="space-y-4">
            <Input label="بريد التواصل" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} dir="ltr" />
            <Input label="جوال التواصل" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} dir="ltr" />
            <Textarea label="نبذة عن البرنامج" value={form.aboutText} onChange={(e) => setForm({ ...form, aboutText: e.target.value })} />
          </div>
        </Card>

        <Card>
          <CardHeader title="نسب إكمال الوسائط" subtitle="النسبة المطلوبة لاعتبار المادة مكتملة تلقائيًا للطالب" />
          <div className="grid grid-cols-3 gap-4">
            <Input
              type="number" min={1} max={100} label="نسبة إكمال الفيديو %"
              value={form.videoCompletionThreshold}
              onChange={(e) => setForm({ ...form, videoCompletionThreshold: Number(e.target.value) })}
            />
            <Input
              type="number" min={1} max={100} label="نسبة إكمال الصوت %"
              value={form.audioCompletionThreshold}
              onChange={(e) => setForm({ ...form, audioCompletionThreshold: Number(e.target.value) })}
            />
            <Input
              type="number" min={1} max={100} label="نسبة إكمال PDF %"
              value={form.pdfCompletionThreshold}
              onChange={(e) => setForm({ ...form, pdfCompletionThreshold: Number(e.target.value) })}
            />
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Button onClick={handleSave} loading={saving} icon={<Save size={18} />} size="lg">حفظ الإعدادات</Button>
      </div>
    </div>
  );
}

export function OperationLogPage() {
  const { data, loading } = useAsync(() => api.getOperationLog() as unknown as Promise<OperationLog[]>, []);

  if (loading) return <div className="py-20 text-center text-on-surface-variant">جارٍ التحميل...</div>;
  const logs = data || [];

  return (
    <div className="animate-fade-in">
      <PageHeader title="سجل العمليات" subtitle={`${logs.length} عملية مسجّلة`} />
      <Card padded={false}>
        <DataTable<OperationLog>
          columns={[
            { key: 'timestamp', label: 'التاريخ والوقت' },
            { key: 'userName', label: 'المستخدم', render: (l) => <span className="font-medium">{l.userName}</span> },
            { key: 'userRole', label: 'الدور', render: (l) => l.userRole === 'admin' ? 'مدير' : l.userRole === 'supervisor' ? 'مشرف' : 'طالب' },
            { key: 'operation', label: 'العملية' },
            { key: 'details', label: 'التفاصيل', render: (l) => <span className="text-xs text-on-surface-variant">{l.details}</span> },
          ]}
          rows={logs}
          emptyMessage="لا توجد عمليات مسجّلة"
        />
      </Card>
    </div>
  );
}

export function BackupsPage() {
  const { notify } = useToast();
  
  const { data, loading, reload } = useAsync(() => api.getBackups() as unknown as Promise<Backup[]>, []);
  const [name, setName] = useState('');
  const [acting, setActing] = useState(false);

  const handleBackup = async () => {
    setActing(true);
    try {
      const backupName = name.trim() || `نسخة ${new Date().toLocaleString('ar')}`;
      await api.backupDatabase(backupName);
      notify('تم إنشاء نسخة احتياطية', 'success');
      setName('');
      reload();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'فشلت العملية.', 'error');
    } finally {
      setActing(false);
    }
  };

  const handleRestore = async (backup: Backup) => {
    if (!confirm(`هل تريد استعادة النسخة "${backup.name}"؟ سيتم استبدال البيانات الحالية.`)) return;
    setActing(true);
    try {
      await api.restoreBackup(backup.id);
      notify('تمت استعادة النسخة', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'فشلت الاستعادة.', 'error');
    } finally {
      setActing(false);
    }
  };

  if (loading) return <div className="py-20 text-center text-on-surface-variant">جارٍ التحميل...</div>;
  const backups = data || [];

  return (
    <div className="animate-fade-in">
      <PageHeader title="النسخ الاحتياطية" subtitle="إنشاء واستعادة نسخ من قاعدة البيانات" />

      <Card className="mb-6">
        <CardHeader title="إنشاء نسخة جديدة" />
        <div className="flex flex-col sm:flex-row gap-3">
          <Input placeholder="اسم النسخة (اختياري)" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
          <Button onClick={handleBackup} loading={acting} icon={<DatabaseBackup size={18} />}>إنشاء نسخة</Button>
        </div>
      </Card>

      {backups.length === 0 ? (
        <Card><div className="text-center py-8 text-on-surface-variant">لا توجد نسخ احتياطية</div></Card>
      ) : (
        <Card padded={false}>
          <DataTable<Backup>
            columns={[
              { key: 'name', label: 'الاسم', render: (b) => <span className="font-medium">{b.name}</span> },
              { key: 'createdAt', label: 'التاريخ' },
              { key: 'size', label: 'الحجم' },
              { key: 'createdBy', label: 'أنشأها' },
              {
                key: 'actions', label: 'إجراء', render: (b) => (
                  <Button size="sm" variant="outlined" icon={<Upload size={16} />} onClick={() => handleRestore(b)} disabled={acting}>
                    استعادة
                  </Button>
                ),
              },
            ]}
            rows={backups}
            emptyMessage="لا توجد نسخ"
          />
        </Card>
      )}
    </div>
  );
}

export function FilesPage() {
  return (
    <div className="animate-fade-in">
      <PageHeader title="إدارة الملفات" subtitle="ملفات Google Drive — الكتب والصوتيات والصور" />
      <Card>
        <CardHeader title="مجلدات Google Drive" subtitle="تتم إدارة الملفات مباشرة عبر Google Drive المرتبط بقاعدة البيانات" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { name: 'الكتب PDF', icon: '📄', desc: 'ملفات PDF للأحاديث' },
            { name: 'الصوتيات', icon: '🎵', desc: 'الملفات الصوتية' },
            { name: 'الشهادات', icon: '🏆', desc: 'شهادات الطلاب' },
            { name: 'صور الطلاب', icon: '🖼️', desc: 'صور شخصية للطلاب' },
            { name: 'الهوية والشعارات', icon: '🎨', desc: 'شعار الموقع وهويته' },
            { name: 'المستندات', icon: '📁', desc: 'مستندات متنوعة' },
          ].map((folder) => (
            <div key={folder.name} className="border border-outline-variant rounded-xl p-4 hover:border-primary-300 transition-colors">
              <div className="text-3xl mb-2">{folder.icon}</div>
              <h4 className="font-semibold text-on-surface">{folder.name}</h4>
              <p className="text-xs text-on-surface-variant mt-1">{folder.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 p-4 bg-accent-50 rounded-xl border border-accent-200">
          <p className="text-sm text-accent-700">تتم إدارة هذه الملفات مباشرة من Google Drive. الروابط في الأحاديث والإعدادات تشير إلى الملفات داخل هذه المجلدات.</p>
        </div>
      </Card>
    </div>
  );
}
