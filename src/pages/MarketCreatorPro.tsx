import { useEffect, useState } from 'react';
import { UniversalHeader } from '@/components/layout/UniversalHeader';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { MarketList } from '@/components/creator/MarketList';
import { TemplatePicker } from '@/components/creator/TemplatePicker';
import { DraftEditor } from '@/components/creator/DraftEditor';
import { ClarityFeedbackPanel } from '@/components/creator/ClarityFeedbackPanel';
import { LiquidityGuidanceCard } from '@/components/creator/LiquidityGuidanceCard';
import { PreLaunchReview } from '@/components/creator/PreLaunchReview';
import { CreatorStatsCard } from '@/components/creator/CreatorStatsCard';
import { useMarketDrafts } from '@/hooks/useMarketDrafts';
import { useClarityAnalysis } from '@/hooks/useClarityAnalysis';
import { MarketTemplate } from '@/types/market-creator';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Eye } from 'lucide-react';

export default function MarketCreatorPro() {
  const {
    drafts,
    selectedDraft,
    selectedDraftId,
    setSelectedDraftId,
    createDraft,
    updateDraft,
  } = useMarketDrafts();

  const { score, issues, isAnalyzing, analyze, requestAIAnalysis } = useClarityAnalysis();

  const [isReviewMode, setIsReviewMode] = useState(false);

  // Analyze draft when it changes
  useEffect(() => {
    if (selectedDraft) {
      analyze(selectedDraft);
    }
  }, [selectedDraft, analyze]);

  // Update draft with analysis results
  useEffect(() => {
    if (selectedDraft && !isAnalyzing) {
      updateDraft(selectedDraft.id, { clarityScore: score, issues });
    }
  }, [score, issues, isAnalyzing, selectedDraft, updateDraft]);

  const handleNewDraft = () => {
    createDraft();
  };

  const handleTemplateSelect = (template: MarketTemplate) => {
    createDraft({
      title: template.title,
      description: template.description,
      resolutionCriteria: template.resolutionCriteria,
      marketType: template.marketType,
      templateId: template.id,
    });
  };

  const handleUpdate = (updates: Parameters<typeof updateDraft>[1]) => {
    if (selectedDraft) {
      updateDraft(selectedDraft.id, updates);
    }
  };

  const handleReview = () => {
    if (selectedDraft) {
      updateDraft(selectedDraft.id, { status: 'review' });
      setIsReviewMode(true);
    }
  };

  const handleBackToEdit = () => {
    if (selectedDraft) {
      updateDraft(selectedDraft.id, { status: 'draft' });
      setIsReviewMode(false);
    }
  };

  const handlePublish = () => {
    if (selectedDraft) {
      updateDraft(selectedDraft.id, { status: 'live' });
      setIsReviewMode(false);
      toast.success('Market published successfully!');
    }
  };

  const handleRequestAI = async () => {
    if (selectedDraft) {
      await requestAIAnalysis(selectedDraft);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <UniversalHeader />

      <div className="flex-1 pt-24">
        <ResizablePanelGroup direction="horizontal" className="min-h-[calc(100vh-6rem)]">
          {/* Left Column - Market List & Context */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <div className="h-full border-r border-border flex flex-col">
              <CreatorStatsCard drafts={drafts} />
              
              <div className="p-3 border-b border-border">
                <TemplatePicker onSelect={handleTemplateSelect} />
              </div>

              <MarketList
                drafts={drafts}
                selectedDraftId={selectedDraftId}
                onSelectDraft={setSelectedDraftId}
                onNewDraft={handleNewDraft}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Center Column - Draft Editor */}
          <ResizablePanel defaultSize={50} minSize={35}>
            <div className="h-full flex flex-col">
              {selectedDraft ? (
                isReviewMode ? (
                  <PreLaunchReview
                    draft={selectedDraft}
                    issues={issues}
                    onBack={handleBackToEdit}
                    onPublish={handlePublish}
                  />
                ) : (
                  <>
                    <DraftEditor
                      draft={selectedDraft}
                      issues={issues}
                      onUpdate={handleUpdate}
                    />
                    <div className="p-4 border-t border-border">
                      <Button onClick={handleReview} className="w-full">
                        <Eye className="h-4 w-4 mr-2" />
                        Review Before Publishing
                      </Button>
                    </div>
                  </>
                )
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <p className="text-lg font-medium mb-2">No market selected</p>
                    <p className="text-sm">Create a new market or select one from the list.</p>
                  </div>
                </div>
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Column - Guidance & Feedback */}
          <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
            <div className="h-full border-l border-border flex flex-col">
              {selectedDraft && !isReviewMode ? (
                <>
                  <ClarityFeedbackPanel
                    score={score}
                    issues={issues}
                    isAnalyzing={isAnalyzing}
                    onRequestAI={handleRequestAI}
                  />
                  <LiquidityGuidanceCard draft={selectedDraft} />
                </>
              ) : !isReviewMode ? (
                <div className="flex-1 flex items-center justify-center p-6 text-center text-muted-foreground">
                  <p className="text-sm">Select or create a market to see guidance.</p>
                </div>
              ) : null}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
