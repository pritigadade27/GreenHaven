import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';

/** Guards an action that needs an account. */
export default function useRequireAuth() {
  const { isSignedIn, ready } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(
    (action, reason = 'continue') =>
      (...args) => {
        // `ready` is false until /auth/me has answered.
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
