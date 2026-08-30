import React, { useState, useMemo, useEffect } from "react";
import { Tag, Select, Space, Button, Tooltip, Badge, Table } from "antd";
import {
    ExperimentOutlined,
    SettingOutlined,
    PlusSquareOutlined,
} from "@ant-design/icons";
import CrudTable from "../../components/CrudTable";
import {
    readReferenceSample,
    createReferenceSample,
    updateReferenceSample,
    deleteReferenceSample,
} from "../../api/referenceSample";
import AddEdit from "./AddEdit";
import ComponentModal from "./ComponentModal";
import UseModal from "./UseModal";
// V5: 成分表的 含量/不确定度 统一为 0~1 float，列表用科学计数法展示
import { formatScientific } from "../../utils/scientific";

// V5: 全新页面「标准样品」—— 对应新模块 ReagentAdmin/ReferenceSample。
//     管理外购定值的标准物质（带成分含量表），无 category / stage / 介质概念。
//     实验室自行配制的标准溶液、基准试剂仍在「标准溶液/基准试剂」页面（ReferenceMaterial）。
const PhysicalStateMap = {
    0: { label: "固态", color: "default" },
    1: { label: "液态", color: "processing" },
    2: { label: "气态", color: "warning" },
};

const ReferenceSampleList = () => {
    // V5: read 请求为 { query, physical_state, page, rows }，physical_state 为空表示不过滤
    const [filters, setFilters] = useState({ physical_state: null });
    const [refreshKey, setRefreshKey] = useState(0);

    const [componentModalVisible, setComponentModalVisible] = useState(false);
    const [useModalVisible, setUseModalVisible] = useState(false);
    const [activeRecord, setActiveRecord] = useState(null);
    const [rows, setRows] = useState([]);

    // 弹窗打开期间列表可能被刷新，activeRecord 需要跟随最新数据（成分表尤其明显）
    useEffect(() => {
        if (!activeRecord) return;
        const fresh = rows.find((r) => r.id === activeRecord.id);
        if (fresh && fresh !== activeRecord) setActiveRecord(fresh);
    }, [rows]);

    const columns = [
        {
            title: "序号",
            dataIndex: "id",
            width: 60,
            align: "center",
        },
        {
            title: "名称",
            dataIndex: "name",
            width: 200,
            render: (text) => (
                <Tooltip title={text} placement="topLeft">
                    <span className="font-semibold text-gray-800 truncate block">
                        {text}
                    </span>
                </Tooltip>
            ),
        },
        {
            title: "形态",
            dataIndex: "physical_state",
            width: 80,
            align: "center",
            render: (val) => (
                <Tag
                    className="m-0 border-none"
                    color={PhysicalStateMap[val]?.color}
                >
                    {PhysicalStateMap[val]?.label || "-"}
                </Tag>
            ),
        },
        {
            // V5: lab_code 必填且全库唯一
            title: "内部编码 / 样品编码",
            width: 160,
            render: (_, record) => (
                <div className="text-xs">
                    <div className="text-slate-700 font-mono font-bold">
                        {record.lab_code || "-"}
                    </div>
                    <div className="text-gray-400 font-mono">
                        {record.sample_code || "-"}
                    </div>
                </div>
            ),
        },
        {
            title: "批号",
            dataIndex: "batch_code",
            width: 110,
            render: (v) => (
                <span className="text-xs font-mono text-gray-600">
                    {v || "-"}
                </span>
            ),
        },
        {
            title: "余量/规格/单位/阈值",
            width: 180,
            render: (_, record) => {
                // V5: DECIMAL 字段以字符串形式返回，比较前统一 Number()
                const rem = Number(record.remaining) || 0;
                const limit = Number(record.alert_threshold) || 0;
                const isLow = rem <= limit;
                return (
                    <div className="flex flex-col">
                        <span
                            className={
                                isLow
                                    ? "text-red-500 font-bold text-sm"
                                    : "text-gray-900 text-sm"
                            }
                        >
                            {record.remaining} / {record.specification}{" "}
                            <span className="text-[11px] text-gray-400 font-normal">
                                {record.unit}
                            </span>
                        </span>
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-400">
                                门限: {record.alert_threshold} {record.unit}
                            </span>
                            {isLow && (
                                <Badge
                                    status="error"
                                    text={
                                        <span className="text-[10px] text-red-500">
                                            库存低
                                        </span>
                                    }
                                />
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            title: "成分",
            dataIndex: "components",
            width: 200,
            render: (components) => {
                if (!components?.length) {
                    return (
                        <span className="text-[11px] text-slate-300 italic">
                            未录入成分
                        </span>
                    );
                }
                return (
                    <div className="flex flex-wrap gap-1">
                        {components.slice(0, 4).map((c) => (
                            <Tooltip
                                key={c.component}
                                // V5: 含量/不确定度为 0~1 float，用科学计数法更好读
                                title={`${formatScientific(c.concentration)} ${c.unit} ± ${formatScientific(c.uncertainty)}`}
                            >
                                <Tag
                                    color="purple"
                                    bordered={false}
                                    className="m-0 text-[10px] font-bold"
                                >
                                    {c.component}
                                </Tag>
                            </Tooltip>
                        ))}
                        {components.length > 4 && (
                            <span className="text-[10px] text-slate-400">
                                +{components.length - 4}
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            title: "研制单位 / 存放地点",
            width: 160,
            render: (_, record) => (
                <div className="text-xs">
                    <div className="text-gray-600 truncate">
                        {record.vendor || "-"}
                    </div>
                    <div className="text-indigo-600 font-medium truncate">
                        {record.location || "-"}
                    </div>
                </div>
            ),
        },
        {
            title: "定值 / 有效期",
            width: 130,
            render: (_, record) => (
                <div className="text-xs">
                    <div className="text-gray-500">
                        {record.confirmed_at || "-"}
                    </div>
                    <div className="text-orange-600 font-medium">
                        {record.expiring_at || "永久"}
                    </div>
                </div>
            ),
        },
        {
            title: "特殊操作",
            width: 150,
            fixed: "right",
            align: "center",
            render: (_, record) => (
                <Space size={0}>
                    <Tooltip title="领用扣减余量">
                        <Button
                            type="link"
                            size="small"
                            icon={<ExperimentOutlined className="w-4 h-4" />}
                            onClick={() => {
                                setActiveRecord(record);
                                setUseModalVisible(true);
                            }}
                        >
                            领用
                        </Button>
                    </Tooltip>
                    {/* V5: 成分含量表由 ReferenceMaterial 迁移到本模块 */}
                    <Tooltip title="成分含量表">
                        <Button
                            type="link"
                            size="small"
                            className="text-orange-500"
                            icon={<SettingOutlined className="w-4 h-4" />}
                            onClick={() => {
                                setActiveRecord(record);
                                setComponentModalVisible(true);
                            }}
                        >
                            成分
                        </Button>
                    </Tooltip>
                </Space>
            ),
        },
    ];

    const renderExpandedRow = (record) => (
        <div className="bg-slate-50 border-y border-slate-100 p-3">
            <div className="grid grid-cols-4 gap-4 mb-3">
                <div className="bg-white p-2 rounded shadow-sm border border-slate-200">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                        样品编码
                    </div>
                    <div className="text-sm font-medium">
                        {record.sample_code || "-"}
                    </div>
                </div>
                <div className="bg-white p-2 rounded shadow-sm border border-slate-200">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                        批号
                    </div>
                    <div className="text-sm font-medium">
                        {record.batch_code || "-"}
                    </div>
                </div>
                <div className="bg-white p-2 rounded shadow-sm border border-slate-200">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                        录入时间
                    </div>
                    <div className="text-xs text-gray-500">
                        {record.created_at || "-"}
                    </div>
                </div>
                <div className="bg-white p-2 rounded shadow-sm border border-slate-200">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                        更新时间
                    </div>
                    <div className="text-xs text-gray-500">
                        {record.updated_at || "-"}
                    </div>
                </div>
            </div>

            {record.components?.length > 0 && (
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
                        <PlusSquareOutlined className="w-3 h-3 text-emerald-500" />{" "}
                        成分含量表
                    </div>
                    <Table
                        dataSource={record.components}
                        pagination={false}
                        size="small"
                        rowKey="component"
                        columns={[
                            { title: "成分", dataIndex: "component" },
                            {
                                // V5: value → concentration，且统一为 0~1 float
                                title: "含量",
                                dataIndex: "concentration",
                                render: (v, r) => (
                                    <Tooltip title={v ?? "-"}>
                                        <span className="cursor-help tabular-nums">
                                            {formatScientific(v)} {r.unit}
                                        </span>
                                    </Tooltip>
                                ),
                            },
                            {
                                title: "不确定度",
                                dataIndex: "uncertainty",
                                render: (v) => (
                                    <Tooltip title={v ?? "-"}>
                                        <span className="cursor-help tabular-nums">
                                            {formatScientific(v)}
                                        </span>
                                    </Tooltip>
                                ),
                            },
                        ]}
                    />
                </div>
            )}
        </div>
    );

    // V5: 后端已把成分表的 concentration / uncertainty 统一成 0~1 float（最多 8 位小数），
    //     前端不再做换算，「尾数 × 数量级」的拆分由 ScientificInput 在录入时完成。
    const api = useMemo(
        () => ({
            read: (params) => readReferenceSample({ ...params, ...filters }),
            create: createReferenceSample,
            update: updateReferenceSample,
            delete: deleteReferenceSample,
        }),
        [filters],
    );

    const filterConfig = useMemo(
        () => ({ physical_state: { label: "形态", options: PhysicalStateMap } }),
        [],
    );

    // V5: 创建时后端自动令 remaining = specification，因此 initialValues 里不放 remaining
    const initialValues = {
        name: "",
        physical_state: 0,
        lab_code: "",
        sample_code: "",
        batch_code: "",
        vendor: "",
        location: "",
        unit: "g",
        specification: 0,
        alert_threshold: 0,
        confirmed_at: null,
        expiring_at: null,
    };

    const handleRefresh = () => setRefreshKey((prev) => prev + 1);

    return (
        <div className="h-full">
            <CrudTable
                refreshKey={refreshKey}
                title="标准样品管理"
                entityName="标准样品"
                columns={columns}
                api={api}
                AddEditForm={AddEdit}
                initialValues={initialValues}
                modalWidth={870}
                scroll={{ x: 1500 }}
                renderExpandedRow={renderExpandedRow}
                filterValues={filters}
                filterConfig={filterConfig}
                onClearFilter={(key) =>
                    setFilters((prev) => ({ ...prev, [key]: null }))
                }
                onClearAll={() => setFilters({ physical_state: null })}
                onDataLoaded={setRows}
                searchPlaceholder="搜索名称/内部编码/样品编码/批号/研制单位/存放地点"
                actionExtra={
                    <Space
                        wrap
                        className="bg-gray-50/80 p-1 px-2 rounded-md border border-gray-100"
                    >
                        <Select
                            style={{ width: 120 }}
                            placeholder="形态"
                            allowClear
                            value={filters.physical_state}
                            onChange={(val) =>
                                setFilters((prev) => ({
                                    ...prev,
                                    physical_state: val ?? null,
                                }))
                            }
                            options={Object.entries(PhysicalStateMap).map(
                                ([k, v]) => ({
                                    label: v.label,
                                    value: Number(k),
                                }),
                            )}
                        />
                    </Space>
                }
            />

            <ComponentModal
                visible={componentModalVisible}
                onCancel={() => setComponentModalVisible(false)}
                record={activeRecord}
                onSuccess={handleRefresh}
            />

            <UseModal
                visible={useModalVisible}
                onCancel={() => setUseModalVisible(false)}
                record={activeRecord}
                onSuccess={handleRefresh}
            />
        </div>
    );
};

export default ReferenceSampleList;
