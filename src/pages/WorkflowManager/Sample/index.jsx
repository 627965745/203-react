import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    Button,
    Tag,
    Space,
    Select,
    message,
    Layout,
    Spin,
    Empty,
    Divider,
    Tooltip,
    Dropdown,
} from "antd";
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
    TagOutlined,
    BlockOutlined,
    StarOutlined,
    RetweetOutlined,
    InfoCircleOutlined,
    ToolOutlined,
    ProjectOutlined,
    SendOutlined,
    LeftOutlined,
    RightOutlined,
    DownOutlined,
} from "@ant-design/icons";
import CrudTable from "../../../components/CrudTable";
import {
    readSample,
    comboSample,
    createSample,
    updateSample,
    deleteSample,
    comboTask,
    readTask,
    inputCreateSample,
    inputUpdateSample,
    inputDeleteSample,
    methodCreateSample,
    methodUpdateSample,
    methodDeleteSample,
    processUpdateSample,
    processDeleteSample,
    distributeSample,
    referenceSample,
    approveSample,
    rejectSample,
} from "../../../api/workflow";
import { comboTestItem } from "../../../api/testItem";
import { comboReferenceMaterial } from "../../../api/referenceMaterial";
// V4: 样品新增 processor_id（加工责任人），列表/详情需按 ID 显示姓名
import { comboUser } from "../../../api/user";

import AddEdit from "../../../components/SampleManager/AddEdit";
import DetailDrawer from "../../../components/SampleManager/DetailDrawer";
import SpecialSampleModal from "../../../components/SampleManager/modals/SpecialSampleModal";
import SampleBatchModal, {
    getOperations,
} from "../../../components/SampleManager/modals/SampleBatchModal";
import TaskBatchModal from "../../../components/SampleManager/modals/TaskBatchModal";

const { Sider, Content } = Layout;

const SampleTypeMap = {
    0: { label: "非对照样", color: "blue", icon: <ExperimentOutlined /> },
    1: { label: "空白样", color: "default", icon: <BlockOutlined /> },
    2: { label: "标准样", color: "purple", icon: <StarOutlined /> },
    3: { label: "重复样", color: "orange", icon: <RetweetOutlined /> },
};

// V4: 样品级加工状态 —— 与"加工人"列一起展示，说明该样品在加工管理中的处境
const ProcessingStatusMap = {
    0: { label: "未加工", color: "default" },
    1: { label: "加工中", color: "processing" },
    2: { label: "加工完成", color: "success" },
};

