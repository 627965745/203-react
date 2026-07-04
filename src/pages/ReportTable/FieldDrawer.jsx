import React, { useState, useEffect } from "react";
import {
    Drawer,
    Button,
    Table,
    Space,
    Popconfirm,
    Tag,
    message,
    Modal,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import {
    fieldDeleteReportTable,
    fieldCreateReportTable,
    fieldUpdateReportTable,
} from "../../api/reportTable";
import FieldAddEdit from "./FieldAddEdit";

const FIELD_TYPES = {
    0: { text: "手动录入", color: "blue" },
    1: { text: "输入数据映射", color: "cyan" },
    2: { text: "检测结果映射", color: "purple" },
    3: { text: "固定值", color: "default" },
};

const FieldDrawer = ({ visible, onClose, tableRecord, onSuccess }) => {
    const [fields, setFields] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingField, setEditingField] = useState({
        enabled: 1,
        type: 0,
        sort: 0,
    });

    useEffect(() => {
        if (visible && tableRecord) {
            const sortedFields = [...(tableRecord.fields || [])].sort(
                (a, b) => a.sort - b.sort,
            );
            setFields(sortedFields);
        }
    }, [visible, tableRecord?.id, tableRecord?.fields]);

    const handleUpdateLocalRecord = (newFields) => {
        const sorted = [...newFields].sort((a, b) => a.sort - b.sort);
        setFields(sorted);
    };

    const handleDelete = async (id) => {
        try {
            const res = await fieldDeleteReportTable({ id });
            if (res.data.status === 0) {
                message.success("字段删除成功");
                handleUpdateLocalRecord(fields.filter((f) => f.id !== id));
                if (onSuccess) onSuccess();
            } else {
                message.error(res.data.message || "删除失败");
            }
        } catch (e) {
            message.error("删除接口异常");
        }
    };

    const handleAdd = () => {
        // Find max sort and add 1
        let nextSort = 0;
        if (fields && fields.length > 0) {
            nextSort = Math.max(...fields.map((f) => f.sort || 0)) + 1;
        }
        setEditingField({ enabled: 1, type: 0, sort: nextSort });
        setModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingField({ ...record });
        setModalVisible(true);
    };

    const handleModalOk = async () => {
        if (
            typeof editingField.validate === "function" &&
            !editingField.validate()
        ) {
            return;
        }

        try {
            const payload = { ...editingField, table_id: tableRecord.id };

            // Clean up invalid properties depending on type
            if (payload.type === 0) {
                payload.input_mapped_from = null;
                payload.result_mapped_from = null;
                payload.fixed_value = null;
            } else if (payload.type === 1) {
                payload.result_mapped_from = null;
                payload.fixed_value = null;
            } else if (payload.type === 2) {
                payload.input_mapped_from = null;
                payload.fixed_value = null;
            } else if (payload.type === 3) {
                payload.input_mapped_from = null;
                payload.result_mapped_from = null;
            }

            const apiCall = payload.id
                ? fieldUpdateReportTable
                : fieldCreateReportTable;
            const res = await apiCall(payload);

            if (res.data.status === 0) {
                message.success(payload.id ? "字段更新成功" : "字段创建成功");
                setModalVisible(false);

                const updatedList = [...fields];
                if (payload.id) {
                    const idx = updatedList.findIndex(
                        (f) => f.id === payload.id,
                    );
                    if (idx > -1) {
                        updatedList[idx] = { ...updatedList[idx], ...payload };
                    }
                } else {
                    // Try to get ID from response, otherwise use a temporary ID
                    // If onSuccess triggers a parent refresh, this temp ID will be replaced by the real one from props
                    const responseId =
                        typeof res.data.data === "object"
                            ? res.data.data?.id
                            : res.data.data;
                    const newId = responseId || `temp_${Date.now()}`;
                    updatedList.push({ ...payload, id: newId });
                }
                handleUpdateLocalRecord(updatedList);
                if (onSuccess) onSuccess();
            } else {
                message.error(
                    res.data.message || (payload.id ? "更新失败" : "创建失败"),
                );
            }
        } catch (e) {
            message.error("接口异常");
        }
    };

    const columns = [
        {
            title: "排序号",
            dataIndex: "sort",
            width: 80,
            align: "center",
            render: (text) => <span className="text-gray-500">{text}</span>,
        },
        {
            title: "字段名称",
            dataIndex: "name",
            width: 150,
            render: (text) => <span className="font-bold">{text}</span>,
        },
        {
            title: "类型",
            dataIndex: "type",
            width: 120,
            render: (type) => {
                const typeConfig = FIELD_TYPES[type] || {
                    text: "未知",
                    color: "default",
                };
                return <Tag color={typeConfig.color}>{typeConfig.text}</Tag>;
            },
        },
        {
            title: "来源/固定值",
            key: "source",
            width: 200,
            render: (_, record) => {
                if (record.type === 1)
                    return (
                        <span className="text-gray-600">
                            映射: {record.input_mapped_from}
                        </span>
                    );
                if (record.type === 2)
                    return (
                        <span className="text-gray-600">
                            结果: {record.result_mapped_from}
                        </span>
                    );
                if (record.type === 3)
                    return (
                        <span className="text-gray-800 font-bold">
                            "{record.fixed_value}"
                        </span>
                    );
                return <span className="text-gray-400">-</span>;
            },
        },
        {
            title: "状态",
            dataIndex: "enabled",
            width: 80,
            render: (enabled) => (
                <Tag color={enabled === 1 ? "success" : "error"}>
                    {enabled === 1 ? "启用" : "禁用"}
                </Tag>
            ),
        },
        {
            title: "操作",
            key: "action",
            width: 150,
            render: (_, record) => (
                <Space size="small">
                    <Button
                        type="link"
                        size="small"
                        onClick={() => handleEdit(record)}
                        icon={<EditOutlined className="text-blue-500" />}
                    >
                        编辑
                    </Button>
                    <Popconfirm
                        title="确认删除该字段？"
                        onConfirm={() => handleDelete(record.id)}
                        okText="确定"
                        cancelText="取消"
                    >
                        <Button
                            type="link"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                        >
                            删除
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <>
            <Drawer
                title={
                    tableRecord
                        ? `数据表字段管理 - ${tableRecord.name}`
                        : "数据表字段管理"
                }
                size="large"
                placement="right"
                onClose={onClose}
                open={visible}
                destroyOnHidden
            >
                <div className="mb-4">
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAdd}
                    >
                        新增字段
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
                title={editingField?.id ? "编辑字段" : "新增字段"}
                open={modalVisible}
                onOk={handleModalOk}
                onCancel={() => setModalVisible(false)}
                okText="确定"
                cancelText="取消"
                destroyOnHidden
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
