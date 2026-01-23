import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { marketTemplates } from '@/data/marketTemplates';
import { MarketTemplate } from '@/types/market-creator';
import { LayoutTemplate, Search } from 'lucide-react';

interface TemplatePickerProps {
  onSelect: (template: MarketTemplate) => void;
}

export function TemplatePicker({ onSelect }: TemplatePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [...new Set(marketTemplates.map((t) => t.category))];

  const filteredTemplates = marketTemplates.filter((template) => {
    const matchesSearch =
      search === '' ||
      template.name.toLowerCase().includes(search.toLowerCase()) ||
      template.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = !selectedCategory || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelect = (template: MarketTemplate) => {
    onSelect(template);
    setOpen(false);
    setSearch('');
    setSelectedCategory(null);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <LayoutTemplate className="h-4 w-4 mr-2" />
          Use Template
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Market Templates</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedCategory === null ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Badge>
            {categories.map((cat) => (
              <Badge
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>

          {/* Template list */}
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="space-y-3 pr-4">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelect(template)}
                  className="w-full text-left p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{template.name}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {template.title}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {template.category}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {template.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
              {filteredTemplates.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No templates match your search.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
