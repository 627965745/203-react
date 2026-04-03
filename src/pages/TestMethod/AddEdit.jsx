import { useState, useEffect } from "react";
import { Input, Space } from "antd";

const AddEdit = ({ record, onChange }) => {
    const [errors, setErrors] = useState({});

    const validateInputs = () => {
        const newErrors = {};

        if (!record?.name || record.name.trim() === "") {
            newErrors.name = "检测方法名称不可为空";
        }
        if (!record?.code || record.code.trim() === "") {
            newErrors.code = "国标代码不可为空";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    useEffect(() => {
        if (typeof onChange === "function") {
            onChange.validate = validateInputs;
        }
    }, [record, onChange]);

    const updateField = (field, value) => {
        onChange({ ...record, [field]: value });
        if (errors[field]) {
            setErrors({ ...errors, [field]: null });
        }
    };

    return (
        <Space orientation="vertical" className="w-full" size="middle">
            <div>
                <div className="mb-2">检测方法名称 <span className="text-red-500">*</span></div>
                <Input
                    placeholder="请输入检测方法名称"
                    value={record.name || ""}
                    onChange={(e) => updateField("name", e.target.value)}
                    status={errors.name ? "error" : ""}
                    maxLength={255}
                />
                {errors.name && <div className="text-red-500 text-sm mt-1">{errors.name}</div>}
            </div>

            <div>
                <div className="mb-2">国标代码 <span className="text-red-500">*</span></div>
                <Input
                    placeholder="例如: GB/T 12345-2023"
                    value={record.code || ""}
                    onChange={(e) => updateField("code", e.target.value)}
                    status={errors.code ? "error" : ""}
                    maxLength={255}
                />
                {errors.code && <div className="text-red-500 text-sm mt-1">{errors.code}</div>}
            </div>
        </Space>
    );
};

export default AddEdit;
