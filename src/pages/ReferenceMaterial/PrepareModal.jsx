import React, { useState, useEffect } from "react";
import {
    Modal,
    Form,
    Input,
    InputNumber,
    Button,
    Space,
    message,
    Select,
    DatePicker,
    Divider,
    List,
    Card,
    Tooltip,
} from "antd";
import {
    PlusOutlined,
    DeleteOutlined,
    InfoCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
    prepareReferenceMaterial,
    comboReferenceMaterial,
} from "../../api/referenceMaterial";
import { comboReferenceMaterialMediumType } from "../../api/referenceMaterialMediumType";

const CategoryOptions = [
    { label: "标准物质", value: 0 },
    { label: "标准溶液", value: 1 },
    { label: "基准试剂", value: 2 },
];

const StageOptions = [
    { label: "原液", value: 0 },
    { label: "中间液", value: 1 },
    { label: "工作液", value: 2 },
    { label: "标准曲线", value: 3 },
];

const PhysicalStateOptions = [
    { label: "固态", value: 0 },
    { label: "液态", value: 1 },
    { label: "气态", value: 2 },
];

const CategoryMap = { 0: "标准物质", 1: "标准溶液", 2: "基准试剂" };
const StageMap = { 0: "原液", 1: "中间液", 2: "工作液", 3: "标准曲线" };
const PhysicalStateMap = { 0: "固态", 1: "液态", 2: "气态" };

