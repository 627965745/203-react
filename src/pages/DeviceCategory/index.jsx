import React from "react";
import CrudTable from "../../components/CrudTable";
import { readDeviceCategory, createDeviceCategory, updateDeviceCategory, deleteDeviceCategory } from "../../api/deviceCategory";
import AddEdit from './AddEdit';

const DeviceCategoryList = () => {
    const columns = [
        {
            title: "分类编码",
            dataIndex: "code",
            width: "30%",
        },
        {
            title: "分类名称",
            dataIndex: "name",
            width: "40%",
        },
        {
            title: "ID",
            dataIndex: "id",
            width: "10%",
            align: "center"
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
