import React from 'react';
import moment from 'moment';
import { Modal, Tag } from 'antd';

import { colors } from '@constants/general';
import Avatar from '@components/Avatar';
import './styles.less';

type Props = {
  isOpen: boolean;
  onClose: (b: boolean) => void;
  newspaper: INewspaper;
};

const NewspaperDetailModal: React.FC<Props> = ({ isOpen, onClose, newspaper }) => {
  return (
    <>
      <Modal
        className="detail-modal"
        title={<h1 className="">{newspaper.title}</h1>}
        centered={true}
        open={isOpen}
        onCancel={() => onClose(false)}
        footer={null}
        width={1000}
      >
        <Avatar imageUrl={newspaper.image} setImageUrl={() => {}} />
        <div className="mb-4">
          <h2>Abstract</h2>
          <div className="text-left">{newspaper.abstract}</div>
        </div>
        <table className="detail-table">
          <tbody>
            <tr>
              <td className="title">Link</td>
              <td className="description">
                <div className="cursor-pointer">
                  <a
                    href={newspaper.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link"
                  >
                    {newspaper.link}
                  </a>
                </div>
              </td>
            </tr>
            <tr className="border-b border-gray-250">
              <td className="title">Publisher</td>
              <td className="description">{newspaper.publisher.name}</td>
            </tr>
            <tr className="border-b border-gray-250">
              <td className="title">Languages</td>
              <td className="description">
                {newspaper.languages &&
                  newspaper.languages.length &&
                  newspaper.languages.map(language => {
                    return (
                      <Tag key={language} color={colors[Math.floor(Math.random() * 10)]}>
                        {language}
                      </Tag>
                    );
                  })}
              </td>
            </tr>
            <tr className="border-b border-gray-250">
              <td className="title">Created At</td>
              <td className="description">
                {moment(newspaper.creation_date).format('YYYY/DD/MM')}
              </td>
            </tr>
          </tbody>
        </table>
      </Modal>
    </>
  );
};

export default NewspaperDetailModal;
