export interface Act {
  id: string;
  title: string;
  order: number;
}

export interface Scene {
  id: string;
  title: string;
  order: number;
  summary: string;
  imageAssetId: string | null;
  tags: string[];
}

export interface Chapter {
  id: string;          // e.g. "ch_001"
  title: string;
  order: number;
  actId: string;
  fileId: string;      // Drive file ID of the .md file
  wordCount: number;
  rev: number;         // local revision counter for conflict detection
  scenes: Scene[];
}

export interface Character {
  id: string;
  name: string;
  label: string;
  aliases: string[];
  description: string;
  portraitAssetId: string | null;
  tags: string[];
  order: number;
}

export interface ResearchItem {
  id: string;
  title: string;
  description: string;
  imageAssetId: string | null;
  tags: string[];
  sourceUrl?: string;
  order: number;
}

export interface Todo {
  id: string;
  text: string;
  done: boolean;
}

export interface Project {
  id: string;           // = Drive folder ID of the book
  title: string;
  coverAssetId?: string;
  manuscriptFolderId: string;
  assetsFolderId: string;
  projectFileId: string; // Drive file ID of project.json
  acts: Act[];
  chapters: Chapter[];
  characters: Character[];
  research: ResearchItem[];
  notes: string;
  todos: Todo[];
  dailyWordGoal: number;
  projectWordGoal: number;   // default 80000
  wordHistory: { date: string; total: number }[];  // YYYY-MM-DD entries
  milestones: { id: string; label: string; createdAt: string; driveRevisionId?: string }[];
  updatedAt: string;    // ISO timestamp
  rev: number;
}
