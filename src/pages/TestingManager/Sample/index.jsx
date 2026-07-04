import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button, Tag, Space, Layout, Drawer, Table, Tooltip, message, Empty, Spin, Divider } from "antd";
import { 
    BarcodeOutlined, 
    UserOutlined, 
    ExperimentOutlined, 
    InboxOutlined, 
    PlusOutlined, 
    HistoryOutlined,
    InfoCircleOutlined, 
    StarOutlined, 
    BlockOutlined, 
    RetweetOutlined,
    ProjectOutlined, 
    SettingOutlined, 
    NumberOutlined,
    FileSearchOutlined,
    ExportOutlined,
    MenuUnfoldOutlined,
    EditOutlined,
    DownloadOutlined,
    UploadOutlined
} from "@ant-design/icons";
import CrudTable from "../../../components/CrudTable";
import { 
    readTestingTask, 
    exportTestingTask,
    readTestingSample, 
    comboTestingSample,
    updateTestingSample, 
    deleteTestingSample,
    referenceTestingSample,
    inputCreateTestingSample,
    inputUpdateTestingSample,
    inputDeleteTestingSample,
    itemCreateTestingSample,
    itemDeleteTestingSample,
    methodCreateTestingSample,
    methodDeleteTestingSample,
    approveTestingSample,
    rollbackTestingSample,
    templateTestingSample
} from "../../../api/testing";
import { comboReferenceMaterial } from "../../../api/referenceMaterial";

import AddEdit from "../../../components/SampleManager/AddEdit";
import DetailDrawer from "../../../components/SampleManager/DetailDrawer";
import SpecialSampleModal from "../../../components/SampleManager/modals/SpecialSampleModal";
import SampleBatchModal, { getOperations } from "../../../components/SampleManager/modals/SampleBatchModal";
import DownloadTemplateModal from "./DownloadTemplateModal";
import UploadDataModal from "./UploadDataModal";

const { Content } = Layout;

const SampleTypeMap = {
    0: { label: "非对照样", color: "blue", icon: <ExperimentOutlined /> },
    1: { label: "空白样", color: "default", icon: <BlockOutlined /> },
    2: { label: "标准样", color: "purple", icon: <StarOutlined /> },
    3: { label: "重复样", color: "orange", icon: <RetweetOutlined /> },
};

