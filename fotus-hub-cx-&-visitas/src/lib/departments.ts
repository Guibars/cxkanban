import { Department } from '../types';

export interface DepartmentMember {
  name: string;
  email: string;
  role: string;
  initials: string;
}

export interface DepartmentConfig {
  name: Department;
  label: string;
  description: string;
  badgeColor: string;
  pillBg: string;
  textColor: string;
  borderColor: string;
  members: DepartmentMember[];
}

export const DEPARTMENTS: Record<Department, DepartmentConfig> = {
  'Logística': {
    name: 'Logística',
    label: 'Logística',
    description: 'Expedição, fretes, rastreamento e trocas físicas',
    badgeColor: 'bg-amber-500',
    pillBg: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    members: [
      { name: 'Rafael Lima', email: 'rafael.lima@fotus.com.br', role: 'Coord. Logística', initials: 'RL' },
      { name: 'Amanda Castro', email: 'amanda.castro@fotus.com.br', role: 'Expedição & Rastreio', initials: 'AC' },
      { name: 'Thiago Fretes', email: 'thiago.fretes@fotus.com.br', role: 'Gestão de Frotas & Redespacho', initials: 'TF' }
    ]
  },
  'Financeiro': {
    name: 'Financeiro',
    label: 'Financeiro',
    description: 'Notas fiscais, cobranças, devoluções e estornos',
    badgeColor: 'bg-emerald-500',
    pillBg: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    members: [
      { name: 'Carla Mendes', email: 'carla.mendes@fotus.com.br', role: 'Contas a Receber & Estornos', initials: 'CM' },
      { name: 'Bruno Torres', email: 'bruno.torres@fotus.com.br', role: 'Faturamento & Emissão de NF', initials: 'BT' },
      { name: 'Vanessa Contas', email: 'vanessa.contas@fotus.com.br', role: 'Crédito e Cobrança', initials: 'VC' }
    ]
  },
  'Suporte Técnico': {
    name: 'Suporte Técnico',
    label: 'Suporte Técnico',
    description: 'Análise de inversores, módulos, garantia e engenharia',
    badgeColor: 'bg-blue-500',
    pillBg: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    members: [
      { name: 'Diego Ramos', email: 'diego.ramos@fotus.com.br', role: 'Engenheiro de Aplicação Solar', initials: 'DR' },
      { name: 'Larissa Matos', email: 'larissa.matos@fotus.com.br', role: 'Especialista em Inversores Híbridos', initials: 'LM' },
      { name: 'Engenharia Fotus', email: 'suporte.pos@fotus.com.br', role: 'Laboratório de Garantia', initials: 'EF' }
    ]
  },
  'Diretoria': {
    name: 'Diretoria',
    label: 'Diretoria',
    description: 'Casos estratégicos, contas chave e decisões corporativas',
    badgeColor: 'bg-purple-500',
    pillBg: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
    members: [
      { name: 'Marcelo Fotus', email: 'marcelo@fotus.com.br', role: 'Diretor de Operações', initials: 'MF' },
      { name: 'Patricia Rocha', email: 'patricia.rocha@fotus.com.br', role: 'Diretora Comercial & CX', initials: 'PR' }
    ]
  },
  'Coordenação': {
    name: 'Coordenação',
    label: 'Coordenação',
    description: 'Alinhamento de processos, SLA e fluxos operacionais',
    badgeColor: 'bg-indigo-500',
    pillBg: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200',
    members: [
      { name: 'Juliana Neves', email: 'juliana.neves@fotus.com.br', role: 'Coordenação de Atendimento CX', initials: 'JN' },
      { name: 'Rodrigo Martins', email: 'rodrigo.martins@fotus.com.br', role: 'Coordenação de Pós-Vendas', initials: 'RM' }
    ]
  },
  'Liderança': {
    name: 'Liderança',
    label: 'Liderança',
    description: 'Supervisão direta de casos críticos e mediação',
    badgeColor: 'bg-rose-500',
    pillBg: 'bg-rose-50',
    textColor: 'text-rose-700',
    borderColor: 'border-rose-200',
    members: [
      { name: 'Fernanda Souza', email: 'fernanda.souza@fotus.com.br', role: 'Líder de Qualidade & CX', initials: 'FS' },
      { name: 'Thiago Silva', email: 'thiago.silva@fotus.com.br', role: 'Líder Operacional CX', initials: 'TS' },
      { name: 'Marcos CX', email: 'marcos.cx@fotus.com.br', role: 'Supervisão de Relacionamento', initials: 'MC' }
    ]
  }
};

export const DEPARTMENT_LIST: Department[] = [
  'Logística',
  'Financeiro',
  'Suporte Técnico',
  'Diretoria',
  'Coordenação',
  'Liderança'
];
