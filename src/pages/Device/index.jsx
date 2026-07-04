import React, { useState, useMemo, useRef } from "react";
import {
    Switch,
    message,
    Tooltip,
    Tag,
    Button,
    Modal,
    Form,
    Input,
    DatePicker,
    Space,
} from "antd";
import { SafetyCertificateOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "../../contexts/AuthContext";
import CrudTable from "../../components/CrudTable";
import {
    readDevice,
    createDevice,
    updateDevice,
    deleteDevice,
    calibrateDevice,
} from "../../api/device";
import AddEdit from "./AddEdit";

const DeviceList = () => {
    const { user } = useAuth();
    // We can use a unique key to force CrudTable to reload if needed,
    // but usually updating the record locally is enough if we don't want a full reload.
    // In this case, since CrudTable manages its own state 'data',
    // the cleanest way to refresh after an out-of-table update is to trigger the reload.
    const [refreshKey, setRefreshKey] = useState(0);
    const [calibrateModal, setCalibrateModal] = useState({
        visible: false,
        record: null,
    });
    const [form] = Form.useForm();

    // Batch calibration
    const [batchCalibrateOpen, setBatchCalibrateOpen] = useState(false);
    const [batchRows, setBatchRows] = useState([]);
    const [batchSubmitting, setBatchSubmitting] = useState(false);
    const clearBatchRef = useRef(null);
    const [batchForm] = Form.useForm();

    const batchActions = useMemo(
        () => [
            {
                key: "batchCalibrate",
                label: "批量校准",
                icon: <SafetyCertificateOutlined />,
                primary: true,
                onClick: (rows, { clearSelection }) => {
                    setBatchRows(rows);
                    clearBatchRef.current = clearSelection;
                    batchForm.resetFields();
                    setBatchCalibrateOpen(true);
                },
            },
        ],
        [batchForm],
    );

    const handleBatchCalibrate = async (values) => {
        setBatchSubmitting(true);
        try {
            const calibrator = user?.nickname || user?.name || "未知用户";
            const calibrated_at = values.calibrated_at.format("YYYY-MM-DD");
            const results = await Promise.all(
                batchRows.map((row) =>
                    calibrateDevice({
                        device_id: row.id,
                        calibrator,
                        calibrated_at,
                    }).then(
                        (res) => res.data.status === 0,
                        () => false,
                    ),
                ),
            );
            const okCount = results.filter(Boolean).length;
            const failCount = results.length - okCount;
            if (failCount === 0) {
                message.success(`已为 ${okCount} 台设备添加校准记录`);
            } else {
                message.warning(
                    `校准完成：成功 ${okCount} 台，失败 ${failCount} 台`,
                );
            }
            setBatchCalibrateOpen(false);
            clearBatchRef.current?.();
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            message.error("批量校准提交异常");
        } finally {
            setBatchSubmitting(false);
        }
    };

    const handleCalibrate = async (values) => {
        try {
            const payload = {
                ...values,
                device_id: calibrateModal.record.id,
                calibrator: user?.nickname || user?.name || "未知用户",
                calibrated_at: values.calibrated_at.format("YYYY-MM-DD"),
            };
            const response = await calibrateDevice(payload);
            if (response.data.status === 0) {
                message.success("设备校准记录已添加");
                setCalibrateModal({ visible: false, record: null });
                form.resetFields();
                setRefreshKey((prev) => prev + 1);
            } else {
                message.error(response.data?.message || "校准提交失败");
            }
        } catch (error) {
            message.error("提交异常");
        }
    };

    const handleEnableToggle = async (record, checked) => {
        try {
            const response = await updateDevice({
                ...record,
                enabled: checked ? 1 : 0,
            });
            if (response.data.status === 0) {
                message.success(`${checked ? "启用" : "禁用"}成功`);
                // Trigger reload of CrudTable by changing a key if we had one,
                // or just wait for next fetch. Since we can't easily reach CrudTable internal fetchData,
                // we'll use the refreshKey strategy in tableProps to force a re-mount or just a re-fetch.
                // Actually, let's just increment refreshKey to trigger the useEffect in CrudTable if we can.
                setRefreshKey((prev) => prev + 1);
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
                    <div className="text-xs text-gray-400">
                        {record.category_name}
                    </div>
                </div>
            ),
        },
        {
            title: "供应商/型号",
            key: "vendor_model",
            width: "15%",
            render: (_, record) => (
                <div className="text-sm">
                    {record.vendor || "-"} / {record.model || "-"}
                </div>
            ),
        },
        {
            title: "资产/序列号",
            key: "codes",
            width: "15%",
            render: (_, record) => (
                <div className="text-xs">
                    <div>资产: {record.asset_code || "-"}</div>
                    <div>序列: {record.serial || "-"}</div>
                </div>
            ),
        },
        {
            title: "负责人",
            dataIndex: "maintainer_name",
            width: "10%",
            render: (text) => <Tag color="blue">{text || "-"}</Tag>,
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
            ),
        },
        {
            title: "到期时间",
            dataIndex: "expired_by",
            width: "12%",
            render: (text) => {
                const isNoRecord = text === "无校准记录";
                return (
                    <span
                        className={
                            isNoRecord
                                ? "text-gray-400 italic"
                                : "text-orange-500 font-medium"
                        }
                    >
                        {text}
                    </span>
                );
            },
        },
        {
            title: "相关日期",
            key: "dates",
            width: "12%",
            render: (_, record) => (
                <div className="text-xs text-gray-500">
                    <div>出厂: {record.manufactured_at || "-"}</div>
                    <div>启用: {record.commissioned_at || "-"}</div>
                </div>
            ),
        },
    ];

    const [expiredBy, setexpiredBy] = useState(null);

    const api = useMemo(
        () => ({
            read: (params) => {
                const extra = {};
                if (expiredBy) {
                    extra.expired_by = expiredBy;
                }
                return readDevice({ ...params, ...extra });
            },
            create: createDevice,
            update: updateDevice,
            delete: deleteDevice,
        }),
        [expiredBy],
    );

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
        description: "",
        enabled: 1, // Default to enabled when creating
    };

    return (
        <>
            <CrudTable
                refreshKey={refreshKey} // Force reload when refreshKey changes
                title="设备管理"
                entityName="设备"
                columns={columns}
                api={api}
                AddEditForm={AddEdit}
                initialValues={initialValues}
                modalWidth={800}
                batchActions={batchActions}
                actionExtra={
                    <Space
                        size="middle"
                        className="ml-4 flex items-center flex-wrap"
                    >
                        <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">
                            设备预警筛选:
                        </span>
                        <DatePicker
                            placeholder="选择到期日期"
                            format="YYYY-MM-DD"
                            value={
                                expiredBy
                                    ? dayjs(expiredBy, "YYYY-MM-DD")
                                    : null
                            }
                            onChange={(date) => {
                                const dateStr = date
                                    ? date.format("YYYY-MM-DD")
                                    : null;
                                setexpiredBy(dateStr);
                                setRefreshKey((prev) => prev + 1);
                            }}
                            allowClear
                            className="w-36 rounded-lg text-xs"
                        />
                        <Button
                            className="rounded-lg text-xs"
                            type={
                                expiredBy ===
                                dayjs().add(2, "week").format("YYYY-MM-DD")
                                    ? "primary"
                                    : "default"
                            }
                            onClick={() => {
                                const target = dayjs()
                                    .add(2, "week")
                                    .format("YYYY-MM-DD");
                                setexpiredBy(target);
                                setRefreshKey((prev) => prev + 1);
                            }}
                        >
                            2周后
                        </Button>
                        <Button
                            className="rounded-lg text-xs"
                            type={
                                expiredBy ===
                                dayjs().add(1, "month").format("YYYY-MM-DD")
                                    ? "primary"
                                    : "default"
                            }
                            onClick={() => {
                                const target = dayjs()
                                    .add(1, "month")
                                    .format("YYYY-MM-DD");
                                setexpiredBy(target);
                                setRefreshKey((prev) => prev + 1);
                            }}
                        >
                            1个月
                        </Button>
                        <Button
                            className="rounded-lg text-xs"
                            type={
                                expiredBy ===
                                dayjs().add(2, "month").format("YYYY-MM-DD")
                                    ? "primary"
                                    : "default"
                            }
                            onClick={() => {
                                const target = dayjs()
                                    .add(2, "month")
                                    .format("YYYY-MM-DD");
                                setexpiredBy(target);
                                setRefreshKey((prev) => prev + 1);
                            }}
                        >
                            2个月
                        </Button>
                        {expiredBy && (
                            <Button
                                type="link"
                                danger
                                onClick={() => {
                                    setexpiredBy(null);
                                    setRefreshKey((prev) => prev + 1);
                                }}
                                className="font-bold text-xs p-0 m-0"
                            >
                                清除
                            </Button>
                        )}
                    </Space>
                }
                renderExpandedRow={(record) => (
                    <div className="p-4 bg-gray-50 rounded border border-gray-100 flex flex-col gap-4">
                        <div className="flex gap-12">
                            <div>
                                <div className="text-gray-400 text-xs mb-1">
                                    出厂编号
                                </div>
                                <div className="text-sm">
                                    {record.factory_code || "暂无"}
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-400 text-xs mb-1">
                                    校准周期
                                </div>
                                <div className="text-sm">
                                    {record.calibration_interval} 天
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-400 text-xs mb-1">
                                    创建时间
                                </div>
                                <div className="text-sm">
                                    {record.created_at || "-"}
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-400 text-xs mb-1">
                                    更新时间
                                </div>
                                <div className="text-sm">
                                    {record.updated_at || "-"}
                                </div>
                            </div>
                            <div className="flex-1">
                                <div className="text-gray-400 text-xs mb-1">
                                    备注
                                </div>
                                <div className="text-sm whitespace-pre-wrap">
                                    {record.description || "无"}
                                </div>
                            </div>
                        </div>
                        {record.calibration_logs &&
                            record.calibration_logs.length > 0 && (
                                <div className="pt-2 border-t border-gray-200">
                                    <div className="text-gray-400 text-xs mb-2 italic">
                                        最近校准记录:
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {record.calibration_logs
                                            .slice(0, 5)
                                            .map((log, idx) => (
                                                <Tag
                                                    key={idx}
                                                    className="m-0 bg-white border-gray-200 text-[10px]"
                                                >
                                                    {log.calibrated_at} (
                                                    {log.calibrator})
                                                </Tag>
                                            ))}
                                        {record.calibration_logs.length > 5 && (
                                            <span className="text-gray-300 text-[10px]">
                                                ...
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                    </div>
                )}
                renderActions={(record) => (
                    <Button
                        type="link"
                        size="small"
                        icon={<SafetyCertificateOutlined />}
                        onClick={() =>
                            setCalibrateModal({ visible: true, record })
                        }
                    >
                        校准
                    </Button>
                )}
            />

            <Modal
                title={`设备校准 - ${calibrateModal.record?.name}`}
                open={calibrateModal.visible}
                onCancel={() =>
                    setCalibrateModal({ visible: false, record: null })
                }
                onOk={() => form.submit()}
                okText="确认校准"
                cancelText="取消"
                width={380} // Smaller size
                destroyOnHidden
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleCalibrate}
                    initialValues={{
                        calibrated_at: dayjs(),
                    }}
                    className="pt-4"
                >
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded text-blue-600 text-sm">
                        <strong>校准执行人:</strong>{" "}
                        {user?.nickname || user?.name || "未知用户"}
                    </div>
                    <Form.Item
                        name="calibrated_at"
                        label="校准执行日期"
                        rules={[{ required: true, message: "请选择校准日期" }]}
                    >
                        <DatePicker className="w-full" />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={`批量校准 (${batchRows.length} 台设备)`}
                open={batchCalibrateOpen}
                onCancel={() => setBatchCalibrateOpen(false)}
                onOk={() => batchForm.submit()}
                okText="确认批量校准"
                cancelText="取消"
                confirmLoading={batchSubmitting}
                width={420}
                destroyOnHidden
            >
                <Form
                    form={batchForm}
                    layout="vertical"
                    onFinish={handleBatchCalibrate}
                    initialValues={{ calibrated_at: dayjs() }}
                    className="pt-4"
                >
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded text-blue-600 text-sm">
                        <strong>校准执行人:</strong>{" "}
                        {user?.nickname || user?.name || "未知用户"}
                        <div className="mt-1 text-xs text-blue-400">
                            将为所选 {batchRows.length} 台设备统一写入同一校准日期。
                        </div>
                    </div>
                    <Form.Item
                        name="calibrated_at"
                        label="校准执行日期"
                        rules={[{ required: true, message: "请选择校准日期" }]}
                    >
                        <DatePicker className="w-full" />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default DeviceList;
