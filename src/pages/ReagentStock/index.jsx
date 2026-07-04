import React, {
    useState,
    useEffect,
    useMemo,
    useCallback,
    useRef,
} from "react";
import {
    Select,
    Space,
    Tag,
    Button,
    Modal,
    Form,
    InputNumber,
    Input,
    message,
    Empty,
    Spin,
    List,
    Layout,
    Divider,
    Tooltip,
} from "antd";
import {
    RetweetOutlined,
    CheckCircleOutlined,
    SyncOutlined,
    StopOutlined,
    PrinterOutlined,
    BarcodeOutlined,
    ControlOutlined,
    PlusOutlined,
    HistoryOutlined,
    InboxOutlined,
    SettingOutlined,
    ScanOutlined,
    LeftOutlined,
    RightOutlined,
} from "@ant-design/icons";
import CrudTable from "../../components/CrudTable";
import {
    readReagentStock,
    createReagentStock,
    updateReagentStock,
    deleteReagentStock,
    actionReagentStock,
    logsReagentStock,
    detailReagentStock,
} from "../../api/reagentStock";
import {
    readReagent,
    createReagent,
    updateReagent,
    deleteReagent,
    comboReagent,
} from "../../api/reagent";
import { comboUser } from "../../api/user";
import {
    getScaleReading,
    getScannerReading,
    sendPrintJob,
    cancelScannerReading,
} from "../../api/externalDevice";
import AddEdit from "./AddEdit";
import ReagentAddEdit from "../Reagent/AddEdit";

const { Sider, Content } = Layout;

const StatusMap = {
    0: { label: "在库", color: "blue", icon: <CheckCircleOutlined /> },
    1: { label: "领用中", color: "orange", icon: <SyncOutlined spin /> },
    2: { label: "已归还", color: "green", icon: <CheckCircleOutlined /> },
    3: { label: "已用完", color: "red", icon: <StopOutlined /> },
};

const LogTypeMap = {
    0: { label: "入库", color: "blue" },
    1: { label: "领用", color: "orange" },
    2: { label: "归还", color: "green" },
    3: { label: "用完", color: "red" },
};

