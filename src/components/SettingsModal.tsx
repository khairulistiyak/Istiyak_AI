import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { X, Plus, Trash2, Save, Edit2, AlertTriangle } from 'lucide-react';
import { generateId } from '../utils/generateId';
import type { Provider, Model } from '../types';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { settings, setSettings, fetchSettings } = useAppContext();

  // Auto-clear Form States
  const [newProviderName, setNewProviderName] = useState('');
  const [newProviderBaseUrl, setNewProviderBaseUrl] = useState('');
  const [newProviderApiKey, setNewProviderApiKey] = useState('');

  const [newModelName, setNewModelName] = useState('');
  const [newModelProviderId, setNewModelProviderId] = useState('');

  // Inline Edit States
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [itemToDelete, setItemToDelete] = useState<{ type: 'provider' | 'model', id: string, name: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const addProvider = () => {
    if (!newProviderName || !newProviderBaseUrl || !newProviderApiKey) {
      alert("Please fill all provider fields.");
      return;
    }
    const newProvider: Provider = { 
      id: generateId(), 
      name: newProviderName, 
      baseUrl: newProviderBaseUrl, 
      apiKey: newProviderApiKey 
    };
    setSettings(s => ({ ...s, providers: [...s.providers, newProvider] }));
    
    // Auto-clear fields
    setNewProviderName('');
    setNewProviderBaseUrl('');
    setNewProviderApiKey('');
  };

  const updateProvider = (id: string, updates: Partial<Provider>) => {
    setSettings(s => ({ ...s, providers: s.providers.map(p => p.id === id ? { ...p, ...updates } : p) }));
  };

  const deleteProvider = (id: string) => {
    setSettings(s => ({ 
      ...s, 
      providers: s.providers.filter(p => p.id !== id),
      models: s.models.filter(m => m.providerId !== id)
    }));
    if (editingProviderId === id) setEditingProviderId(null);
  };

  const addModel = () => {
    if (!newModelName || !newModelProviderId) {
      alert("Please fill model name and select a provider.");
      return;
    }
    const newModel: Model = { 
      id: generateId(), 
      name: newModelName, 
      providerId: newModelProviderId 
    };
    setSettings(s => ({ ...s, models: [...s.models, newModel] }));

    // Auto-clear fields
    setNewModelName('');
    setNewModelProviderId('');
  };

  const updateModel = (id: string, updates: Partial<Model>) => {
    setSettings(s => ({ ...s, models: s.models.map(m => m.id === id ? { ...m, ...updates } : m) }));
  };

  const deleteModel = (id: string) => {
    setSettings(s => ({ ...s, models: s.models.filter(m => m.id !== id) }));
    if (editingModelId === id) setEditingModelId(null);
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'provider') {
      deleteProvider(itemToDelete.id);
    } else {
      deleteModel(itemToDelete.id);
    }
    setItemToDelete(null);
  };

  const saveSettingsToDB = async () => {
    if (settings.providers.length === 0 || settings.models.length === 0) {
      alert("Please ensure you have at least one provider and one model added.");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        alert("Settings saved successfully!");
        // Refetch settings from server to get redacted keys and ensure consistency
        await fetchSettings();
        onClose();
      } else {
        const errorData = await res.json();
        alert(`Failed to save settings: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Error saving settings. Is the backend server running?");
    } finally {
      setIsSaving(false);
    }
  };

  const clearAllData = async () => {
    const confirmed = window.confirm(
      'This will clear all journals and saved settings from the database, plus the local chat cache. Continue?',
    );

    if (!confirmed) return;

    try {
      const [journalsRes, settingsRes] = await Promise.all([
        fetch('/api/journals', { method: 'DELETE' }),
        fetch('/api/settings', { method: 'DELETE' }),
      ]);

      if (!journalsRes.ok || !settingsRes.ok) {
        throw new Error('Failed to clear one or more database collections.');
      }

      // Clear local state as well
      localStorage.removeItem('Istiyak AI_chats');
      localStorage.removeItem('Istiyak AI_settings');
      localStorage.removeItem('Istiyak AI_active_chat');

      alert('Database and local cache cleared successfully. The app will reload now.');
      window.location.reload();
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Failed to clear data. Check that the backend server is running.');
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
          <div className="flex items-center justify-between p-4 border-b border-slate-800">
            <h2 className="text-xl font-semibold text-slate-200">Settings</h2>
            <div className="flex gap-4 items-center">
              <button 
                onClick={saveSettingsToDB}
                disabled={isSaving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2 disabled:bg-indigo-800 disabled:cursor-not-allowed"
              >
                <Save size={16} /> {isSaving ? 'Saving...' : 'Save & Close'}
              </button>
              <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            <div className="space-y-8">
              {/* Providers Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-2">Providers</h3>
                {settings.providers.map(provider => (
                  <div key={provider.id} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                    {editingProviderId === provider.id ? (
                      <div className="p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-sm font-medium text-slate-300">Edit Provider</h4>
                          <button onClick={() => setEditingProviderId(null)} className="text-slate-400 hover:text-slate-200">
                            <X size={16} />
                          </button>
                        </div>
                        <div className="grid gap-3">
                          <input
                            type="text"
                            value={provider.name}
                            onChange={e => updateProvider(provider.id, { name: e.target.value })}
                            className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm w-full text-slate-200"
                            placeholder="Provider Name (e.g. OpenRouter)"
                          />
                          <input
                            type="text"
                            value={provider.baseUrl}
                            onChange={e => updateProvider(provider.id, { baseUrl: e.target.value })}
                            className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm w-full text-slate-200"
                            placeholder="Base URL"
                          />
                          <input
                            type="password"
                            onChange={e => updateProvider(provider.id, { apiKey: e.target.value })}
                            className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm w-full text-slate-200"
                            placeholder="Enter new API Key to update"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 flex items-center justify-between group">
                        <div>
                          <div className="text-sm font-medium text-slate-200">{provider.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{provider.baseUrl}</div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditingProviderId(provider.id)} className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 rounded">
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => setItemToDelete({ type: 'provider', id: provider.id, name: provider.name })} 
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add Provider Form */}
                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 border-dashed">
                  <div className="grid gap-3 mb-3">
                    <input
                      type="text"
                      value={newProviderName}
                      onChange={e => setNewProviderName(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm w-full text-slate-200"
                      placeholder="New Provider Name"
                    />
                    <input
                      type="text"
                      value={newProviderBaseUrl}
                      onChange={e => setNewProviderBaseUrl(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm w-full text-slate-200"
                      placeholder="New Base URL"
                    />
                    <input
                      type="password"
                      value={newProviderApiKey}
                      onChange={e => setNewProviderApiKey(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm w-full text-slate-200"
                      placeholder="New API Key"
                    />
                  </div>
                  <button onClick={addProvider} className="flex items-center justify-center w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors text-indigo-300 text-sm font-medium">
                    <Plus size={16} className="mr-2" /> Add Provider
                  </button>
                </div>
              </div>

              {/* Models Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-2">Models</h3>
                {settings.models.map(model => (
                  <div key={model.id} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                    {editingModelId === model.id ? (
                      <div className="p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-sm font-medium text-slate-300">Edit Model</h4>
                          <button onClick={() => setEditingModelId(null)} className="text-slate-400 hover:text-slate-200">
                            <X size={16} />
                          </button>
                        </div>
                        <div className="grid gap-3">
                          <input
                            type="text"
                            value={model.name}
                            onChange={e => updateModel(model.id, { name: e.target.value })}
                            className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm w-full text-slate-200"
                            placeholder="Model API Name (e.g. anthropic/claude-3-sonnet)"
                          />
                          <select
                            value={model.providerId}
                            onChange={e => updateModel(model.id, { providerId: e.target.value })}
                            className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm w-full text-slate-200"
                          >
                            {settings.providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 flex items-center justify-between group">
                        <div>
                          <div className="text-sm font-medium text-slate-200">{model.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">Provider: {settings.providers.find(p => p.id === model.providerId)?.name || 'Unknown'}</div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditingModelId(model.id)} className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 rounded">
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => setItemToDelete({ type: 'model', id: model.id, name: model.name })} 
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add Model Form */}
                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 border-dashed">
                  <div className="flex-1 space-y-3 mb-3">
                    <input
                      type="text"
                      value={newModelName}
                      onChange={e => setNewModelName(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm w-full text-slate-200"
                      placeholder="New Model API Name"
                    />
                    <select
                      value={newModelProviderId}
                      onChange={e => setNewModelProviderId(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm w-full text-slate-400"
                    >
                      <option value="" disabled>Select a Provider</option>
                      {settings.providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <button onClick={addModel} className="flex items-center justify-center w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors text-indigo-300 text-sm font-medium">
                    <Plus size={16} className="mr-2" /> Add Model
                  </button>
                </div>
              </div>

              {/* Auto Routing Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-2">Auto Routing & Prompts</h3>
                <div className="space-y-6 text-sm text-slate-300">
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Global System Prompt</label>
                    <textarea
                      value={settings.globalSystemPrompt}
                      onChange={e => setSettings(s => ({ ...s, globalSystemPrompt: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 h-24 resize-none"
                      placeholder="You are a helpful AI assistant..."
                    />
                  </div>

                  <div className="flex items-center justify-between bg-slate-800 p-4 rounded-lg border border-slate-700">
                    <span>Enable Auto-Routing</span>
                    <input
                      type="checkbox"
                      checked={settings.autoRouteEnabled}
                      onChange={e => setSettings(s => ({ ...s, autoRouteEnabled: e.target.checked }))}
                      className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-500"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Coding & Tech Model</label>
                      <select
                        value={settings.routingRules.codingModelId || ''}
                        onChange={e => setSettings(s => ({ ...s, routingRules: { ...s.routingRules, codingModelId: e.target.value || null } }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200"
                      >
                        <option value="">-- Default --</option>
                        {settings.models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Creative & Branding Model</label>
                      <select
                        value={settings.routingRules.creativeModelId || ''}
                        onChange={e => setSettings(s => ({ ...s, routingRules: { ...s.routingRules, creativeModelId: e.target.value || null } }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200"
                      >
                        <option value="">-- Default --</option>
                        {settings.models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Fast / General Chat Model</label>
                      <select
                        value={settings.routingRules.fastModelId || ''}
                        onChange={e => setSettings(s => ({ ...s, routingRules: { ...s.routingRules, fastModelId: e.target.value || null } }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200"
                      >
                        <option value="">-- Default --</option>
                        {settings.models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Danger Zone */}
              <div className="space-y-4 pt-4 border-t border-red-500/20">
                  <h3 className="text-sm font-semibold text-red-400">Danger Zone</h3>
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 flex items-center justify-between">
                      <div>
                          <h4 className="font-semibold text-slate-200">Clear All Data</h4>
                          <p className="text-xs text-slate-400 mt-1">Permanently delete all journals and settings from the database and local cache.</p>
                      </div>
                      <button
                        onClick={clearAllData}
                        className="text-red-300 hover:text-red-200 text-sm flex items-center gap-2 transition-colors bg-red-500/20 px-3 py-2 rounded-md border border-red-500/40 hover:bg-red-500/30"
                      >
                        <Trash2 size={14} /> Clear All Data
                      </button>
                  </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <AlertTriangle className="text-red-500" size={24} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Delete {itemToDelete.type === 'provider' ? 'Provider' : 'Model'}?
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Are you sure you want to delete <span className="font-semibold text-white">"{itemToDelete.name}"</span>? 
                {itemToDelete.type === 'provider' && " This will also delete all associated models."}
                <br /><br />
                This action cannot be undone.
              </p>
            </div>
            <div className="p-4 bg-slate-800/50 border-t border-slate-700 flex justify-end gap-3">
              <button 
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 rounded-md text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center gap-2 shadow-sm shadow-red-500/20"
              >
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
