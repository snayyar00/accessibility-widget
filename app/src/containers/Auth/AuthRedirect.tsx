import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { setAuthenticationCookie } from '@/utils/cookie';
import { CircularProgress } from '@mui/material';

const AuthRedirect: React.FC = () => {
  const history = useHistory();

  useEffect(() => {
    // Prefer fragment (#) over query (?) - fragment is never sent to server, avoiding logs/referrer leakage
    // Support both for backwards compatibility with any existing links
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const searchParams = new URLSearchParams(window.location.search);
    const token = hashParams.get('token') ?? searchParams.get('token');

    if (token) {
      let decodedToken: string;
      try {
        decodedToken = decodeURIComponent(token);
      } catch {
        history.replace('/auth/signin');
        return;
      }
      // Basic token validation: JWT tokens are base64url encoded and have 3 parts separated by dots
      const tokenParts = decodedToken.split('.');
      if (tokenParts.length === 3 && decodedToken.length > 50 && decodedToken.length < 2000) {
        setAuthenticationCookie(decodedToken);
        // Replace URL to remove token from browser history (clears both hash and query)
        window.history.replaceState(null, '', window.location.pathname);
        window.location.replace('/');
      } else {
        history.replace('/auth/signin');
      }
    } else {
      history.replace('/auth/signin');
    }
  }, [history]);

  return (
    <div className="flex items-center justify-center h-screen w-screen fixed inset-0 z-50 bg-white">
      <CircularProgress size={150} />
    </div>
  );
};

export default AuthRedirect;
