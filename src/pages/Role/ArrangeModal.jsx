import React, { useState, useEffect, useRef } from 'react';
import { Modal, Select, message, Spin, Button, Space } from 'antd';
import { comboUser } from '../../api/user';
import { userArrangeRole } from '../../api/role';

const ArrangeModal = ({ visible, onClose, record, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [users, setUsers] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    useEffect(() => {
        if (visible) {
            fetchUsers();
            if (record && record.users) {
                setSelectedIds(record.users.map(u => u.id));
            } else {
                setSelectedIds([]);
            }
        }
    }, [visible, record]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await comboUser();
            if (res.data.status === 0) {
                setUsers(res.data.data || []);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOk = async () => {
        setSubmitting(true);
        try {
            const res = await userArrangeRole({
                ids: [record.id],
                user_ids: selectedIds
            });
            if (res.data.status === 0) {
                message.success('关联用户成功');
                
                if (record) {
                    const newUsers = selectedIds.map(id => {
                        const existing = record.users?.find(u => u.id === id);
                        if (existing) return existing;
                        const src = users.find(u => u.id === id);
                        return { id, name: src?.name, nickname: src?.nickname };
                    });
                    record.users = newUsers;
                }
                
                if (onSuccess) onSuccess();
                onClose();
            } else {
                message.error(res.data.message || '关联失败');
            }
        } catch (e) {
            message.error('接口异常');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            title={record ? `关联用户 - ${record.name}` : '关联用户'}
            open={visible}
            onCancel={onClose}
            okText="确定"
            cancelText="取消"
            destroyOnHidden
            footer={
                <div className="flex justify-between w-full">
                    <Button danger onClick={() => setSelectedIds([])}>清空选择</Button>
                    <Space>
                        <Button onClick={onClose}>取消</Button>
                        <Button type="primary" loading={submitting} onClick={handleOk}>保存</Button>
                    </Space>
                </div>
            }
        >
            <div className="pt-4 pb-2">
                <div className="mb-2 text-gray-500">请选择具有此角色的用户（支持多选）：</div>
                {loading && users.length === 0 ? (
                    <div className="text-center py-4"><Spin size="small" /></div>
                ) : (
                    <Select
                        open={dropdownOpen}
                        onOpenChange={setDropdownOpen}
                        mode="multiple"
                        placeholder="下拉选择或搜索用户..."
                        value={selectedIds}
                        onChange={setSelectedIds}
                        style={{ width: '100%' }}
                        popupRender={(menu) => (
                            <>
                                {menu}
                                <div 
                                    className="p-2 border-t border-gray-100 bg-gray-50 flex justify-center"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}
                                >
                                    <Button 
                                        type="primary" 
                                        size="small" 
                                        className="w-full text-xs"
                                        onClick={() => setDropdownOpen(false)}
                                    >
                                        完成选择
                                    </Button>
                                </div>
                            </>
                        )}
                        filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        options={users.map(u => ({
                            label: u.nickname ? `${u.nickname} (${u.name})` : u.name,
                            value: u.id
                        }))}
                    />
                )}
            </div>
        </Modal>
    );
};

export default ArrangeModal;
