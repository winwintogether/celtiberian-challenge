export const NEWSPAPER_LIST_REQUEST: 'newspaper_list_request' = 'newspaper_list_request';
export const NEWSPAPER_LIST_SUCCESS: 'newspaper_list_success' = 'newspaper_list_success';
export const NEWSPAPER_LIST_FAILURE: 'newspaper_list_failure' = 'newspaper_list_failure';

export const CREATE_NEWSPAPER_REQUEST: 'create_newspaper_request' = 'create_newspaper_request';
export const CREATE_NEWSPAPER_SUCCESS: 'create_newspaper_success' = 'create_newspaper_success';
export const CREATE_NEWSPAPER_FAILURE: 'create_newspaper_failure' = 'create_newspaper_failure';

export const UPDATE_NEWSPAPER_REQUEST: 'update_newspaper_request' = 'update_newspaper_request';
export const UPDATE_NEWSPAPER_SUCCESS: 'update_newspaper_success' = 'update_newspaper_success';
export const UPDATE_NEWSPAPER_FAILURE: 'update_newspaper_failure' = 'update_newspaper_failure';

export const DELETE_NEWSPAPER_REQUEST: 'delete_newspaper_request' = 'delete_newspaper_request';
export const DELETE_NEWSPAPER_SUCCESS: 'delete_newspaper_success' = 'delete_newspaper_success';
export const DELETE_NEWSPAPER_FAILURE: 'delete_newspaper_failure' = 'delete_newspaper_failure';

export const fetchList = (payload: any) => ({
  type: NEWSPAPER_LIST_REQUEST,
  payload: { payload }
})

export const createNewspaper = (newspaper: INewspaper) => ({
  type: CREATE_NEWSPAPER_REQUEST,
  payload: { newspaper }
});

export const updateNewspaper = (newspaper: INewspaper) => ({
  type: UPDATE_NEWSPAPER_REQUEST,
  payload: { newspaper }
});

export const deleteNewspaper = (id: string) => ({
  type: DELETE_NEWSPAPER_REQUEST,
  payload: { id }
});
