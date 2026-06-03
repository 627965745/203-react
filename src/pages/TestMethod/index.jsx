import React, { useState, useMemo, useCallback } from "react";
import CrudTable from "../../components/CrudTable";
import { readTestMethod, createTestMethod, updateTestMethod, deleteTestMethod } from "../../api/testMethod";
import AddEdit from './AddEdit';
import FieldDrawer from './FieldDrawer';
import ArrangeModal from './ArrangeModal';
import { SafetyCertificateOutlined, CodeOutlined, SettingOutlined, LinkOutlined } from "@ant-design/icons";
import { Button, Tag } from "antd";

const TestMethodList = () => {
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [drawerMethodRecord, setDrawerMethodRecord] = useState(null);

    const [arrangeVisible, setArrangeVisible] = useState(false);
    const [arrangeRecord, setArrangeRecord] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [methods, setMethods] = useState([]);

    const handleManageFields = useCallback((record) => {
        setDrawerMethodRecord(record);
        setDrawerVisible(true);
    }, []);

    const handleManageItems = useCallback((record) => {
        setArrangeRecord(record);
        setArrangeVisible(true);
    }, []);

    const renderActions = useCallback((record) => (
        <div className="flex space-x-1">
            <Button 
                type="link" 
                size="small" 
                onClick={() => handleManageFields(record)}
                icon={<SettingOutlined className="text-purple-500" />}
            >
                参数
            </Button>
            <Button 
                type="link" 
                size="small" 
                onClick={() => handleManageItems(record)}
                icon={<LinkOutlined className="text-indigo-500" />}
            >
                关联项目
            </Button>
        </div>
    ), [handleManageFields, handleManageItems]);

    const columns = useMemo(() => [
        {
            title: "序号",
            dataIndex: "id",
            width: "10%",
            align: "center",
        },
        {
            title: "检测方法名称",
            dataIndex: "name",
            width: "30%",
            render: (text) => (
                <div className="flex items-center gap-2">
                    <SafetyCertificateOutlined className="text-emerald-500" />
                    <span className="font-bold text-emerald-600">{text}</span>
                </div>
            )
        },
        {
            title: "国标代码",
            dataIndex: "code",
            width: "25%",
            render: (text) => (
                <div className="flex items-center gap-2">
                    <CodeOutlined className="text-gray-400" />
                    <code className="text-xs bg-gray-100 p-1 rounded px-2 font-mono">{text}</code>
                </div>
            )
        },
        {
            title: "支持验证项目",
            dataIndex: "items",
            width: "35%",
            render: (items) => (
                <div className="flex flex-wrap gap-1">
                    {items?.map(m => (
                        <Tag color="geekblue" key={m.id} className="m-0 text-[11px] leading-[18px]">
                            {m.name}
                        </Tag>
                    ))}
                    {(!items || items.length === 0) && <span className="text-gray-300 italic text-[11px]">无</span>}
                </div>
            )
        }
    ], []);

    const api = useMemo(() => ({
        read: readTestMethod,
        create: createTestMethod,
        update: updateTestMethod,
        delete: deleteTestMethod
    }), []);

    const initialValues = useMemo(() => ({
        name: "",
        code: ""
    }), []);

    return (
        <>
            <CrudTable
                refreshKey={refreshKey}
                title="检测方法管理"
                entityName="检测方法"
                columns={columns}
                api={api}
                AddEditForm={AddEdit}
                initialValues={initialValues}
                modalWidth={500}
                renderActions={renderActions}
                onDataLoaded={setMethods}
            />
            <FieldDrawer
                visible={drawerVisible}
                onClose={() => setDrawerVisible(false)}
                methodRecord={methods.find(m => m.id === drawerMethodRecord?.id)}
                onSuccess={() => setRefreshKey(prev => prev + 1)}
            />
            <ArrangeModal
                visible={arrangeVisible}
                onClose={() => setArrangeVisible(false)}
                record={methods.find(m => m.id === arrangeRecord?.id)}
                onSuccess={() => setRefreshKey(prev => prev + 1)}
            />
        </>
    );
};

export default TestMethodList;
