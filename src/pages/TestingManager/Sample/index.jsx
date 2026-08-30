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
    Modal,
    Segmented,
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
    EditOutlined,
    DownloadOutlined,
    UploadOutlined,
} from "@ant-design/icons";
import CrudTable from "../../../components/CrudTable";
import {
    readTestingTask,
    exportTestingTask,
    readTestingSample,
    comboTestingSample,
    updateTestingSample,
    deleteTestingSample,
    inputCreateTestingSample,
    inputUpdateTestingSample,
    inputDeleteTestingSample,
    methodCreateTestingSample,
    methodDeleteTestingSample,
    approveTestingSample,
    rollbackTestingSample,
    templateTestingSample,
    referenceTestingSample,
} from "../../../api/testing";
// V5: 参比样改指「标准样品」—— 下拉源由 ReferenceMaterial/combo 换成 ReferenceSample/combo
import { comboReferenceSample } from "../../../api/referenceSample";

import AddEdit from "../../../components/SampleManager/AddEdit";
import DetailDrawer from "../../../components/SampleManager/DetailDrawer";
import SampleBatchModal, {
    getOperations,
} from "../../../components/SampleManager/modals/SampleBatchModal";
import TaskBatchModal from "../../../components/SampleManager/modals/TaskBatchModal";
import SpecialSampleModal from "../../../components/SampleManager/modals/SpecialSampleModal";
// V5: 批次筛选器（0=未分批 / N=第N批 / 空=全部），四个样品中心共用
import BatchFilter from "../../../components/SampleManager/BatchFilter";
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

    // V5: read 接口新增可选 batch 筛选（0=未分批 / N=第N批 / 不传=全部）
    // V6: read 接口新增可选 is_creator（0/1，不传同 0）—— 1 = 仅返回我创建的样品
    const [filters, setFilters] = useState({ batch: null, is_creator: null });

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
    const [downloadModalVisible, setDownloadModalVisible] = useState(false);
    const [uploadModalVisible, setUploadModalVisible] = useState(false);
    const [specialSampleVisible, setSpecialSampleVisible] = useState(false);

    // Batch operation modal (samples selected in the table drive it)
    const [batchModalOpen, setBatchModalOpen] = useState(false);
    const [activeOp, setActiveOp] = useState(null);
    const [batchSamples, setBatchSamples] = useState([]);

    // Task-wide batch operation modal (acts on task_id directly, no row selection)
    const [taskBatchModalOpen, setTaskBatchModalOpen] = useState(false);
    const [activeTaskOp, setActiveTaskOp] = useState(null);

    const batchActions = useMemo(
        () =>
            getOperations("testing").map((op) => ({
                key: op.value,
                label: op.label,
                icon: op.icon,
                danger: op.value === "reject",
                // V4: 未勾选样品时不再直接拦下，改为确认后作用于整个任务 ——
                //     原来顶部单独的"批量操作此任务"下拉已取消，两条路径合并到这里。
                // V5: 标了 requireSelection 的操作（如「设置批次」）只接受 sample_ids，
                //     没有 task_id 整任务变体，必须先勾选样品
                allowEmptySelection: !op.requireSelection,
                onClick: (rows) => {
                    if (!rows.length) {
                        Modal.confirm({
                            title: "未勾选任何样品",
                            content: `未勾选任何样品，「${op.label}」将应用于当前任务下所有样品，确定吗？`,
                            okText: "确定",
                            cancelText: "取消",
                            onOk: () => {
                                setActiveTaskOp(op);
                                setTaskBatchModalOpen(true);
                            },
                        });
                        return;
                    }
                    setActiveOp(op);
                    setBatchSamples(rows);
                    setBatchModalOpen(true);
                },
            })),
        [],
    );

    // API injection for generic components
    const testingApis = useMemo(
        () => ({
            readSample: comboTestingSample,
            inputCreate: inputCreateTestingSample,
            inputUpdate: inputUpdateTestingSample,
            inputDelete: inputDeleteTestingSample,
            // V3: itemCreate/itemDelete 已删除 —— item 与 method 强绑定，不再有独立的项目分配操作
            methodCreate: methodCreateTestingSample,
            methodDelete: methodDeleteTestingSample,

            // Inspectors don't distribute to others in this view for now
            distributeType: "inspector",
            hideDistribute: true,
            showResultEntry: true,
            approve: approveTestingSample,
            rollback: rollbackTestingSample,

            comboTask: readTestingTask,
            templateSample: templateTestingSample,
            referenceSample: referenceTestingSample,
            // V5: 参比样下拉源换成标准样品
            comboReferenceSample: comboReferenceSample,
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
                实验配置
            </Button>
        ),
        [],
    );

    const handleExportTask = async (id) => {
        const hide = message.loading("正在准备导出数据...", 0);
        try {
            const res = await exportTestingTask({ id });
            hide();

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
                link.setAttribute("download", `Testing_Task_${id}_Export.xlsx`);
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
                // V5: 新增批次列 —— samples.batch，null 表示未分批
                title: "批次",
                dataIndex: "batch",
                width: 90,
                render: (batch) =>
                    batch == null ? (
                        <span className="text-slate-300 italic text-xs">
                            未分批
                        </span>
                    ) : (
                        <Tag
                            color="geekblue"
                            bordered={false}
                            className="m-0 font-bold"
                        >
                            第 {batch} 批
                        </Tag>
                    ),
            },
            {
                // V4: 质控样的 client_code 由后端自动生成、对用户没有意义，本列不显示它 ——
                //     类型标签之后同一行接上标准样的标准物质名称、重复样的父样品编号。
                title: "样品类型",
                dataIndex: "type",
                width: 200,
                render: (type, record) => {
                    const cfg = SampleTypeMap[type] || SampleTypeMap[0];
                    return (
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <Tag
                                icon={cfg.icon}
                                color={cfg.color}
                                className="border-none font-bold m-0"
                            >
                                {cfg.label}
                            </Tag>
                            {type === 3 && record.parent_lab_code && (
                                <span className="text-[12px] text-orange-400 font-mono">
                                    ←{" "}
                                    {formatSampleCode(
                                        record.parent_lab_code,
                                        record.task_lab_code,
                                    )}
                                </span>
                            )}
                            {/* V5: 响应字段 reference_material_name → reference_sample_name */}
                            {type === 2 && record.reference_sample_name && (
                                <span className="text-[12px] text-purple-600 font-bold flex items-center gap-1">
                                    <StarOutlined />
                                    {record.reference_sample_name}
                                </span>
                            )}
                        </div>
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
                // V5: batch 为空表示不过滤（batch=0 是"仅未分批"的有效取值，不能当空值丢掉）
                const payload = { ...params, task_id: taskId };
                if (filters.batch != null) payload.batch = filters.batch;
                // V6: is_creator 只在选中「只看我创建的」时下发；0 与不传等价，不必发送
                if (filters.is_creator === 1) payload.is_creator = 1;
                return readTestingSample(payload);
            },
            update: updateTestingSample,
            delete: deleteTestingSample,
        }),
        [taskId, filters],
    );

    // 下拉里预置当前页出现过的批次号，常用批次一键可选（任意批次可在下拉底部输入）
    const knownBatches = useMemo(() => {
        const set = new Set(
            samples.map((s) => s.batch).filter((b) => b != null),
        );
        return Array.from(set).sort((a, b) => a - b);
    }, [samples]);

    // V5: 顶部已激活筛选条的展示配置（CrudTable 用它渲染可一键清除的标签）
    const filterConfig = useMemo(
        () => ({
            batch: {
                label: "批次",
                options: [
                    { label: "未分批", value: 0 },
                    ...knownBatches.map((b) => ({
                        label: `第 ${b} 批`,
                        value: b,
                    })),
                    ...(filters.batch != null &&
                    filters.batch !== 0 &&
                    !knownBatches.includes(filters.batch)
                        ? [
                              {
                                  label: `第 ${filters.batch} 批`,
                                  value: filters.batch,
                              },
                          ]
                        : []),
                ],
            },
            // V6: 「只看我创建的」筛选（read 的 is_creator 参数）
            is_creator: {
                label: "范围",
                options: [{ label: "只看我创建的", value: 1 }],
            },
        }),
        [knownBatches, filters.batch],
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
        {
            title: "客户联络人",
            dataIndex: "liaison_name",
            width: 120,
            render: (name, record) => (
                <Tooltip title={`联系电话: ${record.liaison_contact || "无"}`}>
                    <span className="cursor-help">{name}</span>
                </Tooltip>
            ),
        },
        {
            title: "样品类型",
            dataIndex: "sample_type_name",
            width: 180,
            ellipsis: true,
        },
        { title: "分析类型", dataIndex: "analysis_type_name", width: 120 },
        {
            title: "收样人",
            dataIndex: "receiver_nickname",
            width: 120,
            render: (name) => (
                <Space>
                    <UserOutlined className="text-slate-400" />
                    <span>{name || "-"}</span>
                </Space>
            ),
        },
        {
            title: "创建时间",
            dataIndex: "created_at",
            width: 180,
            render: (t) => (
                <span className="text-xs font-mono text-slate-400">{t}</span>
            ),
        },
        {
            title: "最迟完成",
            dataIndex: "deadline",
            width: 120,
            render: (t) => (
                <Tag color="orange" className="m-0 border-none font-bold">
                    {t}
                </Tag>
            ),
        },
        {
            title: "项目数量",
            dataIndex: "item_count",
            width: 100,
            align: "center",
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
            ),
        },
    ];

    return (
        <Layout className="bg-white h-[calc(100vh-120px)] overflow-hidden">
            <style>{`
                .task-drawer .ant-drawer-body { padding: 0; }
            `}</style>

            <Content className="bg-white flex flex-col h-full overflow-hidden">
                {!taskId ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white">
                        <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mb-6">
                            <ExperimentOutlined className="text-4xl text-orange-500" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 mb-4">
                            实验员检测管理中心
                        </h2>
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
                                        <Tag
                                            color="orange"
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
                                    导出任务单
                                </Button>
                                <Button
                                    type="primary"
                                    className="bg-orange-600 border-none shadow-lg shadow-orange-200 font-bold px-6 rounded-xl"
                                    onClick={() =>
                                        setRefreshKey((prev) => prev + 1)
                                    }
                                >
                                    刷新数据
                                </Button>
                            </Space>
                        </div>

                        <div className="p-6 flex-1 overflow-hidden sample-table-container">
                            <div className="bg-white h-full rounded-3xl overflow-hidden flex flex-col">
                                <CrudTable
                                    className="min-h-0 "
                                    refreshKey={refreshKey}
                                    title={
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                                                <BarcodeOutlined className="text-orange-600" />
                                            </div>
                                            <span className="text-lg font-black text-slate-800">
                                                检测样品列表
                                            </span>
                                        </div>
                                    }
                                    entityName="样品"
                                    columns={columns}
                                    api={sampleApi}
                                    AddEditForm={(props) => (
                                        <AddEdit
                                            {...props}
                                            apis={testingApis}
                                            // V6.1: 该模块的 Sample/update 后端不写入 batch
                                            //     （实测收下就丢），批次号置灰只读
                                            batchEditable={false}
                                        />
                                    )}
                                    initialValues={initialValues}
                                    modalWidth={500}
                                    hideAdd={true}
                                    renderActions={renderActions}
                                    isRecordEditable={(record) => {
                                        return (
                                            record.creator_id !== null &&
                                            record.creator_id !== undefined &&
                                            record.creator_name !== null &&
                                            record.creator_name !== undefined
                                        );
                                    }}
                                    batchActions={batchActions}
                                    batchDropdown
                                    actionExtra={
                                        // V5: 这一行新增了批次/类型筛选器，窄屏需允许换行
                                        <Space wrap>
                                            {/* V5: 批次筛选（read 的 batch 参数） */}
                                            <BatchFilter
                                                value={filters.batch}
                                                knownBatches={knownBatches}
                                                onChange={(val) =>
                                                    setFilters((prev) => ({
                                                        ...prev,
                                                        batch: val,
                                                    }))
                                                }
                                            />
                                            {/* V6: 创建人筛选（read 的 is_creator 参数）——
                                                全部 = 不传（分配给我的方法的样品 或 我创建的样品）；
                                                只看我创建的 = is_creator:1 */}
                                            <Tooltip title="全部=分配给我的样品+我创建的样品；只看我创建的=仅我创建的样品">
                                                <Segmented
                                                    size="middle"
                                                    value={
                                                        filters.is_creator === 1
                                                            ? 1
                                                            : 0
                                                    }
                                                    onChange={(val) =>
                                                        setFilters((prev) => ({
                                                            ...prev,
                                                            is_creator:
                                                                val === 1
                                                                    ? 1
                                                                    : null,
                                                        }))
                                                    }
                                                    options={[
                                                        {
                                                            label: "全部",
                                                            value: 0,
                                                        },
                                                        {
                                                            label: "只看我创建的",
                                                            value: 1,
                                                            icon: (
                                                                <UserOutlined />
                                                            ),
                                                        },
                                                    ]}
                                                />
                                            </Tooltip>
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
                                            <Button
                                                icon={<DownloadOutlined />}
                                                onClick={() =>
                                                    setDownloadModalVisible(
                                                        true,
                                                    )
                                                }
                                                className="rounded-xl font-bold border-green-100 text-green-600 bg-green-50"
                                            >
                                                下载模板
                                            </Button>
                                            <Button
                                                icon={<UploadOutlined />}
                                                onClick={() =>
                                                    setUploadModalVisible(true)
                                                }
                                                className="rounded-xl font-bold border-purple-100 text-purple-600 bg-purple-50"
                                            >
                                                上传数据
                                            </Button>
                                        </Space>
                                    }
                                    filterValues={filters}
                                    filterConfig={filterConfig}
                                    onClearFilter={(key) =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            [key]: null,
                                        }))
                                    }
                                    onClearAll={() =>
                                        setFilters({
                                            batch: null,
                                            is_creator: null,
                                        })
                                    }
                                    onDataLoaded={setSamples}
                                    fillHeight
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
                        <span className="text-xl font-black">
                            待检测任务列表
                        </span>
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
                    setRefreshKey((prev) => prev + 1);
                }}
            />

            <TaskBatchModal
                open={taskBatchModalOpen}
                onCancel={() => setTaskBatchModalOpen(false)}
                operation={activeTaskOp}
                taskId={taskId}
                module="testing"
                onSuccess={() => {
                    setTaskBatchModalOpen(false);
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
                apis={testingApis}
                // V6.1: 该模块的 Sample/reference 后端不写入 batch（实测收下就丢），
                //     所以不显示批次号输入框；后端修好后删掉这一行即可。
                supportsBatch={false}
            />

            <DownloadTemplateModal
                open={downloadModalVisible}
                onCancel={() => setDownloadModalVisible(false)}
                taskId={taskId}
                taskLabCode={selectedTask?.lab_code}
            />

            {/* V5: 上传弹窗需要 taskId 才能列出本任务的检测项目/方法，
                进而按结果字段登记设备（device_ids） */}
            <UploadDataModal
                open={uploadModalVisible}
                onCancel={() => setUploadModalVisible(false)}
                taskId={taskId}
                onSuccess={() => {
                    setRefreshKey((prev) => prev + 1);
                }}
            />
        </Layout>
    );
};

export default TestingSampleList;
