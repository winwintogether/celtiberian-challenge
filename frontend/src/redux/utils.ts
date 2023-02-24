import { TOKEN_NAME } from '../config';
import { AxiosRequestConfig } from 'axios';

export const getHttpHeader = (): AxiosRequestConfig => {
  const token = sessionStorage.getItem(TOKEN_NAME);

  if (token) {
    return {
      headers: {
        Authorization: `Basic ${token}`,
      }
    };
  }

  return {};
}
