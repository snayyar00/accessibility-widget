import React, { useEffect } from 'react';
import { ApolloProvider, useQuery } from '@apollo/client';
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
import Modal from '@/components/Common/Modal';
import { closeModal } from '@/features/report/reportSlice';
import { FaCheckCircle } from 'react-icons/fa';

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
        {/* Global Report Modal */}
        <Modal isOpen={showModal}>
          <div className="p-8 text-center relative">
            <button
              onClick={() => dispatch(closeModal())}
              className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="mb-6">
              <FaCheckCircle size={64} color="green" className="mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Report Generated Successfully!</h2>
              <p className="text-gray-600">
                Your accessibility report is ready to view.
              </p>
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  if (reportData?.url) {
                    const newTab = window.open(reportData.url, '_blank');
                    if (newTab) newTab.focus();
                  }
                  dispatch(closeModal());
                }}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Open Report
              </button>
              <button
                onClick={() => dispatch(closeModal())}
                className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
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
