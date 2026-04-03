import React from "react";
import CrudTable from "../../components/CrudTable";
import { readTaskType, createTaskType, updateTaskType, deleteTaskType } from "../../api/taskType";
import AddEdit from './AddEdit';
import { TagOutlined, DeploymentUnitOutlined } from "@ant-design/icons";
import { Tag } from "antd";

const TaskTypeList = () => {
    const columns = [
        {
            title: "序号",
            dataIndex: "id",
            width: "10%",
            align: "center",
        },
        {
            title: "类型编码",
            dataIndex: "code",
            width: "30%",
            render: (text) => (
                <div className="flex items-center gap-2">
                    <TagOutlined className="text-orange-500" />
                    <span className="font-mono font-bold text-gray-700">{text}</span>
                </div>
            )
        },
        {
            title: "类型名称",
            dataIndex: "name",
            width: "40%",
            render: (text) => (
                <div className="flex items-center gap-2">
                    <DeploymentUnitOutlined className="text-blue-500" />
                    <span className="font-bold text-blue-600">{text}</span>
                </div>
            )
        }
    ];

    const initialValues = {
        code: "",
        name: ""
    };

    return (
        <CrudTable
            title="任务类型管理"
            entityName="任务类型"
            columns={columns}
            api={{
                read: readTaskType,
                create: createTaskType,
                update: updateTaskType,
                delete: deleteTaskType
            }}
            AddEditForm={AddEdit}
            initialValues={initialValues}
            modalWidth={500}
        />
    );
};

export default TaskTypeList;
