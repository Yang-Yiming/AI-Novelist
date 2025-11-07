
export interface WorldSettings {
  summary: string;
  locations: string;
  history: string;
  magicSystems: string;
}

export interface CharacterProfile {
  id: string;
  name: string;
  description: string;
  motivation: string;
}

export interface PlotPoint {
  id: string;
  title: string;
  description: string;
}

export interface Plan {
  worldSettings: WorldSettings;
  characterSettings: CharacterProfile[];
  plotOutline: PlotPoint[];
  tone: string;
}

export interface CheckerFeedback {
  verdict: 'Approved' | 'Needs Revision';
  thoughts: {
    overallImpression: string;
    detailedFeedback: string[];
  };
}

export interface Chapter {
  id: number;
  title: string;
  content: string;
  feedback?: CheckerFeedback;
}

export type Agent = 'planner' | 'writer' | 'checker';

export type AppState = 'INITIAL' | 'PLANNING' | 'WRITING' | 'ERROR';

export interface ActiveTasks {
    writingChapter: boolean;
    checkingChapter: Record<number, boolean>; // key: chapter index
    revisingChapter: Record<number, boolean>; // key: chapter index
    syncingPlan: Record<number, boolean>; // key: chapter index
}

export interface AppSettings {
    globalSystemPrompt: string;
    continueFromLastChapter: boolean;
    fontSize: number; // in rem
    paragraphSpacing: number; // in em
}

export interface AppStateSnapshot {
    initialIdea: string;
    plan: Plan | null;
    chapters: Chapter[];
    settings: AppSettings;
    appState: AppState;
}