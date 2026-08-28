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
firebase login
firebase use gen-lang-client-0929275981
firebase deploy --only firestore
```

Esse comando publica `firestore.rules` no banco configurado e substitui as regras anteriores desse banco.

## Remover os dados demonstrativos antigos

O código não cria mais exemplos. Os documentos já existentes no Firestore continuam salvos até serem excluídos.

Antes de executar qualquer exclusão, confira no Firebase Console se as coleções abaixo contêm somente dados demonstrativos. Os comandos apagam todos os documentos das coleções indicadas:

```bash
firebase firestore:delete --database=ai-studio-752453f7-ae97-40d3-ab96-17738cb30cc2 cx_cases
firebase firestore:delete --database=ai-studio-752453f7-ae97-40d3-ab96-17738cb30cc2 integrator_visits
```

Não execute esses comandos se houver dados reais misturados. Nesse caso, exclua apenas os documentos demonstrativos pelo Firebase Console.

## Novas coleções

- `organization_units`: setor, time, regional, gerente e liderança;
- `occurrences`: controle operacional de ocorrências;
- `cx_cases`: casos CX e seus direcionamentos;
- `ra_cases`: chamados do Reclame Aqui;
- `integrator_visits`: visitas de integradores.

Nenhuma pessoa ou ocorrência é criada automaticamente. A nova estrutura deve ser cadastrada na aba **Estrutura** antes de direcionar os cards.
