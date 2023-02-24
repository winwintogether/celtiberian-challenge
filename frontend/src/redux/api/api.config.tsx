import { PathLike } from 'fs';

export const API_BASE_URL = process.env.REACT_APP_MBA_RANKINGS_ADMIN_API_BASE_URL;

export const apiConfig = {
  returnRejectedPromiseOnError: true,
  withCredentials: true,
  timeout: 30000,
  baseURL: API_BASE_URL,
  headers: {
    common: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  },
  paramsSerializer: (params: PathLike): string => JSON.stringify(params),
};
