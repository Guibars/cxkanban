import { GoogleGenAI } from '@google/genai';

type ApiRequest = {
  method?: string;
  body?: { question?: unknown; context?: unknown };
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (value: unknown) => void;
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    response.status(503).json({ error: 'A variável GEMINI_API_KEY ainda não foi configurada.' });
    return;
  }

  const question = typeof request.body?.question === 'string' ? request.body.question.trim() : '';
  const context = typeof request.body?.context === 'string' ? request.body.context : JSON.stringify(request.body?.context || {});
  if (!question) {
    response.status(400).json({ error: 'Pergunta vazia.' });
    return;
  }

  try {
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
    console.error('Erro ao consultar Gemini para a ISA:', error);
    response.status(502).json({ error: 'Não foi possível consultar a ISA agora.' });
  }
}
