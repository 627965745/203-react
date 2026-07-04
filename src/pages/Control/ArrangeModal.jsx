import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Select, message, Spin, Button, Space } from 'antd';
import { comboRole } from '../../api/role';
import { arrangeControl } from '../../api/control';

const ArrangeModal = ({ visible, onClose, record, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [roles, setRoles] = useState([]);
    const [selectedRoleIds, setSelectedRoleIds] = useState([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    useEffect(() => {
        if (visible) {
            fetchRoles();
            if (record && record.roles) {
                setSelectedRoleIds(record.roles.map(r => r.id));
            } else {
                setSelectedRoleIds([]);
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
        } catch (e) {
            message.error('获取角色列表失败');
        } finally {
            setLoading(false);
        }
    };

    const handleOk = async () => {
        setSubmitting(true);
        try {
            const getAllIds = (node) => {
                let ids = [node.id];
                if (node.children && node.children.length > 0) {
                    node.children.forEach(child => {
                        ids = ids.concat(getAllIds(child));
                    });
                }
                return ids;
            };
            
            const allIds = getAllIds(record);

            const res = await arrangeControl({
                ids: allIds,
                role_ids: selectedRoleIds
            });
            if (res.data.status === 0) {
                message.success('分配角色权限成功');
                if (onSuccess) onSuccess();
                onClose();
            } else {
                message.error(res.data.message || '操作失败');
            }
        } catch (e) {
            message.error('接口异常');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            title={record ? `分配权限 - ${record.name}` : '分配权限'}
            open={visible}
            onCancel={onClose}
            okText="确定"
            cancelText="取消"
            destroyOnHidden
            width={500}
            footer={
                <div className="flex justify-between w-full">
                    <Button danger onClick={() => setSelectedRoleIds([])}>清空</Button>
                    <Space>
                        <Button onClick={onClose}>取消</Button>
                        <Button type="primary" loading={submitting} onClick={handleOk}>保存</Button>
                    </Space>
                </div>
            }
        >
            <div className="pt-4 pb-2">
                <div className="mb-2 text-gray-500 font-medium">请选择由此菜单/权限项的角色：</div>
                {loading && roles.length === 0 ? (
                    <div className="text-center py-6"><Spin /></div>
                ) : (
                    <Select
                        open={dropdownOpen}
                        onOpenChange={setDropdownOpen}
                        mode="multiple"
                        placeholder="选择角色..."
                        value={selectedRoleIds}
                        onChange={setSelectedRoleIds}
                        style={{ width: '100%' }}
                        popupRender={(menu) => (
                            <div className="p-1">
                                {menu}
                                <div className="p-2 pt-1 border-t border-gray-50 flex justify-center sticky bottom-0 bg-white">
                                    <Button type="primary" className="w-full text-xs" size="small" onClick={() => setDropdownOpen(false)}>
                                        完成选择
                                    </Button>
                                </div>
                            </div>
                        )}
                        filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        options={roles.map(r => ({ label: r.name, value: r.id }))}
                    />
                )}
            </div>
        </Modal>
    );
};

export default ArrangeModal;
