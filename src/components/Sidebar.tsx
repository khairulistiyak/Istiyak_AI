import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { chats, setChats, activeChatId, setActiveChatId, updateChatTitle } = useAppContext();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleNewChat = () => {
    setActiveChatId(null);
    if (window.innerWidth < 768) onClose();
  };

  const handleSelectChat = (id: string) => {
    setActiveChatId(id);
    if (window.innerWidth < 768) onClose();
  };

  const handleDeleteChat = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    const chatToDelete = chats.find(c => c.id === id);
    if (!chatToDelete) return;

    setChats(prev => prev.filter(c => c.id !== id));
    if (activeChatId === id) {
      setActiveChatId(null);
    }

    try {
      await fetch(`/api/chats/metadata/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error("Failed to delete chat metadata:", err);
      setChats(prev => [...prev, chatToDelete].sort((a, b) => b.updatedAt - a.updatedAt));
    }
  };

  const startEditing = (e: React.MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(currentTitle.replace(/\.log$/, ''));
  };

  const saveEdit = async (e: React.MouseEvent | React.FormEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    const newTitle = editTitle.trim();
    if (newTitle) {
      updateChatTitle(id, newTitle);
      setEditingId(null);

      try {
        await fetch(`/api/chats/metadata/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle, updatedAt: Date.now() })
        });
      } catch (err) {
        console.error("Failed to save title edit:", err);
      }
    } else {
      setEditingId(null);
    }
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  // Helper function to format filename as per requirement
  const formatFilename = (title: string) => {
    return title
      .toLowerCase()
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/[^\w-]/g, '') // Remove special characters except word chars and hyphens
      + '.log';
  };

  return (
    <div className={`fixed md:relative z-30 w-full sm:w-[350px] bg-[#1c1c1e] border-r border-white/10 flex flex-col h-full flex-shrink-0 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} font-mono text-slate-300 text-[13px] md:w-[350px] md:block`}>
      <div className="p-4 border-b border-white/5">
        <div className="flex justify-between items-center mb-2">
          <span className="truncate">
            <span className="text-red-500 font-bold hidden sm:inline">root@mainframe_server</span>
            <span className="text-white hidden sm:inline">:</span>
            <span className="text-cyan-400 font-bold">~/session_logs</span>
            <span className="text-white"> # </span>
          </span>
          <button className="md:hidden hover:text-white px-2 py-1 bg-white/5 rounded" onClick={onClose}>
            [x]
          </button>
        </div>
        <button
          onClick={handleNewChat}
          className="w-full text-left hover:text-white hover:bg-white/5 px-1 py-1 rounded transition-colors break-all text-emerald-500/80"
        >
          touch new_session.log
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-1 custom-scrollbar">
        <div className="mb-2 text-slate-400 hidden sm:block">total {chats.length}</div>
        
        {chats.map(chat => {
          // Dynamic variables logic
          const size = Math.max(chat.messages.length * 408, 408);
          const date = new Date(chat.updatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric' });
          const filename = formatFilename(chat.title);

          return (
            <div
              key={chat.id}
              onClick={() => handleSelectChat(chat.id)}
              className={`flex flex-col cursor-pointer group px-2 py-1.5 rounded transition-colors ${
                activeChatId === chat.id ? 'bg-blue-500/10 text-white' : 'hover:bg-white/5 hover:text-white'
              }`}
            >
              {editingId === chat.id ? (
                <form onSubmit={(e) => saveEdit(e, chat.id)} className="flex items-center gap-2 w-full" onClick={e => e.stopPropagation()}>
                  <span className="text-red-500 font-semibold mr-2 hidden sm:inline">#root</span>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1 bg-transparent border-b border-blue-400 text-blue-300 outline-none min-w-0 px-1"
                    autoFocus
                  />
                  <span className="text-slate-500">.log</span>
                  <button type="submit" className="hover:text-emerald-400 px-1">ok</button>
                  <button type="button" onClick={cancelEdit} className="hover:text-red-400 px-1">rm</button>
                </form>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center whitespace-nowrap overflow-hidden gap-1 sm:gap-2">
                    <span className="text-red-400 font-semibold mr-1 hidden sm:inline">#root</span>
                    {/*<span className="text-slate-400 w-10 text-right mr-2 hidden sm:inline">{size}</span>*/}
                    {/*<span className="text-slate-500 mr-2 hidden sm:inline">{date}</span>*/}
                    <span className={`truncate max-w-[150px] sm:57max-w-[160px] ${activeChatId === chat.id ? 'text-blue-300 font-bold' : 'text-green-500/80'}`}>
                      {filename}
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
