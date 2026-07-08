import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    Button,
    Tag,
    Space,
    Layout,
    Drawer,
    Table,
    Tooltip,
    message,
    Empty,
    Spin,
    Divider,
} from "antd";
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
} from "@ant-design/icons";
import CrudTable from "../../../components/CrudTable";
import {
    readDepartmentTask,
    exportDepartmentTask,
    readDepartmentSample,
    comboDepartmentSample,
    updateDepartmentSample,
    deleteDepartmentSample,
    referenceDepartmentSample,
    inputCreateDepartmentSample,
    inputUpdateDepartmentSample,
    inputDeleteDepartmentSample,
    itemCreateDepartmentSample,
    itemDeleteDepartmentSample,
    methodCreateDepartmentSample,
    methodDeleteDepartmentSample,
    distributeDepartmentSample,
    helperCreateDepartmentSample,
    helperDeleteDepartmentSample,
    approveDepartmentSample,
    rejectDepartmentSample,
    rollbackDepartmentSample,
} from "../../../api/department";
import { comboUser } from "../../../api/user";
import { comboReferenceMaterial } from "../../../api/referenceMaterial";
import SampleBatchModal, {
    getOperations,
} from "../../../components/SampleManager/modals/SampleBatchModal";
import AddEdit from "../../../components/SampleManager/AddEdit";
import DetailDrawer from "../../../components/SampleManager/DetailDrawer";
import SpecialSampleModal from "../../../components/SampleManager/modals/SpecialSampleModal";

const { Content } = Layout;

const SampleTypeMap = {
    0: { label: "非对照样", color: "blue", icon: <ExperimentOutlined /> },
    1: { label: "空白样", color: "default", icon: <BlockOutlined /> },
    2: { label: "标准样", color: "purple", icon: <StarOutlined /> },
    3: { label: "重复样", color: "orange", icon: <RetweetOutlined /> },
};

