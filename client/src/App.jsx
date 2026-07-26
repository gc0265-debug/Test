import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useCallback, useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { Dashboard } from './pages/Dashboard';
import { ChiusuraGiornata } from './pages/ChiusuraGiornata';
import { Cantieri } from './pages/Cantieri';
import { WP } from './pages/WP';
import { Lavorazioni } from './pages/Lavorazioni';
import { Giornale } from './pages/Giornale';
import { GiornaleDettaglio } from './pages/GiornaleDettaglio';
import { KPI } from './pages/KPI';
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
          <Route path="/chiusura" element={<ChiusuraGiornata key={`ch-${refreshKey}`} />} />
          <Route path="/cantieri" element={<Cantieri key={`c-${refreshKey}`} />} />
          <Route path="/wp" element={<WP key={`w-${refreshKey}`} />} />
          <Route path="/lavorazioni" element={<Lavorazioni key={`l-${refreshKey}`} />} />
          <Route path="/giornale" element={<Giornale key={`g-${refreshKey}`} />} />
          <Route path="/giornale/:id" element={<GiornaleDettaglio />} />
          <Route path="/kpi" element={<KPI key={`k-${refreshKey}`} />} />
          <Route path="/maestranze" element={<Maestranze key={`m-${refreshKey}`} />} />
          <Route path="/documenti" element={<Documenti key={`d-${refreshKey}`} />} />
          <Route path="/archivio" element={<Archives key={`ar-${refreshKey}`} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
