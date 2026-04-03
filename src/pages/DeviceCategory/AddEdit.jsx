import { useState, useEffect } from "react";
import { Input, Space } from "antd";

const AddEdit = ({ record, onChange }) => {
    const [errors, setErrors] = useState({});

    const validateInputs = () => {
        const newErrors = {};

        if (!record?.code || record.code.trim() === "") {
            newErrors.code = "分类编码不可为空";
        }
        if (!record?.name || record.name.trim() === "") {
            newErrors.name = "分类名称不可为空";
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
                <div className="mb-2">分类编码 <span className="text-red-500">*</span></div>
                <Input
                    placeholder="请输入分类编码"
                    value={record.code || ""}
                    onChange={(e) => {
                        onChange({ ...record, code: e.target.value });
                        if (errors.code) setErrors({...errors, code: null});
                    }}
                    status={errors.code ? "error" : ""}
                    maxLength={255}
                />
                {errors.code && (
                    <div className="text-red-500 text-sm mt-1">
                        {errors.code}
                    </div>
                )}
            </div>
            <div>
                <div className="mb-2">分类名称 <span className="text-red-500">*</span></div>
                <Input
                    placeholder="请输入分类名称"
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
