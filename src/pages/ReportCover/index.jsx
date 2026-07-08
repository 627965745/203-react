import React, { useState, useMemo, useCallback } from "react";
import { Button } from "antd";
import { FileWordOutlined, SettingOutlined } from "@ant-design/icons";
import CrudTable from "../../components/CrudTable";
import { readReportCover, createReportCover, updateReportCover, deleteReportCover } from "../../api/reportCover";
import AddEdit from './AddEdit';
import FieldDrawer from './FieldDrawer';

const ReportCoverList = () => {
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [drawerCover, setDrawerCover] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [covers, setCovers] = useState([]);

    const handleManageFields = useCallback((record) => {
        setDrawerCover(record);
        setDrawerVisible(true);
    }, []);

    const columns = useMemo(() => [
        {
            title: "序号",
            dataIndex: "id",
            width: 70,
            align: "center",
        },
        {
            title: "模板名称",
            dataIndex: "name",
            width: 200,
            ellipsis: true,
            render: (text) => <span className="font-bold text-blue-600">{text}</span>
        },
        {
            title: "模板文件路径",
            dataIndex: "template_file",
            width: 280,
            ellipsis: true,
            render: (text) => (
                <div className="flex items-center gap-2 min-w-0">
                    <FileWordOutlined className="text-blue-500 shrink-0" />
                    <code className="text-xs bg-gray-100 p-1 rounded font-mono truncate">{text}</code>
                </div>
            )
        },
        {
            title: "描述",
            dataIndex: "description",
            ellipsis: true,
            render: (text) => text || <span className="text-gray-300 italic">暂无描述</span>
        }
    ], []);

    const api = useMemo(() => ({
        read: readReportCover,
        create: createReportCover,
        update: updateReportCover,
        delete: deleteReportCover
    }), []);

    const initialValues = useMemo(() => ({
        name: "",
        template_file: "",
        description: ""
    }), []);

    const renderActions = useCallback((record) => (
        <Button 
            type="link" 
            size="small" 
            onClick={() => handleManageFields(record)}
            icon={<SettingOutlined className="text-purple-500" />}
        >
            字段管理
        </Button>
    ), [handleManageFields]);

    return (
        <>
            <CrudTable
                refreshKey={refreshKey}
                title="报告封面模板管理"
                entityName="模板"
                columns={columns}
                api={api}
                AddEditForm={AddEdit}
                initialValues={initialValues}
                modalWidth={600}
                actionWidth={220}
                renderActions={renderActions}
                onDataLoaded={setCovers}
            />
            <FieldDrawer
                visible={drawerVisible}
                onClose={() => setDrawerVisible(false)}
                cover={covers.find(c => c.id === drawerCover?.id)}
                onSuccess={() => setRefreshKey(prev => prev + 1)}
            />
        </>
    );
};

export default ReportCoverList;
