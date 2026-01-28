import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { setAuthenticationCookie } from '@/utils/cookie';
import { CircularProgress } from '@mui/material';

const AuthRedirect: React.FC = () => {
  const history = useHistory();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      // Basic token validation: JWT tokens are base64url encoded and have 3 parts separated by dots
      const tokenParts = token.split('.');
      if (tokenParts.length === 3 && token.length > 50 && token.length < 2000) {
        setAuthenticationCookie(token);
        window.location.replace('/');
      } else {
        // Invalid token format, redirect to sign in
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
