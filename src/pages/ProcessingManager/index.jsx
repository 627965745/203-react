import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
    Button,
    Tag,
    Space,
    Layout,
    Drawer,
    Table,
    Tooltip,
    Modal,
    message,
    Popconfirm,
} from "antd";
import {
    BarcodeOutlined,
    TeamOutlined,
    UserOutlined,
    ExperimentOutlined,
    FileTextOutlined,
    CalendarOutlined,
    SolutionOutlined,
    ProjectOutlined,
    InfoCircleOutlined,
    CheckCircleOutlined,
    MenuUnfoldOutlined,
    ToolOutlined,
    NumberOutlined,
    StarOutlined,
} from "@ant-design/icons";
import CrudTable from "../../components/CrudTable";
import {
    readTaskProcessingManager,
    readSampleProcessingManager,
    approveSampleProcessingManager,
} from "../../api/ProcessingManager";

const { Content } = Layout;

const PhysicalStateMap = {
    0: { label: "固态", color: "orange" },
    1: { label: "液态", color: "blue" },
    2: { label: "气态", color: "purple" },
};

const CategoryMap = {
    0: { label: "委托检测", color: "cyan" },
    1: { label: "监督检测", color: "red" },
    2: { label: "其他", color: "default" },
};

const SampleTypeMap = {
    0: { label: "非对照样", color: "blue" },
    1: { label: "空白样", color: "default" },
    2: { label: "标准样", color: "purple" },
    3: { label: "重复样", color: "orange" },
};

// V2: 加工状态上提到样品级（samples.processing_status）
const ProcessingStatusMap = {
    0: { label: "无需加工", color: "default" },
    1: { label: "正在加工", color: "processing" },
    2: { label: "加工完成", color: "success" },
};

// 紧凑的「标签：值」行。多个弱相关字段纵向堆叠进同一列，
// 省出横向空间，同时让相邻列自然等高。
const StackedField = ({ label, children }) => (
    <div className="flex items-baseline gap-2 min-w-0">
        <span className="text-xs text-slate-400 w-14 whitespace-nowrap shrink-0">
            {label}
        </span>
        <div className="truncate min-w-0">{children}</div>
    </div>
);

const EmptyHint = ({ children }) => (
    <span className="text-slate-300">{children}</span>
);

// 密集布局下秒级精度没有意义，截到分钟以免时间戳被省略号截断
const toMinute = (t) => (t ? t.slice(0, 16) : "-");

