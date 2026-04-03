import React from "react";
import CrudTable from "../../components/CrudTable";
import { readReportTable, createReportTable, updateReportTable, deleteReportTable } from "../../api/reportTable";
import AddEdit from './AddEdit';
import { TableOutlined } from "@ant-design/icons";

const ReportTableList = () => {
    const columns = [
        {
            title: "序号",
            dataIndex: "id",
            width: "15%",
            align: "center",
        },
        {
            title: "表名称",
            dataIndex: "name",
            width: "35%",
            render: (text) => (
                <div className="flex items-center gap-2">
                    <TableOutlined className="text-blue-500" />
                    <span className="font-bold">{text}</span>
                </div>
            )
        },
        {
            title: "描述说明",
            dataIndex: "description",
            width: "50%",
            ellipsis: true,
            render: (text) => text || <span className="text-gray-300 italic">暂无描述</span>
        }
    ];

    const initialValues = {
        name: "",
        description: ""
    };

    return (
        <CrudTable
            title="报告数据表管理"
            entityName="数据表"
            columns={columns}
            api={{
                read: readReportTable,
                create: createReportTable,
                update: updateReportTable,
                delete: deleteReportTable
            }}
            AddEditForm={AddEdit}
            initialValues={initialValues}
            modalWidth={600}
        />
    );
};

export default ReportTableList;
