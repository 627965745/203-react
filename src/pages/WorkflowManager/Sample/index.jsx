import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button, Tag, Space, Select, message, Layout, Spin, Empty, Divider, Tooltip } from "antd";
import { 
    BarcodeOutlined, 
    UserOutlined, 
    ExperimentOutlined, 
    FilterOutlined,
    SettingOutlined,
    EditOutlined,
    NumberOutlined,
    PlusOutlined,
    InboxOutlined,
    HistoryOutlined,
    RocketOutlined,
    TagOutlined,
    BlockOutlined,
    StarOutlined,
    RetweetOutlined,
    InfoCircleOutlined,
    ToolOutlined,
    ProjectOutlined,
    SendOutlined    
} from "@ant-design/icons";
import CrudTable from "../../../components/CrudTable";
import { 
    readSample, createSample, updateSample, deleteSample, comboTask,
    inputCreateSample, inputUpdateSample, inputDeleteSample,
    itemCreateSample, itemDeleteSample,
    methodCreateSample, methodUpdateSample, methodDeleteSample,
    processCreateSample, processUpdateSample, processDeleteSample,
    distributeSample, referenceSample,
    approveSample, rejectSample
} from "../../../api/workflow";
import { comboTestItem } from "../../../api/testItem";
import { comboReferenceMaterial } from "../../../api/referenceMaterial";

import AddEdit from "../../../components/SampleManager/AddEdit";
import DetailDrawer from "../../../components/SampleManager/DetailDrawer";
import SpecialSampleModal from "../../../components/SampleManager/modals/SpecialSampleModal";
import BatchOperationModal from "../../../components/SampleManager/modals/BatchOperationModal";


const { Sider, Content } = Layout;

const SampleTypeMap = {
    0: { label: "非对照样", color: "blue", icon: <ExperimentOutlined /> },
    1: { label: "空白样", color: "default", icon: <BlockOutlined /> },
    2: { label: "标准样", color: "purple", icon: <StarOutlined /> },
    3: { label: "重复样", color: "orange", icon: <RetweetOutlined /> },
};

