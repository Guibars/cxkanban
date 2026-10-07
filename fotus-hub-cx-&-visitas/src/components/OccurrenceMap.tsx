import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import {
  ArrowUpRight,
  MapPinned,
  Minus,
  Plus,
  RotateCcw,
  Warehouse,
} from 'lucide-react';
import type { Occurrence } from '../types';
import {
  DISTRIBUTION_CENTERS,
  distributionCenterStats,
  type DistributionCenterCode,
} from '../lib/distributionCenters';
import { ExperienceDialog } from './ExperienceUi';

type MapState = {
  uf: string;
  name: string;
  path: string;
  anchor: { x: number; y: number };
};
type BrazilMap = { viewBox: string; source: string; states: MapState[] };
const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function OccurrenceMap({
  occurrences,
  period,
  onClose,
  onFilter,
}: {
  occurrences: Occurrence[];
  period: string;
  onClose: () => void;
  onFilter: (code: DistributionCenterCode | 'missing') => void;
}) {
  const [map, setMap] = useState<BrazilMap | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<DistributionCenterCode | null>(null);
  const [coverage, setCoverage] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{
    pointerId: number;
    x: number;
    y: number;
    originX: number;
    originY: number;
  } | null>(null);
  const stats = useMemo(
    () => distributionCenterStats(occurrences),
    [occurrences],
  );
  const current = stats.centers.find((center) => center.code === selected);
  const highest = Math.max(1, ...stats.centers.map((center) => center.count));

  useEffect(() => {
    const controller = new AbortController();
    fetch('/maps/brazil-states.json', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('map-unavailable');
        return response.json();
      })
      .then((data: BrazilMap) => {
        if (!controller.signal.aborted) setMap(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, []);

  const point = (event: PointerEvent<SVGSVGElement>) => {
    const matrix = svg.current?.getScreenCTM();
    if (!matrix) return null;
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(
      matrix.inverse(),
    );
  };
  const startDrag = (event: PointerEvent<SVGSVGElement>) => {
    if (
      event.button !== 0 ||
      (event.target as Element).closest('[data-map-center]')
    )
      return;
    const position = point(event);
    if (!position) return;
    drag.current = {
      pointerId: event.pointerId,
      x: position.x,
      y: position.y,
      originX: pan.x,
      originY: pan.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: PointerEvent<SVGSVGElement>) => {
    const position = point(event);
    if (
      !position ||
      !drag.current ||
      drag.current.pointerId !== event.pointerId
    )
      return;
    setPan({
      x: Math.max(
        -350,
        Math.min(350, drag.current.originX + position.x - drag.current.x),
      ),
      y: Math.max(
        -350,
        Math.min(350, drag.current.originY + position.y - drag.current.y),
      ),
    });
  };
  const endDrag = (event: PointerEvent<SVGSVGElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <ExperienceDialog
      wide
      title="Mapa de ocorrências por CD"
      subtitle={`${period} · Busca e etapa selecionadas · Dados acessíveis à sua conta`}
      onClose={onClose}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Ocorrências identificadas', value: stats.identified },
          {
            label: 'CDs com ocorrências',
            value: stats.centers.filter((center) => center.count > 0).length,
          },
          { label: 'CD não informado', value: stats.missing },
        ].map((item) => (
          <div key={item.label} className="fotus-glass rounded-2xl px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-fotus-ink/80">
              {item.label}
            </p>
            <strong className="mt-1 block text-2xl font-extrabold text-fotus-blue">
              {item.value}
            </strong>
          </div>
        ))}
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
        <section className="overflow-hidden rounded-3xl border border-fotus-blue/15 bg-gradient-to-br from-fotus-neutral via-fotus-blue/5 to-fotus-yellow/15">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
            <div>
              <p className="flex items-center gap-2 text-xs font-extrabold text-fotus-blue">
                <MapPinned className="h-4 w-4" />
                Origem dos pedidos
              </p>
              <p className="mt-1 text-[10px] text-fotus-ink/80">
                Clique em um CD para explorar · arraste para mover
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-full border border-fotus-blue/15 bg-fotus-neutral/80 p-1">
              <button
                type="button"
                aria-label="Diminuir mapa"
                disabled={zoom <= 1}
                onClick={() => setZoom((value) => Math.max(1, value - 0.25))}
                className="rounded-full p-2 hover:bg-fotus-yellow/30 disabled:opacity-35"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-10 text-center text-[10px] font-bold">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                aria-label="Ampliar mapa"
                disabled={zoom >= 2.5}
                onClick={() => setZoom((value) => Math.min(2.5, value + 0.25))}
                className="rounded-full p-2 hover:bg-fotus-yellow/30 disabled:opacity-35"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Centralizar mapa"
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
                className="rounded-full p-2 hover:bg-fotus-yellow/30"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
          {!map ? (
            <div className="flex min-h-80 items-center justify-center p-6 text-sm">
              {failed
                ? 'Não foi possível carregar o mapa. Os dados dos CDs continuam disponíveis ao lado.'
                : 'Carregando mapa do Brasil…'}
            </div>
          ) : (
            <svg
              ref={svg}
              viewBox={map.viewBox}
              className="mx-auto block max-h-[58dvh] w-full touch-none select-none"
              aria-label="Mapa do Brasil com ocorrências agrupadas pelo CD de origem. Os botões da lista também permitem selecionar cada CD."
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onLostPointerCapture={() => {
                drag.current = null;
              }}
            >
              <defs>
                <pattern
                  id="cd-map-grid"
                  width="32"
                  height="32"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M32 0H0V32"
                    fill="none"
                    stroke="#0D518E"
                    strokeOpacity=".06"
                  />
                </pattern>
                <filter
                  id="cd-map-shadow"
                  x="-30%"
                  y="-30%"
                  width="160%"
                  height="170%"
                >
                  <feDropShadow
                    dx="0"
                    dy="5"
                    stdDeviation="7"
                    floodColor="#0D518E"
                    floodOpacity=".18"
                  />
                </filter>
              </defs>
              <rect width="800" height="800" fill="url(#cd-map-grid)" />
              <g
                transform={`translate(${pan.x} ${pan.y}) translate(400 400) scale(${zoom}) translate(-400 -400)`}
              >
                <g filter="url(#cd-map-shadow)">
                  {map.states.map((state) => {
                    const center = stats.centers.find(
                      (item) => item.code === state.uf,
                    );
                    const count = center?.count || 0;
                    const isSelected = selected === state.uf;
                    const covered =
                      coverage && current?.coverage.includes(state.uf);
                    return (
                      <path
                        key={state.uf}
                        d={state.path}
                        fill={
                          isSelected
                            ? '#FAB515'
                            : covered
                              ? '#FAB515'
                              : count
                                ? '#0D518E'
                                : '#E7E7E7'
                        }
                        fillOpacity={
                          isSelected
                            ? 0.9
                            : covered
                              ? 0.3
                              : count
                                ? 0.18 + (0.62 * count) / highest
                                : 0.95
                        }
                        stroke="#0D518E"
                        strokeOpacity=".3"
                        strokeWidth={1.2}
                        vectorEffect="non-scaling-stroke"
                        fillRule="evenodd"
                      >
                        <title>
                          {state.name}
                          {center
                            ? ` · ${center.name}: ${count} ocorrência(s)`
                            : ''}
                        </title>
                      </path>
                    );
                  })}
                </g>
                {map.states
                  .filter(
                    (state) =>
                      !DISTRIBUTION_CENTERS.some(
                        (center) => center.code === state.uf,
                      ),
                  )
                  .map((state) => (
                    <text
                      key={state.uf}
                      x={state.anchor.x}
                      y={state.anchor.y}
                      textAnchor="middle"
                      fill="#454444"
                      fontSize={10}
                      fontWeight={700}
                      opacity={0.6}
                      pointerEvents="none"
                    >
                      {state.uf}
                    </text>
                  ))}
                {DISTRIBUTION_CENTERS.map((center) => {
                  const state = map.states.find(
                    (item) => item.uf === center.code,
                  );
                  if (!state) return null;
                  const count =
                    stats.centers.find((item) => item.code === center.code)
                      ?.count || 0;
                  const chosen = selected === center.code;
                  return (
                    <g
                      key={center.code}
                      data-map-center="true"
                      role="button"
                      tabIndex={0}
                      aria-label={`${center.name}: ${count} ocorrência(s)`}
                      aria-pressed={chosen}
                      onClick={() => setSelected(center.code)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelected(center.code);
                        }
                      }}
                      className="cd-map-pin cursor-pointer"
                      transform={`translate(${state.anchor.x} ${state.anchor.y})`}
                    >
                      <title>
                        {center.name} · {count} ocorrência(s)
                      </title>
                      <circle
                        r={chosen ? 26 : 23}
                        fill="#FAB515"
                        opacity={chosen ? 0.35 : 0.2}
                      />
                      <circle
                        r={18}
                        fill={chosen ? '#FAB515' : '#0D518E'}
                        stroke="#E7E7E7"
                        strokeWidth={3}
                      />
                      <text
                        y={4}
                        textAnchor="middle"
                        fontSize={12}
                        fontWeight={900}
                        fill={chosen ? '#454444' : '#E7E7E7'}
                        pointerEvents="none"
                      >
                        {center.code}
                      </text>
                      <rect
                        x={10}
                        y={-26}
                        width={Math.max(24, String(count).length * 8 + 14)}
                        height={20}
                        rx={10}
                        fill="#FAB515"
                        stroke="#E7E7E7"
                        strokeWidth={2}
                      />
                      <text
                        x={10 + Math.max(24, String(count).length * 8 + 14) / 2}
                        y={-12}
                        textAnchor="middle"
                        fontSize={11}
                        fontWeight={900}
                        fill="#454444"
                        pointerEvents="none"
                      >
                        {count}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          )}
          <div className="space-y-2 border-t border-fotus-blue/10 px-5 py-3">
            <div className="flex flex-wrap items-center gap-3 text-[10px] text-fotus-ink/80">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-fotus-blue" />
                Mais azul = mais ocorrências
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-fotus-yellow" />
                CD selecionado
              </span>
            </div>
            <p className="text-[10px] leading-relaxed text-fotus-ink/80">
              Marcadores representam a UF do CD. Base cartográfica:{' '}
              <a
                className="font-bold text-fotus-blue underline"
                href="https://servicodados.ibge.gov.br/api/docs/malhas?versao=3"
                target="_blank"
                rel="noreferrer"
              >
                IBGE
              </a>
              .
            </p>
          </div>
        </section>

        <aside className="space-y-3">
          {current ? (
            <div className="fotus-glass rounded-2xl border-fotus-yellow/60 p-4">
              <div className="flex items-center gap-2">
                <span className="rounded-xl bg-fotus-yellow/35 p-2">
                  <Warehouse className="h-5 w-5 text-fotus-blue" />
                </span>
                <div>
                  <h3 className="text-sm font-extrabold">{current.name}</h3>
                  <p className="text-[10px] text-fotus-ink/80">
                    {stats.identified
                      ? (
                          (current.count / stats.identified) *
                          100
                        ).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
                      : '0'}
                    % das ocorrências com CD informado
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Total', value: current.count },
                  { label: 'Em aberto', value: current.open },
                  { label: 'Finalizadas', value: current.finalized },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl bg-fotus-neutral/75 p-2"
                  >
                    <strong className="block text-lg text-fotus-blue">
                      {item.value}
                    </strong>
                    <span className="text-[10px]">{item.label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs">
                Custo registrado de avarias:{' '}
                <strong>{money(current.damageAmount)}</strong>
              </p>
              <label className="mt-3 flex items-center gap-2 text-xs font-bold">
                <input
                  type="checkbox"
                  checked={coverage}
                  onChange={(event) => setCoverage(event.target.checked)}
                  className="accent-fotus-blue"
                />
                Destacar UFs de cobertura
              </label>
              <p className="mt-1 text-[10px] leading-relaxed text-fotus-ink/80">
                {current.coverage.join(' · ')} · A cobertura não determina a
                origem do pedido.
              </p>
              <button
                type="button"
                onClick={() => onFilter(current.code)}
                className="fotus-action mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-extrabold"
              >
                Ver cards deste CD
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-fotus-yellow/50 bg-fotus-yellow/15 p-4">
              <h3 className="text-sm font-extrabold">
                De onde vêm as ocorrências?
              </h3>
              <p className="mt-1 text-xs leading-relaxed">
                Selecione um marcador ou um CD na lista para ver os detalhes e
                abrir seus cards.
              </p>
            </div>
          )}

          <div className="fotus-glass rounded-2xl p-4">
            <h3 className="text-sm font-extrabold">Ocorrências por CD</h3>
            <p className="mt-1 text-[10px] text-fotus-ink/80">
              Contagem de registros no filtro atual; não considera o volume de
              pedidos expedidos.
            </p>
            <div className="mt-3 space-y-1.5">
              {stats.centers.map((center, index) => (
                <button
                  key={center.code}
                  type="button"
                  onClick={() => setSelected(center.code)}
                  aria-pressed={selected === center.code}
                  className={`w-full rounded-xl border p-2.5 text-left transition-colors ${selected === center.code ? 'border-fotus-yellow bg-fotus-yellow/20' : 'border-transparent hover:border-fotus-blue/15 hover:bg-fotus-blue/5'}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-fotus-ink/65">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 text-xs font-bold">
                      {center.name}
                    </span>
                    <strong className="text-sm text-fotus-blue">
                      {center.count}
                    </strong>
                  </span>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-fotus-blue/8">
                    <span
                      className="block h-full rounded-full bg-fotus-blue"
                      style={{ width: `${(center.count / highest) * 100}%` }}
                    />
                  </span>
                </button>
              ))}
            </div>
          </div>
          {stats.missing > 0 && (
            <button
              type="button"
              onClick={() => onFilter('missing')}
              className="w-full rounded-2xl border border-fotus-yellow/45 bg-fotus-yellow/15 p-3 text-left text-xs"
            >
              <strong>{stats.missing} card(s) sem CD de origem</strong>
              <span className="mt-1 block text-[10px]">
                Clique para preencher os cards antigos e completar o mapa.
              </span>
            </button>
          )}
        </aside>
      </div>
    </ExperienceDialog>
  );
}
