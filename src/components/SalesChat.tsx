import { MessageCircle, X } from 'lucide-react';
import { useState } from 'react';

export default function SalesChat() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="floating-button"
        aria-label="Abrir chat de vendas"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 bg-card rounded-xl shadow-2xl border border-border overflow-hidden animate-fade-in">
          <div className="bg-primary text-primary-foreground p-4">
            <h3 className="font-semibold">Chat de Vendas</h3>
            <p className="text-sm opacity-90">Como podemos ajudar?</p>
          </div>
          
          <div className="h-64 p-4 overflow-y-auto bg-muted/30">
            <div className="bg-primary/10 text-foreground p-3 rounded-lg rounded-tl-none max-w-[80%]">
              <p className="text-sm">
                Olá! 👋 Bem-vindo à MR Segurança Máxima. Como posso ajudar você hoje?
              </p>
            </div>
          </div>
          
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Digite sua mensagem..."
                className="form-input flex-1 text-sm py-2"
              />
              <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
