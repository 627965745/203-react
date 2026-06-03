import React, { useMemo, useState } from 'react';
import { Button, Tag, Space, Descriptions } from 'antd';
import { 
    BarcodeOutlined, 
    TeamOutlined, 
    UserOutlined, 
    ExperimentOutlined, 
    FileTextOutlined,
    CalendarOutlined,
    SolutionOutlined,
    ClockCircleOutlined,
    HistoryOutlined
} from '@ant-design/icons';
import CrudTable from '../../components/CrudTable';
import { readTaskProcessingManager } from '../../api/ProcessingManager';
import SampleListModal from './SampleListModal';

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

const ProcessingManager = () => {
    const [sampleModalVisible, setSampleModalVisible] = useState(false);
    const [currentTask, setCurrentTask] = useState(null);

    const columns = useMemo(() => [
        // ... columns stay same
        {
            title: "任务编号",
            dataIndex: "lab_code",
            width: 150,
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
                    <span className="font-bold text-slate-700">{text}</span>
                </div>
            )
        },
        {
            title: "客户",
            dataIndex: "client_name",
            width: 220,
            render: (text) => (
                <div className="flex items-center gap-2">
                    <TeamOutlined className="text-gray-400" />
                    <span className="text-slate-600">{text}</span>
                </div>
            )
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
            width: 160,
            render: (text) => (
                <div className="flex items-center gap-2">
                    <ExperimentOutlined className="text-amber-500" />
                    <span className="text-slate-600">{text}</span>
                </div>
            )
        },
        {
            title: "分析类型",
            dataIndex: "analysis_type_name",
            width: 140,
            render: (text) => (
                <div className="flex items-center gap-2">
                    <FileTextOutlined className="text-indigo-400" />
                    <span className="text-slate-600">{text}</span>
                </div>
            )
        },
        {
            title: "物理形态",
            dataIndex: "physical_state",
            width: 100,
            render: (val) => {
                const item = PhysicalStateMap[val];
                return item ? <Tag color={item.color} bordered={false} className="rounded-full px-3">{item.label}</Tag> : val;
            }
        },
        {
            title: "检测类别",
            dataIndex: "category",
            width: 100,
            render: (val) => {
                const item = CategoryMap[val];
                return item ? <Tag color={item.color} variant="soft" className="rounded-md">{item.label}</Tag> : val;
            }
        },
        {
            title: "截止日期",
            dataIndex: "deadline",
            width: 130,
            render: (text) => (
                <div className="flex items-center gap-2 text-slate-600">
                    <CalendarOutlined className="text-rose-400" />
                    <span className={new Date(text) < new Date() ? 'text-rose-500 font-medium' : ''}>{text}</span>
                </div>
            )
        },
        {
            title: "收样人",
            dataIndex: "receiver_nickname",
            width: 120,
            render: (text) => (
                <div className="flex items-center gap-2">
                    <span className="text-slate-600">{text}</span>
                </div>
            )
        },
        {
            title: "描述",
            dataIndex: "description",
            width: 150,
            ellipsis: true,
            render: (text) => text || <span className="text-gray-300 italic text-xs">无描述</span>
        }
    ], []);

    const api = useMemo(() => ({
        read: readTaskProcessingManager
    }), []);

    const renderExpandedRow = (record) => (
        <div className="p-4 bg-slate-50/50 rounded-lg border border-slate-100 mx-4 mb-2">
            <Descriptions size="small" column={2}>
                <Descriptions.Item label={
                    <Space size={4}><ClockCircleOutlined className="text-gray-400" /><span>创建时间</span></Space>
                }>
                    <span className="text-slate-600 font-mono">{record.created_at}</span>
                </Descriptions.Item>
                <Descriptions.Item label={
                    <Space size={4}><HistoryOutlined className="text-gray-400" /><span>更新时间</span></Space>
                }>
                    <span className="text-slate-600 font-mono">{record.updated_at}</span>
                </Descriptions.Item>
            </Descriptions>
        </div>
    );

    const handleShowSamples = (record) => {
        setCurrentTask(record);
        setSampleModalVisible(true);
    };

    const renderActions = (record) => (
        <Button 
            type="primary" 
            ghost 
            size="small" 
            icon={<SolutionOutlined />}
            className="rounded-md border-blue-200 hover:border-blue-500"
            onClick={() => handleShowSamples(record)}
        >
            显示样品列表
        </Button>
    );

    return (
        <>
            <CrudTable
                title="加工任务管理"
                entityName="加工任务"
                columns={columns}
                api={api}
                hideAdd={true}
                hideEdit={true}
                hideDelete={true}
                renderActions={renderActions}
                renderExpandedRow={renderExpandedRow}
                scroll={{ x: 1800 }}
            />
            <SampleListModal 
                visible={sampleModalVisible}
                task={currentTask}
                onCancel={() => setSampleModalVisible(false)}
            />
        </>
    );
};

export default ProcessingManager;
