import React, { useState } from "react";
import { Switch, message, Tooltip, Tag } from "antd";
import CrudTable from "../../components/CrudTable";
import { readDevice, createDevice, updateDevice, deleteDevice } from "../../api/device";
import AddEdit from './AddEdit';

const DeviceList = () => {
    // We can use a unique key to force CrudTable to reload if needed, 
    // but usually updating the record locally is enough if we don't want a full reload.
    // In this case, since CrudTable manages its own state 'data', 
    // the cleanest way to refresh after an out-of-table update is to trigger the reload.
    const [refreshKey, setRefreshKey] = useState(0);

    const handleEnableToggle = async (record, checked) => {
        try {
            const response = await updateDevice({
                ...record,
                enabled: checked ? 1 : 0
            });
            if (response.data.status === 0 || response.data.code === 0) {
                message.success(`${checked ? '启用' : '禁用'}成功`);
                // Trigger reload of CrudTable by changing a key if we had one,
                // or just wait for next fetch. Since we can't easily reach CrudTable internal fetchData,
                // we'll use the refreshKey strategy in tableProps to force a re-mount or just a re-fetch.
                // Actually, let's just increment refreshKey to trigger the useEffect in CrudTable if we can.
                setRefreshKey(prev => prev + 1);
            } else {
                message.error(response.data?.message || "状态更新失败");
            }
        } catch (error) {
            console.error("Error toggling device status:", error);
            message.error(error.response?.data?.message || "状态更新异常");
        }
    };

    const columns = [
        {
            title: "设备名称/分类",
            key: "name_category",
            width: "15%",
            render: (_, record) => (
                <div>
                    <div className="font-bold">{record.name}</div>
                    <div className="text-xs text-gray-400">{record.category_name}</div>
                </div>
            )
        },
        {
            title: "供应商/型号",
            key: "vendor_model",
            width: "15%",
            render: (_, record) => (
                <div className="text-sm">
                    {record.vendor || '-'} / {record.model || '-'}
                </div>
            )
        },
        {
            title: "资产/序列号",
            key: "codes",
            width: "15%",
            render: (_, record) => (
                <div className="text-xs">
                    <div>资产: {record.asset_code || '-'}</div>
                    <div>序列: {record.serial || '-'}</div>
                </div>
            )
        },
        {
            title: "负责人",
            dataIndex: "maintainer_name",
            width: "10%",
            render: (text) => <Tag color="blue">{text || '-'}</Tag>
        },
        {
            title: "状态",
            dataIndex: "enabled",
            width: "8%",
            align: "center",
            render: (enabled, record) => (
                <Switch
                    checked={enabled === 1}
                    onChange={(checked) => handleEnableToggle(record, checked)}
                    size="small"
                />
            )
        },
        {
            title: "到期时间",
            dataIndex: "expired_by",
            width: "12%",
            render: (text) => {
                const isNoRecord = text === "无校准记录";
                return <span className={isNoRecord ? "text-gray-400 italic" : "text-orange-500 font-medium"}>{text}</span>;
            }
        },
        {
            title: "相关日期",
            key: "dates",
            width: "12%",
            render: (_, record) => (
                <div className="text-xs text-gray-500">
                    <div>出厂: {record.manufactured_at || '-'}</div>
                    <div>启用: {record.commissioned_at || '-'}</div>
                </div>
            )
        }
    ];

    const api = {
        read: readDevice,
        create: createDevice,
        update: updateDevice,
        delete: deleteDevice
    };

    const initialValues = {
        category_id: null,
        name: "",
        vendor: "",
        model: "",
        serial: "",
        factory_code: "",
        asset_code: "",
        manufactured_at: null,
        commissioned_at: null,
        calibration_interval: 365,
        maintainer_id: null,
        notes: "",
        enabled: 1 // Default to enabled when creating
    };

    return (
        <CrudTable
            key={refreshKey} // Force reload when refreshKey changes
            title="设备管理"
            entityName="设备"
            columns={columns}
            api={api}
            AddEditForm={AddEdit}
            initialValues={initialValues}
            modalWidth={800}
            renderExpandedRow={(record) => (
                <div className="p-4 bg-gray-50 rounded border border-gray-100 flex gap-12">
                   <div>
                       <div className="text-gray-400 text-xs mb-1">出厂编号</div>
                       <div className="text-sm">{record.factory_code || '暂无'}</div>
                   </div>
                   <div>
                       <div className="text-gray-400 text-xs mb-1">校准周期</div>
                       <div className="text-sm">{record.calibration_interval} 天</div>
                   </div>
                   <div className="flex-1">
                       <div className="text-gray-400 text-xs mb-1">备注</div>
                       <div className="text-sm whitespace-pre-wrap">{record.notes || '无'}</div>
                   </div>
                </div>
            )}
        />
    );
};

export default DeviceList;
