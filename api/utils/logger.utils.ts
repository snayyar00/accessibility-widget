// Function for safe extraction of operationName from GraphQL requests
export const getOperationName = (body: any) => {
  if (body && typeof body === 'object' && body.operationName) {
    return body.operationName;
  }

  return '-';
};
