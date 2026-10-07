import { useId, type ReactNode } from 'react';
import type { AppSection } from '../types';

export type FotusIconKind =
  | Exclude<AppSection, 'ra' | 'atendimentos'>
  | 'chat'
  | 'isa'
  | 'notificacoes';

// Ícones vetoriais próprios: a mesma linguagem de vidro para cada área da Fotus.
const SYMBOLS: Record<FotusIconKind, ReactNode> = {
  'visao-geral': (
    <>
      <rect x="2" y="2" width="8" height="8" rx="2.5" />
      <rect
        x="14"
        y="2"
        width="8"
        height="5"
        rx="2"
        fill="#FAB515"
        stroke="none"
      />
      <rect x="14" y="11" width="8" height="11" rx="2.5" />
      <rect
        x="2"
        y="14"
        width="8"
        height="8"
        rx="2.5"
        fill="#FAB515"
        fillOpacity=".3"
      />
      <path d="M17 18v-3M19 18v-1" />
    </>
  ),
  ocorrencias: (
    <>
      <path d="M8 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3" />
      <rect x="8" y="2" width="7" height="5" rx="2" fill="#FAB515" />
      <path d="m7 12 1.5 1.5L11 11M14 12h3M7 18h10" />
    </>
  ),
  custos: (
    <>
      <path d="M3 7V5a2 2 0 0 1 2-2h13v4M3 7h17a1 1 0 0 1 1 1v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      <path d="M21 11h-6a2 2 0 0 0 0 5h6" />
      <circle cx="16" cy="13.5" r="1" fill="#FAB515" stroke="none" />
      <path d="M7 11v5M9 12.5H5.5M9 15H6" />
    </>
  ),
  visitas: (
    <>
      <path d="M3 22V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v18M1 22h21M7 22v-5h4v5M6 7h2M11 7h1M6 11h2" />
      <circle
        cx="18"
        cy="11"
        r="5"
        fill="#FAB515"
        stroke="#E7E7E7"
        strokeWidth="1.5"
      />
      <path d="M18 8.5v3l1.5 1" stroke="#0D518E" />
    </>
  ),
  estrutura: (
    <>
      <rect x="8" y="2" width="8" height="5" rx="2" fill="#FAB515" />
      <path d="M12 7v5M4 16v-4h16v4" />
      <rect x="1" y="16" width="6" height="6" rx="2" />
      <rect
        x="9"
        y="16"
        width="6"
        height="6"
        rx="2"
        fill="#FAB515"
        fillOpacity=".25"
      />
      <rect x="17" y="16" width="6" height="6" rx="2" />
    </>
  ),
  voc: (
    <>
      <path d="M20 15a3 3 0 0 1-3 3H9l-6 4V5a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3" />
      <path d="M7 10V7h3v3H8v2M13 10V7h3v3h-2v2" />
      <path d="M18 10v3M21 8v7M24 10v3" stroke="#FAB515" strokeWidth="2.5" />
    </>
  ),
  chat: (
    <>
      <path d="M3 16V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H8l-5 4Z" />
      <path d="M10 18h6l5 4V11" stroke="#FAB515" strokeWidth="2.5" />
      <circle cx="7" cy="9" r=".9" fill="#0D518E" stroke="none" />
      <circle cx="11" cy="9" r=".9" fill="#0D518E" stroke="none" />
      <circle cx="15" cy="9" r=".9" fill="#0D518E" stroke="none" />
    </>
  ),
  isa: (
    <>
      <path
        d="m12 3 2.8 6.2L21 12l-6.2 2.8L12 21l-2.8-6.2L3 12l6.2-2.8Z"
        fill="#FAB515"
        fillOpacity=".4"
      />
      <path
        d="M20 2v4M18 4h4M3 19v3M1.5 20.5h3"
        stroke="#FAB515"
        strokeWidth="2"
      />
      <path d="m10 12 1.5 1.5 3-3" />
    </>
  ),
  notificacoes: (
    <>
      <path
        d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5Z"
        fill="#FAB515"
        fillOpacity=".25"
      />
      <path d="M10 21h4" />
    </>
  ),
};

export default function FotusNavIcon({
  kind,
  className = 'h-9 w-9',
  active = false,
}: {
  kind: FotusIconKind;
  className?: string;
  active?: boolean;
}) {
  const id = `fotus-icon-${useId().replace(/:/g, '')}`;
  return (
    <svg
      viewBox="0 0 48 48"
      className={`fotus-nav-icon shrink-0 ${className}`}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id={id}
          x1="5"
          y1="3"
          x2="42"
          y2="46"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#E7E7E7" stopOpacity=".95" />
          <stop
            offset="1"
            stopColor={active ? '#FAB515' : '#E7E7E7'}
            stopOpacity={active ? '.55' : '.45'}
          />
        </linearGradient>
      </defs>
      <rect
        x="2"
        y="2"
        width="44"
        height="44"
        rx="14"
        fill={`url(#${id})`}
        stroke="#E7E7E7"
        strokeOpacity=".9"
      />
      <path
        d="M28 45c-2-9 5-18 17-19v5a14 14 0 0 1-14 14Z"
        fill="#FAB515"
        fillOpacity={active ? '.4' : '.2'}
      />
      <g
        transform="translate(12 12)"
        stroke="#0D518E"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {SYMBOLS[kind]}
      </g>
    </svg>
  );
}
