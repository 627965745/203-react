import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Drawer, Tabs, Table, Button, Space, message, Tag, Empty, Popconfirm, Divider, Card, Modal, Form, Select, DatePicker, Tooltip, Popover, Spin } from "antd";

// Custom hook to safely update state only when the component is mounted, preventing memory leaks
const useSafeState = (initialVal, isMounted) => {
    const [state, setState] = useState(initialVal);
    const safeSet = useCallback((val) => {
        if (isMounted.current) {
            setState(val);
        }
    }, [isMounted]);
    return [state, safeSet];
};
import { 
    PlusOutlined, DeleteOutlined, EditOutlined, SettingOutlined, 
    ToolOutlined, ExperimentOutlined, UserOutlined, ClockCircleOutlined,
    InfoCircleOutlined, CheckCircleOutlined, SendOutlined, TeamOutlined,
    RollbackOutlined, AuditOutlined, DownloadOutlined, CalendarOutlined
} from "@ant-design/icons";
import { comboDepartment } from "../../api/department";
// V2: 添加加工任务时才现查该方法的 processing_options（不再依赖 sample.methods[] 上是否带此字段）
import { methodTestItem } from "../../api/testItem";
import { comboProcessingMethod } from "../../api/processingMethod";
import dayjs from "dayjs";

// Modals - we'll assume they are in the same directory or passed as props
import InputModal from "./modals/InputModal";
import ItemSelectModal from "./modals/ItemSelectModal";
import SpecialSampleModal from "./modals/SpecialSampleModal";
import ResultEntryModal from "./modals/ResultEntryModal";
import ItemConfigModal from "./modals/ItemConfigModal";
import ApproveModal from "./modals/ApproveModal";
import ReviewModal from "./modals/ReviewModal";
import ProcessingOptionSelector from "./ProcessingOptionSelector";

const ProcessingStatusMap = {
    0: { label: "不加工", color: "default", icon: <InfoCircleOutlined /> },
    1: { label: "正在加工", color: "orange", icon: <ClockCircleOutlined spin /> },
    2: { label: "加工完成", color: "green", icon: <CheckCircleOutlined /> },
};

const MethodStatusMap = {
    0: { label: "管理组未下发", color: "default" },
    1: { label: "组长未下发", color: "blue" },
    2: { label: "正在试验", color: "orange" },
    3: { label: "等待组长审核", color: "cyan" },
    4: { label: "等待管理组审核", color: "purple" },
    5: { label: "生命周期结束", color: "green" },
};

