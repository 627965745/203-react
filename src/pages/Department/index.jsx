import React from "react";
import CrudTable from "../../components/CrudTable";
import { 
    readDepartment, 
    createDepartment, 
    updateDepartment, 
    deleteDepartment 
} from "../../api/department";
import AddEdit from './AddEdit';

const DepartmentList = () => {
    const columns = [
        {
            title: "部门名称",
            dataIndex: "name",
            key: "name",
        },
        {
            title: "ID",
            dataIndex: "id",
            key: "id",
            width: "15%",
            align: "center"
        }
    ];

    const api = {
        read: readDepartment,
        create: createDepartment,
        update: updateDepartment,
        delete: deleteDepartment
    };

    return (
        <CrudTable
            title="部门科室管理"
            entityName="部门"
            columns={columns}
            api={api}
            AddEditForm={AddEdit}
            initialValues={{ name: "", parent_id: null }}
            modalWidth={500}
            tableProps={{
                expandable: {
                    defaultExpandAllRows: true
                }
            }}
        />
    );
};

export default DepartmentList;
