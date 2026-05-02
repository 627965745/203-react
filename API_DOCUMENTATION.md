# LIMS-Python Admin接口文档

## 文档信息
- **版本**: v1.0
- **基础路径**: `/Admin`
- **认证方式**: Session认证（用户组权限bitwise & 1）
- **内容类型**: `application/json`

---

## 通用规范

### 请求方法
所有接口统一使用 `POST` 方法，除了以下特殊接口：
- `Control.read` - GET
- `Department.read` - GET

### 通用响应格式
```json
{
  "code": 0,
  "message": "",
  "data": {}
}
```

### 响应状态码
| 状态码 | 说明 |
|--------|------|
| 0 | 成功 |
| 11 | 用户组不匹配（无权限）|
| 101 | 数据库无改动 |
| 102 | 数据库无改动（User.update专用）|

### 通用请求参数

#### Read接口分页参数
| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| query | string | 否 | '' | 搜索关键词 |
| page | int | 否 | 0 | 页码（从0开始）|
| rows | int | 否 | 10 | 每页条数 |

#### Combo接口参数
| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| query | string | 否 | '' | 搜索关键词 |

---

## 模块接口详情

### 1. AnalysisType - 分析类型管理

**路径前缀**: `/Admin/AnalysisType`

| 接口 | 路径 | 方法 | 说明 |
|------|------|------|------|
| create | /create | POST | 创建分析类型 |
| read | /read | POST | 分页查询列表 |
| update | /update | POST | 更新分析类型 |
| delete | /delete | POST | 软删除分析类型 |
| combo | /combo | POST | 下拉选项 |

#### Create/Update请求参数
| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| name | string | 是 | max_length=255 | 类型名称 |

#### Read响应字段
| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | ID |
| name | string | 类型名称 |
| created_at | string | 创建时间（格式：%Y-%m-%d %H:%i:%S）|
| updated_at | string | 更新时间（格式：%Y-%m-%d %H:%i:%S）|

---

### 2. Client - 客户管理

**路径前缀**: `/Admin/Client`

| 接口 | 路径 | 方法 | 说明 |
|------|------|------|------|
| create | /create | POST | 创建客户 |
| read | /read | POST | 分页查询列表 |
| update | /update | POST | 更新客户信息 |
| delete | /delete | POST | 软删除客户 |
| combo | /combo | POST | 下拉选项 |

#### Create/Update请求参数
| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| name | string | 是 | max_length=255 | 客户名称 |
| tax_code | string | 否 | min=18, max=18 | 统一社会信用代码 |
| contact | string | 否 | max_length=255 | 联系人姓名 |
| mobile | string | 否 | max_length=255 | 联系人电话 |
| landline | string | 否 | max_length=255 | 固定电话 |
| email | string | 否 | Email格式, max_length=255 | 邮箱 |
| address | string | 否 | max_length=255 | 地址 |

#### Read响应字段
| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | ID |
| name | string | 客户名称 |
| tax_code | string | 统一社会信用代码 |
| contact | string | 联系人姓名 |
| mobile | string | 联系人电话 |
| landline | string | 固定电话 |
| email | string | 邮箱 |
| address | string | 地址 |
| created_at | string | 创建时间 |
| updated_at | string | 更新时间 |

---

### 3. Control - 菜单/权限控制管理

**路径前缀**: `/Admin/Control`

| 接口 | 路径 | 方法 | 说明 |
|------|------|------|------|
| create | /create | POST | 创建菜单/权限 |
| read | /read | GET | 获取树形结构列表 |
| update | /update | POST | 更新菜单/权限 |
| delete | /delete | POST | 软删除 |
| combo | /combo | POST | 下拉选项 |
| arrange | /arrange | POST | 分配角色权限 |

#### Create/Update请求参数
| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| parent_id | int | 否 | gt=0 | 父级ID（顶级为null）|
| name | string | 是 | max_length=255 | 菜单名称 |
| path | string | 是 | max_length=255 | 路由路径 |
| icon | string | 是 | max_length=255 | 菜单图标 |
| sort | int | 是 | ge=0 | 排序号 |
| enabled | int | 是 | ge=0, le=1 | 是否启用（0/1）|

#### Read响应字段（树形结构）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | ID |
| name | string | 菜单名称 |
| path | string | 路由路径 |
| icon | string | 菜单图标 |
| sort | int | 排序号 |
| enabled | int | 是否启用 |
| roles | array | 关联角色列表 [{id, name, created_at}] |
| children | array | 子菜单列表 |

#### Arrange请求参数
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| ids | array[int] | 是 | 控制点ID列表 |
| roles | array[int] | 是 | 角色ID列表 |

