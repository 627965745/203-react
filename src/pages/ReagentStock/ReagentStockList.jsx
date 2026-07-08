import { useState, useMemo } from "react";
import { Tag, Button, Space, Form, message, Empty } from "antd";
import {
    PrinterOutlined,
    RetweetOutlined,
    CheckCircleOutlined,
    SyncOutlined,
    StopOutlined,
} from "@ant-design/icons";
import CrudTable from "../../components/CrudTable";
import {
    readReagentStock,
    createReagentStock,
    updateReagentStock,
    deleteReagentStock,
} from "../../api/reagentStock";
import { sendPrintJob } from "../../api/externalDevice";
import AddEdit from "./AddEdit";
import StockLogs from "./StockLogs";

const StatusMap = {
    0: { label: "在库", color: "blue", icon: <CheckCircleOutlined /> },
    1: { label: "领用中", color: "orange", icon: <SyncOutlined spin /> },
    2: { label: "已归还", color: "green", icon: <CheckCircleOutlined /> },
    3: { label: "已用完", color: "red", icon: <StopOutlined /> },
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
            width: 100,
            render: (text) => (
                <span className="text-gray-500 font-mono text-xs">{text}</span>
            ),
        },
        {
            title: "状态",
            dataIndex: "status",
            width: 50,
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
            width: 100,
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
            width: 50,
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
            width: 60,
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
            width: 80,
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
                scroll={{ y: "calc(100vh - 350px)", x: 1000 }}
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

export default ReagentStockList;
