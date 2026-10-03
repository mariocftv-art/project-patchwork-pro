import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

/** Transforma o PDF gerado em imagens das páginas (mesmo documento para prévia e impressão). */
export async function renderPdfPages(blob: Blob, scale = 2): Promise<string[]> {
  const data = new Uint8Array(await blob.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const vp = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(vp.width);
    canvas.height = Math.ceil(vp.height);
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    pages.push(canvas.toDataURL('image/jpeg', 0.92));
  }
  await pdf.destroy();
  return pages;
}

/** Imprime as páginas do PDF em A4, sem nada do painel. */
export function printPages(pages: string[]) {
  const root = document.createElement('div');
  root.id = 'mr-print-root';
  pages.forEach((src) => {
    const img = document.createElement('img');
    img.src = src;
    root.appendChild(img);
  });
  const style = document.createElement('style');
  style.textContent = `
    #mr-print-root { display: none; }
    @page { size: A4; margin: 0; }
    @media print {
      body > *:not(#mr-print-root) { display: none !important; }
      #mr-print-root { display: block !important; }
      #mr-print-root img { display: block; width: 210mm; height: 297mm; page-break-after: always; break-after: page; }
      #mr-print-root img:last-child { page-break-after: auto; break-after: auto; }
    }`;
  document.body.appendChild(style);
  document.body.appendChild(root);
  const cleanup = () => {
    root.remove();
    style.remove();
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  const imgs = Array.from(root.querySelectorAll('img'));
  Promise.all(imgs.map((i) => (i.complete ? Promise.resolve() : new Promise((r) => (i.onload = r))))).then(() => {
    window.print();
    setTimeout(cleanup, 60000);
  });
}

interface Props {
  blob: Blob | null;
  onPages?: (pages: string[]) => void;
}

export default function PdfPagesPreview({ blob, onPages }: Props) {
  const [pages, setPages] = useState<string[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (!blob) return;
    let alive = true;
    setState('loading');
    renderPdfPages(blob)
      .then((p) => {
        if (!alive) return;
        setPages(p);
        onPages?.(p);
        setState('ready');
      })
      .catch((e) => {
        console.error('Prévia:', e);
        if (alive) setState('error');
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blob]);

  if (!blob || state === 'loading') {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-2 rounded border border-border bg-muted text-sm text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        Preparando documento...
      </div>
    );
  }
  if (state === 'error') {
    return (
      <div className="h-[30vh] flex flex-col items-center justify-center gap-2 rounded border border-border bg-muted text-sm text-muted-foreground text-center px-4">
        <AlertTriangle className="h-6 w-6" />
        Não foi possível carregar a pré-visualização. O documento continua disponível para gerar PDF.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CheckCircle2 className="h-4 w-4" /> Documento pronto — {pages.length} {pages.length === 1 ? 'página' : 'páginas'}
      </p>
      <div className="max-h-[65vh] overflow-y-auto rounded border border-border bg-muted p-3 space-y-3">
        {pages.map((src, i) => (
          <img key={i} src={src} alt={`Página ${i + 1}`} className="mx-auto w-full max-w-[640px] shadow-md bg-background" />
        ))}
      </div>
    </div>
  );
}

/** Extrai o texto do PDF em linhas (para leitura responsiva no celular). */
export async function extractPdfLines(blob: Blob): Promise<string[][]> {
  const data = new Uint8Array(await blob.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
  const out: string[][] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    const rows = new Map<number, { x: number; s: string }[]>();
    for (const it of tc.items as { str: string; transform: number[] }[]) {
      if (!it.str) continue;
      const y = Math.round(it.transform[5] / 2) * 2;
      rows.set(y, [...(rows.get(y) || []), { x: it.transform[4], s: it.str }]);
    }
    const lines = [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, parts]) => parts.sort((a, b) => a.x - b.x).map((p) => p.s).join(' ').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    out.push(lines);
  }
  await pdf.destroy();
  return out;
}
