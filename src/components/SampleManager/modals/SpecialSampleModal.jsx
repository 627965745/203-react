import React, { useState, useEffect } from "react";
import {
    Modal,
    Form,
    Input,
    InputNumber,
    Select,
    message,
    Space,
    Divider,
} from "antd";
import {
    ExperimentOutlined,
    BlockOutlined,
    StarOutlined,
    RetweetOutlined,
} from "@ant-design/icons";

// V6.1: supportsBatch —— 后端只有 WorkflowManager/Sample/reference 会真正写入 batch；
//     TestingManager 和 DepartmentManager 的同名接口收下 batch、返回 status=0，却把值丢掉
//     （2026-08-26 实测：传 batch=9，建出来的样品 batch 仍为 null）。
//     所以这两个模块干脆不显示批次号输入框，免得用户填了以为生效。
//     后端修好之后，把那两个页面的 supportsBatch={false} 去掉即可。
const SpecialSampleModal = ({
    open,
    onCancel,
    onSuccess,
    taskId,
    apis = {},
    supportsBatch = true,
}) => {
    const {
        referenceSample,
        readSample,
        comboTask,
        // V5: 参比样改指「标准样品」—— 下拉数据源由 ReferenceMaterial/combo
        //     换成 ReferenceSample/combo（宿主页面通过 apis 注入）
        comboReferenceSample,
    } = apis;

    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [refOptions, setRefOptions] = useState([]);
    const [parentOptions, setParentOptions] = useState([]);
    const [taskOptions, setTaskOptions] = useState([]);
    const [refLoading, setRefLoading] = useState(false);
    const [parentLoading, setParentLoading] = useState(false);
    const [taskLoading, setTaskLoading] = useState(false);
    const [tasks, setTasks] = useState([]);

    const type = Form.useWatch("type", form);
    const selectedTaskId = Form.useWatch("task_id", form);

    useEffect(() => {
        if (open) {
            form.resetFields();
            form.setFieldsValue({
                task_id: taskId,
                count: 1,
                type: 1,
            });
            fetchTasks();
        }
    }, [open, taskId, form]);

    useEffect(() => {
        if (open && type === 2) {
            fetchRefSamples();
        }
        if (open && type === 3 && selectedTaskId) {
            fetchParentSamples(selectedTaskId);
        }
    }, [open, type, selectedTaskId]);

    const fetchTasks = async () => {
        setTaskLoading(true);
        try {
            const res = await comboTask();
            if (res.data.status === 0) {
                const rawData = res.data.data;
                const list = Array.isArray(rawData)
                    ? rawData
                    : rawData?.rows || [];
                setTasks(list);
                setTaskOptions(
                    list.map((t) => ({
                        label: `${t.name || t.task_name} (#${t.id})`,
                        value: t.id,
                    })),
                );
            }
        } catch (error) {
            console.error("Fetch tasks error:", error);
        } finally {
            setTaskLoading(false);
        }
    };

    // V5: 标准样(type=2) 关联的是标准样品(reference_samples)，不再是标准物质
    const fetchRefSamples = async () => {
        setRefLoading(true);
        try {
            const res = await comboReferenceSample({});
            if (res.data.status === 0) {
                const rawData = res.data.data;
                const list = Array.isArray(rawData)
                    ? rawData
                    : rawData?.rows || [];
                setRefOptions(
                    list.map((r) => ({
                        label: `${r.name} (序号：${r.lab_code || r.batch_code || r.id || "无编号"})`,
                        value: r.id,
                    })),
                );
            }
        } catch (error) {
            console.error("Fetch reference samples error:", error);
        } finally {
            setRefLoading(false);
        }
    };

    const fetchParentSamples = async (tId) => {
        if (!tId) return;
        setParentLoading(true);
        try {
            // Call the combo API (eats task_id)
            const res = await readSample({
                task_id: tId,
            });
            if (res.data.status === 0) {
                const rawData = res.data.data;
                const rows = Array.isArray(rawData) ? rawData : (rawData?.rows || []);
                // Filter out non-ordinary samples locally (type 0 is ordinary sample)
                const ordinarySamples = rows.filter(s => s.type === 0 || s.type === undefined);

                const currentTask = tasks.find((t) => t.id == tId);
                const taskLabCode = currentTask?.lab_code || "";

                setParentOptions(
                    ordinarySamples.map((s) => {
                        const prefix = taskLabCode || s.task_lab_code || "";
                        const sequence =
                            s.lab_code?.toString().padStart(4, "0") || "";
                        const sampleCode = prefix
                            ? `${prefix}-${sequence}`
                            : sequence;
                        return {
                            label: sampleCode,
                            value: s.id,
                        };
                    }),
                );
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
            if (typeof referenceSample !== "function") {
                message.error("未配置添加特殊样品 API");
                return;
            }
            // V4: 按样品类型裁剪互斥字段 —— 后端要求空白样(1) 两个关联ID都为空、
            //     标准样(2) 只带参比样ID、重复样(3) 只带 parent_id。
            //     用户切换类型后表单里可能残留上一次的选择，必须在提交前清掉，
            //     否则会命中后端的非法输入校验（V4 中部分此类错误码由 102 调整为 101）。
            // V4: client_code 不再由前端传入，改由后端 helper.frankID() 自动生成。
            // V5: 请求字段 reference_material_id 改名为 reference_sample_id（指向标准样品）；
            //     新增可选 batch —— 不填(null)表示未分批，填写则为该批次号(≥1)。
            const payload = {
                task_id: values.task_id,
                count: values.count,
                type: values.type,
                description: values.description || "",
                reference_sample_id:
                    values.type === 2 ? values.reference_sample_id : null,
                parent_id: values.type === 3 ? values.parent_id : null,
            };
            // V6.1: 后端不写入 batch 的模块直接不带该字段
            if (supportsBatch) payload.batch = values.batch ?? null;
            const res = await referenceSample(payload);
            if (res.data.status === 0) {
                message.success("添加特殊样品成功");
                onSuccess();
            } else {
                message.error(res.data.message || "添加失败");
            }
        } catch (error) {
            console.error("Submit special sample error:", error);
            if (error?.errorFields) {
                return;
            }
            message.error(error?.message || "添加特殊样品时发生异常");
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
                                {
                                    label: "空白样",
                                    value: 1,
                                    icon: (
                                        <BlockOutlined className="text-gray-400" />
                                    ),
                                },
                                {
                                    label: "标准样",
                                    value: 2,
                                    icon: (
                                        <StarOutlined className="text-purple-400" />
                                    ),
                                },
                                {
                                    label: "重复样",
                                    value: 3,
                                    icon: (
                                        <RetweetOutlined className="text-orange-400" />
                                    ),
                                },
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

                <div className={supportsBatch ? "grid grid-cols-2 gap-4" : ""}>
                    <Form.Item
                        label="创建数量"
                        name="count"
                        rules={[{ required: true, message: "请输入创建数量" }]}
                    >
                        <InputNumber min={1} className="w-full" precision={0} />
                    </Form.Item>

                    {/* V5: 新增批次号 —— 留空表示未分批(NULL)，填写则为该批次(≥1) */}
                    {/* V6.1: 只在后端确实会写入 batch 的模块显示（见文件顶部注释） */}
                    {supportsBatch && (
                        <Form.Item
                            label="批次号"
                            name="batch"
                            tooltip="留空表示未分批；填写后本次创建的全部特殊样品都归入该批次。批次也可事后用「设置批次」批量修改。"
                        >
                            <InputNumber
                                min={1}
                                precision={0}
                                className="w-full"
                            />
                        </Form.Item>
                    )}
                </div>

                {/* V4: client_code 由后端 helper.frankID() 自动生成，前端不再提供输入 */}
                <div className="text-[11px] text-slate-400 leading-snug -mt-2 mb-2">
                    客户样号由系统自动生成，无需填写
                </div>

                <Divider className="my-1" />

                {/* V5: 标准样关联的是「标准样品」(ReferenceSample)，字段名 reference_sample_id */}
                {type === 2 && (
                    <Form.Item
                        label="标准样品"
                        name="reference_sample_id"
                        rules={[{ required: true, message: "请选择标准样品" }]}
                    >
                        <Select
                            placeholder="选择标准样品"
                            loading={refLoading}
                            options={refOptions}
                            showSearch
                            optionFilterProp="label"
                        />
                    </Form.Item>
                )}

                {/* V4: 重复样必须指定父样品 —— v3 的"留空则由系统随机分配父样品"已取消，
                    后端现在要求 type=3 时 parent_id 必填 */}
                {type === 3 && (
                    <Form.Item
                        label="父样品"
                        name="parent_id"
                        tooltip="重复样必须归属于当前任务下的某个普通样品；本次创建的全部重复样都对应该父样品。"
                        rules={[{ required: true, message: "请选择父样品" }]}
                    >
                        <Select
                            placeholder="请选择当前任务下的普通样品"
                            loading={parentLoading}
                            options={parentOptions}
                            showSearch
                            optionFilterProp="label"
                            allowClear
                        />
                    </Form.Item>
                )}

                <Form.Item label="描述" name="description">
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
