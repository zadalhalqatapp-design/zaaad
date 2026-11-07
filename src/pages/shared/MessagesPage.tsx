import { useState } from 'react';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { useAsync } from '@/hooks/useAsync';
import { useShowMore } from '@/hooks/useShowMore';
import { api } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/Badge';
import { RecipientPicker, useRecipients } from '@/components/ui/RecipientPicker';
import { fmtAgo, fmtDateTime } from '@/lib/format';
import type { Message, MessageRecipient } from '@/types';
import { MessageSquare, Send, Inbox, Search, Reply } from 'lucide-react';

type Folder = 'all' | 'inbox' | 'sent';

export function MessagesPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const { data, loading, reload } = useAsync(() => api.getMessages(user!.id) as Promise<Message[]>, [user?.id]);
  const { recipients, failed } = useRecipients();

  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
  const [toId, setToId] = useState('');
  const [extraRecipient, setExtraRecipient] = useState<MessageRecipient | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [search, setSearch] = useState('');
  const [folder, setFolder] = useState<Folder>('all');
  const [sending, setSending] = useState(false);

  const messages = data || [];
  const isIncoming = (m: Message) => m.toId === user?.id;
  const unread = messages.filter((m) => isIncoming(m) && !m.read).length;
  const q = search.trim().toLowerCase();
  const filtered = messages.filter(
    (m) =>
      (folder === 'all' || (folder === 'inbox' ? isIncoming(m) : !isIncoming(m))) &&
      (!q || m.subject.toLowerCase().includes(q) || m.body.toLowerCase().includes(q) || m.fromName.toLowerCase().includes(q) || m.toName.toLowerCase().includes(q)),
  );
  const { visible, remaining, showMore } = useShowMore(filtered);

  const resetCompose = () => {
    setToId(''); setSubject(''); setBody(''); setExtraRecipient(null);
  };

  const openCompose = (reply?: Message) => {
    resetCompose();
    if (reply) {
      setToId(reply.fromId);
      setExtraRecipient({ id: reply.fromId, name: reply.fromName, role: reply.fromRole });
      setSubject(reply.subject.startsWith('رد:') ? reply.subject : `رد: ${reply.subject}`);
      setSelectedMsg(null);
    }
    setComposeOpen(true);
  };

  const handleSend = async () => {
    if (!toId) return notify('اختر المستلم أولًا.', 'warning');
    if (!subject.trim()) return notify('اكتب موضوع الرسالة.', 'warning');
    if (!body.trim()) return notify('اكتب نص الرسالة.', 'warning');
    setSending(true);
    try {
      await api.sendMessage(toId, subject.trim(), body.trim());
      notify('تم إرسال الرسالة', 'success');
      setComposeOpen(false);
      resetCompose();
      reload();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'فشل الإرسال.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleOpen = async (msg: Message) => {
    setSelectedMsg(msg);
    if (isIncoming(msg) && !msg.read) {
      try {
        await api.markMessageRead(msg.id);
        reload();
      } catch { /* non-critical */ }
    }
  };

  if (loading) return <PageSkeleton />;

  const folders: { id: Folder; label: string }[] = [
    { id: 'all', label: 'الكل' },
    { id: 'inbox', label: unread > 0 ? `الواردة (${unread} جديدة)` : 'الواردة' },
    { id: 'sent', label: 'المرسلة' },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="الرسائل"
        subtitle="نظام المراسلة المباشر"
        action={<Button icon={<Send size={18} />} onClick={() => openCompose()}>رسالة جديدة</Button>}
      />

      <div className="mb-3 flex flex-wrap gap-2">
        {folders.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFolder(f.id)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              folder === f.id ? 'border-primary-600 bg-primary-600 text-white' : 'border-outline-variant bg-surface hover:border-primary-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="mb-4">
        <Input placeholder="ابحث في الرسائل..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search size={18} />} />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Inbox size={40} />}
            title="لا توجد رسائل"
            description={messages.length === 0 ? 'ستظهر رسائلك هنا.' : 'لا توجد رسائل مطابقة للبحث أو المجلد المحدد.'}
            action={messages.length === 0 ? <Button size="sm" icon={<Send size={16} />} onClick={() => openCompose()}>اكتب أول رسالة</Button> : undefined}
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {visible.map((msg) => {
            const incoming = isIncoming(msg);
            const isNew = incoming && !msg.read;
            return (
              <Card
                key={msg.id}
                className={`cursor-pointer hover:border-primary-300 transition-colors ${isNew ? 'border-primary-200 bg-primary-50/30' : ''}`}
                onClick={() => handleOpen(msg)}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isNew ? 'bg-primary-100 text-primary-600' : 'bg-surface-dim text-on-surface-variant'}`}>
                    <MessageSquare size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${isNew ? 'font-bold text-on-surface' : 'font-medium text-on-surface'}`}>{msg.subject}</p>
                      <span className="text-xs text-on-surface-variant shrink-0">{fmtAgo(msg.sentAt)}</span>
                    </div>
                    <p className="text-xs text-on-surface-variant truncate mt-1">
                      {incoming ? `من: ${msg.fromName}` : `إلى: ${msg.toName}`}
                    </p>
                    <p className="text-sm text-on-surface-variant truncate mt-1">{msg.body}</p>
                  </div>
                  {isNew && <span className="w-2 h-2 rounded-full bg-primary-600 shrink-0 mt-2" aria-label="جديدة" />}
                </div>
              </Card>
            );
          })}
          {remaining > 0 && (
            <button onClick={showMore} className="w-full py-2.5 text-sm font-medium text-primary-700 rounded-xl bg-surface-dim hover:bg-surface-dim/70">
              عرض المزيد ({remaining} متبقٍ)
            </button>
          )}
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
          <RecipientPicker value={toId} onChange={setToId} recipients={recipients} failed={failed} extra={extraRecipient} />
          <Input label="الموضوع" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="موضوع الرسالة" maxLength={120} />
          <Textarea label="نص الرسالة" value={body} onChange={(e) => setBody(e.target.value)} placeholder="اكتب رسالتك هنا..." autoFocus={!!subject} />
        </div>
      </Dialog>

      {/* Read dialog */}
      <Dialog
        open={!!selectedMsg}
        onClose={() => setSelectedMsg(null)}
        title={selectedMsg?.subject || ''}
        actions={
          selectedMsg && isIncoming(selectedMsg) ? (
            <Button icon={<Reply size={16} />} onClick={() => openCompose(selectedMsg)}>رد</Button>
          ) : undefined
        }
      >
        {selectedMsg && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-1 text-sm">
              <span className="text-on-surface-variant">
                {isIncoming(selectedMsg) ? 'من' : 'إلى'}:{' '}
                <strong className="text-on-surface">{isIncoming(selectedMsg) ? selectedMsg.fromName : selectedMsg.toName}</strong>
              </span>
              <span className="text-on-surface-variant">{fmtDateTime(selectedMsg.sentAt)}</span>
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
