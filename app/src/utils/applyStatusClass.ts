const YELLOW_BG = 'bg-yellow-200 text-yellow-800';
const GREEN_BG = 'bg-green-200 text-green-600';
export const RED_BG = 'bg-red-200 text-red-600';
const applyStatusClass = (domainUrl: string, status: string, trial: number, appSumoDomains: string[]): string => {
    if(appSumoDomains.includes(domainUrl)){
      return GREEN_BG;
    }
    if (!status) {
      return YELLOW_BG;
    }
    if (trial) {
      return YELLOW_BG;
    }
    const currentTime = new Date().getTime();
    const statusNum = parseInt(status);
    if (isNaN(statusNum)) {
      return YELLOW_BG;
    }
    const timeDifference = new Date(statusNum).getTime() - currentTime;
    const sevendays = 7 * 24 * 60 * 60 * 1000;

    if (timeDifference > sevendays) {
      return GREEN_BG;
    }
    if (timeDifference < sevendays && timeDifference > 0) {
      return RED_BG;
    }
    return YELLOW_BG;
  };
export default applyStatusClass;