import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { SiteLayout } from './components/SiteLayout';
import { Diagnostics } from './app/Diagnostics';
import { Connect } from './pages/Connect';
import { Compare } from './pages/Compare';
import { Home } from './pages/Home';
import { HowItWorks } from './pages/HowItWorks';
import { HowWeMeasure } from './pages/HowWeMeasure';
import { DataDeletion, Privacy, Terms } from './pages/Legal';
import { NotFound } from './pages/NotFound';
import { Trust } from './pages/Trust';

// The app is heavy and needs the browser (localStorage), so it loads on demand and is not prerendered.
const AppRoot = lazy(() => import('./app/AppRoot'));

export { NOT_FOUND_META, PUBLIC_PAGES } from './meta';
export type { PageMeta } from './meta';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/app/diagnostics" element={<Diagnostics />} />
      <Route element={<SiteLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/connect" element={<Connect />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/trust" element={<Trust />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/how-we-measure" element={<HowWeMeasure />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/data-deletion" element={<DataDeletion />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route
        path="/app/*"
        element={
          <Suspense
            fallback={
              <div className="app-boot" role="status">
                Opening your library
              </div>
            }
          >
            <AppRoot />
          </Suspense>
        }
      />
    </Routes>
  );
}
