import React, { useState, useMemo } from "react";
import { Button, Tag, Space, Select } from "antd";
import { 
    BarcodeOutlined, 
    TagOutlined, 
    TeamOutlined, 
    UserOutlined, 
    ExperimentOutlined, 
    FileTextOutlined,
    ClockCircleOutlined,
    CalendarOutlined,
    FilterOutlined
} from "@ant-design/icons";
import CrudTable from "../../../components/CrudTable";
import { readTask, createTask, updateTask, deleteTask } from "../../../api/workflow";
import AddEdit from './AddEdit';
import DownloadModal from './DownloadModal';
import UploadModal from './UploadModal';
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";

const PhysicalStateMap = {
    0: { label: "固态", color: "orange" },
    1: { label: "液态", color: "blue" },
    2: { label: "气态", color: "purple" }
};

const CategoryMap = {
    0: { label: "委托检测", color: "cyan" },
    1: { label: "监督检测", color: "red" },
    2: { label: "其他", color: "default" }
};

const DeliveredByMap = {
    0: { label: "客户邮寄", color: "blue" },
    1: { label: "客户送检", color: "green" },
    2: { label: "自采", color: "orange" }
};

const IsProcessingMap = {
    0: { label: "不加工", color: "default" },
    1: { label: "需加工", color: "green" }
};

const TaskList = () => {
    const [showIds, setShowIds] = useState({});
    const [refreshKey, setRefreshKey] = useState(0);
    const [downloadVisible, setDownloadVisible] = useState(false);
    const [uploadVisible, setUploadVisible] = useState(false);

    const toggleId = (key) => {
        setShowIds(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const renderNameWithId = (name, id, key, rowId, Icon) => {
        if (!name) return '-';
        const toggleKey = `${rowId}_${key}`;
        return (
            <div className="flex flex-col">
                <div className="flex items-center gap-2">
                    {Icon && <Icon className="text-gray-400" />}
                    <span className="font-bold text-slate-700">{name}</span>
                </div>
                <div className="mt-0.5 flex items-center h-[14px]">
                    {!showIds[toggleKey] ? (
                        <span 
                            className="text-[10px] text-gray-400 cursor-pointer hover:text-blue-600 leading-none ml-[20px]"
                            onClick={() => toggleId(toggleKey)}
                        >
                            # 显示 ID
                        </span>
                    ) : (
                        <span className="text-[10px] text-gray-400 leading-none ml-[20px]">
                            ID: {id}
                        </span>
                    )}
                </div>
            </div>
        );
    };

    const columns = useMemo(() => [
        {
            title: "任务编号",
            dataIndex: "lab_code",
            width: 140,
            fixed: 'left',
            render: (text) => (
                <div className="flex items-center gap-2">
                    <BarcodeOutlined className="text-blue-500" />
                    <span className="font-mono font-bold text-blue-600">{text}</span>
                </div>
            )
        },
        {
            title: "任务名称",
            dataIndex: "name",
            width: 200,
            render: (text) => (
                <div className="flex items-center gap-2">
                    <span className="font-bold text-indigo-700">{text}</span>
                </div>
            )
        },
        {
            title: "客户",
            dataIndex: "client_name",
            width: 200,
            render: (name, record) => renderNameWithId(name, record.client_id, 'client_id', record.id, TeamOutlined)
        },
        {
            title: "联系人",
            dataIndex: "liaison_name",
            width: 140,
            render: (text, record) => (
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <UserOutlined className="text-gray-400" />
                        <span className="text-slate-600">{text || '-'}</span>
                    </div>
                    {record.liaison_contact && (
                        <div className="text-[10px] text-gray-400 mt-0.5 ml-[20px]">
                            {record.liaison_contact}
                        </div>
                    )}
                </div>
            )
        },
        {
            title: "样品类型",
            dataIndex: "sample_type_name",
            width: 140,
            render: (name, record) => renderNameWithId(name, record.sample_type_id, 'sample_type_id', record.id, ExperimentOutlined)
        },
        {
            title: "分析类型",
            dataIndex: "analysis_type_name",
            width: 140,
            render: (name, record) => renderNameWithId(name, record.analysis_type_id, 'analysis_type_id', record.id, FileTextOutlined)
        },
        {
            title: "物理形态",
            dataIndex: "physical_state",
            width: 100,
            render: (val) => {
                const item = PhysicalStateMap[val];
                return item ? <Tag color={item.color}>{item.label}</Tag> : val;
            }
        },
        {
            title: "检测类别",
            dataIndex: "category",
            width: 100,
            render: (val) => {
                const item = CategoryMap[val];
                return item ? <Tag bordered={false} color={item.color}>{item.label}</Tag> : val;
            }
        },
        {
            title: "来样方式",
            dataIndex: "delivered_by",
            width: 100,
            render: (val) => {
                const item = DeliveredByMap[val];
                return <span className="text-sm text-slate-600">{item?.label || val}</span>;
            }
        },
        {
            title: "加工",
            dataIndex: "is_processing",
            width: 80,
            render: (val) => (
                <Tag color={val === 1 ? "green" : "default"}>
                    {val === 1 ? "需要" : "不需要"}
                </Tag>
            )
        },
        {
            title: "截止日期",
            dataIndex: "deadline",
            width: 130,
            render: (text) => (
                <div className="flex items-center gap-2 text-slate-600">
                    <CalendarOutlined className="text-gray-400" />
                    <span>{text}</span>
                </div>
            )
        },
        {
            title: "收样人",
            dataIndex: "receiver_nickname",
            width: 140,
            render: (name, record) => renderNameWithId(name, record.receiver_id, 'receiver_id', record.id, UserOutlined)
        },
        {
            title: "创建时间",
            dataIndex: "created_at",
            width: 180,
            render: (text) => (
                <div className="flex items-center gap-2 text-gray-400 text-xs">
                    <ClockCircleOutlined />
                    <span>{text}</span>
                </div>
            )
        }
    ], [showIds]);

    const api = useMemo(() => ({
        read: readTask,
        create: createTask,
        update: updateTask,
        delete: deleteTask
    }), []);

    const initialValues = useMemo(() => ({
        name: "",
        client_id: null,
        liaison_name: "",
        liaison_contact: "",
        sample_type_id: null,
        analysis_type_id: null,
        physical_state: 0,
        category: 0,
        delivered_by: 1,
        is_processing: 0,
        deadline: null,
        receiver_id: null,
        description: ""
    }), []);

    return (
        <>
        <CrudTable
            refreshKey={refreshKey}
            title="任务管理"
            entityName="任务"
            columns={columns}
            api={api}
            AddEditForm={AddEdit}
            initialValues={initialValues}
            modalWidth={800}
            scroll={{ x: 1800 }}
            actionExtra={
                <div className="flex items-center gap-3">
                    <Button 
                        icon={<DownloadOutlined />} 
                        onClick={() => setDownloadVisible(true)}
                        className="bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
                    >
                        下载送样单
                    </Button>
                    <Button 
                        icon={<UploadOutlined />} 
                        onClick={() => setUploadVisible(true)}
                        className="border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                        导入送样单
                    </Button>
                </div>
            }
        />
        <DownloadModal 
            visible={downloadVisible} 
            onCancel={() => setDownloadVisible(false)} 
        />
        <UploadModal 
            visible={uploadVisible} 
            onCancel={() => setUploadVisible(false)}
            onSuccess={() => setRefreshKey(prev => prev + 1)}
        />
        </>
    );
};

export default TaskList;
