import { useState } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/api';
import { useToast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { EmptyState, Badge } from '@/components/ui/Badge';
import type { Notification } from '@/types';
import { Bell, Send, Info } from 'lucide-react';

export function NotificationsPage({ canSend = false }: { canSend?: boolean }) {
  const { notify } = useToast();
  const { data, loading, reload } = useAsync(() => api.getNotifications() as Promise<Notification[]>, []);

  const [composeOpen, setComposeOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState('all');
  const [targetId, setTargetId] = useState('');
  const [sending, setSending] = useState(false);

  const notifications = data || [];

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      notify('يرجى تعبئة العنوان والمحتوى.', 'warning');
      return;
    }
    setSending(true);
    try {
      await api.sendNotification({ title, body, target, targetId: targetId || undefined });
      notify('تم إرسال الإشعار', 'success');
      setComposeOpen(false);
      setTitle(''); setBody(''); setTarget('all'); setTargetId('');
      reload();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'فشل الإرسال.', 'error');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="py-20 text-center text-on-surface-variant">جارٍ التحميل...</div>;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="الإشعارات"
        subtitle="إشعارات النظام"
        action={canSend ? <Button icon={<Send size={18} />} onClick={() => setComposeOpen(true)}>إرسال إشعار</Button> : undefined}
      />

      {notifications.length === 0 ? (
        <Card><EmptyState icon={<Bell size={40} />} title="لا توجد إشعارات" /></Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card key={n.id} className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-50 text-accent-600 flex items-center justify-center shrink-0">
                <Bell size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-on-surface">{n.title}</p>
                  <span className="text-xs text-on-surface-variant shrink-0">{n.createdAt}</span>
                </div>
                <p className="text-sm text-on-surface-variant mt-1">{n.body}</p>
                <div className="mt-2">
                  <Badge variant="info">
                    {n.target === 'all' ? 'الجميع' : n.target === 'students' ? 'الطلاب' : n.target === 'supervisors' ? 'المشرفون' : n.target === 'student' ? 'طالب محدد' : 'مجموعة'}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {canSend && (
        <Card className="mt-6 border-dashed border-outline">
          <CardHeader title="إنشاء إشعار جديد" subtitle="أرسل إشعارًا للطلاب أو المشرفين" />
          <div className="space-y-4">
            <Input label="العنوان" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الإشعار" />
            <Textarea label="المحتوى" value={body} onChange={(e) => setBody(e.target.value)} placeholder="نص الإشعار" />
            <Select label="الجمهور المستهدف" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="all">الجميع</option>
              <option value="students">جميع الطلاب</option>
              <option value="supervisors">جميع المشرفين</option>
              <option value="student">طالب محدد</option>
              <option value="group">مجموعة محددة</option>
            </Select>
            {target === 'student' && (
              <Input label="معرّف الطالب" value={targetId} onChange={(e) => setTargetId(e.target.value)} placeholder="معرّف الطالب" />
            )}
            <Button onClick={handleSend} loading={sending} icon={<Send size={18} />}>إرسال الإشعار</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
