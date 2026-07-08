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
            title: "序号",
            dataIndex: "id",
            key: "id",
            width: 70,
            align: "center",
            render: (text) => <span className="text-gray-400 font-mono text-xs">{text}</span>
        },
        {
            title: "部门名称",
            dataIndex: "name",
            key: "name",
            ellipsis: true,
            render: (text) => <span className="font-bold text-blue-600">{text}</span>
        },
        {
            title: "创建时间",
            dataIndex: "created_at",
            key: "created_at",
            width: 160,
            align: "center",
            render: (text) => <span className="text-gray-400 text-xs">{text || '-'}</span>
        },
        {
            title: "更新时间",
            dataIndex: "updated_at",
            key: "updated_at",
            width: 160,
            align: "center",
            render: (text) => <span className="text-gray-400 text-xs">{text || '-'}</span>
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
            title="部门/科室管理"
            entityName="部门"
            columns={columns}
            api={api}
            AddEditForm={AddEdit}
            initialValues={{ name: "", parent_id: null }}
            modalWidth={500}
            tableProps={{
                expandable: {
                    defaultExpandAllRows: true,
                    expandIconColumnIndex: 1
                }
            }}
        />
    );
};

export default DepartmentList;
