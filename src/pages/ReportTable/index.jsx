import React, { useState, useMemo } from "react";
import { Button } from "antd";
import CrudTable from "../../components/CrudTable";
import { readReportTable, createReportTable, updateReportTable, deleteReportTable } from "../../api/reportTable";
import AddEdit from './AddEdit';
import FieldDrawer from './FieldDrawer';
import { TableOutlined, SettingOutlined } from "@ant-design/icons";
import { useCallback } from "react";

const ReportTableList = () => {
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [drawerTableRecord, setDrawerTableRecord] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [tables, setTables] = useState([]);

    const handleManageFields = useCallback((record) => {
        setDrawerTableRecord(record);
        setDrawerVisible(true);
    }, []);

    const renderActions = useCallback((record) => (
        <Button 
            type="link" 
            size="small" 
            onClick={() => handleManageFields(record)}
            icon={<SettingOutlined className="text-purple-500" />}
        >
            表字段管理
        </Button>
    ), [handleManageFields]);

    const columns = useMemo(() => [
        {
            title: "序号",
            dataIndex: "id",
            width: 70,
            align: "center",
        },
        {
            title: "表名称",
            dataIndex: "name",
            width: 220,
            ellipsis: true,
            render: (text) => (
                <div className="flex items-center gap-2 min-w-0">
                    <TableOutlined className="text-blue-500 shrink-0" />
                    <span className="font-bold truncate">{text}</span>
                </div>
            )
        },
        {
            title: "描述说明",
            dataIndex: "description",
            ellipsis: true,
            render: (text) => text || <span className="text-gray-300 italic">暂无描述</span>
        }
    ], []);

    const api = useMemo(() => ({
        read: readReportTable,
        create: createReportTable,
        update: updateReportTable,
        delete: deleteReportTable
    }), []);

    const initialValues = useMemo(() => ({
        name: "",
        description: ""
    }), []);

    return (
        <>
            <CrudTable
                refreshKey={refreshKey}
                title="报告数据表管理"
                entityName="数据表"
                columns={columns}
                api={api}
                AddEditForm={AddEdit}
                initialValues={initialValues}
                modalWidth={600}
                actionWidth={220}
                renderActions={renderActions}
                onDataLoaded={setTables}
            />
            <FieldDrawer
                visible={drawerVisible}
                onClose={() => setDrawerVisible(false)}
                tableRecord={tables.find(t => t.id === drawerTableRecord?.id)}
                onSuccess={() => setRefreshKey(prev => prev + 1)}
            />
        </>
    );
};

export default ReportTableList;