---

### 4. Department - 部门/科室管理

**路径前缀**: `/Admin/Department`

| 接口 | 路径 | 方法 | 说明 |
|------|------|------|------|
| create | /create | POST | 创建部门 |
| read | /read | GET | 获取树形结构列表 |
| update | /update | POST | 更新部门 |
| delete | /delete | POST | 软删除 |
| combo | /combo | POST | 下拉选项 |

#### Create/Update请求参数
| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| parent_id | int | 否 | gt=0 | 父级ID（顶级为null）|
| name | string | 是 | max_length=255 | 部门名称 |

#### Read响应字段（树形结构）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | ID |
| name | string | 部门名称 |
| created_at | string | 创建时间 |
| updated_at | string | 更新时间 |
| children | array | 子部门列表 |

---

### 4. Device - 设备管理

**路径前缀**: `/Admin/Device`

| 接口 | 路径 | 方法 | 说明 |
|------|------|------|------|
| create | /create | POST | 创建设备 |
| read | /read | POST | 分页查询列表 |
| update | /update | POST | 更新设备 |
| delete | /delete | POST | 软删除 |
| combo | /combo | POST | 下拉选项 |
| calibrate | /calibrate | POST | **第二阶段** 设备校准 |

#### Create/Update请求参数
| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| category_id | int | 是 | - | 设备分类ID |
| name | string | 是 | max_length=255 | 设备名称 |
| vendor | string | 否 | max_length=255 | 供应商 |
| model | string | 否 | max_length=255 | 型号 |
| serial | string | 否 | max_length=255 | 序列号 |
| factory_code | string | 否 | max_length=255 | 出厂编号 |
| asset_code | string | 否 | max_length=255 | 资产编号 |
| manufactured_at | date | 否 | - | 出厂日期 |
| commissioned_at | date | 否 | - | 启用日期 |
| calibration_interval | int | 是 | - | 校准周期(天) |
| maintainer_id | int | 是 | - | 维护人ID |
| description | string | 否 | max_length=255 | **第二阶段** 备注（原notes）|
| enabled | int | 是 | ge=0, le=1 | 是否启用 |

#### Read响应字段
| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | ID |
| category_name | string | 分类名称（JOIN）|
| category_id | int | 分类ID |
| name | string | 设备名称 |
| vendor | string | 供应商 |
| model | string | 型号 |
| serial | string | 序列号 |
| factory_code | string | 出厂编号 |
| asset_code | string | 资产编号 |
| manufactured_at | string | 出厂日期（%Y-%m-%d）|
| commissioned_at | string | 启用日期（%Y-%m-%d）|
| calibration_interval | int | 校准周期(天) |
| maintainer_name | string | 维护人姓名（JOIN）|
| maintainer_id | int | 维护人ID |
| description | string | 备注 |
| enabled | int | 是否启用 |
| calibration_logs | array | **第二阶段** 校准记录列表 [{calibrator, calibrated_at, created_at}] |
| expired_by | string | 校准到期时间或"无校准记录" |
| created_at | string | 创建时间 |
| updated_at | string | 更新时间 |

#### Calibrate请求参数
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| device_id | int | 是 | 设备ID |
| calibrator | string | 是 | 校准人 |
| calibrated_at | date | 是 | 校准日期 |

---

### 5. DeviceCategory - 设备分类管理

**路径前缀**: `/Admin/DeviceCategory`

| 接口 | 路径 | 方法 | 说明 |
|------|------|------|------|
| create | /create | POST | 创建设备分类 |
| read | /read | POST | 分页查询列表 |
| update | /update | POST | 更新分类 |
| delete | /delete | POST | 软删除 |
| combo | /combo | POST | 下拉选项（code - name格式）|

#### Create/Update请求参数
| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| code | string | 是 | max_length=255 | 分类编码 |
| name | string | 是 | max_length=255 | 分类名称 |

#### Read响应字段
| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | ID |
| code | string | 分类编码 |
| name | string | 分类名称 |
| created_at | string | 创建时间 |
| updated_at | string | 更新时间 |

---

### 6. ProcessingMethod - 加工方法管理

**路径前缀**: `/Admin/ProcessingMethod`

| 接口 | 路径 | 方法 | 说明 |
|------|------|------|------|
| create | /create | POST | 创建加工方法 |
| read | /read | POST | 分页查询列表 |
| update | /update | POST | 更新加工方法 |
| delete | /delete | POST | 软删除 |
| combo | /combo | POST | 下拉选项 |

#### Create/Update请求参数
| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| name | string | 是 | max_length=255 | 方法名称 |
| enabled | int | 是 | ge=0, le=1 | 是否启用 |