const ProcessingManager = () => {
    const [taskId, setTaskId] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // Task Drawer states
    const [taskDrawerVisible, setTaskDrawerVisible] = useState(true);
    const [taskLoading, setTaskLoading] = useState(false);
    const [tasks, setTasks] = useState([]);
    const [totalTasks, setTotalTasks] = useState(0);
    const [taskParams, setTaskParams] = useState({ page: 0, rows: 10 });

    useEffect(() => {
        fetchTasks();
    }, [taskParams]);

    const fetchTasks = async () => {
        setTaskLoading(true);
        try {
            const res = await readTaskProcessingManager(taskParams);
            if (res.data.status === 0) {
                setTasks(res.data.data.rows || []);
                setTotalTasks(res.data.data.total || 0);
            }
        } catch (error) {
            console.error("Fetch processing tasks error:", error);
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

    // V2: 加工完成审批按样品直接进行，不再传 item_id
    // V4: 后端更新条件新增 processor_id = 当前登录用户 —— 非本人负责的样品不会被更新，
    //     会以"数据库无改动"类错误返回。这类错误已由 request 拦截器统一弹出后端 message，
    //     这里不再叠加一条泛化的"操作异常"，避免两条互相矛盾的提示。
    const handleApprove = async (sampleId) => {
        try {
            const res = await approveSampleProcessingManager({
                sample_ids: [sampleId],
            });
            if (res.data.status === 0) {
                message.success("已标记加工完成");
                setRefreshKey((prev) => prev + 1);
            } else {
                message.error(res.data.message || "操作失败");
            }
        } catch (err) {
            console.error("Approve error:", err);
        }
    };

    // V4: 与「样品编号」列同一套格式：任务编号 + 4 位序号；
    //     已经是完整编号（含 "-"）则原样返回。用于展示重复样的父样品编号。
    const formatSampleCode = (code) => {
        if (code === null || code === undefined || code === "") return "";
        const str = String(code);
        if (str.includes("-")) return str;
        const seq = str.padStart(4, "0");
        return selectedTask?.lab_code
            ? `${selectedTask.lab_code}-${seq}`
            : seq;
    };

    // 布局重排：样品列表由弹窗改为整页，且不再为每行撑开常驻展开面板。
    // 弱相关字段纵向堆叠进同一列；备注多数为空，改为加工详情里的 tooltip。
    const columns = useMemo(
        () => [
            {
                title: "样品编号",
                dataIndex: "lab_code",
                width: 150,
                render: (text, record) => (
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                            <BarcodeOutlined className="text-blue-500" />
                            <span className="font-mono font-bold text-blue-600">
                                {selectedTask?.lab_code}-
                                {text?.toString().padStart(4, "0")}
                            </span>
                        </div>
                        <span className="text-xs text-slate-300 font-mono">
                            ID {record.id}
                        </span>
                    </div>
                ),
            },
            {
                // V4: 质控样的 client_code 改由后端 helper.frankID() 自动生成，是一串对用户
                //     没有意义的编号 —— 空白样/标准样/重复样这一列不再显示它，统一显示类型名，
                //     并把父样品编号、标准物质名称接在同一行；只有普通样才显示真正的客户样号。
                title: "客户样号",
                dataIndex: "client_code",
                width: 220,
                render: (text, record) => {
                    if (record.type > 0) {
                        const cfg = SampleTypeMap[record.type];
                        return (
                            <div className="flex items-center gap-2 whitespace-nowrap">
                                <span className="font-bold text-slate-500">
                                    {cfg?.label || record.type}
                                </span>
                                {record.type === 3 &&
                                    record.parent_lab_code && (
                                        <span className="text-xs text-orange-400 font-mono">
                                            ←{" "}
                                            {formatSampleCode(
                                                record.parent_lab_code,
                                            )}
                                        </span>
                                    )}
                                {record.type === 2 &&
                                    record.reference_material_name && (
                                        <span className="text-xs text-purple-600 font-bold flex items-center gap-1 truncate">
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
                                {text || <EmptyHint>-</EmptyHint>}
                            </span>
                        </div>
                    );
                },
            },
            {
                // V4: 父样编号 / 标准物质已挪到「客户样号」列同一行显示，本列只留类型标签
                title: "样品类型",
                key: "attributes",
                width: 110,
                render: (_, record) => {
                    const cfg = SampleTypeMap[record.type];
                    return cfg ? (
                        <Tag color={cfg.color} bordered={false} className="m-0">
                            {cfg.label}
                        </Tag>
                    ) : (
                        record.type
                    );
                },
            },
            {
                title: "样品参数",
                key: "inputs",
                width: 210,
                render: (_, record) =>
                    (record.inputs || []).length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                            {record.inputs.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-baseline gap-2 min-w-0"
                                >
                                    <span className="text-xs text-slate-400 shrink-0">
                                        {item.key}
                                    </span>
                                    <span className="font-semibold text-slate-700 truncate">
                                        {item.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyHint>暂无参数</EmptyHint>
                    ),
            },
            {
                title: "加工详情",
                key: "processing",
                render: (_, record) => {
                    const cfg =
                        ProcessingStatusMap[record.processing_status] ||
                        ProcessingStatusMap[0];
                    return (
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Tag
                                    color={cfg.color}
                                    bordered={false}
                                    className="m-0"
                                >
                                    {record.processing_status === 2 && (
                                        <CheckCircleOutlined className="mr-1" />
                                    )}
                                    {cfg.label}
                                </Tag>
                                {record.processing_deadline && (
                                    <span className="text-xs text-slate-400">
                                        截止{" "}
                                        <span className="text-sm font-mono text-indigo-500">
                                            {
                                                record.processing_deadline.split(
                                                    " ",
                                                )[0]
                                            }
                                        </span>
                                    </span>
                                )}
                                {/* 备注多数为空，不单独占一列，有值时在此处以 tooltip 展示 */}
                                {record.description && (
                                    <Tooltip title={record.description}>
                                        <InfoCircleOutlined className="text-blue-300 hover:text-blue-500" />
                                    </Tooltip>
                                )}
                                {/* V2: 完成加工按样品直接审批 */}
                                {record.processing_status === 1 && (
                                    <Popconfirm
                                        title="确认完成加工？"
                                        description="请确保该样品的加工步骤已全部执行完毕。"
                                        onConfirm={() =>
                                            handleApprove(record.id)
                                        }
                                        okText="确认"
                                        cancelText="取消"
                                        placement="left"
                                    >
                                        <Button
                                            size="small"
                                            type="primary"
                                            className="rounded-md bg-indigo-600 hover:bg-indigo-700"
                                        >
                                            完成加工
                                        </Button>
                                    </Popconfirm>
                                )}
                            </div>
                            {(record.processing || []).length > 0 ? (
                                <div className="flex flex-col gap-0.5">
                                    {record.processing.map((p, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-baseline gap-2 min-w-0"
                                        >
                                            <span className="text-base text-slate-500 truncate">
                                                {p.method_name}
                                            </span>
                                            <span className="text-base shrink-0 font-semibold text-slate-700 bg-slate-50 border border-slate-100 rounded px-2">
                                                {p.option_value || p.value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyHint>无加工参数</EmptyHint>
                            )}
                        </div>
                    );
                },
            },
            {
                title: "创建 / 更新",
                key: "meta",
                width: 220,
                render: (_, record) => (
                    <div className="flex flex-col gap-0.5">
                        <StackedField label="创建人">
                            {record.creator_name || "-"}
                        </StackedField>
                        <StackedField label="创建于">
                            <span className="text-xs font-mono text-slate-500">
                                {toMinute(record.created_at)}
                            </span>
                        </StackedField>
                        <StackedField label="更新于">
                            <span className="text-xs font-mono text-slate-500">
                                {toMinute(record.updated_at)}
                            </span>
                        </StackedField>
                    </div>
                ),
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
                return readSampleProcessingManager({
                    ...params,
                    task_id: taskId,
                });
            },
        }),
        [taskId],
    );

    const batchActions = useMemo(
        () => [
            {
                key: "batchApprove",
                label: "批量完成加工",
                icon: <CheckCircleOutlined />,
                type: "primary",
                className: "font-bold",
                onClick: (rows, { clearSelection, refresh }) => {
                    const eligible = rows.filter(
                        (r) => r.processing_status === 1,
                    );
                    const skipped = rows.length - eligible.length;
                    if (eligible.length === 0) {
                        message.warning(
                            '所选样品均不处于"正在加工"状态，无法批量完成',
                        );
                        return;
                    }
                    Modal.confirm({
                        title: "批量完成加工",
                        content:
                            skipped > 0
                                ? `是否将选中的 ${eligible.length} 个样品标记为加工完成？另有 ${skipped} 个样品当前非"正在加工"状态，将被跳过。`
                                : `是否将选中的 ${eligible.length} 个样品标记为加工完成？`,
                        okText: "确认",
                        cancelText: "取消",
                        onOk: async () => {
                            try {
                                const res =
                                    await approveSampleProcessingManager({
                                        sample_ids: eligible.map((r) => r.id),
                                    });
                                if (res.data.status === 0) {
                                    message.success(
                                        skipped > 0
                                            ? `已完成 ${eligible.length} 个样品的加工，跳过 ${skipped} 个`
                                            : "批量完成加工成功",
                                    );
                                    clearSelection();
                                    refresh();
                                } else {
                                    message.error(
                                        res.data.message || "批量操作失败",
                                    );
                                }
                            } catch (err) {
                                // V4: 非本人负责（processor_id 不匹配）的样品不会被更新，
                                //     后端 message 已由 request 拦截器统一弹出，此处不重复提示
                                console.error("Batch approve error:", err);
                            }
                        },
                    });
                },
            },
        ],
        [],
    );

    const taskColumns = [
        {
            title: "任务编号",
            dataIndex: "lab_code",
            width: 140,
            fixed: "left",
            render: (text) => (
                <div className="flex items-center gap-2">
                    <BarcodeOutlined className="text-blue-500" />
                    <span className="font-mono font-bold text-blue-600">
                        {text}
                    </span>
                </div>
            ),
        },
        {
            title: "任务名称",
            dataIndex: "name",
            width: 180,
            ellipsis: true,
            render: (text) => (
                <span className="font-bold text-slate-700">{text}</span>
            ),
        },
        {
            title: "客户",
            dataIndex: "client_name",
            width: 210,
            ellipsis: true,
            render: (text) => (
                <div className="flex items-center gap-2">
                    <TeamOutlined className="text-gray-400" />
                    <span className="text-slate-600">{text}</span>
                </div>
            ),
        },
        {
            title: "联系人",
            dataIndex: "liaison_name",
            width: 130,
            render: (text, record) => (
                <Tooltip title={`联系电话: ${record.liaison_contact || "无"}`}>
                    <div className="flex items-center gap-2 cursor-help">
                        <UserOutlined className="text-gray-400" />
                        <span className="text-slate-600">{text || "-"}</span>
                    </div>
                </Tooltip>
            ),
        },
        {
            title: "样品类型",
            dataIndex: "sample_type_name",
            width: 150,
            ellipsis: true,
            render: (text) => (
                <div className="flex items-center gap-2">
                    <ExperimentOutlined className="text-amber-500" />
                    <span className="text-slate-600">{text}</span>
                </div>
            ),
        },
        {
            title: "分析类型",
            dataIndex: "analysis_type_name",
            width: 130,
            ellipsis: true,
            render: (text) => (
                <div className="flex items-center gap-2">
                    <FileTextOutlined className="text-indigo-400" />
                    <span className="text-slate-600">{text}</span>
                </div>
            ),
        },
        {
            title: "物理形态",
            dataIndex: "physical_state",
            width: 100,
            render: (val) => {
                const item = PhysicalStateMap[val];
                return item ? (
                    <Tag
                        color={item.color}
                        bordered={false}
                        className="rounded-full px-3"
                    >
                        {item.label}
                    </Tag>
                ) : (
                    val
                );
            },
        },
        {
            title: "检测类别",
            dataIndex: "category",
            width: 110,
            render: (val) => {
                const item = CategoryMap[val];
                return item ? (
                    <Tag color={item.color} className="rounded-md">
                        {item.label}
                    </Tag>
                ) : (
                    val
                );
            },
        },
        {
            title: "截止日期",
            dataIndex: "deadline",
            width: 120,
            render: (text) => (
                <div className="flex items-center gap-2 text-slate-600">
                    <CalendarOutlined className="text-rose-400" />
                    <span
                        className={
                            new Date(text) < new Date()
                                ? "text-rose-500 font-medium"
                                : ""
                        }
                    >
                        {text}
                    </span>
                </div>
            ),
        },
        {
            title: "收样人",
            dataIndex: "receiver_nickname",
            width: 100,
            render: (text) => <span className="text-slate-600">{text}</span>,
        },
        {
            title: "创建时间",
            dataIndex: "created_at",
            width: 160,
            render: (t) => <span className="text-xs text-slate-400">{t}</span>,
        },
        {
            title: "操作",
            key: "action",
            width: 130,
            fixed: "right",
            render: (_, record) => (
                <Button
                    type="primary"
                    size="small"
                    icon={<SolutionOutlined />}
                    onClick={() => handleSelectTask(record)}
                    className="rounded-lg font-bold shadow-sm"
                >
                    管理样品
                </Button>
            ),
        },
    ];

    return (
        <Layout className="bg-white h-[calc(100vh-120px)] overflow-hidden">
            <style>{`
                .task-drawer .ant-drawer-body { padding: 0; }
                /* 多行堆叠的单元格顶对齐，避免行高被撑开时内容浮在中间 */
                .sample-table-container .ant-table-tbody > tr > td {
                    vertical-align: top;
                }
            `}</style>

            <Content className="bg-white flex flex-col h-full overflow-hidden">
                {!taskId ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white">
                        <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                            <ToolOutlined className="text-4xl text-indigo-500" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 mb-4">
                            加工任务管理
                        </h2>
                        <p className="text-slate-400 text-lg max-w-md text-center">
                            请先从任务列表中选择一个具体任务，以查看并管理该任务下由您负责加工的样品。
                        </p>
                        {/* V4: 任务/样品列表均按 processor_id = 当前登录用户过滤，
                            列表为空通常是"没有分配给我的加工"，不是系统故障 */}
                        <p className="text-slate-400 text-sm max-w-md text-center mt-3">
                            这里只显示指定您为「加工人」的任务与样品。若列表为空，说明暂时没有分配给您的加工，请联系管理组在工作流中指定加工人。
                        </p>
                        <Button
                            type="primary"
                            size="large"
                            icon={<MenuUnfoldOutlined />}
                            onClick={() => setTaskDrawerVisible(true)}
                            className="mt-8 bg-indigo-600 border-none h-12 px-10 rounded-2xl shadow-xl shadow-indigo-100 font-bold hover:bg-indigo-700"
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
                                        <ToolOutlined className="text-indigo-600" />
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
                            <Button
                                type="primary"
                                className="bg-indigo-600 border-none shadow-lg shadow-indigo-200 font-bold px-6 rounded-xl"
                                onClick={() => setRefreshKey((p) => p + 1)}
                            >
                                刷新数据
                            </Button>
                        </div>

                        <div className="p-6 flex-1 overflow-hidden sample-table-container">
                            <div className="bg-white h-full rounded-3xl overflow-hidden flex flex-col">
                                <CrudTable
                                    className="min-h-0 "
                                    refreshKey={refreshKey}
                                    title={
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                                                <BarcodeOutlined className="text-indigo-600" />
                                            </div>
                                            <span className="text-lg font-black text-slate-800">
                                                样品加工清单
                                            </span>
                                            {/* V4: 列表按 processor_id = 当前登录用户过滤 */}
                                            <Tag
                                                color="blue"
                                                bordered={false}
                                                className="m-0 font-bold"
                                            >
                                                仅显示由我负责加工的样品
                                            </Tag>
                                        </div>
                                    }
                                    entityName="样品"
                                    columns={columns}
                                    api={sampleApi}
                                    hideAdd
                                    hideEdit
                                    hideDelete
                                    hideSearch
                                    hideAction
                                    batchActions={batchActions}
                                    defaultPageSize={20}
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
                        <ProjectOutlined className="text-indigo-600" />
                        <span className="text-xl font-black">加工任务列表</span>
                        {/* V4: 任务统计子查询按 processor_id = 当前登录用户过滤 */}
                        <Tag color="blue" bordered={false} className="m-0 font-bold">
                            仅显示有我负责加工样品的任务
                        </Tag>
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
                        size="small"
                        scroll={{ x: 1600 }}
                        pagination={{
                            current: taskParams.page + 1,
                            pageSize: taskParams.rows,
                            total: totalTasks,
                            showQuickJumper: true,
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
        </Layout>
    );
};

export default ProcessingManager;
