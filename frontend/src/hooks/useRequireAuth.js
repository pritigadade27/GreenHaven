import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';

export default function useRequireAuth() {
  const { isSignedIn, ready } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Gate action behind sign-in
  return useCallback(
    (action, reason = 'continue') =>
      (...args) => {
      if (!ready || isSignedIn) return action(...args);
        navigate('/login', {
          state: {
            from: location.pathname + location.search,
            reason: `Please sign in or create an account to ${reason}.`,
          },
        });
        return undefined;
      },
    [isSignedIn, navigate, location]
  );
}