---

### 8. ProcessingOption - 加工选项管理

**路径前缀**: `/Admin/ProcessingOption`

| 接口 | 路径 | 方法 | 说明 |
|------|------|------|------|
| create | /create | POST | 创建加工选项 |
| read | /read | POST | 分页查询列表（按加工方法筛选）|
| update | /update | POST | 更新加工选项 |
| delete | /delete | POST | 软删除 |
| combo | /combo | POST | 下拉选项（value (method_name)格式）|

#### Create/Update请求参数
| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| processing_method_id | int | 是 | - | 关联加工方法ID |
| value | string | 是 | max_length=255 | 选项值 |
| enabled | int | 是 | ge=0, le=1 | 是否启用 |

#### Read请求参数
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| processing_method_id | int | 是 | 加工方法ID |
| page | int | 否 | 页码 |
| rows | int | 否 | 每页条数 |

---

### 9. Reagent - 试剂管理

**路径前缀**: `/Admin/Reagent`

| 接口 | 路径 | 方法 | 说明 |
|------|------|------|------|
| create | /create | POST | 创建试剂 |
| read | /read | POST | 分页查询列表（支持分类筛选）|
| update | /update | POST | 更新试剂 |
| delete | /delete | POST | 软删除 |
| combo | /combo | POST | 下拉选项 |

#### Create/Update请求参数
| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| name | string | 是 | max_length=255 | 试剂名称 |
| category | int | 是 | ge=0, le=2 | 类型（0=易制毒, 1=易制爆, 2=一般试剂）|
| unit | string | 是 | max_length=255 | 单位 |
| alert_threshold | float | 是 | ge=0 | 报警阈值 |
| safety_sticker | string | 否 | max_length=255 | 安全合规警示贴文件路径 |
| description | string | 是 | max_length=255 | 描述 |

#### Read请求参数
| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| category | int | 否 | null | 分类筛选 |
| query | string | 否 | '' | 搜索关键词 |
| page | int | 否 | 0 | 页码 |
| rows | int | 否 | 10 | 每页条数 |

#### Read响应字段
| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | ID |
| name | string | 试剂名称 |
| category | int | 类型（0=易制毒, 1=易制爆, 2=一般试剂）|
| unit | string | 单位 |
| alert_threshold | string | 报警阈值（字符串格式）|
| safety_sticker | string | 安全警示贴路径 |
| description | string | 描述 |
| created_at | string | 创建时间 |
| updated_at | string | 更新时间 |

---

### 8. ReagentStorage - 试剂柜管理

**路径前缀**: `/Admin/ReagentStorage`

| 接口 | 路径 | 方法 | 说明 |
|------|------|------|------|
| create | /create | POST | 创建试剂柜 |
| read | /read | POST | 分页查询列表 |
| update | /update | POST | 更新试剂柜 |
| delete | /delete | POST | 软删除 |
| combo | /combo | POST | 下拉选项 |

#### Create/Update请求参数
| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| name | string | 是 | max_length=255 | 试剂柜名称 |

---

### 9. ReagentStock - 试剂库存管理（第二阶段新增模块）

**路径前缀**: `/Admin/ReagentStock`

| 接口 | 路径 | 方法 | 说明 |
|------|------|------|------|
| create | /create | POST | 入库（创建库存批次）|
| read | /read | POST | 分页查询列表 |
| update | /update | POST | 更新库存信息 |
| delete | /delete | POST | 软删除 |
| action | /action | POST | 领用/归还操作 |
| logs | /logs | POST | 查询操作日志 |

#### Create请求参数
| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| reagent_id | int | 是 | - | 试剂ID |
| specification | float | 是 | ge=0 | 规格 |
| quantity | float | 是 | ge=0 | 入库数量 |
| storage_id | int | 是 | - | 试剂柜ID |
| row | int | 是 | - | 行号 |
| description | string | 否 | max_length=255 | 备注 |

#### Create响应
返回实验室编码 lab_code

#### Read请求参数
| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| reagent_id | int | 是 | - | 试剂ID |
| query | string | 否 | '' | 搜索关键词 |
| page | int | 否 | 0 | 页码 |
| rows | int | 否 | 10 | 每页条数 |

#### Read响应字段
| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | ID |
| lab_code | string | 实验室编码 |
| specification | string | 规格（字符串格式）|
| storage_id | int | 试剂柜ID |
| storage_name | string | 试剂柜名称 |
| row | int | 行号 |
| description | string | 备注 |
| user_name | string | 当前领用人 |
| status | int | 状态（0=在库, 1=领用中, 2=已归还, 3=已用完）|
| quantity | string | 当前余量 |
| created_at | string | 创建时间 |
| updated_at | string | 更新时间 |

