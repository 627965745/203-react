import React, { useState, useMemo, useEffect } from "react";
import {
    Tag,
    Select,
    Space,
    Input,
    Button,
    message,
    Tooltip,
    Popover,
    Badge,
    Table,
} from "antd";
import {
    SearchOutlined,
    ExperimentOutlined,
    PlusSquareOutlined,
    InfoCircleOutlined,
} from "@ant-design/icons";
import CrudTable from "../../components/CrudTable";
import {
    readReferenceMaterial,
    createReferenceMaterial,
    updateReferenceMaterial,
    deleteReferenceMaterial,
} from "../../api/referenceMaterial";
import { comboReferenceMaterialMediumType } from "../../api/referenceMaterialMediumType";
// V5: 浓度/不确定度统一为 0~1 float（最多 8 位小数），列表里用科学计数法展示
import { formatScientific } from "../../utils/scientific";
import AddEdit from "./AddEdit";
// V5: 成分管理已迁至「标准样品」(ReferenceSample) 模块，本页不再有成分 Tab / 弹窗
import PrepareModal from "./PrepareModal";
import UseModal from "./UseModal";

// V5: 本模块收窄为「标准溶液 / 基准试剂」—— category 语义由 0标准物质/1标准溶液/2基准试剂
//     改为 0标准溶液 / 1基准试剂；原 category=0「标准物质」已迁至 ReferenceSample 模块。
const CategoryMap = {
    0: { label: "标准溶液", color: "green" },
    1: { label: "基准试剂", color: "orange" },
};

const StageMap = {
    0: { label: "原液", color: "purple" },
    1: { label: "中间液", color: "cyan" },
    2: { label: "工作液", color: "blue" },
    3: { label: "标准曲线", color: "magenta" },
};

const PhysicalStateMap = {
    0: { label: "固态", color: "default" },
    1: { label: "液态", color: "processing" },
    2: { label: "气态", color: "warning" },
};

