# Revisão inicial de segurança — Fotus Hub CX

Esta é uma revisão do código local. Não inclui teste de invasão, inspeção da configuração publicada na Vercel/Neon nem auditoria das dependências instaladas. Não é uma certificação de segurança.

## Corrigido no código nesta revisão

- `/api/isa` agora exige a sessão Neon de um perfil ativo e limita o tamanho da pergunta e do contexto. Antes, qualquer pessoa podia chamar essa rota e consumir a chave de IA.
- `/api/neon-data` agora impede que uma requisição `create` com ID escolhido pelo cliente sobrescreva um registro existente. `update` exige um registro existente, `bulk-upsert` exige permissões de criar e editar, e as ações válidas foram limitadas por tipo de recurso.
- `vercel.json` adiciona cabeçalhos para reduzir riscos de incorporação do site em outra página, detecção incorreta do tipo de arquivo e vazamento de URLs.

## Conferências prioritárias antes de declarar o site pronto para uso amplo

1. **Cadastro e e-mail corporativo:** as migrações permitem que contas `@fotus.com.br` recebam perfil automaticamente. Confirmar na configuração do Neon Auth se a conta precisa verificar a posse do e-mail antes de entrar. O código de autorização não consulta `emailVerified`. Não ativar um bloqueio no código sem conferir as contas atuais, para evitar interromper acessos legítimos.
2. **Data API do Neon:** o aplicativo usa APIs próprias e conexão Postgres no servidor; não usa a Data API no navegador. As migrações deste projeto não criam políticas de RLS. Confirmar se a Data API está desativada. Se estiver ativa, avaliar permissões das tabelas e políticas de RLS antes de ampliar o acesso.
3. **Limites de uso:** configurar regras de limitação de requisições para `/api/isa`, `/api/chat` e cadastro no serviço de hospedagem. A autenticação da ISA já foi corrigida, mas uma conta legítima comprometida ainda pode repetir chamadas e consumir recursos.
4. **Privacidade da ISA individual:** a função envia dados do Hub fornecidos pelo navegador ao serviço Gemini para responder. A empresa deve aprovar quais dados, especialmente dados de clientes, podem ser enviados a esse fornecedor. Uma etapa futura é montar o contexto no servidor e enviar apenas os campos necessários para cada pergunta.
5. **Sessões administrativas:** exigir autenticação forte para operadores mestres, revisar periodicamente os perfis ativos e remover acessos de ex-colaboradores.
6. **Banco e segredos:** manter `DATABASE_URL`, `GEMINI_API_KEY` e `CHAT_ENCRYPTION_KEY` apenas no servidor, com acesso restrito. Usar um usuário Postgres com os privilégios necessários ao aplicativo e não expor a conexão no código do navegador.
7. **Verificação de publicação:** testar com três contas — operador mestre, agente e conta desativada — e tentar acessar as APIs diretamente, incluindo IDs de registros de outras pessoas. Revisar as permissões reais na Vercel e Neon. Executar auditoria das dependências quando houver ambiente de teste disponível.

## Proteções já observadas

- As APIs principais validam JWT assinado pelo Neon e consultam o perfil ativo no banco.
- O chat privado deriva o canal dos IDs de quem está logado e do destinatário validado.
- As consultas SQL usam parâmetros para valores recebidos do usuário.
- O arquivo `.gitignore` exclui `.env`, `.env.local`, `dist` e `node_modules`.

Essas proteções reduzem riscos, mas não substituem as conferências de configuração e um teste independente.

## Mapa inicial para OWASP ASVS 5.0 e API Security Top 10 (2023)

Este mapa usa temas dos padrões, não atribui conformidade requisito por requisito. **Parcial** quer dizer que existe proteção no código, mas a verificação está incompleta. **Pendente** quer dizer que falta uma proteção ou evidência. As correções locais só valem no site depois da publicação.

| Tema | Estado | Evidência e próximo passo |
| --- | --- | --- |
| Identidade e sessão | Parcial | JWT do Neon é verificado e o perfil ativo é consultado. Confirmar verificação de e-mail, MFA para operadores mestres, expiração/revogação de sessão e as regras de emissor/destinatário do JWT. |
| Permissões por função e por registro | Parcial | As APIs checam abas, ações e propriedade das ocorrências de agentes. `organizationUnitIds` é retornado no perfil, mas a leitura de ocorrências para outros cargos e de outras coleções não aplica esse escopo por equipe no servidor. Definir com o negócio quem deve ver cada equipe e testar requisições diretas. |
| Caminho direto ao banco | Pendente | As migrações não incluem políticas RLS. Confirmar se a Data API do Neon está desligada ou protegida, e revisar os privilégios do usuário Postgres do servidor. |
| Validação e consumo de recursos | Parcial | SQL parametrizado, recursos permitidos e limites na rota da ISA. Faltam limites de frequência para ISA, chat e cadastro e limites consistentes de tamanho para todas as alterações. |
| Dados sensíveis e criptografia | Parcial | Segredos ficam no servidor; o chat usa AES-256-GCM após a migração 013 e a configuração da chave. Verificar a conversão das mensagens antigas, backups, acesso à chave e retenção. Revisar o envio de dados do Hub ao Gemini. |
| Configuração do navegador e hospedagem | Parcial | `vercel.json` define cabeçalhos básicos. Confirmar no domínio publicado que estão presentes; avaliar CSP mais restrita após teste funcional. |
| Logs e resposta a incidentes | Pendente | Há `audit_events` para alterações operacionais, mas não há evidência de alerta, revisão periódica dos logs, rastreamento de falhas de login ou plano de resposta a incidentes. |
| Dependências e testes | Pendente | Não foi feita instalação, compilação completa, auditoria de dependências, teste com contas de papéis distintos, teste de invasão ou revisão da implantação. |

Fontes: [OWASP ASVS 5.0](https://owasp.org/projects/asvs?tab=main) e [OWASP API Security Top 10 2023](https://api-security.owasp.org/editions/2023/en/0x11-t10/).
