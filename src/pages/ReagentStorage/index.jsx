import React from "react";
import CrudTable from "../../components/CrudTable";
import { 
    readReagentStorage, 
    createReagentStorage, 
    updateReagentStorage, 
    deleteReagentStorage 
} from "../../api/reagentStorage";
import AddEdit from './AddEdit';

const ReagentStorageList = () => {
    const columns = [
        {
            title: "序号",
            dataIndex: "id",
            width: "15%",
            align: "center",
        },
        {
            title: "试剂柜名称",
            dataIndex: "name",
            render: (text) => <span className="font-bold text-gray-700">{text}</span>
        }
    ];

    const api = {
        read: readReagentStorage,
        create: createReagentStorage,
        update: updateReagentStorage,
        delete: deleteReagentStorage
    };

    return (
        <CrudTable
            title="试剂柜管理"
            entityName="试剂柜"
            columns={columns}
            api={api}
            AddEditForm={AddEdit}
            initialValues={{ name: "" }}
            modalWidth={500}
        />
    );
};

export default ReagentStorageList;
