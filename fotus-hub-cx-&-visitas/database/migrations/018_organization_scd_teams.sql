-- Execute no SQL Editor do Neon depois de 017_organization_consultants.sql.
-- Fonte: scd-equipes-2026-09-30 (1).xlsx, Sheet1, linhas 2 a 194.
-- 193 consultores, 24 líderes, 8 coordenadores e 3 gerentes (228 pessoas únicas).
-- Atualiza nomes/vínculos/equipes; preenche somente e-mails que estiverem vazios.
-- Preserva telefones, fotos, ordem dos cards existentes e pessoas ausentes nesta planilha.
-- Não cria contas de login nem concede permissões de acesso.
begin;

create temp table fotus_scd_people (
  email citext primary key, name text not null, role text not null,
  supervisor_email citext, job_title text, department text,
  regional text, team_name text, aliases text[], source_order integer
) on commit drop;

insert into fotus_scd_people values
  ('isadora.borlot@fotus.com.br','Isadora Saiter Borlot','Gerente',null,'Gerente Comercial','Comercial','São Paulo','',array['Isadora Saiter Borlot'],1),
  ('rosimery.job@fotus.com.br','Rosimery Peixoto Job Souza','Gerente',null,'Gerente Comercial','Comercial','Norte, Sudoeste, Sul','',array['Rosimery Peixoto Job Souza','Rosi Job'],2),
  ('taisson.santos@fotus.com.br','Taisson dos Santos Fonseca','Gerente',null,'Gerente Comercial','Comercial','Nordeste Eixo Norte, Nordeste Eixo Sul','',array['Taisson dos Santos Fonseca','Taisson Fonseca'],3),
  ('cintya.holanda@fotus.com.br','Cintya dos Santos Holanda','Coordenador','taisson.santos@fotus.com.br','Coordenador Comercial','Comercial','Nordeste Eixo Norte','',array['Cintya dos Santos Holanda','Cintya Holanda'],4),
  ('gustavo.gomes@fotus.com.br','Gustavo Samuel do Socorro Gomes','Coordenador',null,'Coordenador Comercial','Novos Produtos','Novos Produtos','',array['Gustavo Samuel do Socorro Gomes'],5),
  ('maihk.santos@fotus.com.br','Maihk Tranhaque dos Santos','Coordenador','rosimery.job@fotus.com.br','Coordenador Comercial','Comercial','Sudoeste','',array['Maihk Tranhaque dos Santos','Maihk Santos'],6),
  ('maxwel.junior@fotus.com.br','Maxwel Stein Junior','Coordenador','isadora.borlot@fotus.com.br','Coordenador Comercial','Comercial','São Paulo','',array['Maxwel Stein Junior'],7),
  ('pablo.menix@fotus.com.br','Pablo Menix Maguil Soares Moreira','Coordenador','rosimery.job@fotus.com.br','Coordenador Comercial','Comercial','Norte','',array['Pablo Menix Maguil Soares Moreira','Pablo Menix'],8),
  ('paulo.ricardo@fotus.com.br','Paulo Ricardo de Souza Rodrigues','Coordenador','rosimery.job@fotus.com.br','Coordenador Comercial','Comercial','Sul','',array['Paulo Ricardo de Souza Rodrigues','Paulo Rodrigues'],9),
  ('thompson.ramos@fotus.com.br','Thompson Jose Ramos','Coordenador',null,'Coordenador Comercial','Canais Digitais','BDR / Canal Digital, SDR / Canal Digital','',array['Thompson Jose Ramos','Thompson Ramos'],10),
  ('tulio.silva@fotus.com.br','Tulio Silva Barroso','Coordenador','taisson.santos@fotus.com.br','Coordenador Comercial','Comercial','Nordeste Eixo Sul','',array['Tulio Silva Barroso','Túlio Barroso','Tulio Barroso'],11),
  ('cleidson.batista@fotus.com.br','Cleidson Batista','Líder','pablo.menix@fotus.com.br','Líder Comercial','Comercial','Norte','RG 001 - NORTE - TIME 001',array['Cleidson Batista','Cleidson Batista'],12),
  ('matheus.codeco@fotus.com.br','Matheus Henrique Codeco Mendes','Líder','thompson.ramos@fotus.com.br','Líder Comercial','Canais Digitais','SDR / Canal Digital','RG 002 - SDR/CANAL DIGITAL - TIME 001',array['Matheus Henrique Codeco Mendes','Matheus Mendes'],13),
  ('cezar.tellaroli@fotus.com.br','Cezar Silva Tellaroli','Líder','pablo.menix@fotus.com.br','Líder Comercial','Comercial','Norte','RG 003 - NORTE - TIME 003',array['Cezar Silva Tellaroli','Cezar Tellaroli'],14),
  ('valdir.junior@fotus.com.br','Valdir Carvalho Nobre Junior','Líder','pablo.menix@fotus.com.br','Líder Comercial','Comercial','Norte','RG 003 - NORTE - TIME 004',array['Valdir Carvalho Nobre Junior'],15),
  ('amanda.ramai@fotus.com.br','Amanda Ramai Faustino','Líder','pablo.menix@fotus.com.br','Líder Comercial','Comercial','Norte','RG 003 - NORTE - TIME 005',array['Amanda Ramai Faustino','Amanda Ramai'],16),
  ('eric.santos@fotus.com.br','Eric Tadeu Anjos dos Santos','Líder','paulo.ricardo@fotus.com.br','Líder Comercial','Comercial','Sul','RG 005 - SUL - TIME 001',array['Eric Tadeu Anjos dos Santos','Eric Santos'],17),
  ('gabriela.marques@fotus.com.br','Gabriela Marques de Souza','Líder','paulo.ricardo@fotus.com.br','Líder Comercial','Comercial','Sul','RG 005 - SUL - TIME 002',array['Gabriela Marques de Souza','Gabriela Marques'],18),
  ('klicia.zacchi@fotus.com.br','Klicia Zacchi da Silva','Líder','paulo.ricardo@fotus.com.br','Líder Comercial','Comercial','Sul','RG 005 - SUL - TIME 004',array['Klicia Zacchi da Silva','Klicia Zacchi'],19),
  ('layne.paula@fotus.com.br','Layne Gomes Paula','Líder','tulio.silva@fotus.com.br','Líder Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 001',array['Layne Gomes Paula','Layne Gomes'],20),
  ('gabriela.zafalon@fotus.com.br','Gabriela Soares Zafalon','Líder','tulio.silva@fotus.com.br','Líder Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 002',array['Gabriela Soares Zafalon','Gabriela Zafalon'],21),
  ('deiviti.oliveira@fotus.com.br','Deiviti dos Santos Oliveira','Líder','tulio.silva@fotus.com.br','Líder Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 003',array['Deiviti dos Santos Oliveira'],22),
  ('breno.souza@fotus.com.br','Breno Ucceli de Souza','Líder','tulio.silva@fotus.com.br','Líder Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 004',array['Breno Ucceli de Souza'],23),
  ('emanuele.siquara@fotus.com.br','Emanuele Siquara dos Santos','Líder','tulio.silva@fotus.com.br','Líder Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 007',array['Emanuele Siquara dos Santos'],24),
  ('rose.picoli@fotus.com.br','Marilda Rose Picoli Sampaio Dias','Líder','cintya.holanda@fotus.com.br','Líder Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 002',array['Marilda Rose Picoli Sampaio Dias','Rose Picoli'],25),
  ('paulo.amorim@fotus.com.br','Jose Paulo de Amorim Neto','Líder','cintya.holanda@fotus.com.br','Líder Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 005',array['Jose Paulo de Amorim Neto','Paulo Amorim'],26),
  ('rhaiani.tranhaque@fotus.com.br','Rhaiani Tranhaque dos Santos','Líder','cintya.holanda@fotus.com.br','Líder Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 008',array['Rhaiani Tranhaque dos Santos','Rhaiani Tranhaque'],27),
  ('luana.orlandi@fotus.com.br','Luana Mattos de Amorim Orlandi','Líder','cintya.holanda@fotus.com.br','Líder Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 009',array['Luana Mattos de Amorim Orlandi','Luana Orlandi'],28),
  ('guilherme.escobar@fotus.com.br','Guilherme Roberto Escobar','Líder','maxwel.junior@fotus.com.br','Líder Comercial','Comercial','São Paulo','RG 015 - SÃO PAULO - TIME 001',array['Guilherme Roberto Escobar'],29),
  ('rafael.carvalho@fotus.com.br','Rafael Carvalho da Silva','Líder','maxwel.junior@fotus.com.br','Líder Comercial','Comercial','São Paulo','RG 015 - SÃO PAULO - TIME 002',array['Rafael Carvalho da Silva'],30),
  ('victor.mayr@fotus.com.br','Victor Manta Mayr','Líder','maxwel.junior@fotus.com.br','Líder Comercial','Comercial','São Paulo','RG 015 - SÃO PAULO - TIME 003',array['Victor Manta Mayr'],31),
  ('dayane.ferreira@fotus.com.br','Dayane da Silva Rodrigues Ferreira','Líder','maihk.santos@fotus.com.br','Líder Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 001',array['Dayane da Silva Rodrigues Ferreira','Dayane Ferreira'],32),
  ('caroline.cabral@fotus.com.br','Caroline de Oliveira Cabral','Líder','maihk.santos@fotus.com.br','Líder Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 002',array['Caroline de Oliveira Cabral','Caroline Cabral'],33),
  ('roberto.gomes@fotus.com.br','Roberto Goldgner Gomes','Líder','maihk.santos@fotus.com.br','Líder Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 004',array['Roberto Goldgner Gomes','Roberto Goldgner'],34),
  ('brunna.fernandes@fotus.com.br','Brunna Fernandes','Líder','maihk.santos@fotus.com.br','Líder Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 005',array['Brunna Fernandes','Bruna Fernandes'],35),
  ('juliane.bastos@fotus.com.br','Juliane Melo Bastos da Silva','Consultor',null,'Consultor Comercial','Comercial','Sem Equipe','RG 000 - SEM EQUIPE - SEM TIME',array['Juliane Melo Bastos da Silva'],36),
  ('adriane.ferreira@fotus.com.br','Adriane de Souza Ferreira','Consultor','cleidson.batista@fotus.com.br','Consultor Comercial','Comercial','Norte','RG 001 - NORTE - TIME 001',array['Adriane de Souza Ferreira'],37),
  ('alcimara.oliveira@fotus.com.br','Alcimara Cabral de Oliveira','Consultor','cleidson.batista@fotus.com.br','Consultor Comercial','Comercial','Norte','RG 001 - NORTE - TIME 001',array['Alcimara Cabral de Oliveira'],38),
  ('ana.lucia@fotus.com.br','Ana Lucia Anunciacao dos Reis','Consultor','cleidson.batista@fotus.com.br','Consultor Comercial','Comercial','Norte','RG 001 - NORTE - TIME 001',array['Ana Lucia Anunciacao dos Reis'],39),
  ('erik.esgario@fotus.com.br','Erik Macedo Esgario','Consultor','cleidson.batista@fotus.com.br','Consultor Comercial','Comercial','Norte','RG 001 - NORTE - TIME 001',array['Erik Macedo Esgario'],40),
  ('joao.vargens@fotus.com.br','Joao Marcos da Silva Vargens','Consultor','cleidson.batista@fotus.com.br','Consultor Comercial','Comercial','Norte','RG 001 - NORTE - TIME 001',array['Joao Marcos da Silva Vargens'],41),
  ('mariana.rangel@fotus.com.br','Mariana Rangel Ananias','Consultor','cleidson.batista@fotus.com.br','Consultor Comercial','Comercial','Norte','RG 001 - NORTE - TIME 001',array['Mariana Rangel Ananias'],42),
  ('matheus.nascimento@fotus.com.br','Matheus Nascimento Costa','Consultor','cleidson.batista@fotus.com.br','Consultor Comercial','Comercial','Norte','RG 001 - NORTE - TIME 001',array['Matheus Nascimento Costa'],43),
  ('solano.junior@fotus.com.br','Solano Caliari Arcebispo Junior','Consultor','cleidson.batista@fotus.com.br','Consultor Comercial','Comercial','Norte','RG 001 - NORTE - TIME 001',array['Solano Caliari Arcebispo Junior'],44),
  ('arthur.caldeira@fotus.com.br','Arthur Oliveira Caldeira','Consultor','matheus.codeco@fotus.com.br','Consultor Comercial','Canais Digitais','SDR / Canal Digital','RG 002 - SDR/CANAL DIGITAL - TIME 001',array['Arthur Oliveira Caldeira'],45),
  ('ester.carvalho@fotus.com.br','Ester Carvalho Rosa','Consultor','matheus.codeco@fotus.com.br','Consultor Comercial','Canais Digitais','SDR / Canal Digital','RG 002 - SDR/CANAL DIGITAL - TIME 001',array['Ester Carvalho Rosa'],46),
  ('flavia.oliveira@fotus.com.br','Flavia Oliveira da Silva Santos','Consultor','matheus.codeco@fotus.com.br','Consultor Comercial','Canais Digitais','SDR / Canal Digital','RG 002 - SDR/CANAL DIGITAL - TIME 001',array['Flavia Oliveira da Silva Santos'],47),
  ('israel.mantovanelli@fotus.com.br','Israel Mantovanelli de Souza','Consultor','matheus.codeco@fotus.com.br','Consultor Comercial','Canais Digitais','SDR / Canal Digital','RG 002 - SDR/CANAL DIGITAL - TIME 001',array['Israel Mantovanelli de Souza'],48),
  ('joao.maia@fotus.com.br','Joao Vitor Maia da Silva','Consultor','matheus.codeco@fotus.com.br','Consultor Comercial','Canais Digitais','SDR / Canal Digital','RG 002 - SDR/CANAL DIGITAL - TIME 001',array['Joao Vitor Maia da Silva'],49),
  ('matheus.mendes@fotus.com.br','Matheus Lima Mendes','Consultor','matheus.codeco@fotus.com.br','Consultor Comercial','Canais Digitais','SDR / Canal Digital','RG 002 - SDR/CANAL DIGITAL - TIME 001',array['Matheus Lima Mendes'],50),
  ('andressa.souza@fotus.com.br','Andressa Nascimento de Souza','Consultor','cezar.tellaroli@fotus.com.br','Consultor Comercial','Comercial','Norte','RG 003 - NORTE - TIME 003',array['Andressa Nascimento de Souza'],51),
  ('elis.correa@fotus.com.br','Elis Luciana de Fatima Correa','Consultor','cezar.tellaroli@fotus.com.br','Consultor Comercial','Comercial','Norte','RG 003 - NORTE - TIME 003',array['Elis Luciana de Fatima Correa'],52),
  ('herley.feu@fotus.com.br','Herley Ribeiro Feu de Souza','Consultor','cezar.tellaroli@fotus.com.br','Consultor Comercial','Comercial','Norte','RG 003 - NORTE - TIME 003',array['Herley Ribeiro Feu de Souza'],53),
  ('isabella.rafalski@fotus.com.br','Isabella Rafalski Sunderhus','Consultor','cezar.tellaroli@fotus.com.br','Consultor Comercial','Comercial','Norte','RG 003 - NORTE - TIME 003',array['Isabella Rafalski Sunderhus'],54),
  ('jackson.santos@fotus.com.br','Jackson Douglas Dias Santos','Consultor','cezar.tellaroli@fotus.com.br','Consultor Comercial','Comercial','Norte','RG 003 - NORTE - TIME 003',array['Jackson Douglas Dias Santos'],55),
  ('julio.rodrigues@fotus.com.br','Julio Cesar Marconi Rodrigues','Consultor','cezar.tellaroli@fotus.com.br','Consultor Comercial','Comercial','Norte','RG 003 - NORTE - TIME 003',array['Julio Cesar Marconi Rodrigues'],56),
  ('thiago.correa@fotus.com.br','Thiago Rodrigues Correa da Silva','Consultor','cezar.tellaroli@fotus.com.br','Consultor Comercial','Comercial','Norte','RG 003 - NORTE - TIME 003',array['Thiago Rodrigues Correa da Silva'],57),
  ('weverton.pablo@fotus.com.br','Weverton Pablo Nascimento Ricas','Consultor','cezar.tellaroli@fotus.com.br','Consultor Comercial','Comercial','Norte','RG 003 - NORTE - TIME 003',array['Weverton Pablo Nascimento Ricas'],58),
  ('barbara.pedrete@fotus.com.br','Barbara Araujo Pedrete','Consultor','valdir.junior@fotus.com.br','Consultor Comercial','Comercial','Norte','RG 003 - NORTE - TIME 004',array['Barbara Araujo Pedrete'],59),
  ('bruno.godoy@fotus.com.br','Bruno Godoi Dalleprane','Consultor','valdir.junior@fotus.com.br','Consultor Comercial','Comercial','Norte','RG 003 - NORTE - TIME 004',array['Bruno Godoi Dalleprane'],60),
  ('jordan.pezzin@fotus.com.br','Jordan Sartori Pezzin','Consultor','valdir.junior@fotus.com.br','Consultor Comercial','Comercial','Norte','RG 003 - NORTE - TIME 004',array['Jordan Sartori Pezzin'],61),
  ('josue.moura@fotus.com.br','Josue de Moura Vanzeler','Consultor','valdir.junior@fotus.com.br','Consultor Comercial','Comercial','Norte','RG 003 - NORTE - TIME 004',array['Josue de Moura Vanzeler'],62),
  ('maria.alves@fotus.com.br','Maria Aparecida Alves Macedo','Consultor','valdir.junior@fotus.com.br','Consultor Comercial','Comercial','Norte','RG 003 - NORTE - TIME 004',array['Maria Aparecida Alves Macedo'],63),
  ('rafaela.martins@fotus.com.br','Rafaela Dias Martins','Consultor','valdir.junior@fotus.com.br','Consultor Comercial','Comercial','Norte','RG 003 - NORTE - TIME 004',array['Rafaela Dias Martins'],64),
  ('romano.palcich@fotus.com.br','Romano Visintin Palcich','Consultor','valdir.junior@fotus.com.br','Consultor Comercial','Comercial','Norte','RG 003 - NORTE - TIME 004',array['Romano Visintin Palcich'],65),
  ('saulo.tinoco@fotus.com.br','Saulo de Matos Tinoco','Consultor','valdir.junior@fotus.com.br','Consultor Comercial','Comercial','Norte','RG 003 - NORTE - TIME 004',array['Saulo de Matos Tinoco'],66),
  ('alexsandro.freire@fotus.com.br','Alexsandro Coelho Freire','Consultor','amanda.ramai@fotus.com.br','Consultor Comercial','Comercial','Norte','RG 003 - NORTE - TIME 005',array['Alexsandro Coelho Freire'],67),
  ('douglas.cardoso@fotus.com.br','Douglas Cardoso da Silva','Consultor','amanda.ramai@fotus.com.br','Consultor Comercial','Comercial','Norte','RG 003 - NORTE - TIME 005',array['Douglas Cardoso da Silva'],68),
  ('ezequias.bernardes@fotus.com.br','Ezequias da Costa Bernardes','Consultor','amanda.ramai@fotus.com.br','Consultor Comercial','Comercial','Norte','RG 003 - NORTE - TIME 005',array['Ezequias da Costa Bernardes'],69),
  ('gabriel.malaguti@fotus.com.br','Gabriel Malaguti Almeida Reis','Consultor','amanda.ramai@fotus.com.br','Consultor Comercial','Comercial','Norte','RG 003 - NORTE - TIME 005',array['Gabriel Malaguti Almeida Reis'],70),
  ('guilherme.silva@fotus.com.br','Guilherme Silva Souza','Consultor','amanda.ramai@fotus.com.br','Consultor Comercial','Comercial','Norte','RG 003 - NORTE - TIME 005',array['Guilherme Silva Souza'],71),
  ('hyago.pestana@fotus.com.br','Hyago Pereira Pestana','Consultor','amanda.ramai@fotus.com.br','Consultor Comercial','Comercial','Norte','RG 003 - NORTE - TIME 005',array['Hyago Pereira Pestana'],72),
  ('matheus.mota@fotus.com.br','Matheus Mota de Oliveira','Consultor','amanda.ramai@fotus.com.br','Consultor Comercial','Comercial','Norte','RG 003 - NORTE - TIME 005',array['Matheus Mota de Oliveira'],73),
  ('pamella.gouvea@fotus.com.br','Pamella das Gracas Gouvea','Consultor','amanda.ramai@fotus.com.br','Consultor Comercial','Comercial','Norte','RG 003 - NORTE - TIME 005',array['Pamella das Gracas Gouvea'],74),
  ('carolina.abreu@fotus.com.br','Carolina de Souza Amorim de Abreu','Consultor','eric.santos@fotus.com.br','Consultor Comercial','Comercial','Sul','RG 005 - SUL - TIME 001',array['Carolina de Souza Amorim de Abreu'],75),
  ('diego.magalhaes@fotus.com.br','Diego Magalhaes Bonjardim Silveira','Consultor','eric.santos@fotus.com.br','Consultor Comercial','Comercial','Sul','RG 005 - SUL - TIME 001',array['Diego Magalhaes Bonjardim Silveira'],76),
  ('evelyn.almeida@fotus.com.br','Evelyn Correa do Nascimento Almeida','Consultor','eric.santos@fotus.com.br','Consultor Comercial','Comercial','Sul','RG 005 - SUL - TIME 001',array['Evelyn Correa do Nascimento Almeida'],77),
  ('hercules.carvalho@fotus.com.br','Hercules da Silva Carvalho','Consultor','eric.santos@fotus.com.br','Consultor Comercial','Comercial','Sul','RG 005 - SUL - TIME 001',array['Hercules da Silva Carvalho'],78),
  ('kamilly.silva@fotus.com.br','Kamilly Silva de Jesus','Consultor','eric.santos@fotus.com.br','Consultor Comercial','Comercial','Sul','RG 005 - SUL - TIME 001',array['Kamilly Silva de Jesus'],79),
  ('lara.figueiredo@fotus.com.br','Lara Barbosa Figueiredo','Consultor','eric.santos@fotus.com.br','Consultor Comercial','Comercial','Sul','RG 005 - SUL - TIME 001',array['Lara Barbosa Figueiredo'],80),
  ('marcos.antonio@fotus.com.br','Marcos Antonio de Souza','Consultor','eric.santos@fotus.com.br','Consultor Comercial','Comercial','Sul','RG 005 - SUL - TIME 001',array['Marcos Antonio de Souza'],81),
  ('simone.fink@fotus.com.br','Simone de Oliveira Fink','Consultor','eric.santos@fotus.com.br','Consultor Comercial','Comercial','Sul','RG 005 - SUL - TIME 001',array['Simone de Oliveira Fink'],82),
  ('hailla.carvalho@fotus.com.br','Hailla Vieira Carvalho','Consultor','gabriela.marques@fotus.com.br','Consultor Comercial','Comercial','Sul','RG 005 - SUL - TIME 002',array['Hailla Vieira Carvalho'],83),
  ('herleson.ribeiro@fotus.com.br','Herleson Ribeiro Feu de Souza','Consultor','gabriela.marques@fotus.com.br','Consultor Comercial','Comercial','Sul','RG 005 - SUL - TIME 002',array['Herleson Ribeiro Feu de Souza'],84),
  ('joao.coser@fotus.com.br','Joao Henrique da Silva Coser','Consultor','gabriela.marques@fotus.com.br','Consultor Comercial','Comercial','Sul','RG 005 - SUL - TIME 002',array['Joao Henrique da Silva Coser'],85),
  ('ligia.delpupo@fotus.com.br','Ligia Delpupo da Silva','Consultor','gabriela.marques@fotus.com.br','Consultor Comercial','Comercial','Sul','RG 005 - SUL - TIME 002',array['Ligia Delpupo da Silva'],86),
  ('michael.tessarolo@fotus.com.br','Michael Remydio Tessarolo','Consultor','gabriela.marques@fotus.com.br','Consultor Comercial','Comercial','Sul','RG 005 - SUL - TIME 002',array['Michael Remydio Tessarolo'],87),
  ('stephanie.croce@fotus.com.br','Stephanie Croce Deus Dara','Consultor','gabriela.marques@fotus.com.br','Consultor Comercial','Comercial','Sul','RG 005 - SUL - TIME 002',array['Stephanie Croce Deus Dara'],88),
  ('thomas.ravele@fotus.com.br','Thomas Ravele de Sousa Ribeiro','Consultor','gabriela.marques@fotus.com.br','Consultor Comercial','Comercial','Sul','RG 005 - SUL - TIME 002',array['Thomas Ravele de Sousa Ribeiro'],89),
  ('alvaro.andrade@fotus.com.br','Alvaro Jose de Andrade Freitas','Consultor','klicia.zacchi@fotus.com.br','Consultor Comercial','Comercial','Sul','RG 005 - SUL - TIME 004',array['Alvaro Jose de Andrade Freitas'],90),
  ('beatryz.wov@fotus.com.br','Ana Beatryz Wov Damasceno','Consultor','klicia.zacchi@fotus.com.br','Consultor Comercial','Comercial','Sul','RG 005 - SUL - TIME 004',array['Ana Beatryz Wov Damasceno'],91),
  ('andre.valandro@fotus.com.br','Andre Luiz Valandro Casagrande','Consultor','klicia.zacchi@fotus.com.br','Consultor Comercial','Comercial','Sul','RG 005 - SUL - TIME 004',array['Andre Luiz Valandro Casagrande'],92),
  ('diuliene.braga@fotus.com.br','Diuliene dos Santos Braga Nascimento','Consultor','klicia.zacchi@fotus.com.br','Consultor Comercial','Comercial','Sul','RG 005 - SUL - TIME 004',array['Diuliene dos Santos Braga Nascimento'],93),
  ('everton.natan@fotus.com.br','Everton Natan da Silva Goncalves','Consultor','klicia.zacchi@fotus.com.br','Consultor Comercial','Comercial','Sul','RG 005 - SUL - TIME 004',array['Everton Natan da Silva Goncalves'],94),
  ('neilane.angelo@fotus.com.br','Neilane da Silva Angelo','Consultor','klicia.zacchi@fotus.com.br','Consultor Comercial','Comercial','Sul','RG 005 - SUL - TIME 004',array['Neilane da Silva Angelo'],95),
  ('thiago.alves@fotus.com.br','Thiago Pessanha Alves','Consultor','klicia.zacchi@fotus.com.br','Consultor Comercial','Comercial','Sul','RG 005 - SUL - TIME 004',array['Thiago Pessanha Alves'],96),
  ('juliana.machado@fotus.com.br','Juliana Santos da Mata Machado','Consultor','layne.paula@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 001',array['Juliana Santos da Mata Machado'],97),
  ('laysar.barreto@fotus.com.br','Laysar Marcelino Barreto','Consultor','layne.paula@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 001',array['Laysar Marcelino Barreto'],98),
  ('livia.calixto@fotus.com.br','Livia Calixto dos Santos','Consultor','layne.paula@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 001',array['Livia Calixto dos Santos'],99),
  ('lorran.alexandre@fotus.com.br','Lorran Alexandre Ferreira Teixeira','Consultor','layne.paula@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 001',array['Lorran Alexandre Ferreira Teixeira'],100),
  ('mikaella.camargo@fotus.com.br','Mikaella Peixoto Camargo','Consultor','layne.paula@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 001',array['Mikaella Peixoto Camargo'],101),
  ('nathaly.santos@fotus.com.br','Nathaly Cristina Oliveira Santos','Consultor','layne.paula@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 001',array['Nathaly Cristina Oliveira Santos'],102),
  ('cheylane.vergna@fotus.com.br','Cheylane Vergna de Souza Soares','Consultor','gabriela.zafalon@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 002',array['Cheylane Vergna de Souza Soares'],103),
  ('diego.senna@fotus.com.br','Diego Coelho de Senna','Consultor','gabriela.zafalon@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 002',array['Diego Coelho de Senna'],104),
  ('gabriela.izoton@fotus.com.br','Gabriela Izoton de Macedo','Consultor','gabriela.zafalon@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 002',array['Gabriela Izoton de Macedo'],105),
  ('joao.soares@fotus.com.br','Joao Victor da Vitoria Soares','Consultor','gabriela.zafalon@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 002',array['Joao Victor da Vitoria Soares'],106),
  ('lais.helena@fotus.com.br','Lais Helena Rodrigues Mendes','Consultor','gabriela.zafalon@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 002',array['Lais Helena Rodrigues Mendes'],107),
  ('lucca.castiglioni@fotus.com.br','Lucca Paixao Castiglioni','Consultor','gabriela.zafalon@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 002',array['Lucca Paixao Castiglioni'],108),
  ('marcela.moreira@fotus.com.br','Marcela Gomes Moreira','Consultor','gabriela.zafalon@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 002',array['Marcela Gomes Moreira'],109),
  ('pedro.corneau@fotus.com.br','Pedro Henrique Tamanhao Corneau','Consultor','gabriela.zafalon@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 002',array['Pedro Henrique Tamanhao Corneau'],110),
  ('thais.brigido@fotus.com.br','Thais Brigido da Costa Sampaio','Consultor','gabriela.zafalon@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 002',array['Thais Brigido da Costa Sampaio'],111),
  ('william.moreira@fotus.com.br','William Braga Moreira','Consultor','gabriela.zafalon@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 002',array['William Braga Moreira'],112),
  ('amanda.vitoria@fotus.com.br','Amanda Vitoria Viana de Jesus','Consultor','deiviti.oliveira@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 003',array['Amanda Vitoria Viana de Jesus'],113),
  ('bruna.correia@fotus.com.br','Bruna Correia de Queiroz','Consultor','deiviti.oliveira@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 003',array['Bruna Correia de Queiroz'],114),
  ('celso.ventura@fotus.com.br','Celso Antonio Ventura Junior','Consultor','deiviti.oliveira@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 003',array['Celso Antonio Ventura Junior'],115),
  ('eduardo.rufino@fotus.com.br','Eduardo Junio Morais Rufino','Consultor','deiviti.oliveira@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 003',array['Eduardo Junio Morais Rufino'],116),
  ('joao.varejao@fotus.com.br','João Pedro Varejão Dare','Consultor','deiviti.oliveira@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 003',array['João Pedro Varejão Dare'],117),
  ('luiz.diego@fotus.com.br','Luiz Diego Neves Barros','Consultor','deiviti.oliveira@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 003',array['Luiz Diego Neves Barros'],118),
  ('roberta.belo@fotus.com.br','Roberta Belo de Almeida','Consultor','deiviti.oliveira@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 003',array['Roberta Belo de Almeida'],119),
  ('deise.lubas@fotus.com.br','Deise Gomes Lubas','Consultor','breno.souza@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 004',array['Deise Gomes Lubas'],120),
  ('elivel.neves@fotus.com.br','Elivel Santos Neves','Consultor','breno.souza@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 004',array['Elivel Santos Neves'],121),
  ('emanuel.pereira@fotus.com.br','Emanuel da Silva Pereira','Consultor','breno.souza@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 004',array['Emanuel da Silva Pereira'],122),
  ('fidel.castro@fotus.com.br','Fidel de Castro e Candido Americo Pachec','Consultor','breno.souza@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 004',array['Fidel de Castro e Candido Americo Pachec'],123),
  ('matheus.bessi@fotus.com.br','Matheus Bessi Barbosa','Consultor','breno.souza@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 004',array['Matheus Bessi Barbosa'],124),
  ('patrick.monteiro@fotus.com.br','Patrick Coutinho de Oliveira Monteiro','Consultor','breno.souza@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 004',array['Patrick Coutinho de Oliveira Monteiro'],125),
  ('tiara.aymi@fotus.com.br','Tiara Aymi Araujo','Consultor','breno.souza@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 004',array['Tiara Aymi Araujo'],126),
  ('leandro.natali@fotus.com.br','Leandro Rangel Natali','Consultor','tulio.silva@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 006',array['Leandro Rangel Natali'],127),
  ('daniela.lima@fotus.com.br','Daniela Silva Lima','Consultor','emanuele.siquara@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 007',array['Daniela Silva Lima'],128),
  ('natasha.soares@fotus.com.br','Natasha dos Santos Soares','Consultor','emanuele.siquara@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 007',array['Natasha dos Santos Soares'],129),
  ('valkiria.araujo@fotus.com.br','Valkiria Santos de Araujo','Consultor','emanuele.siquara@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Sul','RG 006 - NORDESTE EIXO SUL - TIME 007',array['Valkiria Santos de Araujo'],130),
  ('anna.souza@fotus.com.br','Anna Karoliny Lima de Souza','Consultor','rose.picoli@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 002',array['Anna Karoliny Lima de Souza'],131),
  ('daniel.caletti@fotus.com.br','Daniel Caletti','Consultor','rose.picoli@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 002',array['Daniel Caletti'],132),
  ('evillyn.castro@fotus.com.br','Evillyn Castro de Almeida Duque','Consultor','rose.picoli@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 002',array['Evillyn Castro de Almeida Duque'],133),
  ('kelem.freitas@fotus.com.br','Kelem Aparecida de Freitas Silva','Consultor','rose.picoli@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 002',array['Kelem Aparecida de Freitas Silva'],134),
  ('larissa.franca@fotus.com.br','Larissa Silva Sutil Franca','Consultor','rose.picoli@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 002',array['Larissa Silva Sutil Franca'],135),
  ('luciana.bitencourt@fotus.com.br','Luciana Bitencourt Ribeiro Pimentel','Consultor','rose.picoli@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 002',array['Luciana Bitencourt Ribeiro Pimentel'],136),
  ('mariana.jose@fotus.com.br','Mariana Tavares Sao Jose','Consultor','rose.picoli@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 002',array['Mariana Tavares Sao Jose'],137),
  ('vitor.abade@fotus.com.br','Vitor Abade de Jesus Vilas Boas','Consultor','rose.picoli@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 002',array['Vitor Abade de Jesus Vilas Boas'],138),
  ('alexandre.fraga@fotus.com.br','Alexandre Vieira Fraga','Consultor','paulo.amorim@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 005',array['Alexandre Vieira Fraga'],139),
  ('fernanda.alves@fotus.com.br','Fernanda Bastos Alves','Consultor','paulo.amorim@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 005',array['Fernanda Bastos Alves'],140),
  ('flavia.abda@fotus.com.br','Flavia Abda Oliveira Dutra Nascimento','Consultor','paulo.amorim@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 005',array['Flavia Abda Oliveira Dutra Nascimento'],141),
  ('gabriel.degasperi@fotus.com.br','Gabriel Degasperi de Souza','Consultor','paulo.amorim@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 005',array['Gabriel Degasperi de Souza'],142),
  ('geislane.muniz@fotus.com.br','Geislane Muniz de Paula','Consultor','paulo.amorim@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 005',array['Geislane Muniz de Paula'],143),
  ('johny.donato@fotus.com.br','Johny Antony Silva Donato','Consultor','paulo.amorim@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 005',array['Johny Antony Silva Donato'],144),
  ('luiz.carlos@fotus.com.br','Luiz da Silva Carlos','Consultor','paulo.amorim@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 005',array['Luiz da Silva Carlos'],145),
  ('melry.scher@fotus.com.br','Melry Renata Castro Scher','Consultor','paulo.amorim@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 005',array['Melry Renata Castro Scher'],146),
  ('djeniffer.pascoal@fotus.com.br','Djeniffer Silveira Moreira Pascoal','Consultor','rhaiani.tranhaque@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 008',array['Djeniffer Silveira Moreira Pascoal'],147),
  ('gabriel.martins@fotus.com.br','Gabriel Falcao Martins','Consultor','rhaiani.tranhaque@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 008',array['Gabriel Falcao Martins'],148),
  ('hygor.melo@fotus.com.br','Hygor da Silva Melo','Consultor','rhaiani.tranhaque@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 008',array['Hygor da Silva Melo'],149),
  ('igor.faria@fotus.com.br','Igor Faria Lima','Consultor','rhaiani.tranhaque@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 008',array['Igor Faria Lima'],150),
  ('joao.magalhaes@fotus.com.br','Joao Gabriel Magalhaes Rodrigues da Silva','Consultor','rhaiani.tranhaque@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 008',array['Joao Gabriel Magalhaes Rodrigues da Silva'],151),
  ('lucris.cuzzuol@fotus.com.br','Lucris Cuzzuol Bromonschenkel','Consultor','rhaiani.tranhaque@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 008',array['Lucris Cuzzuol Bromonschenkel'],152),
  ('matheus.oliveira@fotus.com.br','Matheus Enrique Abreu de Oliveira','Consultor','rhaiani.tranhaque@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 008',array['Matheus Enrique Abreu de Oliveira'],153),
  ('mirella.souza@fotus.com.br','Mirella de Mendonca e Souza','Consultor','rhaiani.tranhaque@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 008',array['Mirella de Mendonca e Souza'],154),
  ('gabriel.simon@fotus.com.br','Gabriel Santos Simon','Consultor','luana.orlandi@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 009',array['Gabriel Santos Simon'],155),
  ('helen.borba@fotus.com.br','Helen Braganca Borba Brunoro','Consultor','luana.orlandi@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 009',array['Helen Braganca Borba Brunoro'],156),
  ('igor.silva@fotus.com.br','Igor Pedro da Silva Neto','Consultor','luana.orlandi@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 009',array['Igor Pedro da Silva Neto'],157),
  ('kethelin.oliveira@fotus.com.br','Kethelin dos Reis Oliveira','Consultor','luana.orlandi@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 009',array['Kethelin dos Reis Oliveira'],158),
  ('matheus.trabach@fotus.com.br','Matheus Trabach de Menezes','Consultor','luana.orlandi@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 009',array['Matheus Trabach de Menezes'],159),
  ('nilo.nascimento@fotus.com.br','Nilo Junior do Nascimento Lucas','Consultor','luana.orlandi@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 009',array['Nilo Junior do Nascimento Lucas'],160),
  ('ramon.xavier@fotus.com.br','Ramon da Costa Xavier','Consultor','luana.orlandi@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 009',array['Ramon da Costa Xavier'],161),
  ('thaynara.oliveira@fotus.com.br','Thaynara Silva de Oliveira','Consultor','luana.orlandi@fotus.com.br','Consultor Comercial','Comercial','Nordeste Eixo Norte','RG 007 - NORDESTE EIXO NORTE - TIME 009',array['Thaynara Silva de Oliveira'],162),
  ('jaurio.melo@fotus.com.br','Jaurio Pereira de Mello Neto','Consultor','gustavo.gomes@fotus.com.br','Consultor Comercial','Novos Produtos','Novos Produtos','RG 011 - NOVOS PRODUTOS - TIME 001',array['Jaurio Pereira de Mello Neto'],163),
  ('joao.barbosa@fotus.com.br','Joao Guilherme Barbosa Pereira','Consultor','gustavo.gomes@fotus.com.br','Consultor Comercial','Novos Produtos','Novos Produtos','RG 011 - NOVOS PRODUTOS - TIME 001',array['Joao Guilherme Barbosa Pereira'],164),
  ('bianca.almeida@fotus.com.br','Bianca Giulian da Silva Almeida','Consultor','guilherme.escobar@fotus.com.br','Consultor Comercial','Comercial','São Paulo','RG 015 - SÃO PAULO - TIME 001',array['Bianca Giulian da Silva Almeida'],165),
  ('daniel.magliani@fotus.com.br','Daniel Alves Silva Magliani','Consultor','guilherme.escobar@fotus.com.br','Consultor Comercial','Comercial','São Paulo','RG 015 - SÃO PAULO - TIME 001',array['Daniel Alves Silva Magliani'],166),
  ('juliana.cavalcante@fotus.com.br','Juliana Cavalcante Pantalhao','Consultor','guilherme.escobar@fotus.com.br','Consultor Comercial','Comercial','São Paulo','RG 015 - SÃO PAULO - TIME 001',array['Juliana Cavalcante Pantalhao'],167),
  ('juliana.lima@fotus.com.br','Juliana Martins de Oliveira Lima','Consultor','guilherme.escobar@fotus.com.br','Consultor Comercial','Comercial','São Paulo','RG 015 - SÃO PAULO - TIME 001',array['Juliana Martins de Oliveira Lima'],168),
  ('karen.martinez@fotus.com.br','Karen Ruth Gomes de Oliveira Martinez','Consultor','guilherme.escobar@fotus.com.br','Consultor Comercial','Comercial','São Paulo','RG 015 - SÃO PAULO - TIME 001',array['Karen Ruth Gomes de Oliveira Martinez'],169),
  ('matheus.bergamini@fotus.com.br','Matheus Bergamini Borgueti','Consultor','guilherme.escobar@fotus.com.br','Consultor Comercial','Comercial','São Paulo','RG 015 - SÃO PAULO - TIME 001',array['Matheus Bergamini Borgueti'],170),
  ('tainara.pereira@fotus.com.br','Tainara Pereira da Silva','Consultor','guilherme.escobar@fotus.com.br','Consultor Comercial','Comercial','São Paulo','RG 015 - SÃO PAULO - TIME 001',array['Tainara Pereira da Silva'],171),
  ('gabriel.monfardini@fotus.com.br','Gabriel Monfardini','Consultor','rafael.carvalho@fotus.com.br','Consultor Comercial','Comercial','São Paulo','RG 015 - SÃO PAULO - TIME 002',array['Gabriel Monfardini'],172),
  ('luiz.correia@fotus.com.br','Luiz Felipe Silva de Souza Correia','Consultor','rafael.carvalho@fotus.com.br','Consultor Comercial','Comercial','São Paulo','RG 015 - SÃO PAULO - TIME 002',array['Luiz Felipe Silva de Souza Correia'],173),
  ('maria.pereira@fotus.com.br','Maria das Dores Souza Pereira Passos','Consultor','rafael.carvalho@fotus.com.br','Consultor Comercial','Comercial','São Paulo','RG 015 - SÃO PAULO - TIME 002',array['Maria das Dores Souza Pereira Passos'],174),
  ('raphael.sales@fotus.com.br','Raphael Sales da Silva','Consultor','rafael.carvalho@fotus.com.br','Consultor Comercial','Comercial','São Paulo','RG 015 - SÃO PAULO - TIME 002',array['Raphael Sales da Silva'],175),
  ('victoria.toledo@fotus.com.br','Victoria Toledo Amorim','Consultor','rafael.carvalho@fotus.com.br','Consultor Comercial','Comercial','São Paulo','RG 015 - SÃO PAULO - TIME 002',array['Victoria Toledo Amorim'],176),
  ('wender.cardoso@fotus.com.br','Wender Cardoso Julio','Consultor','rafael.carvalho@fotus.com.br','Consultor Comercial','Comercial','São Paulo','RG 015 - SÃO PAULO - TIME 002',array['Wender Cardoso Julio'],177),
  ('camila.gouvea@fotus.com.br','Camila Cova Gouvea','Consultor','victor.mayr@fotus.com.br','Consultor Comercial','Comercial','São Paulo','RG 015 - SÃO PAULO - TIME 003',array['Camila Cova Gouvea'],178),
  ('douglas.ramos@fotus.com.br','Douglas Ramos de Lima','Consultor','victor.mayr@fotus.com.br','Consultor Comercial','Comercial','São Paulo','RG 015 - SÃO PAULO - TIME 003',array['Douglas Ramos de Lima'],179),
  ('ester.pereira@fotus.com.br','Ester Maria Pereira','Consultor','victor.mayr@fotus.com.br','Consultor Comercial','Comercial','São Paulo','RG 015 - SÃO PAULO - TIME 003',array['Ester Maria Pereira'],180),
  ('giullia.oliveira@fotus.com.br','Giulia Polo de Oliveira','Consultor','victor.mayr@fotus.com.br','Consultor Comercial','Comercial','São Paulo','RG 015 - SÃO PAULO - TIME 003',array['Giulia Polo de Oliveira'],181),
  ('marcela.lima@fotus.com.br','Marcela de Aguiar Lima','Consultor','victor.mayr@fotus.com.br','Consultor Comercial','Comercial','São Paulo','RG 015 - SÃO PAULO - TIME 003',array['Marcela de Aguiar Lima'],182),
  ('matheus.lopes@fotus.com.br','Matheus Miguel Leal Lopes','Consultor','victor.mayr@fotus.com.br','Consultor Comercial','Comercial','São Paulo','RG 015 - SÃO PAULO - TIME 003',array['Matheus Miguel Leal Lopes'],183),
  ('daynne.mapeli@fotus.com.br','Daynne Mapeli Novaes','Consultor','dayane.ferreira@fotus.com.br','Consultor Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 001',array['Daynne Mapeli Novaes'],184),
  ('edijane.abranches@fotus.com.br','Edijane de Jesus Abranches','Consultor','dayane.ferreira@fotus.com.br','Consultor Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 001',array['Edijane de Jesus Abranches'],185),
  ('enzo.gouveia@fotus.com.br','Enzo Meroto Altafim Gouveia','Consultor','dayane.ferreira@fotus.com.br','Consultor Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 001',array['Enzo Meroto Altafim Gouveia'],186),
  ('gustavo.baylao@fotus.com.br','Gustavo Baylao Pereira Abraao','Consultor','dayane.ferreira@fotus.com.br','Consultor Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 001',array['Gustavo Baylao Pereira Abraao'],187),
  ('karolyne.braz@fotus.com.br','Karolyne Alvina Braz Dutra','Consultor','dayane.ferreira@fotus.com.br','Consultor Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 001',array['Karolyne Alvina Braz Dutra'],188),
  ('norton.ribeiro@fotus.com.br','Norton Ribeiro dos Santos','Consultor','dayane.ferreira@fotus.com.br','Consultor Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 001',array['Norton Ribeiro dos Santos'],189),
  ('samella.santiago@fotus.com.br','Samella Keise Santos Santiago','Consultor','dayane.ferreira@fotus.com.br','Consultor Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 001',array['Samella Keise Santos Santiago'],190),
  ('yara.dordenoni@fotus.com.br','Yara da Conceicao Dordenoni','Consultor','dayane.ferreira@fotus.com.br','Consultor Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 001',array['Yara da Conceicao Dordenoni'],191),
  ('giovanna.marques@fotus.com.br','Giovanna Marques Dias Ribeiro','Consultor','caroline.cabral@fotus.com.br','Consultor Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 002',array['Giovanna Marques Dias Ribeiro'],192),
  ('gleidson.silva@fotus.com.br','Gleidson Cristian Passifico Silva','Consultor','caroline.cabral@fotus.com.br','Consultor Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 002',array['Gleidson Cristian Passifico Silva'],193),
  ('janaina.vieira@fotus.com.br','Janaina da Silva Vargas Vieira','Consultor','caroline.cabral@fotus.com.br','Consultor Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 002',array['Janaina da Silva Vargas Vieira'],194),
  ('juliene.rodrigues@fotus.com.br','Juliene Rodrigues de Oliveira Nogueira','Consultor','caroline.cabral@fotus.com.br','Consultor Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 002',array['Juliene Rodrigues de Oliveira Nogueira'],195),
  ('karen.ribeiro@fotus.com.br','Karen Ribeiro de Souza Rocha','Consultor','caroline.cabral@fotus.com.br','Consultor Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 002',array['Karen Ribeiro de Souza Rocha'],196),
  ('kelvin.gomes@fotus.com.br','Kelvin Gomes dos Santos','Consultor','caroline.cabral@fotus.com.br','Consultor Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 002',array['Kelvin Gomes dos Santos'],197),
  ('milena.aparecida@fotus.com.br','Milena Aparecida da Silva','Consultor','caroline.cabral@fotus.com.br','Consultor Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 002',array['Milena Aparecida da Silva'],198),
  ('rafael.padias@fotus.com.br','Rafael Ferreira Padias','Consultor','caroline.cabral@fotus.com.br','Consultor Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 002',array['Rafael Ferreira Padias'],199),
  ('raysa.tomaz@fotus.com.br','Raysa Tomaz Caetano','Consultor','caroline.cabral@fotus.com.br','Consultor Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 002',array['Raysa Tomaz Caetano'],200),
  ('amanda.asevedo@fotus.com.br','Amanda Asevedo Santos','Consultor','roberto.gomes@fotus.com.br','Consultor Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 004',array['Amanda Asevedo Santos'],201),
  ('carlos.filippi@fotus.com.br','Carlos Eduardo Magalhães Filippi','Consultor','roberto.gomes@fotus.com.br','Consultor Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 004',array['Carlos Eduardo Magalhães Filippi'],202),
  ('kesia.lovato@fotus.com.br','Kesia Oliveira Lovato Santos','Consultor','roberto.gomes@fotus.com.br','Consultor Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 004',array['Kesia Oliveira Lovato Santos'],203),
  ('leonardo.tonini@fotus.com.br','Leonardo Tonini Rodrigues Campos','Consultor','roberto.gomes@fotus.com.br','Consultor Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 004',array['Leonardo Tonini Rodrigues Campos'],204),
  ('luciano.assis@fotus.com.br','Luciano de Assis Barbosa Junior','Consultor','roberto.gomes@fotus.com.br','Consultor Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 004',array['Luciano de Assis Barbosa Junior'],205),
  ('marcio.junior@fotus.com.br','Marcio Tulio Nogueira Junior','Consultor','roberto.gomes@fotus.com.br','Consultor Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 004',array['Marcio Tulio Nogueira Junior'],206),
  ('paulo.cardozo@fotus.com.br','Paulo Henrique Cardozo Baptista','Consultor','roberto.gomes@fotus.com.br','Consultor Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 004',array['Paulo Henrique Cardozo Baptista'],207),
  ('wellington.rigosino@fotus.com.br','Wellington Neves Rigosino','Consultor','roberto.gomes@fotus.com.br','Consultor Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 004',array['Wellington Neves Rigosino'],208),
  ('andre.medeiros@fotus.com.br','Andre Medeiros da Silva','Consultor','brunna.fernandes@fotus.com.br','Consultor Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 005',array['Andre Medeiros da Silva'],209),
  ('gabrielly.guimaraes@fotus.com.br','Gabrielly Alves Romanel Guimaraes','Consultor','brunna.fernandes@fotus.com.br','Consultor Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 005',array['Gabrielly Alves Romanel Guimaraes'],210),
  ('igor.couto@fotus.com.br','Ighor Hilgemberg Couto','Consultor','brunna.fernandes@fotus.com.br','Consultor Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 005',array['Ighor Hilgemberg Couto'],211),
  ('lucas.vaz@fotus.com.br','Lucas Nascimento Vaz Santos','Consultor','brunna.fernandes@fotus.com.br','Consultor Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 005',array['Lucas Nascimento Vaz Santos'],212),
  ('mateus.goncalves@fotus.com.br','Mateus Goncalves da Cruz','Consultor','brunna.fernandes@fotus.com.br','Consultor Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 005',array['Mateus Goncalves da Cruz'],213),
  ('scarlet.siqueira@fotus.com.br','Scarlet Eduarda Rosa Siqueira','Consultor','brunna.fernandes@fotus.com.br','Consultor Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 005',array['Scarlet Eduarda Rosa Siqueira'],214),
  ('wellington.renoke@fotus.com.br','Wellington Renoke Cruz','Consultor','brunna.fernandes@fotus.com.br','Consultor Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 005',array['Wellington Renoke Cruz'],215),
  ('yasmim.ventura@fotus.com.br','Yasmim Ventura Ferreira','Consultor','brunna.fernandes@fotus.com.br','Consultor Comercial','Comercial','Sudoeste','RG 016 - SUDOESTE - TIME 005',array['Yasmim Ventura Ferreira'],216),
  ('adriely.cardoso@fotus.com.br','Adriely Cardoso da Costa','Consultor','thompson.ramos@fotus.com.br','Consultor Comercial','Canais Digitais','BDR / Canal Digital','RG 017 - BDR/CANAL DIGITAL - TIME 002',array['Adriely Cardoso da Costa'],217),
  ('allyson.costa@fotus.com.br','Allyson Costa Silva','Consultor','thompson.ramos@fotus.com.br','Consultor Comercial','Canais Digitais','BDR / Canal Digital','RG 017 - BDR/CANAL DIGITAL - TIME 002',array['Allyson Costa Silva'],218),
  ('amanda.cruz@fotus.com.br','Amanda Cruz da Silva','Consultor','thompson.ramos@fotus.com.br','Consultor Comercial','Canais Digitais','BDR / Canal Digital','RG 017 - BDR/CANAL DIGITAL - TIME 002',array['Amanda Cruz da Silva'],219),
  ('amanda.scalzer@fotus.com.br','Amanda Scalzer Lima Mota','Consultor','thompson.ramos@fotus.com.br','Consultor Comercial','Canais Digitais','BDR / Canal Digital','RG 017 - BDR/CANAL DIGITAL - TIME 002',array['Amanda Scalzer Lima Mota'],220),
  ('gabriel.batista@fotus.com.br','Gabriel Henryque Batista Silva','Consultor','thompson.ramos@fotus.com.br','Consultor Comercial','Canais Digitais','BDR / Canal Digital','RG 017 - BDR/CANAL DIGITAL - TIME 002',array['Gabriel Henryque Batista Silva'],221),
  ('gentile.felipe@fotus.com.br','Gentile Lira Felipe','Consultor','thompson.ramos@fotus.com.br','Consultor Comercial','Canais Digitais','BDR / Canal Digital','RG 017 - BDR/CANAL DIGITAL - TIME 002',array['Gentile Lira Felipe'],222),
  ('gisele.martinelli@fotus.com.br','Gisele Carolyne Martinelli dos Santos','Consultor','thompson.ramos@fotus.com.br','Consultor Comercial','Canais Digitais','BDR / Canal Digital','RG 017 - BDR/CANAL DIGITAL - TIME 002',array['Gisele Carolyne Martinelli dos Santos'],223),
  ('karoliny.moura@fotus.com.br','Karoliny Sales de Moura','Consultor','thompson.ramos@fotus.com.br','Consultor Comercial','Canais Digitais','BDR / Canal Digital','RG 017 - BDR/CANAL DIGITAL - TIME 002',array['Karoliny Sales de Moura'],224),
  ('lucas.rufino@fotus.com.br','Lucas Rufino Vieira','Consultor','thompson.ramos@fotus.com.br','Consultor Comercial','Canais Digitais','BDR / Canal Digital','RG 017 - BDR/CANAL DIGITAL - TIME 002',array['Lucas Rufino Vieira'],225),
  ('maria.birchler@fotus.com.br','Maria Eduarda Birchler Araujo da Silva','Consultor','thompson.ramos@fotus.com.br','Consultor Comercial','Canais Digitais','BDR / Canal Digital','RG 017 - BDR/CANAL DIGITAL - TIME 002',array['Maria Eduarda Birchler Araujo da Silva'],226),
  ('noemy.nicolau@fotus.com.br','Noemy Nicolau','Consultor','thompson.ramos@fotus.com.br','Consultor Comercial','Canais Digitais','BDR / Canal Digital','RG 017 - BDR/CANAL DIGITAL - TIME 002',array['Noemy Nicolau'],227),
  ('sara.freitas@fotus.com.br','Sara da Silva Freitas','Consultor','thompson.ramos@fotus.com.br','Consultor Comercial','Canais Digitais','BDR / Canal Digital','RG 017 - BDR/CANAL DIGITAL - TIME 002',array['Sara da Silva Freitas'],228);

