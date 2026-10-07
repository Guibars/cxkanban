# CD de origem, mapa e visualização compacta

## O que fazer no Neon

1. Abra `database/migrations/020_occurrence_distribution_centers.sql`.
2. Copie todo o conteúdo e cole no **SQL Editor do Neon**, no banco usado pela plataforma.
3. Clique em **Run**. Faça isso antes de publicar esta versão do site.

Essa alteração adiciona um campo pequeno ao cadastro existente de ocorrências.
Nenhum SQL foi executado automaticamente. As permissões existentes de acesso aos cards continuam valendo.

## Como usar

- Em **Controle de ocorrências**, escolha o **CD de origem** diretamente no card ou em **Editar ocorrência**. O cadastro novo também tem esse campo.
- Os oito CDs são Pernambuco, Santa Catarina, Espírito Santo, São Paulo, Goiás, Bahia, Pará e Mato Grosso. O antigo nome “CD Sudeste” corresponde a **CD Espírito Santo (ES)**.
- Clique em **Mapa** para ver o ranking de ocorrências por CD, detalhes das etapas e custo registrado de avarias. Clique em um marcador ou na lista e em **Ver cards deste CD**.
- O mapa respeita o período, a busca, a etapa e o acesso da conta. O seletor de CD dos cards não limita a comparação do mapa, permitindo comparar os oito CDs.
- Cards anteriores ficam como **CD não informado**. O mapa oferece um botão para encontrá-los e preencher a origem; a UF de entrega não determina o CD.
- Os marcadores representam a UF de cada CD, sem indicar um endereço de armazém. A cobertura de cada CD foi informada pelo time e pode se sobrepor à de outros CDs.
- O ranking compara quantidade de registros. Para medir uma taxa de problemas por CD, futuramente será necessário também informar o volume total de pedidos expedidos.
- A exportação Excel inclui **CD de origem**. A planilha antiga de importação continua funcionando e seus registros novos entram sem CD.
- Em **VoC**, clique no botão arredondado **Filtros** para abrir os campos. O resumo do período continua visível quando fechado.
- A visualização se adapta automaticamente à largura e à altura disponíveis, inclusive ao redimensionar a janela. Notebooks e janelas com pouca altura usam uma apresentação mais compacta; monitores amplos com mais altura usam tamanhos progressivamente maiores. Celulares e tablets mantêm o tamanho natural e suas grades responsivas. Não há seletor manual e a antiga preferência salva não é utilizada. Deixe o zoom do próprio navegador em **100%** para conferir o ajuste automático.

## Consumo do banco

O mapa calcula os números usando as ocorrências já carregadas na plataforma. Não cria consultas adicionais ao Neon, tabelas de mapa ou serviços pagos. A base cartográfica simplificada do [IBGE](https://servicodados.ibge.gov.br/api/docs/malhas?versao=3) fica no arquivo local `public/maps/brazil-states.json`.

## Conferência após publicar

1. Cadastre ou edite um card com CD Pernambuco, recarregue a página e confira se o CD permanece salvo.
2. Abra o mapa, selecione esse CD e confira a contagem e o botão que filtra os cards.
3. Troque o período e a etapa; confira se o mapa acompanha os filtros.
4. Confira os cards sem CD e teste a navegação por teclado na lista e nos marcadores.
5. Redimensione a janela e confira o ajuste automático em notebook, monitor e celular, além dos filtros recolhidos da VoC.
