import React, { useState, useMemo } from "react";
import { Tag, Select, Space, Input } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import CrudTable from "../../components/CrudTable";
import { readReferenceMaterial, createReferenceMaterial, updateReferenceMaterial, deleteReferenceMaterial } from "../../api/referenceMaterial";
import AddEdit from './AddEdit';

const CategoryMap = {
    0: { label: "标准物质", color: "blue" },
    1: { label: "标准溶液", color: "green" },
    2: { label: "基准试剂", color: "orange" },
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
        medium_type: null,
        query: ''
    });
    const [refreshKey, setRefreshKey] = useState(0);

    const columns = [
        {
            title: "序号",
            dataIndex: "id",
            width: "3%",
            align: "center",
        },
        {
            title: "名称",
            dataIndex: "name",
            width: "8%",
            ellipsis: true,
            render: (text) => <span className="font-medium">{text}</span>
        },
        {
            title: "分类/阶段/形态",
            width: "10%",
            align: "center",
            render: (_, record) => (
                <Space orientation="vertical" size={2} className="w-full py-1">
                    <Tag className="m-0 w-auto text-center border-none text-[10px]" color={CategoryMap[record.category]?.color}>{CategoryMap[record.category]?.label}</Tag>
                    <Tag className="m-0 w-auto text-center border-none text-[10px]" color={StageMap[record.stage]?.color}>{StageMap[record.stage]?.label}</Tag>
                    <Tag className="m-0 w-auto text-center border-none text-[10px]" color={PhysicalStateMap[record.physical_state]?.color}>{PhysicalStateMap[record.physical_state]?.label}</Tag>
                </Space>
            )
        },
        {
            title: "实验室编码",
            dataIndex: "lab_code",
            width: "8%",
        },
        {
            title: "存量/规格/阈值",
            width: "9%",
            render: (_, record) => {
                const rem = Number(record.remaining) || 0;
                const limit = Number(record.alert_threshold) || 0;
                const isLow = rem <= limit;
                return (
                    <div className="flex flex-col">
                        <span className={isLow ? "text-red-500 font-bold text-xs" : "text-gray-900 text-xs"}>
                            {record.remaining}/{record.quantity}
                        </span>
                        <span className="text-[10px] text-gray-400">阈: {record.alert_threshold}</span>
                        {isLow && <span className="text-[10px] text-red-500 font-medium">● 紧张</span>}
                    </div>
                );
            }
        },
        {
            title: "不确定度 / 质量浓度",
            width: "10%",
            render: (_, record) => (
                <div className="text-xs">
                    <div>U: {record.uncertainty}%</div>
                    <div>C: {record.mass_concentration}%</div>
                </div>
            )
        },
        {
            title: "介质类型/浓度",
            width: "10%",
            render: (_, record) => (
                <div className="text-xs">
                    <div>T-{record.medium_type}</div>
                    <div>{record.medium_concentration}%</div>
                </div>
            )
        },
        {
            title: "批号/样品码",
            width: "10%",
            render: (_, record) => (
                <div className="text-xs truncate">
                    <div>{record.batch_code || "-"}</div>
                    <div>{record.sample_code || "-"}</div>
                </div>
            )
        },
        {
            title: "存放地点/研制单位",
            width: "12%",
            render: (_, record) => (
                <div className="text-xs">
                    <div className="text-blue-600 truncate">{record.location || "-"}</div>
                    <div className="text-gray-400 truncate">{record.vendor || "-"}</div>
                </div>
            )
        },
        {
            title: "有效期至",
            dataIndex: "expiring_at",
            width: "7%",
            render: (val) => <span className="text-xs">{val || "永久"}</span>
        }
    ];

    const api = useMemo(() => ({
        read: (params) => readReferenceMaterial({ ...params, ...filters }),
        create: createReferenceMaterial,
        update: updateReferenceMaterial,
        delete: deleteReferenceMaterial
    }), [filters]);

    const updateFilter = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setRefreshKey(prev => prev + 1);
    };

    const initialValues = {
        name: "",
        category: 0,
        stage: 0,
        physical_state: 1,
        medium_type: 0,
        quantity: 0,
        remaining: 0,
        alert_threshold: 0,
        uncertainty: 0,
        mass_concentration: 0,
        medium_concentration: 0,
    };

    return (
        <CrudTable
            key={refreshKey}
            title="标准物质管理"
            entityName="标准物质"
            columns={columns}
            api={api}
            AddEditForm={AddEdit}
            initialValues={initialValues}
            modalWidth={870}
            actionExtra={
                <Space wrap>
                    <Select
                        style={{ width: 150 }}
                        placeholder="形态筛选"
                        allowClear
                        onChange={(val) => updateFilter("physical_state", val)}
                        options={Object.entries(PhysicalStateMap).map(([k, v]) => ({ label: v.label, value: Number(k) }))}
                    />
                    <Select
                        style={{ width: 130 }}
                        placeholder="分类筛选"
                        allowClear
                        onChange={(val) => updateFilter("category", val)}
                        options={Object.entries(CategoryMap).map(([k, v]) => ({ label: v.label, value: Number(k) }))}
                    />
                    <Select
                        style={{ width: 130 }}
                        placeholder="阶段筛选"
                        allowClear
                        onChange={(val) => updateFilter("stage", val)}
                        options={Object.entries(StageMap).map(([k, v]) => ({ label: v.label, value: Number(k) }))}
                    />
                </Space>
            }
        />
    );
};

export default ReferenceMaterialList;
