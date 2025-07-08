const getIpAddress = (forwarded: string | string[] | undefined, remoteAddress: string | undefined): string => {
    if (forwarded) {
      const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
      return ip.trim();
    }
    return remoteAddress || 'unknown';
};

export default getIpAddress;