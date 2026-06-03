import { useState, useEffect } from "react";
import { Input, Space, Select, InputNumber, Switch, Button, message } from "antd";
import { ControlOutlined, BarcodeOutlined } from "@ant-design/icons";
import { getScaleReading, getScannerReading } from "../../api/externalDevice";
import { comboReagentStorage } from "../../api/reagentStorage";

const AddEdit = ({ record, onChange }) => {
    const [errors, setErrors] = useState({});
    const [storages, setStorages] = useState([]);
    const [loading, setLoading] = useState(false);

    const isEdit = !!record?.id;

    useEffect(() => {
        const fetchStorages = async () => {
            setLoading(true);
            try {
                const res = await comboReagentStorage();
                if (res.data.status === 0 || res.data.code === 0) {
                    setStorages(res.data.data || []);
                }
            } catch (err) {
                console.error("Failed to fetch storages", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStorages();
    }, []);

    const validateInputs = () => {
        const newErrors = {};

        if (record?.specification === undefined || record?.specification === null) {
            newErrors.specification = "请输入规格";
        }
        if (!isEdit && (record?.quantity === undefined || record?.quantity === null)) {
            newErrors.quantity = "请输入重量/余量";
        }
        if (!record?.storage_id) {
            newErrors.storage_id = "请选择试剂柜";
        }
        if (record?.row === undefined || record?.row === null) {
            newErrors.row = "请输入所在行号";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    useEffect(() => {
        if (typeof onChange === "function") {
            onChange.validate = validateInputs;
        }
    }, [record, onChange, isEdit]);

    return (
        <Space orientation="vertical" className="w-full" size="middle">
            <div className="flex gap-4">
                <div className="flex-1">
                    <div className="mb-2">试剂柜 <span className="text-red-500">*</span></div>
                    <Select
                        className="w-full"
                        placeholder="请选择存放试剂柜"
                        loading={loading}
                        options={storages.map(s => ({ label: s.name, value: s.id }))}
                        value={record.storage_id}
                        onChange={(val) => {
                            onChange({ ...record, storage_id: val });
                            if (errors.storage_id) setErrors({...errors, storage_id: null});
                        }}
                        status={errors.storage_id ? "error" : ""}
                        showSearch
                        optionFilterProp="label"
                    />
                    {errors.storage_id && <div className="text-red-500 text-sm mt-1">{errors.storage_id}</div>}
                </div>
                <div className="flex-1">
                    <div className="mb-2">所在行号 <span className="text-red-500">*</span></div>
                    <InputNumber
                        style={{ width: '100%' }}
                        min={1}
                        placeholder="第几行"
                        value={record.row}
                        onChange={(val) => {
                            onChange({ ...record, row: val });
                            if (errors.row) setErrors({...errors, row: null});
                        }}
                        status={errors.row ? "error" : ""}
                    />
                    {errors.row && <div className="text-red-500 text-sm mt-1">{errors.row}</div>}
                </div>
            </div>

            <div className="flex gap-4">
                <div className="flex-1">
                    <div className="mb-2">规格 <span className="text-red-500">*</span></div>
                    <Input
                        className="w-full"
                        placeholder="请输入规格数值"
                        value={record.specification}
                        onChange={(e) => {
                            onChange({ ...record, specification: e.target.value });
                            if (errors.specification) setErrors({...errors, specification: null});
                        }}
                        status={errors.specification ? "error" : ""}
                    />
                    {errors.specification && <div className="text-red-500 text-sm mt-1">{errors.specification}</div>}
                </div>
                {!isEdit && (
                    <div className="flex-1">
                        <div className="mb-2">重量/余量 (实际称重) <span className="text-red-500">*</span></div>
                        <Space.Compact style={{ width: '100%' }}>
                            <Input
                                style={{ width: 'calc(100% - 80px)' }}
                                placeholder="请输入重量"
                                value={record.quantity}
                                onChange={(e) => {
                                    onChange({ ...record, quantity: e.target.value });
                                    if (errors.quantity) setErrors({...errors, quantity: null});
                                }}
                                status={errors.quantity ? "error" : ""}
                            />
                            <Button style={{ width: '100px' }} icon={<ControlOutlined />} onClick={async () => {
                                try {
                                    const res = await getScaleReading();
                                    if (res.data.status === 0) {
                                        onChange({ ...record, quantity: String(res.data.data) });
                                        if (errors.quantity) setErrors({...errors, quantity: null});
                                        message.success(`已读取称重: ${res.data.data}`);
                                    } else {
                                        message.error("电子秤读取失败: " + res.data.message);
                                    }
                                } catch (e) {
                                    message.error("电子秤连接异常");
                                }
                            }}>
                                获取读数
                            </Button>
                        </Space.Compact>
                        {errors.quantity && <div className="text-red-500 text-sm mt-1">{errors.quantity}</div>}
                    </div>
                )}
            </div>

            {!isEdit && (
                <div className="flex items-center gap-2">
                    <span className="text-gray-700">新增后自动打印标签</span>
                    <Switch 
                        checked={record.auto_print !== false}
                        onChange={(checked) => onChange({ ...record, auto_print: checked })}
                    />
                </div>
            )}

            {isEdit && (
                <div>
                    <div className="mb-2">试剂标签 / 扫码编号 (ID)</div>
                    <Space.Compact style={{ width: '100%' }}>
                        <Input
                            placeholder="允许修改并重新绑定标签"
                            value={record.lab_code || ""}
                            onChange={(e) => onChange({ ...record, lab_code: e.target.value })}
                        />
                        <Button style={{ width: '80px' }} icon={<BarcodeOutlined />} onClick={async () => {
                            try {
                                const res = await getScannerReading();
                                if (res.data.status === 0) {
                                    onChange({ ...record, lab_code: res.data.data });
                                    message.success("扫码成功");
                                } else {
                                    message.error("扫码失败: " + res.data.message);
                                }
                            } catch (e) {
                                message.error("扫码枪连接异常");
                            }
                        }}>
                            扫码
                        </Button>
                    </Space.Compact>
                </div>
            )}

            <div>
                <div className="mb-2">备注</div>
                <Input.TextArea
                    placeholder="请输入备注说明"
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
