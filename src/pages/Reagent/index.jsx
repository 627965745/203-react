import React, { useState, useMemo } from "react";
import { Tag, Select, Space } from "antd";
import CrudTable from "../../components/CrudTable";
import { readReagent, createReagent, updateReagent, deleteReagent } from "../../api/reagent";
import AddEdit from './AddEdit';

const ReagentCategoryMap = {
    0: { label: "易制毒", color: "purple" },
    1: { label: "易制爆", color: "red" },
    2: { label: "一般试剂", color: "blue" },
};

const ReagentList = () => {
    const [categoryFilter, setCategoryFilter] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const columns = [
        {
            title: "序号",
            dataIndex: "id",
            width: 70,
            align: "center",
            render: (id) => <span className="text-gray-400 font-mono">{id}</span>
        },
        {
            title: "试剂名称",
            dataIndex: "name",
            ellipsis: true,
            render: (text) => <span className="font-bold text-blue-600">{text}</span>
        },
        {
            title: "类别",
            dataIndex: "category",
            width: 100,
            render: (val) => {
                const cfg = ReagentCategoryMap[val] || { label: "未知", color: "default" };
                return <Tag color={cfg.color} className="m-0 border-none">{cfg.label}</Tag>;
            }
        },
        {
            title: "单位",
            dataIndex: "unit",
            width: 80,
            align: "center"
        },
        {
            title: "报警阈值",
            dataIndex: "alert_threshold",
            width: 100,
            align: "right",
            render: (val) => <span className="text-orange-500 font-medium">{val}</span>
        },
        {
            title: "创建时间",
            dataIndex: "created_at",
            width: 140,
            align: "center",
            render: (text) => <span className="text-xs text-gray-400">{text}</span>
        },
        {
            title: "更新时间",
            dataIndex: "updated_at",
            width: 140,
            align: "center",
            render: (text) => <span className="text-xs text-gray-400">{text}</span>
        }
    ];

    // Wrap the API to inject the category filter
    const api = useMemo(() => ({
        read: (params) => readReagent({ ...params, category: categoryFilter }),
        create: createReagent,
        update: updateReagent,
        delete: deleteReagent
    }), [categoryFilter]);

    const handleCategoryChange = (val) => {
        setCategoryFilter(val === "" || val === undefined ? null : val);
        setRefreshKey(prev => prev + 1); // Force re-fetch when filter changes
    };

    const filterConfig = {
        category: { label: "分类", options: ReagentCategoryMap }
    };

    const initialValues = {
        name: "",
        category: 2, // Default to general
        unit: "",
        alert_threshold: 10,
        sticker_file: "",
        description: ""
    };

    return (
        <CrudTable
            refreshKey={refreshKey}
            title="试剂管理"
            entityName="试剂"
            columns={columns}
            api={api}
            AddEditForm={AddEdit}
            initialValues={initialValues}
            modalWidth={700}
            filterValues={{ category: categoryFilter }}
            filterConfig={filterConfig}
            onClearFilter={() => handleCategoryChange(null)}
            onClearAll={() => handleCategoryChange(null)}
            actionExtra={
                <Select
                    style={{ width: 150 }}
                    placeholder="分类筛选"
                    allowClear
                    value={categoryFilter}
                    onChange={handleCategoryChange}
                    options={[
                        { label: "所有类型", value: "" },
                        { label: "易制毒", value: 0 },
                        { label: "易制爆", value: 1 },
                        { label: "一般试剂", value: 2 },
                    ]}
                />
            }
            renderExpandedRow={(record) => (
                <div className="p-2 bg-gray-50rounded grid grid-cols-2 gap-8">
                     <div>
                        <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">安全合规警示贴文件路径</div>
                        <code className="text-xs bg-gray-100 p-1 rounded block">{record.sticker_file || '未配置'}</code>
                     </div>
                     <div>
                        <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">描述详情</div>
                        <div className="text-xs whitespace-pre-wrap">{record.description || '暂无详细描述'}</div>
                     </div>
                </div>
            )}
        />
    );
};

export default ReagentList;
