export type CaseStatus = 'Aberto' | 'Em Andamento' | 'Resolvido' | 'Cancelado';

export type Department = string;

export interface ExtraCostItem {
  id: string;
  description: string;
  amount: number;
}

export interface CXCase {
  id: string;
  orderNumber: string;
  productCode: string;
  quantity: number;
  isReplacement: boolean;
  status: CaseStatus;
  assigneeEmail: string | null;
  assigneeName: string | null;
  organizationUnitId?: string | null;
  targetDepartment?: string | null;
  targetTeam?: string | null;
  targetRegional?: string | null;
  departmentAssigneeName?: string | null;
  departmentAssigneeEmail?: string | null;
  escalationLeaderName?: string | null;
  escalationLeaderEmail?: string | null;
  extraCosts?: ExtraCostItem[];
  totalExtraCost?: number;
  extraCostReason?: string;
  observations: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface RACase {
  id: string;
  raNumber: string;
  customerName: string;
  phone: string;
  email: string;
  information: string;
  status: CaseStatus;
  indicatorIR?: number | null;
  indicatorIS?: number | null;
  indicatorMA?: number | null;
  indicatorIN?: number | null;
  finalScore?: number | null;
  assigneeEmail: string | null;
  assigneeName: string | null;
  createdByEmail?: string;
  createdByName?: string;
  createdAt: number;
  updatedAt: number;
}

export type VisitStatus = 'Agendada' | 'Em Andamento' | 'Concluída' | 'Cancelada';

export interface IntegratorVisit {
  id: string;
  integratorName: string;
  contactPerson: string;
  contactPhone?: string;
  contactEmail?: string;
  cityState?: string;
  visitDate: string;
  visitTime?: string;
  hostName: string;
  hostEmail?: string;
  objective: string;
  participantsCount?: number;
  status: VisitStatus;
  notes?: string;
  feedback?: string;
  createdByEmail?: string;
  createdByName?: string;
  createdAt: number;
  updatedAt: number;
}

export interface OrganizationUnit {
  id: string;
  department: string;
  teamName: string;
  regional: string;
  managerName: string;
  managerEmail: string;
  leaderName: string;
  leaderEmail: string;
  coordinatorName?: string;
  coordinatorEmail?: string;
  active: boolean;
  createdByEmail: string;
  createdAt: number;
  updatedAt: number;
}

export type OrganizationRole = 'Head' | 'Gerente' | 'Coordenador' | 'Líder';

export interface OrganizationPerson {
  id: string;
  name: string;
  email: string;
  role: OrganizationRole;
  reportsToId?: string | null;
  reportsToName?: string | null;
  department?: string;
  regional?: string;
  active: boolean;
  createdByEmail: string;
  createdAt: number;
  updatedAt: number;
}

export type OccurrenceStage = 'Recebida' | 'Em Análise' | 'Aguardando Retorno' | 'Finalizada';
export type OccurrenceApproval = 'Pendente' | 'Aprovado' | 'Reprovado';

export interface Occurrence {
  id: string;
  date: string;
  agentName: string;
  companyName: string;
  state: string;
  region: string;
  orderNumber: string;
  uniqueNumber: string;
  sacCode: string;
  occurrenceType: string;
  product: string;
  quantity: number;
  stage: OccurrenceStage;
  approvalStatus: OccurrenceApproval;
  carrier: string;
  comments: string;
  consultant: string;
  isDamage?: boolean;
  damageAmount?: number;
  city?: string;
  organizationUnitId?: string | null;
  routedToName?: string | null;
  routedToEmail?: string | null;
  createdByEmail: string;
  createdByName: string;
  importSource?: string;
  importRow?: number;
  createdAt: number;
  updatedAt: number;
}

export type AppSection = 'visao-geral' | 'ocorrencias' | 'custos' | 'ra' | 'visitas' | 'estrutura';
export type UserAccessRole = 'Agente' | 'Gerente' | 'Líder' | 'Coordenador' | 'Administrador';

export interface UserAccessProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserAccessRole;
  agentName?: string;
  organizationUnitIds: string[];
  visibleTabs: AppSection[];
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export type ExtraCostResponsible = 'Comercial' | 'Cliente';

export interface ExtraCost {
  id: string;
  date: string;
  orderNumber: string;
  regional: string;
  product: string;
  quantity: number;
  origin: string;
  productCost: number;
  logisticsCost: number;
  taxCost: number;
  totalCost: number;
  responsible: ExtraCostResponsible;
  reasonCategory: string;
  detailedReason: string;
  monthYear: string;
  createdByEmail: string;
  createdByName: string;
  importSource?: string;
  importRow?: number;
  createdAt: number;
  updatedAt: number;
}
