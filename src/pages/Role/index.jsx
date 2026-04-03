import React from "react";
import CrudTable from "../../components/CrudTable";
import { readRole, createRole, updateRole, deleteRole } from "../../api/role";
import AddEdit from './AddEdit';
import { UserOutlined, ClockCircleOutlined, NumberOutlined } from "@ant-design/icons";
import { Tag, Typography } from "antd";

const { Text } = Typography;

const RoleList = () => {
    const columns = [
        {
            title: "序号",
            dataIndex: "id",
            width: "10%",
            align: "center",
        },
        {
            title: "角色名称",
            dataIndex: "name",
            width: "30%",
            render: (text) => (
                <div className="flex items-center gap-2">
                    <UserOutlined className="text-indigo-500" />
                    <span className="font-bold text-indigo-600">{text}</span>
                </div>
            )
        },
        {
            title: "权限位 (bitwise)",
            dataIndex: "bitwise",
            width: "20%",
            render: (val) => (
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <NumberOutlined className="text-gray-400" />
                        <span className="font-mono text-sm">{val}</span>
                    </div>
                    <Tag color="purple" style={{ fontSize: '11px' }}>
                        Value: {1 << val}
                    </Tag>
                </div>
            )
        },
        {
            title: "创建时间",
            dataIndex: "created_at",
            width: "20%",
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
            width: "20%",
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
    ];

    const initialValues = {
        name: "",
        bitwise: 0
    };

    return (
        <CrudTable
            title="角色管理"
            entityName="角色"
            columns={columns}
            api={{
                read: readRole,
                create: createRole,
                update: updateRole,
                delete: deleteRole
            }}
            AddEditForm={AddEdit}
            initialValues={initialValues}
            modalWidth={500}
        />
    );
};

export default RoleList;
