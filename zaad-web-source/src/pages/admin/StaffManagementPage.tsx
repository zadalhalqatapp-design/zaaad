import { useState } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/api';
import { useToast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { DataTable } from '@/components/ui/DataTable';
import type { User } from '@/types';
import { UserPlus, Pencil, Trash2, ShieldCheck } from 'lucide-react';

interface Props {
  role: 'supervisor' | 'admin';
}

const ROLE_TEXT = {
  supervisor: { title: 'إدارة المشرفين', add: 'إضافة مشرف', endpoint: 'addSupervisor' as const, list: 'getSupervisors' as const, update: 'updateSupervisor' as const, del: 'deleteSupervisor' as const },
  admin: { title: 'إدارة المديرين', add: 'إضافة مدير', endpoint: 'addAdmin' as const, list: 'getAdmins' as const, update: 'updateAdmin' as const, del: 'deleteAdmin' as const },
};

export function StaffManagementPage({ role }: Props) {
  const t = ROLE_TEXT[role];
  const { notify } = useToast();
  const { data, loading, reload } = useAsync(() => api[t.list]() as Promise<User[]>, []);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const list = data || [];

  const openAdd = () => {
    setEditing(null);
    setName(''); setEmail(''); setPassword(''); setPhone('');
    setOpen(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setName(u.name); setEmail(u.email); setPassword(''); setPhone(u.phone || '');
    setOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) {
      notify('الاسم والبريد مطلوبان.', 'warning');
      return;
    }
    if (!editing && !password) {
      notify('كلمة المرور مطلوبة للحساب الجديد.', 'warning');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const payload: Record<string, unknown> = { name: name.trim(), phone: phone.trim() };
        if (password) payload.password = password;
        await api[t.update](editing.id, payload);
        notify('تم تحديث البيانات', 'success');
      } else {
        await api[t.endpoint]({ name: name.trim(), email: email.trim(), password, phone: phone.trim() || undefined });
        notify('تمت الإضافة بنجاح', 'success');
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
      await api[t.del](deleteTarget.id);
      notify('تم الحذف', 'success');
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
        title={t.title}
        subtitle={`${list.length} ${role === 'supervisor' ? 'مشرف' : 'مدير'}`}
        action={<Button icon={<UserPlus size={18} />} onClick={openAdd}>{t.add}</Button>}
      />

      <Card padded={false}>
        <DataTable<User>
          columns={[
            { key: 'name', label: 'الاسم', render: (u) => <span className="font-medium">{u.name}</span> },
            { key: 'email', label: 'البريد', render: (u) => <span dir="ltr">{u.email}</span> },
            { key: 'phone', label: 'الجوال', render: (u) => <span dir="ltr">{u.phone || '—'}</span> },
            { key: 'createdAt', label: 'تاريخ الإنشاء' },
            {
              key: 'actions', label: 'إجراءات', render: (u) => (
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-surface-dim text-on-surface-variant" title="تعديل"><Pencil size={16} /></button>
                  <button onClick={() => setDeleteTarget(u)} className="p-1.5 rounded-lg hover:bg-error-50 text-error-600" title="حذف"><Trash2 size={16} /></button>
                </div>
              ),
            },
          ]}
          rows={list}
          emptyMessage={`لا يوجد ${role === 'supervisor' ? 'مشرفون' : 'مديرون'}`}
        />
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'تعديل البيانات' : t.add}
        actions={
          <>
            <Button variant="text" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} loading={saving} icon={<ShieldCheck size={18} />}>حفظ</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="الاسم الكامل" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="البريد الإلكتروني" type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" disabled={!!editing} hint={editing ? 'لا يمكن تغيير البريد' : undefined} />
          <Input label={editing ? 'كلمة مرور جديدة (اتركها فارغة لعدم التغيير)' : 'كلمة المرور'} type="password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
          <Input label="رقم الجوال" value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
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
        <p className="text-sm text-on-surface-variant">هل أنت متأكد من حذف <strong className="text-on-surface">{deleteTarget?.name}</strong>؟ لا يمكن التراجع عن هذه العملية.</p>
      </Dialog>
    </div>
  );
}