#### Update请求参数
| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| id | int | 是 | - | 库存ID |
| specification | float | 是 | ge=0 | 规格 |
| storage_id | int | 是 | - | 试剂柜ID |
| row | int | 是 | - | 行号 |
| description | string | 否 | max_length=255 | 备注 |

#### Action请求参数
| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| id | int | 是 | - | 库存ID |
| user_id | int | 是 | - | 使用人ID |
| action | int | 是 | ge=1, le=2 | 1=领用, 2=归还 |
| quantity | float | 是 | ge=0 | 数量 |
| description | string | 否 | max_length=255 | 备注 |

#### Logs请求参数
| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| stock_id | int | 否 | null | 库存ID筛选 |
| operator_id | int | 否 | null | 操作人ID筛选 |
| user_id | int | 否 | null | 使用人ID筛选 |
| type | int | 否 | null | 类型筛选（0=入库, 1=领用, 2=归还, 3=用完）|
| page | int | 否 | 0 | 页码 |
| rows | int | 否 | 10 | 每页条数 |

#### Logs响应字段
| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | ID |
| reagent_name | string | 试剂名称 |
| lab_code | string | 实验室编码 |
| operator_name | string | 操作人 |
| user_name | string | 使用人 |
| type | int | 类型（0=入库, 1=领用, 2=归还, 3=用完）|
| remaining | string | 余量 |
| description | string | 备注 |
| created_at | string | 操作时间 |

---

### 10. ReferenceMaterial - 标准物质管理

**路径前缀**: `/ReagentAdmin/ReferenceMaterial`

| 接口 | 路径 | 方法 | 说明 |
|------|------|------|------|
| create | /create | POST | 创建标准物质 |
| read | /read | POST | 分页查询列表（支持多条件筛选）|
| update | /update | POST | 更新标准物质 |
| delete | /delete | POST | 软删除 |
| combo | /combo | POST | 下拉选项 |

#### Create/Update请求参数
| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| name | string | 是 | max_length=255 | 名称 |
| category | int | 是 | ge=0, le=2 | 分类（0=标准物质, 1=标准溶液, 2=基准试剂）|
| stage | int | 是 | ge=0, le=3 | 阶段（0=原液, 1=中间液, 2=工作液, 3=标准曲线）|
| physical_state | int | 是 | ge=0, le=2 | 物理形态（0=固态, 1=液态, 2=气态）|
| lab_code | string | 否 | max_length=255 | 实验室内部编码 |
| sample_code | string | 否 | max_length=255 | 样品编码 |
| batch_code | string | 否 | max_length=255 | 批号 |
| vendor | string | 否 | max_length=255 | 研制单位 |
| location | string | 否 | max_length=255 | 存放地点 |
| quantity | float | 是 | ge=0 | 规格 |
| remaining | float | 是 | ge=0 | 余量 |
| alert_threshold | float | 是 | ge=0 | 报警阈值 |
| uncertainty | float | 否 | ge=0, le=100 | 相对扩展不确定度(%) |
| mass_concentration | float | 否 | ge=0, le=100 | 质量浓度(%) |
| medium_type | int | 是 | ge=0, le=2 | 介质类型 |
| medium_concentration | float | 否 | ge=0, le=100 | 介质浓度(%) |
| confirmed_at | date | 否 | - | 定值日期 |
| expiring_at | date | 否 | - | 有效期至 |

#### Read请求参数（筛选条件）
| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| category | int | 否 | null | 分类筛选 |
| stage | int | 否 | null | 阶段筛选 |
| physical_state | int | 否 | null | 物理形态筛选 |
| medium_type | int | 否 | null | 介质类型筛选 |
| query | string | 否 | '' | 搜索关键词 |
| page | int | 否 | 0 | 页码 |
| rows | int | 否 | 10 | 每页条数 |

---

### 12. ReportCover - 报告封面模板管理

**路径前缀**: `/Admin/ReportCover`

| 接口 | 路径 | 方法 | 说明 |
|------|------|------|------|
| create | /create | POST | 创建封面模板 |
| read | /read | POST | 分页查询列表 |
| update | /update | POST | 更新封面模板 |
| delete | /delete | POST | 软删除 |
| combo | /combo | POST | 下拉选项 |
| fieldCreate | /fieldCreate | POST | **第二阶段** 创建字段 |
| fieldUpdate | /fieldUpdate | POST | **第二阶段** 更新字段 |
| fieldDelete | /fieldDelete | POST | **第二阶段** 删除字段 |

