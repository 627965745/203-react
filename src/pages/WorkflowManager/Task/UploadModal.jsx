import { useState, useEffect } from "react";
import {
    Modal,
    Upload,
    message,
    Typography,
    Form,
    Select,
    InputNumber,
    Alert,
    Spin,
    DatePicker,
} from "antd";
import { FileExcelOutlined } from "@ant-design/icons";
import { uploadTask, comboTask } from "../../../api/workflow";
import { comboClient } from "../../../api/client";
import { comboUser } from "../../../api/user";
// V6: 样品类型 / 分析类型改由本表单选择（原从 Excel B5/B6 读），需要各自的下拉数据源
import { comboTaskType } from "../../../api/taskType";
import { comboAnalysisType } from "../../../api/analysisType";
import dayjs from "dayjs";

// V6: 任务级枚举 —— 检测类别 commission_type / 来样方式 delivery_type，
//     取值与任务管理表单一致（原从 Excel B8/B9 读）
const COMMISSION_TYPE_OPTIONS = [
    { label: "委托检测", value: 0 },
    { label: "监督检测", value: 1 },
    { label: "其他", value: 2 },
];
const DELIVERY_TYPE_OPTIONS = [
    { label: "客户邮寄", value: 0 },
    { label: "客户送检", value: 1 },
    { label: "自采", value: 2 },
];

const { Dragger } = Upload;
const { Text } = Typography;

