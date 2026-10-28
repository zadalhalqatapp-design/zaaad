import { useCallback, useEffect, useState } from 'react';
import { api } from '@/api';
import type { Book } from '@/types';

const KEY = 'zad_selected_book';

function readSaved(): string {
  try { return localStorage.getItem(KEY) || ''; } catch { return ''; }
}

/**
 * كتب الطالب المعيَّنة + الكتاب المختار حاليًا (يُحفظ بين الصفحات).
 * إن فشل جلب الكتب (خادم قديم بلا ميزة الكتب) يُعاد `legacy: true`
 * وتعمل الصفحات بالسلوك القديم دون كتاب محدد.
 */
export function useStudentBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [ready, setReady] = useState(false);
  const [legacy, setLegacy] = useState(false);
  const [selected, setSelected] = useState<string>(readSaved);

  useEffect(() => {
    let alive = true;
    api.getBooks()
      .then((list) => { if (alive) { setBooks(list); setLegacy(false); } })
      .catch(() => { if (alive) { setBooks([]); setLegacy(true); } })
      .finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);

  // إن لم يكن المختار ضمن كتبه (أو لم يُختر شيء) نأخذ أول كتاب
  const book = books.find((b) => b.id === selected) || books[0];

  const setBookId = useCallback((id: string) => {
    setSelected(id);
    try { localStorage.setItem(KEY, id); } catch { /* غير مهم */ }
  }, []);

  return { books, book, bookId: book?.id, setBookId, ready, legacy };
}
