import { HashRouter, Routes, Route } from "react-router-dom";
import { FilterProvider } from "./utils/FilterContext";
import { Layout } from "./components/layout/Layout";
import Overview from "./pages/Overview";
import Performance from "./pages/Performance";
import ContentIntelligence from "./pages/ContentIntelligence";
import VideoAnalysis from "./pages/VideoAnalysis";
import CreativeLab from "./pages/CreativeLab";
import Platforms from "./pages/Platforms";
import Comparisons from "./pages/Comparisons";
import Insights from "./pages/Insights";
import ActionPlan from "./pages/ActionPlan";

function App() {
  return (
    <FilterProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/content" element={<ContentIntelligence />} />
            <Route path="/video" element={<VideoAnalysis />} />
            <Route path="/creative" element={<CreativeLab />} />
            <Route path="/platforms" element={<Platforms />} />
            <Route path="/comparisons" element={<Comparisons />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/action-plan" element={<ActionPlan />} />
          </Routes>
        </Layout>
      </HashRouter>
    </FilterProvider>
  );
}

export default App;
