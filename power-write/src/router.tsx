import { createBrowserRouter } from 'react-router-dom';
import ShelfPage from './features/shelf/ShelfPage';
import BookLayout from './features/layout/BookLayout';
import ManuscriptPage from './features/manuscript/ManuscriptPage';

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
      { path: 'plot', element: <div className="p-8 text-gray-500">大綱 – coming soon</div> },
      { path: 'characters', element: <div className="p-8 text-gray-500">角色 – coming soon</div> },
      { path: 'research', element: <div className="p-8 text-gray-500">資料 – coming soon</div> },
      { path: 'overview', element: <div className="p-8 text-gray-500">概覽 – coming soon</div> },
    ],
  },
]);

export default router;
