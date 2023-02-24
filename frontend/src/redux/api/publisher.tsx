import axios from 'axios';
import { baseURL } from '../../config';
import { getHttpHeader } from '../utils';

export const getPublishers = () => {
  return axios.get(`${baseURL}/publishers`, getHttpHeader())
};
