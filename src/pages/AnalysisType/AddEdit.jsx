import { useState, useEffect } from "react";
import { Input, Space } from "antd";

const AddEdit = ({ record, onChange }) => {
    const [errors, setErrors] = useState({});

    const validateInputs = () => {
        const newErrors = {};

        if (!record?.name || record.name.trim() === "") {
            newErrors.name = "分析类型名称不可为空";
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
        <Space orientation="vertical" className="w-full">
            <div>
                <div className="mb-2">类型名称 <span className="text-red-500">*</span></div>
                <Input
                    placeholder="请输入分析类型名称"
                    value={record.name || ""}
                    onChange={(e) => {
                        onChange({ ...record, name: e.target.value });
                        if (errors.name) setErrors({...errors, name: null});
                    }}
                    status={errors.name ? "error" : ""}
                    maxLength={255}
                />
                {errors.name && (
                    <div className="text-red-500 text-sm mt-1">
                        {errors.name}
                    </div>
                )}
            </div>
        </Space>
    );
};

export default AddEdit;
