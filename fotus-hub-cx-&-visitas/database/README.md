# Banco Neon/PostgreSQL — Fotus CX

O site usa exclusivamente Neon/PostgreSQL para dados e Neon Auth para login,
sessões, Google e recuperação de senha.

## Migrações

Execute no SQL Editor do Neon, nesta ordem:

1. `migrations/001_initial_schema.sql` — tabelas, relacionamentos, auditoria e indicadores;
2. `migrations/002_neon_auth_bridge.sql` — vínculo entre os perfis internos e o Neon Auth;
3. `migrations/003_neon_only_auth.sql` — cadastro controlado e operadores mestres;
4. `migrations/004_reset_access_profiles.sql` — limpeza dos perfis antigos do painel, preservando todos os registros operacionais e mantendo somente o operador principal;
5. `migrations/005_fix_neon_auth_registration.sql` — corrige a criação da conta de primeiro acesso no Neon Auth.
6. `migrations/006_open_corporate_registration.sql` — libera o auto cadastro para colaboradores `@fotus.com.br` e cria o perfil inicial automaticamente.
7. `migrations/007_occurrence_products.sql` — permite vários produtos em uma mesma ocorrência e preserva os cards antigos.
8. `migrations/008_ra_status_and_resolution.sql` — separa o status da reclamação da resposta “Resolvido?” e adapta os registros antigos.
9. `migrations/009_internal_chat.sql` — cria o chat geral e privado; as mensagens ficam disponíveis por 30 dias e os registros vencidos são removidos quando uma conversa é aberta.
10. `migrations/010_chat_presence_notifications_isa_avatars.sql` — adiciona presença, avisos de mensagens, resposta da ISA no grupo e fotos pequenas dos usuários.
11. `migrations/011_chat_private_clear.sql` — permite que cada pessoa limpe apenas o próprio histórico de uma conversa privada.

O Neon Auth cria a identidade e a senha. O acesso aos dados permanece bloqueado
até que o e-mail tenha um perfil ativo em `public.app_users`. Essa verificação é
feita no servidor em todas as consultas e alterações do sistema.

## Variáveis da Vercel

```dotenv
DATABASE_URL=conexao_pooler_do_neon
NEON_AUTH_BASE_URL=https://ep-falling-waterfall-b5oiundt.neonauth.c-7.us-east-2.aws.neon.tech/neondb/auth
VITE_NEON_AUTH_URL=https://ep-falling-waterfall-b5oiundt.neonauth.c-7.us-east-2.aws.neon.tech/neondb/auth
```

`DATABASE_URL` é segredo de servidor. Nunca coloque essa conexão em uma variável
iniciada por `VITE_` nem publique o arquivo `.env`.

## Primeiro acesso

1. Qualquer colaborador com e-mail `@fotus.com.br` abre **Primeiro acesso** e
   cria a própria senha no Neon.
2. O sistema cria automaticamente um perfil de Agente com Visão Geral,
   Ocorrências e Visitas.
3. Um operador mestre pode alterar função, abas, times ou desativar o perfil.
4. Nos acessos seguintes a pessoa pode entrar com e-mail/senha ou Google,
   quando o provedor Google estiver ativo no Neon Auth.

Senhas, tokens e links de redefinição nunca são armazenados nas tabelas públicas
do sistema.

## Segurança aplicada

- as APIs validam o JWT do Neon com a chave pública oficial do projeto;
- somente perfis ativos em `app_users` recebem dados;
- abas e operações respeitam `user_section_permissions`;
- agentes recebem somente as próprias ocorrências;
- alterações administrativas e operacionais geram registros de auditoria;
- consultas usam parâmetros e transações curtas.

## Conferência rápida

```sql
select count(*) as usuarios_autorizados from public.app_users;
select count(*) as logins_criados from neon_auth."user";
select email, role, active from public.app_users order by email;
```
