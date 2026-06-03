import React, { useState, useEffect } from 'react';
import { Drawer, Table, DatePicker, Button, Space, message } from 'antd';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getThermometerLogs, exportThermometerLogs } from '../../../api/monitorAdmin';

const { RangePicker } = DatePicker;

const LogDrawer = ({ visible, onClose, thermometer }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [timeRange, setTimeRange] = useState([dayjs().subtract(7, 'day'), dayjs()]);

  const fetchLogs = async (page = pagination.current, pageSize = pagination.pageSize) => {
    if (!thermometer?.id) return;
    setLoading(true);
    try {
      const response = await getThermometerLogs({
        thermometer_id: thermometer.id,
        time_from: timeRange[0].format('YYYY-MM-DD HH:mm:ss'),
        time_to: timeRange[1].format('YYYY-MM-DD HH:mm:ss'),
        page: page - 1,
        rows: pageSize,
      });
      if (response.data.status === 0) {
        setData(response.data.rows || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && thermometer?.id) {
      fetchLogs(1, 10);
      setPagination({ current: 1, pageSize: 10 });
    }
  }, [visible, thermometer]);

  const handleExport = async () => {
    if (!thermometer?.id) return;
    try {
      const response = await exportThermometerLogs({
        thermometer_id: thermometer.id,
        time_from: timeRange[0].format('YYYY-MM-DD HH:mm:ss'),
        time_to: timeRange[1].format('YYYY-MM-DD HH:mm:ss'),
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `thermometer_${thermometer.id}_logs_${dayjs().format('YYYYMMDDHHmmss')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { 
      title: '温度 (°C)', 
      dataIndex: 'temperature', 
      render: (val) => <span className="font-mono text-orange-600">{val?.toFixed(1) || '0.0'}</span> 
    },
    { 
      title: '湿度 (%RH)', 
      dataIndex: 'humidity', 
      render: (val) => <span className="font-mono text-blue-600">{val?.toFixed(1) || '0.0'}</span> 
    },
    { title: '记录时间', dataIndex: 'created_at', width: 180 },
  ];

  return (
    <Drawer
      title={`历史记录 - ${thermometer?.name || ''}`}
      placement="right"
      onClose={onClose}
      open={visible}
      width={700}
    >
      <div className="flex flex-col h-full">
        <div className="mb-4 flex justify-between items-end bg-gray-50 p-4 rounded-lg border border-gray-100">
          <Space direction="vertical" size={4} className="flex-1">
            <span className="text-xs text-gray-500 font-medium">查询时间范围</span>
            <RangePicker 
              showTime 
              value={timeRange} 
              onChange={setTimeRange} 
              className="w-full"
            />
          </Space>
          <Space className="ml-4 pb-[1px]">
            <Button 
              type="primary" 
              icon={<SearchOutlined />} 
              onClick={() => fetchLogs(1, pagination.pageSize)}
              loading={loading}
            >
              查询
            </Button>
            <Button 
              icon={<DownloadOutlined />} 
              onClick={handleExport}
            >
              导出 Excel
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="id"
          pagination={{
            ...pagination,
            total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, pageSize) => {
              setPagination({ current: page, pageSize });
              fetchLogs(page, pageSize);
            },
          }}
          className="flex-1"
          scroll={{ y: 'calc(100vh - 350px)' }}
        />
      </div>
    </Drawer>
  );
};

export default LogDrawer;
