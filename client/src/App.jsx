import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useCallback, useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { Areas } from './pages/Areas';
import { Resources } from './pages/Resources';
import { Archives } from './pages/Archives';

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const handleQuickSave = useCallback(() => setRefreshKey(k => k + 1), []);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell onQuickSave={handleQuickSave} />}>
          <Route path="/" element={<Dashboard key={refreshKey} />} />
          <Route path="/projects" element={<Projects key={`p-${refreshKey}`} />} />
          <Route path="/areas" element={<Areas key={`a-${refreshKey}`} />} />
          <Route path="/resources" element={<Resources key={`r-${refreshKey}`} />} />
          <Route path="/archives" element={<Archives key={`ar-${refreshKey}`} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
