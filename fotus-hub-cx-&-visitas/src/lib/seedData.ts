import { CXCase, RACase, IntegratorVisit } from '../types';
import { db, collection, addDoc } from './firebase';

export const INITIAL_CX_SEEDS: Omit<CXCase, 'id'>[] = [
  {
    orderNumber: '192716-98',
    productCode: 'MOD-CAN-550W',
    quantity: 4,
    isReplacement: true,
    status: 'Em Andamento',
    assigneeEmail: 'fernanda.souza@fotus.com.br',
    assigneeName: 'Fernanda Souza',
    targetDepartment: 'Liderança',
    departmentAssigneeName: 'Fernanda Souza',
    departmentAssigneeEmail: 'fernanda.souza@fotus.com.br',
    totalExtraCost: 1215.00,
    extraCostReason: 'Módulo avariado durante transporte rodoviário',
    extraCosts: [
      { id: 'ec-1', description: 'Módulo avariado (reposição imediata)', amount: 1050.00 },
      { id: 'ec-2', description: 'Taxa de redespacho prioritário', amount: 165.00 }
    ],
    observations: 'Integrador relatou que 4 painéis chegaram com microfissuras visíveis no vidro. Solicitada reposição expressa e acionamento do seguro da transportadora.',
    tags: ['Avaria', 'Urgente', 'Garantia'],
    createdAt: Date.now() - 1000 * 60 * 60 * 5, // 5 hours ago
    updatedAt: Date.now() - 1000 * 60 * 30,
  },
  {
    orderNumber: '188340-12',
    productCode: 'INV-DEYE-8K-G3',
    quantity: 1,
    isReplacement: false,
    status: 'Aberto',
    assigneeEmail: 'diego.ramos@fotus.com.br',
    assigneeName: 'Diego Ramos',
    targetDepartment: 'Suporte Técnico',
    departmentAssigneeName: 'Diego Ramos',
    departmentAssigneeEmail: 'diego.ramos@fotus.com.br',
    totalExtraCost: 340.00,
    extraCostReason: 'Reenvio de placa Wi-Fi e dongle de comunicação',
    extraCosts: [
      { id: 'ec-3', description: 'Placa de comunicação Wi-Fi G3', amount: 280.00 },
      { id: 'ec-4', description: 'Sedex 10 para integrador', amount: 60.00 }
    ],
    observations: 'Inversor não sincroniza com o portal solar do cliente final. Suporte realizou testes remotos e constatou falha na antena receptora.',
    tags: ['Inversor', 'Firmware', 'Conectividade'],
    createdAt: Date.now() - 1000 * 60 * 60 * 18,
    updatedAt: Date.now() - 1000 * 60 * 60 * 2,
  },
  {
    orderNumber: '194102-55',
    productCode: 'ESTR-TELHA-COL-4M',
    quantity: 16,
    isReplacement: false,
    status: 'Em Andamento',
    assigneeEmail: 'rafael.lima@fotus.com.br',
    assigneeName: 'Rafael Lima',
    targetDepartment: 'Logística',
    departmentAssigneeName: 'Rafael Lima',
    departmentAssigneeEmail: 'rafael.lima@fotus.com.br',
    totalExtraCost: 580.00,
    extraCostReason: 'Frete complementar redespacho de perfilados',
    extraCosts: [
      { id: 'ec-5', description: 'Frete emergencial transportadora parceira', amount: 580.00 }
    ],
    observations: 'Extravio parcial de 6 perfis de fixação no transbordo de São Paulo. Equipe de logística já liberou novo lote.',
    tags: ['Logística', 'Extravio', 'Estrutura'],
    createdAt: Date.now() - 1000 * 60 * 60 * 36,
    updatedAt: Date.now() - 1000 * 60 * 60 * 8,
  },
  {
    orderNumber: '191550-77',
    productCode: 'MICRO-HOY-2000',
    quantity: 2,
    isReplacement: false,
    status: 'Resolvido',
    assigneeEmail: 'carla.mendes@fotus.com.br',
    assigneeName: 'Carla Mendes',
    targetDepartment: 'Financeiro',
    departmentAssigneeName: 'Carla Mendes',
    departmentAssigneeEmail: 'carla.mendes@fotus.com.br',
    totalExtraCost: 0,
    extraCostReason: '',
    extraCosts: [],
    observations: 'Correção de faturamento e carta de correção de nota fiscal concluída com sucesso. Integrador confirmou recebimento.',
    tags: ['Faturamento', 'NF-e', 'Resolvido'],
    createdAt: Date.now() - 1000 * 60 * 60 * 72,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24,
  },
  {
    orderNumber: '196230-04',
    productCode: 'CABO-SOLAR-6MM-VM',
    quantity: 500,
    isReplacement: false,
    status: 'Aberto',
    assigneeEmail: 'juliana.neves@fotus.com.br',
    assigneeName: 'Juliana Neves',
    targetDepartment: 'Coordenação',
    departmentAssigneeName: 'Juliana Neves',
    departmentAssigneeEmail: 'juliana.neves@fotus.com.br',
    totalExtraCost: 890.00,
    extraCostReason: 'Complementação de metragem e conectorização',
    extraCosts: [
      { id: 'ec-6', description: 'Bobina complementar 200m', amount: 720.00 },
      { id: 'ec-7', description: 'Pares Conectores MC4 Original', amount: 170.00 }
    ],
    observations: 'Integrador solicitou alinhamento de prazo de entrega com obra em andamento no cliente rural.',
    tags: ['Cabos', 'Estoque', 'Prazo'],
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
    updatedAt: Date.now() - 1000 * 60 * 60 * 4,
  },
  {
    orderNumber: '197010-88',
    productCode: 'BATT-LFP-5.12KWH',
    quantity: 2,
    isReplacement: true,
    status: 'Aberto',
    assigneeEmail: 'marcelo@fotus.com.br',
    assigneeName: 'Marcelo Fotus',
    targetDepartment: 'Diretoria',
    departmentAssigneeName: 'Marcelo Fotus',
    departmentAssigneeEmail: 'marcelo@fotus.com.br',
    totalExtraCost: 2450.00,
    extraCostReason: 'Substituição expressa VIP integrador Platinum',
    extraCosts: [
      { id: 'ec-8', description: 'Frete aéreo dedicado banco de baterias', amount: 1950.00 },
      { id: 'ec-9', description: 'Equipe técnica de acompanhamento in-loco', amount: 500.00 }
    ],
    observations: 'Projeto industrial de grande porte com parada técnica programada. Diretoria autorizou troca direta e envio imediato.',
    tags: ['Bateria', 'VIP', 'Substituição', 'Alta Prioridade'],
    createdAt: Date.now() - 1000 * 60 * 60 * 2,
    updatedAt: Date.now() - 1000 * 60 * 30,
  }
];

