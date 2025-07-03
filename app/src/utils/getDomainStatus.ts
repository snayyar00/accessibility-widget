const getDomainStatus = (domainUrl: string, status: string, trial: number, appSumoDomains: string[]): string => {
  if (appSumoDomains.includes(domainUrl)) {
    return 'Life Time';
  }
  if (!status) {
    return 'Trial Expired';
  }
  if (trial) {
    return 'Trial';
  }
  const currentTime = new Date().getTime();
  const timeDifference = new Date(parseInt(status)).getTime() - currentTime;
  const sevendays = 7 * 24 * 60 * 60 * 1000;

  if (timeDifference > sevendays) {
    return 'Active';
  }
  if (timeDifference < sevendays && timeDifference > 0) {
    return trial === 1 ? 'Trial' : 'Expiring';
  }
  return 'Expired';
};

export default getDomainStatus;