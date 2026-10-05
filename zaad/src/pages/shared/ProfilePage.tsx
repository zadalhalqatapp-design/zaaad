import { useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ROLE_LABELS } from '@/config/nav';
import { User, Lock, Mail, Phone, Save } from 'lucide-react';

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { notify } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [gender, setGender] = useState<'male' | 'female' | ''>(user?.gender || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  if (!user) return null;

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      notify('الاسم مطلوب.', 'warning');
      return;
    }
    setSavingProfile(true);
    try {
      await api.updateProfile({ name: name.trim(), phone: phone.trim(), ...(user.role === 'student' && gender ? { gender } : {}) });
      updateUser({ name: name.trim(), phone: phone.trim(), ...(user.role === 'student' && gender ? { gender } : {}) });
      notify('تم تحديث الملف الشخصي', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'فشل التحديث.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPwd || !newPwd) {
      notify('يرجى تعبئة الحقول.', 'warning');
      return;
    }
    if (newPwd.length < 6) {
      notify('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل.', 'warning');
      return;
    }
    setSavingPwd(true);
    try {
      await api.changePassword(oldPwd, newPwd);
      notify('تم تغيير كلمة المرور', 'success');
      setOldPwd(''); setNewPwd('');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'فشل التغيير.', 'error');
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="الملف الشخصي" subtitle="إدارة بياناتك الشخصية" />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <Card className="lg:col-span-1 flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-3xl font-bold mb-3">
            {user.name.charAt(0)}
          </div>
          <h3 className="font-bold text-lg text-on-surface">{user.name}</h3>
          <p className="text-sm text-on-surface-variant">{user.email}</p>
          <div className="mt-3">
            <Badge variant="primary">{ROLE_LABELS[user.role]}</Badge>
          </div>
          <div className="w-full mt-4 pt-4 border-t border-outline-variant space-y-2 text-sm">
            <Row label="الحالة" value={
              user.status === 'approved' ? 'معتمد' : user.status === 'pending' ? 'قيد المراجعة' : user.status === 'rejected' ? 'مرفوض' : 'موقوف'
            } />
            <Row label="تاريخ الإنشاء" value={user.createdAt} />
            {user.approvedAt && <Row label="تاريخ الاعتماد" value={user.approvedAt} />}
          </div>
        </Card>

        {/* Edit forms */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader title="تعديل البيانات" subtitle="الاسم ورقم الجوال" />
            <div className="space-y-4">
              <Input label="الاسم الكامل" value={name} onChange={(e) => setName(e.target.value)} icon={<User size={18} />} />
              <Input label="البريد الإلكتروني" value={user.email} disabled icon={<Mail size={18} />} hint="لا يمكن تغيير البريد الإلكتروني" />
              <Input label="رقم الجوال" value={phone} onChange={(e) => setPhone(e.target.value)} icon={<Phone size={18} />} dir="ltr" />
              {user.role === 'student' && (
                <div>
                  <span className="mb-1.5 block text-sm font-medium text-on-surface">الجنس</span>
                  <div className="grid grid-cols-2 gap-2">
                    {([['male', 'ذكر'], ['female', 'أنثى']] as const).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setGender(value)}
                        className={`rounded-xl border py-2.5 text-sm font-medium transition-colors ${
                          gender === value ? 'border-primary-600 bg-primary-600 text-white' : 'border-outline-variant bg-surface hover:border-primary-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-on-surface-variant">يُستخدم لصياغة الدعاء في شهادتك (له / لها).</p>
                </div>
              )}
              <Button onClick={handleSaveProfile} loading={savingProfile} icon={<Save size={18} />}>حفظ التغييرات</Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="تغيير كلمة المرور" subtitle="كلمة المرور الحالية والجديدة" />
            <div className="space-y-4">
              <Input label="كلمة المرور الحالية" type="password" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} icon={<Lock size={18} />} dir="ltr" />
              <Input label="كلمة المرور الجديدة" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} icon={<Lock size={18} />} dir="ltr" hint="6 أحرف على الأقل" />
              <Button variant="outlined" onClick={handleChangePassword} loading={savingPwd} icon={<Lock size={18} />}>تغيير كلمة المرور</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-on-surface-variant">{label}</span>
      <span className="font-medium text-on-surface">{value}</span>
    </div>
  );
}
