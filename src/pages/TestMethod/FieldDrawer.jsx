import React, { useState, useEffect } from 'react';
import { Drawer, Button, Table, Space, Popconfirm, Tag, message, Modal } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { fieldDeleteTestMethod, fieldCreateTestMethod, fieldUpdateTestMethod, fieldTestMethod, readTestMethod } from '../../api/testMethod';
import FieldAddEdit from './FieldAddEdit';

const SCOPES = {
    0: { text: '公共参数', color: 'cyan' },
    1: { text: '结果字段', color: 'purple' }
};

const DATA_TYPES = {
    0: { text: '文本', color: 'default' },
    1: { text: '数值', color: 'blue' },
    2: { text: '日期', color: 'orange' }
};

const SOURCE_TYPES = {
    0: { text: '手动录入', color: 'default' },
    1: { text: '输入映射', color: 'cyan' },
    2: { text: '固定值', color: 'magenta' },
    3: { text: '设备采集', color: 'volcano' },
    4: { text: '代码计算', color: 'geekblue' }
};

const FieldDrawer = ({ visible, onClose, methodRecord, onSuccess }) => {
    const [fields, setFields] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingField, setEditingField] = useState({ 
        enabled: 1, 
        is_required: 0,
        scope: 0,
        data_type: 0,
        source_type: 0,
        sort: 0 
    });

    useEffect(() => {
        if (visible && methodRecord) {
            const sortedFields = [...(methodRecord.fields || [])].sort((a, b) => a.sort - b.sort);
            setFields(sortedFields);
        }
    }, [visible, methodRecord?.id, methodRecord?.fields]);

    const handleUpdateLocalRecord = (newFields) => {
        const sorted = [...newFields].sort((a, b) => a.sort - b.sort);
        setFields(sorted);
    };

    const handleDelete = async (id) => {
        try {
            const res = await fieldDeleteTestMethod({ id });
            if (res.data.code === 0 || res.data.status === 0) {
                message.success('字段删除成功');
                handleUpdateLocalRecord(fields.filter(f => f.id !== id));
                if (onSuccess) onSuccess();
            } else {
                message.error(res.data.message || '删除失败');
            }
        } catch (e) {
            message.error('删除接口异常');
        }
    };

    const handleAdd = () => {
        let nextSort = 0;
        if (fields && fields.length > 0) {
            nextSort = Math.max(...fields.map(f => f.sort || 0)) + 1;
        }
        setEditingField({ 
            enabled: 1, 
            is_required: 0,
            scope: 0,
            data_type: 0,
            source_type: 0,
            sort: nextSort 
        });
        setModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingField({ ...record });
        setModalVisible(true);
    };

    const handleModalOk = async () => {
        if (typeof editingField.validate === 'function' && !editingField.validate()) {
            return;
        }

        try {
            const payload = { ...editingField, method_id: methodRecord.id };
            
            // Clean up invalid properties depending on source_type
            if (payload.source_type === 0) {
                payload.input_mapped_from = null;
                payload.fixed_value = null;
                payload.device_api = null;
                payload.code = null;
            } else if (payload.source_type === 1) {
                payload.fixed_value = null;
                payload.device_api = null;
                payload.code = null;
            } else if (payload.source_type === 2) {
                payload.input_mapped_from = null;
                payload.device_api = null;
                payload.code = null;
            } else if (payload.source_type === 3) {
                payload.input_mapped_from = null;
                payload.fixed_value = null;
                payload.code = null;
            } else if (payload.source_type === 4) {
                payload.input_mapped_from = null;
                payload.fixed_value = null;
                payload.device_api = null;
            }

            const apiCall = payload.id ? fieldUpdateTestMethod : fieldCreateTestMethod;
            const res = await apiCall(payload);

            if (res.data.code === 0 || res.data.status === 0) {
                message.success(payload.id ? '字段更新成功' : '字段创建成功');
                setModalVisible(false);
                
                const updatedList = [...fields];
                if (payload.id) {
                    const idx = updatedList.findIndex(f => f.id === payload.id);
                    if (idx > -1) {
                        updatedList[idx] = { ...updatedList[idx], ...payload };
                    }
                } else {
                    // Try to get ID from response, otherwise use a temporary ID
                    // If onSuccess triggers a parent refresh, this temp ID will be replaced by the real one from props
                    const responseId = typeof res.data.data === 'object' ? res.data.data?.id : res.data.data;
                    const newId = responseId || `temp_${Date.now()}`;
                    updatedList.push({ ...payload, id: newId });
                }
                handleUpdateLocalRecord(updatedList);
                if (onSuccess) onSuccess();
            } else {
                message.error(res.data.message || (payload.id ? '更新失败' : '创建失败'));
            }
        } catch (e) {
            message.error('接口异常');
        }
    };

    const columns = [
        {
            title: '排序',
            dataIndex: 'sort',
            width: 70,
            align: 'center',
            render: text => <span className="text-gray-500">{text}</span>
        },
        {
            title: '字段键名',
            dataIndex: 'key',
            width: 120,
            render: text => <code className="bg-gray-100 p-1 px-2 rounded text-xs">{text}</code>
        },
        {
            title: '字段名称',
            dataIndex: 'name',
            width: 150,
            render: text => <span className="font-bold">{text}</span>
        },
        {
            title: '作用域',
            dataIndex: 'scope',
            width: 100,
            render: (scope) => {
                const config = SCOPES[scope] || { text: '未知', color: 'default' };
                return <Tag color={config.color}>{config.text}</Tag>;
            }
        },
        {
            title: '类型',
            dataIndex: 'data_type',
            width: 80,
            render: (type) => {
                const config = DATA_TYPES[type] || { text: '未知', color: 'default' };
                return <Tag color={config.color} className="m-0 border-none">{config.text}</Tag>;
            }
        },
        {
            title: '来源及配置',
            key: 'source',
            width: 220,
            render: (_, record) => {
                const config = SOURCE_TYPES[record.source_type] || { text: '未知' };
                let detail = '';
                if (record.source_type === 1) detail = record.input_mapped_from;
                if (record.source_type === 2) detail = record.fixed_value;
                if (record.source_type === 3) detail = record.device_api;
                if (record.source_type === 4) detail = '/* 代码段 */';

                return (
                    <div className="flex flex-col text-xs">
                        <span className="text-gray-500 font-semibold mb-1">[{config.text}]</span>
                        {detail && <span className="text-blue-500 truncate" title={detail}>{detail}</span>}
                    </div>
                );
            }
        },
        {
            title: '必填/启用',
            key: 'status',
            width: 100,
            align: 'center',
            render: (_, record) => (
                <Space orientation="vertical" size="small" className="text-xs">
                    <Tag color={record.is_required === 1 ? 'error' : 'default'} className="m-0">
                        {record.is_required === 1 ? '必填' : '选填'}
                    </Tag>
                    <Tag color={record.enabled === 1 ? 'success' : 'default'} className="m-0">
                        {record.enabled === 1 ? '启用' : '禁用'}
                    </Tag>
                </Space>
            )
        },
        {
            title: '操作',
            key: 'action',
            width: 140,
            render: (_, record) => (
                <Space size="small">
                    <Button type="link" size="small" onClick={() => handleEdit(record)} icon={<EditOutlined className="text-blue-500" />}>
                        编辑
                    </Button>
                    <Popconfirm
                        title="确认删除该字段？"
                        onConfirm={() => handleDelete(record.id)}
                        okText="确定"
                        cancelText="取消"
                    >
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                            删除
                        </Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <>
            <Drawer
                title={methodRecord ? `参数字段管理 - ${methodRecord.name}` : '参数字段管理'}
                size="large"
                placement="right"
                onClose={onClose}
                open={visible}
                destroyOnHidden
            >
                <div className="mb-4">
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                        新增参数字段
                    </Button>
                </div>
                <Table
                    columns={columns}
                    dataSource={fields}
                    rowKey="id"
                    pagination={false}
                    size="middle"
                    bordered
                />
            </Drawer>

            <Modal
                title={editingField?.id ? '编辑参数字段' : '新增参数字段'}
                open={modalVisible}
                onOk={handleModalOk}
                onCancel={() => setModalVisible(false)}
                okText="确定"
                cancelText="取消"
                destroyOnHidden
                width={700}
            >
                <div className="pt-4">
                    <FieldAddEdit
                        record={editingField}
                        onChange={setEditingField}
                    />
                </div>
            </Modal>
        </>
    );
};

export default FieldDrawer;
