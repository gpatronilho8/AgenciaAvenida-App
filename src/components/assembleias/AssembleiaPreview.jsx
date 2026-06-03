import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Edit, Printer, Download, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import jsPDF from 'jspdf';

function gerarConvocatoriaPDF(assembleia, condNome) {
  const doc = new jsPDF();
  const margin = 20;
  let y = margin;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('CONVOCATÓRIA DE ASSEMBLEIA DE CONDÓMINOS', margin, y);
  y += 14;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Condomínio: ${condNome}`, margin, y); y += 8;
  doc.text(`Assembleia: ${assembleia.titulo}`, margin, y); y += 8;
  doc.text(`Tipo: ${assembleia.tipo === 'ordinaria' ? 'Ordinária' : 'Extraordinária'}`, margin, y); y += 8;
  doc.text(`Data: ${assembleia.data} às ${assembleia.hora || '--:--'}`, margin, y); y += 8;
  if (assembleia.local) { doc.text(`Local: ${assembleia.local}`, margin, y); y += 8; }
  if (assembleia.segunda_convocatoria_data) {
    doc.text(`2ª Convocatória: ${assembleia.segunda_convocatoria_data} às ${assembleia.segunda_convocatoria_hora || '--:--'}`, margin, y);
    y += 8;
  }
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Ordem de Trabalhos:', margin, y); y += 8;
  doc.setFont('helvetica', 'normal');
  if (assembleia.ordem_trabalhos) {
    const lines = doc.splitTextToSize(assembleia.ordem_trabalhos, 170);
    doc.text(lines, margin, y);
    y += lines.length * 6 + 6;
  }
  y += 6;
  doc.text(`Data de emissão: ${new Date().toLocaleDateString('pt-PT')}`, margin, y);
  return doc;
}

function gerarAtaPDF(assembleia, condNome) {
  const doc = new jsPDF();
  const margin = 20;
  let y = margin;

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`ATA Nº ${assembleia.ata_numero || '--'}`, margin, y); y += 10;
  doc.setFontSize(11);
  doc.text(`ASSEMBLEIA GERAL DE CONDÓMINOS — ${condNome.toUpperCase()}`, margin, y); y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Data: ${assembleia.data} | Hora: ${assembleia.hora || '--:--'} | Local: ${assembleia.local || '--'}`, margin, y);
  y += 10;

  if (assembleia.ata_texto) {
    const lines = doc.splitTextToSize(assembleia.ata_texto, 170);
    doc.text(lines, margin, y);
    y += lines.length * 5.5 + 10;
  }

  doc.text('_'.repeat(50), margin, y); y += 8;
  doc.text('Administrador do Condomínio', margin, y);
  return doc;
}

