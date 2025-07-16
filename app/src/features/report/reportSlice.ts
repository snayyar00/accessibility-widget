import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

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

const reportSlice = createSlice({
  name: 'report',
  initialState: {
    isGenerating: false,
    reportData: null,
    error: null,
    showModal: false,
    reportUrl: '',
  } as {
    isGenerating: boolean;
    reportData: any;
    error: string | null;
    showModal: boolean;
    reportUrl: string;
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

export const { closeModal, resetReport } = reportSlice.actions;
export default reportSlice.reducer; 