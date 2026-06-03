import React, { useState, useEffect, useRef } from 'react';
import { Modal, Select, message, Spin, Button, Space } from 'antd';
import { comboRole } from '../../api/role';
import { arrangeUser } from '../../api/user';

const ArrangeModal = ({ visible, onClose, record, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [roles, setRoles] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    useEffect(() => {
        if (visible) {
            fetchRoles();
            if (record && record.roles) {
                setSelectedIds(record.roles.map(r => r.id));
            } else {
                setSelectedIds([]);
            }
        }
    }, [visible, record]);

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const res = await comboRole();
            if (res.data.status === 0) {
                setRoles(res.data.data || []);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOk = async () => {
        setSubmitting(true);
        try {
            const res = await arrangeUser({
                ids: [record.id],
                role_ids: selectedIds
            });
            if (res.data.status === 0) {
                message.success('分配角色成功');
                
                if (record) {
                    const newRoles = selectedIds.map(id => {
                        const existing = record.roles?.find(r => r.id === id);
                        if (existing) return existing;
                        const src = roles.find(r => r.id === id);
                        return { id, name: src?.name };
                    });
                    record.roles = newRoles;
                }
                
                if (onSuccess) onSuccess();
                onClose();
            } else {
                message.error(res.data.message || '分配失败');
            }
        } catch (e) {
            message.error('接口异常');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            title={record ? `分配角色 - ${record.nickname} (${record.name})` : '分配角色'}
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
                <div className="mb-2 text-gray-500">请为用户分配系统角色（支持多选）：</div>
                {loading && roles.length === 0 ? (
                    <div className="text-center py-4"><Spin size="small" /></div>
                ) : (
                    <Select
                        open={dropdownOpen}
                        onOpenChange={setDropdownOpen}
                        mode="multiple"
                        placeholder="下拉选择或搜索角色..."
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
                        options={roles.map(r => ({
                            label: r.name,
                            value: r.id
                        }))}
                    />
                )}
            </div>
        </Modal>
    );
};

export default ArrangeModal;
