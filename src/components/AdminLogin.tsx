import { useState } from 'react';
import { brandLogo, getBrand } from '@/lib/brand';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, AlertCircle } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('E-mail inválido');
const passwordSchema = z.string().min(6, 'A senha deve ter pelo menos 6 caracteres');

/**
 * Tela de login exclusiva da rota /admin.
 * Usa o Supabase Auth existente (useAuth) — nenhuma senha fixa ou paralela.
 */
const AdminLogin = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState(() => { try { return localStorage.getItem('mr-admin-email') || ''; } catch { return ''; } });
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (err) {
      if (err instanceof z.ZodError) setError(err.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    const { error: signInError } = await signIn(email, password);
    if (!signInError) { try { localStorage.setItem('mr-admin-email', email.trim()); } catch { /* ignore */ } }

    if (signInError) {
      if (signInError.message.includes('Invalid login credentials')) {
        setError('E-mail ou senha incorretos');
      } else if (signInError.message.includes('Email not confirmed')) {
        setError('Confirme seu e-mail antes de entrar');
      } else {
        setError(signInError.message);
      }
      setIsSubmitting(false);
    }
    // Em caso de sucesso o AdminGuard reavalia a permissão automaticamente.
  };

  return (
    <div className="min-h-[70dvh] flex items-center justify-center bg-gradient-to-br from-secondary to-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={brandLogo()} alt={getBrand().name} className="h-16 w-auto" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <Shield className="h-5 w-5 text-accent" />
            <CardTitle className="text-xl">Acesso Administrativo</CardTitle>
          </div>
          <CardDescription>Área restrita aos administradores da loja</CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">E-mail</Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="ml-input"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password">Senha</Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="ml-input"
                required
              />
            </div>

            <Button type="submit" className="w-full min-h-11 ml-btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar no painel'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
