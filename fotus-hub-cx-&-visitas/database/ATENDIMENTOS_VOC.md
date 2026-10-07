# Ativar Atendimentos e VoC

1. Abra o projeto no Neon e entre em **SQL Editor**.
2. Abra `database/migrations/019_atendimentos_voc.sql` neste projeto.
3. Copie todo o conteúdo desse arquivo, cole no SQL Editor e execute.
4. Publique o código atualizado pelo seu fluxo habitual e entre novamente no site.

Esta atualização usa as tabelas e funções das migrações anteriores. Não há nova chave ou variável de ambiente para configurar.

## O que o SQL faz

- Cria as tabelas dos atendimentos e feedbacks da VoC.
- Libera as duas abas para os perfis ativos e para novos colaboradores.
- Permite que qualquer usuário ativo com acesso a Atendimentos exclua seus cards ou os de outra pessoa, com confirmação.
- Em VoC, agentes podem criar e editar feedbacks. A exclusão fica disponível para administradores e operadores mestres.
- Desativa Adriely, Carol, Júlia/Julia e Laís/Lais na lista de agentes.
- Desativa o acesso dos perfis de agentes com vínculo explícito a esses nomes; não identifica pessoas apenas pelo primeiro nome do login ou pelo e-mail.
- Preserva ocorrências, feedbacks anteriores e contas de login. Perfis desativados não conseguem acessar os dados, mesmo tentando usar as APIs diretamente.

## Gerenciar agentes depois

Em **Ocorrências → Gerenciar agentes**, retire nomes e clique em **Salvar lista** para atualizar os cadastros e a produtividade. O gráfico de agentes considera somente a lista ativa; os cards históricos continuam disponíveis. Os totais por transportadora e estado continuam considerando o histórico completo.

Para bloquear também o acesso de uma pessoa, use **Gerenciar acesso dos usuários**, selecione o perfil correto e clique em **Desativar acesso**. Esse botão exige um operador mestre. A agente vinculada também sai da lista ativa.

Se alguma das quatro pessoas não estiver vinculada a uma agente no cadastro, desative seu perfil por esse botão. O SQL evita bloquear outra pessoa apenas por ter o mesmo primeiro nome.

Para reativar, marque **Perfil ativo** e salve. Adicione novamente o nome em **Gerenciar agentes** caso ela deva aparecer na produtividade.

## Uso das novas abas

- **Atendimentos:** botão com o ícone enviado, cinco categorias em pílulas, responsável, data, cliente/referência, descrição, status e solução. Criação, edição, busca, filtros e exclusão compartilhada.
- **VoC:** reclamação, sugestão, elogio ou dor; tema, área responsável, origem, prioridade, responsável e plano de ação. O dashboard acompanha os filtros e permite clicar nos gráficos para explorar os relatos.
- **Recorrência:** um tema com pelo menos dois registros no filtro, juntando variações de acentos e letras maiúsculas.
- **Oportunidades:** reclamações, dores e sugestões ainda não concluídas, agrupadas por tema e área. Prioridades altas vêm primeiro, seguidas do volume de relatos. São sinais para a equipe avaliar, sem classificação automática por IA.

O ícone fica em `public/neppo-ia-icon.png`, sem ocupar espaço no banco. Os registros são salvos no Neon e os textos são validados no servidor. A auditoria dos novos cards guarda apenas os identificadores e categorias/status, sem duplicar o relato completo.

## Conferência após publicar

1. Entre como agente e crie, edite e exclua um atendimento criado por outra pessoa.
2. Registre dois feedbacks com o mesmo tema e confira a recorrência e os filtros do dashboard.
3. Marque um feedback como concluído e confirme que ele sai das oportunidades pendentes, mantendo o registro no histórico.
4. Confirme que as quatro agentes desligadas saíram da produtividade e que suas ocorrências antigas continuam disponíveis.
5. Em uma conta de teste, confirme o bloqueio do acesso após desativar o perfil.
