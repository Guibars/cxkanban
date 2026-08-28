# Fotus Hub — CX, Ocorrências e Visitas

Aplicação React conectada ao Firebase Authentication e ao banco Firestore nomeado `ai-studio-752453f7-ae97-40d3-ab96-17738cb30cc2`.

## Acesso Google na Vercel

O código autoriza:

- contas `@fotus.com.br`;
- a conta de desenvolvimento `guilhermebarbosars@gmail.com`.

Para o login funcionar na Vercel, o domínio publicado precisa ser autorizado no Firebase:

1. Abra o Firebase Console do projeto `gen-lang-client-0929275981`.
2. Entre em **Authentication**.
3. Confirme que o provedor **Google** está habilitado.
4. Abra **Settings > Authorized domains**.
5. Adicione apenas o domínio, sem `https://` e sem caminhos. Exemplo: `nome-do-projeto.vercel.app`.
6. Se houver domínio próprio, adicione-o também.

## Publicar as regras do Firestore

As regras estão vinculadas ao banco nomeado por meio do arquivo `firebase.json`.

No terminal aberto na raiz do projeto:

```bash
# somente se o comando firebase ainda não existir no Mac
npm install -g firebase-tools
firebase login
firebase use gen-lang-client-0929275981
firebase deploy --only firestore
```

Esse comando publica `firestore.rules` no banco configurado e substitui as regras anteriores desse banco.

Para a ISA responder com inteligência sobre todas as abas, crie a variável `GEMINI_API_KEY` nas Environment Variables da Vercel (Production, Preview e Development, se usar). A chave é usada somente pela função segura `api/isa.ts`; ela não fica exposta no navegador. O modelo utilizado é `gemini-3.5-flash-lite`.

## Remover os dados demonstrativos antigos

O código não cria mais exemplos. Os documentos já existentes no Firestore continuam salvos até serem excluídos.

Antes de executar qualquer exclusão, confira no Firebase Console se as coleções abaixo contêm somente dados demonstrativos. Os comandos apagam todos os documentos das coleções indicadas:

```bash
firebase firestore:delete --database=ai-studio-752453f7-ae97-40d3-ab96-17738cb30cc2 cx_cases
firebase firestore:delete --database=ai-studio-752453f7-ae97-40d3-ab96-17738cb30cc2 integrator_visits
firebase firestore:delete --database=ai-studio-752453f7-ae97-40d3-ab96-17738cb30cc2 ra_cases
```

Não execute esses comandos se houver dados reais misturados. Nesse caso, exclua apenas os documentos demonstrativos pelo Firebase Console.

## Novas coleções

- `organization_units`: setor, time, regional, gerente e liderança;
- `occurrences`: controle operacional de ocorrências;
- `extra_costs`: custos não previstos por pedido, regional, origem, responsabilidade e motivo;
- `cx_cases`: casos CX e seus direcionamentos;
- `ra_cases`: chamados do Reclame Aqui;
- `integrator_visits`: visitas de integradores.
- `app_settings/occurrence_agents`: lista editável de agentes disponíveis no controle de ocorrências.

Nenhuma pessoa ou ocorrência é criada automaticamente. A nova estrutura deve ser cadastrada na aba **Estrutura** antes de direcionar os cards.

## Importar o histórico de ocorrências

Depois que a nova versão estiver publicada:

1. Entre na aba **Ocorrências**.
2. Clique em **Importar planilha**.
3. Escolha o arquivo `Controle de Ocorrências - CX.xlsx`.
4. Confirme o envio quando o sistema mostrar a quantidade encontrada.

A aba `Controle de Ocorrências` é lida diretamente no navegador e os registros são enviados ao Firestore em blocos. Repetir a importação da mesma planilha atualiza as mesmas linhas, sem criar outra cópia do histórico.

Após esta atualização, reimporte a planilha para corrigir as linhas antigas em que o Excel interpretou dia e mês invertidos. A conversão agora usa o calendário brasileiro e UTC, evitando também o deslocamento de um dia causado pelo fuso horário.

Na aba de ocorrências, **Insights Gerais** abre o gráfico de produtividade mensal do ano atual. É possível alternar entre agentes, transportadoras e estados/UF e clicar nas séries para ocultá-las ou exibi-las.

## Importar a planilha de custos extras

Depois de publicar o código e as regras atualizadas do Firestore:

1. Entre na aba **Custo Extra**.
2. Clique em **Importar planilha**.
3. Escolha `Planilha_de_Custos_Extras_Fotus_2.xlsx`.
4. Confirme o envio dos registros encontrados.

O sistema lê a aba `Base de Dados`, calcula novamente o custo total pela soma de produto, logística e impostos e atualiza o painel automaticamente. Reimportar a mesma planilha atualiza as mesmas linhas sem duplicar o histórico.

Os botões **Gerar relatório PDF** nas abas **Custo Extra** e **Reclame Aqui** abrem um relatório em folha A4; na janela de impressão, escolha **Salvar como PDF**. Os modelos seguem a estrutura visual dos relatórios de referência enviados.

Em **Custo Extra**, o filtro inicia no mês atual. A opção **Todos** mostra o histórico completo, e a visão anual permanece disponível para comparação mês a mês.
