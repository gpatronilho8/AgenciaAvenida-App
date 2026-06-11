import { cn } from '@/lib/utils';

const variants = {
  pendente: 'bg-yellow-100 text-yellow-700',
  pago: 'bg-green-100 text-green-700',
  vencido: 'bg-red-100 text-red-700',
  vencida: 'bg-red-100 text-red-700',
  cancelado: 'bg-gray-100 text-gray-700',
  aberta: 'bg-blue-100 text-blue-700',
  em_progresso: 'bg-orange-100 text-orange-700',
  resolvida: 'bg-green-100 text-green-700',
  fechada: 'bg-gray-100 text-gray-700',
  ativo: 'bg-green-100 text-green-700',
  inativo: 'bg-gray-100 text-gray-700',
  urgente: 'bg-red-100 text-red-700',
  alta: 'bg-orange-100 text-orange-700',
  media: 'bg-yellow-100 text-yellow-700',
  baixa: 'bg-blue-100 text-blue-700',
  normal: 'bg-blue-100 text-blue-700',
};

const labels = {
  pendente: 'Pendente',
  pago: 'Pago',
  vencido: 'Vencido',
  vencida: 'Vencida',
  cancelado: 'Cancelado',
  aberta: 'Aberta',
  em_progresso: 'Em Progresso',
  resolvida: 'Resolvida',
  fechada: 'Fechada',
  ativo: 'Ativo',
  inativo: 'Inativo',
  urgente: 'Urgente',
  normal: 'Normal',
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};

export default function StatusBadge({ status }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variants[status] || 'bg-gray-100 text-gray-700')}>
      {labels[status] || status}
    </span>
  );
}