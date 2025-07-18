import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import getAccessibilityReportByJobId from '@/queries/accessibility/getAccessibilityReportByJobId';
import { toast } from 'react-toastify';
import { createClient } from '@/config/apollo';

const apolloClient = createClient();

export const generateReport = createAsyncThunk<any, any>(
  'report/generateReport',
  async (reportData, { rejectWithValue }) => {
    try {
      // No backend call, just resolve with the provided data
      return reportData;
    } catch (error) {
      return rejectWithValue('Failed to generate report');
    }
  }
);

export const processAndSaveReport = createAsyncThunk(
  'report/processAndSaveReport',
  async ({ result, validDomain, sitesData, saveAccessibilityReport, isMounted, groupByCode }: any, { dispatch }) => {
    let score = result.score;
    let allowed_sites_id = null;

    if (sitesData && sitesData.getUserSites) {
      const matchedSite = sitesData.getUserSites.find(
        (site: any) => (site.url || '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '') == validDomain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
      );
      allowed_sites_id = matchedSite ? matchedSite.id : null;
    }

    // Save the report
    const { data: saveData } = await saveAccessibilityReport({
      variables: {
        report: result,
        url: validDomain,
        allowed_sites_id,
        score: typeof score === 'object' ? score : { value: score },
      },
    });

    if (saveData && saveData.saveAccessibilityReport) {
      const savedReport = saveData.saveAccessibilityReport;
      const r2Key = savedReport.key;
      const savedUrl = savedReport.report.url;
      const newReportUrl = `/${r2Key}?domain=${encodeURIComponent(savedUrl)}`;
      toast.success('Accessibility report saved successfully!');
      dispatch(setIsGenerating(false));
      dispatch(generateReport({ url: newReportUrl, allowed_sites_id }));
    }
    // Optionally process htmlcs, siteImg, etc. here if needed
  }
);

export const pollReportJob = createAsyncThunk(
  'report/pollReportJob',
  async ({ jobId }: any, { dispatch }) => {
    const poll = async () => {
      const { data } = await apolloClient.query({
        query: getAccessibilityReportByJobId,
        variables: { jobId },
        fetchPolicy: 'network-only',
      });
      if (data && data.getAccessibilityReportByJobId) {
        const { status, result, error } = data.getAccessibilityReportByJobId;
        if (status === 'done' && result && result.savedReport) {
          dispatch(clearJobId());
          dispatch(setIsGenerating(false));
          // Compose the report URL from backend result
          const r2Key = result.savedReport.key;
          const savedUrl = result.savedReport.report.url;
          const newReportUrl = `/${r2Key}?domain=${encodeURIComponent(savedUrl)}`;
          dispatch(generateReport({ url: newReportUrl }));
          return true;
        } else if (status === 'error' || status === 'not_found') {
          dispatch(clearJobId());
          dispatch(setIsGenerating(false));
          toast.error(error || 'Failed to generate report.');
          return true;
        }
      }
      return false;
    };
    let finished = false;
    while (!finished) {
      finished = await poll();
      if (!finished) await new Promise(res => setTimeout(res, 5000));
    }
  }
);

const reportSlice = createSlice({
  name: 'report',
  initialState: {
    isGenerating: false,
    reportData: null,
    error: null,
    showModal: false,
    reportUrl: '',
    selectedDomain: null,
    jobId: null,
  } as {
    isGenerating: boolean;
    reportData: any;
    error: string | null;
    showModal: boolean;
    reportUrl: string;
    selectedDomain: string | null;
    jobId: string | null;
  },
  reducers: {
    closeModal(state) {
      state.showModal = false;
    },
    resetReport(state) {
      state.isGenerating = false;
      state.reportData = null;
      state.error = null;
      state.showModal = false;
      state.reportUrl = '';
      state.selectedDomain = null;
      state.jobId = null;
    },
    setIsGenerating(state, action) {
      state.isGenerating = action.payload;
    },
    setSelectedDomain(state, action) {
      state.selectedDomain = action.payload;
    },
    setJobId(state, action) {
      state.jobId = action.payload;
    },
    clearJobId(state) {
      state.jobId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(generateReport.pending, (state) => {
        state.isGenerating = true;
        state.error = null;
        state.showModal = false;
        state.reportData = null;
        state.reportUrl = '';
      })
      .addCase(generateReport.fulfilled, (state, action) => {
        state.isGenerating = false;
        state.reportData = action.payload;
        state.showModal = true;
        // If you want to set a reportUrl, you can do so here if the payload has the necessary info
        // state.reportUrl = ...
      })
      .addCase(generateReport.rejected, (state, action) => {
        state.isGenerating = false;
        state.error = action.payload as string;
        state.showModal = false;
      });
  },
});

export const { closeModal, resetReport, setIsGenerating, setSelectedDomain, setJobId, clearJobId } = reportSlice.actions;
export default reportSlice.reducer; 