import { useState, useMemo, useRef } from "react";
import CrudTable from "../../components/CrudTable";
import BatchArrangeModal from "../../components/CrudTable/BatchArrangeModal";
import { readRole, createRole, updateRole, deleteRole, userArrangeRole } from "../../api/role";
import { comboUser } from "../../api/user";
import AddEdit from './AddEdit';
import ArrangeModal from './ArrangeModal';
import MenuArrangeModal from './MenuArrangeModal';
import { UserOutlined, ClockCircleOutlined, NumberOutlined, LinkOutlined, ControlOutlined } from "@ant-design/icons";
import { Tag, Typography, Button, Space, Tooltip } from "antd";

const { Text } = Typography;

const RoleList = () => {
    const [arrangeVisible, setArrangeVisible] = useState(false);
    const [menuArrangeVisible, setMenuArrangeVisible] = useState(false);
    const [arrangeRecord, setArrangeRecord] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // Batch user association
    const [batchArrangeOpen, setBatchArrangeOpen] = useState(false);
    const [batchRows, setBatchRows] = useState([]);
    const clearBatchRef = useRef(null);

    const handleManageUsers = (record) => {
        setArrangeRecord(record);
        setArrangeVisible(true);
    };

    const batchActions = useMemo(
        () => [
            {
                key: "arrangeUsers",
                label: "批量分配用户",
                icon: <LinkOutlined />,
                type: "default",
                className: "font-bold",
                onClick: (rows, { clearSelection }) => {
                    setBatchRows(rows);
                    clearBatchRef.current = clearSelection;
                    setBatchArrangeOpen(true);
                },
            },
        ],
        [],
    );

    const handleManageMenus = (record) => {
        setArrangeRecord(record);
        setMenuArrangeVisible(true);
    };

    const columns = useMemo(() => [
        {
            title: "序号",
            dataIndex: "id",
            width: 50,
            align: "center",
            fixed: "left",
        },
        {
            title: "角色名称",
            dataIndex: "name",
            width: 160,
            ellipsis: true,
            render: (text) => (
                <div className="flex items-center gap-2 min-w-0">
                    <UserOutlined className="text-indigo-500 shrink-0" />
                    <span className="font-bold text-indigo-600 truncate">{text}</span>
                </div>
            )
        },
        {
            title: "权限位",
            dataIndex: "bitwise",
            width: 70,
            render: (val) => (
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <NumberOutlined className="text-gray-400" />
                        <span className="font-mono text-sm">{val}</span>
                    </div>
                    <Tag color="purple" style={{ fontSize: '11px' }}>
                        值: {1 << val}
                    </Tag>
                </div>
            )
        },
        {
            title: "包含用户",
            dataIndex: "users",
            width: 240,
            render: (users) => (
                <div className="flex flex-wrap gap-1">
                    {users?.map(u => (
                        <Tooltip key={u.id} title={`生效于: ${u.created_at || '未知'}`}>
                            <Tag color="blue" className="m-0 text-[10px] leading-[16px]">
                                {u.nickname || u.name}
                            </Tag>
                        </Tooltip>
                    ))}
                    {(!users || users.length === 0) && <span className="text-gray-300 italic text-[11px]">暂无</span>}
                </div>
            )
        },
        {
            title: "菜单权限",
            dataIndex: "controls",
            width: 240,
            render: (controls) => (
                <div className="flex flex-wrap gap-1">
                    {controls?.map(c => (
                        <Tooltip key={c.id} title={`生效于: ${c.created_at || '未知'}`}>
                            <Tag color="cyan" className="m-0 text-[10px] leading-[16px]">
                                {c.name}
                            </Tag>
                        </Tooltip>
                    ))}
                    {(!controls || controls.length === 0) && <span className="text-gray-300 italic text-[11px]">未授权</span>}
                </div>
            )
        },
        {
            title: "创建时间",
            dataIndex: "created_at",
            width: 130,
            render: (text) => (
                <div className="flex flex-col text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                        <ClockCircleOutlined />
                        {text?.split(' ')?.[0]}
                    </div>
                    <div>{text?.split(' ')?.[1]}</div>
                </div>
            )
        },
        {
            title: "更新时间",
            dataIndex: "updated_at",
            width: 130,
            render: (text) => (
                <div className="flex flex-col text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                        <ClockCircleOutlined />
                        {text?.split(' ')?.[0]}
                    </div>
                    <div>{text?.split(' ')?.[1]}</div>
                </div>
            )
        }
    ], []);

    const api = useMemo(() => ({
        read: readRole,
        create: createRole,
        update: updateRole,
        delete: deleteRole
    }), []);

    const initialValues = useMemo(() => ({
        name: "",
        bitwise: 0
    }), []);

    return (
        <>
        <CrudTable
            refreshKey={refreshKey}
            title="角色管理"
            entityName="角色"
            columns={columns}
            api={api}
            AddEditForm={AddEdit}
            initialValues={initialValues}
            modalWidth={500}
            actionWidth={300}
            batchActions={batchActions}
            renderActions={(record) => (
                <>
                    <Button
                        type="link"
                        size="small"
                        onClick={() => handleManageUsers(record)}
                        icon={<LinkOutlined className="text-indigo-500" />}
                    >
                        分配用户
                    </Button>
                    <Button 
                        type="link" 
                        size="small" 
                        onClick={() => handleManageMenus(record)}
                        icon={<ControlOutlined className="text-purple-500" />}
                    >
                        关联菜单
                    </Button>
                </>
            )}
        />
        <ArrangeModal
            visible={arrangeVisible}
            onClose={() => setArrangeVisible(false)}
            record={arrangeRecord}
            onSuccess={() => setRefreshKey(prev => prev + 1)}
        />
        <MenuArrangeModal
            visible={menuArrangeVisible}
            onClose={() => setMenuArrangeVisible(false)}
            record={arrangeRecord}
            onSuccess={() => setRefreshKey(prev => prev + 1)}
        />
        <BatchArrangeModal
            open={batchArrangeOpen}
            title="批量分配用户"
            hint="请为所选角色统一分配用户（支持多选）："
            comboApi={comboUser}
            arrangeApi={userArrangeRole}
            extraKey="user_ids"
            selectedRows={batchRows}
            optionMapper={(u) => ({
                label: u.nickname ? `${u.nickname} (${u.name})` : u.name,
                value: u.id,
            })}
            onCancel={() => setBatchArrangeOpen(false)}
            onSuccess={() => {
                clearBatchRef.current?.();
                setRefreshKey((prev) => prev + 1);
            }}
        />
        </>
    );
};

export default RoleList;
