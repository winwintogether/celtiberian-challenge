import { INewspapersStatus } from "@redux/reducers/newspaper";
import { IPublisherStatus } from "@redux/reducers/publisher";

interface IReducerStates {
  newspapers: INewspapersStatus;
  publishers: IPublisherStatus;
  router: any;
}
