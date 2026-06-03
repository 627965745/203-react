import React from "react";
import CrudTable from "../../components/CrudTable";
import { 
    readReferenceMaterialMediumType, 
    createReferenceMaterialMediumType, 
    updateReferenceMaterialMediumType, 
    deleteReferenceMaterialMediumType 
} from "../../api/referenceMaterialMediumType";
import AddEdit from './AddEdit';

const ReferenceMaterialMediumTypeList = () => {
    const columns = [
        {
            title: "序号",
            dataIndex: "id",
            width: "15%",
            align: "center",
        },
        {
            title: "类型名称",
            dataIndex: "name",
            width: "50%",
            render: (text) => <span className="font-semibold text-gray-800">{text}</span>
        }
    ];

    const initialValues = {
        name: ""
    };

    return (
        <CrudTable
            title="介质类型管理"
            entityName="介质类型"
            columns={columns}
            api={{
                read: readReferenceMaterialMediumType,
                create: createReferenceMaterialMediumType,
                update: updateReferenceMaterialMediumType,
                delete: deleteReferenceMaterialMediumType
            }}
            AddEditForm={AddEdit}
            initialValues={initialValues}
            modalWidth={500}
        />
    );
};

export default ReferenceMaterialMediumTypeList;