const StockLogs = ({ record }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            try {
                const res = await logsReagentStock({
                    stock_id: record.id,
                    page: 0,
                    rows: 50,
                });
                if (res.data.status === 0) {
                    const data = res.data.data;
                    setLogs(Array.isArray(data) ? data : data?.rows || []);
                }
            } catch (err) {
                console.error("Failed to fetch logs", err);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, [record.id]);

    if (loading)
        return (
            <div className="p-4 flex justify-center">
                <Spin size="small" />
            </div>
        );

    if (!logs.length)
        return (
            <div className="p-4 text-center text-gray-400">暂无操作日志</div>
        );

    return (
        <div className="p-4 bg-gray-50 border border-t-0 border-gray-100 mt-[-16px]">
            <h4 className="text-xs font-bold text-gray-500 mb-2">操作流水</h4>
            <div className="bg-white rounded border border-gray-200 divide-y overflow-hidden max-h-60 overflow-y-auto">
                {logs.map((log, idx) => (
                    <div
                        key={log.id || idx}
                        className="p-2 text-xs flex items-center justify-between hover:bg-gray-50"
                    >
                        <div className="flex gap-4 items-center">
                            <span className="text-gray-400 font-mono">
                                {log.created_at}
                            </span>
                            <Tag
                                color={LogTypeMap[log.type]?.color}
                                className="m-0 border-none text-[10px]"
                            >
                                {LogTypeMap[log.type]?.label}
                            </Tag>
                            <span className="text-gray-600">
                                <strong>操作人:</strong>{" "}
                                {log.operator_nickname || "-"} |{" "}
                                <strong>使用人:</strong>{" "}
                                {log.user_nickname || "-"}
                            </span>
                        </div>
                        <div className="flex gap-4 items-center">
                            <span className="text-gray-500 text-[10px]">
                                备注: {log.description || "无"}
                            </span>
                            <span className="font-mono text-gray-400 text-[10px]">
                                余量: {log.remaining}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ReagentStockList = ({
    reagents,
    reagentId,
    setReagentId,
    users,
    setRefreshKey: setParentRefreshKey,
    onAction,
}) => {
    // const [actionModal, setActionModal] = useState({ visible: false, record: null, type: 1 }); // 1=领用, 2=归还
    const [form] = Form.useForm();
    const [refreshKey, setRefreshKey] = useState(0);

    const api = useMemo(
        () => ({
            read: (params) => {
                if (!reagentId)
                    return Promise.resolve({
                        data: { status: 0, data: { rows: [], total: 0 } },
                    });
                return readReagentStock({ ...params, reagent_id: reagentId });
            },
            create: async (data) => {
                const res = await createReagentStock({
                    ...data,
                    reagent_id: reagentId,
                });
                if (res.data.status === 0 && res.data.data) {
                    const labCode = res.data.data;
                    if (data.auto_print !== false) {
                        try {
                            await sendPrintJob({ ...data, lab_code: labCode });
                            message.success("标签已发送打印");
                        } catch (e) {
                            message.warning(
                                e.message || "打印失败，请检查设备连接",
                            );
                        }
                    }
                }
                return res;
            },
            update: updateReagentStock,
            delete: deleteReagentStock,
        }),
        [reagentId],
    );

    const columns = [
        {
            title: "试剂标签条码",
            dataIndex: "lab_code",
            width: "15%",
            render: (text) => (
                <span className="text-gray-500 font-mono text-xs">{text}</span>
            ),
        },
        {
            title: "状态",
            dataIndex: "status",
            width: "12%",
            render: (val) => {
                const cfg = StatusMap[val] || {
                    label: "未知",
                    color: "default",
                    icon: null,
                };
                return (
                    <Tag
                        color={cfg.color}
                        icon={cfg.icon}
                        className="border-none"
                    >
                        {cfg.label}
                    </Tag>
                );
            },
        },
        {
            title: "余量/规格",
            width: "10%",
            render: (_, record) => {
                const isZero = Number(record.quantity) <= 0;
                return (
                    <div>
                        <span
                            className={`font-bold ${isZero ? "text-red-500" : "text-blue-600"}`}
                        >
                            {record.quantity}
                        </span>
                        <span className="text-gray-400 text-xs mx-1">/</span>
                        <span className="text-gray-500 text-xs">
                            {record.specification}
                        </span>
                    </div>
                );
            },
        },
        {
            title: "存放地",
            width: "10%",
            render: (_, record) => (
                <div className="flex flex-col">
                    <span className="text-sm font-medium">
                        {record.storage_name}
                    </span>
                    <span className="text-xs text-gray-400">
                        第 {record.row} 行
                    </span>
                </div>
            ),
        },
        {
            title: "当前领用",
            dataIndex: "user_nickname",
            width: "10%",
            render: (text, record) =>
                text && record.status === 1 ? (
                    <span className="text-orange-600 text-sm">{text}</span>
                ) : (
                    <span className="text-gray-300">-</span>
                ),
        },
        {
            title: "备注",
            dataIndex: "description",
            width: "15%",
            ellipsis: true,
            render: (text) => (
                <span className="text-gray-400 text-xs">{text || "无"}</span>
            ),
        },
    ];

    if (!reagents.length) {
        return (
            <div className="p-8 bg-white rounded-lg text-center">
                <Empty description="请先在试剂管理中添加试剂" />
            </div>
        );
    }

    return (
        <>
            <CrudTable
                refreshKey={refreshKey}
                title="试剂库存明细"
                entityName="试剂库存"
                columns={columns}
                api={api}
                scroll={{ y: "calc(100vh - 350px)" }}
                AddEditForm={AddEdit}
                initialValues={{
                    specification: null,
                    quantity: null,
                    storage_id: null,
                    row: 1,
                    description: "",
                }}
                modalWidth={600}
                renderExpandedRow={(record) => <StockLogs record={record} />}
                renderActions={(record) => {
                    const isAvailable =
                        record.status === 0 ||
                        record.status === 2 ||
                        record.status === 3;
                    const isUsing = record.status === 1;
                    const isNullStatus =
                        record.status === null || record.status === undefined;
                    const isZero = record.status === 3;

                    return (
                        <Space>
                            <Button
                                type="link"
                                size="small"
                                icon={<PrinterOutlined />}
                                onClick={async () => {
                                    try {
                                        await sendPrintJob(record);
                                        message.success("打印任务已发送");
                                    } catch (e) {
                                        message.error(
                                            e.message ||
                                                "打印失败，请检查设备连接",
                                        );
                                    }
                                }}
                            >
                                打印
                            </Button>
                            {(isNullStatus || isAvailable) && (
                                <Button
                                    type="link"
                                    size="small"
                                    icon={<RetweetOutlined />}
                                    onClick={() => onAction(record, 1)}
                                >
                                    领用
                                </Button>
                            )}
                            {(isNullStatus || isUsing) && (
                                <Button
                                    type="link"
                                    size="small"
                                    icon={<RetweetOutlined />}
                                    onClick={() => onAction(record, 2)}
                                >
                                    归还
                                </Button>
                            )}
                        </Space>
                    );
                }}
            />
        </>
    );
};

const ReagentLogsList = ({ users }) => {
    const [userId, setUserId] = useState(null);
    const [typeFilter, setTypeFilter] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const api = useMemo(
        () => ({
            read: (params) => {
                return logsReagentStock({
                    ...params,
                    user_id: userId,
                    type: typeFilter,
                });
            },
        }),
        [userId, typeFilter],
    );

    const columns = [
        {
            title: "试剂名称",
            dataIndex: "reagent_name",
            width: "10%",
            render: (text) => (
                <span className="font-bold text-gray-700">{text}</span>
            ),
        },
        {
            title: "试剂标签条码",
            dataIndex: "lab_code",
            width: "15%",
            render: (text) => (
                <span className="font-mono text-gray-500 text-xs">{text}</span>
            ),
        },
        {
            title: "类型",
            dataIndex: "type",
            width: "8%",
            render: (val) => {
                const cfg = LogTypeMap[val] || {
                    label: "未知",
                    color: "default",
                };
                return (
                    <Tag color={cfg.color} className="border-none">
                        {cfg.label}
                    </Tag>
                );
            },
        },
        {
            title: "操作人",
            dataIndex: "operator_nickname",
            width: "10%",
            render: (text) => (
                <span className="text-gray-600">{text || "-"}</span>
            ),
        },
        {
            title: "使用人",
            dataIndex: "user_nickname",
            width: "10%",
            render: (text) => (
                <span className="text-gray-600">{text || "-"}</span>
            ),
        },
        {
            title: "余量",
            dataIndex: "remaining",
            width: "10%",
            render: (text) => (
                <span className="font-mono text-blue-600 font-bold">
                    {text}
                </span>
            ),
        },
        {
            title: "操作时间",
            dataIndex: "created_at",
            width: "15%",
            render: (text) => (
                <span className="font-mono text-gray-400 text-[11px]">
                    {text}
                </span>
            ),
        },
        {
            title: "备注",
            dataIndex: "description",
            width: "15%",
            ellipsis: true,
            render: (text) => (
                <span className="text-gray-400 text-xs">{text || "-"}</span>
            ),
        },
    ];

    return (
        <CrudTable
            refreshKey={refreshKey}
            title="试剂操作流水"
            entityName="操作记录"
            columns={columns}
            api={api}
            scroll={{ y: "calc(100vh - 520px)" }}
            hideAdd={true}
            hideAction={true}
            hideSearch={true} // The Logs API does not define a general "query" param
            filterValues={{ user_id: userId, type: typeFilter }}
            filterConfig={{
                user_id: {
                    label: "使用人",
                    options: users.map((u) => ({
                        label: u.name || u.nickname,
                        value: u.id,
                    })),
                },
                type: { label: "操作类型", options: LogTypeMap },
            }}
            onClearFilter={(key) => {
                if (key === "user_id") setUserId(null);
                if (key === "type") setTypeFilter(null);
                setRefreshKey((prev) => prev + 1);
            }}
            onClearAll={() => {
                setUserId(null);
                setTypeFilter(null);
                setRefreshKey((prev) => prev + 1);
            }}
            actionExtra={
                <Space>
                    <span className="text-gray-500 text-sm">筛选使用人:</span>
                    <Select
                        placeholder="全部"
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        style={{ width: 150 }}
                        options={users.map((u) => ({
                            label: u.name || u.nickname,
                            value: u.id,
                        }))}
                        value={userId}
                        onChange={(val) => {
                            setUserId(val);
                            setRefreshKey((prev) => prev + 1);
                        }}
                    />
                    <span className="text-gray-500 text-sm ml-2">
                        操作类型:
                    </span>
                    <Select
                        placeholder="全部"
                        allowClear
                        style={{ width: 120 }}
                        options={Object.entries(LogTypeMap).map(
                            ([key, val]) => ({
                                label: val.label,
                                value: Number(key),
                            }),
                        )}
                        value={typeFilter}
                        onChange={(val) => {
                            setTypeFilter(val);
                            setRefreshKey((prev) => prev + 1);
                        }}
                    />
                </Space>
            }
        />
    );
};

import { Tabs } from "antd";

const ReagentStockPage = () => {
    const [reagents, setReagents] = useState([]);
    const [reagentId, setReagentId] = useState(null); // Selected reagent category
    const [users, setUsers] = useState([]);
    const [loadingInit, setLoadingInit] = useState(true);
    const [logsRefreshKey, setLogsRefreshKey] = useState(0);
    const [reagentRefreshKey, setReagentRefreshKey] = useState(0);
    const [reagentPage, setReagentPage] = useState(0);
    const [reagentTotal, setReagentTotal] = useState(0);

    // Action Modal State (Shared for individual scan and button scan)
    const [actionModal, setActionModal] = useState({
        visible: false,
        record: null,
        type: 1,
        scanning: false,
    });
    const [form] = Form.useForm();
    const scanInputRef = useRef(null);

    // Reagent Category Management State
    const [reagentModal, setReagentModal] = useState({
        visible: false,
        record: {},
    });
    const [reagentFormState, setReagentFormState] = useState({
        validate: null,
    });

    const fetchReagents = async () => {
        try {
            const res = await readReagent({ page: reagentPage, rows: 10 });
            if (res.data.status === 0) {
                setReagents(res.data.data.rows || []);
                setReagentTotal(res.data.data.total || 0);
            } else {
                setReagents([]);
                setReagentTotal(0);
            }
        } catch (err) {
            console.error("加载其分类失败", err);
        }
    };

    useEffect(() => {
        fetchReagents();
    }, [reagentPage, reagentRefreshKey]);

    useEffect(() => {
        const fetchInitial = async () => {
            const isFirst = reagents.length === 0;
            if (isFirst) setLoadingInit(true);
            try {
                const userRes = await comboUser();
                const userData =
                    userRes.data.status === 0
                        ? userRes.data.data || []
                        : [];
                setUsers(userData);
            } catch (err) {
                console.error("Failed to init ReagentStockPage", err);
            } finally {
                setLoadingInit(false);
            }
        };
        fetchInitial();
    }, [reagentRefreshKey]);

    useEffect(() => {
        if (!actionModal.visible) {
            cancelScannerReading();
        } else if (!actionModal.record) {
            // Auto focus input when modal is visible
            const timer = setTimeout(() => {
                scanInputRef.current?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [actionModal.visible, actionModal.record]);

    useEffect(() => {
        return () => {
            cancelScannerReading();
        };
    }, []);

    const handleGlobalScan = () => {
        setActionModal({ visible: true, record: null, type: 1 });
    };

    const fetchReagentDetailByCode = async (labCode) => {
        if (!labCode) return;
        try {
            const stockRes = await detailReagentStock({ lab_code: labCode });
            if (stockRes.data.status === 0 && stockRes.data.data) {
                const record = { ...stockRes.data.data, lab_code: labCode };

                const isUsing = record.status === 1;
                const nextType = isUsing ? 2 : 1;

                message.success(
                    `已识别: ${record.reagent_name || "试剂"} (${labCode})`,
                );
                setActionModal((prev) => ({
                    ...prev,
                    record: record,
                    type: nextType,
                }));
                form.resetFields();
                if (nextType === 2) {
                    let uid = record.user_id;
                    if (!uid && record.user_nickname) {
                        const found = users.find(
                            (u) =>
                                (u.nickname || u.name) === record.user_nickname,
                        );
                        if (found) uid = found.id;
                    }
                    if (uid) form.setFieldsValue({ user_id: uid });
                }
            } else {
                message.error(`未找到该批次编码或数据异常: ${labCode}`);
                scanInputRef.current?.select();
            }
        } catch (e) {
            message.error(e.message || "获取试剂详情失败，请检查网络");
            scanInputRef.current?.select();
        }
    };

    const handleActionSubmit = async (values) => {
        try {
            const payload = {
                id: actionModal.record.id,
                action: actionModal.type,
                ...values,
            };
            const res = await actionReagentStock(payload);
            if (res.data.status === 0) {
                message.success(
                    `${actionModal.type === 1 ? "领用" : "归还"}操作成功`,
                );
                setActionModal({ visible: false, record: null, type: 1 });
                form.resetFields();
                setLogsRefreshKey((prev) => prev + 1);
            } else {
                message.error(res.data.message || "操作失败");
            }
        } catch (err) {
            message.error("提交异常");
        }
    };

    const handleReagentSubmit = async (record) => {
        if (reagentFormState.validate && !reagentFormState.validate()) return;

        try {
            // Normalization: Ensure optional fields are included even if empty
            const payload = {
                ...record,
                sticker_file: record.sticker_file || "",
                description: record.description || "",
            };

            const isEdit = !!payload.id;
            const api = isEdit ? updateReagent : createReagent;
            const res = await api(payload);
            if (res.data.status === 0) {
                message.success(isEdit ? "更新成功" : "创建成功");
                setReagentModal({ visible: false, record: {} });
                setReagentRefreshKey((prev) => prev + 1);
            } else {
                message.error(res.data.message || "提交失败");
            }
        } catch (err) {
            message.error("系统异常");
        }
    };

    /* 
    if (loadingInit) {
        return <div className="flex justify-center items-center h-64 bg-white rounded-lg"><Spin description="加载基础数据中..." /></div>;
    }
    */

    return (
        <Layout className="bg-white h-[calc(100vh-120px)] overflow-hidden reagent-center-layout">
            <style>{`
                .reagent-center-layout  { background: #fff; }
                .reagent-center-layout .ant-layout-sider { background: #fff; }
                .reagent-center-layout .reagent-list-item:hover { background: #f1f5f9; }
                .reagent-center-layout .reagent-list-item.active {
                    background: #f1f5f9;
                    color: #2563eb;
                    border-right: 4px solid #2563eb;
                }
                .reagent-item-card {
                    display: flex;
                    flex-direction: column;
                    flex: 1;
                    min-width: 0;
                }
                .reagent-stats-vertical {
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
                .reagent-stats-vertical span b {
                    color: #1e293b;
                    font-weight: 800;
                }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                
                /* Align InputNumber and Button heights and widths */
                .height-aligned-compact {
                    display: flex !important;
                    width: 100% !important;
                }
                .height-aligned-compact .ant-input-number {
                    height: 40px !important; 
                    flex: 1 !important; /* Force take space */
                    min-width: 100px;
                    display: flex;
                    align-items: center;
                }
                .height-aligned-compact .ant-input-number-input {
                    height: 38px !important;
                    font-size: 14px !important;
                    width: 100% !important;
                }
                .height-aligned-compact .ant-btn {
                    height: 40px !important;
                    flex-shrink: 0;
                }
            `}</style>
            <Sider
                width={300}
                theme="light"
                className="border-r border-gray-100 h-full flex flex-col"
            >
                <div className="p-6 flex flex-col h-full bg-white">
                    <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-50 flex-shrink-0">
                        <span className="text-gray-600 font-black uppercase tracking-widest text-lg">
                            试剂管理
                        </span>
                        <Button
                            type="primary"
                            shape="circle"
                            size="middle"
                            icon={<PlusOutlined />}
                            className="bg-slate-800 border-none shadow-sm"
                            onClick={() => {
                                setReagentModal({
                                    visible: true,
                                    record: {
                                        name: "",
                                        category: 2,
                                        alert_threshold: 50,
                                        unit: "mL",
                                        sticker_file: "",
                                        description: "",
                                    },
                                });
                            }}
                        />
                    </div>

                    <div className="text-sm text-gray-400 font-bold mb-4 px-1 uppercase tracking-widest flex-shrink-0">
                        全部分类
                    </div>

                    <Spin
                        spinning={loadingInit && reagents.length === 0}
                        wrapperClassName="flex-1 flex flex-col overflow-hidden"
                        tip="加载试剂..."
                    >
                        <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                            {reagents.map((item) => (
                                <div
                                    key={item.id}
                                    className={`p-5 mb-4 rounded-2xl cursor-pointer transition-all flex justify-between items-start group reagent-list-item ${reagentId === item.id ? "active font-bold shadow-md" : "text-gray-600"}`}
                                    onClick={() => setReagentId(item.id)}
                                >
                                    <div className="reagent-item-card">
                                        <span className="text-base truncate w-full font-black text-slate-800">
                                            <Tag className="mr-2 font-black text-xs">
                                                #{item.id}
                                            </Tag>
                                            {item.name}
                                        </span>
                                        <div className="reagent-stats-vertical">
                                            <div className="flex justify-between">
                                                规格单位: <b>{item.unit}</b>
                                            </div>
                                            <div className="flex justify-between">
                                                库存阈值:{" "}
                                                <b>{item.alert_threshold}</b>
                                            </div>
                                            {item.description && (
                                                <div className="mt-2 border-t pt-2 border-gray-200 truncate text-gray-400 italic text-xs">
                                                    {item.description}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="hidden group-hover:flex items-center pt-1 ml-2">
                                        <Button
                                            type="text"
                                            size="middle"
                                            shape="circle"
                                            icon={
                                                <SettingOutlined className="text-gray-400" />
                                            }
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setReagentModal({
                                                    visible: true,
                                                    record: JSON.parse(
                                                        JSON.stringify(item),
                                                    ),
                                                });
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="flex justify-center items-center gap-4 py-3 border-t border-slate-100 flex-shrink-0 mt-2">
                            <Button
                                type="text"
                                icon={<LeftOutlined />}
                                disabled={reagentPage === 0}
                                onClick={() => setReagentPage((prev) => prev - 1)}
                            />
                            <span className="font-mono text-sm text-slate-600">
                                第 {reagentPage + 1} 页 / 共 {Math.max(1, Math.ceil(reagentTotal / 10))} 页
                            </span>
                            <Button
                                type="text"
                                icon={<RightOutlined />}
                                disabled={(reagentPage + 1) * 10 >= reagentTotal}
                                onClick={() => setReagentPage((prev) => prev + 1)}
                            />
                        </div>
                    </Spin>
                </div>
            </Sider>

            <Content className="bg-white flex flex-col h-full overflow-hidden">
                <div className="p-6 bg-white border-b border-gray-100 flex justify-between items-center shadow-sm flex-shrink-0">
                    <Space size="large">
                        <div className="flex flex-col">
                            <span className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                {!reagentId ? (
                                    <HistoryOutlined className="text-blue-600" />
                                ) : (
                                    <InboxOutlined className="text-blue-600" />
                                )}
                                {!reagentId
                                    ? "全局试剂日志"
                                    : reagents.find((r) => r.id === reagentId)
                                          ?.name}
                            </span>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded">
                                    {!reagentId
                                        ? "查询所有历史流转操作记录"
                                        : `当前管理 ID: ${reagentId}`}
                                </span>
                            </div>
                        </div>
                    </Space>
                    <Space size="middle">
                        <Button
                            icon={<HistoryOutlined />}
                            size="large"
                            className={`h-16 px-10 rounded-2xl font-bold ${!reagentId ? "bg-blue-50 text-blue-600 border-blue-200" : "text-gray-500 border-gray-200"}`}
                            onClick={() => setReagentId(null)}
                        >
                            全局试剂日志
                        </Button>
                        <Button
                            type="primary"
                            size="large"
                            icon={<ScanOutlined />}
                            className="bg-slate-900 border-none hover:bg-black shadow-xl font-black px-10 h-14 rounded-2xl transition-all"
                            onClick={handleGlobalScan}
                        >
                            扫码领用/归还
                        </Button>
                    </Space>
                </div>

                <div className="mt-4 flex-1 overflow-hidden">
                    <Spin
                        spinning={loadingInit}
                        wrapperClassName="h-full w-full"
                        tip="数据处理中..."
                    >
                        <div className="h-full overflow-hidden">
                            {!reagentId ? (
                                <ReagentLogsList
                                    key={`logs-${logsRefreshKey}`}
                                    users={users}
                                />
                            ) : (
                                <ReagentStockList
                                    key={`stock-${reagentId}-${logsRefreshKey}`}
                                    reagents={reagents}
                                    reagentId={reagentId}
                                    setReagentId={setReagentId}
                                    users={users}
                                    setRefreshKey={setLogsRefreshKey}
                                    onAction={(record, type) => {
                                        // Enhance record with reagent info if missing
                                        const r = reagents.find(
                                            (it) =>
                                                String(it.id) ===
                                                String(reagentId),
                                        );
                                        if (r) {
                                            if (!record.reagent_name)
                                                record.reagent_name = r.name;
                                            if (!record.unit)
                                                record.unit = r.unit;
                                        }
                                        setActionModal({
                                            visible: true,
                                            record: { ...record },
                                            type,
                                        });
                                        form.resetFields();
                                        if (type === 2) {
                                            let uid = record.user_id;
                                            if (!uid && record.user_nickname) {
                                                const found = users.find(
                                                    (u) =>
                                                        (u.nickname ||
                                                            u.name) ===
                                                        record.user_nickname,
                                                );
                                                if (found) uid = found.id;
                                            }
                                            if (uid)
                                                form.setFieldsValue({
                                                    user_id: uid,
                                                });
                                        }
                                    }}
                                />
                            )}
                        </div>
                    </Spin>
                </div>
            </Content>

            {/* Global Action Modal (Scan result or list button) */}
            <Modal
                title={null}
                open={actionModal.visible}
                onCancel={() => {
                    setActionModal({ visible: false, record: null, type: 1 });
                    cancelScannerReading();
                }}
                onOk={() => form.submit()}
                destroyOnClose
                forceRender
                width={450}
                centered
                afterOpenChange={(open) => {
                    if (open && !actionModal.record) {
                        scanInputRef.current?.focus();
                    }
                }}
                footer={
                    <div className="flex gap-4 px-2 pb-5">
                        <Button
                            className="flex-1 h-11 rounded-xl"
                            onClick={() => {
                                setActionModal({
                                    visible: false,
                                    record: null,
                                    type: 1,
                                });
                                cancelScannerReading();
                            }}
                        >
                            取消操作
                        </Button>
                        <Button
                            type="primary"
                            disabled={!actionModal.record}
                            className="flex-1 h-11 bg-blue-600 border-none rounded-xl"
                            onClick={() => form.submit()}
                        >
                            确定记录
                        </Button>
                    </div>
                }
            >
                <div className="pt-6">
                    {!actionModal.record ? (
                        <div className="mb-6 p-5 bg-slate-50 border border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-4 text-center">
                            <div className="relative w-16 h-16 flex items-center justify-center mb-2">
                                <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                <ScanOutlined className="text-3xl text-blue-500 animate-pulse" />
                            </div>
                            <div className="font-black text-slate-800 text-xl w-full">
                                <Input
                                    autoFocus
                                    ref={scanInputRef}
                                    size="large"
                                    placeholder="请在此扫码或手动输入批次编码"
                                    prefix={
                                        <BarcodeOutlined className="text-gray-400 mr-2" />
                                    }
                                    className="h-14 rounded-2xl text-center font-mono text-lg shadow-inner"
                                    onPressEnter={(e) =>
                                        fetchReagentDetailByCode(e.target.value)
                                    }
                                />
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                                扫描完成后自动识别，或输入后按回车。
                            </div>
                        </div>
                    ) : (
                        <div className="mb-6 p-5 bg-linear-to-br from-blue-600 to-indigo-700 rounded-3xl shadow-lg relative overflow-hidden">
                            <div className="absolute right-[-20px] top-[-20px] opacity-10">
                                <ScanOutlined
                                    style={{ fontSize: "100px", color: "#fff" }}
                                />
                            </div>
                            <div className="relative z-10 flex flex-col gap-4">
                                <div className="flex justify-between items-start">
                                    <div className="bg-white/20 px-3 py-1 rounded-full text-[10px] text-white/90 tracking-widest uppercase">
                                        批次标识
                                    </div>
                                    <Tag className="m-0 border-none bg-white text-blue-600 font-bold px-3 shadow-md">
                                        {actionModal.type === 1
                                            ? "出库领用"
                                            : "入库归还"}
                                    </Tag>
                                </div>
                                <div>
                                    <div className="text-white/60 text-xs mb-1">
                                        正在操作试剂
                                    </div>
                                    <div className="text-2xl font-black text-white">
                                        {actionModal.record?.reagent_name ||
                                            reagents.find(
                                                (r) =>
                                                    String(r.id) ===
                                                    String(
                                                        actionModal.record
                                                            ?.reagent_id,
                                                    ),
                                            )?.name ||
                                            "未知试剂"}
                                    </div>
                                    <div className="text-xs text-white/40 font-mono mt-1">
                                        {actionModal.record?.lab_code}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleActionSubmit}
                        className={`px-2 transition-opacity duration-300 ${!actionModal.record ? "opacity-40 pointer-events-none" : "opacity-100"}`}
                    >
                        <Form.Item
                            label={
                                <span className="text-sm font-bold text-gray-700">
                                    相关人员
                                </span>
                            }
                            name="user_id"
                            rules={[
                                { required: true, message: "请选择相关人员" },
                            ]}
                        >
                            <Select
                                placeholder="请选择实验人员"
                                showSearch
                                optionFilterProp="label"
                                options={users.map((u) => ({
                                    label: u.name || u.nickname,
                                    value: u.id,
                                }))}
                                className="h-12"
                            />
                        </Form.Item>

                        <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 mb-6 font-bold">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest ">
                                    测量数据
                                </span>
                                <span className="text-sm font-black text-blue-600">
                                    g
                                </span>
                            </div>
                            <div className="w-full">
                                <Space.Compact className="w-full height-aligned-compact">
                                    <Form.Item
                                        name="quantity"
                                        rules={[
                                            {
                                                required: true,
                                                message: "请输入测读数据",
                                            },
                                        ]}
                                        noStyle
                                    >
                                        <Input
                                            className="h-10 text-sm border-r-0 rounded-l-2xl"
                                            placeholder="输入读数"
                                            style={{ width: "100%" }}
                                        />
                                    </Form.Item>
                                    <Button
                                        className="h-10 bg-slate-900 text-white border-slate-900 px-6 rounded-r-2xl font-bold"
                                        icon={<ControlOutlined />}
                                        onClick={async () => {
                                            try {
                                                const res =
                                                    await getScaleReading();
                                                const val = res.data.data;
                                                form.setFieldsValue({
                                                    quantity: val,
                                                });
                                                message.success(
                                                    `数据已采集成功: ${val}`,
                                                );
                                            } catch (err) {
                                                message.error(
                                                    err.message ||
                                                        "读取失败，请检查设备连接",
                                                );
                                            }
                                        }}
                                    >
                                        获取读数
                                    </Button>
                                </Space.Compact>
                            </div>
                            <div className="text-xs text-gray-400 mt-3 italic font-medium">
                                {actionModal.type === 1
                                    ? `※ 当前系统记录的余量为: ${actionModal.record?.quantity || "-"}`
                                    : `※ 归还时手动输入或自动测读实际重量`}
                            </div>
                        </div>

                        <Form.Item
                            label={
                                <span className="text-sm font-bold text-gray-700">
                                    操作备注说明
                                </span>
                            }
                            name="description"
                        >
                            <Input.TextArea
                                rows={3}
                                placeholder="选填，可记录实验用途或异常状态"
                                className="rounded-2xl"
                            />
                        </Form.Item>
                    </Form>
                </div>
            </Modal>

            {/* Reagent Category Manage Modal */}
            <Modal
                title={
                    reagentModal.record?.id ? "编辑试剂定义" : "新增试剂定义"
                }
                open={reagentModal.visible}
                onCancel={() => setReagentModal({ visible: false, record: {} })}
                onOk={() => handleReagentSubmit(reagentModal.record)}
                okText="保存配置"
                cancelText="取消"
                width={500}
                destroyOnHidden
            >
                <div className="pt-4">
                    <ReagentAddEdit
                        record={reagentModal.record}
                        onChange={(newVal) => {
                            setReagentModal((prev) => ({
                                ...prev,
                                record: newVal,
                            }));
                            // This captures the validation function from the child
                            if (newVal.validate) {
                                setReagentFormState({
                                    validate: newVal.validate,
                                });
                            }
                        }}
                    />
                </div>
            </Modal>
        </Layout>
    );
};

export default ReagentStockPage;
