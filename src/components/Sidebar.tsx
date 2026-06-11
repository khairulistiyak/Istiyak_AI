import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Plus, MessageSquare, Settings as SettingsIcon, Trash2, Edit2, Check, X } from 'lucide-react';
import { generateId } from '../utils/generateId';

interface SidebarProps {
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSettings }) => {
  const { chats, setChats, activeChatId, setActiveChatId } = useAppContext();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleNewChat = () => {
    const newChat = {
      id: generateId(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
  };

  const handleDeleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setChats(prev => prev.filter(c => c.id !== id));
    if (activeChatId === id) {
      setActiveChatId(null);
    }
  };

  const startEditing = (e: React.MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const saveEdit = (e: React.MouseEvent | React.FormEvent, id: string) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      setChats(prev => prev.map(c => c.id === id ? { ...c, title: editTitle.trim() } : c));
    }
    setEditingId(null);
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full h-screen">
      <div className="p-4">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md transition-colors"
        >
          <Plus size={18} />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {chats.map(chat => (
          <div
            key={chat.id}
            onClick={() => setActiveChatId(chat.id)}
            className={`flex items-center justify-between p-2 rounded-md cursor-pointer group transition-colors ${
              activeChatId === chat.id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            {editingId === chat.id ? (
              <form onSubmit={(e) => saveEdit(e, chat.id)} className="flex items-center gap-2 w-full" onClick={e => e.stopPropagation()}>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-sm text-slate-200 outline-none focus:border-indigo-500 min-w-0"
                  autoFocus
                />
                <button type="submit" className="text-green-400 hover:text-green-300"><Check size={16} /></button>
                <button type="button" onClick={cancelEdit} className="text-slate-500 hover:text-red-400"><X size={16} /></button>
              </form>
            ) : (
              <>
                <div className="flex items-center gap-2 overflow-hidden">
                  <MessageSquare size={16} className="shrink-0" />
                  <span className="truncate text-sm">{chat.title}</span>
                </div>
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                  <button
                    onClick={(e) => startEditing(e, chat.id, chat.title)}
                    className="text-slate-500 hover:text-indigo-400 p-0.5"
                    title="Rename chat"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                    className="text-slate-500 hover:text-red-400 p-0.5"
                    title="Delete chat"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2 text-slate-400 hover:text-white transition-colors p-2"
        >
          <SettingsIcon size={18} />
          Settings
        </button>
      </div>
    </div>
  );
};
