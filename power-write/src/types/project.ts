export interface Chapter {
  id: string;          // e.g. "ch_001"
  title: string;
  order: number;
  fileId: string;      // Drive file ID of the .md file
  wordCount: number;
  rev: number;         // local revision counter for conflict detection
}

export interface Character {
  id: string;
  name: string;
  description: string;
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
  chapters: Chapter[];
  characters: Character[];
  notes: string;
  todos: Todo[];
  dailyWordGoal: number;
  projectWordGoal: number;   // default 80000
  wordHistory: { date: string; total: number }[];  // YYYY-MM-DD entries
  milestones: { id: string; label: string; createdAt: string; driveRevisionId?: string }[];
  updatedAt: string;    // ISO timestamp
  rev: number;
}
