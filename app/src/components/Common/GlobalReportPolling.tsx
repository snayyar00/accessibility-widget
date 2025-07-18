import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery, useMutation } from '@apollo/client';
import GET_USER_SITES from '@/queries/sites/getSites';
import SAVE_ACCESSIBILITY_REPORT from '@/queries/accessibility/saveAccessibilityReport';
import { pollReportJob } from '@/features/report/reportSlice';
import { RootState } from '@/config/store';
import { setIsGenerating } from '@/features/report/reportSlice';

const GlobalReportPolling = () => {
  const dispatch = useDispatch();
  const { jobId, selectedDomain } = useSelector((state: RootState) => state.report);
  const { data: sitesData } = useQuery(GET_USER_SITES);
  const [saveAccessibilityReport] = useMutation(SAVE_ACCESSIBILITY_REPORT);
  const isMounted = { current: true };
  const groupByCode = () => {};

  useEffect(() => {
    if (!jobId) {
      dispatch(setIsGenerating(false));
    }
  }, []);


  useEffect(() => {


    if (jobId && selectedDomain) {
      dispatch(
        pollReportJob({
          jobId
        })
      );
    }
  }, [jobId, selectedDomain, dispatch]);


  return null;
};

export default GlobalReportPolling; 