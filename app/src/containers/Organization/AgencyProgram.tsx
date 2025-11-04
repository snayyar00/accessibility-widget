import React, { useState } from 'react';
import { useApolloClient, useLazyQuery, useMutation } from '@apollo/client';
import { Paper, Typography, Button, Alert, Box } from '@mui/material';
import { toast } from 'react-toastify';
import { useDispatch } from 'react-redux';
import { getErrorMessage } from '@/helpers/error.helper';
import {
  CONNECT_TO_AGENCY_PROGRAM,
  DISCONNECT_FROM_AGENCY_PROGRAM,
} from '@/queries/organization/agencyProgram';
import GET_PROFILE from '@/queries/auth/getProfile';
import { setProfileUser } from '@/features/auth/user';

interface AgencyProgramProps {
  hasAgencyAccountId: boolean;
  isOwner: boolean;
}

/**
 * Agency Program Component
 * Allows organization owners to connect/disconnect from the Webability Agency Program
 *
 * Features:
 * - Connect to Stripe Express Account (revenue sharing)
 * - Disconnect from program
 * - Update/refresh agency account ID
 */
const AgencyProgram: React.FC<AgencyProgramProps> = ({
  hasAgencyAccountId,
  isOwner,
}) => {
  const dispatch = useDispatch();
  const client = useApolloClient();

  const [connectToAgency, { loading: connecting }] = useMutation(
    CONNECT_TO_AGENCY_PROGRAM,
  );

  const [disconnectFromAgency, { loading: disconnecting }] = useMutation(
    DISCONNECT_FROM_AGENCY_PROGRAM,
  );

  const [getProfile, { loading: profileLoading }] = useLazyQuery(GET_PROFILE);

  // Connect to Agency Program (opens Stripe onboarding)
  // Used for both initial connection and updates
  const handleConnectOrUpdate = async () => {
    try {
      // Construct success URL for return after Stripe onboarding
      const successUrl = `${window.location.origin}/organization/settings?agency=success`;

      const res = await connectToAgency({
        variables: {
          successUrl,
        },
      });

      const hasError = res?.errors && res.errors.length;

      if (hasError) {
        toast.error(
          res.errors?.[0]?.message || 'Failed to connect to Agency Program.',
        );
        return;
      }

      const response = res.data?.connectToAgencyProgram;

      if (response?.success && response?.onboardingUrl) {
        // Redirect to Stripe onboarding
        window.location.href = response.onboardingUrl;
      } else {
        toast.error('Failed to get onboarding URL.');
      }
    } catch (error: unknown) {
      const message = getErrorMessage(
        error,
        'Failed to connect to Agency Program. Please try again.',
      );
      toast.error(message);
    }
  };

  // Disconnect from Agency Program
  const handleDisconnect = async () => {
    try {
      const res = await disconnectFromAgency();

      const hasError = res?.errors && res.errors.length;

      if (hasError) {
        toast.error(
          res.errors?.[0]?.message ||
            'Failed to disconnect from Agency Program.',
        );
        return;
      }

      const response = res.data?.disconnectFromAgencyProgram;

      if (response?.success) {
        toast.success(
          response.message || 'Successfully disconnected from Agency Program.',
        );

        const profileResult = await getProfile();
        const profileUser = profileResult?.data?.profileUser;

        if (profileUser) {
          dispatch(
            setProfileUser({
              data: profileUser,
              loading: profileLoading,
            }),
          );
        } else {
          toast.error('Failed to update user profile after disconnect.');
        }
      }
    } catch (error: unknown) {
      const message = getErrorMessage(
        error,
        'Failed to disconnect from Agency Program. Please try again.',
      );
      toast.error(message);
    }
  };

  if (!isOwner) {
    return null;
  }

  return (
    <Paper variant="outlined" sx={{ p: 4 }}>
      <div className="mb-6">
        <Typography variant="h6">Agency Program</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Join the Agency Program to earn revenue share on your client
          subscriptions.
        </Typography>
      </div>

      {hasAgencyAccountId ? (
        <Box>
          <Alert severity="success" sx={{ mb: 3 }}>
            Your organization is connected to the Agency Program! You're earning
            revenue share on eligible subscriptions.
          </Alert>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, flex: 'none' }}>
            <Button
              variant="outlined"
              color="primary"
              size="large"
              onClick={handleConnectOrUpdate}
              disabled={connecting}
            >
              Update Connection
            </Button>

            <Button
              variant="outlined"
              color="error"
              size="large"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              Disconnect
            </Button>
          </Box>
        </Box>
      ) : (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            Connect your Stripe account to start earning revenue share when your
            clients subscribe.
          </Alert>

          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleConnectOrUpdate}
            disabled={connecting}
            disableElevation
          >
            Connect to Agency Program
          </Button>
        </Box>
      )}
    </Paper>
  );
};

export default AgencyProgram;
