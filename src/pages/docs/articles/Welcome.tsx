import DocsPage from "../DocsPage";
import { useOutletContext, Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function Welcome() {
  const { isDark } = useOutletContext<{ isDark: boolean }>();

  return (
    <DocsPage
      title="Welcome to ManiFed"
      description="Advanced prediction market tools built on Manifold Markets."
      tableOfContents={[
        { id: "what-is-manifed", label: "What is ManiFed?" },
        { id: "key-features", label: "Key Features" },
        { id: "getting-started", label: "Getting Started" },
      ]}
    >
      <section id="what-is-manifed" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          What is ManiFed?
        </h2>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          ManiFed is a suite of advanced trading and analysis tools for Manifold Markets. We provide 
          professional-grade features for serious prediction market participants, including:
        </p>
        <ul className={`list-disc list-inside space-y-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          <li>High-speed keyboard-driven trading terminal</li>
          <li>AI-powered arbitrage detection</li>
          <li>Portfolio calibration analysis</li>
          <li>Custom trading bot development</li>
          <li>Treasury bonds with guaranteed returns</li>
        </ul>
      </section>

      <section id="key-features" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Key Features
        </h2>
        
        <div className="grid gap-4">
          <div className={`p-4 rounded-lg border ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-gray-50 border-gray-200"}`}>
            <h3 className={`font-medium mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>Trading Terminal</h3>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Execute trades with keyboard shortcuts. Support for market orders, limit orders, and custom hotkeys.
            </p>
          </div>
          
          <div className={`p-4 rounded-lg border ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-gray-50 border-gray-200"}`}>
            <h3 className={`font-medium mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>AI Arbitrage Scanner</h3>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Discover mispriced correlated markets using AI analysis. Find guaranteed profit opportunities.
            </p>
          </div>
          
          <div className={`p-4 rounded-lg border ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-gray-50 border-gray-200"}`}>
            <h3 className={`font-medium mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>Treasury Bonds</h3>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Earn guaranteed returns with ManiFed Treasury bonds. Low-risk investment option for mana.
            </p>
          </div>
        </div>
      </section>

      <section id="getting-started" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Getting Started
        </h2>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          Ready to start using ManiFed? Follow our quickstart guide to set up your account and make your first trade.
        </p>
        
        <Link 
          to="/docs/quickstart"
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            isDark 
              ? "bg-blue-600 hover:bg-blue-700 text-white" 
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
        >
          Get Started
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </DocsPage>
  );
}
