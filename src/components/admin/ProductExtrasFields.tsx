import { useQuery } from '@tanstack/react-query';
import { X, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import { productsApi, Product } from '@/lib/supabaseApi';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export interface ProductExtras {
  includes_installation: boolean;
  promo_enabled: boolean;
  promo_price: number | null;
  promo_until: string; // yyyy-mm-dd
  related_ids: string[];
  bundle_ids: string[];
  summary: string;
  features: string[];
  specs: { label: string; value: string }[];
  box_items: string[];
  ideal_for: string;
}

export function extrasFromProduct(p?: Product | null): ProductExtras {
  return {
    includes_installation: !!p?.includes_installation,
    promo_enabled: !!p?.promo_enabled,
    promo_price: p?.promo_price != null ? Number(p.promo_price) : null,
    promo_until: p?.promo_until ? p.promo_until.slice(0, 10) : '',
    related_ids: p?.related_ids ?? [],
    bundle_ids: p?.bundle_ids ?? [],
    summary: p?.summary ?? p?.description ?? '',
    features: p?.features ?? [],
    specs: p?.specs ?? [],
    box_items: p?.box_items ?? [],
    ideal_for: p?.ideal_for ?? '',
  };
}

export function extrasPayload(e: ProductExtras): Partial<Product> {
  const clean = (a: string[]) => a.map((x) => x.trim()).filter(Boolean);
  return {
    includes_installation: e.includes_installation,
    promo_enabled: e.promo_enabled,
    promo_price: e.promo_price,
    // validade termina no fim do dia escolhido (horário de Brasília)
    promo_until: e.promo_until ? new Date(`${e.promo_until}T23:59:59-03:00`).toISOString() : null,
    related_ids: e.related_ids.slice(0, 6),
    bundle_ids: e.bundle_ids.slice(0, 2),
    summary: e.summary.trim() || null,
    features: clean(e.features),
    specs: e.specs.map((s) => ({ label: s.label.trim(), value: s.value.trim() })).filter((s) => s.label && s.value),
    box_items: clean(e.box_items),
    ideal_for: e.ideal_for.trim() || null,
  };
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border-2 border-border p-4 space-y-3">
      <h4 className="font-semibold text-foreground">{title}</h4>
      {children}
    </div>
  );
}

export function move<T>(a: T[], from: number, to: number): T[] {
  if (to < 0 || to >= a.length) return a;
  const n = [...a];
  const [x] = n.splice(from, 1);
  n.splice(to, 0, x);
  return n;
}

export function MoveBtns({ i, n, onMove }: { i: number; n: number; onMove: (from: number, to: number) => void }) {
  return (
    <div className="flex flex-col">
      <button type="button" aria-label="Subir" disabled={i === 0} onClick={() => onMove(i, i - 1)} className="h-5 px-1 disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
      <button type="button" aria-label="Descer" disabled={i === n - 1} onClick={() => onMove(i, i + 1)} className="h-5 px-1 disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
    </div>
  );
}

function ListEditor({ items, onChange, placeholder, addLabel = 'Adicionar linha' }: { items: string[]; onChange: (v: string[]) => void; placeholder: string; addLabel?: string }) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex gap-2">
          <Input value={it} placeholder={placeholder} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
          <MoveBtns i={i} n={items.length} onMove={(a, b) => onChange(move(items, a, b))} />
          <Button type="button" variant="ghost" size="icon" aria-label="Remover linha" onClick={() => onChange(items.filter((_, j) => j !== i))}><X className="w-4 h-4" /></Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, ''])}><Plus className="w-4 h-4 mr-1" /> {addLabel}</Button>
    </div>
  );
}

function ProductPicker({ ids, onChange, max, all, selfId }: { ids: string[]; onChange: (v: string[]) => void; max: number; all: Product[]; selfId?: string }) {
  const options = all.filter((p) => p.id !== selfId && !ids.includes(p.id));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {ids.map((id) => {
          const p = all.find((x) => x.id === id);
          return (
            <span key={id} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs">
              {p?.title ?? 'Produto removido'}
              <button type="button" aria-label="Tirar" onClick={() => onChange(ids.filter((x) => x !== id))}><X className="w-3 h-3" /></button>
            </span>
          );
        })}
      </div>
      {ids.length < max && (
        <select
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          value=""
          onChange={(e) => e.target.value && onChange([...ids, e.target.value])}
        >
          <option value="">+ Escolher produto ({ids.length}/{max})</option>
          {options.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      )}
      <p className="text-xs text-muted-foreground">Se ficar vazio, o site mostra produtos da mesma categoria.</p>
    </div>
  );
}

export type ExtrasSection = 'install' | 'promo' | 'related' | 'description';

