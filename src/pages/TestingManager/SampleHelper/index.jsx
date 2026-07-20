import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Table, Button, Input, Space, Tag, Modal, message, Tabs, Layout, Spin, Empty } from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined,
  LeftOutlined, RightOutlined, TeamOutlined, InboxOutlined,
} from '@ant-design/icons';
import {
  readSampleHelper,
  approveSampleHelper,
  batchApproveSampleHelper,
  rejectSampleHelper,
  batchRejectSampleHelper,
} from '../../../api/testing';

const { Sider, Content } = Layout;

// 布局参照 WorkflowManager/Sample：左侧任务列表，右侧展示辅助任务。
//
// 实测返回数据（SampleHelper/read）中 helpers[] 只有 method_id/method_name/status，
// 不含 item_id/item_name，因此审批相关请求体也不再传 item_id。
//
// 左侧任务列表不再用 rows:500 一次性反推全部任务 —— 接口本身自带分页且返回 total，
// 直接按正常页大小（10）翻页展示当前页样品里出现的任务即可。同时新增“全部任务”
// 按钮：选中后右侧不再传 task_ids，直接用接口自身分页展示全部辅助任务。
const SampleHelper = () => {
  // 左侧：任务列表（正常分页，非一次性拉取）
  const [tasks, setTasks] = useState([]);
  const [taskId, setTaskId] = useState(null);
  const [viewAll, setViewAll] = useState(true); // 默认“全部任务”，无需选中具体任务即可查看
  const [taskLoading, setTaskLoading] = useState(false);
  const [taskPage, setTaskPage] = useState(0);
  const [taskTotal, setTaskTotal] = useState(0);
  const taskPageSize = 10;

  // 右侧：辅助任务列表
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState('0'); // '0' 待确认，'1' 已确认
  const [queryParams, setQueryParams] = useState({ query: '', page: 1, rows: 10 });
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const selectedTask = tasks.find(t => t.id === taskId);

  useEffect(() => {
    fetchTasks();
  }, [taskPage]);

  const fetchTasks = async () => {
    setTaskLoading(true);
    try {
      // 正常分页拉取样品，取当前页出现的任务去重展示；total 直接用接口返回值
      const res = await readSampleHelper({ page: taskPage, rows: taskPageSize, status: null });
      if (res.data?.status === 0) {
        const rawRows = res.data.data.rows || [];
        const taskMap = new Map();
        rawRows.forEach(sample => {
          if (sample.task_id && !taskMap.has(sample.task_id)) {
            taskMap.set(sample.task_id, {
              id: sample.task_id,
              lab_code: sample.task_lab_code,
              name: sample.task_name,
            });
          }
        });
        setTasks(Array.from(taskMap.values()));
        setTaskTotal(res.data.data.total || 0);
      }
    } catch (error) {
      message.error('加载任务列表失败');
    } finally {
      setTaskLoading(false);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        status: activeTab === 'all' ? null : parseInt(activeTab),
        query: queryParams.query,
        page: queryParams.page - 1,
        rows: queryParams.rows,
      };
      // “全部任务”模式下不传 task_ids，交由接口自身分页返回全部辅助任务
      if (!viewAll && taskId) {
        params.task_ids = [taskId];
      }
      const response = await readSampleHelper(params);
      if (response.data?.status === 0) {
        const rawRows = response.data.data.rows || [];
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
  }, [viewAll, taskId, activeTab, queryParams]);

  useEffect(() => {
    fetchData();
    setSelectedRowKeys([]);
  }, [fetchData]);

  const handleSelectTask = (id) => {
    if (!viewAll && id === taskId) return;
    setViewAll(false);
    setTaskId(id);
    setActiveTab('0');
    setQueryParams({ query: '', page: 1, rows: 10 });
  };

  const handleSelectAll = () => {
    if (viewAll) return;
    setViewAll(true);
    setTaskId(null);
    setActiveTab('0');
    setQueryParams({ query: '', page: 1, rows: 10 });
  };

  // 展平为“一行一条辅助任务”，不再按样品展开
  const flatRows = useMemo(() => {
    const rows = [];
    data.forEach(sample => {
      sample.filteredHelpers.forEach(h => {
        rows.push({
          key: `${sample.id}-${h.method_id}`,
          sampleId: sample.id,
          lab_code: sample.lab_code,
          task_lab_code: sample.task_lab_code || selectedTask?.lab_code,
          method_id: h.method_id,
          method_name: h.method_name,
          status: h.status,
          updated_at: h.updated_at,
        });
      });
    });
    return rows;
  }, [data, selectedTask]);

  const handleApprove = (record) => {
    Modal.confirm({
      title: '确认辅助任务',
      content: `是否确认样品 ${record.task_lab_code}-${record.lab_code?.toString().padStart(4, '0')} 的 [${record.method_name}] 辅助任务？`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          const res = await approveSampleHelper({
            sample_id: record.sampleId,
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

  const handleReject = (record) => {
    Modal.confirm({
      title: '拒绝辅助任务',
      content: `是否拒绝样品 ${record.task_lab_code}-${record.lab_code?.toString().padStart(4, '0')} 的 [${record.method_name}] 辅助任务？`,
      okText: '确认',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          const res = await rejectSampleHelper({
            sample_id: record.sampleId,
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

  const handleBatchApprove = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要确认的任务');
      return;
    }
    const selectedSampleIds = [...new Set(selectedRowKeys.map(key => parseInt(key.split('-')[0])))];
    Modal.confirm({
      title: '批量确认辅助任务',
      content: `是否确认选中的 ${selectedRowKeys.length} 条辅助任务？`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          const res = await batchApproveSampleHelper({ sample_ids: selectedSampleIds });
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

  const handleBatchReject = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要拒绝的任务');
      return;
    }
    const selectedSampleIds = [...new Set(selectedRowKeys.map(key => parseInt(key.split('-')[0])))];
    Modal.confirm({
      title: '批量拒绝辅助任务',
      content: `是否拒绝选中的 ${selectedRowKeys.length} 条辅助任务？`,
      okText: '确认',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          const res = await batchRejectSampleHelper({ sample_ids: selectedSampleIds });
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
      title: '样品编号',
      dataIndex: 'lab_code',
      key: 'lab_code',
      width: 140,
      render: (text, record) => (
        <span className="font-bold text-blue-600 font-mono text-xs">
          {record.task_lab_code}-{text?.toString().padStart(4, '0')}
        </span>
      ),
    },
    {
      title: '检测方法',
      dataIndex: 'method_name',
      key: 'method_name',
      render: (text) => <span className="text-sm font-medium text-slate-700">{text}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status) => (
        status === 1
          ? <Tag color="green" className="m-0">已确认</Tag>
          : <Tag color="gold" className="m-0">待确认</Tag>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 160,
      render: (t) => <span className="text-[11px] font-mono text-slate-400">{t || '-'}</span>,
    },
    {
      title: '操作',
      key: 'action',
      width: 130,
      render: (_, record) => (
        record.status === 0 ? (
          <Space size="small">
            <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => handleApprove(record)}>
              确认
            </Button>
            <Button type="link" size="small" danger icon={<CloseCircleOutlined />} onClick={() => handleReject(record)}>
              拒绝
            </Button>
          </Space>
        ) : <span className="text-slate-300 text-xs">-</span>
      ),
    },
  ];

  const rowSelection = activeTab === '0' ? {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
  } : null;

  return (
    <Layout className="bg-white h-[calc(100vh-120px)] overflow-hidden helper-center-layout">
      <style>{`
        .helper-center-layout { background: #fff; }
        .helper-center-layout .ant-layout-sider { background: #fff; }
        .helper-center-layout .task-list-item:hover { background: #f1f5f9; }
        .helper-center-layout .task-list-item.active {
          background: #f1f5f9;
          color: #2563eb;
          border-right: 4px solid #2563eb;
        }
        .helper-center-layout .ant-spin-nested-loading,
        .helper-center-layout .ant-spin-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>

      <Sider width={280} theme="light" className="border-r border-gray-100 h-full flex flex-col">
        <div className="p-3 flex flex-col h-full bg-white">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-50 flex-shrink-0">
            <span className="text-gray-600 font-black uppercase tracking-widest text-base">任务列表</span>
          </div>

          <div className="text-xs text-gray-400 font-bold mb-2 px-1 uppercase tracking-widest flex items-center gap-2 flex-shrink-0">
            <TeamOutlined /> 我的辅助任务
          </div>

          {/* “全部任务”按钮：选中后右侧不再传 task_ids，直接展示全部辅助任务 */}
          <div
            className={`px-3 py-2 mb-2 rounded-lg cursor-pointer transition-all task-list-item flex-shrink-0 ${viewAll ? "active font-bold" : "text-gray-600"}`}
            onClick={handleSelectAll}
          >
            <span className="text-sm font-bold flex items-center gap-1.5">
              <TeamOutlined /> 全部任务
            </span>
          </div>

          <Spin
            spinning={taskLoading && tasks.length === 0}
            wrapperClassName="flex-1 flex flex-col overflow-hidden"
            description="加载任务..."
          >
            <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
              {tasks.map((item) => (
                <div
                  key={item.id}
                  className={`px-3 py-2 mb-1.5 rounded-lg cursor-pointer transition-all task-list-item ${!viewAll && taskId === item.id ? "active font-bold" : "text-gray-600"}`}
                  onClick={() => handleSelectTask(item.id)}
                >
                  <span className="text-sm truncate w-full font-bold text-slate-800 flex items-center gap-1.5">
                    <Tag className="m-0 font-black text-[10px] bg-slate-100 border-none text-slate-500">#{item.id}</Tag>
                    <span className="truncate">{item.lab_code}-{item.name || "未命名任务"}</span>
                  </span>
                </div>
              ))}
              {tasks.length === 0 && !taskLoading && (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无任务数据" />
              )}
            </div>

            <div className="flex justify-center items-center gap-3 py-2 border-t border-slate-100 flex-shrink-0 mt-1">
              <Button type="text" size="small" icon={<LeftOutlined />} disabled={taskPage === 0} onClick={() => setTaskPage(prev => prev - 1)} />
              <span className="font-mono text-xs text-slate-600">
                第 {taskPage + 1} / {Math.max(1, Math.ceil(taskTotal / taskPageSize))} 页
              </span>
              <Button type="text" size="small" icon={<RightOutlined />} disabled={(taskPage + 1) * taskPageSize >= taskTotal} onClick={() => setTaskPage(prev => prev + 1)} />
            </div>
          </Spin>
        </div>
      </Sider>

      <Content className="bg-white flex flex-col h-full overflow-hidden">
            <div className="px-4 pt-3 flex-shrink-0">
              <h1 className="text-xl font-black text-slate-800 m-0 tracking-tight flex items-center gap-2">
                <InboxOutlined className="text-blue-600" />
                {viewAll ? '全部任务' : `${selectedTask?.lab_code}-${selectedTask?.name}`}
              </h1>

              <div className="flex justify-between items-center mb-2 mt-2 min-h-[32px]">
                <Input.Search
                  placeholder="请输入关键词查询..."
                  allowClear
                  onSearch={(value) => setQueryParams(prev => ({ ...prev, query: value, page: 1 }))}
                  style={{ width: 300 }}
                  enterButton="搜索"
                />

                <div className="flex-1" />

                <Space wrap>
                  {activeTab === '0' && (
                    <>
                      <Button type="primary" disabled={selectedRowKeys.length === 0} onClick={handleBatchApprove}>
                        批量确认
                      </Button>
                      <Button danger disabled={selectedRowKeys.length === 0} onClick={handleBatchReject}>
                        批量拒绝
                      </Button>
                    </>
                  )}
                </Space>
              </div>

              <Tabs
                size="small"
                activeKey={activeTab}
                onChange={(key) => {
                  setActiveTab(key);
                  setQueryParams(prev => ({ ...prev, page: 1 }));
                  setSelectedRowKeys([]);
                }}
                items={[
                  { key: '0', label: '待确认' },
                  { key: '1', label: '已确认' },
                ]}
              />
            </div>

            <div className="px-4 pb-4 flex-1 overflow-hidden">
              <Table
                size="middle"
                rowKey="key"
                columns={columns}
                dataSource={flatRows}
                loading={loading}
                rowSelection={rowSelection}
                pagination={{
                  current: queryParams.page,
                  pageSize: queryParams.rows,
                  total,
                  onChange: (page, rows) => setQueryParams({ ...queryParams, page, rows }),
                  showSizeChanger: true,
                  showTotal: (t) => `共 ${t} 个样品`,
                }}
              />
            </div>
      </Content>
    </Layout>
  );
};

export default SampleHelper;
