import React from "react";
import CrudTable from "../../components/CrudTable";
import { readDeviceCategory, createDeviceCategory, updateDeviceCategory, deleteDeviceCategory } from "../../api/deviceCategory";
import AddEdit from './AddEdit';

const DeviceCategoryList = () => {
    const columns = [
        {
            title: "序号",
            dataIndex: "id",
            width: "10%",
            align: "center",
            render: (id) => <span className="text-gray-400 font-mono">{id}</span>
        },
        {
            title: "分类名称",
            dataIndex: "name",
            width: "25%",
            render: (text) => <span className="font-bold text-blue-600">{text}</span>
        },
        {
            title: "分类编码",
            dataIndex: "code",
            width: "10%",
            render: (text) => <span className="text-gray-500">{text}</span>
        },
        {
            title: "创建时间",
            dataIndex: "created_at",
            width: "20%",
            render: (text) => <span className="text-xs text-gray-400">{text}</span>
        },
        {
            title: "更新时间",
            dataIndex: "updated_at",
            width: "20%",
            render: (text) => <span className="text-xs text-gray-400">{text}</span>
        }
    ];

    const api = {
        read: readDeviceCategory,
        create: createDeviceCategory,
        update: updateDeviceCategory,
        delete: deleteDeviceCategory
    };

    return (
        <CrudTable
            title="设备分类管理"
            entityName="设备分类"
            columns={columns}
            api={api}
            AddEditForm={AddEdit}
            initialValues={{ code: "", name: "" }}
            modalWidth={500}
        />
    );
};

export default DeviceCategoryList;
