# Fotus Hub CX

Aplicação React com banco PostgreSQL e autenticação hospedados integralmente no
Neon. Não existe dependência de outro banco ou serviço de login.

## Desenvolvimento

```bash
npm install
npm run dev
```

O arquivo `.env` local precisa conter somente:

```dotenv
DATABASE_URL=conexao_pooler_do_neon
NEON_AUTH_BASE_URL=https://ep-falling-waterfall-b5oiundt.neonauth.c-7.us-east-2.aws.neon.tech/neondb/auth
VITE_NEON_AUTH_URL=https://ep-falling-waterfall-b5oiundt.neonauth.c-7.us-east-2.aws.neon.tech/neondb/auth
```

Nunca publique `.env` nem exponha `DATABASE_URL` no navegador.

## Publicação na Vercel

Cadastre as mesmas três variáveis em **Settings → Environment Variables** e
faça um novo deploy. `VITE_NEON_AUTH_URL` é público; as demais variáveis são
usadas pelas funções seguras do servidor.

## Banco e login

As migrações e o processo de primeiro acesso estão documentados em
[`database/README.md`](database/README.md).

## Chat da equipe

O chat geral e as conversas privadas usam uma tabela pequena no Neon, criada pela
migração `database/migrations/009_internal_chat.sql`. Somente usuários ativos podem
enviar e ler mensagens. O chat carrega as últimas 50 mensagens por conversa e busca
novidades a cada 30 segundos enquanto a aba está aberta e visível. Após 5 minutos
sem interação, as atualizações pausam até a pessoa retomar o chat. As mensagens
ficam disponíveis por 30 dias; os registros vencidos são apagados quando uma
conversa é aberta.

A migração `database/migrations/010_chat_presence_notifications_isa_avatars.sql`
adiciona indicadores de mensagens não lidas, presença de usuários ativos e fotos
de perfil. O grupo geral se chama **Experiência que Gera Resultado - CX**.
Uma pessoa aparece online quando esteve ativa na plataforma nos últimos 3 minutos;
as consultas de presença e notificações param após 5 minutos sem interação.
No grupo, uma mensagem com `@isa` seguida de uma pergunta chama a ISA existente
e usa a chave `GEMINI_API_KEY` já configurada para ela. A resposta no grupo pode
usar perguntas gerais e mensagens do próprio grupo; dados restritos das abas
continuam disponíveis somente na ISA individual. Somente
`guilhermebarbosars@gmail.com` pode atribuir ou remover as fotos dos usuários;
as imagens são reduzidas no navegador antes de serem salvas no Neon.

## Validação

```bash
npm run lint
npm run build
```