const SampleList = () => {
    const [tasks, setTasks] = useState([]);
    const [taskId, setTaskId] = useState(null);
    const [taskLoading, setTaskLoading] = useState(false);
    const [taskPage, setTaskPage] = useState(0);
    const [taskTotal, setTaskTotal] = useState(0);
    const [refreshKey, setRefreshKey] = useState(0);
    const [samples, setSamples] = useState([]);

    // Detail Drawer visibility
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [activeSampleId, setActiveSampleId] = useState(null);

    // Batch operation modal (samples selected in the table drive it)
    const [batchModalOpen, setBatchModalOpen] = useState(false);
    const [activeOp, setActiveOp] = useState(null);
    const [batchSamples, setBatchSamples] = useState([]);
    const [specialSampleVisible, setSpecialSampleVisible] = useState(false);

    // 任务级批量操作（不勾选样品，直接对整个选中任务生效，走 task_id）
    const [taskBatchModalOpen, setTaskBatchModalOpen] = useState(false);
    const [activeTaskOp, setActiveTaskOp] = useState(null);

    const batchActions = useMemo(
        () =>
            getOperations("workflow").map((op) => ({
                key: op.value,
                label: op.label,
                icon: op.icon,
                danger: op.value.includes("Delete") || op.value === "reject",
                onClick: (rows) => {
                    setActiveOp(op);
                    setBatchSamples(rows);
                    setBatchModalOpen(true);
                },
            })),
        [],
    );

    const taskBatchMenuItems = useMemo(
        () =>
            getOperations("workflow").map((op) => ({
                key: op.value,
                label: op.label,
                icon: op.icon,
                danger: op.value.includes("Delete") || op.value === "reject",
            })),
        [],
    );

    const [showIds, setShowIds] = useState({});

    // V4: {userId: 姓名} —— 样品行只带 processor_id，这里拉一次用户下拉把 ID 翻成姓名，
    //     列表的"加工人"列与详情抽屉共用同一份映射，避免每行/每次开抽屉都发请求。
    const [userMap, setUserMap] = useState({});

    useEffect(() => {
        fetchTasks();
    }, [taskPage]);

    useEffect(() => {
        comboUser()
            .then((res) => {
                const list = res.data?.data || [];
                setUserMap(
                    Object.fromEntries(
                        list.map((u) => [u.id, u.nickname || u.name]),
                    ),
                );
            })
            .catch(() => setUserMap({}));
    }, []);

    const fetchTasks = async () => {
        setTaskLoading(true);
        try {
            const res = await readTask({ page: taskPage, rows: 10 });
            if (res.data.status === 0) {
                setTasks(res.data.data.rows || []);
                setTaskTotal(res.data.data.total || 0);
            } else {
                setTasks([]);
                setTaskTotal(0);
            }
        } catch (error) {
            console.error("加载任务列表失败", error);
        } finally {
            setTaskLoading(false);
        }
    };

    const toggleId = (key) => {
        setShowIds((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const renderNameWithId = (name, id, key, rowId, Icon) => {
        if (!name) return "-";
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
        setBatchModalOpen(false);
        setRefreshKey((prev) => prev + 1);
    };

    const handleSpecialSuccess = () => {
        setSpecialSampleVisible(false);
        setRefreshKey((prev) => prev + 1);
    };

    const selectedTask = useMemo(
        () => tasks.find((t) => t.id === taskId),
        [tasks, taskId],
    );

    const formatSampleCode = (code, taskCode) => {
        if (!code) return "";
        const str = String(code);
        if (str.includes("-")) return str;
        const prefix = taskCode || selectedTask?.lab_code;
        const seq = str.padStart(4, "0");
        return prefix ? `${prefix}-${seq}` : seq;
    };

    const columns = useMemo(
        () => [
            {
                title: "样品编号",
                dataIndex: "lab_code",
                width: 160,
                fixed: "left",
                render: (text, record) => (
                    <div className="flex items-center gap-2">
                        <BarcodeOutlined className="text-blue-500" />
                        <span className="font-mono font-bold text-blue-600">
                            {formatSampleCode(text, record.task_lab_code)}
                        </span>
                        {record.description && (
                            <Tooltip title={record.description}>
                                <InfoCircleOutlined className="text-blue-300 hover:text-blue-500 ml-1" />
                            </Tooltip>
                        )}
                    </div>
                ),
            },
            {
                title: "样品类型",
                dataIndex: "type",
                width: 110,
                render: (type) => {
                    const cfg = SampleTypeMap[type] || SampleTypeMap[0];
                    return (
                        <Tag
                            icon={cfg.icon}
                            color={cfg.color}
                            className="border-none font-bold"
                        >
                            {cfg.label}
                        </Tag>
                    );
                },
            },
            {
                // V4: 质控样的 client_code 改由后端 helper.frankID() 自动生成，是一串对用户
                //     没有意义的编号 —— 空白样/标准样/重复样这一列不再显示它，统一显示类型名，
                //     并把标准物质名称、父样品编号接在同一行；只有普通样才显示真正的客户样号。
                title: "客户样号",
                dataIndex: "client_code",
                width: 240,
                render: (text, record) => {
                    if (record.type > 0) {
                        const cfg = SampleTypeMap[record.type];
                        return (
                            <div className="flex items-center gap-2 whitespace-nowrap">
                                <span className="font-bold text-slate-500">
                                    {cfg?.label}
                                </span>
                                {record.type === 3 &&
                                    record.parent_lab_code && (
                                        <span className="text-[12px] text-orange-400 font-mono">
                                            ←{" "}
                                            {formatSampleCode(
                                                record.parent_lab_code,
                                                record.task_lab_code,
                                            )}
                                        </span>
                                    )}
                                {record.type === 2 &&
                                    record.reference_material_name && (
                                        <span className="text-[12px] text-purple-600 font-bold flex items-center gap-1">
                                            <StarOutlined />
                                            {record.reference_material_name}
                                        </span>
                                    )}
                            </div>
                        );
                    }
                    return (
                        <div className="flex items-center gap-2">
                            <NumberOutlined className="text-slate-400" />
                            <span className="font-bold text-slate-700">
                                {text}
                            </span>
                        </div>
                    );
                },
            },
            {
                title: "创建人",
                dataIndex: "creator_name",
                width: 80,
                render: (name, record) =>
                    renderNameWithId(
                        name,
                        record.creator_id,
                        "creator_id",
                        record.id,
                        UserOutlined,
                    ),
            },
            // V4: 新增"加工人"列 —— processor_id 为空的样品不会进入加工管理视图
            {
                title: "加工人",
                dataIndex: "processor_id",
                width: 130,
                render: (processorId, record) => {
                    if (!processorId) {
                        return (
                            <Tooltip title="未指定加工人，该样品不会出现在加工管理中">
                                <span className="text-slate-300 italic">
                                    未指定
                                </span>
                            </Tooltip>
                        );
                    }
                    const cfg =
                        ProcessingStatusMap[record.processing_status] ||
                        ProcessingStatusMap[0];
                    return (
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <ToolOutlined className="text-orange-500" />
                                <span className="font-bold text-slate-700">
                                    {userMap[processorId]}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Tag
                                    color={cfg.color}
                                    bordered={false}
                                    className="m-0 text-[10px] font-bold"
                                >
                                    {cfg.label}
                                </Tag>
                                {record.processing_deadline && (
                                    <span className="text-[10px] text-slate-400 font-mono">
                                        {
                                            record.processing_deadline.split(
                                                " ",
                                            )[0]
                                        }
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                },
            },
        ],
        [showIds, selectedTask, userMap],
    );

    const api = useMemo(
        () => ({
            read: (params) => {
                if (!taskId) {
                    return Promise.resolve({
                        data: { status: 0, data: { rows: [], total: 0 } },
                    });
                }
                return readSample({ ...params, task_id: taskId });
            },
            create: (data) => createSample({ ...data, task_id: taskId }),
            update: updateSample,
            delete: deleteSample,
        }),
        [taskId],
    );

    const initialValues = useMemo(
        () => ({
            task_id: taskId,
            client_code: "",
            type: 0,
            parent_id: null,
            reference_material_id: null,
            description: "",
        }),
        [taskId],
    );

    const openManagement = useCallback((id) => {
        setActiveSampleId(id);
        setDrawerVisible(true);
    }, []);

    const renderActions = useCallback(
        (record) => (
            <Button
                type="link"
                size="small"
                icon={<SettingOutlined />}
                onClick={() => openManagement(record.id)}
            >
                项目管理
            </Button>
        ),
        [openManagement],
    );

    const workflowApis = useMemo(
        () => ({
            readSample: comboSample,
            inputCreate: inputCreateSample,
            inputUpdate: inputUpdateSample,
            inputDelete: inputDeleteSample,
            // V3: itemCreate/itemDelete 已删除 —— item 与 method 强绑定，不再有独立的项目分配操作
            methodCreate: methodCreateSample,
            methodUpdate: methodUpdateSample,
            methodDelete: methodDeleteSample,
            // 需求变更：processCreate 接口已取消，加工的添加/修改统一走 processUpdate（整体覆盖）
            processUpdate: processUpdateSample,
            processDelete: processDeleteSample,
            distribute: distributeSample,
            referenceSample: referenceSample,
            comboTask: comboTask,
            comboReferenceMaterial: comboReferenceMaterial,
            distributeType: "department",
            approveMethod: approveSample,
            rejectMethod: rejectSample,
            onSuccess: () => setRefreshKey((prev) => prev + 1),
        }),
        [],
    );

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
                    gap: 4px;
                    margin-top: 6px;
                    padding: 6px 10px;
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

            <Sider
                width={300}
                theme="light"
                className="border-r border-gray-100 h-full flex flex-col"
            >
                <div className="p-4 flex flex-col h-full bg-white">
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-50 flex-shrink-0">
                        <span className="text-gray-600 font-black uppercase tracking-widest text-xl">
                            任务列表
                        </span>
                    </div>

                    <div className="text-sm text-gray-400 font-bold mb-2 px-1 uppercase tracking-widest flex items-center gap-2 flex-shrink-0">
                        <span className="anticon anticon-rocket" /> 当前任务列表
                    </div>

                    <Spin
                        spinning={taskLoading && tasks.length === 0}
                        wrapperClassName="flex-1 flex flex-col overflow-hidden"
                        description="加载任务..."
                    >
                        <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                            {tasks.map((item) => (
                                <div
                                    key={item.id}
                                    className={`p-3 mb-2 rounded-xl cursor-pointer transition-all flex justify-between items-start group task-list-item ${taskId === item.id ? "active font-bold shadow-md" : "text-gray-600"}`}
                                    onClick={() => setTaskId(item.id)}
                                >
                                    <div className="task-item-card">
                                        <span className="text-base truncate w-full font-black text-slate-800">
                                            <Tag className="mr-2 font-black text-[10px] bg-slate-100 border-none text-slate-500">
                                                #{item.id}
                                            </Tag>
                                            {item.lab_code}-
                                            {item.name || "未命名任务"}
                                        </span>
                                        <div className="task-stats-vertical">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[11px] text-gray-400 uppercase tracking-tighter">
                                                    任务类型
                                                </span>
                                                <b className="text-xs bg-white px-2 py-0.5 rounded border border-gray-100">
                                                    {item.type_name ||
                                                        "常规任务"}
                                                </b>
                                            </div>
                                            {item.client_name && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[11px] text-gray-400 uppercase tracking-tighter">
                                                        委托客户
                                                    </span>
                                                    <b className="text-xs truncate max-w-[120px]">
                                                        {item.client_name}
                                                    </b>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {tasks.length === 0 && !taskLoading && (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description="暂无任务数据"
                                />
                            )}
                        </div>

                        <div className="flex justify-center items-center gap-4 py-2 border-t border-slate-100 flex-shrink-0 mt-1">
                            <Button
                                type="text"
                                icon={<LeftOutlined />}
                                disabled={taskPage === 0}
                                onClick={() => setTaskPage((prev) => prev - 1)}
                            />
                            <span className="font-mono text-sm text-slate-600">
                                第 {taskPage + 1} 页 / 共{" "}
                                {Math.max(1, Math.ceil(taskTotal / 10))} 页
                            </span>
                            <Button
                                type="text"
                                icon={<RightOutlined />}
                                disabled={(taskPage + 1) * 10 >= taskTotal}
                                onClick={() => setTaskPage((prev) => prev + 1)}
                            />
                        </div>
                    </Spin>
                </div>
            </Sider>

            <Content className="bg-white flex flex-col h-full overflow-hidden">
                {!taskId ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white">
                        <h2 className="text-3xl font-black text-slate-800 mb-4">
                            选择一个任务
                        </h2>
                        <p className="text-slate-400 text-lg max-w-md text-center">
                            请从左侧列表中选择一个具体任务以查看其关联的样品详情与管理操作
                        </p>
                        <div className="mt-8 flex gap-3">
                            <Tag
                                color="processing"
                                className="px-4 py-1 rounded-full border-none font-bold"
                            >
                                查看样品
                            </Tag>
                            <Tag
                                color="success"
                                className="px-4 py-1 rounded-full border-none font-bold"
                            >
                                属性管理
                            </Tag>
                            <Tag
                                color="warning"
                                className="px-4 py-1 rounded-full border-none font-bold"
                            >
                                流程分发
                            </Tag>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="p-6 bg-white border-b border-gray-100 flex justify-between items-center shadow-sm flex-shrink-0">
                            <Space size="large">
                                <div className="flex flex-col">
                                    <span className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                        <InboxOutlined className="text-blue-600" />
                                        {selectedTask?.lab_code}-
                                        {selectedTask?.name}
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
                                <Dropdown
                                    trigger={["click"]}
                                    menu={{
                                        items: taskBatchMenuItems,
                                        onClick: ({ key }) => {
                                            const op = getOperations(
                                                "workflow",
                                            ).find((o) => o.value === key);
                                            if (op) {
                                                setActiveTaskOp(op);
                                                setTaskBatchModalOpen(true);
                                            }
                                        },
                                    }}
                                >
                                    <Button className="rounded-xl font-bold border-blue-100 text-blue-600 bg-blue-50">
                                        批量操作此任务 <DownOutlined />
                                    </Button>
                                </Dropdown>
                                <Button
                                    type="primary"
                                    className="bg-blue-600 border-none shadow-lg shadow-blue-200 font-bold px-6 rounded-xl"
                                    onClick={() =>
                                        setRefreshKey((prev) => prev + 1)
                                    }
                                >
                                    刷新数据
                                </Button>
                            </Space>
                        </div>
                        <div className="p-6 flex-1 overflow-hidden">
                            <div className="bg-white h-full rounded-3xl overflow-hidden flex flex-col">
                                <CrudTable
                                    className="min-h-0"
                                    refreshKey={refreshKey}
                                    title={
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                                <BarcodeOutlined className="text-blue-600" />
                                            </div>
                                            <span className="text-lg font-black text-slate-800">
                                                样品清单
                                            </span>
                                        </div>
                                    }
                                    entityName="非对照样"
                                    columns={columns}
                                    api={api}
                                    AddEditForm={(props) => (
                                        <AddEdit
                                            {...props}
                                            apis={workflowApis}
                                        />
                                    )}
                                    initialValues={initialValues}
                                    modalWidth={500}
                                    hideAdd={!taskId}
                                    actionWidth={200}
                                    batchActions={batchActions}
                                    batchDropdown
                                    actionExtra={
                                        <Button
                                            icon={<ExperimentOutlined />}
                                            onClick={() =>
                                                setSpecialSampleVisible(true)
                                            }
                                            className="rounded-xl font-bold border-purple-100 text-purple-600 bg-purple-50"
                                        >
                                            添加特殊样品
                                        </Button>
                                    }
                                    renderActions={renderActions}
                                    onDataLoaded={setSamples}
                                    fillHeight
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
                        setRefreshKey((prev) => prev + 1);
                    }
                }}
                sampleData={samples.find((s) => s.id === activeSampleId)}
                taskId={taskId}
                taskLabCode={selectedTask?.lab_code}
                /* V4: 供加工任务卡片把 processor_id 显示成加工人姓名 */
                userMap={userMap}
                apis={workflowApis}
            />

            <SampleBatchModal
                open={batchModalOpen}
                onCancel={() => setBatchModalOpen(false)}
                operation={activeOp}
                samples={batchSamples}
                module="workflow"
                task={selectedTask}
                onSuccess={handleBatchSuccess}
            />

            <SpecialSampleModal
                open={specialSampleVisible}
                onCancel={() => setSpecialSampleVisible(false)}
                taskId={taskId}
                onSuccess={handleSpecialSuccess}
                apis={workflowApis}
            />

            <TaskBatchModal
                open={taskBatchModalOpen}
                onCancel={() => setTaskBatchModalOpen(false)}
                operation={activeTaskOp}
                taskId={taskId}
                module="workflow"
                onSuccess={() => {
                    setTaskBatchModalOpen(false);
                    setRefreshKey((prev) => prev + 1);
                }}
            />
        </Layout>
    );
};

export default SampleList;
