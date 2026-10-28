import { useState, type ReactNode } from 'react';

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

export function DataTable<T extends { id: string }>({ columns, rows, emptyMessage = 'لا توجد بيانات', onRowClick, pageSize = 30 }: DataTableProps<T>) {
  const [shown, setShown] = useState(pageSize);
  const visibleRows = rows.length > shown ? rows.slice(0, shown) : rows;
  return (
    <div className="overflow-x-auto rounded-xl border border-outline-variant">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-dim border-b border-outline-variant">
            {columns.map((col) => (
              <th key={col.key} className={`text-right px-4 py-3 font-semibold text-on-surface-variant whitespace-nowrap ${col.className || ''}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-8 text-on-surface-variant">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            visibleRows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-outline-variant last:border-0 hover:bg-surface-dim/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 text-on-surface ${col.className || ''}`}>
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {rows.length > shown && (
        <button
          onClick={() => setShown((n) => n + pageSize)}
          className="w-full py-2.5 text-sm font-medium text-primary-700 bg-surface-dim hover:bg-surface-dim/70 border-t border-outline-variant"
        >
          عرض المزيد ({rows.length - shown} متبقٍ)
        </button>
      )}
    </div>
  );
}
