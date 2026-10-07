import { useEffect, useRef, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { normalizedTopic } from '../lib/serviceDesk';

export function ExperienceField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-bold text-fotus-ink">
        {label}
      </span>
      {children}
    </label>
  );
}

export function ExperienceMetric({
  label,
  value,
  detail,
  yellow = false,
}: {
  label: string;
  value: string | number;
  detail: string;
  yellow?: boolean;
}) {
  return (
    <div
      className={`fotus-glass rounded-2xl p-5 ${yellow ? 'border-fotus-yellow/50' : ''}`}
    >
      <span className="text-[10px] font-extrabold uppercase tracking-wide text-fotus-ink/80">
        {label}
      </span>
      <strong className="mt-2 block text-3xl font-extrabold text-fotus-ink">
        {value}
      </strong>
      <p className="mt-2 text-xs text-fotus-ink/80">{detail}</p>
    </div>
  );
}

export function ExperienceSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="relative block min-w-0">
      <span className="sr-only">{placeholder}</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fotus-blue" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="field-input pl-10"
      />
    </label>
  );
}

export function ExperienceRanking({
  title,
  items,
  total,
  onSelect,
  selected,
}: {
  title: string;
  items: { label: string; count: number }[];
  total: number;
  onSelect?: (label: string) => void;
  selected?: string;
}) {
  const max = items[0]?.count || 1;
  return (
    <section className="fotus-glass rounded-3xl p-5">
      <h3 className="text-sm font-extrabold text-fotus-ink">{title}</h3>
      <div className="mt-4 max-h-72 space-y-3 overflow-y-auto">
        {items.map((item) => {
          const content = (
            <>
              <div className="mb-2 flex items-start justify-between gap-3">
                <span className="min-w-0 break-words text-xs font-semibold text-fotus-ink">
                  {item.label}
                </span>
                <strong className="shrink-0 text-xs text-fotus-blue">
                  {item.count}{' '}
                  <small className="font-normal text-fotus-ink/80">
                    · {total ? Math.round((item.count / total) * 100) : 0}%
                  </small>
                </strong>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-fotus-ink/7">
                <div
                  className="h-full rounded-full bg-fotus-yellow"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </div>
            </>
          );
          const active = Boolean(
            selected &&
              normalizedTopic(selected) === normalizedTopic(item.label),
          );
          return onSelect ? (
            <button
              key={item.label}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(item.label)}
              className={`block w-full rounded-xl p-2 text-left transition-colors hover:bg-fotus-yellow/15 ${active ? 'bg-fotus-yellow/20 ring-1 ring-fotus-yellow' : ''}`}
            >
              {content}
            </button>
          ) : (
            <div key={item.label} className="p-2">
              {content}
            </div>
          );
        })}
        {!items.length && (
          <p className="py-5 text-xs text-fotus-ink/80">
            Nenhum registro neste filtro.
          </p>
        )}
      </div>
    </section>
  );
}

export function ExperiencePagination({
  page,
  pages,
  count,
  onChange,
}: {
  page: number;
  pages: number;
  count: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-fotus-ink/80">
      <span>
        {count} registro(s) · página {page} de {pages}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="flex items-center gap-1 rounded-xl border border-fotus-blue/15 px-3 py-2 font-bold disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </button>
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          className="flex items-center gap-1 rounded-xl border border-fotus-blue/15 px-3 py-2 font-bold disabled:opacity-40"
        >
          Próxima
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function ExperienceDialog({
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide = false,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="experience-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose();
      }}
      className={`fotus-dialog fixed inset-0 m-auto flex max-h-[92dvh] w-[calc(100%_-_1.5rem)] ${wide ? 'max-w-7xl' : 'max-w-3xl'} flex-col overflow-hidden rounded-3xl border border-fotus-neutral p-0 text-fotus-ink shadow-2xl backdrop:bg-fotus-ink/45 backdrop:backdrop-blur-sm`}
    >
      <header className="fotus-dialog-header flex items-start justify-between gap-4 p-5 sm:px-7">
        <div className="min-w-0">
          <h2
            id="experience-dialog-title"
            className="break-words text-lg font-extrabold text-fotus-ink"
          >
            {title}
          </h2>
          <p className="mt-1 text-xs text-fotus-ink/80">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="shrink-0 rounded-xl p-2 hover:bg-fotus-yellow/25"
        >
          <X className="h-5 w-5" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
        {children}
      </div>
      {footer && (
        <footer className="flex flex-wrap justify-end gap-2 border-t border-fotus-blue/10 bg-fotus-neutral/40 p-4 sm:px-7">
          {footer}
        </footer>
      )}
    </dialog>
  );
}