const TestingSampleList = () => {
    const [taskId, setTaskId] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    
    // Task Drawer states
    const [taskDrawerVisible, setTaskDrawerVisible] = useState(true);
    const [taskLoading, setTaskLoading] = useState(false);
    const [tasks, setTasks] = useState([]);
    const [totalTasks, setTotalTasks] = useState(0);
    const [taskParams, setTaskParams] = useState({ page: 0, rows: 10 });
    const [samples, setSamples] = useState([]);

    // Sample Management states
    const [detailVisible, setDetailVisible] = useState(false);
    const [activeSampleId, setActiveSampleId] = useState(null);
    const [specialSampleVisible, setSpecialSampleVisible] = useState(false);
    const [downloadModalVisible, setDownloadModalVisible] = useState(false);
    const [uploadModalVisible, setUploadModalVisible] = useState(false);

    // Batch operation modal (samples selected in the table drive it)
    const [batchModalOpen, setBatchModalOpen] = useState(false);
    const [activeOp, setActiveOp] = useState(null);
    const [batchSamples, setBatchSamples] = useState([]);

    const batchActions = useMemo(
        () =>
            getOperations("testing").map((op) => ({
                key: op.value,
                label: op.label,
                icon: op.icon,
                danger: op.value === "reject",
                onClick: (rows) => {
                    setActiveOp(op);
                    setBatchSamples(rows);
                    setBatchModalOpen(true);
                },
            })),
        [],
    );

    // API injection for generic components
    const testingApis = useMemo(() => ({
        readSample: comboTestingSample,
        inputCreate: inputCreateTestingSample,
        inputUpdate: inputUpdateTestingSample,
        inputDelete: inputDeleteTestingSample,
        itemCreate: itemCreateTestingSample,
        itemDelete: itemDeleteTestingSample,
        methodCreate: methodCreateTestingSample,
        methodDelete: methodDeleteTestingSample,
        
        // Inspectors don't distribute to others in this view for now
        distributeType: 'inspector',
        hideDistribute: true, 
        showResultEntry: true,
        approve: approveTestingSample,
        rollback: rollbackTestingSample,
        
        // Special sample APIs
        referenceSample: referenceTestingSample,
        comboTask: readTestingTask,
        comboReferenceMaterial: comboReferenceMaterial,
        templateSample: templateTestingSample,
        onSuccess: () => setRefreshKey(prev => prev + 1)
    }), []);

    useEffect(() => {
        fetchTasks();
    }, [taskParams]);

    const fetchTasks = async () => {
        setTaskLoading(true);
        try {
            const res = await readTestingTask(taskParams);
            if (res.data.status === 0) {
                setTasks(res.data.data.rows || []);
                setTotalTasks(res.data.data.total || 0);
            }
        } catch (error) {
            message.error("加载任务列表失败");
        } finally {
            setTaskLoading(false);
        }
    };

    const handleSelectTask = useCallback((record) => {
        setTaskId(record.id);
        setSelectedTask(record);
        setTaskDrawerVisible(false);
        setRefreshKey(prev => prev + 1);
    }, []);

    const renderActions = useCallback((record) => (
        <Button 
            type="link" 
            size="small" 
            icon={<SettingOutlined />} 
            onClick={() => {
                setActiveSampleId(record.id);
                setDetailVisible(true);
            }}
        >
            实验配置
        </Button>
    ), []);

    const handleExportTask = async (id) => {
        const hide = message.loading("正在准备导出数据...", 0);
        try {
            const res = await exportTestingTask({ id });
            hide();
            
            if (res.data instanceof Blob) {
                if (res.data.type === 'application/json') {
                    const text = await res.data.text();
                    const errorData = JSON.parse(text);
                    message.error(errorData.message || "导出失败");
                    return;
                }

                const url = window.URL.createObjectURL(new Blob([res.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `Testing_Task_${id}_Export.xlsx`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
                message.success("导出成功");
            } else {
                message.warning("服务器未返回有效文件数据");
            }
        } catch (error) {
            hide();
            message.error("导出失败: " + (error.message || "网络异常"));
        }
    };

    const columns = useMemo(() => [
        {
            title: "样品编号",
            dataIndex: "lab_code",
            width: 160,
            fixed: 'left',
            render: (text, record) => (
                <div className="flex items-center gap-2">
                    <BarcodeOutlined className="text-blue-500" />
                    <span className="font-mono font-bold text-blue-600">{record.task_lab_code || selectedTask?.lab_code}-{text?.toString().padStart(4, '0')}</span>
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
            title: "创建人",
            dataIndex: "creator_name",
            width: 160,
            render: (name, record) => {
                const isNotSelfCreated = record.creator_id === null || record.creator_id === undefined || record.creator_name === null || record.creator_name === undefined;
                return (
                    <Space>
                        <UserOutlined className="text-gray-400" />
                        <span>{isNotSelfCreated ? "非本人创建" : (name || '-')}</span>
                    </Space>
                );
            }
        },
    ], [selectedTask]);

    const sampleApi = useMemo(() => ({
        read: (params) => {
            if (!taskId) return Promise.resolve({ data: { status: 0, data: { rows: [], total: 0 } } });
            return readTestingSample({ ...params, task_id: taskId });
        },
        update: updateTestingSample,
        delete: deleteTestingSample
    }), [taskId]);

    const initialValues = useMemo(() => ({
        task_id: taskId,
        type: 0,
        client_code: "",
        description: ""
    }), [taskId]);

    const taskColumns = [
        { 
            title: "任务编号", 
            dataIndex: "lab_code", 
            width: 140, 
            fixed: 'left',
            render: t => <span className="font-mono font-bold text-blue-600">{t}</span> 
        },
        { title: "任务名称", dataIndex: "name", width: 200, ellipsis: true },
        { title: "委托客户", dataIndex: "client_name", width: 220, ellipsis: true },
        { 
            title: "客户联络人", 
            dataIndex: "liaison_name", 
            width: 120,
            render: (name, record) => (
                <Tooltip title={`联系电话: ${record.liaison_contact || '无'}`}>
                    <span className="cursor-help">{name}</span>
                </Tooltip>
            )
        },
        { title: "样品类型", dataIndex: "sample_type_name", width: 180, ellipsis: true },
        { title: "分析类型", dataIndex: "analysis_type_name", width: 120 },
        { 
            title: "收样人", 
            dataIndex: "receiver_nickname", 
            width: 120,
            render: name => (
                <Space>
                    <UserOutlined className="text-slate-400" />
                    <span>{name || '-'}</span>
                </Space>
            )
        },
        { title: "创建时间", dataIndex: "created_at", width: 180, render: t => <span className="text-xs font-mono text-slate-400">{t}</span> },
        { title: "最迟完成", dataIndex: "deadline", width: 120, render: t => <Tag color="orange" className="m-0 border-none font-bold">{t}</Tag> },
        { title: "项目数量", dataIndex: "item_count", width: 100, align: 'center' },
        {
            title: "操作",
            key: "action",
            width: 150,
            fixed: 'right',
            render: (_, record) => (
                <Space>
                    <Button 
                        type="primary" 
                        size="small" 
                        icon={<ExperimentOutlined />} 
                        onClick={() => handleSelectTask(record)}
                        className="rounded-lg font-bold shadow-sm"
                    >
                        进入检测
                    </Button>
                    <Tooltip title="导出当前任务明细">
                        <Button 
                            size="small" 
                            icon={<ExportOutlined />} 
                            onClick={() => handleExportTask(record.id)}
                            className="rounded-lg"
                        />
                    </Tooltip>
                </Space>
            )
        }
    ];

    return (
        <Layout className="bg-white h-[calc(100vh-120px)] overflow-hidden">
            <style>{`
                .task-drawer .ant-drawer-body { padding: 0; }
                .sample-table-container .ant-spin-nested-loading,
                .sample-table-container .ant-spin-container {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                .task-table-wrapper .ant-table-thead > tr > th {
                    background: #f8fafc;
                    font-weight: 900;
                    text-transform: uppercase;
                    font-size: 11px;
                    letter-spacing: 0.05em;
                }
            `}</style>

            <Content className="bg-white flex flex-col h-full overflow-hidden">
                {!taskId ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white">
                        <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mb-6">
                            <ExperimentOutlined className="text-4xl text-orange-500" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 mb-4">实验员检测管理中心</h2>
                        <p className="text-slate-400 text-lg max-w-md text-center">
                            请选择已分配给您的检测任务，开始录入实验数据并提交审核。
                        </p>
                        <Button 
                            type="primary" 
                            size="large" 
                            icon={<MenuUnfoldOutlined />}
                            onClick={() => setTaskDrawerVisible(true)}
                            className="mt-8 bg-orange-600 border-none h-12 px-10 rounded-2xl shadow-xl shadow-orange-100 font-bold hover:bg-orange-700"
                        >
                            选择检测任务
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="p-6 bg-white border-b border-gray-100 flex justify-between items-center shadow-sm flex-shrink-0">
                            <Space size="large">
                                <Button 
                                    icon={<MenuUnfoldOutlined />} 
                                    onClick={() => setTaskDrawerVisible(true)}
                                    className="rounded-xl font-bold"
                                    type="primary"
                                >
                                    任务切换
                                </Button>
                                <div className="flex flex-col">
                                    <span className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                        <ExperimentOutlined className="text-orange-600" />
                                        {selectedTask?.name}
                                    </span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Tag color="orange" className="m-0 border-none font-mono">#{selectedTask?.lab_code}</Tag>
                                        <span className="text-xs text-slate-400">客户: {selectedTask?.client_name}</span>
                                    </div>
                                </div>
                            </Space>
                            <Space>
                                <Button 
                                    icon={<ExportOutlined />} 
                                    onClick={() => handleExportTask(taskId)}
                                    className="rounded-xl font-bold"
                                >
                                    导出任务单
                                </Button>
                                <Button 
                                    type="primary" 
                                    className="bg-orange-600 border-none shadow-lg shadow-orange-200 font-bold px-6 rounded-xl"
                                    onClick={() => setRefreshKey(prev => prev + 1)}
                                >
                                    刷新数据
                                </Button>
                            </Space>
                        </div>

                        <div className="p-6 flex-1 overflow-hidden sample-table-container">
                            <div className="bg-white h-full rounded-3xl overflow-y-auto flex flex-col">
                                <CrudTable 
                                    className="min-h-0 pb-6"
                                    refreshKey={refreshKey}
                                    title={
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                                                <BarcodeOutlined className="text-orange-600" />
                                            </div>
                                            <span className="text-lg font-black text-slate-800">检测样品列表</span>
                                        </div>
                                    }
                                    entityName="样品"
                                    columns={columns}
                                    api={sampleApi}
                                    AddEditForm={(props) => <AddEdit {...props} apis={testingApis} />}
                                    initialValues={initialValues}
                                    modalWidth={500}
                                    hideAdd={true}
                                    renderActions={renderActions}
                                    isRecordEditable={(record) => {
                                        return record.creator_id !== null && 
                                               record.creator_id !== undefined && 
                                               record.creator_name !== null && 
                                               record.creator_name !== undefined;
                                    }}
                                    batchActions={batchActions}
                                    batchDropdown
                                    actionExtra={
                                        <Space>
                                            <Button
                                                icon={<PlusOutlined />}
                                                onClick={() => setSpecialSampleVisible(true)}
                                                className="rounded-xl font-bold border-orange-100 text-orange-600 bg-orange-50"
                                            >
                                                添加特殊样品
                                            </Button>
                                            <Button 
                                                icon={<DownloadOutlined />} 
                                                onClick={() => setDownloadModalVisible(true)}
                                                className="rounded-xl font-bold border-green-100 text-green-600 bg-green-50"
                                            >
                                                下载模板
                                            </Button>
                                            <Button 
                                                icon={<UploadOutlined />} 
                                                onClick={() => setUploadModalVisible(true)}
                                                className="rounded-xl font-bold border-purple-100 text-purple-600 bg-purple-50"
                                            >
                                                上传数据
                                            </Button>
                                        </Space>
                                    }
                                    onDataLoaded={setSamples}
                                    scroll={{ y: 'calc(100vh - 540px)' }}
                                />
                            </div>
                        </div>
                    </>
                )}
            </Content>

            <Drawer
                title={
                    <div className="flex items-center gap-2">
                        <ProjectOutlined className="text-orange-600" />
                        <span className="text-xl font-black">待检测任务列表</span>
                    </div>
                }
                placement="left"
                onClose={() => setTaskDrawerVisible(false)}
                open={taskDrawerVisible}
                width={1000}
                className="task-drawer"
            >
                <div className="task-table-wrapper p-4">
                    <Table 
                        dataSource={tasks}
                        columns={taskColumns}
                        loading={taskLoading}
                        rowKey="id"
                        scroll={{ x: 1600 }}
                        pagination={{
                            current: taskParams.page + 1,
                            pageSize: taskParams.rows,
                            total: totalTasks,
                            onChange: (page, pageSize) => setTaskParams({ ...taskParams, page: page - 1, rows: pageSize })
                        }}
                    />
                </div>
            </Drawer>

            <DetailDrawer 
                visible={detailVisible}
                onClose={(changed) => {
                    setDetailVisible(false);
                    if (changed) setRefreshKey(prev => prev + 1);
                }}
                sampleData={samples.find(s => s.id === activeSampleId)}
                taskId={taskId}
                taskLabCode={selectedTask?.lab_code}
                apis={testingApis}
            />

            <SpecialSampleModal
                open={specialSampleVisible}
                onCancel={() => setSpecialSampleVisible(false)}
                taskId={taskId}
                onSuccess={() => {
                    setSpecialSampleVisible(false);
                    setRefreshKey(prev => prev + 1);
                }}
                apis={testingApis}
            />

            <SampleBatchModal
                open={batchModalOpen}
                onCancel={() => setBatchModalOpen(false)}
                operation={activeOp}
                samples={batchSamples}
                module="testing"
                task={selectedTask}
                onSuccess={() => {
                    setBatchModalOpen(false);
                    setRefreshKey(prev => prev + 1);
                }}
            />

            <DownloadTemplateModal
                open={downloadModalVisible}
                onCancel={() => setDownloadModalVisible(false)}
                taskId={taskId}
                taskLabCode={selectedTask?.lab_code}
            />

            <UploadDataModal
                open={uploadModalVisible}
                onCancel={() => setUploadModalVisible(false)}
                onSuccess={() => {
                    setRefreshKey(prev => prev + 1);
                }}
            />
        </Layout>
    );
};

export default TestingSampleList;
