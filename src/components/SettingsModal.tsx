import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { X, Plus, Trash2, Database, Check, Save, Edit2, AlertTriangle } from 'lucide-react';
import { generateId } from '../utils/generateId';
import type { Provider, Model } from '../types';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { settings, setSettings } = useAppContext();
  const [activeTab, setActiveTab] = useState<'providers' | 'database'>('providers');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dbData, setDbData] = useState<any>(null);

  // Auto-clear Form States
  const [newProviderName, setNewProviderName] = useState('');
  const [newProviderBaseUrl, setNewProviderBaseUrl] = useState('');
  const [newProviderApiKey, setNewProviderApiKey] = useState('');

  const [newModelName, setNewModelName] = useState('');
  const [newModelProviderId, setNewModelProviderId] = useState('');

  // DB Form States
  const [dbFormApiKey, setDbFormApiKey] = useState('');
  const [dbFormModelName, setDbFormModelName] = useState('');

  // Inline Edit States
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [itemToDelete, setItemToDelete] = useState<{ type: 'provider' | 'model', id: string, name: string } | null>(null);

  const fetchDbData = () => {
    setDbData(null);
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        setDbData(data);
      })
      .catch(err => console.error("Error fetching db data:", err));
  };

  // Fetch DB data when database tab is active
  useEffect(() => {
    if (activeTab === 'database') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchDbData();
    }
  }, [activeTab]);

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
    try {
      if (settings.providers.length === 0 || settings.models.length === 0) {
        alert("Please ensure you have at least one provider and one model added.");
        return;
      }

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        alert("Settings saved successfully to MongoDB!");
      } else {
        alert("Failed to save settings to MongoDB.");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Error saving settings to MongoDB. Is the backend server running?");
    }
  };

  const updateDbData = async () => {
    if (!dbFormApiKey || !dbFormModelName) {
      alert("Please enter both API Key and Model Name to update DB.");
      return;
    }

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          active_api_key: dbFormApiKey,
          model_name: dbFormModelName,
        }),
      });

      if (res.ok) {
        fetchDbData();
        // Clear form after save
        setDbFormApiKey('');
        setDbFormModelName('');
        alert("Database settings updated successfully!");
      } else {
        alert("Failed to update database settings.");
      }
    } catch (error) {
      console.error("Error updating db settings:", error);
      alert("Error updating MongoDB. Is the backend server running?");
    }
  };

  const clearAllData = async () => {
    const confirmed = window.confirm(
      'This will clear all journals and saved settings from MongoDB, plus the local chat cache. Continue?',
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

      window.localStorage.removeItem('Istiyak AI_chats');
      window.localStorage.removeItem('Istiyak AI_settings');
      window.localStorage.removeItem('Istiyak AI_active_chat');

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
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2"
              >
                <Save size={16} /> Save Local to DB
              </button>
              <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex border-b border-slate-800">
            {(['providers', 'database'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab ? 'text-indigo-400 border-b-2 border-indigo-400 bg-slate-800/50' : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                {tab === 'providers' ? 'Providers & Routing' : (
                  <div className="flex items-center justify-center gap-2">
                    <Database size={16} />
                    <span>DB Data</span>
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="p-4 overflow-y-auto flex-1">
            {activeTab === 'providers' && (
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
                              value={provider.apiKey}
                              onChange={e => updateProvider(provider.id, { apiKey: e.target.value })}
                              className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm w-full text-slate-200"
                              placeholder="API Key"
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
                        className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm w-full text-slate-200 text-slate-400"
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
                  <h3 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-2">Auto Routing Configuration</h3>
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
              </div>
            )}

            {activeTab === 'database' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-slate-200">MongoDB Controls</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={fetchDbData}
                      className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1 transition-colors bg-slate-800 px-3 py-1.5 rounded-md border border-slate-700"
                    >
                      <Database size={14} /> Refresh DB Data
                    </button>
                    <button
                      onClick={clearAllData}
                      className="text-red-300 hover:text-red-200 text-sm flex items-center gap-1 transition-colors bg-red-500/10 px-3 py-1.5 rounded-md border border-red-500/30"
                    >
                      <Trash2 size={14} /> Clear All
                    </button>
                  </div>
                </div>

                {/* Form to Update DB */}
                <div className="bg-slate-800/50 rounded-lg border border-indigo-500/30 p-5 space-y-4">
                  <h4 className="text-sm font-semibold text-indigo-300 mb-2">Update Database Settings</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">New Model Name</label>
                      <input
                        type="text"
                        value={dbFormModelName}
                        onChange={(e) => setDbFormModelName(e.target.value)}
                        className="bg-slate-900 border border-slate-600 focus:border-indigo-500 outline-none rounded px-3 py-2 text-slate-200 w-full text-sm"
                        placeholder="e.g. gpt-4-turbo"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">New API Key</label>
                      <input
                        type="text"
                        value={dbFormApiKey}
                        onChange={(e) => setDbFormApiKey(e.target.value)}
                        className="bg-slate-900 border border-slate-600 focus:border-indigo-500 outline-none rounded px-3 py-2 text-slate-200 w-full text-sm"
                        placeholder="e.g. sk-..."
                      />
                    </div>
                  </div>
                  <button 
                    onClick={updateDbData}
                    className="w-full flex items-center justify-center py-2 mt-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors text-sm font-medium gap-2"
                  >
                    <Check size={16} /> Save to Database
                  </button>
                </div>
                
                {/* Display Current DB State */}
                {dbData ? (
                  <div className="bg-slate-800 rounded-lg border border-slate-700 p-5 space-y-4">
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Current Database Data</h4>
                    <div>
                      <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">Active Model</label>
                      <div className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 text-sm">
                        {dbData.model_name || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">Active API Key</label>
                      <div className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 font-mono text-sm break-all">
                        {dbData.active_api_key ? dbData.active_api_key : 'N/A'}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 pt-2 border-t border-slate-700 flex justify-between">
                      <span><span className="font-semibold text-slate-400">Document ID:</span> {dbData._id}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-400 text-sm p-4 text-center bg-slate-800/50 rounded-lg border border-slate-700/50 flex flex-col items-center gap-2">
                    <div className="animate-pulse bg-slate-700 h-8 w-8 rounded-full mb-2"></div>
                    Loading database settings...
                  </div>
                )}
              </div>
            )}
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