# Banco Neon/PostgreSQL — Fotus CX

O site usa exclusivamente Neon/PostgreSQL para dados e Neon Auth para login,
sessões, Google e recuperação de senha.

## Migrações

Execute no SQL Editor do Neon, nesta ordem:

1. `migrations/001_initial_schema.sql` — tabelas, relacionamentos, auditoria e indicadores;
2. `migrations/002_neon_auth_bridge.sql` — vínculo entre os perfis internos e o Neon Auth;
3. `migrations/003_neon_only_auth.sql` — cadastro controlado e operadores mestres.

A terceira migração permite criar conta somente quando o e-mail já estiver ativo
em `public.app_users`. Os e-mails dos operadores mestres recebem a função de
administrador no Neon Auth automaticamente.

## Variáveis da Vercel

```dotenv
DATABASE_URL=conexao_pooler_do_neon
NEON_AUTH_BASE_URL=https://ep-falling-waterfall-b5oiundt.neonauth.c-7.us-east-2.aws.neon.tech/neondb/auth
VITE_NEON_AUTH_URL=https://ep-falling-waterfall-b5oiundt.neonauth.c-7.us-east-2.aws.neon.tech/neondb/auth
```

`DATABASE_URL` é segredo de servidor. Nunca coloque essa conexão em uma variável
iniciada por `VITE_` nem publique o arquivo `.env`.

## Primeiro acesso

1. Um operador mestre abre **Gerenciar usuários** e salva nome, e-mail, função,
   abas e equipes.
2. O painel gera um link de primeiro acesso.
3. A pessoa abre o link e cria a própria senha no Neon.
4. Nos acessos seguintes ela pode entrar com e-mail/senha ou Google, quando o
   provedor Google estiver ativo no Neon Auth.

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
