const applyStatusClass = (domainUrl: string, status: string, trial: number, appSumoDomains: string[]): string => {
    if(appSumoDomains.includes(domainUrl)){
      return 'bg-green-200 text-green-600';
    }
    if (!status) {
      return 'bg-yellow-200 text-yellow-800';
    }
    if (trial) {
      return 'bg-yellow-200 text-yellow-800';
    }
    const currentTime = new Date().getTime();
    const timeDifference = new Date(parseInt(status)).getTime() - currentTime;
    const sevendays = 7 * 24 * 60 * 60 * 1000;

    if (timeDifference > sevendays) {
      return 'bg-green-200 text-green-600';
    }
    if (timeDifference < sevendays && timeDifference > 0) {
      return 'bg-red-200 text-red-600';
    }
    return 'bg-yellow-200 text-yellow-800';
  };
export default applyStatusClass;