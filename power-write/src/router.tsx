import { createBrowserRouter } from 'react-router-dom';
import ShelfPage from './features/shelf/ShelfPage';
import BookLayout from './features/layout/BookLayout';
import ManuscriptPage from './features/manuscript/ManuscriptPage';
import Overview from './features/overview/Overview';
import ErrorBoundary from './shared/components/ErrorBoundary';
import CharacterList from './features/characters/CharacterList';
import ResearchList from './features/research/ResearchList';
import PlotBoard from './features/plot/PlotBoard';
import SearchPage from './features/search/SearchPage';
import { searchLoader } from './features/search/services/searchLoader';

const router = createBrowserRouter([
  {
    path: '/',
    element: <ShelfPage />,
  },
  {
    path: '/book/:bookId',
    element: <ErrorBoundary><BookLayout /></ErrorBoundary>,
    children: [
      { index: true, element: <ManuscriptPage /> },
      { path: 'plot', element: <PlotBoard /> },
      { path: 'characters', element: <CharacterList /> },
      { path: 'research', element: <ResearchList /> },
      { path: 'overview', element: <Overview /> },
      { path: 'search/:query', loader: searchLoader, element: <SearchPage /> },
    ],
  },
]);

export default router;
