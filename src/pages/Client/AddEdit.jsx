import { useState, useEffect } from "react";
import { Input, Space } from "antd";

const AddEdit = ({ record, onChange }) => {
    const [errors, setErrors] = useState({});

    const validateInputs = () => {
        const newErrors = {};

        if (!record?.name || record.name.trim() === "") {
            newErrors.name = "客户名称不可为空";
        }
        
        if (!record?.tax_code || record.tax_code.trim() === "") {
            newErrors.tax_code = "统一社会信用代码不可为空";
        } else if (record.tax_code.trim().length !== 18) {
            newErrors.tax_code = "统一社会信用代码必须为18位";
        }
        
        if (!record?.email || record.email.trim() === "") {
            newErrors.email = "邮箱不可为空";
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(record.email.trim())) {
                newErrors.email = "邮箱格式不正确";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    useEffect(() => {
        if (typeof onChange === "function") {
            onChange.validate = validateInputs;
        }
    }, [record]);

    return (
        <Space orientation="vertical" className="w-full">
            <div className="flex gap-4">
                <div className="flex-1">
                    <div className="mb-2">客户名称 <span className="text-red-500">*</span></div>
                    <Input
                        placeholder="请输入客户名称"
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

                <div className="flex-1">
                    <div className="mb-2">统一社会信用代码 <span className="text-red-500">*</span></div>
                    <Input
                        placeholder="请输入18位统一社会信用代码"
                        value={record.tax_code || ""}
                        onChange={(e) => {
                            onChange({ ...record, tax_code: e.target.value });
                            if (errors.tax_code) setErrors({...errors, tax_code: null});
                        }}
                        status={errors.tax_code ? "error" : ""}
                        maxLength={18}
                    />
                    {errors.tax_code && (
                        <div className="text-red-500 text-sm mt-1">
                            {errors.tax_code}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex gap-4">
                <div className="flex-1">
                    <div className="mb-2">联系人姓名</div>
                    <Input
                        placeholder="请输入联系人姓名"
                        value={record.contact || ""}
                        onChange={(e) => onChange({ ...record, contact: e.target.value })}
                        maxLength={255}
                    />
                </div>
                <div className="flex-1">
                    <div className="mb-2">联系人手机</div>
                    <Input
                        placeholder="请输入联系人电话"
                        value={record.mobile || ""}
                        onChange={(e) => onChange({ ...record, mobile: e.target.value })}
                        maxLength={255}
                    />
                </div>
            </div>

            <div className="flex gap-4">
                <div className="flex-1">
                    <div className="mb-2">固定电话</div>
                    <Input
                        placeholder="请输入固定电话"
                        value={record.landline || ""}
                        onChange={(e) => onChange({ ...record, landline: e.target.value })}
                        maxLength={255}
                    />
                </div>
                <div className="flex-1">
                    <div className="mb-2">邮箱 <span className="text-red-500">*</span></div>
                    <Input
                        placeholder="请输入邮箱地址"
                        value={record.email || ""}
                        onChange={(e) => {
                            onChange({ ...record, email: e.target.value });
                            if (errors.email) setErrors({...errors, email: null});
                        }}
                        status={errors.email ? "error" : ""}
                        maxLength={255}
                    />
                    {errors.email && (
                        <div className="text-red-500 text-sm mt-1">
                            {errors.email}
                        </div>
                    )}
                </div>
            </div>

            <div>
                <div className="mb-2">联系地址</div>
                <Input.TextArea
                    placeholder="请输入联系地址"
                    value={record.address || ""}
                    onChange={(e) => onChange({ ...record, address: e.target.value })}
                    maxLength={255}
                    rows={3}
                />
            </div>
        </Space>
    );
};

export default AddEdit;
