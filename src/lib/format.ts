/** تنسيق التواريخ للعرض: «١٢ نوفمبر ٢٠٢٦» بدل نص ISO الخام (2026-11-12T08:30:00.000Z). */

function toDate(value?: string | number | Date | null): Date | null {
  if (value === undefined || value === null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

const DATE = new Intl.DateTimeFormat('ar-u-ca-gregory-nu-latn', { day: 'numeric', month: 'short', year: 'numeric' });
const TIME = new Intl.DateTimeFormat('ar-u-nu-latn', { hour: '2-digit', minute: '2-digit', hour12: true });

/** تاريخ فقط. إن تعذّر التحويل يُعاد النص كما هو (لا يُخفي بيانات). */
export function fmtDate(value?: string | number | Date | null): string {
  const d = toDate(value);
  return d ? DATE.format(d) : value ? String(value) : '—';
}

/** تاريخ ووقت. */
export function fmtDateTime(value?: string | number | Date | null): string {
  const d = toDate(value);
  return d ? `${DATE.format(d)} — ${TIME.format(d)}` : value ? String(value) : '—';
}

/** «منذ ٣ ساعات» للأحداث الحديثة، ثم التاريخ لما هو أقدم من أسبوع. */
export function fmtAgo(value?: string | number | Date | null): string {
  const d = toDate(value);
  if (!d) return value ? String(value) : '—';
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'الآن';
  if (min < 60) return `منذ ${min} دقيقة`;
  const h = Math.floor(min / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  const days = Math.floor(h / 24);
  if (days < 7) return `منذ ${days} يوم`;
  return fmtDate(d);
}
