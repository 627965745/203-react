import React, { useState, useEffect } from "react";
import {
    Modal,
    Form,
    Input,
    Button,
    Space,
    message,
    Table,
    Alert,
    Tooltip,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import {
    componentCreateReferenceSample,
    componentUpdateReferenceSample,
    componentDeleteReferenceSample,
} from "../../api/referenceSample";
// V5: 含量/不确定度是 0~1 float，用「尾数 × 数量级」两段式录入
import ScientificInput from "../../components/ScientificInput";
import { formatScientific } from "../../utils/scientific";

// V5: 成分管理由 ReferenceMaterial 迁移到 ReferenceSample —— 相对 v4 的三点差异：
//     ① 主键字段 material_id → sample_id
//     ② 标准值字段 value → concentration
//     ③ concentration / uncertainty 统一为 0~1 的 float（最多 8 位小数）
const ComponentModal = ({ visible, onCancel, record, onSuccess }) => {
    const [form] = Form.useForm();
    const [addForm] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [editingKey, setEditingKey] = useState("");
    const [components, setComponents] = useState([]);

    useEffect(() => {
        if (visible && record) {
            setComponents(record.components || []);
            setEditingKey("");
            addForm.resetFields();
        }
    }, [visible, record]);

    const isEditing = (row) => row.component === editingKey;

    const edit = (row) => {
        form.setFieldsValue({
            // V5: 后端 DECIMAL 以字符串返回，进编辑框前转成数字
            concentration:
                row.concentration != null ? Number(row.concentration) : null,
            unit: row.unit,
            uncertainty: row.uncertainty != null ? Number(row.uncertainty) : null,
        });
        setEditingKey(row.component);
    };

    const cancel = () => setEditingKey("");

    const save = async (key) => {
        try {
            const row = await form.validateFields();
            setLoading(true);
            // V5: componentUpdate 请求 { sample_id, component, unit, concentration, uncertainty }
            //     含量/不确定度已由 ScientificInput 换算成 0~1 float，直接透传
            await componentUpdateReferenceSample({
                sample_id: record.id,
                component: key,
                ...row,
            });
            setComponents((prev) =>
                prev.map((item) =>
                    item.component === key ? { ...item, ...row } : item,
                ),
            );
            setEditingKey("");
            onSuccess?.();
            message.success("更新成功");
        } catch (errInfo) {
            if (errInfo?.errorFields) return;
            console.error("更新成分失败", errInfo);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (componentName) => {
        try {
            setLoading(true);
            // V5: componentDelete 请求 { sample_id, component }
            await componentDeleteReferenceSample({
                sample_id: record.id,
                component: componentName,
            });
            setComponents((prev) =>
                prev.filter((c) => c.component !== componentName),
            );
            onSuccess?.();
            message.success("删除成功");
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (values) => {
        if (components.some((c) => c.component === values.component)) {
            message.warning("该成分已存在，请直接编辑");
            return;
        }
        try {
            setLoading(true);
            // V5: componentCreate 请求 { sample_id, component, unit, concentration, uncertainty }
            //     含量/不确定度已由 ScientificInput 换算成 0~1 float，直接透传
            await componentCreateReferenceSample({
                sample_id: record.id,
                ...values,
            });
            setComponents((prev) => [...prev, values]);
            addForm.resetFields();
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
            title: "成分",
            dataIndex: "component",
            editable: false,
            width: 140,
            render: (v) => <span className="font-bold text-slate-700">{v}</span>,
        },
        {
            // V5: value → concentration，且统一为 0~1 float
            title: "浓度",
            dataIndex: "concentration",
            editable: true,
            width: 190,
            render: (v) => (
                <Tooltip title={v ?? "-"}>
                    <span className="cursor-help tabular-nums">
                        {formatScientific(v)}
                    </span>
                </Tooltip>
            ),
        },
        {
            title: "单位",
            dataIndex: "unit",
            editable: true,
            width: 110,
        },
        {
            // V5: 0~1 float
            title: "不确定度",
            dataIndex: "uncertainty",
            editable: true,
            width: 190,
            render: (v) => (
                <Tooltip title={v ?? "-"}>
                    <span className="cursor-help tabular-nums">
                        {formatScientific(v)}
                    </span>
                </Tooltip>
            ),
        },
        {
            title: "操作",
            dataIndex: "operation",
            width: 150,
            render: (_, row) =>
                isEditing(row) ? (
                    <Space>
                        <Button
                            type="link"
                            size="small"
                            onClick={() => save(row.component)}
                        >
                            保存
                        </Button>
                        <Button type="link" size="small" onClick={cancel}>
                            取消
                        </Button>
                    </Space>
                ) : (
                    <Space>
                        <Button
                            type="link"
                            size="small"
                            disabled={editingKey !== ""}
                            onClick={() => edit(row)}
                        >
                            编辑
                        </Button>
                        <Button
                            type="link"
                            size="small"
                            danger
                            disabled={editingKey !== ""}
                            onClick={() => handleDelete(row.component)}
                        >
                            删除
                        </Button>
                    </Space>
                ),
        },
    ];

    const EditableCell = ({
        editing,
        dataIndex,
        title,
        inputType,
        record: _row,
        index,
        children,
        ...restProps
    }) => {
        // V5: 含量/不确定度用两段式科学计数法输入，单位等文本字段仍是普通输入框
        const inputNode =
            inputType === "scientific" ? (
                <ScientificInput showActual />
            ) : (
                <Input />
            );
        return (
            <td {...restProps}>
                {editing ? (
                    <Form.Item
                        name={dataIndex}
                        style={{ margin: 0 }}
                        rules={[{ required: true, message: `请输入${title}` }]}
                    >
                        {inputNode}
                    </Form.Item>
                ) : (
                    children
                )}
            </td>
        );
    };

    const mergedColumns = columns.map((col) => {
        if (!col.editable) return col;
        return {
            ...col,
            onCell: (row) => ({
                record: row,
                inputType:
                    col.dataIndex === "concentration" ||
                    col.dataIndex === "uncertainty"
                        ? "scientific"
                        : "text",
                dataIndex: col.dataIndex,
                title: col.title,
                editing: isEditing(row),
            }),
        };
    });

    return (
        <Modal
            title={`成分含量表 - ${record?.name || ""}`}
            open={visible}
            onCancel={onCancel}
            footer={null}
            width={860}
            destroyOnHidden
        >
            {/* V5: 成分的主键是 (sample_id, component)，成分名不可重复且不可改名 */}
            <Alert
                type="info"
                showIcon
                className="mb-4 rounded-lg text-xs"
                message="成分名称是主键的一部分，添加后不可修改；如需改名请删除后重新添加。"
            />

            <div className="mb-6 border-b pb-4">
                <div className="font-bold mb-2 text-gray-700">添加新成分</div>
                {/* V5: 含量/不确定度改成「尾数 × 数量级」两段式后，一行 inline 排不下，
                    改为带标签的栅格布局 */}
                <Form layout="vertical" form={addForm} onFinish={handleAdd}>
                    <div className="grid grid-cols-2 gap-x-4">
                        <Form.Item
                            name="component"
                            label="成分"
                            rules={[{ required: true, message: "必填" }]}
                        >
                            <Input placeholder="如 Pb" />
                        </Form.Item>
                        <Form.Item
                            name="unit"
                            label="计量单位"
                            rules={[{ required: true, message: "必填" }]}
                        >
                            <Input placeholder="如 mg/kg" />
                        </Form.Item>
                        <Form.Item
                            name="concentration"
                            label="浓度"
                            rules={[
                                { required: true, message: "必填" },
                                {
                                    type: "number",
                                    min: 0,
                                    max: 1,
                                    message: "需在 0~1 之间",
                                },
                            ]}
                        >
                            <ScientificInput placeholder="浓度" showActual />
                        </Form.Item>
                        <Form.Item
                            name="uncertainty"
                            label="不确定度"
                            rules={[
                                { required: true, message: "必填" },
                                {
                                    type: "number",
                                    min: 0,
                                    max: 1,
                                    message: "需在 0~1 之间",
                                },
                            ]}
                        >
                            <ScientificInput placeholder="不确定度" showActual />
                        </Form.Item>
                    </div>
                    <Form.Item className="mb-0">
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            htmlType="submit"
                            loading={loading}
                        >
                            添加
                        </Button>
                    </Form.Item>
                </Form>
            </div>

            <Form form={form} component={false}>
                <Table
                    components={{ body: { cell: EditableCell } }}
                    bordered
                    dataSource={components}
                    columns={mergedColumns}
                    rowKey="component"
                    pagination={false}
                    loading={loading}
                    size="small"
                    // 编辑态每格是「尾数 + 数量级」两段控件，窄屏下不给最小宽度会被压扁
                    scroll={{ x: 760 }}
                />
            </Form>
        </Modal>
    );
};

export default ComponentModal;
