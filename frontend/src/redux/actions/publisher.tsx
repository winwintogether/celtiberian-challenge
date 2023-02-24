export const PUBLISHER_LIST_REQUEST: 'publisher_list_request' = 'publisher_list_request';
export const PUBLISHER_LIST_SUCCESS: 'publisher_list_success' = 'publisher_list_success';
export const PUBLISHER_LIST_FAILURE: 'publisher_list_failure' = 'publisher_list_failure';

export const getPublishers = () => ({
  type: PUBLISHER_LIST_REQUEST,
  payload: {}
})
