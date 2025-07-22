import React, { useEffect } from 'react';
import { ApolloProvider, useQuery, useMutation } from '@apollo/client';
import { BrowserRouter, Redirect, Route, Switch } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import Auth from '@/containers/Auth/Auth';
import PrivateRoute from '@/routes/PrivateRoute';
import PublicRoute from '@/routes/PublicRoute';
import AdminLayout from '@/containers/Layout/Admin';
import VerifyEmail from '@/containers/VerifyEmail';
import { createClient } from '@/config/apollo';
import GlobalLoading from '@/components/Layout/GlobalLoading';
import 'react-toastify/dist/ReactToastify.css';
import { RootState } from './config/store';
import ReportView from './containers/Accessibility/ReportView';
import ReportSuccessModal from '@/components/Common/ReportSuccessModal';
import { pollReportJob } from '@/features/report/reportSlice';
import SAVE_ACCESSIBILITY_REPORT from '@/queries/accessibility/saveAccessibilityReport';
import GET_USER_SITES from '@/queries/sites/getSites';
import GlobalReportPolling from '@/components/Common/GlobalReportPolling';

type props = {
  options: string[];
}
const client = createClient();

const App: React.FC<props> = ({ options }) => {
  const { error } = useSelector((state: RootState) => state.user);
  const dispatch = useDispatch();
  const { showModal, reportData } = useSelector((state: RootState) => state.report);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  return (
    <ApolloProvider client={client}>
      <BrowserRouter>
        <GlobalLoading />
        <ToastContainer />
        <GlobalReportPolling />
        {/* Global Report Modal */}
        <ReportSuccessModal isOpen={showModal} reportData={reportData} />
        <Switch>
          <Route path="/verify-email" component={VerifyEmail} />
          <PublicRoute path="/auth" component={Auth} />
          <Route path="/reports/:r2_key" component={ReportView} exact />
          <PrivateRoute render={() => <AdminLayout options={options} />} />
          <Redirect from="*" to="/" />
        </Switch>
      </BrowserRouter>
    </ApolloProvider>
  );
}

export default App;
