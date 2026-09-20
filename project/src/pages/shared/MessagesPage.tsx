import { useState } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/Badge';
import type { Message, User } from '@/types';
import { MessageSquare, Send, Inbox, Search } from 'lucide-react';

export function MessagesPage({ recipients }: { recipients?: User[] }) {
  const { user } = useAuth();
  const { notify } = useToast();
  const { data, loading, reload } = useAsync(() => api.getMessages(user!.id) as Promise<Message[]>, [user?.id]);

  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
  const [toId, setToId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);

  const messages = data || [];
  const filtered = messages.filter((m) =>
    m.subject.toLowerCase().includes(search.toLowerCase()) || m.body.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSend = async () => {
    if (!toId || !subject.trim() || !body.trim()) {
      notify('يرجى تعبئة جميع الحقول.', 'warning');
      return;
    }
    setSending(true);
    try {
      await api.sendMessage(toId, subject, body);
      notify('تم إرسال الرسالة', 'success');
      setComposeOpen(false);
      setToId(''); setSubject(''); setBody('');
      reload();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'فشل الإرسال.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleOpen = async (msg: Message) => {
    setSelectedMsg(msg);
    if (!msg.read) {
      try {
        await api.markMessageRead(msg.id);
        reload();
      } catch { /* non-critical */ }
    }
  };

  if (loading) return <div className="py-20 text-center text-on-surface-variant">جارٍ التحميل...</div>;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="الرسائل"
        subtitle="نظام المراسلة المباشر"
        action={<Button icon={<Send size={18} />} onClick={() => setComposeOpen(true)}>رسالة جديدة</Button>}
      />

      <div className="mb-4">
        <Input placeholder="بحث في الرسائل..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search size={18} />} />
      </div>

      {filtered.length === 0 ? (
        <Card><EmptyState icon={<Inbox size={40} />} title="لا توجد رسائل" description="ستظهر رسائلك هنا." /></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((msg) => (
            <Card
              key={msg.id}
              className={`cursor-pointer hover:border-primary-300 transition-all ${!msg.read ? 'border-primary-200 bg-primary-50/30' : ''}`}
              onClick={() => handleOpen(msg)}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${!msg.read ? 'bg-primary-100 text-primary-600' : 'bg-surface-dim text-on-surface-variant'}`}>
                  <MessageSquare size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm truncate ${!msg.read ? 'font-bold text-on-surface' : 'font-medium text-on-surface'}`}>{msg.subject}</p>
                    <span className="text-xs text-on-surface-variant shrink-0">{msg.sentAt}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant truncate mt-1">{msg.fromName} → {msg.toName}</p>
                  <p className="text-sm text-on-surface-variant truncate mt-1">{msg.body}</p>
                </div>
                {!msg.read && <span className="w-2 h-2 rounded-full bg-primary-600 shrink-0 mt-2" />}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Compose dialog */}
      <Dialog
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        title="رسالة جديدة"
        actions={
          <>
            <Button variant="text" onClick={() => setComposeOpen(false)}>إلغاء</Button>
            <Button onClick={handleSend} loading={sending} icon={<Send size={18} />}>إرسال</Button>
          </>
        }
      >
        <div className="space-y-4">
          {recipients && recipients.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-on-surface">إلى</label>
              <select
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              >
                <option value="">اختر المستلم...</option>
                {recipients.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} ({r.email})</option>
                ))}
              </select>
            </div>
          ) : (
            <Input label="إلى (معرّف المستلم)" value={toId} onChange={(e) => setToId(e.target.value)} placeholder="معرّف المستلم" />
          )}
          <Input label="الموضوع" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="موضوع الرسالة" />
          <Textarea label="نص الرسالة" value={body} onChange={(e) => setBody(e.target.value)} placeholder="اكتب رسالتك هنا..." />
        </div>
      </Dialog>

      {/* Read dialog */}
      <Dialog
        open={!!selectedMsg}
        onClose={() => setSelectedMsg(null)}
        title={selectedMsg?.subject || ''}
      >
        {selectedMsg && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-on-surface-variant">من: <strong className="text-on-surface">{selectedMsg.fromName}</strong></span>
              <span className="text-on-surface-variant">{selectedMsg.sentAt}</span>
            </div>
            <div className="border-t border-outline-variant pt-3">
              <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">{selectedMsg.body}</p>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
