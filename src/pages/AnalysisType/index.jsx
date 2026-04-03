import React from "react";
import CrudTable from "../../components/CrudTable";
import { readAnalysisType, createAnalysisType, updateAnalysisType, deleteAnalysisType } from "../../api/analysisType";
import AddEdit from './AddEdit';

const AnalysisTypeList = () => {
    const columns = [
        {
            title: "ID",
            dataIndex: "id",
            width: "10%",
        },
        {
            title: "类型名称",
            dataIndex: "name",
            width: "50%",
        },
        {
            title: "创建时间",
            dataIndex: "created_at",
            width: "25%",
            render: text => text || '-',
        }
    ];

    const api = {
        read: readAnalysisType,
        create: createAnalysisType,
        update: updateAnalysisType,
        delete: deleteAnalysisType
    };

    return (
        <CrudTable
            title="分析类型管理"
            entityName="分析类型"
            columns={columns}
            api={api}
            AddEditForm={AddEdit}
            initialValues={{ name: "" }}
            modalWidth={500}
            formatPayload={(payload) => ({
                ...payload,
                name: payload.name?.trim()
            })}
        />
    );
};

export default AnalysisTypeList;
