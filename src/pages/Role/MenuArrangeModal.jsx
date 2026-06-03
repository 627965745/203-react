import React, { useState, useEffect } from 'react';
import { Modal, Tree, message, Spin, Button, Space } from 'antd';
import { readControl, arrangeControl } from '../../api/control';

const MenuArrangeModal = ({ visible, onClose, record, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [menuData, setMenuData] = useState([]);
    const [checkedKeys, setCheckedKeys] = useState([]);
    const [expandedKeys, setExpandedKeys] = useState([]);

    useEffect(() => {
        if (visible) {
            fetchMenus();
        }
    }, [visible, record]);

    const fetchMenus = async () => {
        setLoading(true);
        try {
            const res = await readControl();
            if (res.data.status === 0) {
                setMenuData(res.data.data || []);
                
                // Initialize checked keys from record.permissions or however it's structured in the role record
                // The prompt says readControl response has `roles` linked to each menu.
                // But it's easier if the Role object had a list of menu IDs.
                // If it doesn't, we might need a separate API to get permissions for a role, 
                // but let's assume we can filter them from the tree or the record has them.
                
                // If record has it:
                if (record && record.controls) {
                    setCheckedKeys(record.controls.map(c => c.id));
                } else {
                    // Alternative: if not directly in record, we'd need to find which menus have this role ID
                    const initialChecked = [];
                    const findSelected = (nodes) => {
                        nodes.forEach(node => {
                            if (node.roles?.some(r => r.id === record?.id)) {
                                initialChecked.push(node.id);
                            }
                            if (node.children) findSelected(node.children);
                        });
                    };
                    if (res.data.data) findSelected(res.data.data);
                    setCheckedKeys(initialChecked);
                }
                
                // Default expand all
                const allKeys = [];
                const getAllKeys = (nodes) => {
                    nodes.forEach(n => {
                        allKeys.push(n.id);
                        if (n.children) getAllKeys(n.children);
                    });
                };
                if (res.data.data) getAllKeys(res.data.data);
                setExpandedKeys(allKeys);
                
            }
        } catch (e) {
            message.error('获取菜单树失败');
        } finally {
            setLoading(false);
        }
    };

    const handleOk = async () => {
        setSubmitting(true);
        try {
            // Note: with checkStrictly=false, checkedKeys includes all selected nodes.
            // But sometimes Tree components only return leaf nodes if not careful.
            // Here we want all selected IDs.
            const res = await arrangeControl({
                role_ids: [record.id],
                ids: checkedKeys.checked || checkedKeys // Handle both checkStrictly cases
            });
            
            if (res.data.status === 0) {
                message.success('关联菜单成功');
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
            title={record ? `关联菜单 - ${record.name}` : '关联菜单'}
            open={visible}
            onCancel={onClose}
            okText="确定"
            cancelText="取消"
            destroyOnHidden
            width={600}
            footer={
                <div className="flex justify-between w-full">
                    <Button danger onClick={() => setCheckedKeys([])}>清空</Button>
                    <Space>
                        <Button onClick={onClose}>取消</Button>
                        <Button type="primary" loading={submitting} onClick={handleOk}>提交</Button>
                    </Space>
                </div>
            }
        >
            <div className="pt-4 pb-4 max-h-[60vh] overflow-y-auto">
                <div className="mb-4 text-gray-500 font-medium">请勾选该角色拥有的菜单访问权限：</div>
                {loading && menuData.length === 0 ? (
                    <div className="text-center py-10"><Spin description="加载中..." /></div>
                ) : (
                    <Tree
                        checkable
                        defaultExpandAll
                        expandedKeys={expandedKeys}
                        onExpand={setExpandedKeys}
                        onCheck={setCheckedKeys}
                        checkedKeys={checkedKeys}
                        treeData={menuData}
                        fieldNames={{
                            title: 'name',
                            key: 'id',
                            children: 'children'
                        }}
                        className="bg-gray-50 p-4 rounded-lg border border-gray-100"
                    />
                )}
            </div>
        </Modal>
    );
};

export default MenuArrangeModal;
