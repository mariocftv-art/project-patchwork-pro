import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Links individuais de contrato (assinatura à distância e PDF assinado).
// Admin cria/cancela; o cliente usa só o token, que dá acesso apenas àquele contrato.

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const DAYS7 = 7 * 24 * 3600 * 1000;
const CONSENT = 'Li integralmente o contrato e concordo com todas as suas cláusulas';

function token() {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');
}
async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '');
function device(ua: string) {
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  if (/Mobi|Android|iPhone/i.test(ua)) return 'celular';
  return 'computador';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');

    // ---------- Ações do administrador ----------
    if (action === 'create' || action === 'revoke') {
      const auth = req.headers.get('Authorization') || '';
      const { data: u } = await admin.auth.getUser(auth.replace('Bearer ', ''));
      if (!u?.user) return json({ error: 'Não autorizado' }, 401);
      const { data: isAdmin } = await admin.rpc('has_role', { _user_id: u.user.id, _role: 'admin' });
      if (!isAdmin) return json({ error: 'Não autorizado' }, 403);

      if (action === 'revoke') {
        const { error } = await admin.from('contract_links').update({ revoked_at: new Date().toISOString() }).eq('id', String(body.link_id)).is('revoked_at', null);
        if (error) throw error;
        return json({ ok: true });
      }
      const kind = body.kind === 'download' ? 'download' : 'sign';
      const quoteId = String(body.quote_id || '');
      const { data: q } = await admin.from('quotes').select('id, doc_type, validity_days').eq('id', quoteId).maybeSingle();
      if (!q || q.doc_type !== 'contrato') return json({ error: 'Contrato não encontrado' }, 404);
      // Um link de assinatura ativo por contrato: cancela os anteriores
      if (kind === 'sign') {
        await admin.from('contract_links').update({ revoked_at: new Date().toISOString() }).eq('quote_id', quoteId).eq('kind', 'sign').is('revoked_at', null).is('signed_at', null);
      }
      const t = token();
      const days = Number(q.validity_days) > 0 ? Math.min(Number(q.validity_days), 90) : 7;
      const expires = new Date(Date.now() + (kind === 'sign' ? days * 86400000 : DAYS7)).toISOString();
      const { data: link, error } = await admin.from('contract_links').insert({
        token: t, quote_id: quoteId, kind, expires_at: expires, created_by: u.user.id, created_by_email: u.user.email,
      }).select('id, expires_at').single();
      if (error) throw error;
      await admin.from('admin_logs').insert({ user_id: u.user.id, action: kind === 'sign' ? 'contract_sign_link' : 'contract_pdf_link', user_email: u.user.email, entity_type: 'contract', entity_id: quoteId, details: { link_id: link.id, expires_at: link.expires_at } }).then(() => {}, () => {});
      return json({ token: t, expires_at: link.expires_at });
    }

    // ---------- Ações públicas (só com o token) ----------
    const tk = String(body.token || '');
    if (!/^[0-9a-f]{64}$/.test(tk)) return json({ error: 'invalid' }, 400);
    const { data: link } = await admin.from('contract_links').select('*').eq('token', tk).maybeSingle();
    if (!link) return json({ state: 'invalid' });
    if (link.revoked_at) return json({ state: 'revoked' });
    const expired = new Date(link.expires_at).getTime() < Date.now();

    const { data: q } = await admin.from('quotes').select('*').eq('id', link.quote_id).single();
    const { data: ver } = await admin.from('quote_versions').select('version, snapshot').eq('quote_id', q.id).neq('change_type', 'status')
      .order('version', { ascending: false }).limit(1).maybeSingle();
    const version = ver?.version ?? 1;
    const snapshot = ver?.snapshot ?? q;
    const { data: sigs } = await admin.from('contract_signatures').select('party, signer_name, signer_document, signer_ip, doc_hash, signature_image, signed_at, signed_pdf_path, version')
      .eq('quote_id', q.id).eq('version', version);
    const signedByClient = (sigs || []).some((s) => s.party === 'contratante');
    const latestPdf = (sigs || []).filter((s) => s.signed_pdf_path).sort((a, b) => b.signed_at.localeCompare(a.signed_at))[0]?.signed_pdf_path;

    if (expired && !(link.kind === 'sign' && signedByClient)) return json({ state: 'expired' });

    if (action === 'view') {
      await admin.from('contract_links').update({ opened_at: link.opened_at ?? new Date().toISOString(), open_count: (link.open_count || 0) + 1 }).eq('id', link.id);
      return json({
        state: signedByClient || link.signed_at ? 'signed' : 'ok',
        kind: link.kind,
        expires_at: link.expires_at,
        quote_number: q.quote_number,
        record: { ...q, ...(snapshot as Record<string, unknown>), id: q.id },
        signatures: (sigs || []).map((s) => ({ party: s.party, signer_name: s.signer_name, signer_document: s.signer_document, signer_ip: s.signer_ip, doc_hash: s.doc_hash, signature_image: s.signature_image, signed_at: s.signed_at })),
        client_ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('cf-connecting-ip') || null,
        doc_code: await sha256(JSON.stringify(snapshot)),
        has_pdf: !!latestPdf,
      });
    }

    if (action === 'pdf') {
      if (!latestPdf) return json({ error: 'PDF assinado ainda não existe' }, 404);
      const { data: signed, error } = await admin.storage.from('signed-contracts').createSignedUrl(latestPdf, 300);
      if (error) throw error;
      return json({ url: signed.signedUrl });
    }

    if (action === 'sign') {
      if (link.kind !== 'sign') return json({ error: 'Link sem permissão de assinatura' }, 403);
      if (expired) return json({ state: 'expired' });
      if (signedByClient || link.signed_at) return json({ state: 'signed' });
      const name = String(body.name || '').trim().slice(0, 200);
      const doc = digits(body.document);
      const image = String(body.image || '');
      const pdf = String(body.pdf_base64 || '');
      if (name.length < 3 || !body.accepted) return json({ error: 'Dados incompletos' }, 400);
      if (!image.startsWith('data:image/png;base64,') || image.length > 1_500_000) return json({ error: 'Assinatura inválida' }, 400);
      const cust = (q.customer || {}) as Record<string, unknown>;
      const expected = [digits(cust.cpf), digits(cust.cnpj), digits(q.customer_cpf), digits(q.customer_cnpj)].filter(Boolean);
      if (!doc || !expected.includes(doc)) return json({ error: 'mismatch' }, 400);
      if (!pdf || pdf.length > 15_000_000) return json({ error: 'PDF inválido' }, 400);

      const docHash = await sha256(JSON.stringify(snapshot));
      const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('cf-connecting-ip') || null;
      const ua = (req.headers.get('user-agent') || '').slice(0, 400);
      const signedAt = new Date().toISOString();
      const path = `${q.quote_number}/v${version}-contratante-remoto-${Date.now()}.pdf`;
      const bytes = Uint8Array.from(atob(pdf), (c) => c.charCodeAt(0));
      const up = await admin.storage.from('signed-contracts').upload(path, bytes, { contentType: 'application/pdf' });
      if (up.error) throw up.error;
      const ins = await admin.from('contract_signatures').insert({
        quote_id: q.id, version, party: 'contratante', signer_name: name, signer_document: doc,
        signature_image: image, doc_hash: docHash, user_agent: ua, consent_text: CONSENT, signed_at: signedAt,
        signed_pdf_path: path, signer_ip: ip, device: device(ua), remote: true, link_id: link.id,
      });
      if (ins.error) throw ins.error;
      await admin.from('contract_links').update({ signed_at: signedAt }).eq('id', link.id);
      const both = (sigs || []).some((s) => s.party === 'contratada');
      if (!['em_execucao', 'concluido'].includes(q.status)) {
        await admin.from('quotes').update({ status: both ? 'assinado' : 'aguardando_assinatura', updated_at: signedAt }).eq('id', q.id);
      }
      return json({ state: 'signed' });
    }

    return json({ error: 'Ação inválida' }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: 'Erro interno' }, 500);
  }
});