const SampleList = () => {
    const [tasks, setTasks] = useState([]);
    const [taskId, setTaskId] = useState(null);
    const [taskLoading, setTaskLoading] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [samples, setSamples] = useState([]);

    // Detail Drawer visibility
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [activeSampleId, setActiveSampleId] = useState(null);

    // Batch Modal Visibility
    const [batchOpVisible, setBatchOpVisible] = useState(false);
    const [specialSampleVisible, setSpecialSampleVisible] = useState(false);


    const [showIds, setShowIds] = useState({});

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        setTaskLoading(true);
        try {
            const res = await comboTask();
            const data = res.data.data || [];
            setTasks(data);
        } finally {
            setTaskLoading(false);
        }
    };

    const toggleId = (key) => {
        setShowIds(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const renderNameWithId = (name, id, key, rowId, Icon) => {
        if (!name) return '-';
        const toggleKey = `${rowId}_${key}`;
        return (
            <div className="flex flex-col">
                <div className="flex items-center gap-2">
                    {Icon && <Icon className="text-gray-400" />}
                    <span className="font-bold text-slate-700">{name}</span>
                </div>
                <div className="mt-0.5 flex items-center h-[14px]">
                    {!showIds[toggleKey] ? (
                        <span 
                            className="text-[10px] text-gray-400 cursor-pointer hover:text-blue-600 leading-none ml-[20px]"
                            onClick={() => toggleId(toggleKey)}
                        >
                            # 显示 ID
                        </span>
                    ) : (
                        <span className="text-[10px] text-gray-400 leading-none ml-[20px]">
                            ID: {id}
                        </span>
                    )}
                </div>
            </div>
        );
    };

    const handleBatchSuccess = () => {
        setBatchOpVisible(false);
        setRefreshKey(prev => prev + 1);
    };

    const handleSpecialSuccess = () => {
        setSpecialSampleVisible(false);
        setRefreshKey(prev => prev + 1);
    };


    const selectedTask = useMemo(() => tasks.find(t => t.id === taskId), [tasks, taskId]);

    const columns = useMemo(() => [
        {
            title: "样品编号",
            dataIndex: "lab_code",
            width: 160,
            fixed: 'left',
            render: (text, record) => (
                <div className="flex items-center gap-2">
                    <BarcodeOutlined className="text-blue-500" />
                    <span className="font-mono font-bold text-blue-600">
                        {selectedTask?.lab_code}-{text?.toString().padStart(4, '0')}
                    </span>
                    {record.description && (
                        <Tooltip title={record.description}>
                            <InfoCircleOutlined className="text-blue-300 hover:text-blue-500 ml-1" />
                        </Tooltip>
                    )}
                </div>
            )
        },
        {
            title: "样品类型",
            dataIndex: "type",
            width: 120,
            render: (type) => {
                const cfg = SampleTypeMap[type] || SampleTypeMap[0];
                return (
                    <Tag icon={cfg.icon} color={cfg.color} className="border-none font-bold">
                        {cfg.label}
                    </Tag>
                );
            }
        },
        {
            title: "客户样号",
            dataIndex: "client_code",
            width: 180,
            render: (text, record) => (
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <NumberOutlined className="text-slate-400" />
                        <span className="font-bold text-slate-700">{text}</span>
                    </div>
                    {record.type === 3 && record.parent_client_code && (
                        <span className="text-[10px] text-orange-400 font-mono mt-0.5">
                            ← 重复自: {record.parent_client_code}
                        </span>
                    )}
                </div>
            )
        },
        {
            title: "标准样物质",
            width: 200,
            render: (_, record) => {
                if (record.type === 2 && record.reference_material_name) {
                    return (
                        <div className="flex items-center gap-2 text-purple-600">
                            <StarOutlined />
                            <span className="text-xs font-bold border-b border-purple-200 border-dashed pb-0.5">
                                {record.reference_material_name}
                            </span>
                        </div>
                    );
                }
                return <span className="text-gray-300 italic text-[11px]">-</span>;
            }
        },
        {
            title: "创建人",
            dataIndex: "creator_name",
            width: 160,
            render: (name, record) => renderNameWithId(name, record.creator_id, 'creator_id', record.id, UserOutlined)
        },
    ], [showIds, selectedTask]);

    const api = useMemo(() => ({
        read: (params) => {
            if (!taskId) {
                return Promise.resolve({ data: { status: 0, data: { rows: [], total: 0 } } });
            }
            return readSample({ ...params, task_id: taskId });
        },
        create: (data) => createSample({ ...data, task_id: taskId }),
        update: updateSample,
        delete: deleteSample
    }), [taskId]);

    const initialValues = useMemo(() => ({
        task_id: taskId,
        client_code: "",
        type: 0,
        parent_id: null,
        reference_material_id: null,
        description: ""
    }), [taskId]);

    const openManagement = useCallback((id) => {
        setActiveSampleId(id);
        setDrawerVisible(true);
    }, []);

    const renderActions = useCallback((record) => (
        <Button 
            type="link" 
            size="small" 
            icon={<SettingOutlined />} 
            onClick={() => openManagement(record.id)}
        >
            项目管理
        </Button>
    ), [openManagement]);


    const workflowApis = useMemo(() => ({
        readSample: readSample,
        inputCreate: inputCreateSample,
        inputUpdate: inputUpdateSample,
        inputDelete: inputDeleteSample,
        itemCreate: itemCreateSample,
        itemDelete: itemDeleteSample,
        methodCreate: methodCreateSample,
        methodUpdate: methodUpdateSample,
        methodDelete: methodDeleteSample,
        processCreate: processCreateSample,
        processUpdate: processUpdateSample,
        processDelete: processDeleteSample,
        distribute: distributeSample,
        referenceSample: referenceSample,
        comboTask: comboTask,
        comboReferenceMaterial: comboReferenceMaterial,
        distributeType: 'department',
        approveMethod: approveSample,
        rejectMethod: rejectSample,
        onSuccess: () => setRefreshKey(prev => prev + 1)
    }), []);

    return (
        <Layout className="bg-white h-[calc(100vh-120px)] overflow-hidden sample-center-layout">
            <style>{`
                .sample-center-layout { background: #fff; }
                .sample-center-layout .ant-layout-sider { background: #fff; }
                .sample-center-layout .task-list-item:hover { background: #f1f5f9; }
                .sample-center-layout .task-list-item.active {
                    background: #f1f5f9;
                    color: #2563eb;
                    border-right: 4px solid #2563eb;
                }
                .sample-center-layout .ant-spin-nested-loading,
                .sample-center-layout .ant-spin-container {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                .task-item-card {
                    display: flex;
                    flex-direction: column;
                    flex: 1;
                    min-width: 0;
                }
                .task-stats-vertical {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    margin-top: 10px;
                    padding: 10px 12px;
                    background: #f8fafc;
                    border-radius: 12px;
                    font-size: 13px;
                    color: #475569;
                    border: 1px solid #f1f5f9;
                    width: 100%;
                }
                .task-stats-vertical span b {
                    color: #1e293b;
                    font-weight: 800;
                }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
            `}</style>
            
            <Sider width={300} theme="light" className="border-r border-gray-100 h-full flex flex-col">
                <div className="p-6 flex flex-col h-full bg-white">
                    <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-50 flex-shrink-0">
                        <span className="text-gray-600 font-black uppercase tracking-widest text-xl">任务列表</span>
                    </div>
                    
                    <div className="text-sm text-gray-400 font-bold mb-4 px-1 uppercase tracking-widest flex items-center gap-2 flex-shrink-0">
                        <span className="anticon anticon-rocket" /> 当前任务列表
                    </div>

                    <Spin 
                        spinning={taskLoading && tasks.length === 0} 
                        wrapperClassName="flex-1 flex flex-col overflow-hidden" 
                        description="加载任务..."
                    >
                        <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                            {tasks.map(item => (
                                <div 
                                    key={item.id}
                                    className={`p-5 mb-4 rounded-2xl cursor-pointer transition-all flex justify-between items-start group task-list-item ${taskId === item.id ? 'active font-bold shadow-md' : 'text-gray-600'}`}
                                    onClick={() => setTaskId(item.id)}
                                >
                                    <div className="task-item-card">
                                        <span className="text-base truncate w-full font-black text-slate-800">
                                            <Tag className="mr-2 font-black text-[10px] bg-slate-100 border-none text-slate-500">#{item.id}</Tag>
                                            {item.lab_code}-{item.name || '未命名任务'}
                                        </span>
                                        <div className="task-stats-vertical">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[11px] text-gray-400 uppercase tracking-tighter">任务类型</span>
                                                <b className="text-xs bg-white px-2 py-0.5 rounded border border-gray-100">{item.type_name || '常规任务'}</b>
                                            </div>
                                            {item.client_name && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[11px] text-gray-400 uppercase tracking-tighter">委托客户</span>
                                                    <b className="text-xs truncate max-w-[120px]">{item.client_name}</b>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {tasks.length === 0 && !taskLoading && (
                                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无任务数据" />
                            )}
                        </div>
                    </Spin>
                </div>
            </Sider>

            <Content className="bg-slate-50 flex flex-col h-full overflow-hidden">
                {!taskId ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white">
                        <h2 className="text-3xl font-black text-slate-800 mb-4">选择一个任务</h2>
                        <p className="text-slate-400 text-lg max-w-md text-center">
                            请从左侧列表中选择一个具体任务以查看其关联的样品详情与管理操作
                        </p>
                        <div className="mt-8 flex gap-3">
                            <Tag color="processing" className="px-4 py-1 rounded-full border-none font-bold">查看样品</Tag>
                            <Tag color="success" className="px-4 py-1 rounded-full border-none font-bold">属性管理</Tag>
                            <Tag color="warning" className="px-4 py-1 rounded-full border-none font-bold">流程分发</Tag>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="p-6 bg-white border-b border-gray-100 flex justify-between items-center shadow-sm flex-shrink-0">
                            <Space size="large">
                                <div className="flex flex-col">
                                    <span className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                        <InboxOutlined className="text-blue-600" />
                                        {selectedTask?.lab_code}-{selectedTask?.name}
                                    </span>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded">
                                            任务 ID: {taskId}
                                        </span>
                                        {selectedTask?.client_name && (
                                            <span className="text-xs text-blue-500 font-bold bg-blue-50 px-2 py-1 rounded">
                                                客户: {selectedTask.client_name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </Space>
                            <Space>
                                <Button 
                                    icon={<HistoryOutlined />} 
                                    onClick={() => setTaskId(null)}
                                    className="rounded-xl font-bold border-gray-200 text-gray-500"
                                >
                                    返回概览
                                </Button>
                                <Button 
                                    type="primary" 
                                    icon={<PlusOutlined />}
                                    className="bg-blue-600 border-none shadow-lg shadow-blue-200 font-bold px-6 rounded-xl"
                                    onClick={() => setRefreshKey(prev => prev + 1)}
                                >
                                    刷新数据
                                </Button>
                            </Space>
                        </div>
                        <div className="p-6 flex-1 overflow-hidden">
                            <div className="bg-white h-full rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                                <CrudTable 
                                    refreshKey={refreshKey}
                                    title={
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                                <BarcodeOutlined className="text-blue-600" />
                                            </div>
                                            <span className="text-lg font-black text-slate-800">样品清单</span>
                                        </div>
                                    }
                                    entityName="样品"
                                    columns={columns}
                                    api={api}
                                    AddEditForm={(props) => <AddEdit {...props} apis={workflowApis} />}
                                    initialValues={initialValues}
                                    modalWidth={500}
                                    hideAdd={!taskId}
                                    actionExtra={
                                    <Space>
                                        <Button 
                                            icon={<ExperimentOutlined />} 
                                            onClick={() => setSpecialSampleVisible(true)}
                                            className="rounded-xl font-bold border-purple-100 text-purple-600 bg-purple-50"
                                        >
                                            添加特殊样品
                                        </Button>
                                        <Button 
                                            icon={<RocketOutlined />} 
                                            onClick={() => setBatchOpVisible(true)}
                                            className="rounded-xl font-bold border-emerald-100 text-emerald-600 bg-emerald-50"
                                        >
                                            批量业务处理
                                        </Button>
                                    </Space>
                                    }

                                    renderActions={renderActions}
                                    onDataLoaded={setSamples}
                                    scroll={{ y: 'calc(100vh - 480px)' }}
                                />
                            </div>
                        </div>
                    </>
                )}
            </Content>

            <DetailDrawer 
                visible={drawerVisible}
                onClose={(hasChanged) => {
                    setDrawerVisible(false);
                    if (hasChanged) {
                        setRefreshKey(prev => prev + 1);
                    }
                }}
                sampleData={samples.find(s => s.id === activeSampleId)}
                taskId={taskId}
                taskLabCode={selectedTask?.lab_code}
                apis={workflowApis}
            />

            <BatchOperationModal 
                open={batchOpVisible} 
                onCancel={() => setBatchOpVisible(false)} 
                taskId={taskId}
                onSuccess={handleBatchSuccess}
            />

            <SpecialSampleModal
                open={specialSampleVisible}
                onCancel={() => setSpecialSampleVisible(false)}
                taskId={taskId}
                onSuccess={handleSpecialSuccess}
                apis={workflowApis}
            />
        </Layout>

    );
};

export default SampleList;
