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
            width: "8%",
            align: "center",
        },
        {
            title: "试剂名称",
            dataIndex: "name",
            width: "25%",
            render: (text) => <span className="font-bold">{text}</span>
        },
        {
            title: "类别",
            dataIndex: "category",
            width: "15%",
            render: (val) => {
                const cfg = ReagentCategoryMap[val] || { label: "未知", color: "default" };
                return <Tag color={cfg.color}>{cfg.label}</Tag>;
            }
        },
        {
            title: "单位",
            dataIndex: "unit",
            width: "10%",
            align: "center"
        },
        {
            title: "报警阈值",
            dataIndex: "alert_threshold",
            width: "12%",
            align: "right",
            render: (val) => <span className="text-orange-500 font-medium">{val}</span>
        },
        {
           title: "详细说明",
           dataIndex: "description",
           width: "30%",
           ellipsis: true,
           render: (text) => <span className="text-gray-400 text-xs">{text || "无描述"}</span>
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
        setCategoryFilter(val);
        setRefreshKey(prev => prev + 1); // Force re-fetch when filter changes
    };

    const initialValues = {
        name: "",
        category: 2, // Default to general
        unit: "",
        alert_threshold: 10,
        safety_sticker: "",
        description: ""
    };

    return (
        <CrudTable
            key={refreshKey}
            title="试剂管理"
            entityName="试剂"
            columns={columns}
            api={api}
            AddEditForm={AddEdit}
            initialValues={initialValues}
            modalWidth={700}
            actionExtra={
                <Select
                    style={{ width: 150 }}
                    placeholder="分类筛选"
                    allowClear
                    onChange={handleCategoryChange}
                    options={[
                        { label: "所有类型", value: null },
                        { label: "易制毒", value: 0 },
                        { label: "易制爆", value: 1 },
                        { label: "一般试剂", value: 2 },
                    ]}
                />
            }
            renderExpandedRow={(record) => (
                <div className="p-4 bg-gray-50 border border-dashed border-gray-200 rounded grid grid-cols-2 gap-8">
                     <div>
                        <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">安全警示贴路径</div>
                        <code className="text-xs bg-gray-100 p-1 rounded block">{record.safety_sticker || '未配置'}</code>
                     </div>
                     <div>
                        <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">描述详情</div>
                        <div className="text-sm whitespace-pre-wrap">{record.description || '暂无详细描述'}</div>
                     </div>
                </div>
            )}
        />
    );
};

export default ReagentList;
