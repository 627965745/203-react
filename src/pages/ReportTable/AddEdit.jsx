import { useState, useEffect } from "react";
import { Input, Space } from "antd";

const AddEdit = ({ record, onChange }) => {
    const [errors, setErrors] = useState({});

    const validateInputs = () => {
        const newErrors = {};

        if (!record?.name || record.name.trim() === "") {
            newErrors.name = "表名称不可为空";
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
            <div>
                <div className="mb-2">表名称 <span className="text-red-500">*</span></div>
                <Input
                    placeholder="请输入报告数据表名称"
                    value={record.name || ""}
                    onChange={(e) => {
                        onChange({ ...record, name: e.target.value });
                        if (errors.name) setErrors({ ...errors, name: null });
                    }}
                    status={errors.name ? "error" : ""}
                    maxLength={255}
                />
                {errors.name && <div className="text-red-500 text-sm mt-1">{errors.name}</div>}
            </div>

            <div>
                <div className="mb-2">描述</div>
                <Input.TextArea
                    placeholder="请输入数据表的详细描述信息"
                    value={record.description || ""}
                    onChange={(e) => onChange({ ...record, description: e.target.value })}
                    maxLength={255}
                    rows={4}
                />
            </div>
        </Space>
    );
};

export default AddEdit;