const DepartmentSampleList = () => {
    const [taskId, setTaskId] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [samples, setSamples] = useState([]);

    // Task Drawer states
    const [taskDrawerVisible, setTaskDrawerVisible] = useState(true);
    const [taskLoading, setTaskLoading] = useState(false);
    const [tasks, setTasks] = useState([]);
    const [totalTasks, setTotalTasks] = useState(0);
    const [taskParams, setTaskParams] = useState({ page: 0, rows: 10 });

    // Sample Management states
    const [detailVisible, setDetailVisible] = useState(false);
    const [activeSampleId, setActiveSampleId] = useState(null);
    const [specialSampleVisible, setSpecialSampleVisible] = useState(false);

    // Batch operation modal (samples selected in the table drive it)
    const [batchModalOpen, setBatchModalOpen] = useState(false);
    const [activeOp, setActiveOp] = useState(null);
    const [batchSamples, setBatchSamples] = useState([]);

    const batchActions = useMemo(
        () =>
            getOperations("department").map((op) => ({
                key: op.value,
                label: op.label,
                icon: op.icon,
                danger:
                    op.value.includes("Delete") ||
                    op.value === "reject" ||
                    op.value === "rollback",
                onClick: (rows) => {
                    setActiveOp(op);
                    setBatchSamples(rows);
                    setBatchModalOpen(true);
                },
            })),
        [],
    );

    // API injection for generic components
    const departmentApis = useMemo(
        () => ({
            readSample: comboDepartmentSample,
            inputCreate: inputCreateDepartmentSample,
            inputUpdate: inputUpdateDepartmentSample,
            inputDelete: inputDeleteDepartmentSample,
            itemCreate: itemCreateDepartmentSample,
            itemDelete: itemDeleteDepartmentSample,
            methodCreate: methodCreateDepartmentSample,
            methodDelete: methodDeleteDepartmentSample,
            // Enable distribution for department members (Department Head to Inspector)
            distribute: distributeDepartmentSample,
            helperCreate: helperCreateDepartmentSample,
            helperDelete: helperDeleteDepartmentSample,
            comboRecipient: comboUser,
            hideDistribute: false,
            distributeType: "inspector", // Department Head view
            approveMethod: approveDepartmentSample,
            rejectMethod: rejectDepartmentSample,
            rollback: rollbackDepartmentSample,

            // Special sample APIs
            referenceSample: referenceDepartmentSample,
            comboTask: readDepartmentTask, // Use this for selection if no combo available
            comboReferenceMaterial: comboReferenceMaterial,
            onSuccess: () => setRefreshKey((prev) => prev + 1),
        }),
        [],
    );

    useEffect(() => {
        fetchTasks();
    }, [taskParams]);

    const fetchTasks = async () => {
        setTaskLoading(true);
        try {
            const res = await readDepartmentTask(taskParams);
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
        setRefreshKey((prev) => prev + 1);
    }, []);

    const renderActions = useCallback(
        (record) => (
            <Button
                type="link"
                size="small"
                icon={<SettingOutlined />}
                onClick={() => {
                    setActiveSampleId(record.id);
                    setDetailVisible(true);
                }}
            >
                详情管理
            </Button>
        ),
        [],
    );

    const handleExportTask = async (id) => {
        const hide = message.loading("正在准备导出数据...", 0);
        try {
            const res = await exportDepartmentTask({ id });
            hide();

            // If response is a blob, check if it's actually a JSON error message
            if (res.data instanceof Blob) {
                if (res.data.type === "application/json") {
                    const text = await res.data.text();
                    const errorData = JSON.parse(text);
                    message.error(errorData.message || "导出失败");
                    return;
                }

                const url = window.URL.createObjectURL(new Blob([res.data]));
                const link = document.createElement("a");
                link.href = url;
                link.setAttribute("download", `Task_${id}_Export.xlsx`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
                message.success("导出成功");
            } else if (res.data?.data?.url) {
                window.open(res.data.data.url);
                message.success("导出成功");
            } else {
                message.warning("服务器未返回有效文件数据");
            }
        } catch (error) {
            hide();
            message.error("导出失败: " + (error.message || "网络异常"));
        }
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
                            {selectedTask?.lab_code}-
                            {text?.toString().padStart(4, "0")}
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
                width: 120,
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
                title: "创建人",
                dataIndex: "creator_name",
                width: 160,
                render: (name, record) => {
                    const isNotSelfCreated =
                        record.creator_id === null ||
                        record.creator_id === undefined ||
                        record.creator_name === null ||
                        record.creator_name === undefined;
                    return (
                        <Space>
                            <UserOutlined className="text-gray-400" />
                            <span>
                                {isNotSelfCreated ? "非本人创建" : name || "-"}
                            </span>
                        </Space>
                    );
                },
            },
        ],
        [selectedTask],
    );

    const sampleApi = useMemo(
        () => ({
            read: (params) => {
                if (!taskId)
                    return Promise.resolve({
                        data: { status: 0, data: { rows: [], total: 0 } },
                    });
                return readDepartmentSample({ ...params, task_id: taskId });
            },
            // Only allow update/delete if creator_id matches (handled by backend but we can add UI hints)
            update: updateDepartmentSample,
            delete: deleteDepartmentSample,
        }),
        [taskId],
    );

    const initialValues = useMemo(
        () => ({
            task_id: taskId,
            type: 0,
            client_code: "",
            description: "",
        }),
        [taskId],
    );

    const taskColumns = [
        {
            title: "任务编号",
            dataIndex: "lab_code",
            width: 140,
            fixed: "left",
            render: (t) => (
                <span className="font-mono font-bold text-blue-600">{t}</span>
            ),
        },
        { title: "任务名称", dataIndex: "name", width: 200, ellipsis: true },
        {
            title: "委托客户",
            dataIndex: "client_name",
            width: 220,
            ellipsis: true,
        },
        { title: "联系人", dataIndex: "liaison_name", width: 100 },
        { title: "联系电话", dataIndex: "liaison_contact", width: 130 },
        {
            title: "样品类型",
            dataIndex: "sample_type_name",
            width: 150,
            ellipsis: true,
        },
        { title: "分析类型", dataIndex: "analysis_type_name", width: 120 },
        {
            title: "截止日期",
            dataIndex: "deadline",
            width: 120,
            render: (t) => (
                <Tag color="orange" className="m-0 border-none font-bold">
                    {t}
                </Tag>
            ),
        },
        { title: "收样人", dataIndex: "receiver_nickname", width: 100 },
        {
            title: "创建时间",
            dataIndex: "created_at",
            width: 160,
            render: (t) => <span className="text-xs text-slate-400">{t}</span>,
        },
        {
            title: "操作",
            key: "action",
            width: 150,
            fixed: "right",
            render: (_, record) => (
                <Space>
                    <Button
                        type="primary"
                        size="small"
                        icon={<ProjectOutlined />}
                        onClick={() => handleSelectTask(record)}
                        className="rounded-lg font-bold shadow-sm"
                    >
                        管理样品
                    </Button>
                    <Tooltip title="导出任务数据">
                        <Button
                            size="small"
                            icon={<ExportOutlined />}
                            onClick={() => handleExportTask(record.id)}
                            className="rounded-lg"
                        />
                    </Tooltip>
                </Space>
            ),
        },
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

            `}</style>

            <Content className="bg-white flex flex-col h-full overflow-hidden">
                {!taskId ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white">
                        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                            <FileSearchOutlined className="text-4xl text-blue-500" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 mb-4">
                            欢迎使用科室任务管理
                        </h2>
                        <p className="text-slate-400 text-lg max-w-md text-center">
                            请先从任务列表中选择一个具体任务，以进行样品的维护、检测项配置及数据录入。
                        </p>
                        <Button
                            type="primary"
                            size="large"
                            icon={<MenuUnfoldOutlined />}
                            onClick={() => setTaskDrawerVisible(true)}
                            className="mt-8 bg-blue-600 h-12 px-10 rounded-2xl shadow-xl shadow-blue-100 font-bold"
                        >
                            打开任务列表
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
                                        <InboxOutlined className="text-blue-600" />
                                        {selectedTask?.name}
                                    </span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Tag
                                            color="blue"
                                            className="m-0 border-none font-mono"
                                        >
                                            #{selectedTask?.lab_code}
                                        </Tag>
                                        <span className="text-xs text-slate-400">
                                            客户: {selectedTask?.client_name}
                                        </span>
                                    </div>
                                </div>
                            </Space>
                            <Space>
                                <Button
                                    icon={<ExportOutlined />}
                                    onClick={() => handleExportTask(taskId)}
                                    className="rounded-xl font-bold"
                                >
                                    导出结果
                                </Button>
                                <Button
                                    type="primary"
                                    className="bg-blue-600 border-none shadow-lg shadow-blue-200 font-bold px-6 rounded-xl"
                                    onClick={() =>
                                        setRefreshKey((prev) => prev + 1)
                                    }
                                >
                                    刷新
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
                                            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                                <BarcodeOutlined className="text-blue-600" />
                                            </div>
                                            <span className="text-lg font-black text-slate-800">
                                                样品管理
                                            </span>
                                        </div>
                                    }
                                    entityName="样品"
                                    columns={columns}
                                    api={sampleApi}
                                    AddEditForm={(props) => (
                                        <AddEdit
                                            {...props}
                                            apis={departmentApis}
                                        />
                                    )}
                                    initialValues={initialValues}
                                    modalWidth={500}
                                    hideAdd={true}
                                    batchActions={batchActions}
                                    batchDropdown
                                    actionExtra={
                                        <Space>
                                            <Button
                                                icon={<ExperimentOutlined />}
                                                onClick={() =>
                                                    setSpecialSampleVisible(
                                                        true,
                                                    )
                                                }
                                                className="rounded-xl font-bold border-purple-100 text-purple-600 bg-purple-50"
                                            >
                                                添加特殊样品
                                            </Button>
                                        </Space>
                                    }
                                    renderActions={renderActions}
                                    isRecordEditable={(record) => {
                                        return (
                                            record.creator_id !== null &&
                                            record.creator_id !== undefined &&
                                            record.creator_name !== null &&
                                            record.creator_name !== undefined
                                        );
                                    }}
                                    onDataLoaded={setSamples}
                                    scroll={{ y: "calc(100vh - 320px)" }}
                                />
                            </div>
                        </div>
                    </>
                )}
            </Content>

            <Drawer
                title={
                    <div className="flex items-center gap-2">
                        <ProjectOutlined className="text-blue-600" />
                        <span className="text-xl font-black">任务选择列表</span>
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
                        scroll={{ x: 1500 }}
                        pagination={{
                            current: taskParams.page + 1,
                            pageSize: taskParams.rows,
                            total: totalTasks,
                            onChange: (page, pageSize) =>
                                setTaskParams({
                                    ...taskParams,
                                    page: page - 1,
                                    rows: pageSize,
                                }),
                        }}
                    />
                </div>
            </Drawer>

            <DetailDrawer
                visible={detailVisible}
                onClose={(changed) => {
                    setDetailVisible(false);
                    if (changed) setRefreshKey((prev) => prev + 1);
                }}
                sampleData={samples.find((s) => s.id === activeSampleId)}
                taskId={taskId}
                taskLabCode={selectedTask?.lab_code}
                apis={departmentApis}
            />

            <SampleBatchModal
                open={batchModalOpen}
                onCancel={() => setBatchModalOpen(false)}
                operation={activeOp}
                samples={batchSamples}
                module="department"
                task={selectedTask}
                onSuccess={() => {
                    setBatchModalOpen(false);
                    setRefreshKey((prev) => prev + 1);
                }}
            />

            <SpecialSampleModal
                open={specialSampleVisible}
                onCancel={() => setSpecialSampleVisible(false)}
                taskId={taskId}
                onSuccess={() => {
                    setSpecialSampleVisible(false);
                    setRefreshKey((prev) => prev + 1);
                }}
                apis={departmentApis}
            />
        </Layout>
    );
};

export default DepartmentSampleList;
