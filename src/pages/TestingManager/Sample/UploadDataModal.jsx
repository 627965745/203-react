import React, { useState, useEffect, useMemo } from "react";
import {
    Modal,
    Upload,
    message,
    Typography,
    Button,
    Select,
    Spin,
    Alert,
    Table,
    Divider,
    DatePicker,
} from "antd";
import {
    InboxOutlined,
    FileExcelOutlined,
    DeleteOutlined,
} from "@ant-design/icons";
import { uploadTestingSample, readTestingSample } from "../../../api/testing";
import { fieldTestMethod } from "../../../api/testMethod";
// V5: upload 表单新增 device_ids（结果字段ID → 设备ID 映射），设备下拉沿用设备管理接口
import { comboDevice } from "../../../api/device";
// V6: upload 表单新增必填 experimented_at（实验时间），需要 dayjs 做默认值与格式化
import dayjs from "dayjs";

const { Dragger } = Upload;
const { Text } = Typography;

const UploadDataModal = ({ open, onCancel, onSuccess, taskId }) => {
    const [fileList, setFileList] = useState([]);
    const [uploading, setUploading] = useState(false);

    // V5: 为了给「结果字段 → 设备」建映射，需要先知道本次上传的是哪个检测项目/方法的模板，
    //     再按该方法拉出它的结果字段列表。选择逻辑与「下载结果录入模板」保持一致。
    const [loading, setLoading] = useState(false);
    const [samples, setSamples] = useState([]);
    const [methodKey, setMethodKey] = useState(null); // "itemId:methodId"
    const [fields, setFields] = useState([]);
    const [fieldsLoading, setFieldsLoading] = useState(false);
    const [devices, setDevices] = useState([]);
    // { [fieldId]: deviceId } —— 只有被指定了设备的字段才会进入 device_ids
    const [fieldDeviceMap, setFieldDeviceMap] = useState({});
    // V6: upload 新增必填 experimented_at —— 本次上传的全部结果统一使用该实验时间
    const [experimentedAt, setExperimentedAt] = useState(null);
    const [experimentedAtError, setExperimentedAtError] = useState(false);

    useEffect(() => {
        if (!open) return;
        setFileList([]);
        setMethodKey(null);
        setFields([]);
        setFieldDeviceMap({});
        // V6: 实验时间默认取今天，通常"当天导入当天的实验数据"
        setExperimentedAt(dayjs());
        setExperimentedAtError(false);

        const load = async () => {
            setLoading(true);
            try {
                const [resSamples, resDevices] = await Promise.all([
                    taskId
                        ? readTestingSample({ task_id: taskId, limit: 1000 })
                        : Promise.resolve({ data: { status: 0, data: [] } }),
                    comboDevice({}),
                ]);
                if (resSamples.data?.status === 0) {
                    const raw = resSamples.data.data;
                    setSamples(Array.isArray(raw) ? raw : raw?.rows || []);
                }
                const rawDev = resDevices.data?.data;
                setDevices(Array.isArray(rawDev) ? rawDev : rawDev?.rows || []);
            } catch (error) {
                console.error("加载设备/样品数据失败", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [open, taskId]);

    // V3/V5: item 与 method 强绑定，用 "itemId:methodId" 组合键唯一定位一个"检测项目+方法"
    const availableMethods = useMemo(() => {
        const map = new Map();
        samples.forEach((s) => {
            (s.methods || []).forEach((m) => {
                const methodId = m.method_id || m.id;
                if (!methodId || m.item_id == null) return;
                const key = `${m.item_id}:${methodId}`;
                if (!map.has(key)) {
                    map.set(key, {
                        value: key,
                        methodId,
                        label: m.item_name
                            ? `${m.item_name} / ${m.method_name || m.name}`
                            : m.method_name || m.name,
                    });
                }
            });
        });
        return Array.from(map.values());
    }, [samples]);

    // 选定方法后拉出它的结果字段，供逐字段指定设备
    useEffect(() => {
        if (!methodKey) {
            setFields([]);
            setFieldDeviceMap({});
            return;
        }
        const [, methodId] = methodKey.split(":").map(Number);
        setFieldsLoading(true);
        fieldTestMethod({ id: methodId })
            .then((res) => {
                if (res.data.status === 0) {
                    setFields(
                        (res.data.data || []).sort((a, b) => a.sort - b.sort),
                    );
                } else {
                    setFields([]);
                }
            })
            .catch(() => setFields([]))
            .finally(() => setFieldsLoading(false));
        setFieldDeviceMap({});
    }, [methodKey]);

    // 一键把某台设备套用到全部字段，字段多时省去逐条选择
    const applyDeviceToAll = (deviceId) => {
        if (!deviceId) {
            setFieldDeviceMap({});
            return;
        }
        setFieldDeviceMap(
            Object.fromEntries(fields.map((f) => [f.id, deviceId])),
        );
    };

    const handleUpload = async () => {
        if (fileList.length === 0) {
            message.warning("请先选择或拖拽文件");
            return;
        }

        // V6: experimented_at 是 upload 的必填项，缺失时后端会以参数校验错误(status=10)拒绝
        if (!experimentedAt) {
            setExperimentedAtError(true);
            message.warning("请先选择本次实验时间");
            return;
        }

        const formData = new FormData();
        const rawFile = fileList[0]?.originFileObj || fileList[0];
        formData.append("file", rawFile);
        // V6: 新增必填 experimented_at —— 本次上传的全部结果统一写入该日期
        formData.append("experimented_at", experimentedAt.format("YYYY-MM-DD"));

        // V5: device_ids 为 JSON 字符串，形如 {"3": 5, "4": 7}（结果字段ID → 设备ID）。
        //     没有指定任何设备时不传该字段，行为与 v4 一致。
        const deviceEntries = Object.entries(fieldDeviceMap).filter(
            ([, deviceId]) => !!deviceId,
        );
        if (deviceEntries.length > 0) {
            formData.append(
                "device_ids",
                JSON.stringify(Object.fromEntries(deviceEntries)),
            );
        }

        setUploading(true);
        try {
            const res = await uploadTestingSample(formData);
            if (res.data.status === 0) {
                message.success(
                    deviceEntries.length > 0
                        ? `数据导入成功；已为 ${deviceEntries.length} 个结果字段记录检测设备`
                        : "数据导入成功",
                );
                onSuccess();
                onCancel();
                setFileList([]);
            } else {
                message.error(res.data.message || "导入失败");
            }
        } catch (error) {
            console.error("上传错误", error);
        } finally {
            setUploading(false);
        }
    };

    const props = {
        onRemove: () => {
            setFileList([]);
        },
        beforeUpload: (file) => {
            const isExcel =
                file.type ===
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                file.type === "application/vnd.ms-excel" ||
                file.name.endsWith(".xlsx") ||
                file.name.endsWith(".xls");

            if (!isExcel) {
                message.error(`${file.name} 不是 Excel 文件`);
                return Upload.LIST_IGNORE;
            }

            setFileList([file]);
            return false; // Prevent automatic upload by antd
        },
        fileList,
        maxCount: 1,
    };

    // 设备目录里存在 name 为空的脏数据，回退成 #id 以免下拉里出现空白项
    // V6: combo 返回的 name 已是「设备名称 (资产编号)」，前端不再自行拼接编号
    const deviceOptions = devices.map((d) => ({
        label: d.name || `#${d.id}`,
        value: d.id,
    }));

    return (
        <Modal
            title={
                <div className="flex items-center gap-3 p-1">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                        <InboxOutlined />
                    </div>
                    <div>
                        <div className="text-lg font-black text-slate-800">
                            上传检测数据
                        </div>
                    </div>
                </div>
            }
            open={open}
            onCancel={onCancel}
            onOk={handleUpload}
            okText="开始上传"
            cancelText="取消"
            confirmLoading={uploading}
            width={720}
            destroyOnHidden
        >
            <Spin spinning={loading}>
                <div className="py-4">
                    <Dragger
                        {...props}
                        className="bg-slate-50 border-dashed border-slate-300 rounded-lg p-6 hover:border-orange-500 transition-all"
                    >
                        <p className="ant-upload-drag-icon flex justify-center">
                            <FileExcelOutlined className="text-4xl text-orange-500" />
                        </p>
                        <p className="ant-upload-text font-bold text-slate-700 mt-2">
                            点击或拖拽 Excel 文件到此区域进行上传
                        </p>
                        <p className="ant-upload-hint text-xs text-slate-400 mt-1">
                            仅支持 .xlsx 或 .xls 格式的检测数据结果录入表
                        </p>
                    </Dragger>
                    {fileList.length > 0 && (
                        <div className="mt-4 p-3 bg-orange-50 rounded-xl border border-orange-100 flex items-center gap-3">
                            <FileExcelOutlined className="text-xl text-orange-600" />
                            <div className="flex-1 overflow-hidden">
                                <Text
                                    strong
                                    ellipsis
                                    className="block text-slate-800"
                                >
                                    {fileList[0].name}
                                </Text>
                                <Text
                                    type="secondary"
                                    className="text-[12px] block text-slate-400"
                                >
                                    {(fileList[0].size / 1024).toFixed(2)} KB
                                </Text>
                            </div>
                            <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => setFileList([])}
                            />
                        </div>
                    )}

                    {/* V6: 新增 experimented_at —— 本次上传的全部结果统一使用该实验时间（必填） */}
                    <Divider className="my-5" />
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-black text-slate-700">
                            实验时间
                            <span className="ml-1 text-red-500">*</span>
                            <span className="ml-2 text-[11px] font-bold text-slate-400">
                                （本次导入的全部结果共用）
                            </span>
                        </span>
                    </div>
                    <DatePicker
                        className="w-full"
                        placeholder="请选择本次实验时间"
                        value={experimentedAt}
                        onChange={(val) => {
                            setExperimentedAt(val);
                            setExperimentedAtError(false);
                        }}
                        status={experimentedAtError ? "error" : ""}
                    />
                    {experimentedAtError && (
                        <div className="text-red-500 text-sm mt-1">
                            请选择实验时间
                        </div>
                    )}

                    {/* V5: 新增 device_ids —— 给本次导入的结果字段登记检测设备 */}
                    <Divider className="my-5" />
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-black text-slate-700">
                            检测设备登记
                            <span className="ml-2 text-[11px] font-bold text-slate-400">
                                （可选）
                            </span>
                        </span>
                    </div>
                    <Alert
                        type="info"
                        showIcon
                        className="mb-3 rounded-lg text-xs"
                        message="选择本次模板对应的检测项目/方法后，可为其结果字段指定所用设备；未指定设备的字段照常导入，只是不记录设备。"
                    />

                    <div className="grid grid-cols-2 gap-3">
                        <Select
                            placeholder="本次模板对应的检测项目 / 方法"
                            value={methodKey}
                            onChange={setMethodKey}
                            options={availableMethods}
                            showSearch
                            optionFilterProp="label"
                            allowClear
                            className="w-full"
                        />
                        <Select
                            placeholder="统一设置全部字段的设备"
                            onChange={applyDeviceToAll}
                            options={deviceOptions}
                            showSearch
                            optionFilterProp="label"
                            allowClear
                            disabled={fields.length === 0}
                            className="w-full"
                        />
                    </div>

                    {methodKey && (
                        <div className="mt-3">
                            <Table
                                size="small"
                                rowKey="id"
                                loading={fieldsLoading}
                                dataSource={fields}
                                pagination={false}
                                scroll={{ y: 220 }}
                                locale={{ emptyText: "该方法未配置结果字段" }}
                                columns={[
                                    {
                                        title: "结果字段",
                                        dataIndex: "name",
                                        render: (v, r) => (
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-700">
                                                    {v}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-mono">
                                                    #{r.id} · {r.key}
                                                </span>
                                            </div>
                                        ),
                                    },
                                    {
                                        title: "检测设备",
                                        width: 320,
                                        render: (_, r) => (
                                            <Select
                                                className="w-full"
                                                placeholder="不记录设备"
                                                value={fieldDeviceMap[r.id]}
                                                onChange={(val) =>
                                                    setFieldDeviceMap(
                                                        (prev) => ({
                                                            ...prev,
                                                            [r.id]: val,
                                                        }),
                                                    )
                                                }
                                                options={deviceOptions}
                                                showSearch
                                                optionFilterProp="label"
                                                allowClear
                                                size="small"
                                            />
                                        ),
                                    },
                                ]}
                            />
                        </div>
                    )}
                </div>
            </Spin>
        </Modal>
    );
};

export default UploadDataModal;
