import { useState, useEffect } from "react";
import { Input, Space, InputNumber, Alert } from "antd";

const AddEdit = ({ record, onChange }) => {
    const [errors, setErrors] = useState({});

    const validateInputs = () => {
        const newErrors = {};

        if (!record?.name || record.name.trim() === "") {
            newErrors.name = "角色名称不可为空";
        }
        if (record?.bitwise === undefined || record.bitwise === null) {
            newErrors.bitwise = "权限位不可为空";
        } else if (record.bitwise < 0 || record.bitwise >= 32) {
            newErrors.bitwise = "权限位需在 0 到 31 之间";
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
                <div className="mb-2">角色名称 <span className="text-red-500">*</span></div>
                <Input
                    placeholder="请输入角色名称"
                    value={record.name || ""}
                    onChange={(e) => updateField("name", e.target.value)}
                    status={errors.name ? "error" : ""}
                    maxLength={255}
                />
                {errors.name && <div className="text-red-500 text-sm mt-1">{errors.name}</div>}
            </div>

            <div>
                <div className="mb-2">权限位 <span className="text-red-500">*</span></div>
                <InputNumber
                    className="w-full"
                    placeholder="请输入权限位 (0-31)"
                    value={record.bitwise}
                    onChange={(val) => updateField("bitwise", val)}
                    status={errors.bitwise ? "error" : ""}
                    min={0}
                    max={31}
                    precision={0}
                />
                <div className="text-xs text-gray-400 mt-1">
                    系统权限按位运算 (2^bitwise)，通常用于后端权限控制逻辑。
                </div>
                {errors.bitwise && <div className="text-red-500 text-sm mt-1">{errors.bitwise}</div>}
            </div>

            <Alert
                message="权限位说明"
                description={
                    <ul className="text-xs list-disc pl-4">
                        <li>每个角色应具有唯一的权限位。</li>
                        <li>权限值 = 1 {'<<'} 权限位。</li>
                        <li>范围：0 到 31。</li>
                    </ul>
                }
                type="info"
                showIcon
            />
        </Space>
    );
};

export default AddEdit;
