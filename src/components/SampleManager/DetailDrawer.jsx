import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Drawer, Tabs, Table, Button, Space, message, Tag, Empty, Popconfirm, Divider, Card, Modal, Form, Select, DatePicker, Tooltip } from "antd";

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
    RollbackOutlined, AuditOutlined
} from "@ant-design/icons";
import { comboDepartment } from "../../api/department";
import dayjs from "dayjs";

// Modals - we'll assume they are in the same directory or passed as props
import InputModal from "./modals/InputModal";
import ItemSelectModal from "./modals/ItemSelectModal";
import SpecialSampleModal from "./modals/SpecialSampleModal";
import ResultEntryModal from "./modals/ResultEntryModal";
import ItemConfigModal from "./modals/ItemConfigModal";
import ApproveModal from "./modals/ApproveModal";
import ReviewModal from "./modals/ReviewModal";

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
        rejectMethod // API for manager rejection
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
    const [activeItemId, setActiveItemId] = useSafeState(null, isMounted);
    const [activeItemName, setActiveItemName] = useSafeState("", isMounted);
    const [activeItemData, setActiveItemData] = useSafeState(null, isMounted);
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
            // Pre-load recipient list (departments or users)
            const api = comboRecipient || comboDepartment;
            if (api) {
                api().then(res => setDepartments(res.data.data || []));
            }
        }
    }, [visible, initialSampleData, taskLabCode]);

    const fetchSampleDetail = async () => {
        // We keep this function for post-mutation refresh if onSuccess is not enough
        // but the user wants us to avoid extra reads. 
        // So we will primarily use onSuccess.
        if (apis.onSuccess) apis.onSuccess();
    };

    const openApproveModal = (item, method) => {
        setApproveData({
            sampleIds: [sampleData.id],
            itemId: item.item_id || item.id,
            methodIds: [method.method_id || method.id],
            details: [{
                labCode: `${sampleData.task_lab_code}-${sampleData.lab_code?.toString().padStart(4, '0')}`,
                itemName: item.item_name || item.name,
                methodName: method.method_name || method.name,
                results: method.results || []
            }]
        });
        setApproveVisible(true);
    };

    const openReviewModal = (item, method) => {
        setReviewData({
            sampleIds: [sampleData.id],
            itemId: item.item_id || item.id,
            details: [{
                labCode: `${sampleData.task_lab_code}-${sampleData.lab_code?.toString().padStart(4, '0')}`,
                itemName: item.item_name || item.name,
                methodName: method.method_name || method.name,
                methodId: method.method_id || method.id,
                results: method.results || []
            }]
        });
        setReviewVisible(true);
    };

    const handleRollback = async (item, method) => {
        if (!rollback) return;
        setRollingBack(true);
        try {
            const res = await rollback({
                sample_ids: [sampleData.id],
                item_id: item.item_id || item.id,
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

    // --- Unified Config Logic ---
    const handleMethodSave = async (itemId, values) => {
        try {
            if (!methodCreate) return message.warning("无此操作权限");
            // Remove single method_id from spread values to avoid redundant/wrong parameters
            const { method_id, ...otherValues } = values;
            const payload = {
                sample_ids: [sampleId],
                item_id: itemId,
                method_ids: [method_id],
                ...otherValues
            };
            await methodCreate(payload);
            message.success("试验分派成功");
            setHasChanged(true);
            fetchSampleDetail();
        } catch (error) {}
    };

    const handleProcessSave = async (itemId, values) => {
        try {
            const item = sampleData.items?.find(i => (i.item_id || i.id) === itemId);
            const api = item?.processing_status === 1 ? processUpdate : processCreate;
            if (!api) return message.warning("无此操作权限");
            const payload = {
                sample_ids: [sampleId],
                item_ids: [itemId],
                ...values
            };
            await api(payload);
            message.success("加工要求已更新");
            setHasChanged(true);
            fetchSampleDetail();
        } catch (error) {}
    };

    const handleProcessDelete = async (itemId) => {
        try {
            if (!processDelete) return message.warning("无此操作权限");
            await processDelete({ sample_ids: [sampleId], item_ids: [itemId] });
            message.success("加工处理已清除");
            setHasChanged(true);
            fetchSampleDetail();
        } catch (error) {}
    };

    const handleMethodDelete = async (itemId, methodId) => {
        try {
            if (!methodDelete) return message.warning("无此操作权限");
            await methodDelete({ sample_ids: [sampleId], item_id: itemId, method_ids: [methodId] });
            message.success("已移除方法");
            setHasChanged(true);
            fetchSampleDetail();
        } catch (error) {}
    };

    const openConfigModal = (item) => {
        setActiveItemId(item.item_id || item.id);
        setActiveItemName(item.name || item.item_name);
        setActiveItemData(item);
        setConfigModalVisible(true);
    };

    const openDistributeModal = async (item, method) => {
        setSelectedDistData({ item, method });
        setDistributeVisible(true);
        distributeForm.resetFields();
    };

    const handleDistributeSubmit = async (values) => {
        setDistributeLoading(true);
        try {
            if (!distribute) return message.warning("无此操作权限");
            const payload = {
                sample_ids: [sampleId],
                item_id: selectedDistData.item.item_id || selectedDistData.item.id,
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
    const openHelperModal = (item, method) => {
        setSelectedHelperData({ item, method });
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
            
            const payloadBase = {
                sample_ids: [sampleId],
                item_id: selectedHelperData.item.item_id || selectedHelperData.item.id,
                method_id: selectedHelperData.method.method_id || selectedHelperData.method.id,
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
                            <div className="space-y-6">
                                <div className="flex justify-between items-center bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                    <div className="text-slate-500 text-sm max-w-lg">
                                        <b>工作流提示：</b> 1. 先添加该样品所需的所有检测项目； 2. 点击每个项目下方的<b>“精细化配置”</b>来设置加工工艺及试验方法。
                                    </div>
                                    <Button 
                                        type="primary" 
                                        icon={<PlusOutlined />} 
                                        onClick={() => setItemModalVisible(true)} 
                                        className="bg-slate-900 border-none rounded-xl h-12 px-8 font-bold shadow-lg"
                                        disabled={!isEditable}
                                    >
                                        添加检测项目
                                    </Button>
                                </div>

                                {sampleData?.items?.length > 0 ? (
                                    <div className="space-y-6">
                                        {sampleData.items.map(item => (
                                            <Card 
                                                key={item.item_id || item.id} 
                                                size="small"
                                                className="shadow-sm border-slate-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow"
                                                title={
                                                    <div className="flex justify-between items-center py-2">
                                                        <Space size="middle">
                                                            <div className="flex flex-col">
                                                                <span className="text-base font-black text-slate-800">
                                                                    {item.name || item.item_name}
                                                                    <Tag className="ml-2 font-mono text-[10px] bg-slate-100 border-none text-slate-500">#{item.id || item.item_id}</Tag>
                                                                </span>
                                                                {!hideProcessing && (
                                                                    <Tag 
                                                                        icon={ProcessingStatusMap[item.processing_status]?.icon} 
                                                                        color={ProcessingStatusMap[item.processing_status]?.color}
                                                                        className="m-0 border-none text-[10px] uppercase font-bold px-2 block mt-1 w-max"
                                                                    >
                                                                    {ProcessingStatusMap[item.processing_status]?.label}
                                                                </Tag>
                                                            )}
                                                        </div>
                                                    </Space>
                                                        <Space>
                                                            <Button 
                                                                type="primary" 
                                                                ghost 
                                                                size="small" 
                                                                icon={<SettingOutlined />} 
                                                                onClick={() => openConfigModal(item)}
                                                                className="rounded-lg font-bold"
                                                            >
                                                                {isEditable ? "精细化配置" : "查看配置详情"}
                                                            </Button>
                                                            {isEditable && (
                                                                <Popconfirm title="确定移除此检测项（及其配置）吗？" onConfirm={() => handleItemDelete(item.item_id || item.id)}>
                                                                    <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                                                                </Popconfirm>
                                                            )}
                                                        </Space>
                                                    </div>
                                                }
                                            >
                                                <div className="bg-slate-50/30 rounded-xl p-4">
                                                    <div className="grid grid-cols-12 gap-6">
                                                                {!hideProcessing && (
                                                                    <div className="col-span-4">
                                                                        <div className="text-[12px] text-slate-400 font-bold uppercase tracking-wider mb-2">前处理要求</div>
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {item.processing?.length > 0 ? (
                                                                                item.processing.map(proc => (
                                                                                    <Tag key={proc.option_id || proc.id} className="bg-white border-slate-200 text-slate-600 py-1.5 px-3 rounded-lg text-sm">
                                                                                        <span className="font-bold">{proc.method_name || proc.name}</span>
                                                                                        { (proc.option_value || proc.value || proc.option_name) ? ` - ${proc.option_value || proc.value || proc.option_name}` : ''}
                                                                                    </Tag>
                                                                                ))
                                                                            ) : (
                                                                                <span className="text-sm text-slate-300 italic">常规处理 / 无</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                <div className={hideProcessing ? "col-span-12" : "col-span-8 border-l border-slate-100 pl-6"}>
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="text-[12px] text-slate-400 font-bold uppercase tracking-wider">分派试验方法</div>
                                                                {item.methods?.length > 0 && (
                                                                    <Tag color={MethodStatusMap[item.methods[0].status]?.color} className="m-0 border-none font-bold text-[10px] uppercase px-2">
                                                                        {MethodStatusMap[item.methods[0].status]?.label}
                                                                    </Tag>
                                                                )}
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                {item.methods?.length > 0 ? (
                                                                    item.methods.map(m => (
                                                                        <div key={m.method_id || m.id} className="py-2.5 border-b border-slate-50 last:border-0">
                                                                            <div className="flex justify-between items-center text-sm">
                                                                                <Space>
                                                                                    <span className="font-bold text-slate-700">{m.method_name || m.name}</span>
                                                                                </Space>
                                                                                <Space>
                                                                                    {!hideDistribute && (
                                                                                        <Tooltip title={
                                                                                            item.processing_status === 1 
                                                                                                ? "前处理加工中，完成后方可指派" 
                                                                                                : (m.status > 1 ? "该方法已指派" : (m.status === 0 ? "管理组尚未下发" : "指派检测员"))
                                                                                        }>
                                                                                            <Button 
                                                                                                type="primary" 
                                                                                                size="small" 
                                                                                                disabled={item.processing_status === 1 || (distributeType === 'inspector' ? m.status !== 1 : m.status !== 0)}
                                                                                                onClick={() => openDistributeModal(item, m)}
                                                                                                className="font-bold text-[11px] rounded-lg h-7"
                                                                                            >
                                                                                                {distributeType === 'inspector' ? '指派检测员' : '下发到科室'}
                                                                                            </Button>
                                                                                        </Tooltip>
                                                                                    )}
                                                                                    
                                                                                    {/* Review for Department Manager (status 3) or Workflow Manager (status 4) */}
                                                                                    {((distributeType === 'inspector' && m.status === 3 && !showResultEntry) || 
                                                                                      (distributeType === 'department' && m.status === 4)) && (
                                                                                        <Button 
                                                                                            type="link"
                                                                                            size="small" 
                                                                                            icon={<AuditOutlined />} 
                                                                                            onClick={() => openReviewModal(item, m)}
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
                                                                                                setActiveItemId(item.item_id || item.id);
                                                                                                setResultEntryVisible(true);
                                                                                            }}
                                                                                            className="font-bold text-[11px] h-7 text-slate-500 hover:text-slate-600"
                                                                                        >
                                                                                            查看数据
                                                                                        </Button>
                                                                                    )}
                                                                                    
                                                                                    {showResultEntry && m.status >= 2 && (
                                                                                        <Button 
                                                                                            type="link"
                                                                                            size="small" 
                                                                                            icon={m.status >= 3 ? <InfoCircleOutlined /> : <EditOutlined />} 
                                                                                            onClick={() => {
                                                                                                setActiveMethodData(m);
                                                                                                setActiveItemId(item.item_id || item.id);
                                                                                                setResultEntryVisible(true);
                                                                                            }}
                                                                                            className="font-bold text-[11px] h-7"
                                                                                        >
                                                                                            {m.status >= 3 ? '查看数据' : '数据录入'}
                                                                                        </Button>
                                                                                    )}
                                                                                    
                                                                                    {showResultEntry && m.status === 2 && (
                                                                                        <Button 
                                                                                            type="link"
                                                                                            size="small" 
                                                                                            icon={<SendOutlined />} 
                                                                                            onClick={() => openApproveModal(item, m)}
                                                                                            className="font-bold text-[11px] h-7 text-green-600 hover:text-green-700"
                                                                                        >
                                                                                            提交至科室
                                                                                        </Button>
                                                                                    )}
                                                                                    
                                                                                    {showResultEntry && m.status === 2 && (
                                                                                        <Popconfirm
                                                                                            title="退回任务"
                                                                                            description="确定退回该任务吗？退回后该任务将重新回到科室待指派状态。"
                                                                                            onConfirm={() => handleRollback(item, m)}
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
                                                                                            onConfirm={() => handleRollback(item, m)}
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
                                                                                            onClick={() => openHelperModal(item, m)}
                                                                                            className="font-bold text-[11px] rounded-lg h-7 ml-2"
                                                                                        >
                                                                                            辅助人员
                                                                                        </Button>
                                                                                    )}
                                                                                </Space>
                                                                            </div>
                                                                            
                                                                            {(m.tester_name || m.helpers?.length > 0) && (
                                                                                <div className="flex flex-wrap gap-2 mt-2">
                                                                                    {m.tester_name && (
                                                                                        <Tag icon={<UserOutlined />} color="blue" className="m-0 border-none text-[10px] font-bold px-2 py-0.5 rounded-md">
                                                                                            主检: {m.tester_name}
                                                                                        </Tag>
                                                                                    )}
                                                                                    {m.helpers?.map(h => {
                                                                                        const statusCfg = {
                                                                                            0: { label: "待确认", color: "default" },
                                                                                            1: { label: "已接受", color: "success" },
                                                                                            2: { label: "已拒绝", color: "error" },
                                                                                        }[h.status] || { label: "待确认", color: "default" };

                                                                                        return (
                                                                                            <Tooltip key={h.user_id || h.id} title={statusCfg.label}>
                                                                                                <Tag 
                                                                                                    icon={<TeamOutlined />} 
                                                                                                    color={statusCfg.color}
                                                                                                    className="m-0 text-[10px] font-bold px-2 py-0.5 rounded-md"
                                                                                                >
                                                                                                    辅: {h.nickname || h.name}
                                                                                                </Tag>
                                                                                            </Tooltip>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-sm text-slate-300 italic">待指派方法</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center">
                                        <Empty description={<span className="text-slate-400 font-bold mt-4">暂无关联检测项目</span>} />
                                        <Button type="primary" onClick={() => setItemModalVisible(true)} className="mt-6 h-10 px-8 rounded-xl bg-blue-600">立即添加项目</Button>
                                    </div>
                                )}
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

            <ItemConfigModal 
                visible={configModalVisible}
                onClose={() => setConfigModalVisible(false)}
                itemName={activeItemName}
                itemId={activeItemId}
                itemData={activeItemData}
                onSaveProcess={handleProcessSave}
                onDeleteProcess={handleProcessDelete}
                onSaveMethod={handleMethodSave}
                onDeleteMethod={handleMethodDelete}
                disabled={!isEditable}
                hideProcessing={hideProcessing}
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
                        <p>检测项目：{selectedDistData?.item?.name || selectedDistData?.item?.item_name}</p>
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
                        <p>检测项目：{selectedHelperData?.item?.name || selectedHelperData?.item?.item_name}</p>
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
                itemId={activeItemId}
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
