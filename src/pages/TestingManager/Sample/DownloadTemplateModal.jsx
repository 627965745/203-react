import React, { useState, useEffect, useMemo } from "react";
import { Modal, Form, Radio, Select, Button, message, Spin } from "antd";
import { FileExcelOutlined } from "@ant-design/icons";
import { readTestingSample, templateTestingSample } from "../../../api/testing";

const DownloadTemplateModal = ({ open, onCancel, taskId, taskLabCode }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [samples, setSamples] = useState([]);

    const scope = Form.useWatch("scope", form);
    const selectedSampleIds = Form.useWatch("sample_ids", form);
    const selectedItemId = Form.useWatch("item_id", form);

    useEffect(() => {
        if (open && taskId) {
            form.resetFields();
            form.setFieldsValue({
                scope: "task"
            });
            fetchInitialData();
        }
    }, [open, taskId]);

    // Reset item and method when scope or selected sample IDs change
    useEffect(() => {
        form.setFieldsValue({
            item_id: null,
            method_id: null
        });
    }, [scope, selectedSampleIds, form]);

    // Reset method when selected item changes
    useEffect(() => {
        form.setFieldsValue({
            method_id: null
        });
    }, [selectedItemId, form]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const resSamples = await readTestingSample({ task_id: taskId, limit: 1000 });
            if (resSamples.data?.status === 0 || resSamples.data?.code === 0) {
                setSamples(resSamples.data.data?.rows || resSamples.data.data || []);
            }
        } catch (error) {
            console.error("加载数据失败", error);
            message.error("加载选项数据失败");
        } finally {
            setLoading(false);
        }
    };

    // Filter samples that are active under current selection
    const activeSamples = useMemo(() => {
        if (scope === "task") {
            return samples;
        } else if (scope === "samples") {
            const ids = selectedSampleIds || [];
            return samples.filter((s) => ids.includes(s.id));
        }
        return [];
    }, [scope, samples, selectedSampleIds]);

    // Extract unique items and their methods from active samples
    const availableItems = useMemo(() => {
        const itemMap = new Map();
        activeSamples.forEach((s) => {
            (s.items || []).forEach((item) => {
                const itemId = item.item_id || item.id;
                const itemName = item.item_name || item.name;
                if (!itemId) return;
                if (!itemMap.has(itemId)) {
                    itemMap.set(itemId, {
                        value: itemId,
                        label: itemName,
                        methodsMap: new Map()
                    });
                }
                const itemObj = itemMap.get(itemId);
                (item.methods || []).forEach((m) => {
                    const methodId = m.method_id || m.id;
                    const methodName = m.method_name || m.name;
                    if (!methodId) return;
                    if (!itemObj.methodsMap.has(methodId)) {
                        itemObj.methodsMap.set(methodId, {
                            value: methodId,
                            label: methodName
                        });
                    }
                });
            });
        });

        return Array.from(itemMap.values()).map((item) => ({
            value: item.value,
            label: item.label,
            methods: Array.from(item.methodsMap.values())
        }));
    }, [activeSamples]);

    // Filter methods based on selected item
    const availableMethods = useMemo(() => {
        if (!selectedItemId) return [];
        const item = availableItems.find((i) => i.value === selectedItemId);
        return item ? item.methods : [];
    }, [selectedItemId, availableItems]);

    const handleDownload = async () => {
        try {
            const values = await form.validateFields();
            setDownloading(true);

            const payload = {
                item_id: values.item_id,
                method_id: values.method_id,
                task_id: values.scope === "task" ? taskId : null,
                sample_ids: values.scope === "samples" ? values.sample_ids : null
            };

            const res = await templateTestingSample(payload);
            
            // Check if response is a JSON error rather than a file blob
            if (res.data instanceof Blob) {
                if (res.data.type === "application/json") {
                    const text = await res.data.text();
                    const errorData = JSON.parse(text);
                    message.error(errorData.message || "生成模板失败");
                    setDownloading(false);
                    return;
                }

                const blob = new Blob([res.data], {
                    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                });
                const fileName = `数据录入模板.xlsx`;

                if ("showSaveFilePicker" in window) {
                    try {
                        const handle = await window.showSaveFilePicker({
                            suggestedName: fileName,
                            types: [
                                {
                                    description: "Excel file",
                                    accept: {
                                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"]
                                    }
                                }
                            ]
                        });
                        const writable = await handle.createWritable();
                        await writable.write(blob);
                        await writable.close();
                        message.success("模板下载成功");
                        onCancel();
                        return;
                    } catch (err) {
                        if (err.name === "AbortError") return;
                        console.error("SaveFilePicker failed, falling back to standard download", err);
                    }
                }

                const url = window.URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.setAttribute("download", fileName);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);

                message.success("模板下载成功");
                onCancel();
            } else {
                message.warning("服务器未返回有效文件数据");
            }
        } catch (error) {
            console.error("下载模板出错", error);
            if (error?.errorFields) {
                return;
            }
            message.error("下载模板失败");
        } finally {
            setDownloading(false);
        }
    };

    return (
        <Modal
            title={
                <div className="flex items-center gap-3 p-1">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <FileExcelOutlined />
                    </div>
                    <div>
                        <div className="text-lg font-black text-slate-800">下载结果录入模板</div>
                        <div className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                            Download Result Template
                        </div>
                    </div>
                </div>
            }
            open={open}
            onCancel={onCancel}
            okText="生成并下载"
            cancelText="取消"
            onOk={handleDownload}
            confirmLoading={downloading}
            width={600}
            destroyOnHidden
        >
            <Spin spinning={loading} description="正在加载选项...">
                <Form
                    form={form}
                    layout="vertical"
                    className="mt-4"
                >
                    <Form.Item
                        name="scope"
                        label={<span className="font-black text-slate-700">模板范围</span>}
                        rules={[{ required: true, message: "请选择模板范围" }]}
                    >
                        <Radio.Group className="flex gap-4">
                            <Radio.Button value="task" className="rounded-lg font-bold">
                                整个任务 (当前任务)
                            </Radio.Button>
                            <Radio.Button value="samples" className="rounded-lg font-bold">
                                指定样品
                            </Radio.Button>
                        </Radio.Group>
                    </Form.Item>

                    {scope === "samples" && (
                        <Form.Item
                            name="sample_ids"
                            label={<span className="font-black text-slate-700">选择样品</span>}
                            rules={[{ required: true, message: "请选择样品" }]}
                        >
                            <Select
                                mode="multiple"
                                placeholder="请选择需要录入的样品"
                                showSearch
                                optionFilterProp="label"
                                className="w-full rounded-xl"
                                maxTagCount="responsive"
                                options={samples.map((s) => ({
                                    label: `${s.task_lab_code || taskLabCode || ""}-${s.lab_code?.toString().padStart(4, "0")} (${s.client_code || "无客户样号"})`,
                                    value: s.id
                                }))}
                            />
                        </Form.Item>
                    )}

                    <Form.Item
                        name="item_id"
                        label={<span className="font-black text-slate-700">检测项目</span>}
                        rules={[{ required: true, message: "请选择检测项目" }]}
                    >
                        <Select
                            placeholder={scope === "samples" && (!selectedSampleIds || selectedSampleIds.length === 0) ? "请先选择样品" : "请选择检测项目"}
                            showSearch
                            optionFilterProp="label"
                            className="w-full rounded-xl"
                            disabled={scope === "samples" && (!selectedSampleIds || selectedSampleIds.length === 0)}
                            options={availableItems.map((item) => ({
                                label: item.label,
                                value: item.value
                            }))}
                        />
                    </Form.Item>

                    <Form.Item
                        name="method_id"
                        label={<span className="font-black text-slate-700">检测方法</span>}
                        rules={[{ required: true, message: "请选择检测方法" }]}
                    >
                        <Select
                            placeholder={selectedItemId ? "请选择检测方法" : "请先选择检测项目"}
                            disabled={!selectedItemId}
                            className="w-full rounded-xl"
                            options={availableMethods.map((m) => ({
                                label: m.label,
                                value: m.value
                            }))}
                        />
                    </Form.Item>
                </Form>
            </Spin>
        </Modal>
    );
};

export default DownloadTemplateModal;