export const INITIAL_VISITS_SEEDS: Omit<IntegratorVisit, 'id'>[] = [
  {
    integratorName: 'SolarTech Engenharia & Automação',
    contactPerson: 'Eng. Carlos Eduardo Ribeiro',
    contactPhone: '(19) 98844-2100',
    contactEmail: 'carlos@solartech.eng.br',
    cityState: 'Campinas - SP',
    visitDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().split('T')[0], // Tomorrow
    visitTime: '10:00',
    hostName: 'Patricia Rocha',
    hostEmail: 'patricia.rocha@fotus.com.br',
    objective: 'Alinhamento Comercial & Apresentação da Linha de Inversores Híbridos de Alta Tensão',
    participantsCount: 4,
    status: 'Agendada',
    notes: 'Integrador categoria Platinum com volume previsto de 5MWp no 2º semestre. Solicitar reserva da sala de reuniões principal e kit institucional.',
    feedback: '',
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    updatedAt: Date.now() - 1000 * 60 * 60 * 2,
  },
  {
    integratorName: 'Helios Energia Fotovoltaica Sul',
    contactPerson: 'Mariana Silveira',
    contactPhone: '(41) 99120-7733',
    contactEmail: 'mariana@heliossul.com.br',
    cityState: 'Curitiba - PR',
    visitDate: new Date().toISOString().split('T')[0], // Today
    visitTime: '14:30',
    hostName: 'Diego Ramos',
    hostEmail: 'diego.ramos@fotus.com.br',
    objective: 'Treinamento Técnico Prático no Laboratório de Bancada e Garantias',
    participantsCount: 6,
    status: 'Em Andamento',
    notes: 'Equipe de 6 engenheiros instaladores para homologação técnica e testes de comunicação com microinversores.',
    feedback: 'Treinamento prático transcorrendo com excelente engajamento. Visita guiada ao CD concluída.',
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
    updatedAt: Date.now() - 1000 * 60 * 15,
  },
  {
    integratorName: 'Sol & Luz Projetos Renováveis',
    contactPerson: 'Roberto Fontes',
    contactPhone: '(27) 99870-1122',
    contactEmail: 'roberto@soluzenergia.com.br',
    cityState: 'Vitória - ES',
    visitDate: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString().split('T')[0], // 2 days ago
    visitTime: '09:00',
    hostName: 'Thiago Silva',
    hostEmail: 'thiago.silva@fotus.com.br',
    objective: 'Visita ao Centro de Distribuição & Reunião de Pós-Vendas / SLAs de Entrega',
    participantsCount: 3,
    status: 'Concluída',
    notes: 'Parceiro com dúvidas operacionais sobre janelas de expedição e rastreamento rodoviário.',
    feedback: 'Excelente visita! Foram alinhados prazos prioritários para a região sudeste e estreitado canal direto com a Logística Fotus.',
    createdAt: Date.now() - 1000 * 60 * 60 * 72,
    updatedAt: Date.now() - 1000 * 60 * 60 * 30,
  }
];

export async function seedDemoData() {
  try {
    for (const c of INITIAL_CX_SEEDS) {
      await addDoc(collection(db, 'cx_cases'), c);
    }
    for (const v of INITIAL_VISITS_SEEDS) {
      await addDoc(collection(db, 'integrator_visits'), v);
    }
    return true;
  } catch (error) {
    console.error('Error seeding demo data:', error);
    return false;
  }
}
