import { buildPremiumPDF } from './lib/premiumPDF';
import { defaultCompanyProfile } from './lib/companyProfile';
import { writeFileSync } from 'fs';
const p = {...defaultCompanyProfile} as any;
const doc = await buildPremiumPDF({docType:'orcamento',number:'MR-2026-0001',date:new Date(),validityDays:5,
 customer:{name:'mario rogerio',phone:'11962579428',street:'Rua Tito Capinam, 61'},
 items:[{description:'Câmera Dome Aitek 2MP Full HD Colorida Noturna com Áudio',quantity:1,unitPrice:169.9},{description:'Câmera Bullet Aitek FHD 2MP Visão Noturna Colorida com Áudio',quantity:1,unitPrice:189.9},{description:'Câmera Speed Dome Aitek WiFi PTZ 2MP com Áudio Bidirecional',quantity:1,unitPrice:349.9}] as any,
 warranty:{option:'1y',text:p.default_warranty_text},
 notes:p.pdf_notes_text}, p);
writeFileSync('out2.pdf', Buffer.from(doc.output('arraybuffer')));
