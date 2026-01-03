import { MessageCircle, X, Send } from 'lucide-react';
import { useState } from 'react';

export default function SalesChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-ml-green rounded-full shadow-lg flex items-center justify-center text-white cursor-pointer hover:bg-green-600 transition-colors"
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
        <div className="fixed bottom-24 right-6 z-50 w-80 bg-white rounded-lg shadow-2xl border border-border overflow-hidden">
          <div className="bg-ml-green text-white p-4">
            <h3 className="font-medium">MR Segurança Máxima</h3>
            <p className="text-sm opacity-90">Pergunte para MR Segurança Máxima</p>
          </div>
          
          <div className="h-64 p-4 overflow-y-auto bg-secondary/30">
            <div className="bg-white text-foreground p-3 rounded-lg rounded-tl-none max-w-[85%] shadow-sm border border-border">
              <p className="text-sm">
                Olá! 👋 Como posso ajudar você hoje?
              </p>
              <span className="text-[10px] text-ml-gray mt-1 block">14:30</span>
            </div>
          </div>
          
          <div className="p-3 border-t border-border">
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escreva sua mensagem..."
                className="flex-1 px-3 py-2 border border-border rounded text-sm outline-none focus:border-ml-blue"
              />
              <button className="bg-ml-blue text-white px-3 py-2 rounded hover:bg-ml-blue-dark transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
