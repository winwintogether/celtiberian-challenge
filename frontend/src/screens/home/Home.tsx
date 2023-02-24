import React, {useEffect, useState} from 'react';
import {Input, Button, Table, Dropdown, Space, Menu, Tag, Modal, Pagination} from 'antd';
import {PlusOutlined, DashOutlined, ExclamationCircleOutlined} from '@ant-design/icons';
import {colors} from "@constants/general";
import NewspaperDetailModal from "@components/Modal/NewspaperDetailModal";
import NewspaperEditModal from "@components/Modal/NewspaperEditModal";
import {useSelector, useDispatch} from "react-redux";
import {deleteNewspaper, fetchList} from '@redux/actions';
import {IReducerStates} from "../../schemas/ReducerStates";
import './Home.less';

const { Search } = Input;
const { confirm } = Modal;
type Props = {};

const Home: React.FC<Props> = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedNewspaper, setSelectedNewspaper] = useState<undefined | INewspaper>(undefined);
  const { newspapers, totalDocs } = useSelector((state: IReducerStates) => state.newspapers);
  const [paginationOptions, setPaginationOptions] = useState({ page: 1, size: 10 });
  const [search, setSearch] = useState("");
  const dispatch = useDispatch();

  useEffect(() => {
    const serverParams = {
      title: search,
      ...paginationOptions
    }
    dispatch(fetchList(serverParams));
  }, [dispatch, paginationOptions, search]);

  const viewNewspaper = (newspaper: INewspaper) => {
    setModalOpen(true);
    setSelectedNewspaper(newspaper);
  }

  const createNewspaper = () => {
    setSelectedNewspaper(undefined);
    setEditModalOpen(true);
  }

  const editNewspaper = (newspaper: INewspaper) => {
    setSelectedNewspaper(newspaper);
    setEditModalOpen(true);
  }

  const showDeleteNewspaper = (newspaper: INewspaper) => {
    confirm({
      title: 'Confirm',
      icon: <ExclamationCircleOutlined />,
      content: 'Are you sure you want to delete this newspaper?',
      okText: 'Delete',
      cancelText: 'Cancel',
      onOk() {
        dispatch(deleteNewspaper(newspaper._id));
      }
    });
  }

  const handleChange = (page: number, size: number) => {
    setPaginationOptions({page, size})
  }

  const onSearch = (value: string) => {
    setSearch(value)
  };
  const columns = [
    {
      title: 'Image',
      dataIndex: 'image',
      width: '5%',
      render: (imageUrl: string) => (
        imageUrl ? <img src={imageUrl} alt="avatar" style={{ width: '100%', height: '100%' }} /> : <div />
      ),
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
      render: (_: any, newspaper: INewspaper) => (
        <Space size="middle">
          <Dropdown className="rotate-90 cursor-pointer" overlay={(
            <Menu>
              <Menu.Item key="view" onClick={() => viewNewspaper(newspaper)}>View Newspaper</Menu.Item>
              <Menu.Item key="edit" onClick={() => editNewspaper(newspaper)}>Edit Newspaper</Menu.Item>
              <Menu.Item key="delete" onClick={() => showDeleteNewspaper(newspaper)}>Delete Newspaper</Menu.Item>
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
          <Search className="search-input" placeholder="Search title" size="large" loading={false} onSearch={onSearch} />
          <Button className="add-btn" type="primary" icon={<PlusOutlined />} shape="round" size="large" onClick={createNewspaper}>
            Add Newspaper
          </Button>
        </div>
        <Table
          className="newspaper-list"
          columns={columns}
          dataSource={newspapers}
          pagination={false}
          rowKey={''}
        />
        <div className="pagination">
          <Pagination
            showSizeChanger={true}
            defaultCurrent={paginationOptions.page}
            total={totalDocs}
            onChange={handleChange}
          />
        </div>
        {
          selectedNewspaper && (
            <NewspaperDetailModal
              isOpen={modalOpen}
              onClose={() => setModalOpen(false)}
              newspaper={selectedNewspaper}
            />
          )
        }
        {editModalOpen && (
          <NewspaperEditModal
            newspaper={selectedNewspaper}
            isOpen={editModalOpen}
            onClose={() => setEditModalOpen(false)}
          />
        )}
      </div>
    </>
  );
};

export default Home;
