import {
  CREATE_NEWSPAPER_SUCCESS,
  DELETE_NEWSPAPER_SUCCESS,
  NEWSPAPER_LIST_SUCCESS,
  UPDATE_NEWSPAPER_SUCCESS
} from '../actions';

export interface INewspapersStatus {
  newspapers: INewspaper[],
  totalDocs: 0
}

const initialState: INewspapersStatus = {
  newspapers: [],
  totalDocs: 0
}

export default (state = initialState, actions: any) => {
  const { type, payload } = actions;

  switch (type) {
    case NEWSPAPER_LIST_SUCCESS:
      return {
        ...state,
        newspapers: payload.docs,
        totalDocs: payload.totalDocs
      };
    case CREATE_NEWSPAPER_SUCCESS:
      return {
        ...state,
        totalDocs: state.totalDocs + 1,
        newspapers: [
          ...(state.newspapers || []),
          payload.newspaper
        ]
      };
    case UPDATE_NEWSPAPER_SUCCESS:
      const index = state.newspapers.findIndex(item => item._id === payload.newspaper._id)
      state.newspapers[index] = payload.newspaper
      return {
        ...state,
        newspapers: [
          ...(state.newspapers || [])
        ]
      };
    case DELETE_NEWSPAPER_SUCCESS:
      const newspapers = state.newspapers.filter(item => item._id !== payload._id)
      return {
        ...state,
        newspapers: [
          ...newspapers
        ]
      };
    default:
      return state;
  }
};