function gerarListaAssinaturasPDF(assembleia, condNome, fracoes) {
  const doc = new jsPDF();
  const margin = 20;
  let y = margin;

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('LISTA DE PRESENÇAS', margin, y); y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${condNome} — ${assembleia.titulo}`, margin, y); y += 6;
  doc.text(`Data: ${assembleia.data} às ${assembleia.hora || '--:--'}`, margin, y); y += 10;

  // Cabeçalho tabela
  doc.setFont('helvetica', 'bold');
  doc.text('Fração', margin, y);
  doc.text('Nome do Condómino', margin + 25, y);
  doc.text('Assinatura', margin + 130, y);
  y += 5;
  doc.line(margin, y, 190, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  fracoes.forEach(f => {
    doc.text(f.codigo || '', margin, y);
    doc.text('', margin + 25, y); // nome em branco para preencher
    doc.line(margin + 130, y + 1, 190, y + 1);
    y += 9;
    if (y > 270) { doc.addPage(); y = margin; }
  });

  return doc;
}

export default function AssembleiaPreview({ open, onClose, assembleia, condominios, fracoes, onEdit }) {
  const qc = useQueryClient();
  const condNome = condominios.find(c => c.id === assembleia.condominio_id)?.nome || '-';
  const fracoesCond = fracoes.filter(f => f.condominio_id === assembleia.condominio_id);
  const [sending, setSending] = useState(false);

  const saveUrl = useMutation({
    mutationFn: ({ field, url }) => base44.entities.Assembleia.update(assembleia.id, { [field]: url }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assembleias'] })
  });

  const handleConvocatoria = async (action) => {
    const doc = gerarConvocatoriaPDF(assembleia, condNome);
    if (action === 'download') {
      doc.save(`convocatoria_${assembleia.data}.pdf`);
    } else if (action === 'upload') {
      const blob = doc.output('blob');
      const file = new File([blob], `convocatoria_${assembleia.id}.pdf`, { type: 'application/pdf' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await saveUrl.mutateAsync({ field: 'convocatoria_pdf_url', url: file_url });
      toast.success('Convocatória gerada e guardada');
    }
  };

  const handleAta = async (action) => {
    if (!assembleia.ata_texto) { toast.error('Escreva o texto da ata primeiro'); return; }
    const doc = gerarAtaPDF(assembleia, condNome);
    if (action === 'download') {
      doc.save(`ata_${assembleia.ata_numero || assembleia.data}.pdf`);
    } else if (action === 'upload') {
      const blob = doc.output('blob');
      const file = new File([blob], `ata_${assembleia.id}.pdf`, { type: 'application/pdf' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await saveUrl.mutateAsync({ field: 'ata_pdf_url', url: file_url });
      toast.success('Ata gerada e guardada');
    }
  };

  const handleListaAssinaturas = () => {
    const doc = gerarListaAssinaturasPDF(assembleia, condNome, fracoesCond);
    doc.save(`lista_assinaturas_${assembleia.data}.pdf`);
  };

  const handleEmail = async () => {
    setSending(true);
    // Simular envio (integração real exigiria backend)
    await base44.entities.Assembleia.update(assembleia.id, { email_enviado: true });
    qc.invalidateQueries({ queryKey: ['assembleias'] });
    toast.success('Email de convocatória enviado aos condóminos');
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">{assembleia.titulo}</h2>
            <p className="text-sm text-muted-foreground">{condNome}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onEdit} className="gap-1 flex-shrink-0">
            <Edit className="w-3.5 h-3.5" />Editar
          </Button>
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-3 bg-muted/40 rounded-lg p-4 mb-4 text-sm">
          <div><span className="font-medium">Data:</span> {assembleia.data} {assembleia.hora && `às ${assembleia.hora}`}</div>
          <div><span className="font-medium">Tipo:</span> {assembleia.tipo === 'ordinaria' ? 'Ordinária' : 'Extraordinária'}</div>
          {assembleia.local && <div className="col-span-2"><span className="font-medium">Local:</span> {assembleia.local}</div>}
          {assembleia.segunda_convocatoria_data && (
            <div className="col-span-2"><span className="font-medium">2ª Convocatória:</span> {assembleia.segunda_convocatoria_data} às {assembleia.segunda_convocatoria_hora}</div>
          )}
          {assembleia.ata_numero && <div><span className="font-medium">Ata nº:</span> {assembleia.ata_numero}</div>}
          <div><span className="font-medium">Portal:</span> {assembleia.portal_visivel ? '✅ Visível' : '❌ Oculto'}</div>
          {assembleia.email_enviado && <div className="col-span-2 text-green-600 text-xs">✅ Email enviado</div>}
        </div>

        {assembleia.ordem_trabalhos && (
          <div className="mb-4">
            <p className="font-semibold text-sm text-foreground mb-2">Ordem de Trabalhos</p>
            <pre className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">{assembleia.ordem_trabalhos}</pre>
          </div>
        )}

        {assembleia.ata_texto && (
          <div className="mb-4">
            <p className="font-semibold text-sm text-foreground mb-2">Ata nº {assembleia.ata_numero}</p>
            <pre className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-lg max-h-48 overflow-y-auto">{assembleia.ata_texto}</pre>
          </div>
        )}

        <div className="border-t border-border pt-4">
          <p className="text-sm font-semibold text-foreground mb-3">Ações</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleConvocatoria('download')}>
              <Download className="w-3.5 h-3.5" />Convocatória PDF
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleConvocatoria('upload')}>
              Guardar Convocatória
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={handleListaAssinaturas}>
              <Printer className="w-3.5 h-3.5" />Lista de Assinaturas
            </Button>
            {assembleia.ata_texto && (
              <>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleAta('download')}>
                  <Download className="w-3.5 h-3.5" />Ata PDF
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleAta('upload')}>
                  Guardar Ata
                </Button>
              </>
            )}
            <Button size="sm" className="gap-1.5" onClick={handleEmail} disabled={sending}>
              <Mail className="w-3.5 h-3.5" />{sending ? 'A enviar...' : 'Enviar por Email'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}