create temp table fotus_scd_resolved (
  email citext primary key, person_id uuid unique not null, was_created boolean not null
) on commit drop;

do $$
declare
  source_person record;
  matched_id uuid;
  match_ids uuid[];
  created_person boolean;
  effective_email citext;
begin
  for source_person in select * from fotus_scd_people order by source_order loop
    matched_id := null;
    created_person := false;
    select id into matched_id from public.organization_people where email=source_person.email;
    if matched_id is null then
      select array_agg(id) into match_ids from public.organization_people
      where lower(btrim(name))=any(array(select lower(btrim(alias)) from unnest(source_person.aliases) as names(alias)));
      if coalesce(cardinality(match_ids),0)>1 then
        raise exception 'Há mais de um card correspondente a %. Revise os cadastros antes de importar.', source_person.name;
      end if;
      matched_id := match_ids[1];
    end if;

    if matched_id is null then
      insert into public.organization_people
        (legacy_firestore_id,app_user_id,name,email,role,reports_to_id,job_title,department,regional,team_name,sort_order,active,created_by_email)
      values (
        'scd-person-' || md5(source_person.email::text),
        (select id from public.app_users where email=source_person.email),
        source_person.name,source_person.email,source_person.role,null,
        source_person.job_title,source_person.department,source_person.regional,source_person.team_name,
        (select coalesce(max(sort_order),0)+1 from public.organization_people where role=source_person.role),
        true,'guilhermebarbosars@gmail.com'
      ) returning id into matched_id;
      created_person := true;
    else
      select coalesce(nullif(email::text,''),source_person.email::text)::citext
        into effective_email from public.organization_people where id=matched_id;
      update public.organization_people set
        legacy_firestore_id=coalesce(legacy_firestore_id,'scd-person-' || md5(source_person.email::text)),
        name=source_person.name,email=effective_email,
        app_user_id=coalesce(app_user_id,(select id from public.app_users where email=effective_email)),
        job_title=coalesce(nullif(job_title,''),source_person.job_title),
        department=coalesce(nullif(department,''),source_person.department),
        regional=source_person.regional,team_name=source_person.team_name,
        reports_to_id=case when source_person.supervisor_email is null and role=source_person.role then reports_to_id else null end,
        role=source_person.role,active=true,updated_at=now()
      where id=matched_id;
    end if;

    insert into fotus_scd_resolved values (source_person.email,matched_id,created_person);
  end loop;
end;
$$;

-- A equipe sem líder fica ligada ao coordenador informado.
-- Os responsáveis ausentes não são substituídos por pessoas fictícias.
update public.organization_people person set reports_to_id=supervisor.person_id,updated_at=now()
from fotus_scd_people source_person
join fotus_scd_resolved resolved on resolved.email=source_person.email
join fotus_scd_resolved supervisor on supervisor.email=source_person.supervisor_email
where person.id=resolved.person_id;

select count(*) as pessoas_da_planilha,
  count(*) filter (where was_created) as novos_cards,
  count(*) filter (where not was_created) as cards_atualizados
from fotus_scd_resolved;

commit;
