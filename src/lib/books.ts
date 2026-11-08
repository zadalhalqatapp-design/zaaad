import type { Hadith, ProgressRecord } from '@/types';

/** يقسّم عناصر الكتاب على أيامه: الترتيب بحسب الرقم، وكل يوم `perDay` عنصرًا. */
export function groupByDay(hadiths: Hadith[], perDay: number, daysCount: number) {
  const sorted = [...hadiths].sort((a, b) => a.number - b.number);
  const size = Math.max(1, perDay);
  return Array.from({ length: Math.max(1, daysCount) }, (_, i) => ({
    day: i + 1,
    hadiths: sorted.slice(i * size, (i + 1) * size),
  }));
}

/**
 * نسب الإنجاز لكتاب واحد: الحفظ 50% + السماع (صوت أو فيديو، أيهما تم) 50%.
 * الاطلاع على صورة الحديث (read) مادة مساعدة ولا يدخل في النسبة.
 */
export function bookStats(hadiths: Hadith[], progress: ProgressRecord[]) {
  const ids = new Set(hadiths.map((h) => h.id));
  const own = progress.filter((p) => ids.has(p.hadithId));
  const total = hadiths.length;
  const memorized = own.filter((p) => p.memorized).length;
  const listened = own.filter((p) => p.listened).length;
  const watched = own.filter((p) => p.watched).length;
  const mediaDone = own.filter((p) => p.listened || p.watched).length;
  const read = own.filter((p) => p.read).length;
  const completed = own.filter((p) => p.memorized && (p.listened || p.watched)).length;
  const overall = total ? (memorized / total) * 50 + (mediaDone / total) * 50 : 0;
  return { total, memorized, listened, watched, mediaDone, read, completed, overall };
}
