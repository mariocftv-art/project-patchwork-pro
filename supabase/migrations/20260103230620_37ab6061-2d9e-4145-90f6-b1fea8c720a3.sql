-- Create installation services table
CREATE TABLE public.installation_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'Camera',
  features TEXT[] DEFAULT '{}',
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.installation_services ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active installation services" 
ON public.installation_services 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert installation services" 
ON public.installation_services 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update installation services" 
ON public.installation_services 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete installation services" 
ON public.installation_services 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_installation_services_updated_at
BEFORE UPDATE ON public.installation_services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default services
INSERT INTO public.installation_services (title, description, icon, features, display_order) VALUES
('Instalação de Câmeras CFTV', 'Sistema completo de monitoramento com acesso remoto pelo celular.', 'Camera', ARRAY['Câmeras HD/4K', 'Acesso pelo celular', 'Gravação em nuvem', 'Visão noturna'], 1),
('Cerca Elétrica', 'Proteção perimetral com cerca elétrica de alta tensão.', 'Zap', ARRAY['Alta voltagem', 'Alarme integrado', 'Bateria backup', 'Sinalização'], 2),
('Alarme Monitorado', 'Sistema de alarme com monitoramento 24 horas.', 'Shield', ARRAY['Sensores de presença', 'Sirene potente', 'App de controle', 'Monitoramento 24h'], 3),
('Controle de Acesso', 'Fechaduras eletrônicas e controle de entrada.', 'Lock', ARRAY['Biometria', 'Senha numérica', 'Cartão RFID', 'Registro de acessos'], 4),
('Automação Residencial', 'Automatize portões, iluminação e dispositivos.', 'Wifi', ARRAY['Portões automáticos', 'Iluminação smart', 'Controle por app', 'Integração Alexa'], 5),
('Interfone e Vídeo Porteiro', 'Comunicação segura na entrada do seu imóvel.', 'Phone', ARRAY['Vídeo em tempo real', 'Áudio bidirecional', 'Abertura remota', 'Múltiplos pontos'], 6);