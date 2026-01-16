import DocsPage from "../DocsPage";
import { useOutletContext, Link } from "react-router-dom";

export function ArbitrageDoc() {
  const { isDark } = useOutletContext<{ isDark: boolean }>();

  return (
    <DocsPage
      title="AI Arbitrage Scanner"
      description="Discover mispriced correlated markets using AI-powered analysis."
      breadcrumb="ManiFed Fintech"
      tableOfContents={[
        { id: "overview", label: "Overview" },
        { id: "how-it-works", label: "How It Works" },
        { id: "using-scanner", label: "Using the Scanner" },
        { id: "executing-trades", label: "Executing Trades" },
        { id: "watchlist", label: "Watchlist" },
      ]}
    >
      <section id="overview" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Overview
        </h2>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          The AI Arbitrage Scanner identifies opportunities where related markets have inconsistent 
          probabilities. By analyzing thousands of markets, it finds pairs where you can potentially 
          profit from mispricings.
        </p>
        <div className={`p-4 rounded-lg border ${isDark ? "bg-emerald-900/20 border-emerald-800" : "bg-emerald-50 border-emerald-200"}`}>
          <p className={`text-sm ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
            <strong>Example:</strong> If "Will X happen by December?" is at 80% and "Will X happen by June?" 
            is at 85%, this is inconsistent—June comes before December, so the December market should be 
            equal to or higher than the June market.
          </p>
        </div>
      </section>

      <section id="how-it-works" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          How It Works
        </h2>
        <ol className={`list-decimal list-inside space-y-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          <li><strong>Scanning:</strong> The system fetches active markets from Manifold</li>
          <li><strong>Matching:</strong> AI identifies markets that are logically related</li>
          <li><strong>Analysis:</strong> Each pair is analyzed for probability inconsistencies</li>
          <li><strong>Scoring:</strong> Opportunities are ranked by expected profit and confidence</li>
        </ol>
        <p className={`mt-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          The AI uses advanced language models to understand market semantics and identify relationships 
          that simple keyword matching would miss.
        </p>
      </section>

      <section id="using-scanner" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Using the Scanner
        </h2>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          To run an arbitrage scan:
        </p>
        <ol className={`list-decimal list-inside space-y-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          <li>Navigate to the <Link to="/mispriced-scanner" className="text-blue-500 hover:underline">Arbitrage Scanner</Link></li>
          <li>Configure scan parameters (optional)</li>
          <li>Click "Start Scan"</li>
          <li>Review results sorted by confidence and expected profit</li>
        </ol>
        <div className={`mt-4 p-4 rounded-lg border ${isDark ? "bg-yellow-900/20 border-yellow-800" : "bg-yellow-50 border-yellow-200"}`}>
          <p className={`text-sm ${isDark ? "text-yellow-400" : "text-yellow-700"}`}>
            <strong>Note:</strong> Scans use API credits. Free tier includes limited scans per day; 
            Private Client subscribers have higher limits.
          </p>
        </div>
      </section>

      <section id="executing-trades" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Executing Trades
        </h2>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          For each opportunity, you'll see recommended positions in both markets. Typically this involves:
        </p>
        <ul className={`list-disc list-inside space-y-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          <li>Buying YES in the underpriced market</li>
          <li>Buying NO in the overpriced market</li>
          <li>Or vice versa, depending on the relationship</li>
        </ul>
        <p className={`mt-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          Click on market links to open them in the Trading Terminal for fast execution.
        </p>
      </section>

      <section id="watchlist" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Watchlist
        </h2>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          Add promising opportunities to your watchlist to track them over time. The watchlist shows:
        </p>
        <ul className={`list-disc list-inside space-y-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          <li>Current probabilities for watched market pairs</li>
          <li>Changes since you added them</li>
          <li>Alerts when spreads reach your threshold</li>
        </ul>
      </section>
    </DocsPage>
  );
}

export function ArbitrageGuideDoc() {
  const { isDark } = useOutletContext<{ isDark: boolean }>();

  return (
    <DocsPage
      title="Finding Arbitrage"
      description="Strategies for identifying and exploiting market inefficiencies."
      breadcrumb="Strategy"
      tableOfContents={[
        { id: "types", label: "Types of Arbitrage" },
        { id: "manual", label: "Manual Discovery" },
        { id: "execution", label: "Execution Tips" },
        { id: "risks", label: "Risks" },
      ]}
    >
      <section id="types" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Types of Arbitrage
        </h2>
        <div className="space-y-4">
          <div className={`p-4 rounded-lg border ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-gray-50 border-gray-200"}`}>
            <h3 className={`font-medium mb-2 ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>Temporal Arbitrage</h3>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Markets about the same event with different timeframes. "By June" should never exceed "By December" for the same event.
            </p>
          </div>
          <div className={`p-4 rounded-lg border ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-gray-50 border-gray-200"}`}>
            <h3 className={`font-medium mb-2 ${isDark ? "text-blue-400" : "text-blue-600"}`}>Logical Arbitrage</h3>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Markets with logical dependencies. If A implies B, then P(A) should never exceed P(B).
            </p>
          </div>
          <div className={`p-4 rounded-lg border ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-gray-50 border-gray-200"}`}>
            <h3 className={`font-medium mb-2 ${isDark ? "text-purple-400" : "text-purple-600"}`}>Sum Arbitrage</h3>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Multiple choice markets where probabilities should sum to approximately 100%.
            </p>
          </div>
        </div>
      </section>

      <section id="manual" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Manual Discovery
        </h2>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          While the AI scanner automates discovery, you can also find opportunities manually:
        </p>
        <ul className={`list-disc list-inside space-y-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          <li>Search for related market keywords</li>
          <li>Compare similar markets by different creators</li>
          <li>Look at market groups for related questions</li>
          <li>Monitor markets during fast-moving news events</li>
        </ul>
      </section>

      <section id="execution" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Execution Tips
        </h2>
        <ul className={`list-disc list-inside space-y-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          <li><strong>Speed matters:</strong> Use the Trading Terminal for fast execution</li>
          <li><strong>Size wisely:</strong> Large trades move prices; split across both markets</li>
          <li><strong>Check liquidity:</strong> Ensure both markets have sufficient volume</li>
          <li><strong>Consider fees:</strong> Trading fees reduce effective arbitrage profit</li>
        </ul>
      </section>

      <section id="risks" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Risks
        </h2>
        <div className={`p-4 rounded-lg border ${isDark ? "bg-red-900/20 border-red-800" : "bg-red-50 border-red-200"}`}>
          <ul className={`list-disc list-inside space-y-2 text-sm ${isDark ? "text-red-400" : "text-red-700"}`}>
            <li>Markets may not be truly related despite appearing similar</li>
            <li>Resolution criteria differences can eliminate expected profits</li>
            <li>Prices may move while executing both legs</li>
            <li>AI analysis may misidentify relationships</li>
          </ul>
        </div>
        <p className={`mt-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          Always verify the relationship between markets and understand resolution criteria before trading.
        </p>
      </section>
    </DocsPage>
  );
}
