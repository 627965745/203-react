import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Space, Tag, Modal, message, Tabs, Card } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, SearchOutlined } from '@ant-design/icons';
import { 
  readSampleHelper, 
  approveSampleHelper, 
  batchApproveSampleHelper, 
  rejectSampleHelper, 
  batchRejectSampleHelper 
} from '../../../api/testing';

const SampleHelper = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState('0'); // '0' for pending, '1' for approved
  const [queryParams, setQueryParams] = useState({
    query: '',
    page: 1,
    rows: 10,
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);

  const fetchTasks = useCallback(async () => {
    try {
      // Fetch a larger set to get unique tasks for filtering
      const res = await readSampleHelper({ 
        page: 0, 
        rows: 500, 
        status: null,
        task_ids: [], // Always include task_ids
      });
      if (res.data?.status === 0) {
        const rawRows = res.data.data.rows || [];
        const taskMap = new Map();
        rawRows.forEach(sample => {
          if (sample.task_id && !taskMap.has(sample.task_id)) {
            taskMap.set(sample.task_id, {
              id: sample.task_id,
              lab_code: sample.task_lab_code,
              name: sample.task_name
            });
          }
        });
        setTasks(Array.from(taskMap.values()));
      }
    } catch (error) {
      console.error('获取任务过滤列表失败', error);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await readSampleHelper({
        ...queryParams,
        status: activeTab === 'all' ? null : parseInt(activeTab),
        page: queryParams.page - 1,
        task_ids: selectedTaskIds, // Always include task_ids
      });
      if (response.data?.status === 0) {
        const rawRows = response.data.data.rows || [];
        // Process rows to filter helpers by status if needed
        const processedRows = rawRows.map(sample => ({
          ...sample,
          filteredHelpers: (sample.helpers || []).filter(helper => 
            activeTab === 'all' || helper.status === parseInt(activeTab)
          )
        })).filter(sample => sample.filteredHelpers.length > 0);

        setData(processedRows);
        setTotal(response.data.data.total || 0);
      } else {
        message.error(response.data?.message || '获取数据失败');
      }
    } catch (error) {
      message.error('获取数据请求异常');
    } finally {
      setLoading(false);
    }
  }, [activeTab, queryParams, selectedTaskIds]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTaskToggle = (taskId) => {
    const nextSelectedIds = selectedTaskIds.includes(taskId)
      ? selectedTaskIds.filter(id => id !== taskId)
      : [...selectedTaskIds, taskId];
    setSelectedTaskIds(nextSelectedIds);
    setQueryParams(prev => ({ ...prev, page: 1 }));
  };

  const handleAllTasks = () => {
    setSelectedTaskIds([]);
    setQueryParams(prev => ({ ...prev, page: 1 }));
  };

  const handleApprove = (record, sampleId) => {
    Modal.confirm({
      title: '确认辅助任务',
      content: `是否确认样品 ${record.lab_code || ''} 的 [${record.item_name}] 辅助任务？`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          const res = await approveSampleHelper({
            sample_id: sampleId,
            item_id: record.item_id,
            method_id: record.method_id,
          });
          if (res.data?.status === 0) {
            message.success('已确认');
            fetchData();
          } else {
            message.error(res.data?.message || '确认失败');
          }
        } catch (error) {
          message.error('操作异常');
        }
      },
    });
  };

  const handleBatchApprove = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要确认的任务');
      return;
    }
    
    // Extract unique sample_ids from the selected assignment keys (format: sampleId-itemId-methodId)
    const selectedSampleIds = [...new Set(selectedRowKeys.map(key => parseInt(key.split('-')[0])))];

    Modal.confirm({
      title: '批量确认辅助任务',
      content: `是否确认选中的 ${selectedRowKeys.length} 个项目所属的样品任务？`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          const res = await batchApproveSampleHelper({
            sample_ids: selectedSampleIds,
          });
          if (res.data?.status === 0) {
            message.success('批量确认成功');
            setSelectedRowKeys([]);
            fetchData();
          } else {
            message.error(res.data?.message || '批量确认失败');
          }
        } catch (error) {
          message.error('批量操作异常');
        }
      },
    });
  };

  const handleReject = (record, sampleId) => {
    Modal.confirm({
      title: '拒绝辅助任务',
      content: `是否拒绝样品 ${record.lab_code || ''} 的 [${record.item_name}] 辅助任务？`,
      okText: '确认',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          const res = await rejectSampleHelper({
            sample_id: sampleId,
            item_id: record.item_id,
            method_id: record.method_id,
          });
          if (res.data?.status === 0) {
            message.success('已拒绝');
            fetchData();
          } else {
            message.error(res.data?.message || '拒绝失败');
          }
        } catch (error) {
          message.error('操作异常');
        }
      },
    });
  };

  const handleBatchReject = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要拒绝的任务');
      return;
    }

    const selectedSampleIds = [...new Set(selectedRowKeys.map(key => parseInt(key.split('-')[0])))];

    Modal.confirm({
      title: '批量拒绝辅助任务',
      content: `是否拒绝选中的 ${selectedRowKeys.length} 个项目所属的样品任务？`,
      okText: '确认',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          const res = await batchRejectSampleHelper({
            sample_ids: selectedSampleIds,
          });
          if (res.data?.status === 0) {
            message.success('批量拒绝成功');
            setSelectedRowKeys([]);
            fetchData();
          } else {
            message.error(res.data?.message || '批量拒绝失败');
          }
        } catch (error) {
          message.error('批量操作异常');
        }
      },
    });
  };

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'task_name',
      key: 'task_name',
      render: (text) => <span className="font-bold text-gray-700">{text}</span>
    },
    {
      title: '任务编号',
      dataIndex: 'task_lab_code',
      key: 'task_lab_code',
      render: (text) => <Tag color="blue" className="font-mono">{text}</Tag>
    },
    {
      title: '样品编号',
      dataIndex: 'lab_code',
      key: 'lab_code',
      render: (text, record) => <span className="font-bold text-blue-600 font-mono">{record.task_lab_code}-{text?.toString().padStart(4, '0')}</span>
    },
  ];

  const expandedRowRender = (sample) => {
    const helperColumns = [
      { 
        title: '检测项目', 
        dataIndex: 'item_name', 
        key: 'item_name',
        render: (text) => <span className="font-medium">{text}</span>
      },
      { 
        title: '检测方法', 
        dataIndex: 'method_name', 
        key: 'method_name',
        render: (text) => <span className="text-gray-500 text-xs">{text}</span>
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status) => (
          status === 1 ? <Tag color="green">已确认</Tag> : <Tag color="gold">待确认</Tag>
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: 150,
        render: (_, helper) => (
          <Space size="small">
            {helper.status === 0 && (
              <>
                <Button 
                  type="link" 
                  size="small"
                  icon={<CheckCircleOutlined />} 
                  onClick={() => handleApprove(helper, sample.id)}
                >
                  确认
                </Button>
                <Button 
                  type="link" 
                  size="small"
                  danger 
                  icon={<CloseCircleOutlined />} 
                  onClick={() => handleReject(helper, sample.id)}
                >
                  拒绝
                </Button>
              </>
            )}
          </Space>
        ),
      },
    ];

    const innerRowSelection = activeTab === '0' ? {
      selectedRowKeys,
      hideSelectAll: true, // Hide Select All in inner table as requested
      onChange: (newKeys) => {
        // Only update keys belonging to this sample in this context
        const thisSamplePrefix = `${sample.id}-`;
        const otherSampleKeys = selectedRowKeys.filter(k => !k.startsWith(thisSamplePrefix));
        const currentSampleKeys = newKeys.filter(k => k.startsWith(thisSamplePrefix));
        setSelectedRowKeys([...otherSampleKeys, ...currentSampleKeys]);
      },
    } : null;

    return (
      <div className="mx-4 my-2">
        <h4 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">辅助检测项明细</h4>
        <Table
          rowKey={(record) => `${sample.id}-${record.item_id}-${record.method_id}`}
          columns={helperColumns}
          dataSource={sample.filteredHelpers}
          pagination={false}
          size="small"
          rowSelection={innerRowSelection}
          className="bg-white rounded-md overflow-hidden"
        />
      </div>
    );
  };

  const onSelectChange = (newSelectedRowKeys) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  // Main table selection logic: Selecting a sample selects all its filtered helpers
  const mainRowSelection = activeTab === '0' ? {
    selectedRowKeys: data.filter(sample => 
      sample.filteredHelpers.every(h => 
        selectedRowKeys.includes(`${sample.id}-${h.item_id}-${h.method_id}`)
      ) && sample.filteredHelpers.length > 0
    ).map(s => s.id),
    onSelect: (record, selected) => {
      const helperKeys = record.filteredHelpers.map(h => `${record.id}-${h.item_id}-${h.method_id}`);
      let nextKeys = [...selectedRowKeys];
      if (selected) {
        nextKeys = [...new Set([...nextKeys, ...helperKeys])];
      } else {
        nextKeys = nextKeys.filter(k => !helperKeys.includes(k));
      }
      setSelectedRowKeys(nextKeys);
    },
    onSelectAll: (selected, selectedRows, changeRows) => {
      let nextKeys = [...selectedRowKeys];
      data.forEach(record => {
        const helperKeys = record.filteredHelpers.map(h => `${record.id}-${h.item_id}-${h.method_id}`);
        if (selected) {
          nextKeys = [...new Set([...nextKeys, ...helperKeys])];
        } else {
          nextKeys = nextKeys.filter(k => !helperKeys.includes(k));
        }
      });
      setSelectedRowKeys(nextKeys);
    },
    getCheckboxProps: (record) => {
      const allSelected = record.filteredHelpers.every(h => 
        selectedRowKeys.includes(`${record.id}-${h.item_id}-${h.method_id}`)
      ) && record.filteredHelpers.length > 0;
      
      const someSelected = record.filteredHelpers.some(h => 
        selectedRowKeys.includes(`${record.id}-${h.item_id}-${h.method_id}`)
      );

      return {
        indeterminate: someSelected && !allSelected,
      };
    },
  } : null;

  return (
    <div className="pl-6">
      <Card title="辅助检测管理" className="overflow-hidden">
        {/* Task Filter Section */}
        <div className="bg-gray-50/50 p-2 border-b border-gray-100">
          <div className="flex items-center">
            <div className="flex flex-col mr-8">
              <span className="text-sm font-bold text-gray-800 leading-none">筛选任务</span>
              <span className="text-xs text-gray-400 mt-1 font-medium">(多选模式)</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 flex-1">
              {/* All Tasks Button */}
              <button
                onClick={handleAllTasks}
                className={`h-10 px-4 rounded-xl font-bold text-sm transition-all duration-200 border-2 ${
                  selectedTaskIds.length === 0
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100 scale-105'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-500'
                }`}
              >
                全部任务
              </button>

              <div className="w-px h-8 bg-gray-200 mx-2" />

              {/* Task Tags Container */}
              <div className="flex flex-wrap gap-3 overflow-x-auto custom-scrollbar pb-1">
                {tasks.map(task => {
                  const isActive = selectedTaskIds.includes(task.id);
                  return (
                    <div
                      key={task.id}
                      onClick={() => handleTaskToggle(task.id)}
                      className={`
                        h-14 min-w-[140px] px-5 rounded-xl cursor-pointer
                        flex flex-col justify-center items-center
                        transition-all duration-200 border-2 select-none
                        ${isActive 
                          ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' 
                          : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50/30'
                        }
                      `}
                    >
                      <span className="text-[12px] font-mono font-bold opacity-60 uppercase tracking-wider mb-0.5">
                        {task.lab_code}
                      </span>
                      <span className="text-[15px] font-bold truncate max-w-[180px]">
                        {task.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <div className="flex justify-between mb-2">
          <Space>
            <Input
              placeholder="输入关键词查询"
              prefix={<SearchOutlined />}
              value={queryParams.query}
              onChange={(e) => setQueryParams({ ...queryParams, query: e.target.value, page: 1 })}
              onPressEnter={fetchData}
              className="w-72"
            />
            <Button type="primary" onClick={fetchData}>查询</Button>
          </Space>
          {activeTab === '0' && (
            <Space>
              <Button 
                type="primary" 
                disabled={selectedRowKeys.length === 0} 
                onClick={handleBatchApprove}
              >
                批量确认
              </Button>
              <Button 
                danger 
                disabled={selectedRowKeys.length === 0} 
                onClick={handleBatchReject}
              >
                批量拒绝
              </Button>
            </Space>
          )}
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            setQueryParams({ ...queryParams, page: 1 });
            setSelectedRowKeys([]);
          }}
          items={[
            { key: '0', label: '待确认' },
            { key: '1', label: '已确认' },
          ]}
        />

        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          rowSelection={mainRowSelection}
          expandable={{
            expandedRowRender,
            defaultExpandAllRows: false,
          }}
          pagination={{
            current: queryParams.page,
            pageSize: queryParams.rows,
            total: total,
            onChange: (page, rows) => setQueryParams({ ...queryParams, page, rows }),
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条数据`,
          }}
        />
      </div>
    </Card>
  </div>
);
};

export default SampleHelper;
