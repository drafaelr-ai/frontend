import React from 'react';
import Modal from './Modal';

const ModalView = ({ isOpen, onClose, title, subtitle, width = 'default', children }) => (
    <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        subtitle={subtitle}
        width={width}
        footer={
            <button className="m-btn-primary" onClick={onClose}>
                <i className="ti ti-x" aria-hidden="true"></i>
                Fechar
            </button>
        }
    >
        {children}
    </Modal>
);

export default ModalView;
