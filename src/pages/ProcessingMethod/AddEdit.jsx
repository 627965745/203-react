import { useState, useEffect } from "react";
import { Input, Space, Switch } from "antd";

const AddEdit = ({ record, onChange }) => {
    const [errors, setErrors] = useState({});

    const validateInputs = () => {
        const newErrors = {};

        if (!record?.name || record.name.trim() === "") {
            newErrors.name = "加工方法名称不可为空";
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
        <Space orientation="vertical" className="w-full" size="large">
            <div>
                <div className="mb-2">加工方法名称 <span className="text-red-500">*</span></div>
                <Input
                    placeholder="请输入名称"
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
            
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">是否启用:</span>
                <Switch 
                    checked={record.enabled === 1} 
                    onChange={(checked) => onChange({ ...record, enabled: checked ? 1 : 0 })}
                    size="small"
                />
            </div>
        </Space>
    );
};

export default AddEdit;
