import React, { useState, useMemo, useRef } from 'react';
import CrudTable from '../../components/CrudTable';
import BatchArrangeModal from '../../components/CrudTable/BatchArrangeModal';
import { readControl, createControl, updateControl, deleteControl, comboControl, arrangeControl } from '../../api/control';
import { comboRole } from '../../api/role';
import AddEdit from './AddEdit';
import ArrangeModal from './ArrangeModal';
import { Tag, Button, Typography, Space, Tooltip, Switch, message } from 'antd';
import { 
    AppstoreOutlined, 
    LinkOutlined, 
    ShareAltOutlined, 
    EyeOutlined, 
    EyeInvisibleOutlined, 
    ApartmentOutlined 
} from '@ant-design/icons';
import * as AntdIcons from '@ant-design/icons';

const { Text } = Typography;

const ControlPage = () => {
    const [arrangeVisible, setArrangeVisible] = useState(false);
    const [recordToArrange, setRecordToArrange] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // Batch role association (tree: include descendants of each selected node)
    const [batchArrangeOpen, setBatchArrangeOpen] = useState(false);
    const [batchRows, setBatchRows] = useState([]);
    const clearBatchRef = useRef(null);

    const collectIdsWithDescendants = (rows) => {
        const ids = new Set();
        const walk = (node) => {
            ids.add(node.id);
            (node.children || []).forEach(walk);
        };
        (rows || []).forEach(walk);
        return Array.from(ids);
    };

    const batchActions = useMemo(
        () => [
            {
                key: "arrangeRoles",
                label: "批量分配角色",
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

    const handleStatusChange = async (checked, record) => {
        try {
            const res = await updateControl({
                ...record,
                enabled: checked ? 1 : 0
            });
            if (res.data.status === 0) {
                message.success(`${checked ? '启用' : '禁用'}成功`);
                setRefreshKey(prev => prev + 1);
            } else {
                message.error(res.data.message || '操作失败');
            }
        } catch (e) {
            message.error('操作异常');
        }
    };

    const handleArrange = (record) => {
        setRecordToArrange(record);
        setArrangeVisible(true);
    };

    const renderIcon = (iconName) => {
        if (!iconName) return <AppstoreOutlined className="text-gray-400" />;
        const IconComp = AntdIcons[iconName];
        return IconComp ? <IconComp className="text-indigo-500 text-lg" /> : <AppstoreOutlined className="text-gray-400" />;
    };

    const columns = useMemo(() => [
        {
            title: '名称',
            dataIndex: 'name',
            key: 'name',
            ellipsis: true,
            render: (text, record) => (
                <Space className="min-w-0">
                    {renderIcon(record.icon)}
                    <span className="font-bold text-gray-700 truncate">{text}</span>
                </Space>
            )
        },
        {
            title: '路径',
            dataIndex: 'path',
            key: 'path',
            width: 160,
            ellipsis: true,
            render: (text) => (
                <Tag color="cyan" icon={<LinkOutlined />} className="font-mono">{text}</Tag>
            )
        },
        {
            title: '关联角色',
            dataIndex: 'roles',
            key: 'roles',
            width: 260,
            render: (roles) => (
                <div className="flex flex-wrap gap-1">
                    {roles?.map(r => (
                        <Tag color="blue" key={r.id}>{r.name}</Tag>
                    ))}
                    {(!roles || roles.length === 0) && <span className="text-gray-300 italic text-xs">未分配</span>}
                </div>
            )
        },
        {
            title: '排序',
            dataIndex: 'sort',
            key: 'sort',
            width: 80,
            align: 'center',
            render: (val) => <Tag className="bg-gray-50 text-gray-500 border-none px-2">{val}</Tag>
        },
        {
            title: '状态',
            dataIndex: 'enabled',
            key: 'enabled',
            width: 80,
            align: 'center',
            render: (val, record) => (
                <Switch 
                    checked={val === 1} 
                    onChange={(checked) => handleStatusChange(checked, record)}
                    size="small"
                />
            )
        }
    ], []);

    const api = useMemo(() => ({
        read: readControl,
        create: createControl,
        update: updateControl,
        delete: deleteControl
    }), []);

    const initialValues = useMemo(() => ({
        name: '',
        path: '',
        icon: '',
        sort: 0,
        enabled: 1,
        parent_id: null
    }), []);

    const tableProps = useMemo(() => ({
        pagination: false, // Menus usually don't need pagination in tree structure
    }), []);

    return (
        <div className="bg-[#f0f2f5] min-h-full">
            <CrudTable
                refreshKey={refreshKey}
                title="菜单与权限管理"
                entityName="菜单/权限"
                columns={columns}
                api={api}
                AddEditForm={AddEdit}
                initialValues={initialValues}
                formatPayload={(payload) => {
                    const newPayload = { ...payload };
                    if (!newPayload.path) {
                        delete newPayload.path;
                    }
                    if (!newPayload.icon) {
                        delete newPayload.icon;
                    }
                    return newPayload;
                }}
                modalWidth={500}
                actionWidth={200}
                tableProps={tableProps}
                batchActions={batchActions}
                renderActions={(record) => (
                    <Tooltip title="分配角色">
                        <Button 
                            type="link" 
                            size="small" 
                            onClick={() => handleArrange(record)}
                            icon={<ShareAltOutlined className="text-indigo-500" />}
                        >
                            分配
                        </Button>
                    </Tooltip>
                )}
            />
            
            <ArrangeModal
                visible={arrangeVisible}
                onClose={() => setArrangeVisible(false)}
                record={recordToArrange}
                onSuccess={() => setRefreshKey(prev => prev + 1)}
            />

            <BatchArrangeModal
                open={batchArrangeOpen}
                title="批量分配角色"
                hint="请为所选菜单/权限（含其子节点）统一分配可访问角色（支持多选）："
                comboApi={comboRole}
                arrangeApi={arrangeControl}
                extraKey="role_ids"
                selectedRows={batchRows}
                getIds={collectIdsWithDescendants}
                optionMapper={(r) => ({ label: r.name, value: r.id })}
                onCancel={() => setBatchArrangeOpen(false)}
                onSuccess={() => {
                    clearBatchRef.current?.();
                    setRefreshKey((prev) => prev + 1);
                }}
            />
        </div>
    );
};

export default ControlPage;
