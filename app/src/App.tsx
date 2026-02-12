import React, { useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ApolloProvider } from '@apollo/client';
import { BrowserRouter, Redirect, Route, Switch } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { Toaster } from 'sonner';
import { useSelector } from 'react-redux';

import Auth from '@/containers/Auth/Auth';
import PrivateRoute from '@/routes/PrivateRoute';
import { loadHubSpotScript } from '@/utils/hubspot';
import PublicRoute from '@/routes/PublicRoute';
import AdminLayout from '@/containers/Layout/Admin';
import VerifyEmail from '@/containers/VerifyEmail';
import { createClient } from '@/config/apollo';
import 'react-toastify/dist/ReactToastify.css';
import ReportSuccessModal from '@/components/Common/ReportSuccessModal';
import GlobalReportPolling from '@/components/Common/GlobalReportPolling';
import AuthRedirect from '@/containers/Auth/AuthRedirect';
import { GlobalLoader } from '@/containers/Root/GlobalLoader';
import { useFavicon } from '@/hooks/useFavicon';
import ReportView from './containers/Accessibility/ReportView';
import { RootState } from './config/store';
import AcceptInvitation from '@/containers/Invitations/AcceptInvitation';

type props = {
  options: string[];
};
const client = createClient();

const App: React.FC<props> = ({ options }) => {
  const { error } = useSelector((state: RootState) => state.user);
  const { showModal, reportData } = useSelector(
    (state: RootState) => state.report,
  );

  const organization = useSelector(
    (state: RootState) => state.organization.data,
  );

  useFavicon(organization?.favicon || null);

  // Load HubSpot chat widget only when current org matches REACT_APP_CURRENT_ORG
  useEffect(() => {
    const allowedOrgId = process.env.REACT_APP_CURRENT_ORG || '1';
    if (organization?.id != null && String(organization.id) === String(allowedOrgId)) {
      loadHubSpotScript();
    }
  }, [organization?.id]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_KEY || '';

  const appContent = (
    <ApolloProvider client={client}>
      <BrowserRouter>
        <GlobalLoader />
        <ToastContainer />
        <Toaster />

        <GlobalReportPolling />

        <ReportSuccessModal isOpen={showModal} reportData={reportData} />

        <Switch>
          <PublicRoute path="/auth" component={Auth} />

          <Route path="/auth-redirect" component={AuthRedirect} />
          <Route path="/verify-email" component={VerifyEmail} />
          <Route
            path="/invitation/:invitationToken"
            component={AcceptInvitation}
          />
          <Route path="/reports/:r2_key" component={ReportView} exact />

          <PrivateRoute render={() => <AdminLayout options={options} />} />

          <Redirect from="*" to="/" />
        </Switch>
      </BrowserRouter>
    </ApolloProvider>
  );

  return googleClientId ? (
    <GoogleOAuthProvider clientId={googleClientId}>{appContent}</GoogleOAuthProvider>
  ) : (
    appContent
  );
};

export default App;
