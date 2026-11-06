import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, KeyRound } from 'lucide-react';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    const t = setTimeout(() => setReady((r) => r), 0);
    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError('A senha precisa ter pelo menos 6 caracteres.');
    if (password !== confirm) return setError('As duas senhas não são iguais.');
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(error.message.includes('different') ? 'Escolha uma senha diferente da antiga.' : error.message);
    setDone(true);
    setTimeout(() => navigate('/admin'), 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary to-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <KeyRound className="h-5 w-5 text-accent" />
            <CardTitle className="text-xl">Criar senha nova</CardTitle>
          </div>
          <CardDescription>Escolha a senha que você vai usar para entrar no painel.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {done ? (
            <p className="text-center font-medium">Senha trocada! Abrindo o painel…</p>
          ) : !ready ? (
            <p className="text-center text-muted-foreground">
              Abra esta página pelo link que chegou no seu e-mail. Se o link for antigo, peça outro em "Esqueci minha senha".
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="np">Senha nova</Label>
                <Input id="np" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="np2">Repita a senha nova</Label>
                <Input id="np2" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full ml-btn-primary" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar senha nova'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
