import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { SettingsModal } from './components/SettingsModal';
import { AdminDashboard } from './components/AdminDashboard';

const AppContent = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#1c1c1e] text-slate-300 overflow-hidden font-mono relative selection:bg-blue-500/30 selection:text-blue-100">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-sm" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      <ChatWindow 
        toggleSidebar={() => setIsSidebarOpen(prev => !prev)} 
        onOpenSettings={() => setIsSettingsOpen(true)} 
      />
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/" element={<AppContent />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </AppProvider>
  );
}

export default App;
