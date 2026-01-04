import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Trash2, Phone, Mail, Calendar, ExternalLink } from 'lucide-react';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';

interface QuoteItem {
  name: string;
  quantity: number;
  price: number;
}

interface Quote {
  id: string;
  quote_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  items: QuoteItem[];
  subtotal: number;
  shipping_fee: number;
  total: number;
  pdf_url: string | null;
  created_at: string;
}

export default function QuotesManagement() {
  const queryClient = useQueryClient();

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['admin-quotes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map((q) => ({
        ...q,
        items: q.items as unknown as QuoteItem[],
        customer_phone: q.customer_phone || null,
        pdf_url: q.pdf_url || null,
      })) as Quote[];
    },
  });

  const deleteQuote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-quotes'] });
      toast({
        title: 'Orçamento excluído',
        description: 'O orçamento foi removido com sucesso.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o orçamento.',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          Nenhum orçamento ainda
        </h3>
        <p className="text-muted-foreground">
          Os orçamentos gerados pelos clientes aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Orçamentos ({quotes.length})
        </h2>
      </div>

      <div className="grid gap-4">
        {quotes.map((quote) => (
          <div
            key={quote.id}
            className="bg-card border border-border rounded-lg p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Header com número e data */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-full text-sm font-medium">
                    <FileText className="w-4 h-4" />
                    {quote.quote_number}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {new Date(quote.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Dados do cliente */}
                <div className="space-y-1.5 mb-4">
                  <h3 className="font-medium text-foreground">
                    {quote.customer_name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <a
                      href={`mailto:${quote.customer_email}`}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      {quote.customer_email}
                    </a>
                    {quote.customer_phone && (
                      <a
                        href={`https://wa.me/55${quote.customer_phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-green-600 transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                        {quote.customer_phone}
                      </a>
                    )}
                  </div>
                </div>

                {/* Itens do orçamento */}
                <div className="bg-muted/50 rounded-lg p-3 mb-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Itens do orçamento:
                  </p>
                  <ul className="space-y-1">
                    {quote.items.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-foreground">
                          {item.name} x{item.quantity}
                        </span>
                        <span className="text-muted-foreground">
                          R$ {(item.price * item.quantity).toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-border mt-2 pt-2 flex justify-between font-medium">
                    <span>Total:</span>
                    <span className="text-primary">
                      R$ {quote.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="flex flex-col gap-2">
                {quote.pdf_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(quote.pdf_url!, '_blank')}
                    className="flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ver PDF
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. O orçamento será removido permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteQuote.mutate(quote.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
