import React, { useState, useEffect } from "react";
import { Input, Space, Select, Switch, InputNumber } from "antd";

const FieldAddEdit = ({ record, onChange }) => {
    const [errors, setErrors] = useState({});
    const recordRef = React.useRef(record);
    recordRef.current = record;

    const validateInputs = React.useCallback(() => {
        const r = recordRef.current;
        const newErrors = {};

        if (!r?.name || r.name.trim() === "") {
            newErrors.name = "字段名称不可为空";
        }
        if (!r?.key || r.key.trim() === "") {
            newErrors.key = "字段键名不可为空";
        }
        
        if (r?.source_type === 1 && (!r?.input_mapped_from || r.input_mapped_from.trim() === "")) {
            newErrors.input_mapped_from = "输入数据映射来源不可为空";
        }
        if (r?.source_type === 2 && (!r?.fixed_value || r.fixed_value.trim() === "")) {
            newErrors.fixed_value = "固定值不可为空";
        }
        if (r?.source_type === 3 && (!r?.device_api || r.device_api.trim() === "")) {
            newErrors.device_api = "设备API接口不可为空";
        }
        if (r?.source_type === 4 && (!r?.code || r.code.trim() === "")) {
            newErrors.code = "计算代码不可为空";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, []);

    useEffect(() => {
        if (typeof onChange === "function" && record && !record.validate) {
            onChange({
                ...record,
                validate: validateInputs
            });
        }
    }, [onChange, record?.validate]);

    const updateField = (field, value) => {
        const nextRecord = { ...record, [field]: value, validate: validateInputs };
        if (typeof onChange === "function") {
            onChange(nextRecord);
        }
        if (errors[field]) {
            setErrors({ ...errors, [field]: null });
        }
    };

    return (
        <Space orientation="vertical" className="w-full" size="middle">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <div className="mb-2">字段名称 <span className="text-red-500">*</span></div>
                    <Input
                        placeholder="请输入显示名称"
                        value={record.name || ""}
                        onChange={(e) => updateField("name", e.target.value)}
                        status={errors.name ? "error" : ""}
                        maxLength={255}
                    />
                    {errors.name && <div className="text-red-500 text-sm mt-1">{errors.name}</div>}
                </div>
                <div>
                    <div className="mb-2">键名 (Key) <span className="text-red-500">*</span></div>
                    <Input
                        placeholder="请输入英文字段键名"
                        value={record.key || ""}
                        onChange={(e) => updateField("key", e.target.value)}
                        status={errors.key ? "error" : ""}
                        maxLength={255}
                    />
                    {errors.key && <div className="text-red-500 text-sm mt-1">{errors.key}</div>}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div>
                    <div className="mb-2">作用域 <span className="text-red-500">*</span></div>
                    <Select
                        className="w-full"
                        value={record.scope !== undefined ? record.scope : 0}
                        onChange={(val) => updateField("scope", val)}
                        options={[
                            { label: "公共参数", value: 0 },
                            { label: "结果字段", value: 1 }
                        ]}
                    />
                </div>
                <div>
                    <div className="mb-2">数据类型 <span className="text-red-500">*</span></div>
                    <Select
                        className="w-full"
                        value={record.data_type !== undefined ? record.data_type : 0}
                        onChange={(val) => updateField("data_type", val)}
                        options={[
                            { label: "文本", value: 0 },
                            { label: "数值", value: 1 },
                            { label: "日期", value: 2 }
                        ]}
                    />
                </div>
                <div>
                    <div className="mb-2">排序号 <span className="text-red-500">*</span></div>
                    <InputNumber
                        className="w-full"
                        min={0}
                        value={record.sort !== undefined ? record.sort : 0}
                        onChange={(val) => updateField("sort", val)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div>
                    <div className="mb-2">数据来源 <span className="text-red-500">*</span></div>
                    <Select
                        className="w-full"
                        value={record.source_type !== undefined ? record.source_type : 0}
                        onChange={(val) => updateField("source_type", val)}
                        options={[
                            { label: "手动录入", value: 0 },
                            { label: "输入映射", value: 1 },
                            { label: "固定值", value: 2 },
                            { label: "设备采集", value: 3 },
                            { label: "代码计算", value: 4 }
                        ]}
                    />
                </div>
                <div className="pl-2">
                    <div className="mb-2">必填控制 <span className="text-red-500">*</span></div>
                    <div className="pt-1">
                        <Switch 
                            checked={record.is_required === 1} 
                            onChange={(checked) => updateField("is_required", checked ? 1 : 0)} 
                            checkedChildren="必填" 
                            unCheckedChildren="选填"
                        />
                    </div>
                </div>
                <div className="pl-2">
                    <div className="mb-2">状态 <span className="text-red-500">*</span></div>
                    <div className="pt-1">
                        <Switch 
                            checked={record.enabled !== 0} 
                            onChange={(checked) => updateField("enabled", checked ? 1 : 0)} 
                            checkedChildren="启用" 
                            unCheckedChildren="禁用"
                        />
                    </div>
                </div>
            </div>

            {/* Dynamic fields based on source_type */}
            {record.source_type === 1 && (
                <div>
                    <div className="mb-2">输入数据映射源 <span className="text-red-500">*</span></div>
                    <Input
                        placeholder="请输入来源键名"
                        value={record.input_mapped_from || ""}
                        onChange={(e) => updateField("input_mapped_from", e.target.value)}
                        status={errors.input_mapped_from ? "error" : ""}
                        maxLength={255}
                    />
                    {errors.input_mapped_from && <div className="text-red-500 text-sm mt-1">{errors.input_mapped_from}</div>}
                </div>
            )}

            {record.source_type === 2 && (
                <div>
                    <div className="mb-2">固定值设置 <span className="text-red-500">*</span></div>
                    <Input
                        placeholder="请输入固定值内容"
                        value={record.fixed_value || ""}
                        onChange={(e) => updateField("fixed_value", e.target.value)}
                        status={errors.fixed_value ? "error" : ""}
                        maxLength={255}
                    />
                    {errors.fixed_value && <div className="text-red-500 text-sm mt-1">{errors.fixed_value}</div>}
                </div>
            )}

            {record.source_type === 3 && (
                <div>
                    <div className="mb-2">设备采集接口 API <span className="text-red-500">*</span></div>
                    <Input
                        placeholder="例如: /api/device/collect/temperature"
                        value={record.device_api || ""}
                        onChange={(e) => updateField("device_api", e.target.value)}
                        status={errors.device_api ? "error" : ""}
                        maxLength={255}
                    />
                    {errors.device_api && <div className="text-red-500 text-sm mt-1">{errors.device_api}</div>}
                </div>
            )}

            {record.source_type === 4 && (
                <div>
                    <div className="mb-2">计算代码 (JS/Expression) <span className="text-red-500">*</span></div>
                    <Input.TextArea
                        placeholder="请输入用于动态计算结果的代码片段"
                        value={record.code || ""}
                        onChange={(e) => updateField("code", e.target.value)}
                        status={errors.code ? "error" : ""}
                        rows={5}
                        className="font-mono"
                    />
                    {errors.code && <div className="text-red-500 text-sm mt-1">{errors.code}</div>}
                </div>
            )}
        </Space>
    );
};

export default FieldAddEdit;
