import axios from 'axios';

import { encodeQuery } from '@utils/helpers';
import { baseURL } from '../../config';
import { getHttpHeader } from '../utils';

export const getNewspapers = (payload: any) => {
  console.log(payload);
  return axios.get(`${baseURL}/newspapers?${encodeQuery(payload.payload)}`, getHttpHeader());
};

export const createNewspaper = (body: INewspaper) => {
  return axios.post(`${baseURL}/newspapers`, body, getHttpHeader());
};

export const updateNewspaper = (body: INewspaper) => {
  return axios.patch(`${baseURL}/newspapers/${body._id}`, body, getHttpHeader());
};

export const deleteNewspaper = (id: string) => {
  return axios.delete(`${baseURL}/newspapers/${id}`, getHttpHeader());
};
