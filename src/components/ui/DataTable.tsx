import { useState, type ReactNode } from 'react';
import { useT } from '@/theme/store';
import { useIsWide } from '@/hooks/useIsWide';

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T extends { id: string }> {
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  /** عدد الصفوف المعروضة في كل دفعة؛ الباقي بزر «عرض المزيد» (يقلّل عقد DOM في القوائم الطويلة) */
  pageSize?: number;
}

function cellValue<T>(row: T, col: Column<T>): ReactNode {
  return col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '—');
}

export function DataTable<T extends { id: string }>({ columns, rows, emptyMessage = 'لا توجد بيانات', onRowClick, pageSize = 30 }: DataTableProps<T>) {
  const t = useT();
  const wide = useIsWide();
  const [shown, setShown] = useState(pageSize);
  const visibleRows = rows.length > shown ? rows.slice(0, shown) : rows;

  const more = rows.length > shown && (
    <button
      onClick={() => setShown((n) => n + pageSize)}
      className="w-full py-2.5 text-sm font-medium text-primary-700 bg-surface-dim hover:bg-surface-dim/70 border-t border-outline-variant"
    >
      {t('عرض المزيد')} ({rows.length - shown})
    </button>
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-outline-variant py-8 text-center text-on-surface-variant">{emptyMessage}</div>
    );
  }

  // الهاتف: كل صف بطاقة (العمود الأول عنوانها، وعمود الإجراءات في أسفلها) بنفس الوظائف تمامًا
  if (!wide) {
    const [titleCol, ...rest] = columns;
    const actionCols = rest.filter((c) => c.key === 'actions');
    const dataCols = rest.filter((c) => c.key !== 'actions');
    return (
      <div className="space-y-3">
        {visibleRows.map((row) => (
          <div
            key={row.id}
            onClick={() => onRowClick?.(row)}
            className={`rounded-2xl border border-outline-variant bg-surface p-4 shadow-sm ${onRowClick ? 'cursor-pointer' : ''}`}
          >
            <div className="mb-2 text-base font-semibold text-on-surface">{cellValue(row, titleCol)}</div>
            <dl className="space-y-1.5 text-sm">
              {dataCols.map((col) => (
                <div key={col.key} className="flex items-center justify-between gap-3">
                  <dt className="shrink-0 text-on-surface-variant">{col.label}</dt>
                  <dd className="min-w-0 text-end text-on-surface break-words">{cellValue(row, col)}</dd>
                </div>
              ))}
            </dl>
            {actionCols.map((col) => (
              <div key={col.key} className="mt-3 flex flex-wrap items-center gap-1 border-t border-outline-variant/70 pt-3" onClick={(e) => e.stopPropagation()}>
                {cellValue(row, col)}
              </div>
            ))}
          </div>
        ))}
        {more && <div className="overflow-hidden rounded-xl border border-outline-variant">{more}</div>}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-outline-variant">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-dim border-b border-outline-variant">
            {columns.map((col) => (
              <th key={col.key} className={`text-start px-4 py-3 font-semibold text-on-surface-variant whitespace-nowrap ${col.className || ''}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-outline-variant last:border-0 hover:bg-surface-dim/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3 text-on-surface ${col.className || ''}`}>
                  {cellValue(row, col)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {more}
    </div>
  );
}
