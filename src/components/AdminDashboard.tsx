import { useState, useEffect } from 'react';
import SimpleMDE from 'react-simplemde-editor';
import 'easymde/dist/easymde.min.css';
import { Home, PlusCircle, Check, Settings, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Journal } from '../types';

const CATEGORIES = ["Technology", "Hardware", "Personal", "Brand", "Development", "Thoughts"];

export const AdminDashboard = () => {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchJournals = async () => {
    try {
      const res = await fetch('/api/journals');
      if (res.ok) {
        const data = await res.json();
        setJournals(data);
      }
    } catch (error) {
      console.error('Failed to fetch journals', error);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchJournals();
  }, []);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handlePost = async () => {
    if (!content.trim()) return;
    setIsSubmitting(true);
    
    try {
      const res = await fetch('/api/journals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content,
          tags: selectedTags,
          isActive: true
        })
      });

      if (res.ok) {
        setContent('');
        setSelectedTags([]);
        fetchJournals();
      }
    } catch (error) {
      console.error('Failed to create journal', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/journals/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (res.ok) {
        setJournals(prev => prev.map(j => j._id === id ? { ...j, isActive: !currentStatus } : j));
      }
    } catch (error) {
      console.error('Failed to toggle status', error);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Sidebar */}
      <div className="w-64 border-r border-slate-800/60 bg-slate-900/50 backdrop-blur-xl flex flex-col relative z-10 transition-all duration-300">
        <div className="p-6 border-b border-slate-800/60">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Admin Panel
          </h1>
          <p className="text-xs text-slate-500 mt-1">Creator Dashboard</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors">
            <Home size={18} />
            <span className="text-sm font-medium">Back to App</span>
          </Link>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 transition-colors border border-blue-500/20">
            <PlusCircle size={18} />
            <span className="text-sm font-medium">New Journal</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors">
            <Settings size={18} />
            <span className="text-sm font-medium">Settings</span>
          </button>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
        {/* Decorative background blurs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto p-8 relative z-10">
          
          {/* Editor Section */}
          <div className="mb-12 bg-slate-900/40 border border-slate-800/60 rounded-2xl backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-300">
            <div className="p-6 border-b border-slate-800/60 bg-slate-800/20">
              <h2 className="text-lg font-medium text-slate-200">Create New Entry</h2>
              <p className="text-sm text-slate-500 mt-1">Write your knowledge, thoughts, or code snippets.</p>
            </div>
            
            <div className="p-6">
              <div className="prose-editor-container [&_.CodeMirror]:border-slate-700/50 [&_.CodeMirror]:bg-slate-950/50 [&_.CodeMirror]:text-slate-300 [&_.editor-toolbar]:border-slate-700/50 [&_.editor-toolbar]:bg-slate-900/50 [&_.editor-toolbar_button]:text-slate-400 hover:[&_.editor-toolbar_button]:text-slate-200 [&_.editor-toolbar_button.active]:bg-slate-800">
                <SimpleMDE 
                  value={content} 
                  onChange={setContent} 
                  options={{
                    spellChecker: false,
                    placeholder: "Start writing your journal...",
                    status: false,
                    autofocus: true,
                  }}
                />
              </div>

              {/* Tag Selector */}
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3 text-sm font-medium text-slate-400">
                  <Tag size={16} />
                  <span>Categories & Tags</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(tag => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                          isSelected 
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                            : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-700/50'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button 
                  onClick={handlePost}
                  disabled={isSubmitting || !content.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Posting...' : 'Publish Entry'}
                  <Check size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Feed Section */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-200">Knowledge Feed</h2>
              <div className="text-sm text-slate-500">
                {journals.length} {journals.length === 1 ? 'entry' : 'entries'}
              </div>
            </div>

            <div className="space-y-4">
              {journals.map(journal => (
                <div 
                  key={journal._id} 
                  className={`p-6 rounded-2xl border backdrop-blur-md transition-all duration-300 ${
                    journal.isActive 
                      ? 'bg-slate-900/40 border-slate-800/60 shadow-lg' 
                      : 'bg-slate-900/20 border-slate-800/30 opacity-70'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-2 flex-wrap">
                      {journal.tags?.map(tag => (
                        <span key={tag} className="px-2.5 py-1 text-[10px] uppercase tracking-wider font-semibold bg-slate-800/80 text-slate-300 rounded-md border border-slate-700/50">
                          {tag}
                        </span>
                      ))}
                    </div>
                    
                    {/* Toggle Switch */}
                    <button 
                      onClick={() => toggleActive(journal._id, journal.isActive)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                        journal.isActive ? 'bg-blue-500' : 'bg-slate-700'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                        journal.isActive ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  
                  <div className="prose prose-invert max-w-none text-slate-300 prose-pre:bg-slate-950/50 prose-pre:border prose-pre:border-slate-800/50 text-sm line-clamp-3">
                    {journal.content.substring(0, 300)}...
                  </div>
                  
                  <div className="mt-4 text-xs text-slate-500 flex items-center justify-between">
                    <span>{new Date(journal.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}</span>
                    <span className={`font-medium ${journal.isActive ? 'text-green-400/80' : 'text-slate-500'}`}>
                      {journal.isActive ? 'Active (RAG Ready)' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}

              {journals.length === 0 && (
                <div className="text-center py-12 text-slate-500 bg-slate-900/20 border border-slate-800/40 rounded-2xl border-dashed">
                  No journal entries found. Start writing above!
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};
