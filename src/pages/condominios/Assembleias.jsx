import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Calendar, List, FileText, Download, Mail, Printer, Users, Eye, Edit, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useCondominio } from '@/lib/CondominioContext';
import AssembleiaPreview from '@/components/assembleias/AssembleiaPreview';
import AssembleiaForm from '@/components/assembleias/AssembleiaForm';
import CalendarioAssembleias from '@/components/assembleias/CalendarioAssembleias';

export default function Assembleias() {
  const qc = useQueryClient();
  const { selectedCondominioId } = useCondominio();
  const [view, setView] = useState('lista'); // lista | calendario
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [preview, setPreview] = useState(null);

  const { data: assembleias = [], isLoading } = useQuery({
    queryKey: ['assembleias'],
    queryFn: () => agenciaAvenida.entities.Assembleia.list('-data')
  });
  const { data: condominios = [] } = useQuery({ queryKey: ['condominios'], queryFn: () => agenciaAvenida.entities.Condominio.list() });
  const { data: fracoes = [] } = useQuery({ queryKey: ['fracoes'], queryFn: () => agenciaAvenida.entities.Fracao.list() });

  const del = useMutation({
    mutationFn: (id) => agenciaAvenida.entities.Assembleia.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assembleias'] }); toast.success('Assembleia eliminada'); }
  });

  const filtered = useMemo(() => assembleias.filter(a =>
    selectedCondominioId === 'all' || a.condominio_id === selectedCondominioId
  ), [assembleias, selectedCondominioId]);

  const getCondName = (id) => condominios.find(c => c.id === id)?.nome || '-';

  const estadoColors = {
    agendada: 'bg-blue-100 text-blue-700',
    realizada: 'bg-green-100 text-green-700',
    cancelada: 'bg-red-100 text-red-700',
  };

  return (
    <div>
      <PageHeader title="Assembleias" subtitle="Convocatórias, atas e calendário de reuniões" action={
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button onClick={() => setView('lista')} className={`px-3 py-2 text-sm font-medium transition-colors ${view === 'lista' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'}`}>
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => setView('calendario')} className={`px-3 py-2 text-sm font-medium transition-colors ${view === 'calendario' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'}`}>
              <Calendar className="w-4 h-4" />
            </button>
          </div>
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" />Nova Assembleia
          </Button>
        </div>
      } />

      {view === 'calendario' ? (
        <CalendarioAssembleias
          assembleias={filtered}
          condominios={condominios}
          onClickAssembleia={setPreview}
          onNew={() => { setEditing(null); setOpen(true); }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(a => {
            const cond = condominios.find(c => c.id === a.condominio_id);
            const fracoesCond = fracoes.filter(f => f.condominio_id === a.condominio_id);
            return (
              <div
                key={a.id}
                className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
                onClick={() => setPreview(a)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estadoColors[a.estado] || 'bg-gray-100 text-gray-700'}`}>
                        {a.estado === 'agendada' ? 'Agendada' : a.estado === 'realizada' ? 'Realizada' : 'Cancelada'}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">{a.tipo}</span>
                      {a.ata_numero && <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">Ata nº{a.ata_numero}</span>}
                    </div>
                    <h3 className="font-semibold text-foreground">{a.titulo}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{getCondName(a.condominio_id)}</p>
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setEditing(a); setOpen(true); }} className="p-1.5 hover:bg-muted rounded transition-colors">
                      <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>📅 {a.data} {a.hora && `às ${a.hora}`}</span>
                  {a.local && <span>📍 {a.local}</span>}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  {a.convocatoria_pdf_url && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Convocatória</span>}
                  {a.ata_pdf_url && <span className="text-xs text-blue-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Ata</span>}
                  {a.portal_visivel && <span className="text-xs text-purple-600">Visível no portal</span>}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && !isLoading && (
            <div className="col-span-full text-center py-16 text-muted-foreground">Nenhuma Assembleia Encontrada</div>
          )}
        </div>
      )}

      {open && (
        <AssembleiaForm
          key={editing?.id || 'new'}
          open={open}
          onClose={() => setOpen(false)}
          assembleia={editing}
          condominios={condominios}
          fracoes={fracoes}
        />
      )}

      {preview && (
        <AssembleiaPreview
          open={!!preview}
          onClose={() => setPreview(null)}
          assembleia={preview}
          condominios={condominios}
          fracoes={fracoes}
          onEdit={() => { setEditing(preview); setPreview(null); setOpen(true); }}
        />
      )}
    </div>
  );
}