export default function ProductExtrasFields({ value: e, onChange, normalPrice, productId, sections = ['install', 'promo', 'related', 'description'] }: { value: ProductExtras; onChange: (v: ProductExtras) => void; normalPrice: number; productId?: string; sections?: ExtrasSection[] }) {
  const has = (s: ExtrasSection) => sections.includes(s);
  const set = <K extends keyof ProductExtras>(k: K, v: ProductExtras[K]) => onChange({ ...e, [k]: v });
  const { data: all = [] } = useQuery({ queryKey: ['products'], queryFn: () => productsApi.list() });

  const promo = e.promo_price ?? 0;
  const promoInvalid = e.promo_enabled && promo > 0 && promo >= normalPrice;
  const pct = normalPrice > 0 && promo > 0 && promo < normalPrice ? Math.round((1 - promo / normalPrice) * 100) : 0;

  return (
    <div className="space-y-4">
      {has('install') && <Section title="🔧 INSTALAÇÃO">
        <label className="flex items-center gap-3 cursor-pointer">
          <Switch checked={e.includes_installation} onCheckedChange={(v) => set('includes_installation', v)} />
          <span className="text-sm">{e.includes_installation ? '🟢 Inclui instalação' : '⚪ Não inclui'}</span>
        </label>
      </Section>}

      {has('promo') && <Section title="💰 PROMOÇÃO">
        <label className="flex items-center gap-3 cursor-pointer">
          <Switch checked={e.promo_enabled} onCheckedChange={(v) => set('promo_enabled', v)} />
          <span className="text-sm">{e.promo_enabled ? '🟢 Ligado' : '⚪ Desligado'}</span>
        </label>
        <p className="text-sm">Preço normal: <strong>{brl(normalPrice)}</strong></p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="promo_price">Preço promocional (R$)</Label>
            <Input id="promo_price" type="number" step="0.01" value={e.promo_price ?? ''}
              onChange={(ev) => set('promo_price', ev.target.value === '' ? null : Number(ev.target.value))} />
          </div>
          <div>
            <Label htmlFor="promo_until">Validade (opcional)</Label>
            <Input id="promo_until" type="date" value={e.promo_until} onChange={(ev) => set('promo_until', ev.target.value)} />
          </div>
        </div>
        {promoInvalid && <p className="text-sm text-destructive font-medium">O preço promocional precisa ser menor.</p>}
        {pct > 0 && (
          <div className="text-sm space-y-1">
            <p>→ Desconto: <strong>{pct}% OFF</strong></p>
            <p>→ Cliente economiza: <strong>{brl(normalPrice - promo)}</strong></p>
            <p className="pt-1">Prévia: <span className="line-through text-price-old">{brl(normalPrice)}</span>{' '}
              <strong className="text-promo text-lg">{brl(promo)}</strong>{' '}
              <span className="rounded bg-destructive text-destructive-foreground px-1.5 py-0.5 text-xs font-bold">{pct}% OFF</span></p>
          </div>
        )}
      </Section>}

      {has('related') && <><Section title="🔗 COMPLETE SUA INSTALAÇÃO (até 6)">
        <ProductPicker ids={e.related_ids} onChange={(v) => set('related_ids', v)} max={6} all={all} selfId={productId} />
      </Section>
      <Section title="📦 COMPRE JUNTO (até 2)">
        <ProductPicker ids={e.bundle_ids} onChange={(v) => set('bundle_ids', v)} max={2} all={all} selfId={productId} />
      </Section></>}

      {has('description') && <Section title="📝 DESCRIÇÃO">
        <div>
          <Label htmlFor="summary">Resumo</Label>
          <Textarea id="summary" rows={3} placeholder="Texto curto que aparece no card da vitrine" value={e.summary} onChange={(ev) => set('summary', ev.target.value)} />
        </div>
        <div>
          <Label>Principais recursos</Label>
          <ListEditor items={e.features} onChange={(v) => set('features', v)} placeholder="Ex.: Visão noturna de 30 m" addLabel="Adicionar recurso" />
        </div>
        <div className="space-y-2">
          <Label>Ficha técnica</Label>
          {e.specs.map((s, i) => (
            <div key={i} className="flex gap-2">
              <Input placeholder="Característica" value={s.label} onChange={(ev) => set('specs', e.specs.map((x, j) => (j === i ? { ...x, label: ev.target.value } : x)))} />
              <Input placeholder="Valor" value={s.value} onChange={(ev) => set('specs', e.specs.map((x, j) => (j === i ? { ...x, value: ev.target.value } : x)))} />
              <MoveBtns i={i} n={e.specs.length} onMove={(a, b) => set('specs', move(e.specs, a, b))} />
              <Button type="button" variant="ghost" size="icon" aria-label="Remover linha" onClick={() => set('specs', e.specs.filter((_, j) => j !== i))}><X className="w-4 h-4" /></Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => set('specs', [...e.specs, { label: '', value: '' }])}><Plus className="w-4 h-4 mr-1" /> Adicionar linha</Button>
        </div>
        <div>
          <Label>O que vem na caixa</Label>
          <ListEditor items={e.box_items} onChange={(v) => set('box_items', v)} placeholder="Ex.: 1 câmera" addLabel="Adicionar item" />
        </div>
        <div>
          <Label htmlFor="ideal_for">Ideal para</Label>
          <Input id="ideal_for" value={e.ideal_for} onChange={(ev) => set('ideal_for', ev.target.value)} placeholder="Ex.: casas, comércios e condomínios" />
        </div>
      </Section>}
    </div>
  );
}
