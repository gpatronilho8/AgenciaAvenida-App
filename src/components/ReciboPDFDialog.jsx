import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Mail, Send, X } from 'lucide-react';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';
import { toast } from 'sonner';

export default function ReciboPDFDialog({ open, onClose, onDownload, emailDestinatario, nomeDestinatario, tipoDoc = 'Recibo' }) {
  const [email, setEmail] = useState(emailDestinatario || '');
  const [sending, setSending] = useState(false);

  const handleDownload = () => {
    onDownload();
    toast.success('PDF gerado e descarregado');
  };

  const handleSendEmail = async () => {
    if (!email) { toast.error('Insira um e-mail válido'); return; }
    setSending(true);
    try {
      // Generate the doc (returns doc object)
      const doc = onDownload(true); // true = return without saving
      // Send email notification
      await agenciaAvenida.integrations.Core.SendEmail({
        to: email,
        subject: `${tipoDoc} — Agência Avenida`,
        body: `Olá${nomeDestinatario ? ` ${nomeDestinatario}` : ''},\n\nSegue em anexo o seu ${tipoDoc.toLowerCase()}.\n\nCom os melhores cumprimentos,\nAgência Avenida`,
      });
      toast.success(`E-mail enviado para ${email}`);
      onClose();
    } catch {
      toast.error('Erro ao enviar e-mail');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Emitir {tipoDoc}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Descarregue o documento ou envie por e-mail ao cliente.</p>

        <Button onClick={handleDownload} className="w-full gap-2" variant="outline">
          <Download className="w-4 h-4" />
          Descarregar PDF
        </Button>

        <div className="border-t border-border pt-4">
          <Label className="text-sm font-medium mb-2 block">
            <Mail className="w-3.5 h-3.5 inline mr-1" />
            Enviar por e-mail
          </Label>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSendEmail} disabled={sending || !email} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>
          {!emailDestinatario && (
            <p className="text-xs text-muted-foreground mt-1">Nenhum e-mail registado para este cliente.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}