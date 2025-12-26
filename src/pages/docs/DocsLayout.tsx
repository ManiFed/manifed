import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ChevronRight, ExternalLink, Moon, Sun, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import manifedLogo from "@/assets/manifed-logo.png";

// Documentation structure
export const docsStructure = {
  tabs: [
    { id: "introduction", label: "Introduction" },
    { id: "products", label: "Products" },
    { id: "guides", label: "Guides" },
    { id: "api", label: "API Reference" },
  ],
  sections: {
    introduction: [
      {
        title: "Getting Started",
        items: [
          { id: "welcome", label: "Welcome to ManiFed", path: "/docs" },
          { id: "quickstart", label: "Quickstart", path: "/docs/quickstart" },
          { id: "core-concepts", label: "Core Concepts", path: "/docs/core-concepts" },
        ],
      },
      {
        title: "Account Setup",
        items: [
          { id: "create-account", label: "Create Account", path: "/docs/create-account" },
          { id: "manifold-integration", label: "Manifold Integration", path: "/docs/manifold-integration" },
          { id: "deposits-withdrawals", label: "Deposits & Withdrawals", path: "/docs/deposits-withdrawals" },
        ],
      },
    ],
    products: [
      {
        title: "ManiFed Fintech",
        items: [
          { id: "fintech-overview", label: "Overview", path: "/docs/fintech" },
          { id: "trading-terminal", label: "Trading Terminal", path: "/docs/trading-terminal" },
          { id: "index-funds", label: "Index Funds", path: "/docs/index-funds" },
          { id: "advanced-orders", label: "Advanced Orders", path: "/docs/advanced-orders" },
          { id: "calibration", label: "Calibration Analysis", path: "/docs/calibration" },
          { id: "bot-builder", label: "Bot Builder", path: "/docs/bot-builder" },
          { id: "arbitrage", label: "AI Arbitrage Scanner", path: "/docs/arbitrage" },
        ],
      },
      {
        title: "ManiFed Treasury",
        items: [
          { id: "treasury-overview", label: "Overview", path: "/docs/treasury" },
          { id: "bonds", label: "Bonds", path: "/docs/bonds" },
          { id: "bond-market", label: "Bond Market", path: "/docs/bond-market" },
        ],
      },
      {
        title: "Other Products",
        items: [
          { id: "memecoins", label: "Memecoins", path: "/docs/memecoins" },
          { id: "comment-maker", label: "Comment Maker", path: "/docs/comment-maker" },
        ],
      },
    ],
    guides: [
      {
        title: "Trading Guides",
        items: [
          { id: "first-trade", label: "Your First Trade", path: "/docs/first-trade" },
          { id: "limit-orders", label: "Using Limit Orders", path: "/docs/limit-orders" },
          { id: "hotkeys", label: "Setting Up Hotkeys", path: "/docs/hotkeys" },
        ],
      },
      {
        title: "Strategy",
        items: [
          { id: "arbitrage-guide", label: "Finding Arbitrage", path: "/docs/arbitrage-guide" },
          { id: "calibration-guide", label: "Improving Calibration", path: "/docs/calibration-guide" },
        ],
      },
    ],
    api: [
      {
        title: "API Reference",
        items: [
          { id: "api-overview", label: "Overview", path: "/docs/api" },
          { id: "authentication", label: "Authentication", path: "/docs/api-auth" },
        ],
      },
    ],
  },
};

export default function DocsLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("introduction");
  const [isDark, setIsDark] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Determine active tab from current path
  useEffect(() => {
    const path = location.pathname;
    if (
      path.includes("/docs/fintech") ||
      path.includes("/docs/trading-terminal") ||
      path.includes("/docs/index-funds") ||
      path.includes("/docs/advanced-orders") ||
      path.includes("/docs/calibration") ||
      path.includes("/docs/bot-builder") ||
      path.includes("/docs/arbitrage") ||
      path.includes("/docs/treasury") ||
      path.includes("/docs/bonds") ||
      path.includes("/docs/memecoins") ||
      path.includes("/docs/comment-maker")
    ) {
      setActiveTab("products");
    } else if (
      path.includes("/docs/first-trade") ||
      path.includes("/docs/limit-orders") ||
      path.includes("/docs/hotkeys") ||
      path.includes("/docs/arbitrage-guide") ||
      path.includes("/docs/calibration-guide")
    ) {
      setActiveTab("guides");
    } else if (path.includes("/docs/api")) {
      setActiveTab("api");
    } else {
      setActiveTab("introduction");
    }
  }, [location.pathname]);

  const currentSections = docsStructure.sections[activeTab as keyof typeof docsStructure.sections] || [];

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#0d1117] text-gray-100" : "bg-white text-gray-900"}`}>
      {/* Header */}
      <header
        className={`sticky top-0 z-50 border-b ${isDark ? "border-gray-800 bg-[#0d1117]/95" : "border-gray-200 bg-white/95"} backdrop-blur-sm`}
      >
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/docs" className="flex items-center gap-3">
              <img src={manifedLogo} alt="ManiFed" className="w-8 h-8 rounded-lg" />
              <span className="font-bold text-lg">ManiFed</span>
            </Link>

            {/* Search Bar - Desktop */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className={`relative w-full ${isDark ? "bg-gray-900" : "bg-gray-100"} rounded-lg`}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className={`pl-10 border-0 ${isDark ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"} focus-visible:ring-1 focus-visible:ring-blue-500`}
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
                  ⌘K
                </kbd>
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-4">
              <a
                href="https://manifold.markets"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200"
              >
                Manifold <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://manifed.markets/hub"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200"
              >
                ManiFed <ExternalLink className="w-3 h-3" />
              </a>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDark(!isDark)}
                className="text-gray-400 hover:text-gray-200"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>

              {/* Mobile menu toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-6 -mb-px overflow-x-auto">
            {docsStructure.tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-500"
                    : `border-transparent ${isDark ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-900"}`
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto flex">
        {/* Sidebar */}
        <aside
          className={`hidden md:block w-64 flex-shrink-0 border-r ${isDark ? "border-gray-800" : "border-gray-200"} sticky top-[105px] h-[calc(100vh-105px)]`}
        >
          <ScrollArea className="h-full py-6 px-4">
            {currentSections.map((section, idx) => (
              <div key={idx} className="mb-6">
                <h3
                  className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? "text-gray-500" : "text-gray-400"}`}
                >
                  {section.title}
                </h3>
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <li key={item.id}>
                        <Link
                          to={item.path}
                          className={`block py-1.5 px-3 text-sm rounded-lg transition-colors ${
                            isActive
                              ? `${isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"} font-medium`
                              : `${isDark ? "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`
                          }`}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </ScrollArea>
        </aside>

        {/* Mobile sidebar */}
        {mobileMenuOpen && (
          <div className={`md:hidden fixed inset-0 z-40 ${isDark ? "bg-[#0d1117]" : "bg-white"} pt-16`}>
            <ScrollArea className="h-full py-6 px-4">
              {currentSections.map((section, idx) => (
                <div key={idx} className="mb-6">
                  <h3
                    className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? "text-gray-500" : "text-gray-400"}`}
                  >
                    {section.title}
                  </h3>
                  <ul className="space-y-1">
                    {section.items.map((item) => (
                      <li key={item.id}>
                        <Link
                          to={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`block py-2 px-3 text-sm rounded-lg ${isDark ? "text-gray-300 hover:bg-gray-800" : "text-gray-700 hover:bg-gray-100"}`}
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </ScrollArea>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <Outlet context={{ isDark }} />
        </main>
      </div>
    </div>
  );
}
