import React, { useState, useEffect } from 'react';
import { Input, InputNumber, Switch, Space } from 'antd';

const AddEdit = ({ record, onChange }) => {
  const [errors, setErrors] = useState({});

  const validateInputs = () => {
    const newErrors = {};

    if (!record?.name || record.name.trim() === "") {
      newErrors.name = "设备名称不可为空";
    }
    if (!record?.ip || record.ip.trim() === "") {
      newErrors.ip = "IP 地址不可为空";
    } else {
      const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
      if (!ipv4Regex.test(record.ip) && !ipv6Regex.test(record.ip)) {
        newErrors.ip = "请输入正确的 IPv4/IPv6 格式";
      }
    }
    if (record?.port === undefined || record?.port === null) {
      newErrors.port = "端口不可为空";
    }
    if (record?.unit === undefined || record?.unit === null) {
      newErrors.unit = "单元地址不可为空";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    if (typeof onChange === "function") {
      onChange.validate = validateInputs;
    }
  }, [record, onChange]);

  const handleChange = (field, value) => {
    onChange({ ...record, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <div>
        <div className="mb-2 text-sm font-medium">设备名称 <span className="text-red-500">*</span></div>
        <Input
          placeholder="例如：实验室1号温湿度计"
          value={record.name || ""}
          onChange={(e) => handleChange("name", e.target.value)}
          status={errors.name ? "error" : ""}
          maxLength={255}
        />
        {errors.name && <div className="text-red-500 text-xs mt-1">{errors.name}</div>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="mb-2 text-sm font-medium">IP 地址 <span className="text-red-500">*</span></div>
          <Input
            placeholder="192.168.1.100"
            value={record.ip || ""}
            onChange={(e) => handleChange("ip", e.target.value)}
            status={errors.ip ? "error" : ""}
          />
          {errors.ip && <div className="text-red-500 text-xs mt-1">{errors.ip}</div>}
        </div>
        <div>
          <div className="mb-2 text-sm font-medium">端口 <span className="text-red-500">*</span></div>
          <InputNumber
            className="w-full"
            placeholder="502"
            value={record.port}
            onChange={(val) => handleChange("port", val)}
            status={errors.port ? "error" : ""}
            min={1}
            max={65535}
          />
          {errors.port && <div className="text-red-500 text-xs mt-1">{errors.port}</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 items-end">
        <div>
          <div className="mb-2 text-sm font-medium">Modbus 单元地址 <span className="text-red-500">*</span></div>
          <InputNumber
            className="w-full"
            placeholder="1"
            value={record.unit}
            onChange={(val) => handleChange("unit", val)}
            status={errors.unit ? "error" : ""}
            min={1}
            max={255}
          />
          {errors.unit && <div className="text-red-500 text-xs mt-1">{errors.unit}</div>}
        </div>
        <div className="flex items-center gap-2 pb-1.5">
          <Switch
            checked={record.enabled === 1}
            onChange={(checked) => handleChange("enabled", checked ? 1 : 0)}
            size="small"
          />
          <span className="text-sm font-medium">启用设备</span>
        </div>
      </div>
    </Space>
  );
};

export default AddEdit;
