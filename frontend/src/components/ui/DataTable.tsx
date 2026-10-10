'use client';

import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';

export type SortDirection = 'asc' | 'desc';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (item: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  selectedId?: string | number;
  onRowClick?: (item: T) => void;
  renderRowActions?: (item: T) => React.ReactNode;
  rowActionsHeader?: string;
  loading?: boolean;
  loadingRowCount?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  stickyHeader?: boolean;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyExtractor,
  selectedId,
  onRowClick,
  renderRowActions,
  rowActionsHeader = '',
  loading = false,
  loadingRowCount = 5,
  emptyTitle = 'No data available',
  emptyDescription = 'There are no records matching the current criteria.',
  className,
  stickyHeader = true,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey(null);
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sortDirection === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
  }, [data, sortKey, sortDirection]);

  const handleRowKeyDown = (e: React.KeyboardEvent, item: T) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRowClick?.(item);
    }
  };

  return (
    <div className={cn('w-full overflow-x-auto relative rounded-panel bg-panel select-none', className)}>
      <table className="w-full text-left border-collapse">
        {/* ── Table Header: Slightly Lighter Charcoal (#2A3036) ── */}
        <thead
          className={cn(
            'bg-[#2A3036] border-b border-[#343B42]',
            stickyHeader && 'sticky top-0 z-10'
          )}
        >
          <tr>
            {columns.map((col) => {
              const isSorted = sortKey === col.key;
              const alignClass =
                col.align === 'center'
                  ? 'text-center'
                  : col.align === 'right'
                  ? 'text-right'
                  : 'text-left';

              return (
                <th
                  key={col.key}
                  scope="col"
                  style={col.width ? { width: col.width } : undefined}
                  aria-sort={
                    col.sortable
                      ? isSorted
                        ? sortDirection === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                      : undefined
                  }
                  className={cn(
                    'px-4 py-3 text-sm font-semibold text-text-secondary tracking-wide select-none',
                    alignClass,
                    col.sortable && 'cursor-pointer hover:text-white transition-colors'
                  )}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div
                    className={cn(
                      'inline-flex items-center gap-1.5',
                      col.align === 'right' && 'flex-row-reverse'
                    )}
                  >
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="text-text-muted shrink-0">
                        {isSorted ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="w-4 h-4 text-orbit-blue" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-orbit-blue" />
                          )
                        ) : (
                          <ChevronsUpDown className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}

            {renderRowActions && (
              <th
                scope="col"
                className="px-4 py-3 text-sm font-semibold text-text-secondary text-right w-20 tracking-wide"
              >
                {rowActionsHeader}
              </th>
            )}
          </tr>
        </thead>

        {/* ── Table Body: 1px Row Dividers (#2F353B), Hover (#2A3036), Selected (#2F4B66) ── */}
        <tbody className="divide-y divide-[#2F353B]/70">
          {/* Loading Skeleton Rows */}
          {loading && (
            <>
              {Array.from({ length: loadingRowCount }).map((_, rIdx) => (
                <tr key={`skeleton-${rIdx}`} className="border-b border-[#2F353B]/40">
                  {columns.map((col, cIdx) => (
                    <td key={`skel-col-${cIdx}`} className="px-4 py-3.5">
                      <Skeleton
                        variant="text"
                        className={cIdx === 0 ? 'w-24' : cIdx === 1 ? 'w-36' : 'w-20'}
                      />
                    </td>
                  ))}
                  {renderRowActions && (
                    <td className="px-4 py-3.5 text-right">
                      <Skeleton variant="circle" className="w-5 h-5 ml-auto" />
                    </td>
                  )}
                </tr>
              ))}
            </>
          )}

          {/* Empty State: Plain Left-Aligned Orbit Pattern Without Dashed Box */}
          {!loading && sortedData.length === 0 && (
            <tr>
              <td
                colSpan={columns.length + (renderRowActions ? 1 : 0)}
                className="px-4 py-3"
              >
                <EmptyState
                  variant="table"
                  title={emptyTitle}
                  description={emptyDescription}
                />
              </td>
            </tr>
          )}

          {/* Data Rows */}
          {!loading &&
            sortedData.map((item, index) => {
              const rowKey = keyExtractor(item, index);
              const isSelected = selectedId !== undefined && selectedId === rowKey;

              return (
                <tr
                  key={rowKey}
                  tabIndex={0}
                  onClick={() => onRowClick?.(item)}
                  onKeyDown={(e) => handleRowKeyDown(e, item)}
                  aria-selected={isSelected}
                  className={cn(
                    'transition-colors duration-100 outline-none group cursor-pointer',
                    'hover:bg-row-hover focus-visible:bg-row-hover focus-visible:ring-1 focus-visible:ring-orbit-blue',
                    isSelected && 'bg-row-selected text-white font-medium hover:bg-[#345575]'
                  )}
                >
                  {columns.map((col) => {
                    const alignClass =
                      col.align === 'center'
                        ? 'text-center'
                        : col.align === 'right'
                        ? 'text-right'
                        : 'text-left';

                    const rawVal = item[col.key];

                    return (
                      <td
                        key={col.key}
                        className={cn(
                          'px-4 py-3 text-sm text-text-primary truncate max-w-[240px]',
                          alignClass
                        )}
                      >
                        {col.render
                          ? col.render(item, index)
                          : rawVal !== null && rawVal !== undefined
                          ? String(rawVal)
                          : '—'}
                      </td>
                    );
                  })}

                  {renderRowActions && (
                    <td
                      className="px-4 py-3 text-sm text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {renderRowActions(item)}
                    </td>
                  )}
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
