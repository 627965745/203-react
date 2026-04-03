import React, { useState, useEffect, useMemo } from "react";
import CrudTable from "../../components/CrudTable";
import { readUser, createUser, updateUser, deleteUser, resetUser } from "../../api/user";
import { comboDepartment } from "../../api/department";
import AddEdit from './AddEdit';
import { 
    UserOutlined, 
    EnvironmentOutlined, 
    SafetyCertificateOutlined, 
    KeyOutlined, 
    GlobalOutlined, 
    ClockCircleOutlined,
    FileImageOutlined
} from "@ant-design/icons";
import { Tag, Switch, message, Select, Space, Button, Modal, Spin, Empty, Descriptions } from "antd";

const UserList = () => {
    const [departments, setDepartments] = useState([]);
    const [deptId, setDeptId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const fetchDepts = async () => {
            setLoading(true);
            try {
                const res = await comboDepartment();
                if (res.data.status === 0 || res.data.code === 0) {
                    const data = res.data.data || [];
                    setDepartments(data);
                    if (data.length > 0 && !deptId) {
                        setDeptId(data[0].id);
                    }
                }
            } finally {
                setLoading(false);
            }
        };
        fetchDepts();
    }, []);

    const api = useMemo(() => ({
        read: (params) => {
            if (!deptId) return Promise.resolve({ data: { status: 0, data: { rows: [], total: 0 } } });
            return readUser({ ...params, department_id: deptId });
        },
        create: createUser,
        update: updateUser,
        delete: deleteUser
    }), [deptId]);

    const handleResetPassword = async (record) => {
        Modal.confirm({
            title: `确定要重置 ${record.nickname} (${record.name}) 的密码吗？`,
            content: "重置后会有提示返回新密码。",
            okText: "确定重置",
            cancelText: "取消",
            onOk: async () => {
                try {
                    const res = await resetUser({ id: record.id });
                    if (res.data.status === 0 || res.data.code === 0) {
                        Modal.success({
                            title: "重置密码成功",
                            content: res.data.message
                        });
                    } else {
                        message.error(res.data.message || "重置失败");
                    }
                } catch (err) {
                    console.error("Reset pwd err:", err);
                    message.error("重置异常");
                }
            }
        });
    };

    const handleSwitchEnabled = async (record, checked) => {
        try {
            // Re-use update API to change enabled status
            const payload = { ...record, enabled: checked ? 1 : 0 };
            const res = await updateUser(payload);
            if (res.data.status === 0 || res.data.code === 0) {
                message.success(`${checked ? '启用' : '禁用'}成功`);
                setRefreshKey(prev => prev + 1);
            } else {
                message.error(res.data.message || "状态更新失败");
            }
        } catch (err) {
            message.error("状态更新异常");
        }
    };

    const columns = [
        {
            title: "序号",
            dataIndex: "id",
            width: "5%",
            align: "center",
        },
        {
            title: "用户/登录名",
            width: "15%",
            render: (_, record) => (
                <div className="flex flex-col">
                    <span className="font-bold text-blue-600">{record.nickname}</span>
                    <span className="text-xs text-gray-400 font-mono italic">{record.name}</span>
                </div>
            )
        },
        {
            title: "部门",
            dataIndex: "department_name",
            width: "12%",
            render: (text) => (
                <div className="flex items-center gap-1">
                    <EnvironmentOutlined className="text-gray-400" />
                    <span>{text}</span>
                </div>
            )
        },
        {
            title: "类型",
            width: "10%",
            align: "center",
            render: (_, record) => (
                record.is_manager === 1 ? <Tag color="gold">负责人</Tag> : <Tag color="blue">普通职员</Tag>
            )
        },
        {
            title: "实名/证件/联系",
            width: "25%",
            render: (_, record) => (
                <div className="text-xs">
                    <div><span className="text-gray-400">实名:</span> {record.id_name || "-"}</div>
                    <div><span className="text-gray-400">证件:</span> {record.id_number || "-"}</div>
                    <div><span className="text-gray-400">联系:</span> {record.contact || "-"}</div>
                </div>
            )
        },
        {
            title: "启用状态",
            dataIndex: "enabled",
            width: "10%",
            align: "center",
            render: (val, record) => (
                <Switch 
                    checked={val === 1} 
                    size="small" 
                    onChange={(checked) => handleSwitchEnabled(record, checked)}
                />
            )
        },
        {
            title: "密码重置",
            width: "10%",
            align: "center",
            render: (_, record) => (
                <Button 
                    type="link" 
                    size="small" 
                    icon={<KeyOutlined />}
                    onClick={() => handleResetPassword(record)}
                >
                    重置
                </Button>
            )
        }
    ];

    const renderExpandedRow = (record) => (
        <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <SafetyCertificateOutlined /> 额外详情内容
            </h4>
            <Descriptions size="small" bordered column={3}>
                <Descriptions.Item label="签名文件" span={3}>
                    <div className="flex items-center gap-2">
                        <FileImageOutlined className="text-orange-400" />
                        <code className="text-xs bg-white p-1 rounded border overflow-x-auto text-orange-600 block flex-1">
                            {record.signature_file || "未设置签名文件路径"}
                        </code>
                    </div>
                </Descriptions.Item>
                <Descriptions.Item label="最后登录 IP">
                    <div className="flex items-center gap-2">
                        <GlobalOutlined className="text-blue-400" />
                        <span>{record.last_login_ip || "-"}</span>
                    </div>
                </Descriptions.Item>
                <Descriptions.Item label="最后登录时间" span={2}>
                    <div className="flex items-center gap-2">
                        <ClockCircleOutlined className="text-blue-400" />
                        <span>{record.last_login_at || "-"}</span>
                    </div>
                </Descriptions.Item>
            </Descriptions>
        </div>
    );

    if (loading && !departments.length) {
        return (
            <div className="flex justify-center items-center h-64 bg-white rounded-lg">
                <Spin description="加载部门..." size="large" />
            </div>
        );
    }

    if (!loading && !departments.length) {
        return (
            <div className="p-8 bg-white rounded-lg text-center">
                <Empty description="请先添加部门" />
            </div>
        );
    }

    return (
        <CrudTable
            key={refreshKey}
            title="用户管理"
            entityName="用户"
            columns={columns}
            api={api}
            AddEditForm={AddEdit}
            renderExpandedRow={renderExpandedRow}
            initialValues={{
                department_id: deptId,
                is_manager: 0,
                enabled: 1
            }}
            modalWidth={700}
            formatPayload={(payload, mode) => {
                const newPayload = { ...payload };
                // On update, if password is empty string, remove it to avoid overwriting or validation error
                if (mode === 'update' && !newPayload.password) {
                    delete newPayload.password;
                }
                return newPayload;
            }}
            actionExtra={
                <Space>
                    <span className="text-gray-500 text-sm">部门筛选:</span>
                    <Select
                        style={{ width: 220 }}
                        placeholder="请选择部门"
                        value={deptId}
                        onChange={(val) => {
                            setDeptId(val);
                            setRefreshKey(prev => prev + 1);
                        }}
                        options={departments.map(d => ({ label: d.name, value: d.id }))}
                    />
                </Space>
            }
        />
    );
};

export default UserList;
