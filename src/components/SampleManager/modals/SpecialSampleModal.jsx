import React, { useState, useEffect } from "react";
import { Modal, Form, Input, InputNumber, Select, message, Space, Divider } from "antd";
import { ExperimentOutlined, BlockOutlined, StarOutlined, RetweetOutlined } from "@ant-design/icons";

const SpecialSampleModal = ({ 
    open, 
    onCancel, 
    onSuccess, 
    taskId,
    apis = {}
}) => {
    const {
        referenceSample,
        readSample,
        comboTask,
        comboReferenceMaterial // Optional if we want to pass it
    } = apis;
    
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [refOptions, setRefOptions] = useState([]);
    const [parentOptions, setParentOptions] = useState([]);
    const [taskOptions, setTaskOptions] = useState([]);
    const [refLoading, setRefLoading] = useState(false);
    const [parentLoading, setParentLoading] = useState(false);
    const [taskLoading, setTaskLoading] = useState(false);

    const type = Form.useWatch('type', form);
    const selectedTaskId = Form.useWatch('task_id', form);

    useEffect(() => {
        if (open) {
            form.resetFields();
            form.setFieldsValue({ 
                task_id: taskId,
                count: 1,
                type: 1 
            });
            fetchTasks();
        }
    }, [open, taskId, form]);

    useEffect(() => {
        if (open && type === 2) {
            fetchRefMaterials();
        }
        if (open && type === 3 && selectedTaskId) {
            fetchParentSamples(selectedTaskId);
        }
    }, [open, type, selectedTaskId]);


    const fetchTasks = async () => {
        setTaskLoading(true);
        try {
            const res = await comboTask();
            if (res.data.status === 0 || res.data.code === 0) {
                const rawData = res.data.data;
                const list = Array.isArray(rawData) ? rawData : (rawData?.rows || []);
                setTaskOptions(list.map(t => ({
                    label: `${t.name || t.task_name} (#${t.id})`,
                    value: t.id
                })));
            }
        } catch (error) {
            console.error("Fetch tasks error:", error);
        } finally {
            setTaskLoading(false);
        }
    };

    const fetchRefMaterials = async () => {
        setRefLoading(true);
        try {
            const res = await comboReferenceMaterial({});
            if (res.data.status === 0 || res.data.code === 0) {
                const rawData = res.data.data;
                const list = Array.isArray(rawData) ? rawData : (rawData?.rows || []);
                setRefOptions(list.map(r => ({
                    label: `${r.name} (${r.lab_code || r.batch_code || '无编号'})`,
                    value: r.id
                })));
            }
        } catch (error) {
            console.error("Fetch reference materials error:", error);
        } finally {
            setRefLoading(false);
        }
    };

    const fetchParentSamples = async (tId) => {
        if (!tId) return;
        setParentLoading(true);
        try {
            // Only fetch type=0 (ordinary) samples
            const res = await readSample({ task_id: tId, type: 0, limit: 1000 });
            if (res.data.status === 0 || res.data.code === 0) {
                const rows = res.data.data?.rows || [];
                setParentOptions(rows.map(s => ({
                    label: `${s.client_code} (${s.lab_code})`,
                    value: s.id
                })));
            }
        } catch (error) {
            console.error("Fetch parent samples error:", error);
        } finally {
            setParentLoading(false);
        }
    };


    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);
            const res = await referenceSample(values);
            if (res.data.status === 0 || res.data.code === 0) {
                message.success("添加特殊样品成功");
                onSuccess();
            } else {
                message.error(res.data.message || "添加失败");
            }
        } catch (error) {
            console.error("Submit special sample error:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={
                <div className="flex items-center gap-2">
                    <ExperimentOutlined className="text-purple-600" />
                    <span>添加特殊样品</span>
                </div>
            }
            open={open}
            onCancel={onCancel}
            onOk={handleOk}
            confirmLoading={loading}
            width={550}
            okText="提交"
            cancelText="取消"
            destroyOnClose
        >
            <Form
                form={form}
                layout="vertical"
                initialValues={{ count: 1, type: 1 }}
                className="mt-4"
            >
                <div className="grid grid-cols-2 gap-4">
                    <Form.Item
                        label="所属任务"
                        name="task_id"
                        rules={[{ required: true, message: "请选择所属任务" }]}
                    >
                        <Select
                            className="w-full"
                            placeholder="请选择所属任务"
                            loading={taskLoading}
                            options={taskOptions}
                            showSearch
                            optionFilterProp="label"
                        />
                    </Form.Item>

                    <Form.Item
                        label="样品类型"
                        name="type"
                        rules={[{ required: true, message: "请选择样品类型" }]}
                    >
                        <Select
                            options={[
                                { label: '空白样', value: 1, icon: <BlockOutlined className="text-gray-400" /> },
                                { label: '标准样', value: 2, icon: <StarOutlined className="text-purple-400" /> },
                                { label: '重复样', value: 3, icon: <RetweetOutlined className="text-orange-400" /> },
                            ]}
                            optionRender={(option) => (
                                <Space>
                                    {option.data.icon}
                                    {option.label}
                                </Space>
                            )}
                        />
                    </Form.Item>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Form.Item
                        label="创建数量"
                        name="count"
                        rules={[{ required: true, message: "请输入创建数量" }]}
                    >
                        <InputNumber min={1} className="w-full" precision={0} />
                    </Form.Item>
                    
                    {/* Placeholder for alignment if needed, or leave empty */}
                    <div></div>
                </div>

                <Divider className="my-1" />


                {type === 2 && (
                    <Form.Item
                        label="标准物质"
                        name="reference_material_id"
                        rules={[{ required: true, message: "请选择标准物质" }]}
                    >
                        <Select
                            placeholder="选择标准物质"
                            loading={refLoading}
                            options={refOptions}
                            showSearch
                            optionFilterProp="label"
                        />
                    </Form.Item>
                )}

                {type === 3 && (
                    <Form.Item
                        label="父样品"
                        name="parent_id"
                        rules={[{ required: true, message: "请选择父样品" }]}
                    >
                        <Select
                            placeholder="选择当前任务的普通样品"
                            loading={parentLoading}
                            options={parentOptions}
                            showSearch
                            optionFilterProp="label"
                        />
                    </Form.Item>
                )}

                <Form.Item
                    label="描述"
                    name="description"
                >
                    <Input.TextArea 
                        placeholder="请输入描述信息" 
                        rows={3} 
                        maxLength={255}
                        showCount
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default SpecialSampleModal;
