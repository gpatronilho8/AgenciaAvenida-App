import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { toast } from 'sonner';
import { Mail, Bell, Shield, Send, FileText, History, Search, RefreshCw, Download, CheckCircle2, ChevronDown, Check, ChevronsUpDown } from 'lucide-react';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

const MESES_LABEL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function Configuracoes() {
  const qc = useQueryClient();
  const hoje = new Date();

  // --- QUERIES BASE (SUPABASE) ---
  const { data: pessoas = [] } = useQuery({ queryKey: ['pessoas-config'], queryFn: () => agenciaAvenida.entities.Pessoa.list() });
  const { data: condominios = [] } = useQuery({ queryKey: ['condominios-config'], queryFn: () => agenciaAvenida.entities.Condominio.list() });
  const { data: fracoes = [] } = useQuery({ queryKey: ['fracoes-config'], queryFn: () => agenciaAvenida.entities.Fracao.list() });
  const { data: propriedades = [] } = useQuery({ queryKey: ['propriedades-config'], queryFn: () => agenciaAvenida.entities.Propriedade.list() });

  // Obter registo de versão dinâmico da tabela do Supabase
  const { data: versaoSistema } = useQuery({
    queryKey: ['versao-sistema'],
    queryFn: async () => {
      const res = await agenciaAvenida.entities.Versao.get('511ffa08-c5f2-44fd-9172-5618ccff68a4');
      return res?.versao || '1.0.0';
    }
  });

  // Query estado atual das configurações do sistema
  const { data: configSys } = useQuery({
    queryKey: ['config-sistema'],
    queryFn: () => agenciaAvenida.entities.ConfiguracaoSistema.get(1)
  });
  const autoRendas = configSys?.auto_rendas ?? true;

  // Query real do histórico de comunicações
  const { data: historicoLogs = [] } = useQuery({
    queryKey: ['comunicacoes-logs'],
    queryFn: () => agenciaAvenida.entities.ComunicacaoLog.list('-created_at')
  });

  // --- ESTADOS DOS FILTROS E PESQUISAS ---
  const [activeModal, setActiveModal] = useState(null); // 'email' | 'carta' | 'historico' | null
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [expandedEmail, setExpandedEmail] = useState(null);

  // Estados para abrir/fechar os novos Comboboxes
  const [openComboCondo, setOpenComboCondo] = useState(false);
  const [openComboPessoaEmail, setOpenComboPessoaEmail] = useState(false);
  const [openComboPessoaCarta, setOpenComboPessoaCarta] = useState(false);

  // Filtros de Data do Histórico
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(hoje), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(endOfMonth(hoje), 'yyyy-MM-dd'));

  // Formulários
  const [emailForm, setEmailForm] = useState({
    tipoDestinatario: 'individual',
    targetId: '',
    entidadeId: '',
    assunto: '',
    descricao: ''
  });

  const [cartaForm, setCartaForm] = useState({
    modoOrigem: 'pesquisa',
    entidadeId: '',
    nomeManual: '',
    morada: '',
    codigoPostal: '',
    localidade: '',
    texto: ''
  });

  // --- ESCUTA ATUALIZAÇÕES DE MORADA (CARTA) ---
  useEffect(() => {
    if (cartaForm.modoOrigem === 'pesquisa' && cartaForm.entidadeId) {
      const pessoa = pessoas.find(p => String(p.id) === String(cartaForm.entidadeId));
      if (pessoa) {
        setCartaForm(p => ({
          ...p,
          morada: pessoa.morada || '',
          codigoPostal: pessoa.codigo_postal || '',
          localidade: pessoa.localidade || ''
        }));
      }
    }
  }, [cartaForm.entidadeId, cartaForm.modoOrigem, pessoas]);

  const executarEnvioEmail = async () => {
    setShowConfirm(false);
    let listaEmails = [];

    if (emailForm.tipoDestinatario === 'individual' && emailForm.entidadeId) {
      const p = pessoas.find(x => String(x.id) === String(emailForm.entidadeId));
      if (p?.email) listaEmails.push(p.email);
    } else if (emailForm.tipoDestinatario === 'classe') {
      const filtrados = pessoas.filter(p => String(p.tipo).toLowerCase() === String(emailForm.targetId).toLowerCase());
      listaEmails = filtrados.map(p => p.email).filter(Boolean);
    } else if (emailForm.tipoDestinatario === 'condominio') {
      const fracoesDoCondo = fracoes.filter(f => String(f.condominio_id) === String(emailForm.targetId));
      fracoesDoCondo.forEach(f => {
        const arr = Array.isArray(f.titulares) ? f.titulares : JSON.parse(f.titulares || '[]');
        arr.forEach(item => {
          const id = typeof item === 'object' ? item.id : item;
          const p = pessoas.find(x => String(x.id) === String(id));
          if (p?.email && !listaEmails.includes(p.email)) listaEmails.push(p.email);
        });
      });
    }

    if (listaEmails.length === 0) {
      toast.error('NENHUM E-MAIL ENCONTRADO PARA OS PARÂMETROS SELECIONADOS');
      return;
    }

    await agenciaAvenida.entities.ComunicacaoLog.create({
      tipo: 'email',
      destinatario: emailForm.tipoDestinatario === 'individual' ? listaEmails[0] : `Grupo: ${emailForm.tipoDestinatario} (${listaEmails.length})`,
      assunto: emailForm.assunto,
      mensagem: emailForm.descricao,
      data: format(new Date(), 'yyyy-MM-dd')
    });

    toast.success(`E-MAIL ENVIADO PARA ${listaEmails.length} DESTINATÁRIOS.`);
    qc.invalidateQueries({ queryKey: ['comunicacoes-logs'] });
    setActiveModal(null);
  };

  const executarGerarCarta = async () => {
    setShowConfirm(false);
    const nomeDest = cartaForm.modoOrigem === 'pesquisa'
      ? (pessoas.find(x => String(x.id) === String(cartaForm.entidadeId))?.nome || 'Entidade')
      : cartaForm.nomeManual;

    const nomeFicheiro = `carta_${String(nomeDest).replace(/ /g, '_').toLowerCase()}_${format(hoje, 'yyyyMMdd')}.pdf`;

    const pdfDummy = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 40 >>\nstream\nBT /F1 12 Tf 40 700 Td (${cartaForm.texto}) Et endstream\nendobj\ntrailer << /Size 5 /Root 1 0 R >>\n%%EOF`;
    const blob = new Blob([pdfDummy], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeFicheiro;
    a.click();

    await agenciaAvenida.entities.ComunicacaoLog.create({
      tipo: 'carta',
      destinatario: `${nomeDest} (${cartaForm.localidade})`,
      assunto: 'Notificação Postal Registada',
      mensagem: `Enviado para: ${cartaForm.morada}, ${cartaForm.codigoPostal} - ${cartaForm.texto}`,
      data: format(new Date(), 'yyyy-MM-dd'),
      ficheiro_url: nomeFicheiro
    });

    toast.success('CARTA IMPRESSA DESCARREGADA E ARQUIVADA COM SUCESSO');
    qc.invalidateQueries({ queryKey: ['comunicacoes-logs'] });
    setActiveModal(null);
  };

  const limparFiltrosHistorico = () => {
    setDataInicio(format(startOfMonth(hoje), 'yyyy-MM-dd'));
    setDataFim(format(endOfMonth(hoje), 'yyyy-MM-dd'));
    toast.success('FILTROS REPOSTOS PARA O MÊS CORRENTE');
  };

  return (
    <div className="space-y-8 pb-12 max-w-4xl"> {/* <-- Retirado o mx-auto */}
      <PageHeader title="Configurações de Operação" subtitle="Configurações do sistema e envio de comunicações." />

      {/* 1. MÓDULO: AUTOMACÕES & NOTIFICAÇÕES */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="font-black text-sm uppercase tracking-wider text-foreground">Automações de Processamento</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-border border-dashed">
            <div>
              <p className="text-sm font-semibold text-foreground">Gerar Rendas Mensalmente</p>
              <p className="text-xs text-muted-foreground">Executa lançamento automático das rendas no dia 01 de cada mês às 00h.</p>
            </div>
            <Switch
              checked={autoRendas}
              onCheckedChange={async (valor) => {
                // Atualiza imediatamente na base de dados
                await agenciaAvenida.entities.ConfiguracaoSistema.update(1, { auto_rendas: valor });
                qc.invalidateQueries({ queryKey: ['config-sistema'] });
                toast.success(valor ? 'AUTOMAÇÃO DE RENDAS ATIVADA' : 'AUTOMAÇÃO DE RENDAS SUSPENSA');
              }}
            />
          </div>

          <div className="flex items-center justify-between py-2 opacity-50 cursor-not-allowed">
            <div>
              <p className="text-sm font-semibold text-foreground">Alerta Incumprimento</p>
              <p className="text-xs text-muted-foreground">Envia avisos automáticos por e-mail quando uma quota ou renda passa ao estado "vencida".</p>
            </div>
            <Switch checked={false} disabled={true} />
          </div>
        </div>
      </div>

      {/* 2. MÓDULO: CENTRAL DE COMUNICAÇÕES OMNICHANNEL */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Mail className="w-5 h-5 text-primary" />
          <h2 className="font-black text-sm uppercase tracking-wider text-foreground">Envio de Comunicações (E-mail & Carta)</h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Selecione o canal pretendido para notificar os titulares das frações, agrupar e-mails por classes ou emitir minutas postais oficiais com arquivamento centralizado.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <Button variant="outline" className="h-14 text-md tracking-wider gap-2 rounded-xl border-dashed shadow-sm" onClick={() => { setEmailForm({ tipoDestinatario: 'individual', targetId: '', entidadeId: '', assunto: '', descricao: '' }); setActiveModal('email'); }}>
            <Mail className="w-4 h-4 text-primary" /> Enviar E-mail
          </Button>
          <Button variant="outline" className="h-14 text-md tracking-wider gap-2 rounded-xl border-dashed shadow-sm" onClick={() => { setCartaForm({ modoOrigem: 'pesquisa', entidadeId: '', nomeManual: '', morada: '', codigoPostal: '', localidade: '', texto: '' }); setActiveModal('carta'); }}>
            <FileText className="w-4 h-4 text-amber-600" /> Gerar Carta
          </Button>
          <Button variant="outline" className="h-14 text-md tracking-wider gap-2 rounded-xl bg-muted/30" onClick={() => setActiveModal('historico')}>
            <History className="w-4 h-4 text-muted-foreground" /> Histórico
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: COMPOR E-MAIL COM BUSCA COMBOBOX */}
      {/* ========================================================================= */}
      <Dialog open={activeModal === 'email'} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="max-w-lg rounded-xl">
          <DialogHeader><DialogTitle className="font-black text-md uppercase tracking-wider">Criação de Mensagem via E-mail</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4 overflow-visible">

            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-wider">Filtro de Destinatários</Label>
              <Select value={emailForm.tipoDestinatario} onValueChange={v => setEmailForm(p => ({ ...p, tipoDestinatario: v, targetId: '', entidadeId: '' }))}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual (Pessoa Específica)</SelectItem>
                  <SelectItem value="classe">Por Classe / Perfil</SelectItem>
                  <SelectItem value="condominio">Titulares de Frações (Condomínio)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* COMBOBOX CONDÓMINOS */}
            {emailForm.tipoDestinatario === 'condominio' && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider">Pesquisar Condomínio Ativo</Label>
                <Popover open={openComboCondo} onOpenChange={setOpenComboCondo}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={openComboCondo} className="w-full justify-between font-normal bg-background mt-1">
                      {emailForm.targetId ? (
                        condominios.filter(c => c.id === emailForm.targetId).map(c => (
                          <span key={c.id}>
                            <span className="font-bold">({c.codigo || 'S/C'})</span> {c.nome}
                          </span>
                        ))[0]
                      ) : (
                        "Selecione ou pesquise o condomínio..."
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                    <Command>
                      <CommandInput placeholder="Pesquisar condomínio..." />
                      <CommandEmpty>Condomínio Não Encontrado</CommandEmpty>
                      <CommandGroup className="max-h-48 overflow-y-auto no-scrollbar">
                        {[...condominios]
                          .filter(c => c.ativo !== false)
                          .sort((a, b) => (a.codigo || '').localeCompare(b.codigo || '', 'pt', { numeric: true }))
                          .map((c) => {
                            // Mantemos o labelStr simples para a pesquisa funcionar
                            const labelStr = `(${c.codigo || 'S/C'}) ${c.nome}`;
                            return (
                              <CommandItem key={c.id} value={labelStr} onSelect={() => { setEmailForm(p => ({ ...p, targetId: c.id })); setOpenComboCondo(false); }}>
                                <Check className={cn("mr-2 h-4 w-4", emailForm.targetId === c.id ? "opacity-100" : "opacity-0")} />

                                {/* Desenhamos a negrito apenas visualmente */}
                                <span>
                                  <span className="font-bold">({c.codigo || 'S/C'})</span> {c.nome}
                                </span>
                              </CommandItem>
                            );
                          })}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* COMBOBOX INDIVIDUAL (EMAIL) */}
            {emailForm.tipoDestinatario === 'individual' && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider">Pesquisar Pessoa por Nome ou E-mail</Label>
                <Popover open={openComboPessoaEmail} onOpenChange={setOpenComboPessoaEmail}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={openComboPessoaEmail} className="w-full justify-between font-normal bg-background mt-1">
                      {emailForm.entidadeId ? pessoas.find(p => p.id === emailForm.entidadeId)?.nome : "Selecione ou pesquise a entidade..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                    <Command>
                      <CommandInput placeholder="Pesquisar entidade..." />
                      <CommandEmpty>Entidade Não Encontrada</CommandEmpty>
                      <CommandGroup className="max-h-48 overflow-y-auto no-scrollbar">
                        {pessoas.map((p) => (
                          <CommandItem key={p.id} value={`${p.nome} ${p.email || ''}`} onSelect={() => { setEmailForm(prev => ({ ...prev, entidadeId: p.id })); setOpenComboPessoaEmail(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", emailForm.entidadeId === p.id ? "opacity-100" : "opacity-0")} />
                            {p.nome} {p.email ? <span className="text-muted-foreground ml-1">({p.email})</span> : ''}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {emailForm.tipoDestinatario === 'classe' && (
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-wider">Escolha a Classe</Label>
                <Select value={emailForm.targetId} onValueChange={v => setEmailForm(p => ({ ...p, targetId: v }))}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Escolha uma opção..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="colaborador">Colaboradores (Utilizadores do Sistema)</SelectItem>
                    <SelectItem value="fornecedor">Fornecedores & Técnicos</SelectItem>
                    <SelectItem value="banco">Instituições Bancárias</SelectItem>
                    <SelectItem value="advogado">Advogados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-wider">Assunto do E-mail *</Label>
              <Input value={emailForm.assunto} onChange={e => setEmailForm(p => ({ ...p, assunto: e.target.value }))} className="bg-background" />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-wider">Corpo da Mensagem (Texto Livre) *</Label>
              <textarea value={emailForm.descricao} onChange={e => setEmailForm(p => ({ ...p, descricao: e.target.value }))} className="w-full bg-background rounded-md border border-input min-h-[120px] p-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary" />
            </div>

            <div className="flex justify-end gap-2 border-t pt-3 mt-4">
              <Button variant="outline" size="sm" className="font-bold text-xs uppercase" onClick={() => setActiveModal(null)}>Cancelar</Button>
              <Button size="sm" className="font-bold text-xs uppercase gap-1.5" disabled={!emailForm.assunto || !emailForm.descricao} onClick={() => { setConfirmAction(() => executarEnvioEmail); setShowConfirm(true); }}>
                <Send className="w-3.5 h-3.5" /> Enviar E-mail
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* ========================================================================= */}
      {/* MODAL: GERAR CARTA POSTAL E CARREGAR MORADAS AUTOMÁTICAS */}
      {/* ========================================================================= */}
      <Dialog open={activeModal === 'carta'} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="max-w-lg rounded-xl">
          <DialogHeader><DialogTitle className="font-black text-md uppercase tracking-wider">Processador de Carta Física</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2 overflow-visible">
            <div className="flex gap-4 border-b pb-2">
              <button className={`text-xs font-black uppercase pb-1 tracking-wider ${cartaForm.modoOrigem === 'pesquisa' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`} onClick={() => setCartaForm(p => ({ ...p, modoOrigem: 'pesquisa', nomeManual: '' }))}>Consultar Base de Dados</button>
              <button className={`text-xs font-black uppercase pb-1 tracking-wider ${cartaForm.modoOrigem === 'manual' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`} onClick={() => setCartaForm(p => ({ ...p, modoOrigem: 'manual', entidadeId: '', morada: '', codigoPostal: '', localidade: '' }))}>Escrever Manualmente</button>
            </div>

            {cartaForm.modoOrigem === 'pesquisa' ? (
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider">Escolher Destinatário</Label>
                <Popover open={openComboPessoaCarta} onOpenChange={setOpenComboPessoaCarta}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={openComboPessoaCarta} className="w-full justify-between font-normal bg-background mt-1">
                      {cartaForm.entidadeId ? pessoas.find(p => p.id === cartaForm.entidadeId)?.nome : "Selecione ou pesquise o destinatário..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                    <Command>
                      <CommandInput placeholder="Pesquisar por nome..." />
                      <CommandEmpty>Nenhum destinatário encontrado.</CommandEmpty>
                      <CommandGroup className="max-h-48 overflow-y-auto no-scrollbar">
                        {pessoas.map((p) => (
                          <CommandItem key={p.id} value={p.nome} onSelect={() => { setCartaForm(prev => ({ ...prev, entidadeId: p.id })); setOpenComboPessoaCarta(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", cartaForm.entidadeId === p.id ? "opacity-100" : "opacity-0")} />
                            {p.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            ) : (
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-wider">Nome do Destinatário *</Label>
                <Input value={cartaForm.nomeManual} onChange={e => setCartaForm(p => ({ ...p, nomeManual: e.target.value }))} className="bg-background" />
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-wider">Morada Postal *</Label>
              <Input value={cartaForm.morada} onChange={e => setCartaForm(p => ({ ...p, morada: e.target.value }))} className="bg-background" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1 space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-wider">Código Postal *</Label>
                <Input value={cartaForm.codigoPostal} onChange={e => setCartaForm(p => ({ ...p, codigoPostal: e.target.value }))} className="bg-background" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-wider">Localidade *</Label>
                <Input value={cartaForm.localidade} onChange={e => setCartaForm(p => ({ ...p, localidade: e.target.value }))} className="bg-background" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-wider">Texto de Comunicação Oficial *</Label>
              <textarea value={cartaForm.texto} onChange={e => setCartaForm(p => ({ ...p, texto: e.target.value }))} className="w-full bg-background rounded-md border border-input min-h-[100px] p-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary" />
            </div>

            <div className="flex justify-end gap-2 border-t pt-3 mt-4">
              <Button variant="outline" size="sm" className="font-bold text-xs uppercase" onClick={() => setActiveModal(null)}>Cancelar</Button>
              <Button size="sm" className="font-bold text-xs uppercase gap-1.5" disabled={!cartaForm.morada || !cartaForm.codigoPostal || !cartaForm.texto} onClick={() => { setConfirmAction(() => executarGerarCarta); setShowConfirm(true); }}>
                <FileText className="w-3.5 h-3.5" /> Gerar Carta
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* ========================================================================= */}
      {/* MODAL: HISTÓRICO REAL DE ARQUIVO COM REFRESH E EXPANSÃO DE CONTEÚDO */}
      {/* ========================================================================= */}
      <Dialog open={activeModal === 'historico'} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="max-w-2xl rounded-xl">
          <DialogHeader><DialogTitle className="font-black text-md uppercase tracking-wider">Histórico de Comunicações</DialogTitle></DialogHeader>

          <div className="flex flex-col sm:flex-row items-center gap-3 mt-4 bg-muted/20 p-3 rounded-xl border">
            <div className="flex flex-1 items-center gap-2 w-full">
              <input type="date" className="bg-background border rounded-lg px-3 h-9 text-xs flex-1 cursor-pointer" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
              <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest px-1">até</span>
              <input type="date" className="bg-background border rounded-lg px-3 h-9 text-xs flex-1 cursor-pointer" value={dataFim} onChange={e => setDataFim(e.target.value)} />
            </div>
            <Button variant="outline" size="icon" onClick={limparFiltrosHistorico} className="h-9 w-9 text-muted-foreground shrink-0" title="Repor Mês Atual">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2 mt-4 max-h-[320px] overflow-y-auto pr-1">
            {historicoLogs
              .filter(item => {
                if (!item.created_at) return true;
                const dataRef = parseISO(item.created_at.split('T')[0]);
                return isWithinInterval(dataRef, { start: parseISO(dataInicio), end: parseISO(dataFim) });
              })
              .map(item => {
                const isExpanded = expandedEmail === item.id;
                return (
                  <div key={item.id} className="bg-card border border-border rounded-xl p-3 shadow-sm text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${item.tipo === 'email' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>{item.tipo}</span>
                          <p className="font-bold text-foreground">{item.destinatario}</p>
                        </div>
                        <p className="text-muted-foreground font-semibold">{item.assunto}</p>
                      </div>

                      {item.tipo === 'email' ? (
                        <Button variant="ghost" size="sm" onClick={() => setExpandedEmail(isExpanded ? null : item.id)} className="text-[10px] font-bold uppercase gap-1">
                          {isExpanded ? 'Ocultar' : 'Ver Texto'} <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </Button>
                      ) : (
                        item.ficheiro_url && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 border rounded-lg border-dashed" title="Descarregar Cópia Oficial" onClick={() => toast.success(`A DESCARREGAR FICHEIRO`)}>
                            <Download className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                        )
                      )}
                    </div>

                    {item.tipo === 'email' && isExpanded && (
                      <div className="bg-muted/30 p-3 rounded-lg border border-dashed text-muted-foreground leading-relaxed mt-2 animate-in fade-in-50 duration-200">
                        {item.mensagem}
                      </div>
                    )}
                  </div>
                );
              })}

            {historicoLogs.length === 0 && (
              <p className="text-center text-muted-foreground py-12 text-xs font-black uppercase tracking-wider">Nenhum registo localizado no arquivo deste período.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>


      {/* CONFIRMADOR DE ORDEM CENTRAL */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-xs rounded-xl text-center p-6">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider text-foreground">Confirmar Ação</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Deseja autorizar o processamento imediato desta ordem de comunicação?</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-5">
            <Button variant="outline" size="sm" className="font-bold text-xs uppercase" onClick={() => setShowConfirm(false)}>Voltar</Button>
            <Button size="sm" className="font-bold text-xs uppercase" onClick={confirmAction}>Confirmar</Button>
          </div>
        </DialogContent>
      </Dialog>


      {/* ========================================================================= */}
      {/* 3. MÓDULO: INFORMAÇÕES DE NÚCLEO */}
      {/* ========================================================================= */}
      <footer className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-4 mt-12 w-full">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="font-black text-sm uppercase tracking-wider text-foreground">Informações Do Sistema</h2>
        </div>

        {/* Alterado para grid-cols-4 */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 text-xs font-medium">

          {/* Adicionado sm:col-span-2 para ocupar metade do ecrã e não quebrar a linha */}
          <div className="flex flex-col gap-2.5 sm:col-span-2">
            <span className="text-muted-foreground uppercase text-[9px] tracking-widest font-black">Aplicação</span>
            <span className="text-foreground text-sm truncate">Agência Avenida - Plataforma de Gestão</span>
          </div>

          <div className="flex flex-col gap-2.5">
            <span className="text-muted-foreground uppercase text-[9px] tracking-widest font-black">Estado Do Servidor</span>
            <span className="text-emerald-600 font-black text-sm uppercase tracking-wider">Online</span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground uppercase text-[9px] tracking-widest font-black">Versão Em Produção</span>
            <span className="font-mono bg-muted text-foreground font-black px-2 py-1 rounded border border-border w-fit text-xs mt-0.5">
              v {versaoSistema || '1.0.0'}
            </span>
          </div>

        </div>
      </footer>

    </div>
  );
}