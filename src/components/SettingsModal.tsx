import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { X, Plus, Trash2 } from 'lucide-react';
import { generateId } from '../utils/generateId';
import type { Provider, Model } from '../types';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { settings, setSettings } = useAppContext();
  const [activeTab, setActiveTab] = useState<'providers' | 'models' | 'routing'>('providers');

  const addProvider = () => {
    const newProvider: Provider = { id: generateId(), name: 'New Provider', baseUrl: 'https://api.openai.com/v1', apiKey: '' };
    setSettings(s => ({ ...s, providers: [...s.providers, newProvider] }));
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
  };

  const addModel = () => {
    if (settings.providers.length === 0) return alert('Add a provider first.');
    const newModel: Model = { id: generateId(), name: 'gpt-3.5-turbo', providerId: settings.providers[0].id };
    setSettings(s => ({ ...s, models: [...s.models, newModel] }));
  };

  const updateModel = (id: string, updates: Partial<Model>) => {
    setSettings(s => ({ ...s, models: s.models.map(m => m.id === id ? { ...m, ...updates } : m) }));
  };

  const deleteModel = (id: string) => {
    setSettings(s => ({ ...s, models: s.models.filter(m => m.id !== id) }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 className="text-xl font-semibold text-slate-200">Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-slate-800">
          {(['providers', 'models', 'routing'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab ? 'text-indigo-400 border-b-2 border-indigo-400 bg-slate-800/50' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {activeTab === 'providers' && (
            <div className="space-y-4">
              {settings.providers.map(provider => (
                <div key={provider.id} className="p-4 bg-slate-800 rounded-lg border border-slate-700 relative group">
                  <button onClick={() => deleteProvider(provider.id)} className="absolute top-4 right-4 text-slate-500 hover:text-red-400">
                    <Trash2 size={16} />
                  </button>
                  <div className="grid gap-3 mr-6">
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
              ))}
              <button onClick={addProvider} className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium">
                <Plus size={16} /> Add Provider
              </button>
            </div>
          )}

          {activeTab === 'models' && (
            <div className="space-y-4">
              {settings.models.map(model => (
                <div key={model.id} className="p-4 bg-slate-800 rounded-lg border border-slate-700 flex gap-4 items-center">
                  <div className="flex-1 space-y-3">
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
                  <button onClick={() => deleteModel(model.id)} className="text-slate-500 hover:text-red-400 p-2">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button onClick={addModel} className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium">
                <Plus size={16} /> Add Model
              </button>
            </div>
          )}

          {activeTab === 'routing' && (
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
          )}
        </div>
      </div>
    </div>
  );
};
