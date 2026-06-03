import React, { useState, useEffect, useRef } from 'react';
import { Modal, Select, message, Spin, Button, Space } from 'antd';
import { comboTestMethod } from '../../api/testMethod';
import { arrangeTestItem } from '../../api/testItem';

const ArrangeModal = ({ visible, onClose, record, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [methods, setMethods] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    useEffect(() => {
        if (visible) {
            fetchMethods();
            if (record && record.methods) {
                setSelectedIds(record.methods.map(m => m.id));
            } else {
                setSelectedIds([]);
            }
        }
    }, [visible, record]);

    const fetchMethods = async () => {
        setLoading(true);
        try {
            const res = await comboTestMethod();
            if (res.data.status === 0) {
                setMethods(res.data.data || []);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOk = async () => {
        setSubmitting(true);
        try {
            const res = await arrangeTestItem({
                ids: [record.id],
                method_ids: selectedIds
            });
            if (res.data.status === 0) {
                message.success('关联方法成功');
                
                if (record) {
                    const newMethods = selectedIds.map(id => {
                        const existing = record.methods?.find(m => m.id === id);
                        if (existing) return existing;
                        const src = methods.find(m => m.id === id);
                        return { id, name: src?.name, code: src?.code };
                    });
                    record.methods = newMethods;
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
            title={record ? `关联检测方法 - ${record.name}` : '关联检测方法'}
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
                <div className="mb-2 text-gray-500">请选择适用的检测方法（支持多选）：</div>
                {loading && methods.length === 0 ? (
                    <div className="text-center py-4"><Spin size="small" /></div>
                ) : (
                    <Select
                        open={dropdownOpen}
                        onOpenChange={setDropdownOpen}
                        mode="multiple"
                        placeholder="下拉选择或搜索..."
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
                        options={methods.map(m => ({
                            label: m.code ? `${m.name} (${m.code})` : m.name,
                            value: m.id
                        }))}
                    />
                )}
            </div>
        </Modal>
    );
};

export default ArrangeModal;