#### Create/Update请求参数
| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| name | string | 是 | max_length=255 | 模板名称 |
| template_file | string | 是 | max_length=255 | Word模板文件路径 |
| description | string | 否 | max_length=255 | 描述 |

#### Read响应字段
| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | ID |
| name | string | 模板名称 |
| template_file | string | 模板文件路径 |
| description | string | 描述 |
| fields | array | **第二阶段** 字段列表 [{id, name, key, type, input_mapped_from, result_mapped_from, fixed_value, enabled, created_at, updated_at}] |
| created_at | string | 创建时间 |
| updated_at | string | 更新时间 |

#### FieldCreate请求参数
| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| cover_id | int | 是 | - | 封面模板ID |
| name | string | 是 | max_length=255 | 字段名称 |
| key | string | 是 | max_length=255 | 字段键名 |
| type | int | 是 | ge=0, le=3 | 类型（0=手动录入, 1=输入数据映射, 2=检测结果映射, 3=固定值）|
| input_mapped_from | string | 否 | max_length=255 | 输入数据映射来源 |
| result_mapped_from | string | 否 | max_length=255 | 检测结果映射来源 |
| fixed_value | string | 否 | max_length=255 | 固定值 |
| enabled | int | 是 | ge=0, le=1 | 是否启用 |

#### FieldUpdate请求参数
| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| id | int | 是 | - | 字段ID |
| name | string | 是 | max_length=255 | 字段名称 |
| key | string | 是 | max_length=255 | 字段键名 |
| type | int | 是 | ge=0, le=3 | 类型 |
| input_mapped_from | string | 否 | max_length=255 | 输入数据映射来源 |
| result_mapped_from | string | 否 | max_length=255 | 检测结果映射来源 |
| fixed_value | string | 否 | max_length=255 | 固定值 |
| enabled | int | 是 | ge=0, le=1 | 是否启用 |

#### FieldDelete请求参数
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int | 是 | 字段ID |

---

### 13. ReportTable - 报告数据表管理

**路径前缀**: `/Admin/ReportTable`

| 接口 | 路径 | 方法 | 说明 |
|------|------|------|------|
| create | /create | POST | 创建数据表 |
| read | /read | POST | 分页查询列表 |
| update | /update | POST | 更新数据表 |
| delete | /delete | POST | 软删除 |
| combo | /combo | POST | 下拉选项 |
| fieldCreate | /fieldCreate | POST | **第二阶段** 创建字段 |
| fieldUpdate | /fieldUpdate | POST | **第二阶段** 更新字段 |
| fieldDelete | /fieldDelete | POST | **第二阶段** 删除字段 |

#### Create/Update请求参数
| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| name | string | 是 | max_length=255 | 表名称 |
| description | string | 否 | max_length=255 | 描述 |

#### Read响应字段
| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | ID |
| name | string | 表名称 |
| description | string | 描述 |
| fields | array | **第二阶段** 字段列表 [{id, name, type, input_mapped_from, result_mapped_from, fixed_value, sort, enabled, created_at, updated_at}] |
| created_at | string | 创建时间 |
| updated_at | string | 更新时间 |

#### FieldCreate请求参数
| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| table_id | int | 是 | - | 数据表ID |
| name | string | 是 | max_length=255 | 字段名称 |
| type | int | 是 | ge=0, le=3 | 类型（0=手动录入, 1=输入数据映射, 2=检测结果映射, 3=固定值）|
| input_mapped_from | string | 否 | max_length=255 | 输入数据映射来源 |
| result_mapped_from | string | 否 | max_length=255 | 检测结果映射来源 |
| fixed_value | string | 否 | max_length=255 | 固定值 |
| sort | int | 是 | ge=0 | 排序号 |
| enabled | int | 是 | ge=0, le=1 | 是否启用 |

#### FieldUpdate请求参数
| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| id | int | 是 | - | 字段ID |
| name | string | 是 | max_length=255 | 字段名称 |
| type | int | 是 | ge=0, le=3 | 类型 |
| input_mapped_from | string | 否 | max_length=255 | 输入数据映射来源 |
| result_mapped_from | string | 否 | max_length=255 | 检测结果映射来源 |
| fixed_value | string | 否 | max_length=255 | 固定值 |
| sort | int | 是 | ge=0 | 排序号 |
| enabled | int | 是 | ge=0, le=1 | 是否启用 |

#### FieldDelete请求参数
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int | 是 | 字段ID |

---

### 14. Role - 角色管理

**路径前缀**: `/Admin/Role`

