import axios from 'axios';
import { baseURL } from '../../config';
import { getHttpHeader } from '../utils';

export const getNewspapers = () => {
  return axios.get(`${baseURL}/newspapers`, getHttpHeader())
};
