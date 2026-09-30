import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crown,
  GripVertical,
  LayoutGrid,
  List,
  Mail,
  MapPinned,
  Network,
  Pencil,
  Phone,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  UserCog,
  Users,
  X,
} from "lucide-react";
import type { OrganizationPerson, OrganizationRole } from "../types";
import {
  ORGANIZATION_ROLES,
  ORGANIZATION_SUPERVISORS,
  organizationAncestors,
  organizationConsultantCounts,
  organizationScope,
} from "../lib/organization";

interface Props {
  people: OrganizationPerson[];
  canManage: boolean;
  canCreate: boolean;
  canDelete: boolean;
  moving: boolean;
  onCreate: (role?: OrganizationRole) => void;
  onEdit: (person: OrganizationPerson) => void;
  onDelete: (person: OrganizationPerson) => void;
  onMove: (sourceId: string, targetId: string) => Promise<void>;
}

type RoleFilter = "liderancas" | "todos" | OrganizationRole;
type StatusFilter = "active" | "all" | "inactive";
const PAGE_SIZE = 18;
const UNASSIGNED = "__unassigned__";
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
const byOrder = (a: OrganizationPerson, b: OrganizationPerson) =>
  (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
  a.name.localeCompare(b.name, "pt-BR");
const ROLE_CONFIG: Record<
  OrganizationRole,
  { plural: string; icon: typeof Users; color: string; surface: string }
> = {
  Head: {
    plural: "Heads",
    icon: Crown,
    color: "text-violet-700",
    surface: "bg-violet-50",
  },
  Gerente: {
    plural: "Gerentes",
    icon: BriefcaseBusiness,
    color: "text-blue-700",
    surface: "bg-blue-50",
  },
  Coordenador: {
    plural: "Coordenadores",
    icon: UserCog,
    color: "text-amber-700",
    surface: "bg-amber-50",
  },
  Líder: {
    plural: "Líderes",
    icon: Network,
    color: "text-emerald-700",
    surface: "bg-emerald-50",
  },
  Consultor: {
    plural: "Consultores",
    icon: Users,
    color: "text-cyan-700",
    surface: "bg-cyan-50",
  },
};

function Avatar({
  person,
  large = false,
}: {
  person: OrganizationPerson;
  large?: boolean;
}) {
  const initials = person.name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .filter((_, index, all) => index === 0 || index === all.length - 1)
    .join("")
    .toUpperCase();
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center rounded-2xl bg-[#edf2e8] font-extrabold text-[#385041] ${large ? "h-20 w-20 text-xl" : "h-14 w-14 text-base"}`}
    >
      {person.photoUrl ? (
        <img
          src={person.photoUrl}
          alt={`Foto de ${person.name}`}
          draggable={false}
          loading="lazy"
          className="h-full w-full rounded-2xl object-cover"
        />
      ) : (
        initials
      )}
      <span
        title={person.active ? "Ativo na estrutura" : "Inativo na estrutura"}
        className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white ${person.active ? "bg-emerald-500" : "bg-slate-300"}`}
      />
    </span>
  );
}

export default function OrganizationDirectory({
  people,
  canManage,
  canCreate,
  canDelete,
  moving,
  onCreate,
  onEdit,
  onDelete,
  onMove,
}: Props) {
  const [search, setSearch] = useState("");
  const [scopeId, setScopeId] = useState("");
  const [scopeMode, setScopeMode] = useState<"direct" | "all">("direct");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("liderancas");
  const [regional, setRegional] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [mobileNavigation, setMobileNavigation] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const byId = useMemo(
    () => new Map(people.map((person) => [person.id, person])),
    [people],
  );
  const selected = byId.get(scopeId);
  const detail = detailId ? byId.get(detailId) : undefined;
  const dragged = draggedId ? byId.get(draggedId) : undefined;
  const consultantCounts = useMemo(
    () => organizationConsultantCounts(people),
    [people],
  );
  const directReports = useMemo(() => {
    const result = new Map<string, OrganizationPerson[]>();
    people.forEach((person) => {
      if (!person.reportsToId) return;
      const children = result.get(person.reportsToId) || [];
      children.push(person);
      result.set(person.reportsToId, children);
    });
    result.forEach((children) => children.sort(byOrder));
    return result;
  }, [people]);
  const regions = useMemo(
    () =>
      [
        ...new Set(
          people.flatMap((person) =>
            (person.regional || "")
              .split(",")
              .map((part) => part.trim())
              .filter(Boolean),
          ),
        ),
      ].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [people],
  );
  const leadership = useMemo(
    () =>
      people
        .filter((person) => person.role !== "Consultor")
        .sort(
          (a, b) =>
            ORGANIZATION_ROLES.indexOf(a.role) -
              ORGANIZATION_ROLES.indexOf(b.role) || byOrder(a, b),
        ),
    [people],
  );
  const leadershipIds = useMemo(
    () => new Set(leadership.map((person) => person.id)),
    [leadership],
  );
  const roots = leadership.filter(
    (person) => !person.reportsToId || !leadershipIds.has(person.reportsToId),
  );
  const unassignedCount = people.filter(
    (person) =>
      person.active &&
      person.role === "Consultor" &&
      (!person.reportsToId || !byId.has(person.reportsToId)),
  ).length;
  const ancestors = selected
    ? organizationAncestors(selected, byId).reverse()
    : [];
  const scopeIds = useMemo(() => {
    if (!selected) return null;
    if (scopeMode === "direct")
      return new Set(
        (directReports.get(selected.id) || []).map((person) => person.id),
      );
    const branch = organizationScope(people, selected.id) || new Set<string>();
    organizationAncestors(selected, byId).forEach((person) =>
      branch.delete(person.id),
    );
    branch.delete(selected.id);
    return branch;
  }, [selected, scopeMode, directReports, people, byId]);
  const filtered = useMemo(() => {
    const query = normalize(search.trim());
    return people
      .filter((person) => {
        if (
          scopeId === UNASSIGNED &&
          (person.role !== "Consultor" ||
            (person.reportsToId && byId.has(person.reportsToId)))
        )
          return false;
        if (scopeIds && !scopeIds.has(person.id)) return false;
        if (
          (status === "active" && !person.active) ||
          (status === "inactive" && person.active)
        )
          return false;
        if (
          regional &&
          !(person.regional || "")
            .split(",")
            .some((part) => part.trim() === regional)
        )
          return false;
        if (roleFilter === "liderancas" && person.role === "Consultor")
          return false;
        if (
          roleFilter !== "todos" &&
          roleFilter !== "liderancas" &&
          person.role !== roleFilter
        )
          return false;
        if (!query) return true;
        return [
          person.name,
          person.email,
          person.phone || "",
          person.jobTitle || "",
          person.teamName || "",
          person.regional || "",
          person.department || "",
          person.reportsToName || "",
          person.role,
          ...organizationAncestors(person, byId).flatMap((parent) => [
            parent.name,
            parent.email,
          ]),
        ].some((value) => normalize(value || "").includes(query));
      })
      .sort(
        (a, b) =>
          ORGANIZATION_ROLES.indexOf(a.role) -
            ORGANIZATION_ROLES.indexOf(b.role) || byOrder(a, b),
      );
  }, [people, search, scopeId, scopeIds, status, regional, roleFilter, byId]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const activeCount = people.filter((person) => person.active).length;
  const teamCount = new Set(
    people
      .filter((person) => person.active && person.teamName)
      .map((person) => person.teamName),
  ).size;
  const displayRoles = ORGANIZATION_ROLES.filter(
    (role) =>
      role !== "Head" || people.some((person) => person.role === "Head"),
  );
  const hasFilters = Boolean(
    search ||
      regional ||
      scopeId ||
      roleFilter !== "liderancas" ||
      status !== "active",
  );

  useEffect(() => {
    setPage(1);
  }, [search, scopeId, scopeMode, roleFilter, regional, status]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (detail && dialog && !dialog.open) dialog.showModal();
    if (!detail && dialog?.open) dialog.close();
  }, [detail]);

  const reset = () => {
    setSearch("");
    setScopeId("");
    setRoleFilter("liderancas");
    setRegional("");
    setStatus("active");
    setScopeMode("direct");
    setPage(1);
  };
  const browse = (id: string) => {
    setScopeId(id);
    setScopeMode("direct");
    setRoleFilter("todos");
    setSearch("");
    setRegional("");
    setStatus("active");
    setPage(1);
    setMobileNavigation(false);
    const person = byId.get(id);
    if (person)
      setExpanded(
        (current) =>
          new Set([
            ...current,
            person.id,
            ...organizationAncestors(person, byId).map((parent) => parent.id),
          ]),
      );
  };
  const chooseRole = (role: RoleFilter) => {
    setRoleFilter(role);
    setScopeId("");
    setSearch("");
    setRegional("");
    setStatus("active");
    setPage(1);
  };
  const changePage = (next: number) => {
    setPage(Math.max(1, Math.min(next, totalPages)));
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const eligibleDrop = (target: OrganizationPerson) =>
    Boolean(
      canManage &&
        !moving &&
        dragged &&
        dragged.id !== target.id &&
        dragged.reportsToId !== target.id &&
        (dragged.role === target.role ||
          (target.active &&
            ORGANIZATION_SUPERVISORS[dragged.role]?.includes(target.role))),
    );
  const move = async (source: string, target: string) => {
    await onMove(source, target);
    setDraggedId(null);
  };

  const treeNode = (
    person: OrganizationPerson,
    path: Set<string>,
    depth = 0,
  ): ReactNode => {
    if (path.has(person.id)) return null;
    const nextPath = new Set([...path, person.id]);
    const children = (directReports.get(person.id) || []).filter(
      (child) => child.role !== "Consultor",
    );
    const isOpen = expanded.has(person.id);
    const isSelected = scopeId === person.id;
    const config = ROLE_CONFIG[person.role];
    const Icon = config.icon;
    return (
      <div
        key={person.id}
        className={depth ? "ml-4 border-l border-slate-200 pl-2" : ""}
      >
        <div
          onDragOver={(event) => {
            if (eligibleDrop(person)) {
              event.preventDefault();
              event.stopPropagation();
              event.dataTransfer.dropEffect = "move";
            }
          }}
          onDrop={(event) => {
            if (eligibleDrop(person)) {
              event.preventDefault();
              event.stopPropagation();
              void move(event.dataTransfer.getData("text/plain"), person.id);
            }
          }}
          className={`my-1 flex items-center gap-1 rounded-xl p-1 transition-colors ${eligibleDrop(person) ? "bg-[#eef6e6] ring-1 ring-[#92b976]" : isSelected ? "bg-[#e9f1e3]" : "hover:bg-slate-50"}`}
        >
          <button
            type="button"
            disabled={!children.length}
            onClick={() =>
              setExpanded((current) => {
                const next = new Set(current);
                if (next.has(person.id)) next.delete(person.id);
                else next.add(person.id);
                return next;
              })
            }
            aria-label={`${isOpen ? "Recolher" : "Expandir"} equipe de ${person.name}`}
            aria-expanded={children.length ? isOpen : undefined}
            className="flex h-7 w-6 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-white disabled:invisible"
          >
            {isOpen ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => browse(person.id)}
            aria-current={isSelected ? "page" : undefined}
            className="flex min-w-0 flex-1 items-start gap-2 rounded-lg py-2 pr-2 text-left"
          >
            <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${config.color}`} />
            <span className="min-w-0 flex-1">
              <strong
                className={`block text-[11px] leading-relaxed ${isSelected ? "text-[#27402d]" : "text-slate-700"}`}
              >
                {person.name}
              </strong>
              <span className="mt-0.5 block text-[10px] text-slate-400">
                {person.role}
                {!person.active ? " · Inativo" : ""}
              </span>
            </span>
            {(consultantCounts.get(person.id) || 0) > 0 && (
              <span className="mt-0.5 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                {consultantCounts.get(person.id)}
              </span>
            )}
          </button>
        </div>
        {isOpen &&
          children.map((child) => treeNode(child, nextPath, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-[#385041]/10 bg-white shadow-sm">
        <div className="flex flex-col gap-5 bg-gradient-to-br from-[#f1f6eb] via-white to-[#f4f7fa] p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#58704d]">
              <Network className="h-4 w-4" />
              Estrutura organizacional
            </span>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Pessoas, lideranças e equipes
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Encontre um contato ou navegue pela estrutura para conhecer cada
              equipe.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span>
                <strong className="text-slate-800">{activeCount}</strong>{" "}
                pessoas ativas
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>
                <strong className="text-slate-800">{teamCount}</strong> equipes
                cadastradas
              </span>
            </div>
          </div>
          {canCreate && (
            <button
              type="button"
              onClick={() => onCreate()}
              className="inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-[#385041] px-5 py-3 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#2b4033]"
            >
              <Plus className="h-4 w-4" />
              Cadastrar pessoa
            </button>
          )}
        </div>
        <div
          className={`grid grid-cols-2 gap-3 border-t border-slate-100 p-4 sm:p-6 ${displayRoles.length === 5 ? "sm:grid-cols-3 xl:grid-cols-5" : "xl:grid-cols-4"}`}
        >
          {displayRoles.map((role) => {
            const config = ROLE_CONFIG[role];
            const Icon = config.icon;
            const count = people.filter(
              (person) => person.role === role && person.active,
            ).length;
            const isSelected = !scopeId && roleFilter === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => chooseRole(role)}
                aria-pressed={isSelected}
                className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm ${isSelected ? "border-[#385041]/30 bg-[#f2f6ed] ring-1 ring-[#385041]/10" : "border-slate-100 bg-white hover:border-slate-200"}`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.surface} ${config.color}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-xl font-extrabold text-slate-900">
                    {count}
                  </strong>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {config.plural}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm xl:sticky xl:top-6">
          <div className="hidden p-5 xl:block">
            <h3 className="text-sm font-bold text-slate-900">
              Navegar pela estrutura
            </h3>
            <p className="mt-1 text-[11px] text-slate-400">
              Escolha um responsável
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMobileNavigation((current) => !current)}
            aria-expanded={mobileNavigation}
            aria-controls="organization-hierarchy"
            className="flex w-full items-center justify-between p-5 text-left xl:hidden"
          >
            <span>
              <strong className="block text-sm text-slate-900">
                Navegar pela estrutura
              </strong>
              <span className="mt-1 block text-[11px] text-slate-400">
                Escolha um responsável
              </span>
            </span>
            <ChevronDown
              className={`h-4 w-4 text-slate-400 ${mobileNavigation ? "rotate-180" : ""}`}
            />
          </button>
          <nav
            id="organization-hierarchy"
            aria-label="Hierarquia da empresa"
            className={`${mobileNavigation ? "block" : "hidden"} border-t border-slate-100 p-3 xl:block`}
          >
            <button
              type="button"
              onClick={reset}
              className={`mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-xs font-bold ${!scopeId ? "bg-[#385041] text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <Building2 className="h-4 w-4" />
              Visão da empresa
            </button>
            <div className="max-h-[60vh] overflow-y-auto pr-1">
              {roots.map((person) => treeNode(person, new Set()))}
              {!roots.length && (
                <p className="p-3 text-xs leading-relaxed text-slate-400">
                  As lideranças aparecerão aqui após o cadastro.
                </p>
              )}
            </div>
            {unassignedCount > 0 && (
              <button
                type="button"
                onClick={() => browse(UNASSIGNED)}
                className={`mt-3 flex w-full items-center justify-between rounded-xl border px-3 py-3 text-[11px] font-semibold ${scopeId === UNASSIGNED ? "border-amber-300 bg-amber-50 text-amber-800" : "border-slate-100 text-slate-500 hover:bg-slate-50"}`}
              >
                <span>Consultores sem responsável</span>
                <span className="rounded-md bg-amber-50 px-2 py-0.5 font-bold text-amber-700">
                  {unassignedCount}
                </span>
              </button>
            )}
          </nav>
        </aside>

        <section ref={resultsRef} className="min-w-0 scroll-mt-6 space-y-5">
          <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    if (roleFilter === "liderancas") setRoleFilter("todos");
                  }}
                  placeholder="Buscar nome, e-mail, telefone ou equipe"
                  aria-label="Buscar pessoas"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3 pl-11 pr-4 text-xs outline-none transition-colors focus:border-[#385041] focus:bg-white focus:ring-2 focus:ring-[#385041]/10"
                />
              </label>
              <div
                className="flex shrink-0 rounded-xl border border-slate-200 p-1"
                role="group"
                aria-label="Visualização dos resultados"
              >
                <button
                  type="button"
                  onClick={() => setView("grid")}
                  aria-pressed={view === "grid"}
                  title="Visualizar em grade"
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold ${view === "grid" ? "bg-[#385041] text-white" : "text-slate-500 hover:bg-slate-50"}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                  Grade
                </button>
                <button
                  type="button"
                  onClick={() => setView("list")}
                  aria-pressed={view === "list"}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold ${view === "list" ? "bg-[#385041] text-white" : "text-slate-500 hover:bg-slate-50"}`}
                >
                  <List className="h-4 w-4" />
                  Lista
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <SlidersHorizontal className="mr-1 hidden h-3.5 w-3.5 text-slate-400 sm:block" />
              <select
                value={roleFilter}
                onChange={(event) =>
                  setRoleFilter(event.target.value as RoleFilter)
                }
                aria-label="Filtrar por função"
                className="max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600"
              >
                <option value="liderancas">Lideranças</option>
                <option value="todos">Todas as funções</option>
                {ORGANIZATION_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_CONFIG[role].plural}
                  </option>
                ))}
              </select>
              <select
                value={regional}
                onChange={(event) => setRegional(event.target.value)}
                aria-label="Filtrar por regional"
                className="max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600"
              >
                <option value="">Todas as regionais</option>
                {regions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as StatusFilter)
                }
                aria-label="Filtrar por situação"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600"
              >
                <option value="active">Pessoas ativas</option>
                <option value="all">Ativas e inativas</option>
                <option value="inactive">Pessoas inativas</option>
              </select>
              {hasFilters && (
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-[11px] font-bold text-slate-500 hover:bg-slate-50"
                >
                  <X className="h-3 w-3" />
                  Limpar filtros
                </button>
              )}
            </div>
          </div>

          {selected && (
            <div className="rounded-2xl border border-[#385041]/15 bg-[#f4f7ef] p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                <button
                  type="button"
                  onClick={reset}
                  className="font-bold hover:text-[#385041]"
                >
                  Empresa
                </button>
                {[...ancestors, selected].map((person) => (
                  <span
                    key={person.id}
                    className="inline-flex items-center gap-1.5"
                  >
                    <ChevronRight className="h-3 w-3 text-slate-300" />
                    <button
                      type="button"
                      onClick={() => browse(person.id)}
                      className={`max-w-48 truncate hover:text-[#385041] ${person.id === selected.id ? "font-bold text-[#385041]" : ""}`}
                      title={person.name}
                    >
                      {person.name}
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Avatar person={selected} />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#6b805e]">
                    Equipe de {selected.role.toLocaleLowerCase("pt-BR")}
                  </p>
                  <h3 className="mt-1 text-lg font-extrabold text-slate-900">
                    {selected.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {
                      (directReports.get(selected.id) || []).filter(
                        (person) => person.active,
                      ).length
                    }{" "}
                    pessoas diretamente vinculadas ·{" "}
                    {consultantCounts.get(selected.id) || 0} consultores na
                    estrutura
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailId(selected.id)}
                  className="w-fit rounded-xl border border-[#385041]/15 bg-white px-4 py-2.5 text-xs font-bold text-[#385041] hover:bg-[#edf3e6]"
                >
                  Ver contato
                </button>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setScopeMode("direct")}
                  aria-pressed={scopeMode === "direct"}
                  className={`rounded-lg px-3 py-2 text-[11px] font-bold ${scopeMode === "direct" ? "bg-[#385041] text-white" : "bg-white text-slate-500"}`}
                >
                  Equipe direta
                </button>
                <button
                  type="button"
                  onClick={() => setScopeMode("all")}
                  aria-pressed={scopeMode === "all"}
                  className={`rounded-lg px-3 py-2 text-[11px] font-bold ${scopeMode === "all" ? "bg-[#385041] text-white" : "bg-white text-slate-500"}`}
                >
                  Toda a estrutura abaixo
                </button>
                <button
                  type="button"
                  onClick={() =>
                    selected.reportsToId && byId.has(selected.reportsToId)
                      ? browse(selected.reportsToId)
                      : reset()
                  }
                  className="ml-auto inline-flex items-center gap-1.5 px-2 text-[11px] font-bold text-slate-500"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Voltar um nível
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                {scopeId === UNASSIGNED
                  ? "Consultores sem responsável"
                  : selected
                    ? "Pessoas desta equipe"
                    : roleFilter === "liderancas"
                      ? "Conheça as lideranças"
                      : roleFilter === "todos"
                        ? "Diretório de pessoas"
                        : ROLE_CONFIG[roleFilter].plural}
              </h3>
              <p className="mt-1 text-[11px] text-slate-400">
                {filtered.length}{" "}
                {filtered.length === 1
                  ? "pessoa encontrada"
                  : "pessoas encontradas"}
                {filtered.length > PAGE_SIZE
                  ? ` · Página ${currentPage} de ${totalPages}`
                  : ""}
              </p>
            </div>
            {moving && (
              <span
                role="status"
                className="rounded-full bg-[#edf4e6] px-3 py-1.5 text-[11px] font-semibold text-[#385041]"
              >
                Salvando movimentação…
              </span>
            )}
          </div>
          {dragged && (
            <p
              role="status"
              className="rounded-xl border border-[#385041]/20 bg-[#f2f7ec] px-4 py-3 text-xs text-[#385041]"
            >
              Movendo <strong>{dragged.name}</strong>. Os cards destacados
              aceitam a movimentação.
            </p>
          )}

          <div
            className={
              view === "grid"
                ? "grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 2xl:grid-cols-3"
                : "space-y-4"
            }
          >
            {visible.map((person) => {
            const siblings = filtered
                .filter((sibling) => sibling.role === person.role)
                .sort(byOrder);
              const index = siblings.findIndex(
                (sibling) => sibling.id === person.id,
              );
              return (
                <PersonCard
                  key={person.id}
                  person={person}
                  supervisor={
                    person.reportsToId
                      ? byId.get(person.reportsToId)
                      : undefined
                  }
                  view={view}
                  canManage={canManage}
                  canDelete={canDelete}
                  moving={moving}
                  isDragged={draggedId === person.id}
                  acceptsDrop={eligibleDrop(person)}
                  directCount={
                    (directReports.get(person.id) || []).filter(
                      (child) => child.active,
                    ).length
                  }
                  consultantCount={consultantCounts.get(person.id) || 0}
                  onDetail={() => setDetailId(person.id)}
                  onBrowse={() => browse(person.id)}
                  onSupervisor={() =>
                    person.reportsToId && browse(person.reportsToId)
                  }
                  onEdit={() => onEdit(person)}
                  onDelete={() => onDelete(person)}
                  onUp={
                    index > 0
                      ? () => void move(person.id, siblings[index - 1].id)
                      : undefined
                  }
                  onDown={
                    index < siblings.length - 1
                      ? () => void move(siblings[index + 1].id, person.id)
                      : undefined
                  }
                  onDragStart={() => setDraggedId(person.id)}
                  onDragEnd={() => setDraggedId(null)}
                  onDrop={(source) => void move(source, person.id)}
                />
              );
            })}
          </div>
          {!visible.length && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
              <Users className="mx-auto h-10 w-10 text-slate-200" />
              <h4 className="mt-4 text-sm font-bold text-slate-700">
                {people.length
                  ? "Nenhuma pessoa nesta seleção"
                  : "Sua estrutura começa aqui"}
              </h4>
              <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-400">
                {people.length
                  ? "Ajuste a busca e os filtros ou selecione outra equipe na navegação."
                  : "Cadastre os responsáveis e suas equipes para começar a navegar."}
              </p>
              {people.length ? (
                <button
                  type="button"
                  onClick={reset}
                  className="mt-5 rounded-xl bg-[#edf3e6] px-4 py-2.5 text-xs font-bold text-[#385041]"
                >
                  Ver lideranças
                </button>
              ) : (
                canCreate && (
                  <button
                    type="button"
                    onClick={() => onCreate()}
                    className="mt-5 rounded-xl bg-[#385041] px-4 py-2.5 text-xs font-bold text-white"
                  >
                    Cadastrar primeira pessoa
                  </button>
                )
              )}
            </div>
          )}
          {filtered.length > PAGE_SIZE && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white px-5 py-4">
              <p className="text-[11px] text-slate-500">
                Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, filtered.length)} de{" "}
                {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => changePage(currentPage - 1)}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Anterior
                </button>
                <span className="px-2 text-xs font-bold text-slate-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => changePage(currentPage + 1)}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                >
                  Próxima
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
          {canManage && (
            <p className="px-1 text-[11px] leading-relaxed text-slate-400">
              Use as setas dos cards para ajustar a ordem. Arraste sobre outro
              card da mesma função para ordenar ou sobre um responsável,
              inclusive na navegação lateral, para mudar o vínculo.
            </p>
          )}
        </section>
      </div>

      <dialog
        ref={dialogRef}
        onCancel={() => setDetailId(null)}
        onClose={() => setDetailId(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setDetailId(null);
        }}
        aria-labelledby="organization-contact-title"
        className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-3xl border-0 bg-white p-0 text-slate-700 shadow-2xl backdrop:bg-slate-900/45 backdrop:backdrop-blur-sm"
      >
        {detail && (
          <>
            <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <span className="text-xs font-bold text-slate-500">
                Contato e vínculos
              </span>
              <button
                type="button"
                onClick={() => setDetailId(null)}
                aria-label="Fechar contato"
                autoFocus
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-50"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="space-y-6 p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <Avatar person={detail} large />
                <div className="min-w-0">
                  <span
                    className={`inline-block rounded-lg px-2.5 py-1 text-[10px] font-bold ${ROLE_CONFIG[detail.role].surface} ${ROLE_CONFIG[detail.role].color}`}
                  >
                    {detail.role}
                  </span>
                  <h3
                    id="organization-contact-title"
                    className="mt-2 text-xl font-extrabold leading-snug text-slate-900"
                  >
                    {detail.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {detail.jobTitle || detail.role}
                  </p>
                </div>
              </div>
              <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
                {detail.email ? (
                  <a
                    href={`mailto:${detail.email}`}
                    className="flex items-start gap-3 text-xs text-[#385041] hover:underline"
                  >
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="break-all">{detail.email}</span>
                  </a>
                ) : (
                  <p className="text-xs text-slate-400">E-mail não informado</p>
                )}
                {detail.phone ? (
                  <a
                    href={`tel:${detail.phone.replace(/[^\d+]/g, "")}`}
                    className="flex items-center gap-3 text-xs text-[#385041] hover:underline"
                  >
                    <Phone className="h-4 w-4" />
                    {detail.phone}
                  </a>
                ) : (
                  <p className="text-xs text-slate-400">
                    Telefone não informado
                  </p>
                )}
              </div>
              <dl className="grid grid-cols-2 gap-5 text-xs">
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Setor
                  </dt>
                  <dd className="mt-1.5 font-semibold text-slate-700">
                    {detail.department || "Não informado"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Regional
                  </dt>
                  <dd className="mt-1.5 font-semibold text-slate-700">
                    {detail.regional || "Não informada"}
                  </dd>
                </div>
                {detail.teamName && (
                  <div className="col-span-2">
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Equipe
                    </dt>
                    <dd className="mt-1.5 font-semibold text-slate-700">
                      {detail.teamName}
                    </dd>
                  </div>
                )}
              </dl>
              <div>
                <h4 className="text-xs font-bold text-slate-800">
                  Caminho na estrutura
                </h4>
                <div className="mt-3 space-y-2">
                  {[
                    ...organizationAncestors(detail, byId).reverse(),
                    detail,
                  ].map((person, index) => (
                    <button
                      key={person.id}
                      type="button"
                      disabled={
                        person.id === detail.id || person.role === "Consultor"
                      }
                      onClick={() => {
                        setDetailId(null);
                        browse(person.id);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 text-left hover:bg-slate-50 disabled:hover:bg-white"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#edf3e6] text-[10px] font-extrabold text-[#385041]">
                        {index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[11px] font-bold text-slate-700">
                          {person.name}
                        </span>
                        <small className="text-[10px] text-slate-400">
                          {person.role}
                        </small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(directReports.get(detail.id) || []).some(
                  (person) => person.active,
                ) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDetailId(null);
                      browse(detail.id);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#385041] px-4 py-3 text-xs font-bold text-white"
                  >
                    <Users className="h-4 w-4" />
                    Explorar equipe
                  </button>
                )}
                {canManage && (
                  <button
                    type="button"
                    onClick={() => {
                      setDetailId(null);
                      onEdit(detail);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-600"
                  >
                    <Pencil className="h-4 w-4" />
                    Editar pessoa
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}

interface CardProps {
  person: OrganizationPerson;
  supervisor?: OrganizationPerson;
  view: "grid" | "list";
  canManage: boolean;
  canDelete: boolean;
  moving: boolean;
  isDragged: boolean;
  acceptsDrop: boolean;
  directCount: number;
  consultantCount: number;
  onDetail: () => void;
  onBrowse: () => void;
  onSupervisor: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUp?: () => void;
  onDown?: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: (id: string) => void;
}

function PersonCard({
  person,
  supervisor,
  view,
  canManage,
  canDelete,
  moving,
  isDragged,
  acceptsDrop,
  directCount,
  consultantCount,
  onDetail,
  onBrowse,
  onSupervisor,
  onEdit,
  onDelete,
  onUp,
  onDown,
  onDragStart,
  onDragEnd,
  onDrop,
}: CardProps) {
  const config = ROLE_CONFIG[person.role];
  return (
    <article
      draggable={canManage && !moving}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", person.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        if (acceptsDrop) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }
      }}
      onDrop={(event) => {
        if (!acceptsDrop) return;
        event.preventDefault();
        onDrop(event.dataTransfer.getData("text/plain"));
      }}
      className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all ${view === "list" ? "lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]" : ""} ${acceptsDrop ? "border-[#6d9857] bg-[#fcfef8] ring-2 ring-[#92b976]/30" : "border-slate-200/70 hover:border-slate-300 hover:shadow-md"} ${isDragged ? "opacity-40" : ""}`}
    >
      <div className="p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span
            className={`rounded-lg px-2.5 py-1 text-[10px] font-extrabold ${config.surface} ${config.color}`}
          >
            {person.role}
          </span>
          {canManage && (
            <span
              title="Arrastar card"
              className="cursor-grab text-slate-300 active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4" />
            </span>
          )}
        </div>
        <div className="flex items-start gap-4">
          <Avatar person={person} />
          <div className="min-w-0">
            <button
              type="button"
              onClick={onDetail}
              className="text-left text-sm font-extrabold leading-relaxed text-slate-900 hover:text-[#385041]"
            >
              {person.name}
            </button>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              {person.jobTitle || person.role}
            </p>
            {!person.active && (
              <span className="mt-1 inline-block text-[10px] font-bold text-slate-400">
                Inativo na estrutura
              </span>
            )}
          </div>
        </div>
        <div className="mt-5 space-y-2.5">
          {person.email && (
            <a
              href={`mailto:${person.email}`}
              draggable={false}
              className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500 hover:text-[#385041]"
            >
              <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="break-all">{person.email}</span>
            </a>
          )}
          {person.phone && (
            <a
              href={`tel:${person.phone.replace(/[^\d+]/g, "")}`}
              draggable={false}
              className="flex items-center gap-2 text-[11px] text-slate-500 hover:text-[#385041]"
            >
              <Phone className="h-3.5 w-3.5 shrink-0" />
              {person.phone}
            </a>
          )}
          {person.regional && (
            <p className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
              <MapPinned className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              {person.regional}
            </p>
          )}
        </div>
      </div>
      <div
        className={`flex flex-1 flex-col px-5 pb-5 sm:px-6 sm:pb-6 ${view === "list" ? "lg:border-l lg:border-slate-100 lg:pt-6" : ""}`}
      >
        {person.teamName && (
          <p className="mb-3 rounded-xl bg-slate-50 px-3 py-2.5 text-[10px] font-semibold leading-relaxed text-slate-500">
            {person.teamName}
          </p>
        )}
        {person.role !== "Head" && (
          <div className="mb-4 rounded-xl border border-slate-100 px-3 py-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Responsável direto
            </p>
            {supervisor ? (
              <button
                type="button"
                onClick={onSupervisor}
                className="mt-1.5 text-left text-[11px] font-bold leading-relaxed text-[#385041] hover:underline"
              >
                {supervisor.name}
                <span className="ml-1 font-normal text-slate-400">
                  · {supervisor.role}
                </span>
              </button>
            ) : (
              <p className="mt-1.5 text-[11px] text-slate-400">
                {person.reportsToName || "Não informado"}
              </p>
            )}
          </div>
        )}
        {directCount > 0 && (
          <button
            type="button"
            onClick={onBrowse}
            className="mb-4 flex w-full items-center justify-between gap-2 rounded-xl bg-[#f0f5e9] px-3 py-3 text-left text-[#385041]"
          >
            <span>
              <strong className="block text-[11px]">Abrir equipe</strong>
              <span className="mt-0.5 block text-[10px] text-[#758767]">
                {directCount} vínculos diretos
                {consultantCount > 0 ? ` · ${consultantCount} consultores` : ""}
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </button>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onDetail}
            className="text-[11px] font-bold text-[#385041] hover:underline"
          >
            Ver detalhes
          </button>
          <div className="flex items-center gap-1">
            {canManage && (
              <>
                <button
                  type="button"
                  disabled={moving || !onUp}
                  onClick={onUp}
                  aria-label={`Subir ${person.name} na ordem`}
                  title="Subir na ordem"
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-20"
                >
                  <ArrowDown className="h-3.5 w-3.5 rotate-180" />
                </button>
                <button
                  type="button"
                  disabled={moving || !onDown}
                  onClick={onDown}
                  aria-label={`Descer ${person.name} na ordem`}
                  title="Descer na ordem"
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-20"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={moving}
                  onClick={onEdit}
                  aria-label={`Editar ${person.name}`}
                  title="Editar pessoa"
                  className="rounded-lg bg-slate-50 p-2 text-slate-500 hover:bg-[#edf3e6] hover:text-[#385041]"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            {canDelete && (
              <button
                type="button"
                disabled={moving}
                onClick={onDelete}
                aria-label={`Excluir ${person.name}`}
                title="Excluir pessoa"
                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
