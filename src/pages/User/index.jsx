import React, { useState, useEffect, useMemo } from "react";
import CrudTable from "../../components/CrudTable";
import { readUser, createUser, updateUser, deleteUser, resetUser } from "../../api/user";
import { comboDepartment } from "../../api/department";
import AddEdit from './AddEdit';
import ArrangeModal from './ArrangeModal';
import { 
    UserOutlined, 
    EnvironmentOutlined, 
    KeyOutlined, 
    GlobalOutlined, 
    ClockCircleOutlined,
    FileImageOutlined,
    LinkOutlined
} from "@ant-design/icons";
import { Tag, Switch, message, Select, Space, Button, Modal, Spin, Empty, Descriptions } from "antd";

const UserList = () => {
    const [departments, setDepartments] = useState([]);
    const [deptId, setDeptId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    const [arrangeVisible, setArrangeVisible] = useState(false);
    const [arrangeRecord, setArrangeRecord] = useState(null);

    const handleManageRoles = (record) => {
        setArrangeRecord(record);
        setArrangeVisible(true);
    };

    useEffect(() => {
        const fetchDepts = async () => {
            setLoading(true);
            try {
                const res = await comboDepartment();
                if (res.data.status === 0 || res.data.code === 0) {
                    const data = res.data.data || [];
                    setDepartments(data);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchDepts();
    }, []);

    const api = useMemo(() => ({
        read: (params) => {
            const query = { ...params };
            if (deptId) query.department_id = deptId;
            return readUser(query);
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

    const columns = useMemo(() => [
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
                <div className="text-[11px] leading-tight">
                    <div className="mb-0.5"><span className="text-gray-400">实名:</span> {record.id_name || "-"}</div>
                    <div className="mb-0.5"><span className="text-gray-400">证件:</span> {record.id_number || "-"}</div>
                    <div><span className="text-gray-400">联系:</span> {record.contact || "-"}</div>
                </div>
            )
        },
        {
            title: "拥有角色",
            dataIndex: "roles",
            width: "20%",
            render: (roles) => (
                <div className="flex flex-wrap gap-1">
                    {roles?.map(r => (
                        <Tag color="cyan" key={r.id} className="m-0 text-[10px] leading-[16px]">
                            {r.name}
                        </Tag>
                    ))}
                    {(!roles || roles.length === 0) && <span className="text-gray-300 italic text-[11px]">暂无</span>}
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
        }
    ], []);

    const initialValues = useMemo(() => ({
        department_id: deptId,
        nickname: "",
        name: "",
        password: "",
        id_name: "",
        id_number: "",
        contact: "",
        signature_file: "",
        is_manager: 0,
        enabled: 1
    }), [deptId]);

    const renderExpandedRow = (record) => (
        <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                额外详情内容
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

    return (
        <>
        <CrudTable
            refreshKey={refreshKey}
            title="用户管理"
            entityName="用户"
            columns={columns}
            api={api}
            AddEditForm={AddEdit}
            renderExpandedRow={renderExpandedRow}
            renderActions={(record) => (
                <Space size="small">
                    <Button 
                        type="link" 
                        size="small" 
                        icon={<LinkOutlined className="text-indigo-500" />}
                        onClick={() => handleManageRoles(record)}
                    >
                        关联角色
                    </Button>
                    <Button 
                        type="link" 
                        size="small" 
                        icon={<KeyOutlined />}
                        onClick={() => handleResetPassword(record)}
                    >
                        重置密码
                    </Button>
                </Space>
            )}
            initialValues={initialValues}
            modalWidth={700}
            filterValues={{ department_id: deptId }}
            filterConfig={{ department_id: { label: "部门", options: departments.map(d => ({ label: d.name, value: d.id })) } }}
            onClearFilter={() => { setDeptId(null); setRefreshKey(prev => prev + 1); }}
            onClearAll={() => { setDeptId(null); setRefreshKey(prev => prev + 1); }}
            formatPayload={(payload, mode) => {
                const newPayload = { ...payload };
                if (mode === 'update' && !newPayload.password) {
                    delete newPayload.password;
                }
                return newPayload;
            }}
            actionExtra={
                <Space>
                    <span className="text-gray-500 text-sm">部门筛选:</span>
                    <Select
                        loading={loading}
                        style={{ width: 220 }}
                        placeholder="请选择部门"
                        value={deptId}
                        onChange={(val) => {
                            setDeptId(val || null);
                            setRefreshKey(prev => prev + 1);
                        }}
                        options={departments.map(d => ({ label: d.name, value: d.id }))}
                    />
                </Space>
            }
        />
        <ArrangeModal
            visible={arrangeVisible}
            onClose={() => setArrangeVisible(false)}
            record={arrangeRecord}
            onSuccess={() => setRefreshKey(prev => prev + 1)}
        />
        </>
    );
};

export default UserList;
