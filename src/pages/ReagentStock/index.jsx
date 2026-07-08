import { useState, useEffect, useRef } from "react";
import { Button, Space, Tag, message, Spin, Layout, Form } from "antd";
import {
    PlusOutlined,
    HistoryOutlined,
    InboxOutlined,
    SettingOutlined,
    ScanOutlined,
    LeftOutlined,
    RightOutlined,
} from "@ant-design/icons";
import { actionReagentStock, detailReagentStock } from "../../api/reagentStock";
import { readReagent, createReagent, updateReagent } from "../../api/reagent";
import { comboUser } from "../../api/user";
import { cancelScannerReading } from "../../api/externalDevice";
import ReagentStockList from "./ReagentStockList";
import ReagentLogsList from "./ReagentLogsList";
import ActionModal from "./ActionModal";
import ReagentCategoryModal from "./ReagentCategoryModal";

const { Sider, Content } = Layout;

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
                    height: 32px !important;
                    flex-shrink: 0;
                }
            `}</style>
            <Sider
                width={250}
                theme="light"
                className="border-r border-gray-100 h-full flex flex-col"
            >
                <div className="p-4 flex flex-col h-full bg-white">
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-50 flex-shrink-0">
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

                    <div className="text-sm text-gray-400 font-bold mb-2 px-1 uppercase tracking-widest flex-shrink-0">
                        全部分类
                    </div>

                    <Spin
                        spinning={loadingInit && reagents.length === 0}
                        wrapperClassName="flex-1 flex flex-col overflow-hidden"
                        description="加载试剂..."
                    >
                        <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                            {reagents.map((item) => (
                                <div
                                    key={item.id}
                                    className={`p-3 mb-2 rounded-xl cursor-pointer transition-all flex justify-between items-start group reagent-list-item ${reagentId === item.id ? "active font-bold shadow-md" : "text-gray-600"}`}
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
                                                <div className="mt-1 border-t pt-1 border-gray-200 truncate text-gray-400 italic text-xs">
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

                        <div className="flex justify-center items-center gap-4 py-2 border-t border-slate-100 flex-shrink-0 mt-1">
                            <Button
                                type="text"
                                icon={<LeftOutlined />}
                                disabled={reagentPage === 0}
                                onClick={() => setReagentPage((prev) => prev - 1)}
                            />
                            <span className="text-sm text-slate-600">
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

                            className={`h-16 px-10 rounded-2xl font-bold ${!reagentId ? "bg-blue-50 text-blue-600 border-blue-200" : "text-gray-500 border-gray-200"}`}
                            onClick={() => setReagentId(null)}
                        >
                            全局试剂日志
                        </Button>
                        <Button
                            type="primary"

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
                        description="数据处理中..."
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
            <ActionModal
                actionModal={actionModal}
                onCancel={() => {
                    setActionModal({ visible: false, record: null, type: 1 });
                    cancelScannerReading();
                }}
                form={form}
                scanInputRef={scanInputRef}
                users={users}
                reagents={reagents}
                onSubmit={handleActionSubmit}
                onScanCode={fetchReagentDetailByCode}
            />

            {/* Reagent Category Manage Modal */}
            <ReagentCategoryModal
                reagentModal={reagentModal}
                onCancel={() =>
                    setReagentModal({ visible: false, record: {} })
                }
                onSubmit={() => handleReagentSubmit(reagentModal.record)}
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
        </Layout>
    );
};

export default ReagentStockPage;