| 接口 | 路径 | 方法 | 说明 |
|------|------|------|------|
| create | /create | POST | 创建角色 |
| read | /read | POST | 分页查询列表 |
| update | /update | POST | 更新角色 |
| delete | /delete | POST | 软删除 |
| combo | /combo | POST | 下拉选项 |

#### Create/Update请求参数
| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| name | string | 是 | max_length=255 | 角色名称 |
| bitwise | int | 是 | ge=0, lt=32 | 权限位 |

#### Read响应字段
| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | ID |
| name | string | 角色名称 |
| bitwise | int | 权限位 |
| created_at | string | 创建时间 |
| updated_at | string | 更新时间 |

---

### 15. TaskAnalysisType - 任务分析类型管理（第二阶段重命名）

**路径前缀**: `/Admin/TaskAnalysisType`

**变更说明**: 原 `AnalysisType` 重命名为 `TaskAnalysisType`，对应表 `analysis_types` → `task_analysis_types`

| 接口 | 路径 | 方法 | 说明 |
|------|------|------|------|
| create | /create | POST | 创建分析类型 |
| read | /read | POST | 分页查询列表 |
| update | /update | POST | 更新分析类型 |
| delete | /delete | POST | 软删除分析类型 |
| combo | /combo | POST | 下拉选项 |

#### Create/Update请求参数
| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| name | string | 是 | max_length=255 | 类型名称 |

#### Read响应字段
| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | ID |
| name | string | 类型名称 |
| created_at | string | 创建时间 |
| updated_at | string | 更新时间 |

---

### 16. TaskSampleType - 任务样品类型管理（第二阶段重命名）

**路径前缀**: `/Admin/TaskSampleType`

**变更说明**: 原 `TaskType` 重命名为 `TaskSampleType`，对应表 `task_types` → `task_sample_types`

| 接口 | 路径 | 方法 | 说明 |
|------|------|------|------|
| create | /create | POST | 创建样品类型 |
| read | /read | POST | 分页查询列表 |
| update | /update | POST | 更新样品类型 |
| delete | /delete | POST | 软删除 |
| combo | /combo | POST | 下拉选项（code - name格式）|

#### Create/Update请求参数
| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| code | string | 是 | max_length=255 | 类型编码 |
| name | string | 是 | max_length=255 | 类型名称 |

---

### 17. TestCategory - 检测类别管理

**路径前缀**: `/Admin/TestCategory`

| 接口 | 路径 | 方法 | 说明 |
|------|------|------|------|
| create | /create | POST | 创建检测类别 |
| read | /read | POST | 分页查询列表 |
| update | /update | POST | 更新检测类别 |
| delete | /delete | POST | 软删除 |
| combo | /combo | POST | 下拉选项 |

#### Create/Update请求参数
| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| name | string | 是 | max_length=255 | 类别名称（唯一）|

---

### 18. TestItem - 检测项目管理

**路径前缀**: `/Admin/TestItem`

| 接口 | 路径 | 方法 | 说明 |
|------|------|------|------|
| create | /create | POST | 创建检测项目 |
| read | /read | POST | 分页查询列表 |
| update | /update | POST | 更新检测项目 |
| delete | /delete | POST | 软删除 |
| combo | /combo | POST | 下拉选项 |
| arrange | /arrange | POST | **第二阶段** 关联检测方法 |

#### Create/Update请求参数
| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| category_id | int | 是 | - | 关联类别ID |
| name | string | 是 | max_length=255 | 项目名称 |

#### Read请求参数
| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| category_id | int | 否 | null | 类别ID筛选 |
| query | string | 否 | '' | 搜索关键词 |
| page | int | 否 | 0 | 页码 |
| rows | int | 否 | 10 | 每页条数 |

#### Read响应字段
| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | ID |
| category_id | int | 类别ID |
| category_name | string | 类别名称（JOIN）|
| name | string | 项目名称 |
| methods | array | **第二阶段** 关联方法 [{id, name, code, created_at}] |
| created_at | string | 创建时间 |
| updated_at | string | 更新时间 |

#### Arrange请求参数
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| ids | array[int] | 是 | 检测项目ID列表 |
| method_ids | array[int] | 是 | 检测方法ID列表 |

---

### 19. TestMethod - 检测方法管理

**路径前缀**: `/Admin/TestMethod`

| 接口 | 路径 | 方法 | 说明 |
|------|------|------|------|
| create | /create | POST | 创建检测方法 |
| read | /read | POST | 分页查询列表 |
| update | /update | POST | 更新检测方法 |
| delete | /delete | POST | 软删除 |
| combo | /combo | POST | 下拉选项（name - code格式）|
| arrange | /arrange | POST | **第二阶段** 关联检测项目 |
| fieldCreate | /fieldCreate | POST | **第二阶段** 创建参数字段 |
| fieldUpdate | /fieldUpdate | POST | **第二阶段** 更新参数字段 |
| fieldDelete | /fieldDelete | POST | **第二阶段** 删除参数字段 |

