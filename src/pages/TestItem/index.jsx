import React, { useState, useEffect, useMemo } from "react";
import CrudTable from "../../components/CrudTable";
import { readTestItem, createTestItem, updateTestItem, deleteTestItem } from "../../api/testItem";
import { comboTestCategory } from "../../api/testCategory";
import AddEdit from './AddEdit';
import ArrangeModal from './ArrangeModal';
import { TagOutlined, FilterOutlined, LinkOutlined } from "@ant-design/icons";
import { Select, Space, Empty, Spin, Button, Tag } from "antd";

const TestItemList = () => {
    const [categories, setCategories] = useState([]);
    const [categoryId, setCategoryId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    const [arrangeVisible, setArrangeVisible] = useState(false);
    const [arrangeRecord, setArrangeRecord] = useState(null);

    const handleManageMethods = (record) => {
        setArrangeRecord(record);
        setArrangeVisible(true);
    };

    useEffect(() => {
        const fetchCategories = async () => {
            setLoading(true);
            try {
                const res = await comboTestCategory();
                if (res.data.status === 0 || res.data.code === 0) {
                    const data = res.data.data || [];
                    setCategories(data);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchCategories();
    }, []);

    const api = useMemo(() => ({
        read: (params) => {
            const query = { ...params };
            if (categoryId) query.category_id = categoryId;
            return readTestItem(query);
        },
        create: createTestItem,
        update: updateTestItem,
        delete: deleteTestItem
    }), [categoryId]);

    const handleCategoryChange = (val) => {
        setCategoryId(val);
        setRefreshKey(prev => prev + 1);
    };

    const columns = useMemo(() => [
        {
            title: "序号",
            dataIndex: "id",
            width: "8%",
            align: "center",
        },
        {
            title: "检测项目名称",
            dataIndex: "name",
            width: "25%",
            render: (text) => (
                <div className="flex items-center gap-2">
                    <TagOutlined className="text-blue-500" />
                    <span className="font-bold text-blue-600">{text}</span>
                </div>
            )
        },
        {
            title: "检测类别",
            dataIndex: "category_name",
            width: "20%",
            render: (text) => (
                <div className="flex items-center gap-2">
                    <FilterOutlined className="text-gray-400" />
                    <span className="text-gray-600">{text}</span>
                </div>
            )
        },
        {
            title: "已关联方法",
            dataIndex: "methods",
            width: "35%",
            render: (methods) => (
                <div className="flex flex-wrap gap-1">
                    {methods?.map(m => (
                        <Tag color="cyan" key={m.id} className="m-0 text-[11px] leading-[18px]">
                            {m.name}
                        </Tag>
                    ))}
                    {(!methods || methods.length === 0) && <span className="text-gray-300 italic text-[11px]">暂无关联</span>}
                </div>
            )
        }
    ], []);

    const initialValues = useMemo(() => ({
        category_id: categoryId,
        name: ""
    }), [categoryId]);

    return (
        <>
        <CrudTable
            key={refreshKey}
            title="检测项目管理"
            entityName="检测项目"
            columns={columns}
            api={api}
            AddEditForm={AddEdit}
            initialValues={initialValues}
            modalWidth={500}
            filterValues={{ category_id: categoryId }}
            filterConfig={{ category_id: { label: "类别", options: categories.map(c => ({ label: c.name, value: c.id })) } }}
            onClearFilter={() => handleCategoryChange(null)}
            onClearAll={() => handleCategoryChange(null)}
            actionExtra={
                <Space>
                    <span className="text-gray-500 text-sm">筛选类别:</span>
                    <Select
                        loading={loading}
                        style={{ width: 200 }}
                        placeholder="请选择检测类别"
                        value={categoryId}
                        onChange={handleCategoryChange}
                        options={categories.map(c => ({ label: c.name, value: c.id }))}
                    />
                </Space>
            }
            renderActions={(record) => (
                <Button 
                    type="link" 
                    size="small" 
                    onClick={() => handleManageMethods(record)}
                    icon={<LinkOutlined className="text-indigo-500" />}
                >
                    关联方法
                </Button>
            )}
        />
        <ArrangeModal
            visible={arrangeVisible}
            onClose={() => setArrangeVisible(false)}
            record={arrangeRecord}
            onSuccess={() => setRefreshKey(prev => prev + 1)}
        />
        </>
    );
};

export default TestItemList;
