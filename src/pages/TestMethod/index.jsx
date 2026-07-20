import React, { useState, useMemo, useCallback, useRef } from "react";
import CrudTable from "../../components/CrudTable";
import BatchArrangeModal from "../../components/CrudTable/BatchArrangeModal";
import { readTestMethod, createTestMethod, updateTestMethod, deleteTestMethod, arrangeTestMethod } from "../../api/testMethod";
import { comboTestItem } from "../../api/testItem";
import AddEdit from './AddEdit';
import FieldDrawer from './FieldDrawer';
import ArrangeModal from './ArrangeModal';
import { SafetyCertificateOutlined, CodeOutlined, SettingOutlined, LinkOutlined, DownloadOutlined } from "@ant-design/icons";
import { Button, Tag, Tooltip } from "antd";
import axios from "axios";

const TestMethodList = () => {
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [drawerMethodRecord, setDrawerMethodRecord] = useState(null);

    const [arrangeVisible, setArrangeVisible] = useState(false);
    const [arrangeRecord, setArrangeRecord] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [methods, setMethods] = useState([]);

    // Batch item association
    const [batchArrangeOpen, setBatchArrangeOpen] = useState(false);
    const [batchRows, setBatchRows] = useState([]);
    const clearBatchRef = useRef(null);

    const batchActions = useMemo(
        () => [
            {
                key: "arrangeItems",
                label: "批量关联项目",
                icon: <LinkOutlined />,
                type: "default",
                className: "font-bold",
                onClick: (rows, { clearSelection }) => {
                    setBatchRows(rows);
                    clearBatchRef.current = clearSelection;
                    setBatchArrangeOpen(true);
                },
            },
        ],
        [],
    );

    const handleDownload = useCallback(async (url, filename) => {
        try {
            const downloadUrl = `${window.location.origin}${url}`;
            const response = await axios.get(downloadUrl, { responseType: "blob" });
            const blob = new Blob([response.data]);

            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            const ext = url.includes(".") ? `.${url.split(".").pop()}` : "";
            link.download = filename ? (filename.endsWith(ext) ? filename : `${filename}${ext}`) : (url.split("/").pop() || "download");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error("Download error:", error);
            window.open(`${window.location.origin}${url}`, "_blank");
        }
    }, []);

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
            width: 70,
            align: "center",
            fixed: "left",
        },
        {
            title: "检测方法名称",
            dataIndex: "name",
            width: 300,
            ellipsis: false,
            render: (text) => (
                <Tooltip title={text}>
                    <div className="flex items-center gap-2 min-w-0">
                        <SafetyCertificateOutlined className="text-emerald-500 shrink-0" />
                        <span className="font-bold text-emerald-600">{text}</span>
                    </div>
                </Tooltip>
            )
        },
        {
            title: "国标代码",
            dataIndex: "code",
            width: 180,
            ellipsis: true,
            render: (text) => (
                <div className="flex items-center gap-2 min-w-0">
                    <CodeOutlined className="text-gray-400 shrink-0" />
                    <code className="text-xs bg-gray-100 p-1 rounded px-2 font-mono truncate">{text}</code>
                </div>
            )
        },
        {
            title: "标准文件",
            dataIndex: "standard_file",
            width: 140,
            render: (url, record) =>
                url ? (
                    <span
                        onClick={() => handleDownload(url, record.name)}
                        className="text-blue-600 font-bold hover:underline cursor-pointer inline-flex items-center gap-1"
                    >
                        <DownloadOutlined /> 下载
                    </span>
                ) : (
                    <span className="text-gray-300 italic text-[11px]">暂无</span>
                )
        },
        {
            title: "支持验证项目",
            dataIndex: "items",
            width: 220,
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
    ], [handleDownload]);

    const api = useMemo(() => ({
        read: readTestMethod,
        create: createTestMethod,
        update: updateTestMethod,
        delete: deleteTestMethod
    }), []);

    const initialValues = useMemo(() => ({
        name: "",
        code: "",
        standard_file: ""
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
                actionWidth={280}
                batchActions={batchActions}
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
            <BatchArrangeModal
                open={batchArrangeOpen}
                title="批量关联检测项目"
                hint="请为所选检测方法统一关联适用的检测项目（支持多选）："
                comboApi={comboTestItem}
                arrangeApi={arrangeTestMethod}
                extraKey="item_ids"
                selectedRows={batchRows}
                optionsBuilder={(cats) =>
                    (cats || []).map((c) => ({
                        label: c.name,
                        options: (c.items || []).map((i) => ({
                            label: i.name,
                            value: i.id,
                        })),
                    }))
                }
                onCancel={() => setBatchArrangeOpen(false)}
                onSuccess={() => {
                    clearBatchRef.current?.();
                    setRefreshKey((prev) => prev + 1);
                }}
            />
        </>
    );
};

export default TestMethodList;
