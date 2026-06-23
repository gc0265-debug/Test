import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useCallback, useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { Dashboard } from './pages/Dashboard';
import { Cantieri } from './pages/Cantieri';
import { Lavorazioni } from './pages/Lavorazioni';
import { Giornale } from './pages/Giornale';
import { Maestranze } from './pages/Maestranze';
import { Documenti } from './pages/Documenti';
import { Archives } from './pages/Archives';

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const handleQuickSave = useCallback(() => setRefreshKey(k => k + 1), []);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell onQuickSave={handleQuickSave} />}>
          <Route path="/" element={<Dashboard key={refreshKey} />} />
          <Route path="/cantieri" element={<Cantieri key={`c-${refreshKey}`} />} />
          <Route path="/lavorazioni" element={<Lavorazioni key={`l-${refreshKey}`} />} />
          <Route path="/giornale" element={<Giornale key={`g-${refreshKey}`} />} />
          <Route path="/maestranze" element={<Maestranze key={`m-${refreshKey}`} />} />
          <Route path="/documenti" element={<Documenti key={`d-${refreshKey}`} />} />
          <Route path="/archivio" element={<Archives key={`ar-${refreshKey}`} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
