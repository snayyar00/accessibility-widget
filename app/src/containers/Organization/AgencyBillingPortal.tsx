import { useState } from 'react';
import { Button, Box, Typography, Paper } from '@mui/material';
import { toast } from 'sonner';
import { getAuthenticationCookie } from '@/utils/cookie';

interface AgencyBillingPortalProps {
  hasAgencyAccountId: boolean;
}

/**
 * Opens the Stripe Express Dashboard for connected agencies
 * Allows agencies to view their earnings, payouts, and transaction history
 */
export const handleAgencyDashboard = async (
  btnClick?: React.Dispatch<React.SetStateAction<boolean>>,
) => {
  if (btnClick) {
    btnClick(true);
  }

  const url = `${process.env.REACT_APP_BACKEND_URL}/agency-dashboard-link`;
  const token = getAuthenticationCookie();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to open agency dashboard');
    }

    const data = await response.json();

    if (data.url) {
      // Open Stripe Express Dashboard in new tab
      window.open(data.url, '_blank');
      
      if (btnClick) {
        btnClick(false);
      }
    } else {
      throw new Error('No dashboard URL received');
    }
  } catch (error: any) {
    console.error('Error opening agency dashboard:', error);
    toast.error(error.message || 'Failed to open agency dashboard. Please try again.');
    
    if (btnClick) {
      btnClick(false);
    }
  }
};

const AgencyBillingPortal: React.FC<AgencyBillingPortalProps> = ({ hasAgencyAccountId }) => {
  const [loading, setLoading] = useState(false);

  if (!hasAgencyAccountId) {
    return null;
  }

  return (
    <Paper variant="outlined" sx={{ p: 4 }}>
      <div className="mb-6">
        <Typography variant="h6">Agency Billing Portal</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Access your Stripe Express Dashboard to view earnings, manage payouts, and track revenue share.
        </Typography>
      </div>

      <Box 
        sx={{ 
          p: 3,
          borderRadius: 2,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              Stripe Express Dashboard
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.95 }}>
              View your earnings, payouts, and transaction history
            </Typography>
          </Box>
          
          <Button
            variant="contained"
            size="large"
            onClick={() => handleAgencyDashboard(setLoading)}
            disabled={loading}
            sx={{
              bgcolor: 'white',
              color: '#667eea',
              fontWeight: 600,
              px: 4,
              whiteSpace: 'nowrap',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.9)',
              },
              '&:disabled': {
                bgcolor: 'rgba(255, 255, 255, 0.5)',
                color: 'rgba(102, 126, 234, 0.5)',
              },
            }}
          >
            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <svg
                  className="animate-spin"
                  style={{ width: 16, height: 16 }}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    style={{ opacity: 0.25 }}
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    style={{ opacity: 0.75 }}
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Opening...</span>
              </Box>
            ) : (
              'Open Dashboard'
            )}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default AgencyBillingPortal;

