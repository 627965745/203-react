import React, { useState, useEffect } from "react";
import { Input, Space, Select, InputNumber } from "antd";

// V6.1: batchEditable —— 后端只有 WorkflowManager/Sample/update 会真正写入 batch；
//     TestingManager 和 DepartmentManager 的同名接口收下 batch、返回 status=0，却把值丢掉
//     （2026-08-26 实测：整条记录原样回传、只改 batch=4，写完读回来仍是 null）。
//     这两个模块把输入框置灰只读 —— 既不让人白填，也还能看到当前批次是多少。
//     后端修好之后，把那两个页面的 batchEditable={false} 去掉即可。
const AddEdit = ({ record, onChange, apis = {}, batchEditable = true }) => {
    const { comboTask } = apis;
    const [errors, setErrors] = useState({});
    const [taskOptions, setTaskOptions] = useState([]);
    const [loading, setLoading] = useState({ task: false });

    const validateInputs = () => {
        const newErrors = {};

        if (!record?.task_id) {
            newErrors.task_id = "请选择所属任务";
        }
        if (apis.distributeType !== "inspector") {
            if (!record?.client_code || record.client_code.trim() === "") {
                newErrors.client_code = "请输入客户方样品编号";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    useEffect(() => {
        if (typeof onChange === "function") {
            onChange.validate = validateInputs;
        }
    }, [record, onChange]);

    // Fetch Task Combo
    useEffect(() => {
        const fetchTasks = async () => {
            if (!comboTask) return;
            setLoading((prev) => ({ ...prev, task: true }));
            try {
                const res = await comboTask();
                if (res.data.status === 0) {
                    const rawData = res.data.data;
                    const list = Array.isArray(rawData)
                        ? rawData
                        : rawData?.rows || [];
                    setTaskOptions(
                        list.map((t) => ({
                            label: `${t.name || t.task_name} (#${t.id})`,
                            value: t.id,
                        })),
                    );
                }
            } catch (error) {
                console.error("Fetch tasks error:", error);
            } finally {
                setLoading((prev) => ({ ...prev, task: false }));
            }
        };
        fetchTasks();
    }, [comboTask]);

    const updateField = (field, value) => {
        const newRecord = { ...record, [field]: value };
        onChange(newRecord);
        if (errors[field]) {
            setErrors({ ...errors, [field]: null });
        }
    };

    return (
        <Space direction="vertical" className="w-full" size="middle">
            <div
                className={
                    apis.distributeType === "inspector"
                        ? "grid grid-cols-1 gap-4"
                        : "grid grid-cols-2 gap-4"
                }
            >
                <div>
                    <div className="mb-2 font-bold text-gray-700">
                        所属任务 <span className="text-red-500">*</span>
                    </div>
                    <Select
                        className="w-full"
                        placeholder="请选择所属任务"
                        loading={loading.task}
                        options={taskOptions}
                        value={record.task_id}
                        onChange={(val) => updateField("task_id", val)}
                        status={errors.task_id ? "error" : ""}
                        showSearch
                        optionFilterProp="label"
                        disabled={!!record.id} // Usually task_id shouldn't change on edit
                    />
                    {errors.task_id && (
                        <div className="text-red-500 text-sm mt-1">
                            {errors.task_id}
                        </div>
                    )}
                </div>
                {apis.distributeType !== "inspector" && (
                    <div>
                        <div className="mb-2 font-bold text-gray-700">
                            业务原始编号 <span className="text-red-500">*</span>
                        </div>
                        <Input
                            placeholder="请输入业务原始编号"
                            value={record.client_code || ""}
                            onChange={(e) =>
                                updateField("client_code", e.target.value)
                            }
                            status={errors.client_code ? "error" : ""}
                            maxLength={255}
                        />
                        {errors.client_code && (
                            <div className="text-red-500 text-sm mt-1">
                                {errors.client_code}
                            </div>
                        )}
                        {/* V4: 数据库新增唯一索引 uq_samples_client_code(task_id, client_code)，
                            同一任务下重复的客户样号会被后端拒绝 */}
                        {!errors.client_code && (
                            <div className="text-[11px] text-slate-400 mt-1">
                                同一任务下不可重复
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* V5: 样品新增批次(batch) —— create 接受可选 batch（≥1，不传为 NULL 未分批）；
                update 也已由后端支持写入。批量改批次请用样品列表的「设置批次」(batchSet)。 */}
            {/* V6.1: 后端不写入 batch 的模块置灰只读（见文件顶部注释） */}
            <div>
                <div className="mb-2 font-bold text-gray-700">批次号</div>
                <InputNumber
                    className="w-full"
                    min={1}
                    precision={0}
                    disabled={!batchEditable}
                    value={record.batch ?? null}
                    onChange={(val) => updateField("batch", val ?? null)}
                />
                <div className="text-[11px] text-slate-400 mt-1">
                    {batchEditable
                        ? "留空表示未分批；如需批量修改可用样品列表的「批量操作」"
                        : "本模块暂不支持修改批次，请在管理组的样品管理中调整"}
                </div>
            </div>

            <div>
                <div className="mb-2 font-bold text-gray-700">样品备注</div>
                <Input.TextArea
                    placeholder="输入样品辅助说明信息"
                    value={record.description || ""}
                    onChange={(e) => updateField("description", e.target.value)}
                    rows={3}
                    maxLength={1000}
                />
            </div>
        </Space>
    );
};

export default AddEdit;
