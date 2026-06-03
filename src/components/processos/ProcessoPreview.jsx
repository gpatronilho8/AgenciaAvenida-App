import { Printer, Edit, X, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TIPOS = {
  irs: 'IRS', carta_conducao: 'Carta de Condução', passaporte: 'Passaporte',
  nif: 'NIF', niss: 'NISS', reagrupamento_familiar: 'Reagrupamento Familiar',
  visto: 'Visto', licenca: 'Licença', certidao: 'Certidão', procuracao: 'Procuração', outro: 'Outro'
};
const ESTADOS = {
  pendente: { label: 'Pendente', cls: 'bg-yellow-100 text-yellow-700' },
  em_curso: { label: 'Em Curso', cls: 'bg-blue-100 text-blue-700' },
  aguarda_documentos: { label: 'Aguarda Docs', cls: 'bg-orange-100 text-orange-700' },
  submetido: { label: 'Submetido', cls: 'bg-purple-100 text-purple-700' },
  concluido: { label: 'Concluído', cls: 'bg-green-100 text-green-700' },
  cancelado: { label: 'Cancelado', cls: 'bg-gray-100 text-gray-600' },
};
const IRS_ESTADO_LABELS = {
  recebida_documentacao: 'Recebida Documentação',
  submetido_at_prova: 'Submetido AT — Prova de Entrega',
  comprovativo_enviado_cliente: 'Comprovativo Enviado ao Cliente',
  submetida_substituicao_at: 'Submetida Substituição AT',
};
const IRS_CAMPOS_LABELS = [
  ['estado_civil_solteiro', 'Estado civil — Solteiro'],
  ['estado_civil_casado', 'Estado civil — Casado'],
  ['estado_civil_separado', 'Estado civil — Separado'],
  ['rendimentos_prediais', 'Rendimentos Prediais'],
  ['incapacidade', 'Incapacidade'],
  ['irs_jovem', 'IRS Jovem'],
  ['declaracao_substituicao', 'Declaração de Substituição'],
  ['rendimentos_estrangeiro', 'Rendimentos no Estrangeiro'],
];

export default function ProcessoPreview({ processo, pessoaNome, staffNome, onClose, onEdit }) {
  if (!processo) return null;
  const tipoLabel = processo.tipo === 'outro' && processo.tipo_personalizado
    ? processo.tipo_personalizado : (TIPOS[processo.tipo] || processo.tipo);
  const estado = ESTADOS[processo.estado] || { label: processo.estado, cls: 'bg-gray-100 text-gray-700' };
  const isIRS = processo.tipo === 'irs';
  const irsCampos = processo.irs_campos || {};
  const irsEstadoLabel = IRS_ESTADO_LABELS[processo.irs_estado] || null;
  const camposAtivos = IRS_CAMPOS_LABELS.filter(([k]) => irsCampos[k]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 print:hidden">
          <h2 className="font-bold text-lg text-gray-800">Ficha do Processo</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="w-4 h-4 mr-1" />Imprimir</Button>
            <Button variant="outline" size="sm" onClick={onEdit}><Edit className="w-4 h-4 mr-1" />Editar</Button>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Printable content */}
        <div className="p-8 print:p-4">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{tipoLabel}</h1>
              {processo.prioridade === 'urgente' && (
                <span className="inline-block mt-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">URGENTE</span>
              )}
            </div>
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${estado.cls}`}>{estado.label}</span>
          </div>

          <div className="grid grid-cols-2 gap-6 text-sm mb-6">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Cliente</p>
              <p className="font-medium text-gray-800">{pessoaNome}</p>
            </div>
            {staffNome && (
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Atribuído a</p>
                <p className="font-medium text-gray-800">{staffNome}</p>
              </div>
            )}
            {processo.data_inicio && (
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Data de Início</p>
                <p className="font-medium text-gray-800">{processo.data_inicio}</p>
              </div>
            )}
            {processo.data_prazo && (
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Prazo</p>
                <p className={`font-medium ${new Date(processo.data_prazo) < new Date() && processo.estado !== 'concluido' ? 'text-red-600' : 'text-gray-800'}`}>{processo.data_prazo}</p>
              </div>
            )}
            {processo.data_conclusao && (
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Concluído em</p>
                <p className="font-medium text-gray-800">{processo.data_conclusao}</p>
              </div>
            )}
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Custo do Serviço</p>
              <p className="font-bold text-gray-900">€{(processo.custo_servico || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Pagamento</p>
              <p className={`font-medium ${processo.pago ? 'text-green-700' : 'text-orange-600'}`}>
                {processo.pago ? `Pago${processo.data_pagamento ? ` em ${processo.data_pagamento}` : ''}` : 'Por cobrar'}
              </p>
            </div>
          </div>

          {/* Painel IRS */}
          {isIRS && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-3">Dados IRS</p>
              {irsEstadoLabel && (
                <div className="mb-3">
                  <span className="text-xs text-blue-600 font-medium">Estado: </span>
                  <span className="text-sm font-semibold text-blue-800">{irsEstadoLabel}</span>
                </div>
              )}
              {camposAtivos.length > 0 ? (
                <div className="grid grid-cols-2 gap-1">
                  {camposAtivos.map(([k, label]) => (
                    <div key={k} className="flex items-center gap-1.5 text-sm text-blue-800">
                      <span className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center flex-shrink-0">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                      </span>
                      {label}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-blue-500 italic">Nenhum atributo selecionado</p>
              )}
            </div>
          )}

          {processo.descricao && (
            <div className="mb-6">
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Descrição / Observação</p>
              <p className="text-gray-700 bg-gray-50 rounded-lg p-3">{processo.descricao}</p>
            </div>
          )}

          {processo.notas && (
            <div className="mb-6">
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Notas Internas</p>
              <p className="text-gray-700 bg-gray-50 rounded-lg p-3 italic">{processo.notas}</p>
            </div>
          )}

          {processo.documentos?.length > 0 && (
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">Documentos ({processo.documentos.length})</p>
              <div className="space-y-2">
                {processo.documentos.map((doc, i) => (
                  <a key={i} href={doc.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-2 border border-gray-200 transition-colors group">
                    <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span className="flex-1 text-blue-700 group-hover:underline truncate">{doc.nome}</span>
                    <Download className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}