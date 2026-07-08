import { useState, useMemo } from "react";
import { Select, Space, Tag } from "antd";
import CrudTable from "../../components/CrudTable";
import { logsReagentStock } from "../../api/reagentStock";

const LogTypeMap = {
    0: { label: "入库", color: "blue" },
    1: { label: "领用", color: "orange" },
    2: { label: "归还", color: "green" },
    3: { label: "用完", color: "red" },
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

export default ReagentLogsList;
