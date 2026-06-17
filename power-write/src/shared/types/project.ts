export interface Act {
  id: string;
  title: string;
  order: number;
}

// A scene is just a chunk of manuscript prose — no title, no summary. Its
// content lives in the chapter's .md file (keyed by scene id). The plot board,
// chapter tree, and manuscript editor all render scenes from chapter.scenes,
// so they stay in sync.
export interface Scene {
  id: string;
  order: number;
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

// Every chapter must have at least one scene. Legacy chapters (and freshly
// created ones) get this default so the editor and autosave have a stable
// scene id to read/write content against.
export function makeDefaultScene(): Scene {
  return { id: 'sc_default', order: 0 };
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
