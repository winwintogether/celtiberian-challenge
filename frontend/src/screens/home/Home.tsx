import React from 'react';
import {Input, Button, Table, Dropdown, Space, Menu, Tag} from 'antd';
import {PlusOutlined, DashOutlined} from '@ant-design/icons';
import './Home.less';
import {colors} from "@constants/general";
const { Search } = Input;
type Props = {};

const data: INewspaper[] = [
  {
    "id": 2,
    "title": "Michigan City dispatch.",
    "image": "public/image/michigan.png",
    "link": "https://www.britannica.com/place/Michigan",
    "abstract": "Michigan, constituent state of the United States of America. Although by the size of its land Michigan ranks only 22nd of the 50 states, the inclusion of the Great Lakes waters over which it has jurisdiction increases its area considerably, placing it 11th in terms of total area. The capital is Lansing, in south-central Michigan. The state's name is derived from michi-gama, an Ojibwa (Chippewa) word meaning 'large lake.'",
    "publisher": {
      "id": 7,
      "name": "Rob Jr.",
      "joined_date": "2015-07-06T11:22:37Z"
    },
    "languages": ["en", "es", "fr"],
    "creation_date": "2019-08-05T12:12:44Z"
  }
]

const Home: React.FC<Props> = () => {
  const columns = [
    {
      title: 'Image',
      dataIndex: 'image',
      width: '5%',
    },
    {
      title: 'Title',
      dataIndex: 'title',
      width: '20%',
    },
    {
      title: 'Link',
      dataIndex: 'link',
      width: '30%',
      render: (text: string) => (
        <div className="cursor-pointer">
          <a href={text} target="_blank" className="link">{text}</a>
        </div>
      ),
    },
    {
      title: 'Publisher Name',
      dataIndex: 'publisher',
      width: '15%',
      render: (publisher: IPublisher) => (
        <span>{publisher.name}</span>
      ),
    },
    {
      title: 'Languages',
      dataIndex: 'languages',
      width: '15%',
      render: (languages: string[]) => (
        languages && languages.length ? (
          languages.map(language => {
            return (<Tag key={language} color={colors[Math.floor(Math.random() * 10)]}>{language}</Tag>)
          })
        ) : (<span />)
      ),
    },
    {
      title: 'Action',
      dataIndex: '',
      width: '5%',
      render: () => (
        <Space size="middle">
          <Dropdown className="rotate-90 cursor-pointer" overlay={(
            <Menu>
              <Menu.Item key="view">View Newspaper</Menu.Item>
              <Menu.Item key="edit">Edit Newspaper</Menu.Item>
              <Menu.Item key="delete">Delete Newspaper</Menu.Item>
            </Menu>
          )}>
            <DashOutlined />
          </Dropdown>
        </Space>
      ),
    }
  ];

  return (
    <>
      <div className="home">
        <h1 className="title">Newspaper List</h1>
        <div className="header">
          <Search className="search-input" placeholder="Search title" size="large" loading={false} />
          <Button className="add-btn" type="primary" icon={<PlusOutlined />} shape="round" size="large">
            Add Newspaper
          </Button>
        </div>
        <Table className="newspaper-list" columns={columns} dataSource={data} rowKey={(record) => record.id} />
      </div>
    </>
  );
};

export default Home;
