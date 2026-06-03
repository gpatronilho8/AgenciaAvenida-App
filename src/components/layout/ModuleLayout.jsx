import { Outlet } from 'react-router-dom';
import ModuleSidebar from './ModuleSidebar.jsx';
import CondominioTopBar from './CondominioTopBar';

export default function ModuleLayout({ module }) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <ModuleSidebar module={module} />
      <main className="flex-1 overflow-y-auto flex flex-col">
        <CondominioTopBar module={module} />
        <div className="flex-1 p-6 lg:p-8 max-w-screen-2xl mx-auto w-full animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}