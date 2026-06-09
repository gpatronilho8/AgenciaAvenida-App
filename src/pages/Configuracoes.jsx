import { useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Mail, Bell, Building2, Shield } from 'lucide-react';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';

export default function Configuracoes() {
  const [emailConfig, setEmailConfig] = useState({
    envioQuotas: true,
    alertaDivida: true,
    convocatorias: true,
    diasAntecedencia: 5,
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSaving(false);
    toast.success('CONFIGURAÇÕES GUARDADAS');
  };

  const handleTestEmail = async () => {
    const user = await agenciaAvenida.auth.me();
    await agenciaAvenida.integrations.Core.SendEmail({
      to: user.email,
      subject: 'Teste - Agência Avenida',
      body: `<h2>Email de teste</h2><p>As suas configurações de email estão a funcionar corretamente.</p><p><strong>Agência Avenida</strong> - Gestão de Condomínios</p>`,
    });
    toast.success(`E-MAIL DE TESTE ENVIADO COM SUCESSO`);
  };

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Preferências do sistema e notificações" />

      <div className="max-w-2xl space-y-6">
        {/* Notificações */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Notificações por Email</h2>
          </div>
          <div className="space-y-4">
            {[
              { key: 'envioQuotas', label: 'Envio automático de quotas', desc: 'Notifica o condómino quando uma quota é emitida' },
              { key: 'alertaDivida', label: 'Alertas de dívida', desc: 'Envia aviso quando uma quota está vencida' },
              { key: 'convocatorias', label: 'Convocatórias de assembleia', desc: 'Envia convocatórias para reuniões' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Switch
                  checked={emailConfig[key]}
                  onCheckedChange={v => setEmailConfig(p => ({ ...p, [key]: v }))}
                />
              </div>
            ))}
            <div className="pt-2">
              <Label>Dias de antecedência para alertas de vencimento</Label>
              <Input
                className="mt-1 w-24"
                type="number"
                min={1}
                max={30}
                value={emailConfig.diasAntecedencia}
                onChange={e => setEmailConfig(p => ({ ...p, diasAntecedencia: parseInt(e.target.value) || 5 }))}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <Button variant="outline" size="sm" onClick={handleTestEmail} className="gap-2">
              <Mail className="w-4 h-4" />Enviar Email de Teste
            </Button>
          </div>
        </div>

        {/* Sistema */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Informações do Sistema</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Aplicação</span>
              <span className="font-medium">Agência Avenida — Plataforma de Gestão</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Versão</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Portal do Condómino</span>
              <a href="/portal" target="_blank" className="text-primary hover:underline font-medium">/portal</a>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'A guardar...' : 'Guardar Configurações'}
          </Button>
        </div>
      </div>
    </div>
  );
}