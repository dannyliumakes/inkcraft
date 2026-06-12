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

export interface PlotScene {
  id: string;
  title: string;
  summary: string;
  imageAssetId: string | null;
  tags: string[];
  chapterRef?: string;
  order: number;
}

export interface PlotChapter {
  id: string;
  title: string;
  scenes: PlotScene[];
}

export interface PlotAct {
  id: string;
  title: string;
  chapters: PlotChapter[];
}

export interface PlotBoard {
  acts: PlotAct[];
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
  research: ResearchItem[];
  notes: string;
  todos: Todo[];
  plotBoard: PlotBoard;
  dailyWordGoal: number;
  updatedAt: string;    // ISO timestamp
  rev: number;
}