// V5: 送样单导入流程重构 —— 元数据不再从 Excel 的「元数据」表(F1/F2/F3)读取，
//     改为随 multipart 表单一起提交：
//       file(必填) / client_id(必填) / receiver_id(必填) /
//       task_id(可选，传则追加到已有任务、不传则新建任务) / batch(可选，≥1)
// V6: 送样单模板再改版 —— 样品类型 / 分析类型 / 检测类别 / 来样方式 / 截止日期
//     五项已从 Excel 移除（原 B5/B6/B8/B9/B10），全部改为本表单的必填项随 upload 提交：
//       sample_type_id / analysis_type_id / commission_type / delivery_type / deadline
//     注意必须使用 v6.1 新模板，旧模板上传会解析失败。
const UploadModal = ({ visible, onCancel, onSuccess }) => {
    const [form] = Form.useForm();
    const [fileList, setFileList] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState([]);
    const [users, setUsers] = useState([]);
    const [tasks, setTasks] = useState([]);
    // V6: 样品类型 / 分析类型下拉（任务级字段改由表单收集）
    const [sampleTypes, setSampleTypes] = useState([]);
    const [analysisTypes, setAnalysisTypes] = useState([]);
    // V6: 追加到已有任务时，五个任务级字段不参与建任务（后端仍要求它们通过参数校验），
    //     用它来把这些表单项标记为"本次不生效"，避免用户以为能改已有任务的属性。
    const appendTaskId = Form.useWatch("task_id", form);

    useEffect(() => {
        if (!visible) return;
        form.resetFields();
        setFileList([]);

        const load = async () => {
            setLoading(true);
            try {
                // V6: 一并加载样品类型 / 分析类型下拉
                const [
                    resClients,
                    resUsers,
                    resTasks,
                    resSampleTypes,
                    resAnalysisTypes,
                ] = await Promise.all([
                    comboClient(),
                    comboUser(),
                    comboTask(),
                    comboTaskType(),
                    comboAnalysisType(),
                ]);
                setClients(resClients.data.data || []);
                setUsers(resUsers.data.data || []);
                setSampleTypes(resSampleTypes.data.data || []);
                setAnalysisTypes(resAnalysisTypes.data.data || []);
                const rawTasks = resTasks.data.data;
                setTasks(
                    Array.isArray(rawTasks) ? rawTasks : rawTasks?.rows || [],
                );
            } catch (error) {
                console.error("加载客户/收样人/任务/类型下拉失败", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [visible, form]);

    const handleUpload = async () => {
        if (fileList.length === 0) {
            message.warning("请先选择或拖拽文件");
            return;
        }

        let values;
        try {
            values = await form.validateFields();
        } catch (e) {
            return; // inline validation already shown
        }

        const formData = new FormData();
        const rawFile = fileList[0]?.originFileObj || fileList[0];
        formData.append("file", rawFile);
        // V5: 元数据改由表单携带（v4 分别读自 Excel 元数据表的 F1/F2/F3）
        formData.append("client_id", values.client_id);
        formData.append("receiver_id", values.receiver_id);
        // V6: 任务级字段改由表单提交（原读自 Excel B5/B6/B8/B9/B10）。
        //     后端把这五项列为必填参数，追加到已有任务时虽然不参与建任务，仍需通过参数校验，
        //     所以无论新建还是追加都照常提交。
        formData.append("sample_type_id", values.sample_type_id);
        formData.append("analysis_type_id", values.analysis_type_id);
        formData.append("commission_type", values.commission_type);
        formData.append("delivery_type", values.delivery_type);
        formData.append("deadline", values.deadline.format("YYYY-MM-DD"));
        if (values.task_id) formData.append("task_id", values.task_id);
        // V5: batch 可选 —— 传入则本单全部样品都写入该批次
        // V6: batch 只能传 ≥1 的整数或不传，传 0 会被参数校验拦截（status=10）；
        //     InputNumber 已限制 min=1，这里再兜一层。
        if (values.batch >= 1) formData.append("batch", values.batch);

        setUploading(true);
        try {
            const res = await uploadTask(formData);
            if (res.data.status === 0) {
                // V4: 样品插入改为 INSERT IGNORE —— 同一任务下 client_code 已存在时不再报错，
                //     后端会更新该样品的自定义输入项与检测方法，提示文案同步说明这一点。
                message.success(
                    values.task_id
                        ? "送样单导入成功，样品已追加到所选任务；已存在的样品已更新其参数与检测方法"
                        : "送样单导入成功，已新建任务；已存在的样品已更新其参数与检测方法",
                );
                onSuccess();
                onCancel();
                setFileList([]);
            } else {
                message.error(res.data.message || "导入失败");
            }
        } catch (error) {
            console.error("Upload error", error);
        } finally {
            setUploading(false);
        }
    };

    const props = {
        onRemove: () => {
            setFileList([]);
        },
        beforeUpload: (file) => {
            const isExcel =
                file.type ===
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                file.type === "application/vnd.ms-excel" ||
                file.name.endsWith(".xlsx") ||
                file.name.endsWith(".xls");

            if (!isExcel) {
                message.error(`${file.name} 不是 Excel 文件`);
                return Upload.LIST_IGNORE;
            }

            setFileList([file]);
            return false; // Prevent automatic upload
        },
        fileList,
        maxCount: 1,
    };

    return (
        <Modal
            title="导入送样单"
            open={visible}
            onCancel={onCancel}
            onOk={handleUpload}
            okText="开始导入"
            cancelText="取消"
            confirmLoading={uploading}
            width={640}
            destroyOnHidden
        >
            <Spin spinning={loading}>
                <div className="py-4">

                    <Dragger
                        {...props}
                        className="bg-slate-50 border-dashed border-slate-300 rounded-lg"
                    >
                        <p className="ant-upload-drag-icon">
                            <FileExcelOutlined className="text-blue-500" />
                        </p>
                        <p className="ant-upload-text">
                            点击或拖拽 Excel 文件到此区域进行上传
                        </p>
                        <p className="ant-upload-hint text-xs">
                            仅支持 .xlsx 或 .xls 格式的送样单
                        </p>
                        {/* V6: 模板再次改版，旧模板会解析失败 */}
                        <p className="ant-upload-hint text-xs text-orange-500">
                            请使用新模板格式（基础信息只剩 任务名称/联系人/联系方式/物态/备注）
                        </p>
                        {/* V4: 重复 client_code 由报错改为更新已有样品 */}
                        <p className="ant-upload-hint text-xs">
                            同一任务下客户样号已存在时不会报错，将更新该样品的参数与检测方法
                        </p>
                    </Dragger>

                    {fileList.length > 0 && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-100 flex items-center gap-2">
                            <FileExcelOutlined className="text-blue-500" />
                            <div className="flex-1 overflow-hidden">
                                <Text strong ellipsis className="block">
                                    {fileList[0].name}
                                </Text>
                                <Text
                                    type="secondary"
                                    className="text-[12px]"
                                >
                                    {(fileList[0].size / 1024).toFixed(2)} KB
                                </Text>
                            </div>
                        </div>
                    )}

                    {/* V5: 客户 / 收样人 / 目标任务 / 批次改由此表单提交 */}
                    {/* V6: 再加上 样品类型 / 分析类型 / 检测类别 / 来样方式 / 截止日期 五项 */}
                    <Form
                        form={form}
                        layout="vertical"
                        className="mt-5"
                        initialValues={{
                            commission_type: 0,
                            delivery_type: 1,
                        }}
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item
                                name="client_id"
                                label="委托客户"
                                rules={[
                                    { required: true, message: "请选择客户" },
                                ]}
                            >
                                <Select
                                    showSearch
                                    placeholder="请选择客户"
                                    optionFilterProp="label"
                                    options={clients.map((c) => ({
                                        label: c.name,
                                        value: c.id,
                                    }))}
                                />
                            </Form.Item>
                            <Form.Item
                                name="receiver_id"
                                label="收样人"
                                rules={[
                                    { required: true, message: "请选择收样人" },
                                ]}
                            >
                                <Select
                                    showSearch
                                    placeholder="请选择收样人"
                                    optionFilterProp="label"
                                    options={users.map((u) => ({
                                        label: u.nickname || u.name,
                                        value: u.id,
                                    }))}
                                />
                            </Form.Item>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* V5: task_id 可选 —— 传则追加到已有任务，不传则新建任务 */}
                            <Form.Item
                                name="task_id"
                                label="追加到已有任务"
                                tooltip="留空则按送样单内容新建任务；选择任务则把本单样品追加到该任务下。"
                            >
                                <Select
                                    showSearch
                                    allowClear
                                    placeholder="留空 = 新建任务"
                                    optionFilterProp="label"
                                    options={tasks.map((t) => ({
                                        label: `${t.lab_code ? t.lab_code + "-" : ""}${t.name || t.task_name} (#${t.id})`,
                                        value: t.id,
                                    }))}
                                />
                            </Form.Item>
                            {/* V5: batch 可选，写入本单全部样品 */}
                            <Form.Item
                                name="batch"
                                label="批次号"
                                tooltip="留空表示未分批；填写后本单导入的全部样品都归入该批次。"
                            >
                                <InputNumber
                                    min={1}
                                    precision={0}
                                    style={{ width: "100%" }}
                                    placeholder="留空 = 未分批"
                                />
                            </Form.Item>
                        </div>
                        {/* V6: 以下五项原本填在 Excel 里（B5/B6/B8/B9/B10），现改为表单必填 */}
                        {appendTaskId && (
                            <Alert
                                type="info"
                                showIcon
                                className="mb-4 rounded-lg text-xs"
                                message="已选择「追加到已有任务」：下列任务级信息仍需填写以通过接口校验，但不会修改目标任务的既有属性。"
                            />
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item
                                name="sample_type_id"
                                label="样品类型"
                                rules={[
                                    {
                                        required: true,
                                        message: "请选择样品类型",
                                    },
                                ]}
                            >
                                <Select
                                    showSearch
                                    placeholder="请选择样品类型"
                                    optionFilterProp="label"
                                    options={sampleTypes.map((t) => ({
                                        label: t.name,
                                        value: t.id,
                                    }))}
                                />
                            </Form.Item>
                            <Form.Item
                                name="analysis_type_id"
                                label="分析类型"
                                rules={[
                                    {
                                        required: true,
                                        message: "请选择分析类型",
                                    },
                                ]}
                            >
                                <Select
                                    showSearch
                                    placeholder="请选择分析类型"
                                    optionFilterProp="label"
                                    options={analysisTypes.map((t) => ({
                                        label: t.name,
                                        value: t.id,
                                    }))}
                                />
                            </Form.Item>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            {/* V6: commission_type —— 原 Excel B8「检测类别」 */}
                            <Form.Item
                                name="commission_type"
                                label="检测类别"
                                rules={[
                                    {
                                        required: true,
                                        message: "请选择检测类别",
                                    },
                                ]}
                            >
                                <Select
                                    placeholder="请选择检测类别"
                                    options={COMMISSION_TYPE_OPTIONS}
                                />
                            </Form.Item>
                            {/* V6: delivery_type —— 原 Excel B9「来样方式」 */}
                            <Form.Item
                                name="delivery_type"
                                label="来样方式"
                                rules={[
                                    {
                                        required: true,
                                        message: "请选择来样方式",
                                    },
                                ]}
                            >
                                <Select
                                    placeholder="请选择来样方式"
                                    options={DELIVERY_TYPE_OPTIONS}
                                />
                            </Form.Item>
                            {/* V6: deadline —— 原 Excel B10「截止日期」，格式 YYYY-MM-DD */}
                            <Form.Item
                                name="deadline"
                                label="截止日期"
                                rules={[
                                    {
                                        required: true,
                                        message: "请选择截止日期",
                                    },
                                ]}
                            >
                                <DatePicker
                                    className="w-full"
                                    placeholder="请选择截止日期"
                                    disabledDate={(current) =>
                                        current &&
                                        current < dayjs().startOf("day")
                                    }
                                />
                            </Form.Item>
                        </div>
                    </Form>
                </div>
            </Spin>
        </Modal>
    );
};

export default UploadModal;
