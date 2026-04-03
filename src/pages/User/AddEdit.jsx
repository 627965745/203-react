import { useState, useEffect } from "react";
import { Input, Space, Select, Switch, Row, Col, message, Divider } from "antd";
import { comboDepartment } from "../../api/department";

const AddEdit = ({ record, onChange }) => {
    const [errors, setErrors] = useState({});
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchDepartments = async () => {
            setLoading(true);
            try {
                const res = await comboDepartment();
                if (res.data.status === 0 || res.data.code === 0) {
                    setDepartments(res.data.data || []);
                }
            } catch (err) {
                message.error("获取部门数据失败");
            } finally {
                setLoading(false);
            }
        };
        fetchDepartments();
    }, []);

    const validateInputs = () => {
        const newErrors = {};

        if (!record?.name || record.name.trim() === "") {
            newErrors.name = "登录名不可为空";
        }
        if (!record?.nickname || record.nickname.trim() === "") {
            newErrors.nickname = "昵称不可为空";
        }
        
        // Password required on create, might be required on update too based on docs
        if (!record?.id && (!record?.password || record.password.length < 8 || record.password.length > 32)) {
            newErrors.password = "密码至少 8 位且不超过 32 位";
        }
        
        if (!record?.department_id) {
            newErrors.department_id = "部门不可为空";
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
            <Divider titlePlacement="left" plain style={{ margin: '8px 0' }}>基本信息</Divider>
            
            <Row gutter={16}>
                <Col span={12}>
                    <div className="mb-2">登录名 (唯一) <span className="text-red-500">*</span></div>
                    <Input
                        placeholder="请输入登录名"
                        value={record.name || ""}
                        onChange={(e) => updateField("name", e.target.value)}
                        status={errors.name ? "error" : ""}
                        maxLength={255}
                    />
                    {errors.name && <div className="text-red-500 text-sm mt-1">{errors.name}</div>}
                </Col>
                <Col span={12}>
                    <div className="mb-2">昵称 <span className="text-red-500">*</span></div>
                    <Input
                        placeholder="请输入昵称"
                        value={record.nickname || ""}
                        onChange={(e) => updateField("nickname", e.target.value)}
                        status={errors.nickname ? "error" : ""}
                        maxLength={255}
                    />
                    {errors.nickname && <div className="text-red-500 text-sm mt-1">{errors.nickname}</div>}
                </Col>
            </Row>

            <Row gutter={16}>
                <Col span={12}>
                    <div className="mb-2">所属部门 <span className="text-red-500">*</span></div>
                    <Select
                        className="w-full"
                        placeholder="请选择部门"
                        value={record.department_id}
                        onChange={(val) => updateField("department_id", val)}
                        status={errors.department_id ? "error" : ""}
                        loading={loading}
                        options={departments.map(d => ({ label: d.name, value: d.id }))}
                    />
                    {errors.department_id && <div className="text-red-500 text-sm mt-1">{errors.department_id}</div>}
                </Col>
                <Col span={12}>
                    <div className="mb-2">密码 (8-32位) {!record.id && <span className="text-red-500">*</span>}</div>
                    <Input.Password
                        placeholder={record.id ? "留空则不修改密码" : "请输入密码"}
                        value={record.password || ""}
                        onChange={(e) => updateField("password", e.target.value)}
                        status={errors.password ? "error" : ""}
                        autoComplete="new-password"
                    />
                    {errors.password && <div className="text-red-500 text-sm mt-1">{errors.password}</div>}
                </Col>
            </Row>

            <Divider titlePlacement="left" plain style={{ margin: '8px 0' }}>身份证明</Divider>

            <Row gutter={16}>
                <Col span={12}>
                    <div className="mb-2">真实姓名</div>
                    <Input
                        placeholder="请输入真实姓名"
                        value={record.id_name || ""}
                        onChange={(e) => updateField("id_name", e.target.value)}
                        maxLength={255}
                    />
                </Col>
                <Col span={12}>
                    <div className="mb-2">证件号码</div>
                    <Input
                        placeholder="请输入身份证号/证件号"
                        value={record.id_number || ""}
                        onChange={(e) => updateField("id_number", e.target.value)}
                        maxLength={255}
                    />
                </Col>
            </Row>

            <Row gutter={16}>
                <Col span={12}>
                    <div className="mb-2">联系方式</div>
                    <Input
                        placeholder="手机/座机/邮箱"
                        value={record.contact || ""}
                        onChange={(e) => updateField("contact", e.target.value)}
                        maxLength={255}
                    />
                </Col>
                <Col span={12}>
                    <div className="mb-2">签名文件路径</div>
                    <Input
                        placeholder="例如: /signatures/sig_user1.png"
                        value={record.signature_file || ""}
                        onChange={(e) => updateField("signature_file", e.target.value)}
                        maxLength={255}
                    />
                </Col>
            </Row>

            <Divider titlePlacement="left" plain style={{ margin: '8px 0' }}>权限控制</Divider>

            <Row gutter={16} align="middle">
                <Col span={8}>
                    <div className="flex items-center gap-3">
                        <span>是否科室负责人:</span>
                        <Switch
                            checked={record.is_manager === 1}
                            onChange={(checked) => updateField("is_manager", checked ? 1 : 0)}
                        />
                    </div>
                </Col>
                <Col span={8}>
                    <div className="flex items-center gap-3">
                        <span>是否启用账号:</span>
                        <Switch
                            checked={record.enabled === 1}
                            onChange={(checked) => updateField("enabled", checked ? 1 : 0)}
                        />
                    </div>
                </Col>
            </Row>
        </Space>
    );
};

export default AddEdit;
