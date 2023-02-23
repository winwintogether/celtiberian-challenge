interface INewspaper {
  id: number;
  title: string;
  image: string;
  link: string;
  abstract: string;
  publisher: IPublisher;
  languages: string[];
  creation_date: string;
}
