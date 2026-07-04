import { useState, useMemo } from "react";
import {
    Tag,
    Switch,
    message,
    Button,
    Space,
    Modal,
    Form,
    Input,
    Popconfirm,
} from "antd";
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    OrderedListOutlined,
} from "@ant-design/icons";
import CrudTable from "../../components/CrudTable";
import {
    readProcessingMethod,
    createProcessingMethod,
    updateProcessingMethod,
    deleteProcessingMethod,
    createProcessingOption,
    updateProcessingOption,
    deleteProcessingOption,
} from "../../api/processingMethod";
import AddEdit from "./AddEdit";

const ProcessingMethodList = () => {
    const [refreshKey, setRefreshKey] = useState(0);
    const [optionModal, setOptionModal] = useState({
        visible: false,
        method: null,
        option: null,
    });
    const [form] = Form.useForm();

    const api = useMemo(
        () => ({
            read: readProcessingMethod,
            create: createProcessingMethod,
            update: updateProcessingMethod,
            delete: deleteProcessingMethod,
        }),
        [],
    );

    const handleSwitchEnabled = async (record, checked) => {
        try {
            const res = await updateProcessingMethod({
                ...record,
                enabled: checked ? 1 : 0,
            });
            if (res.data.status === 0) {
                message.success(`${checked ? "启用" : "禁用"}成功`);
                setRefreshKey((prev) => prev + 1);
            } else {
                message.error(res.data.message || "状态更新失败");
            }
        } catch (err) {
            message.error("状态更新异常");
        }
    };

    const handleOptionSubmit = async (values) => {
        try {
            const isEdit = !!optionModal.option;
            const payload = {
                ...values,
                enabled: values.enabled ? 1 : 0,
                method_id: optionModal.method.id,
                id: isEdit ? optionModal.option.id : undefined,
            };
            const api = isEdit
                ? updateProcessingOption
                : createProcessingOption;
            const res = await api(payload);
            if (res.data.status === 0) {
                message.success(isEdit ? "更新选项成功" : "添加选项成功");
                setOptionModal({ visible: false, method: null, option: null });
                form.resetFields();
                setRefreshKey((prev) => prev + 1);
            } else {
                message.error(res.data.message || "操作失败");
            }
        } catch (err) {
            message.error("提交异常");
        }
    };

    const handleOptionDelete = (id) => {
        Modal.confirm({
            title: "确认删除该选项？",
            okText: "确定",
            cancelText: "取消",
            onOk: async () => {
                try {
                    const res = await deleteProcessingOption({ id });
                    if (res.data.status === 0) {
                        message.success("删除选项成功");
                        setRefreshKey((prev) => prev + 1);
                    }
                } catch (err) {
                    message.error("删除失败");
                }
            },
        });
    };

    const columns = [
        {
            title: "序号",
            dataIndex: "id",
            width: "10%",
            align: "center",
            render: (id) => (
                <span className="text-gray-400 font-mono">{id}</span>
            ),
        },
        {
            title: "加工方法名称",
            dataIndex: "name",
            width: "25%",
            render: (text) => (
                <span className="font-bold text-indigo-600 text-[15px]">
                    {text}
                </span>
            ),
        },
        {
            title: "加工选项（点击选项可编辑，点击x删除）",
            key: "optionsList",
            width: "45%",
            render: (_, record) => (
                <Space size={[4, 8]} wrap>
                    {record.options?.map((opt) => (
                        <Tag
                            key={opt.id}
                            color={opt.enabled === 1 ? "blue" : "default"}
                            closable
                            onClose={(e) => {
                                e.preventDefault();
                                handleOptionDelete(opt.id);
                            }}
                            className="cursor-pointer transition-opacity hover:opacity-80 m-0"
                            onClick={() => {
                                setOptionModal({
                                    visible: true,
                                    method: record,
                                    option: opt,
                                });
                                form.setFieldsValue({
                                    value: opt.value,
                                    enabled: opt.enabled === 1,
                                });
                            }}
                        >
                            {opt.value}
                        </Tag>
                    ))}
                    <Tag
                        onClick={() => {
                            setOptionModal({
                                visible: true,
                                method: record,
                                option: null,
                            });
                            form.setFieldsValue({ value: "", enabled: true });
                        }}
                        className="bg-gray-50 border-dashed border-gray-300 cursor-pointer hover:border-blue-400 hover:text-blue-500 transition-colors m-0"
                    >
                        <PlusOutlined /> 添加选项
                    </Tag>
                </Space>
            ),
        },
        {
            title: "启用状态",
            dataIndex: "enabled",
            width: "20%",
            align: "center",
            render: (val, record) => (
                <Switch
                    checked={val === 1}
                    size="small"
                    onChange={(checked) => handleSwitchEnabled(record, checked)}
                />
            ),
        },
    ];

    return (
        <>
            <CrudTable
                refreshKey={refreshKey}
                title="加工方法管理"
                entityName="加工方法"
                columns={columns}
                api={api}
                AddEditForm={AddEdit}
                initialValues={{
                    name: "",
                    enabled: 1,
                }}
                modalWidth={500}
            />

            <Modal
                title={optionModal.option ? "更新加工选项" : "添加加工选项"}
                open={optionModal.visible}
                onCancel={() =>
                    setOptionModal({
                        visible: false,
                        method: null,
                        option: null,
                    })
                }
                cancelText="取消"
                okText="确认"
                onOk={() => form.submit()}
                width={400}
                destroyOnHidden
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleOptionSubmit}
                    className="pt-4"
                >
                    <Form.Item label="所属方法" className="mb-4">
                        <Tag color="cyan" className="m-0">
                            {optionModal.method?.name}
                        </Tag>
                    </Form.Item>
                    {optionModal.method?.options &&
                        optionModal.method.options.length > 0 && (
                            <Form.Item label="已有选项" className="mb-4">
                                <Space size={[4, 8]} wrap>
                                    {optionModal.method.options.map((opt) => (
                                        <Tag
                                            key={opt.id}
                                            color={
                                                opt.enabled === 1
                                                    ? "blue"
                                                    : "default"
                                            }
                                        >
                                            {opt.value}
                                        </Tag>
                                    ))}
                                </Space>
                            </Form.Item>
                        )}
                    <Form.Item
                        label="选项值"
                        name="value"
                        rules={[{ required: true, message: "请输入选项值" }]}
                    >
                        <Input
                            placeholder="例如: 平口, 螺纹..."
                            maxLength={255}
                        />
                    </Form.Item>
                    <Form.Item
                        label="状态"
                        name="enabled"
                        valuePropName="checked"
                    >
                        <Switch
                            checkedChildren="启用"
                            unCheckedChildren="禁用"
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default ProcessingMethodList;