#### Create/Update请求参数
| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| name | string | 是 | max_length=255 | 方法名称 |
| code | string | 是 | max_length=255 | 国标代码 |

#### Read响应字段
| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | ID |
| name | string | 方法名称 |
| code | string | 国标代码 |
| fields | array | **第二阶段** 参数字段列表 [{id, name, key, scope, type, is_required, source_type, input_mapped_from, fixed_value, device_api, code, sort, enabled, created_at, updated_at}] |
| items | array | **第二阶段** 关联项目 [{id, name, created_at}] |
| created_at | string | 创建时间 |
| updated_at | string | 更新时间 |

#### Arrange请求参数
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| ids | array[int] | 是 | 检测方法ID列表 |
| item_ids | array[int] | 是 | 检测项目ID列表 |

#### FieldCreate请求参数
| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| method_id | int | 是 | - | 检测方法ID |
| name | string | 是 | max_length=255 | 字段名称 |
| key | string | 是 | max_length=255 | 字段键名 |
| scope | int | 是 | ge=0, le=1 | 作用域（0=公共参数, 1=结果字段）|
| type | int | 是 | ge=0, le=2 | 数据类型（0=文本, 1=数值, 2=日期）|
| is_required | int | 是 | ge=0, le=1 | 是否必填 |
| source_type | int | 是 | ge=0, le=4 | 数据来源（0=手动录入, 1=输入数据映射, 2=固定值, 3=设备采集, 4=代码计算）|
| input_mapped_from | string | 否 | max_length=255 | 输入数据映射来源 |
| fixed_value | string | 否 | max_length=255 | 固定值 |
| device_api | string | 否 | max_length=255 | 设备API接口 |
| code | string | 否 | - | 计算代码 |
| sort | int | 是 | ge=0 | 排序号 |
| enabled | int | 是 | ge=0, le=1 | 是否启用 |

#### FieldUpdate请求参数
| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| id | int | 是 | - | 字段ID |
| name | string | 是 | max_length=255 | 字段名称 |
| key | string | 是 | max_length=255 | 字段键名 |
| scope | int | 是 | ge=0, le=1 | 作用域 |
| type | int | 是 | ge=0, le=2 | 数据类型 |
| is_required | int | 是 | ge=0, le=1 | 是否必填 |
| source_type | int | 是 | ge=0, le=4 | 数据来源 |
| input_mapped_from | string | 否 | max_length=255 | 输入数据映射来源 |
| fixed_value | string | 否 | max_length=255 | 固定值 |
| device_api | string | 否 | max_length=255 | 设备API接口 |
| code | string | 否 | - | 计算代码 |
| sort | int | 是 | ge=0 | 排序号 |
| enabled | int | 是 | ge=0, le=1 | 是否启用 |

#### FieldDelete请求参数
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int | 是 | 字段ID |

---

### 20. User - 用户管理

**路径前缀**: `/Admin/User`

| 接口 | 路径 | 方法 | 说明 |
|------|------|------|------|
| create | /create | POST | 创建用户 |
| read | /read | POST | 分页查询列表 |
| update | /update | POST | 更新用户信息 |
| delete | /delete | POST | 软删除（不能删除自己）|
| combo | /combo | POST | 下拉选项 |
| reset | /reset | POST | 重置密码 |
| arrange | /arrange | POST | **第二阶段** 分配角色 |

#### Create/Update请求参数
| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| name | string | 是 | max_length=255 | 登录名（唯一）|
| nickname | string | 是 | max_length=255 | 昵称 |
| password | string | 是 | min=8, max=32 | 密码 |
| department_id | int | 是 | - | 部门ID |
| is_manager | int | 是 | ge=0, le=1 | 是否科室负责人 |
| id_name | string | 否 | max_length=255 | 真实姓名 |
| id_number | string | 否 | max_length=255 | 证件号码（唯一）|
| contact | string | 否 | max_length=255 | 联系方式 |
| signature_file | string | 否 | max_length=255 | 签名文件路径 |
| enabled | int | 是 | ge=0, le=1 | 是否启用 |

#### Read请求参数
| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| department_id | int | 否 | null | 部门ID筛选 |
| query | string | 否 | '' | 搜索关键词 |
| page | int | 否 | 0 | 页码 |
| rows | int | 否 | 10 | 每页条数 |

