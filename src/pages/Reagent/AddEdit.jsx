import { useState, useEffect } from "react";
import { Input, Space, Select, InputNumber } from "antd";

const ReagentCategoryOptions = [
    { label: "易制毒", value: 0 },
    { label: "易制爆", value: 1 },
    { label: "一般试剂", value: 2 },
];

const AddEdit = ({ record, onChange }) => {
    const [errors, setErrors] = useState({});

    const validateInputs = () => {
        const newErrors = {};

        if (!record?.name || record.name.trim() === "") {
            newErrors.name = "试剂名称不可为空";
        }
        if (record?.category === undefined || record?.category === null) {
            newErrors.category = "清选择分类";
        }
        if (!record?.unit || record.unit.trim() === "") {
            newErrors.unit = "请输入单位";
        }
        if (record?.alert_threshold === undefined || record?.alert_threshold === null) {
            newErrors.alert_threshold = "请输入报警阈值";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    useEffect(() => {
        if (typeof onChange === "function") {
            onChange.validate = validateInputs;
        }
    }, [record, onChange]);

    return (
        <Space orientation="vertical" className="w-full" size="middle">
            <div className="flex gap-4">
                <div className="flex-1">
                    <div className="mb-2">试剂名称 <span className="text-red-500">*</span></div>
                    <Input
                        placeholder="请输入试剂名称"
                        value={record.name || ""}
                        onChange={(e) => {
                            onChange({ ...record, name: e.target.value });
                            if (errors.name) setErrors({...errors, name: null});
                        }}
                        status={errors.name ? "error" : ""}
                        maxLength={255}
                    />
                    {errors.name && <div className="text-red-500 text-sm mt-1">{errors.name}</div>}
                </div>
                <div className="w-1/3">
                    <div className="mb-2">试剂类型 <span className="text-red-500">*</span></div>
                    <Select
                        className="w-full"
                        placeholder="请选择类型"
                        options={ReagentCategoryOptions}
                        value={record.category}
                        onChange={(val) => {
                            onChange({ ...record, category: val });
                            if (errors.category) setErrors({...errors, category: null});
                        }}
                        status={errors.category ? "error" : ""}
                    />
                    {errors.category && <div className="text-red-500 text-sm mt-1">{errors.category}</div>}
                </div>
            </div>

            <div className="flex gap-4">
                <div className="flex-1">
                    <div className="mb-2">单位 <span className="text-red-500">*</span></div>
                    <Input
                        placeholder="例如: 瓶, L, kg"
                        value={record.unit || ""}
                        onChange={(e) => {
                            onChange({ ...record, unit: e.target.value });
                            if (errors.unit) setErrors({...errors, unit: null});
                        }}
                        status={errors.unit ? "error" : ""}
                        maxLength={255}
                    />
                    {errors.unit && <div className="text-red-500 text-sm mt-1">{errors.unit}</div>}
                </div>
                <div className="flex-1">
                    <div className="mb-2">报警阈值 <span className="text-red-500">*</span></div>
                    <InputNumber
                        className="w-full"
                        min={0}
                        placeholder="库存低于此值报警"
                        value={record.alert_threshold}
                        onChange={(val) => {
                            onChange({ ...record, alert_threshold: val });
                            if (errors.alert_threshold) setErrors({...errors, alert_threshold: null});
                        }}
                        status={errors.alert_threshold ? "error" : ""}
                    />
                    {errors.alert_threshold && <div className="text-red-500 text-sm mt-1">{errors.alert_threshold}</div>}
                </div>
            </div>

            <div>
                <div className="mb-2">安全合规警示贴文件路径</div>
                <Input
                    placeholder="请输入合规警示贴文件路径 (可选)"
                    value={record.sticker_file || ""}
                    onChange={(e) => onChange({ ...record, sticker_file: e.target.value })}
                    maxLength={255}
                />
            </div>

            <div>
                <div className="mb-2">试剂描述</div>
                <Input.TextArea
                    placeholder="请输入试剂的规格、特性等描述信息"
                    value={record.description || ""}
                    onChange={(e) => onChange({ ...record, description: e.target.value })}
                    maxLength={255}
                    rows={3}
                />
            </div>
        </Space>
    );
};

export default AddEdit;
