import React, { useState, useEffect } from "react";
import { Input, Space, Select, Switch } from "antd";

const FieldAddEdit = ({ record, onChange }) => {
    const [errors, setErrors] = useState({});

    const validateInputs = () => {
        const newErrors = {};

        if (!record?.name || record.name.trim() === "") {
            newErrors.name = "字段名称不可为空";
        }
        if (!record?.key || record.key.trim() === "") {
            newErrors.key = "字段键名不可为空";
        }
        
        if (record?.type === 1 && (!record?.input_mapped_from || record.input_mapped_from.trim() === "")) {
            newErrors.input_mapped_from = "输入数据映射来源不可为空";
        }
        if (record?.type === 2 && (!record?.result_mapped_from || record.result_mapped_from.trim() === "")) {
            newErrors.result_mapped_from = "检测结果映射来源不可为空";
        }
        if (record?.type === 3 && (!record?.fixed_value || record.fixed_value.trim() === "")) {
            newErrors.fixed_value = "固定值不可为空";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    useEffect(() => {
        if (typeof onChange === "function") {
            // We pass the validation function through the setState updater workaround
            onChange((prev) => {
                const next = typeof prev === 'function' ? prev() : prev;
                if (!next) return next;
                return {
                    ...next,
                    validate: validateInputs
                };
            });
        }
    }, [record, onChange]);

    const updateField = (field, value) => {
        const nextRecord = { ...record, [field]: value };
        if (typeof onChange === "function") {
            // Pass value and preserve validate
            onChange({ ...nextRecord, validate: record.validate || validateInputs });
        }
        if (errors[field]) {
            setErrors({ ...errors, [field]: null });
        }
    };

    return (
        <Space orientation="vertical" className="w-full" size="middle">
            <div>
                <div className="mb-2">字段名称 <span className="text-red-500">*</span></div>
                <Input
                    placeholder="请输入字段名称"
                    value={record.name || ""}
                    onChange={(e) => updateField("name", e.target.value)}
                    status={errors.name ? "error" : ""}
                    maxLength={255}
                />
                {errors.name && <div className="text-red-500 text-sm mt-1">{errors.name}</div>}
            </div>

            <div>
                <div className="mb-2">字段键名 (Key) <span className="text-red-500">*</span></div>
                <Input
                    placeholder="Word书签或占位符标记 (如: project_name)"
                    value={record.key || ""}
                    onChange={(e) => updateField("key", e.target.value)}
                    status={errors.key ? "error" : ""}
                    maxLength={255}
                />
                {errors.key && <div className="text-red-500 text-sm mt-1">{errors.key}</div>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <div className="mb-2">字段类型 <span className="text-red-500">*</span></div>
                    <Select
                        className="w-full"
                        value={record.type !== undefined ? record.type : 0}
                        onChange={(val) => updateField("type", val)}
                        options={[
                            { label: "手动录入", value: 0 },
                            { label: "输入数据映射", value: 1 },
                            { label: "检测结果映射", value: 2 },
                            { label: "固定值", value: 3 },
                        ]}
                    />
                </div>
                <div>
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

            {record.type === 1 && (
                <div>
                    <div className="mb-2">输入数据映射配置 <span className="text-red-500">*</span></div>
                    <Input
                        placeholder="请输入引用的输入数据字段"
                        value={record.input_mapped_from || ""}
                        onChange={(e) => updateField("input_mapped_from", e.target.value)}
                        status={errors.input_mapped_from ? "error" : ""}
                        maxLength={255}
                    />
                    {errors.input_mapped_from && <div className="text-red-500 text-sm mt-1">{errors.input_mapped_from}</div>}
                </div>
            )}

            {record.type === 2 && (
                <div>
                    <div className="mb-2">检测结果映射配置 <span className="text-red-500">*</span></div>
                    <Input
                        placeholder="请输入引用的结果字段"
                        value={record.result_mapped_from || ""}
                        onChange={(e) => updateField("result_mapped_from", e.target.value)}
                        status={errors.result_mapped_from ? "error" : ""}
                        maxLength={255}
                    />
                    {errors.result_mapped_from && <div className="text-red-500 text-sm mt-1">{errors.result_mapped_from}</div>}
                </div>
            )}

            {record.type === 3 && (
                <div>
                    <div className="mb-2">固定值设置 <span className="text-red-500">*</span></div>
                    <Input
                        placeholder="请输入该字段的固定内容"
                        value={record.fixed_value || ""}
                        onChange={(e) => updateField("fixed_value", e.target.value)}
                        status={errors.fixed_value ? "error" : ""}
                        maxLength={255}
                    />
                    {errors.fixed_value && <div className="text-red-500 text-sm mt-1">{errors.fixed_value}</div>}
                </div>
            )}
        </Space>
    );
};

export default FieldAddEdit;
