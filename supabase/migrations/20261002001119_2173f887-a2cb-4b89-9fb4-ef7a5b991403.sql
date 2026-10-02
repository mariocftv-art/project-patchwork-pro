UPDATE public.installation_services SET image_url = v.u, image_illustrative = true
FROM (VALUES
 ('63020a53-6ea9-4809-8875-36afcd0fc670','/__l5e/assets-v1/9f2ddabc-b5ad-4cab-a577-d1e49979a7d0/servico-cameras.jpg'),
 ('678a16bd-3bdb-4227-b729-5b61aa4855e2','/__l5e/assets-v1/62906971-1e55-450e-a35a-5300e28a3dc5/servico-cerca.jpg'),
 ('af7da721-9391-4da3-9e44-efb4d2bdd21c','/__l5e/assets-v1/c1e1cbd2-d4e1-404e-990a-9cf281e22506/servico-alarme.jpg'),
 ('51f4f346-28cf-404d-8074-fa8cf27c0ba1','/__l5e/assets-v1/2f5e4ec2-6be8-4f5f-af6c-b457e22cae11/servico-acesso.jpg'),
 ('0d1298bb-678a-46b9-877c-7f6c45326b5b','/__l5e/assets-v1/c4a57b26-abaa-4fdb-91c0-5fcfc4aa23a0/servico-automacao.jpg'),
 ('55b16897-3fc3-4b7d-9658-5bf27d1ddeeb','/__l5e/assets-v1/b3963f81-89eb-41e7-8802-cca6343cb98b/servico-interfone.jpg')
) AS v(id,u) WHERE installation_services.id = v.id::uuid;

UPDATE public.installation_services SET
  description = 'Valor do Serviço Técnico Especializado por câmera instalada. Para mais câmeras, aumente a quantidade (ex.: 4 câmeras = 4 unidades). Preço válido para equipamentos comprados na MR Segurança Máxima; equipamento comprado em outro lugar tem valor diferente.',
  conditions = '[{"label":"Região atendida","value":"São Paulo zona Leste, Ferraz, Guaianazes, Guarulhos e Itaquaquecetuba"},{"label":"Preço","value":"válido para equipamentos comprados na MR; equipamento de outra loja tem valor diferente"},{"label":"Agendamento","value":"pelo WhatsApp em até 24h"}]'::jsonb,
  excluded = ARRAY['Equipamentos (câmeras, DVR, cabos e fontes)']
WHERE id = '63020a53-6ea9-4809-8875-36afcd0fc670';
UPDATE public.installation_services SET description = replace(replace(description,'mão de obra','Serviço Técnico Especializado'),'Mão de obra','Serviço Técnico Especializado')
WHERE id = '9280650c-7c4f-4ad0-9cc5-38eda196202e';
UPDATE public.products SET description = replace(replace(description,'mão de obra','Serviço Técnico Especializado'),'Mão de obra','Serviço Técnico Especializado'),
  summary = replace(replace(coalesce(summary,''),'mão de obra','Serviço Técnico Especializado'),'Mão de obra','Serviço Técnico Especializado')
WHERE description ILIKE '%mão de obra%' OR summary ILIKE '%mão de obra%';