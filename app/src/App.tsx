import React, { useEffect } from 'react';
import { ApolloProvider } from '@apollo/client';
import { BrowserRouter, Redirect, Route, Switch } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { useSelector } from 'react-redux';

import Auth from '@/containers/Auth/Auth';
import PrivateRoute from '@/routes/PrivateRoute';
import PublicRoute from '@/routes/PublicRoute';
import AdminLayout from '@/containers/Layout/Admin';
import VerifyEmail from '@/containers/VerifyEmail';
import { createClient } from '@/config/apollo';
import 'react-toastify/dist/ReactToastify.css';
import ReportSuccessModal from '@/components/Common/ReportSuccessModal';
import GlobalReportPolling from '@/components/Common/GlobalReportPolling';
import { GlobalLoader } from '@/containers/Root';
import AuthRedirect from '@/containers/Auth/AuthRedirect';
import ReportView from './containers/Accessibility/ReportView';
import { RootState } from './config/store';

type props = {
  options: string[];
};
const client = createClient();

const App: React.FC<props> = ({ options }) => {
  const { error } = useSelector((state: RootState) => state.user);
  const { showModal, reportData } = useSelector(
    (state: RootState) => state.report,
  );

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  return (
    <ApolloProvider client={client}>
      <BrowserRouter>
        <GlobalLoader />
        <ToastContainer />

        <GlobalReportPolling />

        <ReportSuccessModal isOpen={showModal} reportData={reportData} />

        <Switch>
          <PublicRoute path="/auth" component={Auth} />

          <Route path="/auth-redirect" component={AuthRedirect} />
          <Route path="/verify-email" component={VerifyEmail} />
          <Route path="/reports/:r2_key" component={ReportView} exact />

          <PrivateRoute render={() => <AdminLayout options={options} />} />

          <Redirect from="*" to="/" />
        </Switch>
      </BrowserRouter>
    </ApolloProvider>
  );
};

export default App;
