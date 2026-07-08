import { useState, useEffect } from "react";
import { Tag, Spin } from "antd";
import { logsReagentStock } from "../../api/reagentStock";

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
        <div className="p-4 bg-gray-50 mt-[-16px]">
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

export default StockLogs;
