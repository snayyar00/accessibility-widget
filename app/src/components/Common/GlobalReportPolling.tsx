import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { pollReportJob } from '@/features/report/reportSlice';
import { RootState } from '@/config/store';
import { setIsGenerating } from '@/features/report/reportSlice';

const GlobalReportPolling = () => {
  const dispatch = useDispatch();
  const { jobId, selectedDomain } = useSelector(
    (state: RootState) => state.report,
  );

  useEffect(() => {
    if (!jobId) {
      dispatch(setIsGenerating(false));
    }
  }, []);

  useEffect(() => {
    if (jobId && selectedDomain) {
      dispatch(
        pollReportJob({
          jobId,
        }),
      );
    }
  }, [jobId, selectedDomain, dispatch]);

  return null;
};

export default GlobalReportPolling;
