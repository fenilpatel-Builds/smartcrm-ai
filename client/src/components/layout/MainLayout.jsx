import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { AIAssistantDrawer } from '../ui/AIAssistantDrawer';

export const MainLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [assistantDrawerOpen, setAssistantDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Sidebar Navigation */}
      <Sidebar isMobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Navbar
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenAIAssistant={() => setAssistantDrawerOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Global AI Business Assistant Slide-over Drawer */}
      <AIAssistantDrawer
        isOpen={assistantDrawerOpen}
        onClose={() => setAssistantDrawerOpen(false)}
      />
    </div>
  );
};
