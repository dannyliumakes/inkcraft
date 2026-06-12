import { createBrowserRouter } from 'react-router-dom';
import ShelfPage from './features/shelf/ShelfPage';
import BookLayout from './features/layout/BookLayout';
import ManuscriptPage from './features/manuscript/ManuscriptPage';
import CharacterList from './features/characters/CharacterList';
import ResearchList from './features/research/ResearchList';
import PlotBoard from './features/plot/PlotBoard';

const router = createBrowserRouter([
  {
    path: '/',
    element: <ShelfPage />,
  },
  {
    path: '/book/:bookId',
    element: <BookLayout />,
    children: [
      { index: true, element: <ManuscriptPage /> },
      { path: 'plot', element: <PlotBoard /> },
      { path: 'characters', element: <CharacterList /> },
      { path: 'research', element: <ResearchList /> },
      { path: 'overview', element: <div className="p-8 text-gray-500">概覽 – coming soon</div> },
    ],
  },
]);

export default router;
