import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { CheckCircle } from 'lucide-react';

export default function PagamentoDialog({ open, onClose, quota, fracaoCodigo, onConfirm, isPending }) {
  const [dataPagamento, setDataPagamento] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [metodo, setMetodo] = useState('transferencia');
  const [conta, setConta] = useState('banco');

  const handleConfirm = () => {
    onConfirm({ dataPagamento, metodo, conta });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Registar Pagamento
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {fracaoCodigo && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <span className="text-muted-foreground">Fração: </span>
              <span className="font-semibold">{fracaoCodigo}</span>
              {quota?.valor && (
                <>
                  <span className="text-muted-foreground ml-3">Valor: </span>
                  <span className="font-semibold text-green-600">€{(quota.valor).toFixed(2)}</span>
                </>
              )}
            </div>
          )}
          <div>
            <Label>Data de Pagamento</Label>
            <Input className="mt-1" type="date" value={dataPagamento} onChange={e => setDataPagamento(e.target.value)} />
          </div>
          <div>
            <Label>Método de Pagamento</Label>
            <Select value={metodo} onValueChange={setMetodo}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="transferencia">Transferência</SelectItem>
                <SelectItem value="mb">Referência MB</SelectItem>
                <SelectItem value="mbway">MB WAY</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Conta de Destino</Label>
            <Select value={conta} onValueChange={setConta}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="banco">Banco</SelectItem>
                <SelectItem value="caixa">Caixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={isPending} className="bg-green-600 hover:bg-green-700 text-white">
            {isPending ? 'A registar...' : 'Confirmar Pagamento'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}