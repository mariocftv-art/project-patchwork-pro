import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  title: string;
  signerName: string;
  contractLabel: string;
  onCancel: () => void;
  onConfirm: (png: string, ratio: number) => void | Promise<void>;
}

/** Área de assinatura em tela cheia (dedo, caneta ou mouse). */
export default function SignaturePad({ title, signerName, contractLabel, onCancel, onConfirm }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const bounds = useRef({ minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
  const [empty, setEmpty] = useState(true);
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);

  // Tenta deitar o celular (só funciona onde o navegador permite)
  useEffect(() => {
    const el = document.documentElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    (async () => {
      try {
        if (window.matchMedia('(pointer: coarse)').matches && el.requestFullscreen) {
          await el.requestFullscreen();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (screen.orientation as any)?.lock?.('landscape');
        }
      } catch {
        /* sem suporte: a área já é horizontal dentro da tela */
      }
    })();
    return () => {
      document.body.style.overflow = prevOverflow;
      try {
        screen.orientation?.unlock?.();
      } catch {
        /* ignore */
      }
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  const setup = () => {
    const c = canvasRef.current;
    const w = wrapRef.current;
    if (!c || !w) return;
    const dpr = window.devicePixelRatio || 1;
    const r = w.getBoundingClientRect();
    c.width = Math.round(r.width * dpr);
    c.height = Math.round(r.height * dpr);
    c.style.width = `${r.width}px`;
    c.style.height = `${r.height}px`;
    const ctx = c.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = '#0a0a0a';
    bounds.current = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    setEmpty(true);
  };

  useEffect(() => {
    setup();
    const on = () => setup();
    window.addEventListener('resize', on);
    screen.orientation?.addEventListener?.('change', on);
    return () => {
      window.removeEventListener('resize', on);
      screen.orientation?.removeEventListener?.('change', on);
    };
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const grow = (p: { x: number; y: number }) => {
    const b = bounds.current;
    b.minX = Math.min(b.minX, p.x);
    b.minY = Math.min(b.minY, p.y);
    b.maxX = Math.max(b.maxX, p.x);
    b.maxY = Math.max(b.maxY, p.y);
  };

  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    canvasRef.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = pos(e);
    last.current = p;
    grow(p);
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0a0a';
    ctx.fill();
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current || !last.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext('2d')!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const evs: PointerEvent[] = (e.nativeEvent as any).getCoalescedEvents?.() || [e.nativeEvent];
    const r = canvasRef.current!.getBoundingClientRect();
    for (const ev of evs) {
      const p = { x: ev.clientX - r.left, y: ev.clientY - r.top };
      const mid = { x: (last.current.x + p.x) / 2, y: (last.current.y + p.y) / 2 };
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.quadraticCurveTo(last.current.x, last.current.y, mid.x, mid.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last.current = p;
      grow(p);
    }
    if (empty) setEmpty(false);
  };
  const up = () => {
    drawing.current = false;
    last.current = null;
  };

  /** Recorta só o traço, com fundo transparente */
  const exportPng = (): { png: string; ratio: number } => {
    const c = canvasRef.current!;
    const dpr = window.devicePixelRatio || 1;
    const b = bounds.current;
    const pad = 8;
    const x = Math.max(0, (b.minX - pad) * dpr);
    const y = Math.max(0, (b.minY - pad) * dpr);
    const w = Math.min(c.width - x, (b.maxX - b.minX + pad * 2) * dpr);
    const h = Math.min(c.height - y, (b.maxY - b.minY + pad * 2) * dpr);
    const out = document.createElement('canvas');
    const scale = Math.min(1, 900 / w);
    out.width = Math.max(1, Math.round(w * scale));
    out.height = Math.max(1, Math.round(h * scale));
    out.getContext('2d')!.drawImage(c, x, y, w, h, 0, 0, out.width, out.height);
    return { png: out.toDataURL('image/png'), ratio: out.width / out.height };
  };

  const confirm = async () => {
    setBusy(true);
    try {
      const { png, ratio } = exportPng();
      await onConfirm(png, ratio);
    } finally {
      setBusy(false);
      setAsk(false);
    }
  };

  return createPortal(
    <div className="keep-light fixed inset-0 z-[100] flex flex-col bg-secondary text-secondary-foreground" style={{ touchAction: 'none' }}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b-2 border-primary">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wide text-primary">{title}</p>
          <p className="text-sm font-semibold truncate">{signerName}</p>
          <p className="text-xs opacity-80 truncate">{contractLabel}</p>
        </div>
        <p className="text-xs opacity-90">Assine no espaço abaixo para confirmar sua assinatura</p>
      </div>

      <div ref={wrapRef} className="relative flex-1 m-2 rounded-md bg-card overflow-hidden">
        <div className="pointer-events-none absolute left-[6%] right-[6%] top-[70%] border-t-2 border-foreground" />
        <span className="pointer-events-none absolute left-[6%] top-[70%] mt-1 text-xs text-muted-foreground">{signerName}</span>
        <span className="pointer-events-none absolute left-[6%] top-[70%] -mt-7 text-2xl text-muted-foreground">✕</span>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 touch-none cursor-crosshair"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onPointerLeave={up}
          aria-label="Área de assinatura"
        />
      </div>

      <div className="grid grid-cols-3 gap-2 p-2">
        <Button variant="outline" className="h-12 text-foreground" onClick={setup} disabled={busy}>Limpar assinatura</Button>
        <Button variant="outline" className="h-12 text-foreground" onClick={onCancel} disabled={busy}>Cancelar</Button>
        <Button className="h-12" onClick={() => setAsk(true)} disabled={empty || busy}>Confirmar assinatura</Button>
      </div>

      <AlertDialog open={ask} onOpenChange={setAsk}>
        <AlertDialogContent className="z-[110]">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar assinatura?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja confirmar esta assinatura? Após confirmar, ela será registrada neste contrato.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirm(); }} disabled={busy}>
              {busy ? 'Registrando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>,
    document.body,
  );
}
