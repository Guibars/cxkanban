-- Cole no Neon SQL Editor depois de 014_organization_contacts.sql.
-- Fonte: Contatos dos Gestores Comerciais – Fotus, 25/09/2026.
-- O PDF não informa e-mails. Contatos existentes mantêm seus e-mails.
-- As 16 fotos reais estão nos arquivos public/organization do site.
begin;

create temp table fotus_pdf_contacts (
  name text, role text, supervisor_name text, phone text,
  department text, regional text, photo_url text, sort_order integer
) on commit drop;

insert into fotus_pdf_contacts values
  ('Rosi Job','Gerente',null,'(27) 99766-8974','Comercial','Sudoeste, Norte e Sul','/organization/rosi-job.jpg',1),
  ('Taisson Fonseca','Gerente',null,'(27) 99739-9812','Comercial','Nordeste Eixo Sul e Norte','/organization/taisson-fonseca.jpg',2),
  ('Jenner Hardman','Gerente',null,'(27) 99964-6399','Operações Comerciais','BKO Logística, BKO Cadastro e Célula de Financiamento',null,3),
  ('Maihk Santos','Coordenador','Rosi Job','(27) 99823-1463','Comercial','Sudoeste','/organization/maihk-santos.jpg',1),
  ('Pablo Menix','Coordenador','Rosi Job','(27) 99881-7499','Comercial','Norte','/organization/pablo-menix.jpg',2),
  ('Paulo Rodrigues','Coordenador','Rosi Job','(27) 99842-5728','Comercial','Sul','/organization/paulo-rodrigues.jpg',3),
  ('Túlio Barroso','Coordenador','Taisson Fonseca','(27) 99808-5121','Comercial','Nordeste Eixo Sul','/organization/tulio-barroso.jpg',4),
  ('Cintya Holanda','Coordenador','Taisson Fonseca','(27) 99891-8924','Comercial','Nordeste Eixo Norte',null,5),
  ('Thompson Ramos','Coordenador',null,'(27) 99813-9268','Canais Digitais','SDR e BDR',null,6),
  ('Rafael Louzada','Coordenador','Jenner Hardman','(27) 99711-5890','Operações Comerciais','BKO Cadastro e BKO Conferência',null,7),
  ('Patrícia Rosa','Coordenador','Jenner Hardman','(27) 99857-6367','Operações Comerciais','Célula de Financiamento',null,8),
  ('Roberto Goldgner','Líder','Maihk Santos','(27) 99736-3108','Comercial','Sudoeste','/organization/roberto-goldgner.jpg',1),
  ('Bruna Fernandes','Líder','Maihk Santos','(27) 99789-4508','Comercial','Sudoeste','/organization/bruna-fernandes.jpg',2),
  ('Caroline Cabral','Líder','Maihk Santos','(27) 99648-0789','Comercial','Sudoeste','/organization/caroline-cabral.jpg',3),
  ('Dayane Ferreira','Líder','Maihk Santos','(27) 99755-3407','Comercial','Sudoeste','/organization/dayane-ferreira.jpg',4),
  ('Cezar Tellaroli','Líder','Pablo Menix','(27) 99764-1570','Comercial','Norte','/organization/cezar-tellaroli.jpg',5),
  ('Cleidson Batista','Líder','Pablo Menix','(27) 99943-6774','Comercial','Norte','/organization/cleidson-batista.jpg',6),
  ('Amanda Ramai','Líder','Pablo Menix','(27) 99744-6493','Comercial','Norte','/organization/amanda-ramai.jpg',7),
  ('Gabriela Marques','Líder','Paulo Rodrigues','(51) 99669-4451','Comercial','Sul','/organization/gabriela-marques.jpg',8),
  ('Klicia Zacchi','Líder','Paulo Rodrigues','(51) 99907-2352','Comercial','Sul','/organization/klicia-zacchi.jpg',9),
  ('Eric Santos','Líder','Paulo Rodrigues','(27) 99954-7174','Comercial','Sul','/organization/eric-santos.jpg',10),
  ('Gabriela Zafalon','Líder','Túlio Barroso','(27) 99870-4231','Comercial','Nordeste Eixo Sul',null,11),
  ('Layne Gomes','Líder','Túlio Barroso','(27) 99922-3117','Comercial','Nordeste Eixo Sul',null,12),
  ('Luana Orlandi','Líder','Cintya Holanda','(27) 99622-4016','Comercial','Nordeste Eixo Norte',null,13),
  ('Rhaiani Tranhaque','Líder','Cintya Holanda','(27) 99709-8638','Comercial','Nordeste Eixo Norte',null,14),
  ('Rose Picoli','Líder','Cintya Holanda','(27) 99654-4767','Comercial','Nordeste Eixo Norte',null,15),
  ('Paulo Amorim','Líder','Cintya Holanda','(27) 99660-2772','Comercial','Nordeste Eixo Norte',null,16),
  ('Matheus Mendes','Líder','Thompson Ramos','(27) 99857-7694','Canais Digitais','SDR',null,17),
  ('Karen Angeli','Líder','Rafael Louzada','(27) 99960-5063','Operações Comerciais','BKO Cadastro',null,18);

insert into public.organization_people
  (legacy_firestore_id,name,email,job_title,phone,photo_url,sort_order,role,reports_to_id,department,regional,active,created_by_email)
select 'pdf-gestores-2026-' || lower(regexp_replace(t.name,'[^[:alnum:]]+','-','g')),
  t.name,null,case t.name
    when 'Jenner Hardman' then 'Gerente de Operações Comerciais'
    when 'Karen Angeli' then 'Líder Administrativo'
    when 'Patrícia Rosa' then 'Coordenadora · Célula de Financiamento'
    when 'Cintya Holanda' then 'Coordenadora Comercial'
    else t.role || ' Comercial' end,
  t.phone,t.photo_url,t.sort_order,t.role,null,t.department,t.regional,true,'guilhermebarbosars@gmail.com'
from fotus_pdf_contacts t
where not exists (select 1 from public.organization_people p where lower(p.name)=lower(t.name))
on conflict (legacy_firestore_id) do nothing;

update public.organization_people p set
  legacy_firestore_id=coalesce(p.legacy_firestore_id,'pdf-gestores-2026-' || lower(regexp_replace(t.name,'[^[:alnum:]]+','-','g'))),
  job_title=case t.name
    when 'Jenner Hardman' then 'Gerente de Operações Comerciais'
    when 'Karen Angeli' then 'Líder Administrativo'
    when 'Patrícia Rosa' then 'Coordenadora · Célula de Financiamento'
    when 'Cintya Holanda' then 'Coordenadora Comercial'
    else t.role || ' Comercial' end,
  phone=t.phone,photo_url=coalesce(t.photo_url,p.photo_url),sort_order=t.sort_order,
  role=t.role,reports_to_id=null,department=t.department,regional=t.regional,active=true,updated_at=now()
from fotus_pdf_contacts t where lower(p.name)=lower(t.name);

update public.organization_people p set reports_to_id=supervisor.id,updated_at=now()
from fotus_pdf_contacts t
join public.organization_people supervisor on lower(supervisor.name)=lower(t.supervisor_name)
where lower(p.name)=lower(t.name) and t.supervisor_name is not null;

commit;