#### Read响应字段
| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | ID |
| name | string | 登录名 |
| nickname | string | 昵称 |
| department_name | string | 部门名称（JOIN）|
| department_id | int | 部门ID |
| is_manager | int | 是否科室负责人 |
| id_name | string | 真实姓名 |
| id_number | string | 证件号码 |
| contact | string | 联系方式 |
| signature_file | string | 签名文件路径 |
| enabled | int | 是否启用 |
| last_login_ip | string | 最后登录IP |
| last_login_at | string | 最后登录时间 |
| roles | array | **第二阶段** 关联角色 [{id, name, created_at}] |
| created_at | string | 创建时间 |
| updated_at | string | 更新时间 |

#### Reset请求参数
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int | 是 | 用户ID |

#### Reset响应
密码重置成功后，message字段包含新密码：
```json
{
  "code": 0,
  "message": "密码已重置为 abc12345 。",
  "data": null
}
```

#### Arrange请求参数
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| ids | array[int] | 是 | 用户ID列表 |
| role_ids | array[int] | 是 | 角色ID列表 |

---

### 21. Log - 操作日志管理（第二阶段新增模块）

**路径前缀**: `/Admin/Log`

| 接口 | 路径 | 方法 | 说明 |
|------|------|------|------|
| read | /read | POST | 分页查询日志列表 |

#### Read请求参数
| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| department_id | int | 否 | null | 部门ID筛选 |
| user_id | int | 否 | null | 用户ID筛选 |
| page | int | 否 | 0 | 页码 |
| rows | int | 否 | 10 | 每页条数 |

#### Read响应字段
| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | ID |
| department_id | int | 部门ID |
| department_name | string | 部门名称 |
| user_id | int | 用户ID |
| user_name | string | 用户名称 |
| route | string | 请求路由 |
| request_data | string | 请求数据 |
| response_status | int | 响应状态码 |
| created_at | string | 创建时间 |

---

## 数据字典

### 设备分类 (DeviceCategory)
```
code: 分类编码
name: 分类名称
```

### 试剂类型 (Reagent.category)
```
0: 易制毒
1: 易制爆
2: 一般试剂
```

### 标准物质分类 (ReferenceMaterial.category)
```
0: 标准物质
1: 标准溶液
2: 基准试剂
```

### 标准物质阶段 (ReferenceMaterial.stage)
```
0: 原液
1: 中间液
2: 工作液
3: 标准曲线
```

### 物理形态 (ReferenceMaterial.physical_state)
```
0: 固态
1: 液态
2: 气态
```

### 报告字段类型 (ReportCoverField/ReportTableField.type)
```
0: 手动录入
1: 输入数据映射
2: 检测结果映射
3: 固定值
```

### 检测方法参数字段作用域 (TestMethodResultField.scope)
```
0: 公共参数
1: 结果字段
```

### 检测方法参数字段数据来源 (TestMethodResultField.source_type)
```
0: 手动录入
1: 输入数据映射
2: 固定值
3: 设备采集
4: 代码计算
```

### 试剂库存状态 (ReagentStock)
```
0: 在库
1: 领用中
2: 已归还
3: 已用完
```

### 试剂日志类型 (ReagentLog.type)
```
0: 入库
1: 领用
2: 归还
3: 用完
```

---

## 附录：接口汇总表

### 第一阶段基础CRUD模块

| 模块 | 基础路径 | 接口数量 | 特殊接口 |
|------|----------|----------|----------|
| AnalysisType | /Admin/AnalysisType | 5 | - |
| Client | /Admin/Client | 5 | - |
| Control | /Admin/Control | 6 | arrange(分配角色), read(GET) |
| Department | /Admin/Department | 5 | read(GET) |
| Device | /Admin/Device | 5 | - |
| DeviceCategory | /Admin/DeviceCategory | 5 | - |
| ProcessingMethod | /Admin/ProcessingMethod | 5 | - |
| ProcessingOption | /Admin/ProcessingOption | 5 | - |
| Reagent | /Admin/Reagent | 5 | - |
| ReagentStorage | /Admin/ReagentStorage | 5 | - |
| ReferenceMaterial | /Admin/ReferenceMaterial | 5 | - |
| ReportCover | /Admin/ReportCover | 5 | - |
| ReportTable | /Admin/ReportTable | 5 | - |
| Role | /Admin/Role | 5 | - |
| TaskType | /Admin/TaskType | 5 | - |
| TestCategory | /Admin/TestCategory | 5 | - |
| TestItem | /Admin/TestItem | 5 | - |
| TestMethod | /Admin/TestMethod | 5 | - |
| User | /Admin/User | 6 | reset(重置密码) |

**总计**: 19个模块，96个接口端点
