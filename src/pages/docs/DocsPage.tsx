import { useOutletContext } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DocsPageProps {
  title: string;
  description?: string;
  breadcrumb?: string;
  children: React.ReactNode;
  tableOfContents?: { id: string; label: string; level?: number }[];
}

export default function DocsPage({ title, description, breadcrumb, children, tableOfContents }: DocsPageProps) {
  const { isDark } = useOutletContext<{ isDark: boolean }>();

  const copyPageLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard");
  };

  return (
    <div className="flex">
      {/* Content */}
      <div className="flex-1 min-w-0 px-6 lg:px-12 py-10 max-w-4xl">
        {breadcrumb && (
          <div className="flex items-center gap-2 text-sm text-blue-500 mb-4">
            <span>{breadcrumb}</span>
          </div>
        )}
        
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className={`text-3xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>{title}</h1>
            {description && (
              <p className={`text-lg ${isDark ? "text-gray-400" : "text-gray-600"}`}>{description}</p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={copyPageLink}
            className={`flex-shrink-0 gap-2 ${isDark ? "border-gray-700 text-gray-400 hover:text-white" : ""}`}
          >
            <Copy className="w-4 h-4" />
            Copy page
          </Button>
        </div>

        <div className={`prose prose-sm max-w-none ${isDark ? "prose-invert" : ""}`}>
          {children}
        </div>
      </div>

      {/* Table of Contents */}
      {tableOfContents && tableOfContents.length > 0 && (
        <aside className={`hidden xl:block w-56 flex-shrink-0 border-l ${isDark ? "border-gray-800" : "border-gray-200"} sticky top-[105px] h-[calc(100vh-105px)]`}>
          <ScrollArea className="h-full py-10 px-4">
            <h4 className={`text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              <span className="w-4 h-px bg-current" />
              On this page
            </h4>
            <ul className="space-y-2">
              {tableOfContents.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className={`block text-sm transition-colors ${
                      item.level === 2
                        ? `pl-3 ${isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"}`
                        : `${isDark ? "text-gray-400 hover:text-blue-400" : "text-gray-600 hover:text-blue-600"}`
                    }`}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </aside>
      )}
    </div>
  );
}