const PrepareModal = ({ visible, onCancel, onSuccess }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [materialOptions, setMaterialOptions] = useState([]);
    const [mediumOptions, setMediumOptions] = useState([]);
    const parentsWatch = Form.useWatch("parents", form);

    useEffect(() => {
        if (visible) {
            fetchMaterials();
            fetchMediums();
            form.resetFields();
            form.setFieldsValue({
                category: 1,
                stage: 1,
                physical_state: 1,
                unit: "mL",
                parents: [{ id: null, used: 0 }],
            });
        }
    }, [visible]);

    const fetchMaterials = async () => {
        try {
            const res = await comboReferenceMaterial({});
            if (res.data.status === 0) {
                // The combo API returns array directly in data or data.rows
                const responseData = res.data.data;
                const rows = Array.isArray(responseData)
                    ? responseData
                    : responseData?.rows || [];
                setMaterialOptions(rows);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchMediums = async () => {
        try {
            const res = await comboReferenceMaterialMediumType({});
            if (res.data.status === 0) {
                setMediumOptions(res.data.data || []);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleFinish = async (values) => {
        try {
            setLoading(true);
            const payload = {
                ...values,
                confirmed_at: values.confirmed_at
                    ? values.confirmed_at.format("YYYY-MM-DD")
                    : undefined,
                expiring_at: values.expiring_at
                    ? values.expiring_at.format("YYYY-MM-DD")
                    : undefined,
            };
            const res = await prepareReferenceMaterial(payload);
            if (res.data.status === 0) {
                message.success("调配录入成功");
                onSuccess();
                onCancel();
            } else {
                message.error(res.data.msg || "录入失败");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="调配新试剂"
            open={visible}
            onCancel={onCancel}
            onOk={() => form.submit()}
            okText="确定"
            cancelText="取消"
            confirmLoading={loading}
            width={900}
            centered
            className="top-4"
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleFinish}
                className="max-h-[75vh] overflow-y-auto pr-4 pl-2 py-4"
            >
                <div className="bg-blue-50/50 p-4 rounded-lg mb-4 border border-blue-100">
                    <div className="flex items-center gap-2 font-bold text-blue-800 mb-3">
                        <PlusOutlined /> 来源物质
                        <Tooltip title="一个或者多个物质配在一起（包含兑水稀释等情况）">
                            <InfoCircleOutlined className="text-blue-400 cursor-help" />
                        </Tooltip>
                    </div>
                    <Form.List name="parents">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => {
                                    const selectedId = parentsWatch?.[name]?.id;
                                    const selectedMaterial =
                                        materialOptions.find(
                                            (m) => m.id === selectedId,
                                        );
                                    const unitLabel =
                                        selectedMaterial?.unit || "ml/g";

                                    return (
                                        <div
                                            key={key}
                                            className="flex gap-4 items-start mb-3 bg-white p-3 rounded shadow-sm border border-slate-100"
                                        >
                                            <div className="flex-1">
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, "id"]}
                                                    className="m-0"
                                                    rules={[
                                                        {
                                                            required: true,
                                                            message:
                                                                "请选择来源物质",
                                                        },
                                                    ]}
                                                >
                                                    <Select
                                                        showSearch
                                                        placeholder="请搜索或选择来源物质"
                                                        optionFilterProp="label"
                                                        options={materialOptions.map(
                                                            (m) => ({
                                                                label: `${m.id}. ${m.name}`,
                                                                value: m.id,
                                                            }),
                                                        )}
                                                    />
                                                </Form.Item>
                                            </div>
                                            <div style={{ width: 140 }}>
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, "used"]}
                                                    className="m-0"
                                                    rules={[
                                                        {
                                                            required: true,
                                                            message:
                                                                "请输入用量",
                                                        },
                                                    ]}
                                                >
                                                    <InputNumber
                                                        className="w-full"
                                                        min={0}
                                                        placeholder="数量"
                                                        addonAfter={unitLabel}
                                                    />
                                                </Form.Item>
                                            </div>
                                            {fields.length > 1 && (
                                                <Button
                                                    type="text"
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                    onClick={() => remove(name)}
                                                    className="mt-1"
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                                <Button
                                    type="dashed"
                                    onClick={() => add()}
                                    block
                                    icon={<PlusOutlined />}
                                    className="bg-white"
                                >
                                    添加来源物质
                                </Button>
                            </>
                        )}
                    </Form.List>
                </div>

                <div className="grid grid-cols-3 gap-x-4">
                    <Form.Item
                        name="name"
                        label="新试剂名称"
                        rules={[{ required: true }]}
                        className="col-span-2"
                    >
                        <Input placeholder="请输入名称" />
                    </Form.Item>
                    <Form.Item
                        name="category"
                        label="分类"
                        rules={[{ required: true }]}
                    >
                        <Select options={CategoryOptions} />
                    </Form.Item>

                    <Form.Item
                        name="stage"
                        label="阶段"
                        rules={[{ required: true }]}
                    >
                        <Select options={StageOptions} />
                    </Form.Item>
                    <Form.Item
                        name="physical_state"
                        label="物理形态"
                        rules={[{ required: true }]}
                    >
                        <Select options={PhysicalStateOptions} />
                    </Form.Item>
                    <Form.Item
                        name="medium_type_id"
                        label="介质类型"
                        rules={[{ required: true }]}
                    >
                        <Select
                            showSearch
                            optionFilterProp="label"
                            options={mediumOptions.map((m) => ({
                                label: m.name,
                                value: m.id,
                            }))}
                        />
                    </Form.Item>

                    <Form.Item name="lab_code" label="试剂标签编码">
                        <Input />
                    </Form.Item>
                    <Form.Item name="sample_code" label="样品编码">
                        <Input />
                    </Form.Item>
                    <Form.Item name="batch_code" label="批号">
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="specification"
                        label="规格"
                        rules={[{ required: true }]}
                    >
                        <InputNumber className="w-full" min={0} />
                    </Form.Item>
                    <Form.Item
                        name="remaining"
                        label="余量"
                        rules={[{ required: true }]}
                    >
                        <InputNumber className="w-full" min={0} />
                    </Form.Item>
                    <Form.Item
                        name="alert_threshold"
                        label="报警阈值"
                        rules={[{ required: true }]}
                    >
                        <InputNumber className="w-full" min={0} />
                    </Form.Item>
                    <Form.Item
                        name="unit"
                        label="单位"
                        rules={[{ required: true }]}
                    >
                        <Input placeholder="g/mL等" />
                    </Form.Item>

                    <Form.Item name="uncertainty" label="不确定度(%)">
                        <InputNumber className="w-full" min={0} max={100} />
                    </Form.Item>
                    <Form.Item name="mass_concentration" label="质量浓度(%)">
                        <InputNumber className="w-full" min={0} max={100} />
                    </Form.Item>
                    <Form.Item name="medium_concentration" label="介质浓度(%)">
                        <InputNumber className="w-full" min={0} max={100} />
                    </Form.Item>

                    <Form.Item name="confirmed_at" label="定值日期">
                        <DatePicker
                            className="w-full"
                            placeholder="请选择定值日期"
                        />
                    </Form.Item>
                    <Form.Item name="expiring_at" label="有效期至">
                        <DatePicker
                            className="w-full"
                            placeholder="请选择有效期至"
                            disabledDate={(current) =>
                                current && current < dayjs().startOf("day")
                            }
                        />
                    </Form.Item>
                    <Form.Item name="location" label="存放地点">
                        <Input />
                    </Form.Item>
                </div>

                <Form.Item name="vendor" label="研制单位">
                    <Input />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default PrepareModal;
