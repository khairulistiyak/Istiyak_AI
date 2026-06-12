import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { generateId } from '../utils/generateId';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { chats, setChats, activeChatId, setActiveChatId } = useAppContext();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleNewChat = () => {
    const newChat = {
      id: generateId(),
      title: 'new_session.log',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    if (window.innerWidth < 768) onClose();
  };

  const handleSelectChat = (id: string) => {
    setActiveChatId(id);
    if (window.innerWidth < 768) onClose();
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
    <div className={`fixed md:relative z-30 w-full sm:w-[350px] bg-[#1c1c1e] border-r border-white/10 flex flex-col h-full flex-shrink-0 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} font-mono text-slate-300 text-[13px] md:w-[350px] md:block`}>
      <div className="p-4 border-b border-white/5">
        <div className="flex justify-between items-center mb-2">
          <span className="truncate">
            <span className="text-emerald-400 font-bold hidden sm:inline">khairulistiyak@MacBook-Pro</span>
            <span className="text-white hidden sm:inline">:</span>
            <span className="text-blue-400 font-bold">~/sessions</span>
            <span className="text-white"> % </span>
          </span>
          <button className="md:hidden hover:text-white px-2 py-1 bg-white/5 rounded" onClick={onClose}>
            [x]
          </button>
        </div>
        <button
          onClick={handleNewChat}
          className="w-full text-left hover:text-white hover:bg-white/5 px-1 py-1 rounded transition-colors break-all"
        >
          touch new_session.log
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-1 custom-scrollbar">
        <div className="mb-2 text-slate-400 truncate hidden sm:block">
          <span className="text-emerald-400 font-bold">khairulistiyak@MacBook-Pro</span>
          <span className="text-white">:</span>
          <span className="text-blue-400 font-bold">~/sessions</span>
          <span className="text-white"> % </span>
          ls -la
        </div>
        <div className="mb-2 text-slate-400 hidden sm:block">total {chats.length * 8}</div>
        
        {chats.map(chat => {
          const d = new Date(chat.updatedAt);
          const month = d.toLocaleString('en-US', { month: 'short' });
          const date = d.getDate().toString().padStart(2, ' ');
          const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

          return (
            <div
              key={chat.id}
              onClick={() => handleSelectChat(chat.id)}
              className={`flex flex-col cursor-pointer group px-2 py-1.5 rounded transition-colors ${
                activeChatId === chat.id ? 'bg-blue-500/20 text-white' : 'hover:bg-white/5 hover:text-white'
              }`}
            >
              {editingId === chat.id ? (
                <form onSubmit={(e) => saveEdit(e, chat.id)} className="flex items-center gap-2 w-full" onClick={e => e.stopPropagation()}>
                  <span className="text-slate-500 hidden sm:inline">-rw-r--r--</span>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1 bg-transparent border-b border-blue-400 text-blue-300 outline-none min-w-0 px-1"
                    autoFocus
                  />
                  <button type="submit" className="hover:text-emerald-400 px-1">ok</button>
                  <button type="button" onClick={cancelEdit} className="hover:text-red-400 px-1">rm</button>
                </form>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center whitespace-nowrap overflow-hidden gap-1 sm:gap-2">
                    <span className="text-slate-500 hidden sm:inline">-rw-r--r--</span>
                    <span className="text-emerald-400 hidden md:inline">khairul</span>
                    <span className="text-slate-500 hidden md:inline">staff</span>
                    <span className="text-slate-400 hidden sm:inline">{String(chat.messages.length * 102).padStart(4, ' ')}</span>
                    <span className="text-slate-400 text-xs sm:text-sm">{month} {date} {timeStr}</span>
                    <span className={`truncate max-w-[120px] sm:max-w-[200px] ${activeChatId === chat.id ? 'text-blue-300 font-bold' : ''}`}>
                      {chat.title}
                    </span>
                  </div>
                  <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex items-center gap-2 ml-2 pl-2 bg-transparent sm:bg-[#1c1c1e]/80 shrink-0">
                    <button
                      onClick={(e) => startEditing(e, chat.id, chat.title)}
                      className="hover:text-yellow-400 text-slate-400 p-1"
                      title="Rename"
                    >
                      mv
                    </button>
                    <button
                      onClick={(e) => handleDeleteChat(e, chat.id)}
                      className="hover:text-red-500 text-slate-400 p-1"
                      title="Delete"
                    >
                      rm
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
