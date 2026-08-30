import { useState, useEffect } from "react";
import { Input, Space, Select, InputNumber, DatePicker } from "antd";
import dayjs from "dayjs";

// V5: 全新模块「标准样品」（ReferenceSample）—— 由 v4 ReferenceMaterial 的 category=0
//     「标准物质」拆分而来。本模块没有 category / stage / medium_type_id，
//     成分含量表改由 ComponentModal 单独维护。
const PhysicalStateOptions = [
    { label: "固态", value: 0 },
    { label: "液态", value: 1 },
    { label: "气态", value: 2 },
];

const AddEdit = ({ record, onChange }) => {
    const [errors, setErrors] = useState({});
    // 编辑态才允许改余量：创建时后端自动令 remaining = specification
    const isEdit = !!record?.id;

    const validateInputs = () => {
        const newErrors = {};

        if (!record?.name || record.name.trim() === "") {
            newErrors.name = "名称不可为空";
        }
        // V5: lab_code（内部编码）由可空改为必填，且全库唯一
        if (!record?.lab_code || record.lab_code.trim() === "") {
            newErrors.lab_code = "内部编码不可为空（全库唯一）";
        }
        if (
            record?.physical_state === undefined ||
            record?.physical_state === null
        ) {
            newErrors.physical_state = "请选择物理形态";
        }
        if (
            record?.unit === undefined ||
            record?.unit === null ||
            record.unit.trim() === ""
        ) {
            newErrors.unit = "单位不可为空";
        }
        if (
            record?.specification === undefined ||
            record?.specification === null
        ) {
            newErrors.specification = "规格不可为空";
        }
        if (
            record?.alert_threshold === undefined ||
            record?.alert_threshold === null
        ) {
            newErrors.alert_threshold = "报警阈值不可为空";
        }
        // V5: update 才有 remaining，且后端要求余量不可大于规格（否则 status=101）
        if (isEdit) {
            if (record?.remaining === undefined || record?.remaining === null) {
                newErrors.remaining = "余量不可为空";
            } else if (
                Number(record.remaining) > Number(record.specification)
            ) {
                newErrors.remaining = "余量不可大于规格";
            }
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
            <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                    <div className="mb-2">
                        名称 <span className="text-red-500">*</span>
                    </div>
                    <Input
                        placeholder="如：土壤成分分析标准物质"
                        value={record.name || ""}
                        onChange={(e) => updateField("name", e.target.value)}
                        status={errors.name ? "error" : ""}
                        maxLength={255}
                    />
                    {errors.name && (
                        <div className="text-red-500 text-sm mt-1">
                            {errors.name}
                        </div>
                    )}
                </div>
                <div>
                    <div className="mb-2">
                        物理形态 <span className="text-red-500">*</span>
                    </div>
                    <Select
                        className="w-full"
                        placeholder="请选择物理形态"
                        options={PhysicalStateOptions}
                        value={record.physical_state}
                        onChange={(val) => updateField("physical_state", val)}
                        status={errors.physical_state ? "error" : ""}
                    />
                    {errors.physical_state && (
                        <div className="text-red-500 text-sm mt-1">
                            {errors.physical_state}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                {/* V5: lab_code 必填且全库唯一 */}
                <div>
                    <div className="mb-2">
                        内部编码 <span className="text-red-500">*</span>
                    </div>
                    <Input
                        placeholder="如：RM-001"
                        value={record.lab_code || ""}
                        onChange={(e) =>
                            updateField("lab_code", e.target.value)
                        }
                        status={errors.lab_code ? "error" : ""}
                        maxLength={255}
                    />
                    {errors.lab_code ? (
                        <div className="text-red-500 text-sm mt-1">
                            {errors.lab_code}
                        </div>
                    ) : (
                        <div className="text-[11px] text-slate-400 mt-1">
                            全库唯一，不可重复
                        </div>
                    )}
                </div>
                <div>
                    <div className="mb-2">样品编码</div>
                    <Input
                        placeholder="如：GBW07401"
                        value={record.sample_code || ""}
                        onChange={(e) =>
                            updateField("sample_code", e.target.value)
                        }
                        maxLength={255}
                    />
                </div>
                <div>
                    <div className="mb-2">批号</div>
                    <Input
                        placeholder="如：2024-01"
                        value={record.batch_code || ""}
                        onChange={(e) =>
                            updateField("batch_code", e.target.value)
                        }
                        maxLength={255}
                    />
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
                <div>
                    <div className="mb-2">
                        单位 <span className="text-red-500">*</span>
                    </div>
                    <Input
                        placeholder="单位(g/mL等)"
                        value={record.unit || ""}
                        onChange={(e) => updateField("unit", e.target.value)}
                        status={errors.unit ? "error" : ""}
                        maxLength={50}
                    />
                    {errors.unit && (
                        <div className="text-red-500 text-sm mt-1">
                            {errors.unit}
                        </div>
                    )}
                </div>
                <div>
                    <div className="mb-2">
                        规格 <span className="text-red-500">*</span>
                    </div>
                    <InputNumber
                        className="w-full"
                        min={0}
                        placeholder="规格"
                        value={record.specification}
                        onChange={(val) => updateField("specification", val)}
                        status={errors.specification ? "error" : ""}
                    />
                    {errors.specification && (
                        <div className="text-red-500 text-sm mt-1">
                            {errors.specification}
                        </div>
                    )}
                </div>
                {/* V5: 创建时后端自动令 remaining = specification，因此新建表单不出现余量 */}
                {isEdit ? (
                    <div>
                        <div className="mb-2">
                            余量 <span className="text-red-500">*</span>
                        </div>
                        <InputNumber
                            className="w-full"
                            min={0}
                            placeholder="余量"
                            value={record.remaining}
                            onChange={(val) => updateField("remaining", val)}
                            status={errors.remaining ? "error" : ""}
                        />
                        {errors.remaining && (
                            <div className="text-red-500 text-sm mt-1">
                                {errors.remaining}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-end pb-2">
                        <span className="text-[11px] text-slate-400 leading-snug">
                            新建时余量自动等于规格
                        </span>
                    </div>
                )}
                <div>
                    <div className="mb-2">
                        报警阈值 <span className="text-red-500">*</span>
                    </div>
                    <InputNumber
                        className="w-full"
                        min={0}
                        placeholder="报警阈值"
                        value={record.alert_threshold}
                        onChange={(val) => updateField("alert_threshold", val)}
                        status={errors.alert_threshold ? "error" : ""}
                    />
                    {errors.alert_threshold && (
                        <div className="text-red-500 text-sm mt-1">
                            {errors.alert_threshold}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div>
                    <div className="mb-2">研制单位</div>
                    <Input
                        placeholder="研制单位"
                        value={record.vendor || ""}
                        onChange={(e) => updateField("vendor", e.target.value)}
                        maxLength={255}
                    />
                </div>
                <div>
                    <div className="mb-2">存放地点</div>
                    <Input
                        placeholder="存放地点"
                        value={record.location || ""}
                        onChange={(e) =>
                            updateField("location", e.target.value)
                        }
                        maxLength={255}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="mb-2">定值日期</div>
                        <DatePicker
                            className="w-full"
                            placeholder="定值日期"
                            value={
                                record.confirmed_at
                                    ? dayjs(record.confirmed_at)
                                    : null
                            }
                            onChange={(date, dateString) =>
                                updateField("confirmed_at", dateString || null)
                            }
                        />
                    </div>
                    <div>
                        <div className="mb-2">有效期至</div>
                        <DatePicker
                            className="w-full"
                            placeholder="有效期至"
                            value={
                                record.expiring_at
                                    ? dayjs(record.expiring_at)
                                    : null
                            }
                            onChange={(date, dateString) =>
                                updateField("expiring_at", dateString || null)
                            }
                        />
                    </div>
                </div>
            </div>
        </Space>
    );
};

export default AddEdit;
