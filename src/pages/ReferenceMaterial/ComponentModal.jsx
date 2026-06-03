import React, { useState, useEffect } from "react";
import { Modal, Form, Input, InputNumber, Button, Space, message, Select, Table } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { componentCreateReferenceMaterial, componentUpdateReferenceMaterial, componentDeleteReferenceMaterial } from "../../api/referenceMaterial";

const ComponentModal = ({ visible, onCancel, record, onSuccess }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [editingKey, setEditingKey] = useState("");
    const [components, setComponents] = useState([]);

    useEffect(() => {
        if (visible && record) {
            setComponents(record.components || []);
        }
    }, [visible, record]);

    const isEditing = (record) => record.component === editingKey;

    const edit = (record) => {
        form.setFieldsValue({ ...record });
        setEditingKey(record.component);
    };

    const cancel = () => {
        setEditingKey("");
    };

    const save = async (key) => {
        try {
            const row = await form.validateFields();
            const newData = [...components];
            const index = newData.findIndex((item) => key === item.component);

            setLoading(true);
            if (index > -1) {
                // Update
                await componentUpdateReferenceMaterial({
                    material_id: record.id,
                    ...row,
                });
                const item = newData[index];
                newData.splice(index, 1, { ...item, ...row });
                setComponents(newData);
                setEditingKey("");
                onSuccess?.();
                message.success("更新成功");
            } else {
                // This case handles adding if I had a dedicated "Add" button that adds a temp row
                // But for now let's just use the "Create" logic
            }
        } catch (errInfo) {
            console.log("Validate Failed:", errInfo);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (componentName) => {
        try {
            setLoading(true);
            await componentDeleteReferenceMaterial({
                material_id: record.id,
                component: componentName
            });
            setComponents(components.filter(c => c.component !== componentName));
            onSuccess?.();
            message.success("删除成功");
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (values) => {
        try {
            setLoading(true);
            await componentCreateReferenceMaterial({
                material_id: record.id,
                ...values
            });
            setComponents([...components, values]);
            form.resetFields();
            onSuccess?.();
            message.success("添加成功");
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: "成分名称",
            dataIndex: "component",
            editable: true,
        },
        {
            title: "标准值",
            dataIndex: "value",
            editable: true,
            render: (v) => v ?? "-",
        },
        {
            title: "单位",
            dataIndex: "unit",
            editable: true,
        },
        {
            title: "不确定度",
            dataIndex: "uncertainty",
            editable: true,
            render: (v) => v ?? "-",
        },
        {
            title: "操作",
            dataIndex: "operation",
            render: (_, record) => {
                const editable = isEditing(record);
                return editable ? (
                    <Space>
                        <Button type="link" onClick={() => save(record.component)} size="small">保存</Button>
                        <Button type="link" onClick={cancel} size="small">取消</Button>
                    </Space>
                ) : (
                    <Space>
                        <Button type="link" disabled={editingKey !== ""} onClick={() => edit(record)} size="small">编辑</Button>
                        <Button type="link" danger onClick={() => handleDelete(record.component)} size="small">删除</Button>
                    </Space>
                );
            },
        },
    ];

    const mergedColumns = columns.map((col) => {
        if (!col.editable) {
            return col;
        }
        return {
            ...col,
            onCell: (record) => ({
                record,
                inputType: (col.dataIndex === "value" || col.dataIndex === "uncertainty") ? "number" : "text",
                dataIndex: col.dataIndex,
                title: col.title,
                editing: isEditing(record),
            }),
        };
    });

    const EditableCell = ({
        editing,
        dataIndex,
        title,
        inputType,
        record,
        index,
        children,
        ...restProps
    }) => {
        const inputNode = inputType === "number" ? <InputNumber className="w-full" /> : <Input />;
        return (
            <td {...restProps}>
                {editing ? (
                    <Form.Item
                        name={dataIndex}
                        style={{ margin: 0 }}
                        rules={[{ required: true, message: `请输入 ${title}!` }]}
                    >
                        {inputNode}
                    </Form.Item>
                ) : (
                    children
                )}
            </td>
        );
    };

    return (
        <Modal
            title={`成分管理 - ${record?.name}`}
            open={visible}
            onCancel={onCancel}
            okText="确定"
            cancelText="取消"
            footer={null}
            width={800}
        >
            <div className="mb-6 border-b pb-4">
                <div className="font-bold mb-2 text-gray-700">添加新成分</div>
                <Form layout="inline" onFinish={handleAdd}>
                    <Form.Item name="component" rules={[{ required: true, message: "必填" }]}>
                        <Input placeholder="成分名称" />
                    </Form.Item>
                    <Form.Item name="value" rules={[{ required: true, message: "必填" }]}>
                        <InputNumber placeholder="标准值" />
                    </Form.Item>
                    <Form.Item name="unit" rules={[{ required: true, message: "必填" }]}>
                        <Input placeholder="单位" />
                    </Form.Item>
                    <Form.Item name="uncertainty" rules={[{ required: true, message: "必填" }]}>
                        <InputNumber placeholder="不确定度" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" icon={<PlusOutlined />} htmlType="submit" loading={loading}>
                            添加
                        </Button>
                    </Form.Item>
                </Form>
            </div>

            <Form form={form} component={false}>
                <Table
                    components={{
                        body: {
                            cell: EditableCell,
                        },
                    }}
                    bordered
                    dataSource={components}
                    columns={mergedColumns}
                    rowKey="component"
                    pagination={false}
                    loading={loading}
                    size="small"
                />
            </Form>
        </Modal>
    );
};

export default ComponentModal;
