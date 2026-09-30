
- Pedidos: insert sem .select() e leitura pública só via RPC SECURITY DEFINER (get_order_by_number/get_order_statuses) — RLS de orders fica ligada.
- Documentos (orçamento/contrato/OS): um único gerador jsPDF (premiumPDF.ts) alimenta PDF, prévia e impressão — a prévia/impressão renderizam as páginas desse PDF via pdfjs, porque a CSP (object-src 'none') bloqueia o leitor de PDF do navegador.
- Escopo do contrato e WhatsApp saem dos itens do documento (docScope.ts categoriza; placeholders {ESCOPO}/{PAGAMENTO}/{GARANTIA_PERIODO}) — nunca texto fixo de produtos.
- Fotos de outros sites no PDF passam pela função image-proxy (CORS), só http(s) público e imagens até 5 MB.
- Versões de documentos ficam em quote_versions (só inserção, admin); contrato assinado nunca é sobrescrito — edição gera aditivo novo. Why: preservar prova jurídica.
