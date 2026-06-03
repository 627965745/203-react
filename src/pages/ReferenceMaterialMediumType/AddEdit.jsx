import { useState, useEffect } from "react";
import { Input, Space } from "antd";

const AddEdit = ({ record, onChange }) => {
    const [errors, setErrors] = useState({});

    const validateInputs = () => {
        const newErrors = {};

        if (!record?.name || record.name.trim() === "") {
            newErrors.name = "介质类型名称不可为空";
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
                <div className="mb-2">名称 <span className="text-red-500">*</span></div>
                <Input
                    placeholder="请输入介质类型名称"
                    value={record.name || ""}
                    onChange={(e) => updateField("name", e.target.value)}
                    status={errors.name ? "error" : ""}
                    maxLength={255}
                />
                {errors.name && <div className="text-red-500 text-sm mt-1">{errors.name}</div>}
            </div>
        </Space>
    );
};

export default AddEdit;
