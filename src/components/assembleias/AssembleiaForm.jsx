import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';

const empty = {
  condominio_id: '', tipo: 'ordinaria', titulo: '', data: format(new Date(), 'yyyy-MM-dd'),
  hora: '21:00', local: '', segunda_convocatoria_data: '', segunda_convocatoria_hora: '21:30',
  ordem_trabalhos: '', ata_numero: '', ata_texto: '', estado: 'agendada', portal_visivel: false, notas: ''
};

export default function AssembleiaForm({ open, onClose, assembleia, condominios }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(assembleia ? { ...assembleia } : empty);
  const [tab, setTab] = useState('base'); // base | convocatoria | ata

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: (data) => assembleia
      ? base44.entities.Assembleia.update(assembleia.id, data)
      : base44.entities.Assembleia.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assembleias'] });
      toast.success('Assembleia guardada');
      onClose();
    }
  });

  const tabs = [
    { id: 'base', label: 'Dados Gerais' },
    { id: 'convocatoria', label: 'Convocatória' },
    { id: 'ata', label: 'Ata' },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{assembleia ? 'Editar Assembleia' : 'Nova Assembleia'}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 bg-muted rounded-lg p-1 mb-4">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-all ${tab === t.id ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}
            >{t.label}</button>
          ))}
        </div>

        {tab === 'base' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Condomínio *</Label>
              <Select value={form.condominio_id} onValueChange={v => upd('condominio_id', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{condominios.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => upd('tipo', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ordinaria">Ordinária</SelectItem>
                  <SelectItem value="extraordinaria">Extraordinária</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Título *</Label>
              <Input className="mt-1" value={form.titulo || ''} onChange={e => upd('titulo', e.target.value)} placeholder="Ex: Assembleia Geral Ordinária 2026" />
            </div>
            <div>
              <Label>Data *</Label>
              <Input className="mt-1" type="date" value={form.data || ''} onChange={e => upd('data', e.target.value)} />
            </div>
            <div>
              <Label>Hora</Label>
              <Input className="mt-1" type="time" value={form.hora || ''} onChange={e => upd('hora', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Local</Label>
              <Input className="mt-1" value={form.local || ''} onChange={e => upd('local', e.target.value)} placeholder="Ex: Sala de reuniões do condomínio" />
            </div>
            <div>
              <Label>2ª Convocatória — Data</Label>
              <Input className="mt-1" type="date" value={form.segunda_convocatoria_data || ''} onChange={e => upd('segunda_convocatoria_data', e.target.value)} />
            </div>
            <div>
              <Label>2ª Convocatória — Hora</Label>
              <Input className="mt-1" type="time" value={form.segunda_convocatoria_hora || ''} onChange={e => upd('segunda_convocatoria_hora', e.target.value)} />
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={v => upd('estado', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="agendada">Agendada</SelectItem>
                  <SelectItem value="realizada">Realizada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" id="portal" checked={form.portal_visivel || false} onChange={e => upd('portal_visivel', e.target.checked)} className="rounded" />
              <Label htmlFor="portal">Visível no portal do condómino</Label>
            </div>
            <div className="sm:col-span-2">
              <Label>Notas internas</Label>
              <textarea className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[70px] resize-y" value={form.notas || ''} onChange={e => upd('notas', e.target.value)} />
            </div>
          </div>
        )}

        {tab === 'convocatoria' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Escreva os pontos da ordem de trabalhos. A convocatória será gerada em PDF com base nestes dados.</p>
            <div>
              <Label>Ordem de Trabalhos</Label>
              <textarea
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[200px] resize-y font-mono"
                placeholder={"1. Aprovação da ata anterior\n2. Apresentação das contas de 2025\n3. Aprovação do orçamento para 2026\n4. Eleição dos órgãos sociais\n5. Assuntos gerais"}
                value={form.ordem_trabalhos || ''}
                onChange={e => upd('ordem_trabalhos', e.target.value)}
              />
            </div>
          </div>
        )}

        {tab === 'ata' && (
          <div className="space-y-4">
            <div>
              <Label>Número da Ata</Label>
              <Input className="mt-1 w-32" type="number" value={form.ata_numero || ''} onChange={e => upd('ata_numero', parseInt(e.target.value) || '')} placeholder="Ex: 42" />
            </div>
            <div>
              <Label>Texto da Ata</Label>
              <p className="text-xs text-muted-foreground mb-1">Redija o texto da ata. O sistema formatará num template PDF profissional.</p>
              <textarea
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[280px] resize-y"
                placeholder="Aos [data], pelas [hora], reuniu-se em assembleia geral a [nome do condomínio]...&#10;&#10;Estiveram presentes os seguintes condóminos:&#10;...&#10;&#10;Deliberações:&#10;1. ..."
                value={form.ata_texto || ''}
                onChange={e => upd('ata_texto', e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate(form)} disabled={save.isPending}>
            {save.isPending ? 'A guardar...' : 'Guardar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}