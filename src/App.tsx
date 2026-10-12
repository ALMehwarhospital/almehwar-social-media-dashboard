import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { FilterProvider } from "./utils/FilterContext";
import { DecisionLiveProvider } from "./utils/useDecisionLive";
import { Layout } from "./components/layout/Layout";
import Overview from "./pages/Overview";
import ContentIntelligence from "./pages/ContentIntelligence";
import CreativeLab from "./pages/CreativeLab";
import Platforms from "./pages/Platforms";
import WebsiteHub from "./pages/WebsiteHub";
import Comparisons from "./pages/Comparisons";
import Competitors from "./pages/Competitors";
import Recommendations from "./pages/Insights";
import DataHealth from "./pages/DataHealth";
import MonthlyReport from "./pages/MonthlyReport";
import { DashboardSessionGate } from "./components/auth/DashboardAuth";

function App() {
  return (
    <DashboardSessionGate>
      <DecisionLiveProvider>
        <FilterProvider>
          <HashRouter>
          <Layout>
            <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/summary" element={<Navigate to="/monthly-report" replace />} />
            <Route path="/performance" element={<Navigate to="/" replace />} />
            <Route path="/content" element={<ContentIntelligence />} />
            <Route path="/video" element={<Navigate to="/content" replace />} />
            <Route path="/creative" element={<CreativeLab />} />
            <Route path="/platforms" element={<Platforms />} />
            <Route path="/website" element={<WebsiteHub />} />
            <Route path="/comparisons" element={<Comparisons />} />
            <Route path="/competitors" element={<Competitors />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/insights" element={<Navigate to="/recommendations" replace />} />
            <Route path="/action-plan" element={<Navigate to="/recommendations" replace />} />
            <Route path="/data-health" element={<DataHealth />} />
            <Route path="/monthly-report" element={<MonthlyReport />} />
            </Routes>
          </Layout>
          </HashRouter>
        </FilterProvider>
      </DecisionLiveProvider>
    </DashboardSessionGate>
  );
}

export default App;

