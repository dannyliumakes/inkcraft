import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';

const styles = {
  root: 'flex flex-col items-center justify-center h-screen gap-4 bg-surface',
  title: 'section-title',
  msg: 'text-sm text-secondary',
  btn: 'px-4 py-2 rounded-lg bg-accent text-white text-sm hover:opacity-90 transition-opacity',
}

export default function RouteErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  let message = '發生未預期的錯誤';
  if (isRouteErrorResponse(error)) {
    message = error.status === 404
      ? '找不到此頁面'
      : error.status === 401
        ? '請先登入'
        : `錯誤 ${error.status}`;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className={styles.root}>
      <p className={styles.title}>出了點問題</p>
      <p className={styles.msg}>{message}</p>
      <button onClick={() => navigate('/')} className={styles.btn}>
        回到書架
      </button>
    </div>
  );
}
