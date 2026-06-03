import jsPDF from 'jspdf';

const AGENCY_NAME = 'Agência Avenida';
const AGENCY_ADDRESS = 'Gestão de Imóveis e Condomínios';

function addHeader(doc, title) {
  doc.setFillColor(14, 102, 178);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(AGENCY_NAME, 14, 11);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(AGENCY_ADDRESS, 14, 18);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 26);
  doc.setTextColor(0, 0, 0);
}

function addFooter(doc) {
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Documento gerado em ${new Date().toLocaleDateString('pt-PT')} — ${AGENCY_NAME}`, 14, pageHeight - 8);
}

function row(doc, label, value, y, bold = false) {
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text(label, 14, y);
  doc.setTextColor(0, 0, 0);
  doc.text(String(value), 90, y);
}

// ─── Recibo de Quota de Condomínio ───
export function gerarReciboQuota({ quota, fracao, condominio, pessoa, numero }) {
  const doc = new jsPDF();
  addHeader(doc, 'RECIBO DE QUOTA');

  let y = 38;
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Nº Recibo: ${numero || quota.numero_recibo || quota.id?.slice(-6).toUpperCase()}`, 14, y);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-PT')}`, 160, y);

  y += 10;
  doc.setDrawColor(220);
  doc.line(14, y, 196, y);
  y += 8;

  row(doc, 'Condomínio:', condominio?.nome || '—', y); y += 7;
  row(doc, 'Morada:', condominio?.morada || '—', y); y += 7;
  row(doc, 'Fração:', fracao ? `${fracao.codigo} — ${fracao.descricao || ''}` : '—', y); y += 7;
  row(doc, 'Devedor/Pagador:', pessoa?.nome || '—', y); y += 7;
  if (pessoa?.nif) { row(doc, 'NIF:', pessoa.nif, y); y += 7; }

  y += 3;
  doc.setDrawColor(220);
  doc.line(14, y, 196, y);
  y += 8;

  row(doc, 'Descrição:', quota.descricao || `Quota ${quota.mes}/${quota.ano}`, y); y += 7;
  row(doc, 'Período:', `${quota.mes}/${quota.ano}`, y); y += 7;
  row(doc, 'Data de Vencimento:', quota.data_vencimento || '—', y); y += 7;
  row(doc, 'Data de Pagamento:', quota.data_pagamento || new Date().toLocaleDateString('pt-PT'), y); y += 7;
  row(doc, 'Método de Pagamento:', quota.metodo_pagamento || '—', y); y += 10;

  // Total box
  doc.setFillColor(240, 247, 255);
  doc.roundedRect(14, y, 182, 16, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(14, 102, 178);
  doc.text('TOTAL PAGO:', 20, y + 10);
  doc.text(`€ ${(quota.valor || 0).toFixed(2)}`, 160, y + 10);
  y += 24;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text('Este documento serve como comprovativo de pagamento da quota de condomínio.', 14, y);

  addFooter(doc);
  doc.save(`recibo_quota_${quota.id?.slice(-6) || 'doc'}.pdf`);
  return doc;
}

// ─── Nota de Pagamento ao Proprietário (fecho mensal) ───
export function gerarNotaPagamentoProprietario({ prop, proprietario, renda, despesas, mes, ano, valorTransferencia, dataTransferencia }) {
  const doc = new jsPDF();
  addHeader(doc, 'NOTA DE PAGAMENTO AO PROPRIETÁRIO');

  let y = 38;
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Referência: ${prop?.id?.slice(-6).toUpperCase() || 'DOC'}-${String(mes).padStart(2, '0')}${ano}`, 14, y);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-PT')}`, 160, y);

  y += 10;
  doc.setDrawColor(220);
  doc.line(14, y, 196, y);
  y += 8;

  row(doc, 'Proprietário:', proprietario?.nome || '—', y); y += 7;
  if (proprietario?.nif) { row(doc, 'NIF:', proprietario.nif, y); y += 7; }
  const iban = prop?.iban_proprietario || proprietario?.iban || proprietario?.nib || '—';
  row(doc, 'IBAN / NIB:', iban, y); y += 7;
  row(doc, 'Imóvel:', prop?.morada || '—', y); y += 7;
  row(doc, 'Período:', `${mes}/${ano}`, y); y += 10;

  doc.setDrawColor(220);
  doc.line(14, y, 196, y);
  y += 8;

  // Income
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('RECEITAS', 14, y); y += 6;
  row(doc, 'Renda Recebida:', `€ ${(renda?.valor_renda || 0).toFixed(2)}`, y); y += 10;

  // Expenses
  if (despesas && despesas.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('DESPESAS (a deduzir):', 14, y); y += 6;
    const descDespesas = despesas.filter(d => d.desconta_proprietario !== false);
    descDespesas.forEach(d => {
      row(doc, `  ${d.descricao}:`, `- € ${(d.valor || 0).toFixed(2)}`, y); y += 6;
    });
    const totalDesp = descDespesas.reduce((s, d) => s + (d.valor || 0), 0);
    row(doc, 'Total Despesas:', `- € ${totalDesp.toFixed(2)}`, y, true); y += 10;
  }

  doc.setDrawColor(220);
  doc.line(14, y, 196, y);
  y += 8;

  // Total to transfer
  doc.setFillColor(235, 255, 245);
  doc.roundedRect(14, y, 182, 20, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(22, 163, 74);
  doc.text('VALOR A TRANSFERIR:', 20, y + 8);
  doc.text(`€ ${(valorTransferencia || 0).toFixed(2)}`, 150, y + 8);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (dataTransferencia) doc.text(`Data prevista: ${dataTransferencia}`, 20, y + 16);
  y += 28;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.text('Este documento é uma nota interna de pagamento para controlo de transferências.', 14, y);

  addFooter(doc);
  doc.save(`nota_pagamento_${prop?.id?.slice(-6) || 'doc'}_${mes}_${ano}.pdf`);
  return doc;
}

// ─── Recibo de Renda (arrendamento) ───
export function gerarReciboRenda({ renda, prop, proprietario, inquilino, mes, ano }) {
  const doc = new jsPDF();
  addHeader(doc, 'RECIBO DE RENDA');

  let y = 38;
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-PT')}`, 160, y);

  y += 10;
  doc.setDrawColor(220);
  doc.line(14, y, 196, y);
  y += 8;

  row(doc, 'Imóvel:', prop?.morada || '—', y); y += 7;
  row(doc, 'Proprietário:', proprietario?.nome || '—', y); y += 7;
  row(doc, 'Inquilino:', inquilino?.nome || '—', y); y += 7;
  row(doc, 'Período:', `${mes} de ${ano}`, y); y += 7;
  if (renda.data_recebimento) { row(doc, 'Data de Recebimento:', renda.data_recebimento, y); y += 7; }
  if (renda.metodo_pagamento) { row(doc, 'Método:', renda.metodo_pagamento, y); y += 7; }

  y += 3;
  doc.setFillColor(235, 255, 245);
  doc.roundedRect(14, y, 182, 16, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(22, 163, 74);
  doc.text('RENDA RECEBIDA:', 20, y + 10);
  doc.text(`€ ${(renda.valor_renda || 0).toFixed(2)}`, 160, y + 10);
  y += 24;

  doc.setTextColor(0, 0, 0);
  addFooter(doc);
  doc.save(`recibo_renda_${prop?.id?.slice(-6) || 'doc'}_${mes}_${ano}.pdf`);
  return doc;
}