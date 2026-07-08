import React from "react";
import CrudTable from "../../components/CrudTable";
import { readClient, createClient, updateClient, deleteClient } from "../../api/client";
import AddEdit from './AddEdit';

const ClientList = () => {
    const columns = [
        {
            title: "客户名称",
            dataIndex: "name",
            width: 220,
            render: (text, record) => (
                <div className="flex flex-col min-w-0">
                    <div className="font-bold text-slate-700 truncate" title={text}>{text}</div>
                    {record.address && (
                        <div className="text-[11px] text-gray-400 truncate" title={record.address}>{record.address}</div>
                    )}
                </div>
            )
        },
        {
            title: "信用代码",
            dataIndex: "tax_code",
            width: 160,
            ellipsis: true,
            render: text => text || '-',
        },
        {
            title: "联系人",
            dataIndex: "contact",
            width: 90,
            render: text => text || '-',
        },
        {
            title: "联系方式",
            dataIndex: "mobile",
            width: 170,
            render: (_, record) => (
                <div className="flex flex-col text-sm">
                   {record.mobile ? <div>手机: {record.mobile}</div> : null}
                   {record.landline ? <div className="text-gray-500">座机: {record.landline}</div> : null}
                   {!record.mobile && !record.landline ? '-' : null}
                </div>
            )
        },
        {
            title: "邮箱",
            dataIndex: "email",
            ellipsis: true,
            render: text => text || '-',
        },
        {
            title: "更新时间",
            dataIndex: "updated_at",
            width: 150,
            align: "center",
            render: text => text || '-',
        }
    ];

    const api = {
        read: readClient,
        create: createClient,
        update: updateClient,
        delete: deleteClient
    };

    const initialValues = {
        name: "",
        tax_code: "",
        contact: "",
        mobile: "",
        landline: "",
        email: "",
        address: ""
    };

    return (
        <CrudTable
            title="客户管理"
            entityName="客户"
            columns={columns}
            api={api}
            AddEditForm={AddEdit}
            initialValues={initialValues}
            modalWidth={650}
        />
    );
};

export default ClientList;
