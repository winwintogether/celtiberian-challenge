export const encodeQuery = (params: any) => {
  return Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
};