const DetailDrawer = ({ 
    visible, 
    onClose, 
    sampleData: initialSampleData, 
    taskId,
    taskLabCode,
    // Injectable APIs
    apis = {}
}) => {
    // Default to workflow APIs if not provided (to maintain backward compatibility during migration)
    const {
        readSample,
        inputCreate,
        inputUpdate,
        inputDelete,
        itemCreate,
        itemDelete,
        methodCreate,
        methodUpdate,
        methodDelete,
        processCreate,
        processUpdate,
        processDelete,
        distribute,
        helperCreate,
        helperDelete,
        comboRecipient, // Custom API for distribution recipient
        hideDistribute = false, 
        distributeType = 'department', // 'department' or 'inspector'
        showResultEntry = false, // Whether to show the result entry button
        approve, // API for submitting for approval
        rollback, // API for rolling back submission
        approveMethod, // API for manager approval
        rejectMethod, // API for manager rejection
        templateSample // API for downloading result entry template
    } = apis;

    const isMounted = useRef(true);
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    const [activeTab, setActiveTab] = useSafeState("items", isMounted);
    const [sampleData, setSampleData] = useSafeState(null, isMounted);
    const [loading, setLoading] = useSafeState(false, isMounted);
    const [hasChanged, setHasChanged] = useSafeState(false, isMounted);
    
    const sampleId = sampleData?.id;
    
    // UI Local States
    // V2: 移除 activeItem* 相关状态 —— 方法/加工配置改为样品级，不再绑定单个检测项目
    const [editingInput, setEditingInput] = useSafeState(null, isMounted);

    // Modal Visibility
    const [inputModalVisible, setInputModalVisible] = useSafeState(false, isMounted);
    const [itemModalVisible, setItemModalVisible] = useSafeState(false, isMounted);
    const [configModalVisible, setConfigModalVisible] = useSafeState(false, isMounted);
    
    // Distribution Modal States
    const [distributeVisible, setDistributeVisible] = useSafeState(false, isMounted);
    const [distributeLoading, setDistributeLoading] = useSafeState(false, isMounted);
    const [departments, setDepartments] = useSafeState([], isMounted);
    const [selectedDistData, setSelectedDistData] = useSafeState(null, isMounted);
    const [distributeForm] = Form.useForm();
    
    // Result Entry Modal States
    const [resultEntryVisible, setResultEntryVisible] = useSafeState(false, isMounted);
    const [activeMethodData, setActiveMethodData] = useSafeState(null, isMounted);
    
    // Approval Modal States
    const [approveVisible, setApproveVisible] = useSafeState(false, isMounted);
    const [approveData, setApproveData] = useSafeState(null, isMounted);
    const [rollingBack, setRollingBack] = useSafeState(false, isMounted);
    
    // Review Modal States
    const [reviewVisible, setReviewVisible] = useSafeState(false, isMounted);
    const [reviewData, setReviewData] = useSafeState(null, isMounted);
    const [helperVisible, setHelperVisible] = useSafeState(false, isMounted);
    const [helperLoading, setHelperLoading] = useSafeState(false, isMounted);
    const [selectedHelperData, setSelectedHelperData] = useSafeState(null, isMounted);
    const [helperForm] = Form.useForm();

    // V2: 样品级加工任务弹窗状态
    const [procTaskVisible, setProcTaskVisible] = useSafeState(false, isMounted);
    const [procTaskOptionIds, setProcTaskOptionIds] = useSafeState([], isMounted);
    const [procTaskDeadline, setProcTaskDeadline] = useSafeState(null, isMounted);
    const [procTaskLoading, setProcTaskLoading] = useSafeState(false, isMounted);
    const [suggestedProcOptions, setSuggestedProcOptions] = useSafeState([], isMounted);
    const [allProcOptions, setAllProcOptions] = useSafeState([], isMounted);
    const [procTaskOptionsLoading, setProcTaskOptionsLoading] = useSafeState(false, isMounted);

    const isEditable = useMemo(() => {
        if (!sampleData) return true;
        // If creator_id is null, it's an ordinary sample from management group.
        // In department view, these are read-only.
        return sampleData.creator_id !== null && sampleData.creator_id !== undefined;
    }, [sampleData]);

    const hideProcessing = useMemo(() => {
        // Special samples (type 1, 2, 3) don't need processing
        if (sampleData?.type > 0) return true;
        // If no processing APIs are provided, hide processing UI
        return !apis.processCreate && !apis.processUpdate && !apis.processDelete;
    }, [sampleData, apis]);

    useEffect(() => {
        if (visible) {
            if (initialSampleData) {
                const data = { ...initialSampleData };
                if (taskLabCode) {
                    data.task_lab_code = taskLabCode;
                }
                setSampleData(data);
            }
        }
    }, [visible, initialSampleData, taskLabCode]);

    // V2: 打开抽屉时不再预拉取科室/人员下拉，仅在打开“下发科室 / 辅助人员”弹窗时按需加载
    const loadRecipients = () => {
        const api = comboRecipient || comboDepartment;
        // 已加载则复用，避免重复请求
        if (api && departments.length === 0) {
            api().then(res => setDepartments(res.data.data || []));
        }
    };

    const fetchSampleDetail = async () => {
        // We keep this function for post-mutation refresh if onSuccess is not enough
        // but the user wants us to avoid extra reads. 
        // So we will primarily use onSuccess.
        if (apis.onSuccess) apis.onSuccess();
    };

    // V2: 方法上提到样品级，审批/审核/撤回不再需要 item_id
    const openApproveModal = (method) => {
        setApproveData({
            sampleIds: [sampleData.id],
            methodIds: [method.method_id || method.id],
            details: [{
                labCode: `${sampleData.task_lab_code}-${sampleData.lab_code?.toString().padStart(4, '0')}`,
                methodName: method.method_name || method.name,
                results: method.results || []
            }]
        });
        setApproveVisible(true);
    };

    const openReviewModal = (method) => {
        setReviewData({
            sampleIds: [sampleData.id],
            details: [{
                labCode: `${sampleData.task_lab_code}-${sampleData.lab_code?.toString().padStart(4, '0')}`,
                methodName: method.method_name || method.name,
                methodId: method.method_id || method.id,
                results: method.results || []
            }]
        });
        setReviewVisible(true);
    };

    const handleRollback = async (method) => {
        if (!rollback) return;
        setRollingBack(true);
        try {
            const res = await rollback({
                sample_ids: [sampleData.id],
                // V2: 移除 item_id
                method_ids: [method.method_id || method.id]
            });

            if (res.data.status === 0) {
                message.success("数据已撤回");
                setHasChanged(true);
                fetchSampleDetail();
            } else {
                message.error(res.data.message || "撤回失败");
            }
        } catch (error) {
            message.error("撤回操作异常");
        } finally {
            setRollingBack(false);
        }
    };

    const handleDownloadTemplate = async (method) => {
        if (!templateSample) return;
        const hide = message.loading("正在准备导出模板数据...", 0);
        try {
            const res = await templateSample({
                // V2: 结果模板不再需要 item_id，仅传 method_id
                method_id: method.method_id || method.id,
                sample_ids: [sampleData.id]
            });
            hide();
            
            if (res.data instanceof Blob) {
                if (res.data.type === 'application/json') {
                    const text = await res.data.text();
                    const errorData = JSON.parse(text);
                    message.error(errorData.message || "生成模板失败");
                    return;
                }

                const blob = new Blob([res.data], {
                    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                });
                const sequence = sampleData.lab_code?.toString().padStart(4, "0") || "";
                const prefix = sampleData.task_lab_code || "";
                const code = prefix ? `${prefix}-${sequence}` : sequence;
                const fileName = `ResultTemplate_${code}_${method.method_name || method.name || ""}.xlsx`;

                const url = window.URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.setAttribute("download", fileName);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
                message.success("模板下载成功");
            } else {
                message.warning("服务器未返回有效文件数据");
            }
        } catch (error) {
            hide();
            console.error("下载模板出错", error);
            message.error("下载模板失败");
        }
    };

    // --- Inputs Logic ---
    const handleInputSave = async (values) => {
        try {
            const api = editingInput ? inputUpdate : inputCreate;
            if (!api) return message.warning("无此操作权限");
            const payload = { sample_id: sampleId, ...values };
            if (editingInput && editingInput.key !== values.key) payload.old_key = editingInput.key;
            await api(payload);
            message.success("保存成功");
            setInputModalVisible(false);
            setHasChanged(true);
            fetchSampleDetail();
        } catch (error) {}
    };

    const handleInputDelete = async (key) => {
        try {
            if (!inputDelete) return message.warning("无此操作权限");
            await inputDelete({ sample_id: sampleId, key });
            message.success("删除成功");
            setHasChanged(true);
            fetchSampleDetail();
        } catch (error) {}
    };

    // --- Items Logic ---
    const handleItemAdd = async (values) => {
        try {
            if (!itemCreate) return message.warning("无此操作权限");
            await itemCreate({ sample_ids: [sampleId], item_ids: values.item_ids });
            message.success("添加检测项成功");
            setItemModalVisible(false);
            setHasChanged(true);
            fetchSampleDetail();
        } catch (error) {}
    };

    const handleItemDelete = async (itemId) => {
        try {
            if (!itemDelete) return message.warning("无此操作权限");
            await itemDelete({ sample_ids: [sampleId], item_ids: [itemId] });
            message.success("已移除检测项");
            setHasChanged(true);
            fetchSampleDetail();
        } catch (error) {}
    };

    // --- Unified Config Logic (V2: 方法/加工上提到样品级，全部移除 item_id) ---
    const handleMethodSave = async (values) => {
        try {
            if (!methodCreate) return message.warning("无此操作权限");
            // Remove single method_id from spread values to avoid redundant/wrong parameters
            const { method_id, ...otherValues } = values;
            const payload = {
                sample_ids: [sampleId],
                // V2: 不再传 item_id
                method_ids: Array.isArray(method_id) ? method_id : [method_id],
                ...otherValues
            };
            await methodCreate(payload);
            message.success("试验分派成功");
            setHasChanged(true);
            fetchSampleDetail();
        } catch (error) {}
    };

    const handleProcessSave = async (values) => {
        try {
            // V2: 加工状态读取样品级 processing_status
            const api = sampleData?.processing_status === 1 ? processUpdate : processCreate;
            if (!api) return message.warning("无此操作权限");
            const payload = {
                sample_ids: [sampleId],
                // V2: 移除 item_ids，加工直接作用于样品
                ...values
            };
            await api(payload);
            message.success("加工要求已更新");
            setHasChanged(true);
            fetchSampleDetail();
        } catch (error) {}
    };

    const handleProcessDelete = async () => {
        try {
            if (!processDelete) return message.warning("无此操作权限");
            // V2: 移除 item_ids
            await processDelete({ sample_ids: [sampleId] });
            message.success("加工处理已清除");
            setHasChanged(true);
            fetchSampleDetail();
        } catch (error) {}
    };

    const handleMethodDelete = async (methodId) => {
        try {
            if (!methodDelete) return message.warning("无此操作权限");
            // V2: 移除 item_id
            await methodDelete({ sample_ids: [sampleId], method_ids: [methodId] });
            message.success("已移除方法");
            setHasChanged(true);
            fetchSampleDetail();
        } catch (error) {}
    };

    // V2: 加工是否已锁定 —— 任一方法已下发/进行中(status>0)后不可再改加工
    const processingLocked = useMemo(
        () => sampleData?.methods?.some(m => m.status > 0),
        [sampleData]
    );

    // V2: 样品下所有检测项目 id，用于查询某检测方法可用的加工选项
    const sampleItemIds = useMemo(
        () => (sampleData?.items || []).map(i => i.item_id || i.id),
        [sampleData]
    );

    // V2: 打开“配置加工任务”弹窗
    const openSampleProcTask = () => {
        const currentIds = (sampleData?.processing || []).map(p => p.option_id || p.id);
        setProcTaskOptionIds(currentIds);
        setProcTaskDeadline(sampleData?.processing_deadline ? dayjs(sampleData.processing_deadline) : null);
        setProcTaskVisible(true);
        setProcTaskOptionsLoading(true);
        
        Promise.all([
            methodTestItem({ ids: sampleItemIds }),
            comboProcessingMethod()
        ]).then(([methodRes, comboRes]) => {
            const list = methodRes.data?.data || [];
            // 过滤出当前已添加的检测方法
            const addedMethodIds = (sampleData?.methods || []).map(m => m.method_id || m.id);
            const addedMethods = list.filter(x => addedMethodIds.includes(x.id));
            
            // 提取建议的加工选项
            const suggestedMap = new Map();
            addedMethods.forEach(m => {
                if (m.processing_options) {
                    m.processing_options.forEach(opt => {
                        suggestedMap.set(opt.id, opt);
                    });
                }
            });
            setSuggestedProcOptions(Array.from(suggestedMap.values()));
            setAllProcOptions(comboRes.data?.data || []);
        }).catch(() => {
            setSuggestedProcOptions([]);
            setAllProcOptions([]);
        }).finally(() => {
            setProcTaskOptionsLoading(false);
        });
    };

    // V2: 提交加工任务 —— 把所选加工选项保存
    const handleProcTaskSubmit = async () => {
        if (!procTaskOptionIds.length) return message.warning("请选择加工选项");
        if (!procTaskDeadline) return message.warning("请选择完成期限");
        setProcTaskLoading(true);
        try {
            await handleProcessSave({
                option_ids: procTaskOptionIds,
                deadline: procTaskDeadline.format("YYYY-MM-DD"),
            });
            setProcTaskVisible(false);
        } finally {
            setProcTaskLoading(false);
        }
    };

    // V2: 配置弹窗改为样品级（加工要求 + 方法分派），不再绑定单个检测项目
    const openConfigModal = () => {
        setConfigModalVisible(true);
    };

    const openDistributeModal = async (method) => {
        loadRecipients(); // V2: 打开下发弹窗时才加载接收方（科室/检测员）下拉
        setSelectedDistData({ method });
        setDistributeVisible(true);
        distributeForm.resetFields();
    };

    const handleDistributeSubmit = async (values) => {
        setDistributeLoading(true);
        try {
            if (!distribute) return message.warning("无此操作权限");
            const payload = {
                sample_ids: [sampleId],
                // V2: 移除 item_id
                method_ids: [selectedDistData.method.method_id || selectedDistData.method.id],
                deadline: values.deadline ? values.deadline.format("YYYY-MM-DD") : null
            };

            if (distributeType === 'inspector') {
                payload.tester_id = values.recipient_id;
            } else {
                payload.department_id = values.recipient_id;
            }

            await distribute(payload);
            message.success("下发成功");
            setDistributeVisible(false);
            setHasChanged(true);
            fetchSampleDetail();
        } catch (error) {
            message.error("下发失败");
        } finally {
            setDistributeLoading(false);
        }
    };

    // --- Helper Logic ---
    const openHelperModal = (method) => {
        loadRecipients(); // V2: 打开辅助人员弹窗时才加载人员下拉
        setSelectedHelperData({ method });
        setHelperVisible(true);
        helperForm.resetFields();
        helperForm.setFieldsValue({
            helper_ids: method.helpers?.map(h => h.user_id || h.id) || []
        });
    };

    const handleHelperSubmit = async (values) => {
        setHelperLoading(true);
        try {
            const currentHelpers = selectedHelperData.method.helpers?.map(h => h.user_id || h.id) || [];
            const newHelpers = values.helper_ids || [];

            // V2: 移除 item_id；method_id 改为 method_ids 列表
            const payloadBase = {
                sample_ids: [sampleId],
                method_ids: [selectedHelperData.method.method_id || selectedHelperData.method.id],
            };

            // 1. First delete existing helpers to ensure a clean sync
            if (currentHelpers.length > 0 && helperDelete) {
                await helperDelete({ ...payloadBase, helper_ids: currentHelpers });
            }

            // 2. Then create the newly selected helpers
            if (newHelpers.length > 0 && helperCreate) {
                await helperCreate({ ...payloadBase, helper_ids: newHelpers });
            }

            message.success("辅助人员已更新");
            setHelperVisible(false);
            setHasChanged(true);
            fetchSampleDetail();
        } catch (error) {
            message.error("更新辅助人员失败");
        } finally {
            setHelperLoading(false);
        }
    };

    return (
        <Drawer
            title={
                <div className="flex justify-between items-center w-full pr-10">
                    <div className="flex flex-col">
                        <span className="text-xl font-black text-slate-800">样品项目与生命周期管理</span>
                        <span className="text-xs text-slate-400 font-mono mt-1">
                            {sampleData?.task_lab_code}-{sampleData?.lab_code?.toString().padStart(4, '0')} / {sampleData?.client_code}
                        </span>
                    </div>
                </div>
            }
            width={900}
            open={visible}
            onClose={() => {
                onClose(hasChanged);
                setHasChanged(false);
            }}
            destroyOnClose
            className="project-management-drawer"
        >
            <Tabs 
                activeKey={activeTab} 
                onChange={setActiveTab}
                type="card"
                className="custom-tabs"
                items={[
                    {
                        key: "items",
                        label: <span className="px-4"><ExperimentOutlined /> 检测项管理</span>,
                        children: (
                            // V2: 样品-方法扁平结构。检测项目(仅名称) 与 检测方法(完整生命周期) 左右分栏。
                            //     加工要求框已移除，加工任务改到右侧“已添加的方法卡片”上单独添加。
                            <div className="space-y-6">
                                <div className="flex justify-between items-center bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                    <div className="text-slate-500 text-sm max-w-2xl">
                                        <b>工作流提示：</b> 左侧维护该样品所需的检测项目；右侧分派并跟踪各检测方法的完整生命周期。
                                    </div>
                                </div>

                                {/* V2: 样品级加工任务 */}
                                {!hideProcessing && (
                                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-sm font-black text-slate-700">
                                                <ToolOutlined className="mr-1 text-orange-500" />加工任务
                                            </span>
                                            <Space>
                                                {isEditable && !processingLocked && sampleData?.processing_status !== 2 && (
                                                    <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openSampleProcTask} className="rounded-lg font-bold bg-orange-500 border-none">
                                                        {sampleData?.processing?.length > 0 ? "修改加工任务" : "添加加工任务"}
                                                    </Button>
                                                )}
                                                {isEditable && !processingLocked && sampleData?.processing?.length > 0 && (
                                                    <Popconfirm title="确定删除加工任务吗？" onConfirm={handleProcessDelete} okText="确认" cancelText="取消" okButtonProps={{ danger: true }}>
                                                        <Button size="small" type="link" danger icon={<DeleteOutlined />} className="rounded-lg font-bold">删除</Button>
                                                    </Popconfirm>
                                                )}
                                            </Space>
                                        </div>
                                        
                                        {sampleData?.processing?.length > 0 ? (
                                            <div className="text-sm">
                                                <div className="mb-2">
                                                    <span className="text-slate-400">状态：</span>
                                                    <Tag color={ProcessingStatusMap[sampleData.processing_status]?.color} icon={ProcessingStatusMap[sampleData.processing_status]?.icon}>
                                                        {ProcessingStatusMap[sampleData.processing_status]?.label}
                                                    </Tag>
                                                    {sampleData.processing_deadline && (
                                                        <span className="ml-4"><span className="text-slate-400">截止日期：</span>{sampleData.processing_deadline.split(' ')[0]}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <span className="text-slate-400">加工选项：</span>
                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                        {sampleData.processing.map(p => (
                                                            <Tag key={p.id || p.option_id} className="m-0 bg-orange-50 text-orange-600 border-orange-100 rounded-md px-2 py-0.5 font-bold">
                                                                {p.method_name}
                                                                {p.value ? ` - ${p.value}` : ''}
                                                            </Tag>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-slate-400 text-xs py-2">无加工任务</div>
                                        )}
                                    </div>
                                )}

                                {/* V2: 左右分栏 —— 左侧检测项目(4/12)、右侧检测方法(8/12，更宽) */}
                                <div className="grid grid-cols-12 gap-5">
                                    {/* 左：检测项目（仅名称，负责增删） */}
                                    <div className="col-span-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-sm font-black text-slate-700">
                                                <ExperimentOutlined className="mr-1 text-blue-500" />检测项目
                                                <span className="text-slate-400 font-mono text-xs ml-1">({sampleData?.items?.length || 0})</span>
                                            </span>
                                            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setItemModalVisible(true)} disabled={!isEditable} className="rounded-lg font-bold bg-slate-900 border-none">添加项目</Button>
                                        </div>
                                        {sampleData?.items?.length > 0 ? (
                                            <div className="space-y-2">
                                                {sampleData.items.map(item => (
                                                    <div key={item.item_id || item.id} className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="font-bold text-slate-800 text-sm truncate">{item.name || item.item_name}</span>
                                                            <span className="font-mono text-[10px] text-slate-400">#{item.id || item.item_id}</span>
                                                        </div>
                                                        {isEditable && (
                                                            <Popconfirm title="确定移除此检测项吗？" onConfirm={() => handleItemDelete(item.item_id || item.id)} okText="确认删除" cancelText="取消" okButtonProps={{ danger: true }}>
                                                                <Button type="link" danger icon={<DeleteOutlined />} size="small">删除</Button>
                                                            </Popconfirm>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center">
                                                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span className="text-slate-400 text-xs">暂无检测项目</span>} />
                                            </div>
                                        )}
                                    </div>

                                    {/* 右：检测方法（样品级，完整生命周期与操作） */}
                                    <div className="col-span-8 border-l border-slate-100 pl-5">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-sm font-black text-slate-700">
                                                <AuditOutlined className="mr-1 text-indigo-500" />检测方法
                                                <span className="text-slate-400 font-mono text-xs ml-1">({sampleData?.methods?.length || 0})</span>
                                            </span>
                                            {isEditable && (
                                                <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openConfigModal} className="rounded-lg font-bold bg-slate-900 border-none">分派方法</Button>
                                            )}
                                        </div>
                                        {sampleData?.methods?.length > 0 ? (
                                            <div className="space-y-3">
                                                {sampleData.methods.map(m => (
                                                    <div key={m.method_id || m.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
                                                        <div className="flex justify-between items-center gap-2 flex-wrap">
                                                            <div className="font-bold text-slate-800 text-sm">{m.method_name || m.name}</div>
                                                            <Space wrap size={[4, 4]}>
                                                                {!hideDistribute && (
                                                                    distributeType === 'inspector' ? (
                                                                        <Tooltip title={
                                                                            sampleData?.processing_status === 1
                                                                                ? "前处理加工中，完成后方可指派"
                                                                                : (m.status > 1 ? "该方法已指派" : (m.status === 0 ? "管理组尚未下发" : "指派检测员"))
                                                                        }>
                                                                            <Button
                                                                                type="primary"
                                                                                size="small"
                                                                                disabled={sampleData?.processing_status === 1 || m.status !== 1}
                                                                                onClick={() => openDistributeModal(m)}
                                                                                className="font-bold text-[11px] rounded-lg h-7"
                                                                            >
                                                                                指派检测员
                                                                            </Button>
                                                                        </Tooltip>
                                                                    ) : (
                                                                        <Button
                                                                            type="primary"
                                                                            size="small"
                                                                            disabled={sampleData?.processing_status === 1 || m.status !== 0}
                                                                            onClick={() => openDistributeModal(m)}
                                                                            className="font-bold text-[11px] rounded-lg h-7"
                                                                        >
                                                                            下发到科室
                                                                        </Button>
                                                                    )
                                                                )}
                                                                {/* Review for Department Manager (status 3) or Workflow Manager (status 4) */}
                                                                {((distributeType === 'inspector' && m.status === 3 && !showResultEntry) ||
                                                                  (distributeType === 'department' && m.status === 4)) && (
                                                                    <Button
                                                                        type="link"
                                                                        size="small"
                                                                        icon={<AuditOutlined />}
                                                                        onClick={() => openReviewModal(m)}
                                                                        className="font-bold text-[11px] h-7 text-blue-600 hover:text-blue-700"
                                                                    >
                                                                        审核
                                                                    </Button>
                                                                )}

                                                                {/* View Results for Workflow Manager (status >= 2) */}
                                                                {distributeType === 'department' && m.status >= 2 && m.status !== 4 && (
                                                                    <Button
                                                                        type="link"
                                                                        size="small"
                                                                        icon={<InfoCircleOutlined />}
                                                                        onClick={() => {
                                                                            setActiveMethodData(m);
                                                                            setResultEntryVisible(true);
                                                                        }}
                                                                        className="font-bold text-[11px] h-7 text-slate-500 hover:text-slate-600"
                                                                    >
                                                                        查看数据
                                                                    </Button>
                                                                )}

                                                                {showResultEntry && m.status >= 2 && (
                                                                    <>
                                                                        <Button
                                                                            type="link"
                                                                            size="small"
                                                                            icon={m.status >= 3 ? <InfoCircleOutlined /> : <EditOutlined />}
                                                                            onClick={() => {
                                                                                setActiveMethodData(m);
                                                                                setResultEntryVisible(true);
                                                                            }}
                                                                            className="font-bold text-[11px] h-7"
                                                                        >
                                                                            {m.status >= 3 ? '查看数据' : '数据录入'}
                                                                        </Button>
                                                                        {m.status === 2 && templateSample && (
                                                                            <Button
                                                                                type="link"
                                                                                size="small"
                                                                                icon={<DownloadOutlined />}
                                                                                onClick={() => handleDownloadTemplate(m)}
                                                                                className="font-bold text-[11px] h-7 text-green-600 hover:text-green-700"
                                                                            >
                                                                                下载模板
                                                                            </Button>
                                                                        )}
                                                                    </>
                                                                )}

                                                                {showResultEntry && m.status === 2 && (
                                                                    <Button
                                                                        type="link"
                                                                        size="small"
                                                                        icon={<SendOutlined />}
                                                                        onClick={() => openApproveModal(m)}
                                                                        className="font-bold text-[11px] h-7 text-green-600 hover:text-green-700"
                                                                    >
                                                                        提交至科室
                                                                    </Button>
                                                                )}

                                                                {showResultEntry && m.status === 2 && (
                                                                    <Popconfirm
                                                                        title="退回任务"
                                                                        description="确定退回该任务吗？退回后该任务将重新回到科室待指派状态。"
                                                                        onConfirm={() => handleRollback(m)}
                                                                        okText="确认退回"
                                                                        cancelText="取消"
                                                                        okButtonProps={{ loading: rollingBack, danger: true }}
                                                                    >
                                                                        <Button
                                                                            type="link"
                                                                            size="small"
                                                                            icon={<RollbackOutlined />}
                                                                            className="font-bold text-[11px] h-7 text-red-400 hover:text-red-500"
                                                                        >
                                                                            退回任务
                                                                        </Button>
                                                                    </Popconfirm>
                                                                )}

                                                                {/* Rollback for Department Manager (status 1) */}
                                                                {distributeType === 'inspector' && m.status === 1 && (
                                                                    <Popconfirm
                                                                        title="撤回任务"
                                                                        description="确定将该任务撤回到管理组吗？"
                                                                        onConfirm={() => handleRollback(m)}
                                                                        okText="确认撤回"
                                                                        cancelText="取消"
                                                                        okButtonProps={{ loading: rollingBack, danger: true }}
                                                                    >
                                                                        <Button
                                                                            type="link"
                                                                            size="small"
                                                                            icon={<RollbackOutlined />}
                                                                            className="font-bold text-[11px] h-7 text-red-400 hover:text-red-500"
                                                                        >
                                                                            撤回任务
                                                                        </Button>
                                                                    </Popconfirm>
                                                                )}

                                                                {distributeType === 'inspector' && m.status >= 1 && m.status < 3 && !hideDistribute && (
                                                                    <Button
                                                                        size="small"
                                                                        icon={<UserOutlined />}
                                                                        onClick={() => openHelperModal(m)}
                                                                        className="font-bold text-[11px] rounded-lg h-7"
                                                                    >
                                                                        辅助人员
                                                                    </Button>
                                                                )}



                                                                {/* Delete method — allowed regardless of status; status is shown above */}
                                                                {isEditable && methodDelete && (
                                                                    <Popconfirm
                                                                        title="确定删除此方法吗？"
                                                                        description={`当前状态：${MethodStatusMap[m.status]?.label || "未知"}，删除后其相关数据将一并移除。`}
                                                                        onConfirm={() => handleMethodDelete(m.method_id || m.id)}
                                                                        okText="确认删除"
                                                                        cancelText="取消"
                                                                        okButtonProps={{ danger: true }}
                                                                    >
                                                                        <Button
                                                                            type="link"
                                                                            size="small"
                                                                            danger
                                                                            icon={<DeleteOutlined />}
                                                                            className="font-bold text-[11px] h-7"
                                                                        >
                                                                            删除
                                                                        </Button>
                                                                    </Popconfirm>
                                                                )}
                                                            </Space>
                                                        </div>

                                                        {/* V2: 方法信息区 —— 名字下方左右分列展示 下发科室/检测员/截止/辅助员/结果 */}
                                                        <div className="mt-2 pt-2 border-t border-slate-50 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
                                                            <div className="flex justify-between items-center gap-2 min-w-0">
                                                                <span className="text-slate-400 shrink-0">下发科室</span>
                                                                <span className="font-bold text-slate-700 truncate">{m.department_name || '—'}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center gap-2 min-w-0">
                                                                <span className="text-slate-400 shrink-0">检测员</span>
                                                                <span className="font-bold text-slate-700 truncate">
                                                                    {m.tester_name
                                                                        ? <><UserOutlined className="text-blue-500 mr-1" />{m.tester_name}</>
                                                                        : '未指派'}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between items-center gap-2 min-w-0">
                                                                <span className="text-slate-400 shrink-0">状态</span>
                                                                <Tag color={MethodStatusMap[m.status]?.color} className="m-0 border-none text-[10px] font-bold uppercase px-2">
                                                                    {MethodStatusMap[m.status]?.label || "未知状态"}
                                                                </Tag>
                                                            </div>
                                                            <div className="flex justify-between items-center gap-2 min-w-0">
                                                                <span className="text-slate-400 shrink-0">截止日期</span>
                                                                <span className="font-bold text-slate-700">
                                                                    {m.test_deadline
                                                                        ? <><CalendarOutlined className="text-amber-500 mr-1" />{m.test_deadline}</>
                                                                        : '—'}
                                                                </span>
                                                            </div>
                                                            <div className="col-span-2 flex items-start gap-2 min-w-0">
                                                                <span className="text-slate-400 shrink-0">辅助员</span>
                                                                <div className="flex flex-wrap gap-1 justify-end flex-1">
                                                                    {m.helpers?.length > 0 ? m.helpers.map(h => {
                                                                        const statusCfg = {
                                                                            0: { label: "待确认", color: "default" },
                                                                            1: { label: "已接受", color: "success" },
                                                                            2: { label: "已拒绝", color: "error" },
                                                                        }[h.status] || { label: "待确认", color: "default" };
                                                                        return (
                                                                            <Tooltip key={h.user_id || h.id} title={statusCfg.label}>
                                                                                <Tag icon={<TeamOutlined />} color={statusCfg.color} className="m-0 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                                                                    {h.nickname || h.name}
                                                                                </Tag>
                                                                            </Tooltip>
                                                                        );
                                                                    }) : <span className="text-slate-300 italic">未分配</span>}
                                                                </div>
                                                            </div>
                                                            <div className="col-span-2 flex items-start gap-2 min-w-0">
                                                                <span className="text-slate-400 shrink-0">结果</span>
                                                                <div className="flex flex-wrap gap-1 justify-end flex-1">
                                                                    {m.results?.length > 0 ? m.results.map((r, i) => {
                                                                        const valStr = String(r.value || '');
                                                                        const displayVal = valStr.length > 10 ? valStr.substring(0, 10) + '...' : valStr;
                                                                        const tag = (
                                                                            <Tag key={r.field_id || r.id || i} color="cyan" className="m-0 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                                                                {r.name}: {displayVal}
                                                                            </Tag>
                                                                        );
                                                                        return valStr.length > 10 ? (
                                                                            <Tooltip key={r.field_id || r.id || i} title={valStr}>
                                                                                {tag}
                                                                            </Tooltip>
                                                                        ) : tag;
                                                                    }) : <span className="text-slate-300 italic">暂无</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center">
                                                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span className="text-slate-400 text-xs">待分派检测方法</span>} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    },
                    {
                        key: "inputs",
                        label: <span className="px-4"><ToolOutlined /> 自定义参数</span>,
                        children: (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="text-sm text-slate-500 font-bold">配置样品的特殊属性、自定义元数据等参数</div>
                                    <Button 
                                        type="primary" 
                                        icon={<PlusOutlined />} 
                                        onClick={() => { setEditingInput(null); setInputModalVisible(true); }} 
                                        className="rounded-xl h-9 font-bold bg-slate-900 border-none"
                                        disabled={!isEditable}
                                    >
                                        添加参数
                                    </Button>
                                </div>
                                <Table 
                                    dataSource={sampleData?.inputs || []} 
                                    columns={[
                                        { title: "属性名称", dataIndex: "key", key: "key", width: 160, render: t => <span className="font-black text-slate-700">{t}</span> },
                                        { title: "属性值", dataIndex: "value", key: "value", render: t => <span className="text-slate-600 font-medium">{t}</span> },
                                        { title: "最后更新", dataIndex: "updated_at", key: "updated_at", width: 180, render: v => <span className="text-[11px] text-slate-400 font-mono">{v || "-"}</span> },
                                        {
                                            title: "操作",
                                            key: "action",
                                            width: 100,
                                            align: 'right',
                                            render: (_, record) => (
                                                <Space>
                                                    <Button 
                                                        type="link" 
                                                        size="small" 
                                                        icon={<EditOutlined />} 
                                                        onClick={() => { setEditingInput(record); setInputModalVisible(true); }} 
                                                        disabled={!isEditable}
                                                    />
                                                    {isEditable && (
                                                        <Popconfirm title="确定删除吗？" onConfirm={() => handleInputDelete(record.key)}>
                                                            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                                                        </Popconfirm>
                                                    )}
                                                </Space>
                                            )
                                        }
                                    ]} 
                                    size="middle"
                                    pagination={false}
                                    rowKey="key"
                                />
                            </div>
                        )
                    }
                ]} 
            />

            <style>{`
                .project-management-drawer .ant-drawer-body { padding-top: 24px; }
                .project-management-drawer .custom-tabs .ant-tabs-nav::before { border-bottom: 2px solid #f1f5f9; }
                .project-management-drawer .custom-tabs .ant-tabs-tab { 
                    border: none !important; 
                    background: transparent !important;
                    transition: all 0.3s;
                }
                .project-management-drawer .custom-tabs .ant-tabs-tab-active { 
                    background: #fff !important; 
                }
                .project-management-drawer .custom-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
                   color: #2563eb !important;
                   font-weight: 900 !important;
                }
            `}</style>

            <InputModal 
                visible={inputModalVisible} 
                onClose={() => setInputModalVisible(false)} 
                onSave={handleInputSave} 
                editingInput={editingInput} 
            />
            
            <ItemSelectModal 
                visible={itemModalVisible} 
                onClose={() => setItemModalVisible(false)} 
                onSave={handleItemAdd} 
            />

            {/* V2: 配置弹窗改为样品级方法分派（加工配置已移除，加工任务在方法卡片上单独添加） */}
            <ItemConfigModal
                visible={configModalVisible}
                onClose={() => setConfigModalVisible(false)}
                sampleData={sampleData}
                onSaveMethod={handleMethodSave}
                onDeleteMethod={handleMethodDelete}
                disabled={!isEditable}
            />

            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <SendOutlined className="text-blue-500" />
                        <span>{distributeType === 'inspector' ? '指派检测员' : '检测项目下发科室'}</span>
                    </div>
                }
                open={distributeVisible}
                onCancel={() => setDistributeVisible(false)}
                onOk={() => distributeForm.submit()}
                confirmLoading={distributeLoading}
                okText="确认下发"
                cancelText="取消"
                centered
                destroyOnClose
            >
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="text-xs text-blue-800">
                        <p className="font-bold mb-1">正在下发：</p>
                        {/* V2: 方法上提到样品级，不再展示所属检测项目 */}
                        <p>检测方法：{selectedDistData?.method?.method_name || selectedDistData?.method?.name}</p>
                    </div>
                </div>
                
                <Form form={distributeForm} onFinish={handleDistributeSubmit} layout="vertical">
                    <Form.Item name="recipient_id" label={distributeType === 'inspector' ? '检测员' : '接收科室'} rules={[{ required: true, message: '必选' }]}>
                        <Select 
                            placeholder={distributeType === 'inspector' ? '请选择检测员' : '请选择接收科室'} 
                            options={departments.map(d => ({ 
                                label: d.name || d.nickname, 
                                value: d.id,
                                // Mutual Exclusivity: If a user is already a helper, they cannot be the main inspector
                                disabled: distributeType === 'inspector' && selectedDistData?.method?.helpers?.some(h => (h.user_id || h.id) === d.id)
                            }))}
                            showSearch
                            optionFilterProp="label"
                        />
                    </Form.Item>
                    <Form.Item name="deadline" label="完成期限" rules={[{ required: true, message: '请设定完成期限' }]}>
                        <DatePicker 
                            className="w-full" 
                            placeholder="选择日期" 
                            disabledDate={current => current && current < dayjs().startOf('day')}
                        />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Helper Management Modal */}
            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <UserOutlined className="text-purple-500" />
                        <span>配置辅助检测人员</span>
                    </div>
                }
                open={helperVisible}
                onCancel={() => setHelperVisible(false)}
                onOk={() => helperForm.submit()}
                confirmLoading={helperLoading}
                okText="更新辅助人"
                cancelText="取消"
                centered
                destroyOnClose
            >
                <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-100">
                    <div className="text-xs text-purple-800">
                        <p className="font-bold mb-1">主检测员：{selectedHelperData?.method?.tester_name || '未指派'}</p>
                        {/* V2: 方法上提到样品级，不再展示所属检测项目 */}
                        <p>检测方法：{selectedHelperData?.method?.method_name || selectedHelperData?.method?.name}</p>
                    </div>
                </div>
                
                <Form form={helperForm} onFinish={handleHelperSubmit} layout="vertical">
                    <Form.Item name="helper_ids" label="辅助人员列表" tooltip="可选择多名协作人员">
                        <Select 
                            mode="multiple"
                            placeholder="请选择辅助人员" 
                            options={departments.map(d => ({ 
                                label: d.nickname || d.name, 
                                value: d.id,
                                // Mutual Exclusivity: If a user is the main inspector, they cannot be a helper
                                disabled: d.id === selectedHelperData?.method?.tester_id
                            }))}
                            showSearch
                            optionFilterProp="label"
                        />
                    </Form.Item>
                </Form>
            </Modal>

            {/* 加工任务弹窗 */}
            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <ToolOutlined className="text-orange-500" />
                        <span>配置加工任务</span>
                    </div>
                }
                open={procTaskVisible}
                onCancel={() => setProcTaskVisible(false)}
                onOk={handleProcTaskSubmit}
                confirmLoading={procTaskLoading}
                okText="确定"
                cancelText="取消"
                width={600}
                destroyOnClose
            >
                {procTaskOptionsLoading ? (
                    <div className="py-10 text-center"><Spin /></div>
                ) : (
                    <div className="space-y-4 pt-2">
                        <ProcessingOptionSelector
                            value={procTaskOptionIds}
                            onChange={setProcTaskOptionIds}
                            suggestedOptions={suggestedProcOptions}
                            allOptions={allProcOptions}
                        />
                        <div>
                            <div className="text-sm font-bold text-slate-700 mb-2">完成期限</div>
                            <DatePicker
                                className="w-full rounded-xl"
                                value={procTaskDeadline}
                                onChange={setProcTaskDeadline}
                                disabledDate={current => current && current < dayjs().startOf('day')}
                            />
                        </div>
                    </div>
                )}
            </Modal>
            <ResultEntryModal 
                open={resultEntryVisible}
                onCancel={() => setResultEntryVisible(false)}
                onSuccess={() => {
                    setResultEntryVisible(false);
                    fetchSampleDetail();
                }}
                methodId={activeMethodData?.method_id || activeMethodData?.id}
                methodName={activeMethodData?.method_name || activeMethodData?.name}
                methodData={activeMethodData}
                sampleData={sampleData}
                readOnly={activeMethodData?.status >= 3 || distributeType === 'department'}
            />
            <ApproveModal 
                open={approveVisible}
                onCancel={() => setApproveVisible(false)}
                onSuccess={() => {
                    setApproveVisible(false);
                    setHasChanged(true);
                    fetchSampleDetail();
                }}
                data={approveData}
            />
            <ReviewModal 
                open={reviewVisible}
                onCancel={() => setReviewVisible(false)}
                onSuccess={() => {
                    // We don't necessarily close the modal if there are more items (for batch)
                    // but for single detail view, the user can close it.
                    setHasChanged(true);
                    fetchSampleDetail();
                }}
                data={reviewData}
                apis={{
                    approve: approveMethod,
                    reject: rejectMethod
                }}
                rejectDescription={distributeType === 'department' ? "驳回后科室将需要重新审核数据。" : "驳回后检测员将需要重新录入数据。"}
            />
        </Drawer>
    );
};

export default DetailDrawer;
