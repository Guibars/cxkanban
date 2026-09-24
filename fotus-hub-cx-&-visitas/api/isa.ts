import { GoogleGenAI } from '@google/genai';
import { Pool } from 'pg';
import { verifyNeonIdentity } from '../src/server/neonAuth.js';

type ApiRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: { question?: unknown; context?: unknown };
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (value: unknown) => void;
  setHeader?: (name: string, value: string) => void;
};

function getPool() {
  const connectionString = (process.env.DATABASE_URL || '')
    .trim()
    .replace(/^DATABASE_URL\s*=\s*/i, '')
    .replace(/^['"]|['"]$/g, '');
  if (!/^postgres(?:ql)?:\/\//i.test(connectionString)) throw new Error('database-not-configured');
  const globalPool = globalThis as typeof globalThis & { __fotusNeonPool?: Pool };
  globalPool.__fotusNeonPool ||= new Pool({ connectionString, max: 4, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 20_000 });
  return globalPool.__fotusNeonPool;
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader?.('Cache-Control', 'private, no-store');
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  const question = typeof request.body?.question === 'string' ? request.body.question.trim() : '';
  const context = typeof request.body?.context === 'string' ? request.body.context : '';
  if (!question || question.length > 500 || !context || Buffer.byteLength(context, 'utf8') > 500_000) {
    response.status(400).json({ error: 'Pergunta ou contexto inválido para a ISA.' });
    return;
  }

  try {
    await verifyNeonIdentity(request, getPool(), { readOnly: true });
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return response.status(503).json({ error: 'A ISA não está configurada no servidor.' });
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: `Você é ISA, a analista de dados do Hub CX da Fotus. Responda em português do Brasil, de forma clara e prática. Use exclusivamente os dados reais do contexto abaixo; não invente pessoas, cards, números ou datas. Quando uma informação não existir, diga isso explicitamente. Sempre que fizer uma contagem ou ranking, deixe claro qual coleção foi analisada. Não use Markdown: não escreva #, ##, asteriscos, sublinhados, crases ou tabelas em Markdown. Organize a resposta em texto simples, com títulos curtos e listas iniciadas pelo caractere •.\n\nPERGUNTA:\n${question}\n\nCONTEXTO COMPLETO DO HUB (JSON):\n${context}`,
    });
    const text = result.text?.trim();
    if (!text) {
      response.status(502).json({ error: 'A ISA não retornou texto.' });
      return;
    }
    response.status(200).json({ text, model: 'gemini-3.5-flash-lite' });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'unauthenticated') return response.status(401).json({ error: 'Entre novamente para usar a ISA.' });
    if (message === 'profile-not-found' || message === 'profile-disabled' || message === 'unauthorized') {
      return response.status(403).json({ error: 'Seu perfil não tem acesso à ISA.' });
    }
    console.error('Erro ao consultar Gemini para a ISA:', error);
    response.status(502).json({ error: 'Não foi possível consultar a ISA agora.' });
  }
}
