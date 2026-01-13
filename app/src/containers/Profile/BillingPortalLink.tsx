import { Dispatch, SetStateAction, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../config/store';
import { getAuthenticationCookie } from '@/utils/cookie';

export const handleBilling = async (
  btnClick?: Dispatch<SetStateAction<boolean>>,
  email?: string,
) => {
  if (btnClick) {
    btnClick(true);
  }

  const url = `${process.env.REACT_APP_BACKEND_URL}/billing-portal-session`;
  const bodyData = { email: email, returnURL: window.location.href };
  const token = getAuthenticationCookie();

  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(bodyData),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      response.json().then((data) => {
        // Handle the JSON data received from the backend
        if (btnClick) {
          btnClick(false);
        }
        window.location.href = data.url;
      });
    })
    .catch((error) => {
      // Handle error
      console.error('There was a problem with the fetch operation:', error);
    });
};

function BillingPortalLink() {
  const { data, loading } = useSelector((state: RootState) => state.user);
  const [clicked, setClicked] = useState(false);
  return (
    <div className="space-y-4">
      {/* Billing Portal Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-3 md:space-y-0 p-3 md:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
        <div className="flex-1 w-full md:w-auto">
          <h3 className="text-base md:text-lg font-semibold text-gray-900">
            Billing Portal
          </h3>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            Manage all your subscriptions in one place, fast and simple
          </p>
        </div>
        <button
          onClick={() => {
            handleBilling(setClicked, data?.email);
          }}
          disabled={clicked}
          aria-busy={clicked}
          aria-label={clicked ? 'Loading, opening billing portal' : 'Open billing portal'}
          aria-describedby="billing-loading-announcement"
          className="w-auto md:w-auto flex-shrink-0 px-4 md:px-6 py-2 md:py-2.5 text-white rounded-lg text-xs md:text-sm font-medium transition-all duration-200 focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          style={{
            backgroundColor: '#0052CC',
          }}
        >
          {clicked ? (
            <span className="flex items-center space-x-2">
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>Please Wait...</span>
            </span>
          ) : (
            'Open Billing Portal'
          )}
        </button>
        <div
          id="billing-loading-announcement"
          role="status"
          aria-live="assertive"
          aria-atomic="true"
          className="sr-only"
        >
          {clicked ? 'Loading, opening billing portal' : ''}
        </div>
      </div>
    </div>
  );
}

export default BillingPortalLink;
