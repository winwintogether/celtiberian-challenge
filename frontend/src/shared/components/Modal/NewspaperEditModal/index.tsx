import React, {useEffect, useMemo, useState} from 'react';
import { Modal, Form, Input, Select, Button } from 'antd';
import {useDispatch, useSelector} from "react-redux";
import {createNewspaper, updateNewspaper} from "@redux/actions";
import {getPublishers} from "@redux/actions/publisher";
import {IReducerStates} from "../../../../schemas/ReducerStates";
import './styles.less';
import {languageList} from "@constants/general";
import Avatar from "@components/Avatar";

const { Option } = Select;
const { TextArea } = Input;

type Props = {
  isOpen: boolean;
  onClose: (b: boolean) => void;
  newspaper?: INewspaper;
};

const NewspaperEditModal: React.FC<Props> = ({isOpen, onClose, newspaper}) => {
  const [form] = Form.useForm();
  const [imageUrl, setImageUrl] = useState(newspaper ? newspaper.image : "");
  const { publishers } = useSelector((state: IReducerStates) => state.publishers);
  const dispatch = useDispatch();

  const onFinish = (values: INewspaper) => {
    const filteredPublishers = publishers.filter(item => item._id === values.publisherId)
    if (filteredPublishers.length) {
      values.publisher = filteredPublishers[0]
    }
    values.image = imageUrl
    if (isCreated) {
      dispatch(createNewspaper(values))
    } else if (newspaper && newspaper._id) {
      dispatch(updateNewspaper({...values, _id: newspaper._id }))
    }
    onClose(false);
  };

  const isCreated = useMemo(() => {
    return !(newspaper && newspaper._id)
  }, [newspaper]);

  useEffect(() => {
    if (isOpen && !publishers.length) {
      dispatch(getPublishers());
    }
  }, [isOpen])

  return (
    <>
      <Modal
        className="detail-modal"
        title={<h1 className="">{isCreated ? "Create Newspaper" : "Update Newspaper"}</h1>}
        centered={true}
        open={isOpen}
        footer={null}
        onCancel={() => onClose(false)}
        width={1000}
      >
        <Form form={form} layout="vertical" name="form" initialValues={{...newspaper}} onFinish={onFinish}>
          <Avatar imageUrl={imageUrl} setImageUrl={setImageUrl}/>
          <Form.Item
            name="title"
            label="Newspaper Title"
            rules={[
              {
                required: true,
                message: 'Please input title!',
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="link"
            label="Newspaper Link"
            rules={[
              {
                required: true,
                message: 'Please input link!',
              },
              {
                type: "url",
                message: 'Incorrect Url Format!',
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="publisherId"
            label="Publisher"
            rules={[
              {
                required: true,
                message: 'Please select publisher!',
              }
            ]}
          >
            <Select placeholder="Select publisher">
              {
                publishers.map(item => {
                  return (<Option key={item._id} value={item._id}>{item.name}</Option>)
                })
              }
            </Select>
          </Form.Item>
          <Form.Item
            name="languages"
            label="Languages"
            rules={[
              {
                required: true,
                message: 'Please select language!',
              }
            ]}
          >
            <Select placeholder="Select language" mode="multiple">
              {
                languageList.map(item => {
                  return (<Option key={item} value={item}>{item}</Option>)
                })
              }
            </Select>
          </Form.Item>
          <Form.Item
            name="abstract"
            label="Abstract"
            rules={[
              {
                required: true,
                message: 'Please input abstract!',
              }
            ]}
          >
            <TextArea rows={4} />
          </Form.Item>
          <Form.Item className="button-group">
            <Button className="cancel-btn" size="large" onClick={() => onClose(false)}>Cancel</Button>
            <Button type="primary" size="large" htmlType="submit">
              {isCreated ? "Create Newspaper" : "Update Newspaper"}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default NewspaperEditModal;