const ReferenceMaterialList = () => {
    const [filters, setFilters] = useState({
        category: null,
        stage: null,
        physical_state: null,
        medium_type_id: null,
        query: "",
    });
    const [refreshKey, setRefreshKey] = useState(0);
    const [mediumOptions, setMediumOptions] = useState([]);

    // Modal States
    // V5: componentModalVisible 已移除 —— 成分管理迁至 ReferenceSample
    const [prepareModalVisible, setPrepareModalVisible] = useState(false);
    const [useModalVisible, setUseModalVisible] = useState(false);
    const [activeRecord, setActiveRecord] = useState(null);

    useEffect(() => {
        const fetchMediums = async () => {
            try {
                const res = await comboReferenceMaterialMediumType({});
                if (res.data.status === 0) {
                    setMediumOptions(res.data.data || []);
                }
            } catch (error) {
                console.error(error);
            }
        };
        fetchMediums();
    }, []);

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
            width: 170,
            render: (text, record) => (
                <div className="flex flex-col">
                    <Tooltip title={text} placement="topLeft">
                        <span className="font-semibold text-gray-800 truncate block">
                            {text}
                        </span>
                    </Tooltip>
                    {record.parents?.length > 0 && (
                        <Tooltip
                            title={
                                <div className="py-1">
                                    <div className="font-bold border-b border-white/20 mb-1 pb-1 text-[14px]">
                                        来源构成:
                                    </div>
                                    {record.parents.map((s, idx) => (
                                        <div
                                            key={idx}
                                            className="text-[14px] leading-relaxed"
                                        >
                                            • {s.name}{" "}
                                            <span className="opacity-70">
                                                ({s.used}
                                                {s.unit || "mL"})
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            }
                        >
                            <div className="flex items-start gap-1 mt-0.5 cursor-help">
                                <span className="text-[12px] text-blue-500 hover:text-blue-700 transition-colors">
                                    查看来源
                                </span>
                            </div>
                        </Tooltip>
                    )}
                </div>
            ),
        },
        {
            title: "分类/阶段/形态",
            width: 110,
            align: "center",
            render: (_, record) => (
                <Space orientation="vertical" size={2} className="w-full">
                    <Tag
                        className="m-0 w-full text-center border-none text-[10px]"
                        color={CategoryMap[record.category]?.color}
                    >
                        {CategoryMap[record.category]?.label}
                    </Tag>
                    <Tag
                        className="m-0 w-full text-center border-none text-[10px]"
                        color={StageMap[record.stage]?.color}
                    >
                        {StageMap[record.stage]?.label}
                    </Tag>
                    <Tag
                        className="m-0 w-full text-center border-none text-[10px]"
                        color={PhysicalStateMap[record.physical_state]?.color}
                    >
                        {PhysicalStateMap[record.physical_state]?.label}
                    </Tag>
                </Space>
            ),
        },
        {
            title: "存量/规格/单位/阈值",
            width: 170,
            render: (_, record) => {
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
            // V5: 响应删除 mass_concentration，新增 concentration（浓度%）——
            //     concentration 与 uncertainty 现均为必填
            title: "浓度 / 不确定度",
            width: 140,
            render: (_, record) => (
                <div className="text-xs space-y-0.5">
                    <div className="flex justify-between w-full">
                        <span className="text-gray-400">浓度:</span>
                        {/* V5: 0~1 float，直接显示 0.0000045 很难读，改用 4.5e-6 这种紧凑写法 */}
                        <Tooltip title={record.concentration ?? "-"}>
                            <span className="cursor-help tabular-nums">
                                {formatScientific(record.concentration)}
                            </span>
                        </Tooltip>
                    </div>
                    <div className="flex justify-between w-full">
                        <span className="text-gray-400">不确定度:</span>
                        <Tooltip title={record.uncertainty ?? "-"}>
                            <span className="cursor-help tabular-nums">
                                {formatScientific(record.uncertainty)}
                            </span>
                        </Tooltip>
                    </div>
                </div>
            ),
        },
        {
            title: "介质信息",
            width: 140,
            render: (_, record) => {
                const mediumName =
                    record.medium_type_name ||
                    mediumOptions.find((m) => m.id === record.medium_type_id)
                        ?.name ||
                    "无";
                // V5: 响应删除 medium_concentration —— 本列只剩介质名称
                return (
                    <div className="text-sm">
                        <div className="font-medium text-blue-600 truncate">
                            {mediumName}
                        </div>
                    </div>
                );
            },
        },
        {
            title: "试剂标签编码",
            width: 130,
            render: (_, record) => (
                <div className="text-xs">
                    <div className="text-gray-400 italic">
                        #{record.lab_code || "未编码"}
                    </div>
                    <div className="text-gray-600 font-mono">
                        {record.batch_code || "-"}
                    </div>
                </div>
            ),
        },
        {
            title: "位置/单位",
            width: 150,
            render: (_, record) => (
                <div className="text-xs">
                    <div className="text-indigo-600 font-medium truncate">
                        {record.location || "-"}
                    </div>
                    <div className="text-gray-400 truncate text-[10px]">
                        {record.vendor || "-"}
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
                    <Tooltip title="使用记录">
                        <Button
                            type="link"
                            size="small"
                            icon={<ExperimentOutlined className="w-4 h-4" />}
                            onClick={() => {
                                setActiveRecord(record);
                                setUseModalVisible(true);
                            }}
                        >
                            使用
                        </Button>
                    </Tooltip>
                    {/* V5: 「成分」入口已移除 —— 成分含量表属于标准样品(ReferenceSample)，
                        请到「标准样品管理」页面维护 */}
                </Space>
            ),
        },
    ];

    const renderExpandedRow = (record) => (
        <div className="bg-slate-50 border-y border-slate-100">
            <div className="grid grid-cols-4 gap-6">
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
                        定值日期
                    </div>
                    <div className="text-sm font-medium">
                        {record.confirmed_at || "-"}
                    </div>
                </div>
                <div className="bg-white p-2 rounded shadow-sm border border-slate-200">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                        有效期至
                    </div>
                    <div className="text-sm font-medium text-orange-600">
                        {record.expiring_at || "永久"}
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
            </div>

            {/* V5: read 不再返回 components 数组（成分功能迁至 ReferenceSample），
                展开区只保留调配来源 */}
            {record.sources?.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                    {record.sources?.length > 0 && (
                        <div className="bg-white rounded-lg p-3 border border-slate-200">
                            <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
                                <PlusSquareOutlined className="w-3 h-3 text-blue-500" />{" "}
                                调配来源
                            </div>
                            <Table
                                dataSource={record.sources}
                                pagination={false}
                                size="small"
                                rowKey="material_id"
                                columns={[
                                    { title: "来源物质", dataIndex: "name" },
                                    {
                                        title: "消耗量",
                                        dataIndex: "used",
                                        render: (v) => `${v} ml/g`,
                                    },
                                    {
                                        title: "配制时间",
                                        dataIndex: "created_at",
                                    },
                                ]}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    // V5: 后端已把 concentration / uncertainty 统一成 0~1 float（最多 8 位小数），
    //     前端不再做任何换算，表单里的「尾数 × 数量级」拆分由 ScientificInput 内部完成。
    const api = useMemo(
        () => ({
            read: (params) => readReferenceMaterial({ ...params, ...filters }),
            create: createReferenceMaterial,
            update: updateReferenceMaterial,
            delete: deleteReferenceMaterial,
        }),
        [filters],
    );

    const updateFilter = (field, value) => {
        setFilters((prev) => ({ ...prev, [field]: value }));
    };

    const handleClearFilter = (key) => {
        setFilters((prev) => ({ ...prev, [key]: null }));
    };

    const handleClearAll = () => {
        setFilters({
            category: null,
            stage: null,
            physical_state: null,
            medium_type_id: null,
            query: "",
        });
    };

    const filterConfig = useMemo(
        () => ({
            category: { label: "分类", options: CategoryMap },
            stage: { label: "阶段", options: StageMap },
            physical_state: { label: "形态", options: PhysicalStateMap },
            medium_type_id: {
                label: "介质",
                options: mediumOptions.map((m) => ({
                    label: m.name,
                    value: m.id,
                })),
            },
        }),
        [mediumOptions],
    );

    // Filter changes should trigger reload in CrudTable via key or through params
    useEffect(() => {
        setRefreshKey((prev) => prev + 1);
    }, [filters]);

    // V5: 去掉 mass_concentration / medium_concentration，新增必填 concentration；
    //     lab_code 改为必填，因此加入默认值参与表单归一化
    const initialValues = {
        name: "",
        category: 0,
        stage: 0,
        physical_state: 1,
        medium_type_id: null,
        lab_code: "",
        specification: 0,
        remaining: 0,
        alert_threshold: 0,
        unit: "mL",
        concentration: 0,
        uncertainty: 0,
    };

    const handleRefresh = () => setRefreshKey((prev) => prev + 1);

    return (
        <div className="h-full">
            <CrudTable
                refreshKey={refreshKey}
                title="标准物质管理"
                entityName="标准物质"
                columns={columns}
                api={api}
                AddEditForm={AddEdit}
                initialValues={initialValues}
                modalWidth={870}
                scroll={{ x: 1420 }}
                renderExpandedRow={renderExpandedRow}
                filterValues={filters}
                filterConfig={filterConfig}
                onClearFilter={handleClearFilter}
                onClearAll={handleClearAll}
                actionExtra={
                    <div className="flex items-center gap-4">
                        <Button
                            type="primary"
                            icon={
                                <ExperimentOutlined className="w-4 h-4 mr-1" />
                            }
                            className="bg-emerald-600 hover:bg-emerald-700 border-none px-4"
                            onClick={() => setPrepareModalVisible(true)}
                        >
                            调配录入
                        </Button>
                        <Space
                            wrap
                            className="bg-gray-50/80 p-1 px-2 rounded-md border border-gray-100"
                        >
                            {/* <Select
                                style={{ width: 140 }}
                                placeholder="介质过滤"
                                allowClear
                                showSearch
                                optionFilterProp="label"
                                value={filters.medium_type_id}
                                onChange={(val) =>
                                    updateFilter("medium_type_id", val)
                                }
                                options={mediumOptions.map((m) => ({
                                    label: m.name,
                                    value: m.id,
                                }))}
                            />
                            <Select
                                style={{ width: 110 }}
                                placeholder="形态"
                                allowClear
                                value={filters.physical_state}
                                onChange={(val) =>
                                    updateFilter("physical_state", val)
                                }
                                options={Object.entries(PhysicalStateMap).map(
                                    ([k, v]) => ({
                                        label: v.label,
                                        value: Number(k),
                                    }),
                                )}
                            />
                            <Select
                                style={{ width: 110 }}
                                placeholder="分类"
                                allowClear
                                value={filters.category}
                                onChange={(val) =>
                                    updateFilter("category", val)
                                }
                                options={Object.entries(CategoryMap).map(
                                    ([k, v]) => ({
                                        label: v.label,
                                        value: Number(k),
                                    }),
                                )}
                            />
                            <Select
                                style={{ width: 110 }}
                                placeholder="阶段"
                                allowClear
                                value={filters.stage}
                                onChange={(val) => updateFilter("stage", val)}
                                options={Object.entries(StageMap).map(
                                    ([k, v]) => ({
                                        label: v.label,
                                        value: Number(k),
                                    }),
                                )}
                            /> */}
                        </Space>
                    </div>
                }
            />

            <PrepareModal
                visible={prepareModalVisible}
                onCancel={() => setPrepareModalVisible(false)}
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

export default ReferenceMaterialList;
