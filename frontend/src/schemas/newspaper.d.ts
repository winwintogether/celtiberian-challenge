interface INewspaper {
  _id: string;
  title: string;
  image: string;
  publisherId: string;
  link: string;
  abstract: string;
  publisher: IPublisher;
  languages: string[];
  creation_date: string;
}
