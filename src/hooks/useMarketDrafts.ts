import { useState, useEffect, useCallback } from 'react';
import { MarketDraft, DraftStatus } from '@/types/market-creator';

const STORAGE_KEY = 'manifed-market-drafts';

const generateId = () => crypto.randomUUID();

export function useMarketDrafts() {
  const [drafts, setDrafts] = useState<MarketDraft[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        const restored = parsed.map((d: any) => ({
          ...d,
          closeDate: d.closeDate ? new Date(d.closeDate) : null,
          createdAt: new Date(d.createdAt),
          updatedAt: new Date(d.updatedAt),
        }));
        setDrafts(restored);
      } catch (e) {
        console.error('Failed to parse drafts from storage:', e);
      }
    }
  }, []);

  // Save to localStorage when drafts change
  useEffect(() => {
    if (drafts.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    }
  }, [drafts]);

  const selectedDraft = drafts.find((d) => d.id === selectedDraftId) || null;

  const createDraft = useCallback((template?: Partial<MarketDraft>): MarketDraft => {
    const now = new Date();
    const newDraft: MarketDraft = {
      id: generateId(),
      title: template?.title || '',
      description: template?.description || '',
      resolutionCriteria: template?.resolutionCriteria || '',
      marketType: template?.marketType || 'binary',
      resolutionType: 'manual',
      closeDate: null,
      status: 'draft',
      templateId: template?.templateId,
      createdAt: now,
      updatedAt: now,
      clarityScore: 0,
      issues: [],
    };
    setDrafts((prev) => [newDraft, ...prev]);
    setSelectedDraftId(newDraft.id);
    return newDraft;
  }, []);

  const updateDraft = useCallback((id: string, updates: Partial<MarketDraft>) => {
    setDrafts((prev) =>
      prev.map((draft) =>
        draft.id === id
          ? { ...draft, ...updates, updatedAt: new Date() }
          : draft
      )
    );
  }, []);

  const deleteDraft = useCallback((id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    if (selectedDraftId === id) {
      setSelectedDraftId(null);
    }
  }, [selectedDraftId]);

  const duplicateDraft = useCallback((id: string) => {
    const source = drafts.find((d) => d.id === id);
    if (!source) return;

    const now = new Date();
    const newDraft: MarketDraft = {
      ...source,
      id: generateId(),
      title: `${source.title} (Copy)`,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
    setDrafts((prev) => [newDraft, ...prev]);
    setSelectedDraftId(newDraft.id);
  }, [drafts]);

  const getDraftsByStatus = useCallback(
    (status: DraftStatus) => drafts.filter((d) => d.status === status),
    [drafts]
  );

  return {
    drafts,
    selectedDraft,
    selectedDraftId,
    setSelectedDraftId,
    createDraft,
    updateDraft,
    deleteDraft,
    duplicateDraft,
    getDraftsByStatus,
  };
}
