import React, { useState, useMemo, useCallback } from 'react';
import { Button, Tag, Space, Switch, message, Tooltip } from 'antd';
import { HistoryOutlined, GlobalOutlined, ApiOutlined } from '@ant-design/icons';
import CrudTable from '../../../components/CrudTable';
import { readThermometers, createThermometer, updateThermometer, deleteThermometer } from '../../../api/monitorAdmin';
import AddEdit from './AddEdit';
import LogDrawer from './LogDrawer';

const ThermometerList = () => {
  const [logDrawer, setLogDrawer] = useState({ visible: false, thermometer: null });
  const [refreshKey, setRefreshKey] = useState(0);

  const handleStatusChange = useCallback(async (record, checked) => {
    try {
      const response = await updateThermometer({
        ...record,
        enabled: checked ? 1 : 0
      });
      if (response.data.status === 0) {
        message.success(`${checked ? '启用' : '禁用'}成功`);
        setRefreshKey(prev => prev + 1);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  }, []);

  const renderActions = useCallback((record) => (
    <Button
      type="link"
      size="small"
      icon={<HistoryOutlined />}
      onClick={() => setLogDrawer({ visible: true, thermometer: record })}
    >
      历史记录
    </Button>
  ), []);

  const columns = useMemo(() => [
    {
      title: '设备信息',
      key: 'device_info',
      width: '20%',
      render: (_, record) => (
        <div className="flex flex-col">
          <span className="font-bold text-gray-800">{record.name}</span>
          <span className="text-xs text-gray-400">ID: {record.id}</span>
        </div>
      )
    },
    {
      title: '网络配置 (Modbus TCP)',
      key: 'network',
      width: '25%',
      render: (_, record) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm">
            <GlobalOutlined className="text-blue-500" />
            <span className="font-mono">{record.ip}:{record.port}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <ApiOutlined className="text-purple-500" />
            <span>Unit ID: {record.unit}</span>
          </div>
        </div>
      )
    },
    {
      title: '实时数据',
      key: 'realtime',
      width: '20%',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="当前温度">
            <div className="flex flex-col items-center p-2 bg-orange-50 rounded-lg border border-orange-100 min-w-[70px]">
              <span className="text-[10px] text-orange-400 font-medium">温度</span>
              <span className="text-lg font-bold text-orange-600 font-mono">
                {record.temperature != null ? `${record.temperature.toFixed(1)}°C` : '--'}
              </span>
            </div>
          </Tooltip>
          <Tooltip title="当前湿度">
            <div className="flex flex-col items-center p-2 bg-blue-50 rounded-lg border border-blue-100 min-w-[70px]">
              <span className="text-[10px] text-blue-400 font-medium">湿度</span>
              <span className="text-lg font-bold text-blue-600 font-mono">
                {record.humidity != null ? `${record.humidity.toFixed(1)}%` : '--'}
              </span>
            </div>
          </Tooltip>
        </Space>
      )
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: '10%',
      align: 'center',
      render: (enabled, record) => (
        <Switch 
          checked={enabled === 1} 
          onChange={(checked) => handleStatusChange(record, checked)}
          size="small"
        />
      )
    }
  ], [handleStatusChange]);

  const api = useMemo(() => ({
    read: readThermometers,
    create: createThermometer,
    update: updateThermometer,
    delete: deleteThermometer,
  }), []);

  const initialValues = useMemo(() => ({
    name: '',
    ip: '',
    port: 502,
    unit: 1,
    enabled: 1
  }), []);

  return (
    <div className="p-4 bg-gray-50 min-h-full">
      <CrudTable
        refreshKey={refreshKey}
        title="温湿度计管理"
        entityName="温湿度计"
        columns={columns}
        api={api}
        AddEditForm={AddEdit}
        initialValues={initialValues}
        modalWidth={600}
        searchPlaceholder="搜索设备名称..."
        renderActions={renderActions}
      />

      <LogDrawer
        visible={logDrawer.visible}
        thermometer={logDrawer.thermometer}
        onClose={() => setLogDrawer({ visible: false, thermometer: null })}
      />
    </div>
  );
};

export default ThermometerList;
