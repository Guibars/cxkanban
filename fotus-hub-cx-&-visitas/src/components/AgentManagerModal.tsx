import { FormEvent, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { Plus, Save, Trash2, UserRound, X } from 'lucide-react';
import { db, doc, setDoc } from '../lib/firebase';

interface AgentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: string[];
  currentUser: User;
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
      await setDoc(doc(db, 'app_settings', 'occurrence_agents'), {
        names: draftAgents,
        updatedAt: Date.now(),
        updatedByEmail: currentUser.email || '',
        updatedByName: currentUser.displayName || currentUser.email || '',
      }, { merge: true });
      onClose();
    } catch (error) {
      console.error('Erro ao salvar agentes:', error);
      setErrorMessage('Não foi possível salvar a lista. Publique as regras atualizadas do Firestore.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-3 backdrop-blur-sm sm:p-6">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-white bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-[#eef5eb] via-white to-white px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e8efe0] text-[#385041]"><UserRound className="h-5 w-5" /></span>
            <div><h2 className="text-base font-extrabold text-gray-950">Editar agentes</h2><p className="text-xs text-gray-500">Essa lista aparece no cadastro de ocorrências.</p></div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X className="h-5 w-5" /></button>
        </header>

        <div className="space-y-5 p-5 sm:p-6">
          <form onSubmit={addAgent} className="flex gap-2">
            <input autoFocus value={newAgent} onChange={(event) => setNewAgent(event.target.value)} placeholder="Nome da nova agente" className="field-input" />
            <button type="submit" className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#385041] px-3.5 py-2.5 text-xs font-bold text-white hover:bg-[#2c4033]"><Plus className="h-4 w-4" />Adicionar</button>
          </form>

          {errorMessage && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">{errorMessage}</p>}

          <div className="space-y-2">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Agentes disponíveis ({draftAgents.length})</p>
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50/70 p-3">
              {draftAgents.map((agent) => (
                <div key={agent} className="flex items-center justify-between rounded-xl border border-white bg-white px-3 py-2.5 shadow-sm">
                  <span className="flex items-center gap-2 text-sm font-semibold text-gray-700"><UserRound className="h-4 w-4 text-[#385041]" />{agent}</span>
                  <button type="button" onClick={() => removeAgent(agent)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title={`Remover ${agent}`}><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              {!draftAgents.length && <p className="p-4 text-center text-xs text-gray-500">Nenhuma agente na lista.</p>}
            </div>
            <p className="text-[11px] leading-relaxed text-gray-500">Remover uma agente não apaga o histórico: ocorrências antigas continuam com o nome salvo.</p>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-gray-100 bg-white px-5 py-4 sm:px-6">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100">Cancelar</button>
          <button type="button" disabled={saving} onClick={saveAgents} className="flex items-center gap-2 rounded-xl bg-[#385041] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Salvando...' : 'Salvar lista'}</button>
        </footer>
      </div>
    </div>
  );
}
