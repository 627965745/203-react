import React, { useState, useEffect, useMemo } from "react";
import CrudTable from "../../components/CrudTable";
import { readTestItem, createTestItem, updateTestItem, deleteTestItem } from "../../api/testItem";
import { comboTestCategory } from "../../api/testCategory";
import AddEdit from './AddEdit';
import { TagOutlined, FilterOutlined } from "@ant-design/icons";
import { Select, Space, Empty, Spin } from "antd";

const TestItemList = () => {
    const [categories, setCategories] = useState([]);
    const [categoryId, setCategoryId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const fetchCategories = async () => {
            setLoading(true);
            try {
                const res = await comboTestCategory();
                if (res.data.status === 0 || res.data.code === 0) {
                    const data = res.data.data || [];
                    setCategories(data);
                    if (data.length > 0 && !categoryId) {
                        setCategoryId(data[0].id);
                    }
                }
            } finally {
                setLoading(false);
            }
        };
        fetchCategories();
    }, []);

    const api = useMemo(() => ({
        read: (params) => {
            if (!categoryId) return Promise.resolve({ data: { status: 0, data: { rows: [], total: 0 } } });
            return readTestItem({ ...params, category_id: categoryId });
        },
        create: createTestItem,
        update: updateTestItem,
        delete: deleteTestItem
    }), [categoryId]);

    const handleCategoryChange = (val) => {
        setCategoryId(val);
        setRefreshKey(prev => prev + 1);
    };

    const columns = [
        {
            title: "序号",
            dataIndex: "id",
            width: "10%",
            align: "center",
        },
        {
            title: "检测类别",
            dataIndex: "category_name",
            width: "30%",
            render: (text) => (
                <div className="flex items-center gap-2">
                    <FilterOutlined className="text-gray-400" />
                    <span>{text}</span>
                </div>
            )
        },
        {
            title: "检测项目名称",
            dataIndex: "name",
            width: "60%",
            render: (text) => (
                <div className="flex items-center gap-2">
                    <TagOutlined className="text-blue-500" />
                    <span className="font-bold text-blue-600">{text}</span>
                </div>
            )
        }
    ];

    if (loading && !categories.length) {
        return (
            <div className="flex justify-center items-center h-64 bg-white rounded-lg">
                <Spin description="加载检测类别..." size="large" />
            </div>
        );
    }

    if (!loading && !categories.length) {
        return (
            <div className="p-8 bg-white rounded-lg text-center">
                <Empty description="请先添加检测类别" />
            </div>
        );
    }

    return (
        <CrudTable
            key={refreshKey}
            title="检测项目管理"
            entityName="检测项目"
            columns={columns}
            api={api}
            AddEditForm={AddEdit}
            initialValues={{
                category_id: categoryId,
                name: ""
            }}
            modalWidth={500}
            actionExtra={
                <Space>
                    <span className="text-gray-500 text-sm">筛选类别:</span>
                    <Select
                        style={{ width: 200 }}
                        placeholder="请选择检测类别"
                        value={categoryId}
                        onChange={handleCategoryChange}
                        options={categories.map(c => ({ label: c.name, value: c.id }))}
                    />
                </Space>
            }
        />
    );
};

export default TestItemList;
