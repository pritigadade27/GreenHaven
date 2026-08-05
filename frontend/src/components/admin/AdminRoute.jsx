import { Navigate, useLocation } from 'react-router-dom';

import { useAdminAuth } from '../../context/AdminAuthContext.jsx';

/** Gate for every protected admin route. */
export default function AdminRoute({ children }) {
  const { isAdmin, ready } = useAdminAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="admin-boot" role="status" aria-live="polite">
        <span className="admin-boot__dot" />
        <span className="sr-only">Checking your session</span>
      </div>
    );
  }

  if (!isAdmin) {
    // `from` so a deep link survives the sign-in, and replace so the back
    // button cannot return to the protected screen.
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
