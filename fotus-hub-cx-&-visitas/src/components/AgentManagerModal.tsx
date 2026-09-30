import { FormEvent, useEffect, useState } from 'react';
import type { CurrentUser } from '../lib/currentUser';
import { Plus, Save, Trash2, UserRound, X } from 'lucide-react';
import { replaceOccurrenceAgents } from '../lib/dataMutations';

interface AgentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: string[];
  currentUser: CurrentUser;
}

export default function AgentManagerModal({ isOpen, onClose, agents, currentUser }: AgentManagerModalProps) {
  const [draftAgents, setDraftAgents] = useState<string[]>(agents);
  const [newAgent, setNewAgent] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setDraftAgents(agents);
    setNewAgent('');
    setErrorMessage('');
  }, [agents, isOpen]);

  if (!isOpen) return null;

  const addAgent = (event?: FormEvent) => {
    event?.preventDefault();
    const name = newAgent.replace(/\s+/g, ' ').trim();
    if (!name) return;
    const exists = draftAgents.some((agent) => agent.localeCompare(name, 'pt-BR', { sensitivity: 'base' }) === 0);
    if (exists) {
      setErrorMessage('Essa agente já está cadastrada.');
      return;
    }
    setDraftAgents((current) => [...current, name]);
    setNewAgent('');
    setErrorMessage('');
  };

  const removeAgent = (name: string) => {
    setDraftAgents((current) => current.filter((agent) => agent !== name));
  };

  const saveAgents = async () => {
    if (!draftAgents.length) {
      setErrorMessage('Mantenha pelo menos uma agente cadastrada para abrir novas ocorrências.');
      return;
    }
    setSaving(true);
    setErrorMessage('');
    try {
      await replaceOccurrenceAgents(currentUser, draftAgents);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar agentes:', error);
      setErrorMessage('Não foi possível salvar a lista. Confira sua conexão e suas permissões.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-fotus-ink/45 p-3 backdrop-blur-sm sm:p-6">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-fotus-neutral bg-fotus-neutral shadow-2xl">
        <header className="flex items-center justify-between border-b border-fotus-blue/10 bg-gradient-to-r from-fotus-blue/6 via-fotus-neutral to-fotus-neutral px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-fotus-blue/6 text-fotus-blue"><UserRound className="h-5 w-5" /></span>
            <div><h2 className="text-base font-extrabold text-fotus-ink">Editar agentes</h2><p className="text-xs text-fotus-ink/80">Essa lista aparece no cadastro de ocorrências.</p></div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-fotus-ink/80 hover:bg-fotus-neutral/70 hover:text-fotus-ink"><X className="h-5 w-5" /></button>
        </header>

        <div className="space-y-5 p-5 sm:p-6">
          <form onSubmit={addAgent} className="flex gap-2">
            <input autoFocus value={newAgent} onChange={(event) => setNewAgent(event.target.value)} placeholder="Nome da nova agente" className="field-input" />
            <button type="submit" className="flex shrink-0 items-center gap-1.5 rounded-xl bg-fotus-blue px-3.5 py-2.5 text-xs font-bold text-fotus-neutral hover:bg-fotus-blue"><Plus className="h-4 w-4" />Adicionar</button>
          </form>

          {errorMessage && <p className="rounded-xl border border-fotus-yellow/25 bg-fotus-yellow/7 p-3 text-xs font-semibold text-fotus-ink">{errorMessage}</p>}

          <div className="space-y-2">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-fotus-ink/80">Agentes disponíveis ({draftAgents.length})</p>
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-fotus-blue/10 bg-fotus-neutral/28 p-3">
              {draftAgents.map((agent) => (
                <div key={agent} className="flex items-center justify-between rounded-xl border border-fotus-neutral bg-fotus-neutral px-3 py-2.5 shadow-sm">
                  <span className="flex items-center gap-2 text-sm font-semibold text-fotus-ink"><UserRound className="h-4 w-4 text-fotus-blue" />{agent}</span>
                  <button type="button" onClick={() => removeAgent(agent)} className="rounded-lg p-1.5 text-fotus-ink/80 hover:bg-fotus-yellow/7 hover:text-fotus-ink" title={`Remover ${agent}`}><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              {!draftAgents.length && <p className="p-4 text-center text-xs text-fotus-ink/80">Nenhuma agente na lista.</p>}
            </div>
            <p className="text-[11px] leading-relaxed text-fotus-ink/80">Remover uma agente não apaga o histórico: ocorrências antigas continuam com o nome salvo.</p>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-fotus-blue/10 bg-fotus-neutral px-5 py-4 sm:px-6">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold text-fotus-ink hover:bg-fotus-neutral/70">Cancelar</button>
          <button type="button" disabled={saving} onClick={saveAgents} className="flex items-center gap-2 rounded-xl bg-fotus-blue px-5 py-2.5 text-xs font-bold text-fotus-neutral disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Salvando...' : 'Salvar lista'}</button>
        </footer>
      </div>
    </div>
  );
}
