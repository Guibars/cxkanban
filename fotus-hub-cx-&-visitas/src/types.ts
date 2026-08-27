export type CaseStatus = 'Aberto' | 'Em Andamento' | 'Resolvido' | 'Cancelado';

export type Department = 
  | 'Logística' 
  | 'Financeiro' 
  | 'Suporte Técnico' 
  | 'Diretoria' 
  | 'Coordenação' 
  | 'Liderança';

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
  targetDepartment?: Department | null;
  departmentAssigneeName?: string | null;
  departmentAssigneeEmail?: string | null;
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
  visitDate: string; // YYYY-MM-DD
  visitTime?: string; // HH:mm
  hostName: string;
  hostEmail?: string;
  objective: string;
  participantsCount?: number;
  status: VisitStatus;
  notes?: string;
  feedback?: string;
  createdAt: number;
  updatedAt: number;
}
