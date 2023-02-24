import {PUBLISHER_LIST_SUCCESS} from "@redux/actions/publisher";

export interface IPublisherStatus {
  publishers: IPublisher[],
}

const initialState: IPublisherStatus = {
  publishers: []
}

export default (state = initialState, actions: any) => {
  const { type, payload } = actions;

  switch (type) {
    case PUBLISHER_LIST_SUCCESS:
      return {
        ...state,
        publishers: payload
      };
    default:
      return state;
  }
};
