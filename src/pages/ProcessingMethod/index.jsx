import { useState, useMemo } from "react";
import { Tag, Switch, message, Space, Modal, Form } from "antd";
import { PlusOutlined } from "@ant-design/icons";
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
import OptionModal from "./OptionModal";

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
            width: 70,
            align: "center",
            render: (id) => (
                <span className="text-gray-400 font-mono">{id}</span>
            ),
        },
        {
            title: "加工方法名称",
            dataIndex: "name",
            width: 200,
            ellipsis: true,
            render: (text) => (
                <span className="font-bold text-indigo-600 text-[15px]">
                    {text}
                </span>
            ),
        },
        {
            title: "加工选项（点击选项可编辑，点击x删除）",
            key: "optionsList",
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
            width: 100,
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

            <OptionModal
                optionModal={optionModal}
                form={form}
                onCancel={() =>
                    setOptionModal({
                        visible: false,
                        method: null,
                        option: null,
                    })
                }
                onSubmit={handleOptionSubmit}
            />
        </>
    );
};

export default ProcessingMethodList;
