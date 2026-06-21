import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { QuickCapture } from '../common/QuickCapture';

export function AppShell({ onQuickSave }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
      <QuickCapture onSaved={onQuickSave} />
    </div>
  );
}
