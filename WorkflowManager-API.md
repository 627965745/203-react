# WorkflowManager 接口文档

> 本模块位于 `FrankPy/WorkflowManager`，面向**流程管理组**用户，负责**任务（Task）**与**样品（Sample）**的全生命周期管理，包括任务登记、样品录入、检测项/方法绑定、前处理流程、任务分发与审批等核心流程。

---

## 一、模块概览

### 1.1 路由前缀
所有接口统一以 `/obj/WorkflowManager` 为前缀：
- 任务接口：`POST /obj/WorkflowManager/Task/*`
- 样品接口：`POST /obj/WorkflowManager/Sample/*`

## 二、任务管理接口（Task）

### 2.1 任务字段说明
| 字段 | 类型 | 说明 |
|------|------|------|
| `lab_code` | string | 实验室批号，由系统根据 `sample_type_id` 自动生成，格式：`类型编码` + `年份后两位` + `3位流水号` |
| `name` | string | 任务名称 |
| `client_id` | int | 客户 ID |
| `liaison_name` | string | 客户联络人姓名 |
| `liaison_contact` | string | 客户联络人电话 |
| `sample_type_id` | int | 样品类型 ID |
| `analysis_type_id` | int | 分析类型 ID |
| `physical_state` | tinyint | 物理形态：`0` 固态、`1` 液态、`2` 气态 |
| `category` | tinyint | 检测类别：`0` 委托检测、`1` 监督检测、`2` 其他 |
| `delivered_by` | tinyint | 来样方式：`0` 客户邮寄、`1` 客户送检、`2` 自采 |
| `is_processing` | tinyint | 是否需要加工：`0` 否、`1` 是 |
| `deadline` | date | 最迟完成日期 |
| `receiver_id` | int | 收样人 ID |
| `description` | string | 描述 |

### 2.2 接口列表

#### 1. 创建任务 — `POST /obj/WorkflowManager/Task/create`
- **功能**：新建任务，自动生成 `lab_code`。
- **请求体**：`CreateValidate`（字段见上表）
- **成功响应**：`{ "status": 0, "data": null, "message": null }`

#### 2. 查询任务 — `POST /obj/WorkflowManager/Task/read`
- **功能**：分页查询任务列表，支持多字段模糊搜索。
- **请求体**：
  ```json
  {
    "client_id": 1,      // 可选
    "receiver_id": 2,    // 可选
    "query": "关键字",    // 模糊搜索 lab_code / name / liaison_name / liaison_contact / description
    "page": 0,
    "rows": 10
  }
  ```
- **成功响应**：
  ```json
  {
    "status": 0,
    "data": {
      "total": 100,
      "rows": [
        {
          "id": 1,
          "lab_code": "SW24001",
          "name": "水质检测任务",
          "client_id": 1,
          "client_name": "XX公司",
          "liaison_name": "张三",
          ...
        }
      ]
    }
  }
  ```

#### 3. 更新任务 — `POST /obj/WorkflowManager/Task/update`
- **请求体**：`UpdateValidate`（含 `id` + 全部字段）

#### 4. 删除任务 — `POST /obj/WorkflowManager/Task/delete`
- **请求体**：`{ "id": 1 }`
- **说明**：软删除（`deleted_at = NOW()`）。

#### 5. 任务下拉框 — `POST /obj/WorkflowManager/Task/combo`
- **功能**：供前端下拉选择，返回 `id` 与 `lab_code - name` 拼接名称。
- **请求体**：`{ "query": "" }`

#### 6. 下载任务模板 — `POST /obj/WorkflowManager/Task/template`
- **功能**：根据客户与检测项生成 Excel 导入模板。
- **请求体**：
  ```json
  {
    "client_id": 1,
    "item_ids": [1, 2, 3]
  }
  ```
- **响应**：`StreamingResponse`（`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`），文件名：`{客户名}.xlsx`。
- **模板结构**：
  - `基础信息`：客户名、联络人、任务名称、样品类型、分析类型等。
  - `样品和项目`：每列为一个检测项，每行为一个样品。
  - `自定义数据`：样品的额外 key-value 输入项。
  - `元数据（请勿修改）`：包含下拉选项源数据及 `client_id`。

#### 7. 批量导入任务 — `POST /obj/WorkflowManager/Task/upload`
- **功能**：上传由 `template` 生成的 Excel，一次性创建任务 + 多个样品 + 样品输入项 + 样品检测项。
- **请求体**：`multipart/form-data`，字段名 `file`。
- **业务逻辑**：
  1. 解析 `基础信息` sheet，提取任务信息。
  2. 解析 `样品和项目` sheet，得到每个样品的检测项列表。
  3. 解析 `自定义数据` sheet，得到每个样品的输入项（key-value）。
  4. 插入 `tasks` 表，自动生成 `lab_code`。
  5. 循环插入 `samples`、`sample_inputs`、`sample_items`。

---

## 三、样品管理接口（Sample）

### 3.1 核心数据模型

#### 3.1.1 样品（samples）
| 字段 | 说明 |
|------|------|
| `id` | 自增 ID |
| `task_id` | 所属任务 ID |
| `client_code` | 原始编号（客户给定） |
| `lab_code` | 样品编号（任务内流水号） |
| `type` | `0` 非对照样、`1` 空白样、`2` 参比样、`3` 重复样 |
| `reference_material_id` | 参比样关联的标准物质 ID（`type=2` 时必填） |
| `parent_id` | 重复样的父样品 ID（`type=3` 时必填） |
| `creator_id` | 创建人 |
| `description` | 描述 |

#### 3.1.2 样品-检测项（sample_items）
| 字段 | 说明 |
|------|------|
| `sample_id` + `item_id` | 联合主键 |
| `processing_status` | `0` 不加工 / `1` 正在加工 / `2` 加工完成 |
| `processing_deadline` | 加工截止日期 |

#### 3.1.3 样品-检测方法（sample_methods）
| 字段 | 说明 |
|------|------|
| `sample_id` + `item_id` + `method_id` | 联合主键 |
| `department_id` | 分配部门 |
| `tester_id` | 检测员 |
| `test_deadline` | 检测截止日期 |
| `status` | `0` 管理组未下发 / `1` 组长未下发 / `2` 正在试验 / `3` 等待组长审核 / `4` 等待管理组审核 / `5` 生命周期结束 |

### 3.2 接口列表

#### 1. 创建样品 — `POST /obj/WorkflowManager/Sample/create`
- **请求体**：
  ```json
  {
    "task_id": 1,
    "client_code": "原始编号-001",
    "description": "备注"
  }
  ```
- **说明**：`lab_code` 自动为当前任务内最大编号 + 1。

#### 2. 查询样品 — `POST /obj/WorkflowManager/Sample/read`
- **功能**：分页查询某任务下的所有样品，返回**嵌套 JSON** 结构，包含输入项、检测项、前处理、方法、辅助人员、结果字段等完整信息。
- **请求体**：
  ```json
  {
    "task_id": 1,
    "query": "关键字",
    "page": 0,
    "rows": 10
  }
  ```
- **响应 data 结构示例**：
  ```json
  {
    "total": 20,
    "rows": [
      {
        "id": 1,
        "client_code": "原始编号-001",
        "lab_code": "1",
        "type": 0,
        "reference_material_id": null,
        "reference_material_name": null,
        "parent_id": null,
        "parent_client_code": null,
        "creator_id": 1,
        "creator_name": "管理员",
        "description": null,
        "inputs": [
          { "key": "颜色", "value": "无色", "created_at": "...", "updated_at": "..." }
        ],
        "items": [
          {
            "item_id": 1,
            "item_name": "pH值",
            "processing_status": 0,
            "processing_deadline": null,
            "processing": [
              { "option_id": 1, "method_id": 1, "method_name": "过滤", "created_at": "..." }
            ],
            "methods": [
              {
                "method_id": 1,
                "method_name": "电极法",
                "department_id": 2,
                "department_name": "理化室",
                "tester_id": 3,
                "tester_name": "李四",
                "test_deadline": "2024-12-31",
                "status": 1,
                "helpers": [...],
                "results": [...],
                "created_at": "...",
                "updated_at": "..."
              }
            ],
            "created_at": "...",
            "updated_at": "..."
          }
        ],
        "created_at": "2024-01-01 10:00:00",
        "updated_at": "2024-01-01 10:00:00"
      }
    ]
  }
  ```

#### 3. 更新样品 — `POST /obj/WorkflowManager/Sample/update`
- **请求体**：`{ "id": 1, "client_code": "...", "description": "..." }`

#### 4. 删除样品 — `POST /obj/WorkflowManager/Sample/delete`
- **请求体**：`{ "id": 1 }`
- **说明**：软删除。

#### 5. 生成参考样 — `POST /obj/WorkflowManager/Sample/reference`
- **功能**：批量插入对照样（空白样/参比样/重复样），并重新生成任务内所有样品的 `lab_code` 编号。
- **请求体**：
  ```json
  {
    "task_id": 1,
    "count": 3,                // 生成数量
    "type": 1,                 // 1空白样 | 2参比样 | 3重复样
    "reference_material_id": null,   // type=2 时必填
    "parent_id": null,               // type=3 时必填
    "description": "空白对照"
  }
  ```
- **编号规则**：新插入的对照样随机打散到现有样品序列中，然后统一按顺序重新编号 `1 ~ N`。

---

### 3.3 样品输入项管理

样品输入项用于存储样品的自定义字段（如颜色、气味、采样深度等）。

#### 6. 创建输入项 — `POST /obj/WorkflowManager/Sample/inputCreate`
- **请求体**：`{ "sample_id": 1, "key": "颜色", "value": "无色" }`

#### 7. 更新输入项 — `POST /obj/WorkflowManager/Sample/inputUpdate`
- **请求体**：同 `inputCreate`

#### 8. 删除输入项 — `POST /obj/WorkflowManager/Sample/inputDelete`
- **请求体**：`{ "sample_id": 1, "key": "颜色" }`
- **说明**：物理删除。

---

### 3.4 检测项绑定

#### 9. 绑定检测项 — `POST /obj/WorkflowManager/Sample/itemCreate`
- **请求体**：
  ```json
  {
    "task_id": 1,        // 与 sample_ids 二选一
    "sample_ids": [1, 2], // 若 task_id 为空则直接操作这些样品
    "item_ids": [1, 2, 3]
  }
  ```

#### 10. 解绑检测项 — `POST /obj/WorkflowManager/Sample/itemDelete`
- **请求体**：同 `itemCreate`
- **说明**：软删除 `sample_items` 记录。

---

### 3.5 检测方法绑定

#### 11. 绑定检测方法 — `POST /obj/WorkflowManager/Sample/methodCreate`
- **请求体**：
  ```json
  {
    "task_id": 1,
    "sample_ids": [1, 2],
    "item_id": 1,
    "method_ids": [1, 2]
  }
  ```

#### 12. 解绑检测方法 — `POST /obj/WorkflowManager/Sample/methodDelete`
- **请求体**：同 `methodCreate`
- **说明**：软删除 `sample_methods` 记录。

---

### 3.6 前处理流程管理

前处理流程指样品检测前需要进行的加工步骤（如过滤、消解、萃取等）。

#### 13. 创建前处理 — `POST /obj/WorkflowManager/Sample/processCreate`
- **请求体**：
  ```json
  {
    "task_id": 1,
    "sample_ids": [1, 2],
    "item_ids": [1],
    "option_ids": [1, 2],        // 加工选项 ID 列表
    "deadline": "2024-12-31T23:59:59"
  }
  ```
- **前置条件**：
  - `sample_items.processing_status == 0`（尚未开始加工）
  - 该样品-项目下**没有已分发**的检测方法（`sample_methods.status > 0`）
- **效果**：
  - `sample_items.processing_status` 设为 `1`
  - `processing_deadline` 写入截止日期
  - 向 `sample_processing` 插入加工选项记录

#### 14. 更新前处理截止日期 — `POST /obj/WorkflowManager/Sample/processUpdate`
- **请求体**：`{ "task_id": 1, "sample_ids": [...], "item_ids": [...], "deadline": "..." }`
- **前置条件**：`processing_status == 1`

#### 15. 删除前处理 — `POST /obj/WorkflowManager/Sample/processDelete`
- **请求体**：`{ "task_id": 1, "sample_ids": [...], "item_ids": [...] }`
- **效果**：
  - `sample_items.processing_status` 恢复为 `0`
  - `processing_deadline` 清空
  - 删除 `sample_processing` 关联记录

---

### 3.7 审批与分发

检测方法的状态流转：
```
0 管理组未下发
  ↓ distribute
1 组长未下发
  ↓ 组长操作
2 正在试验
  ↓ 检测员提交
3 等待组长审核
  ↓ 组长提交
4 等待管理组审核
  ├─→ approve → 5 生命周期结束（通过）
  └─→ reject  → 3 等待组长审核（驳回）
```

#### 16. 管理组审核通过 — `POST /obj/WorkflowManager/Sample/approve`
- **请求体**：
  ```json
  {
    "task_id": 1,
    "sample_ids": [1, 2],
    "item_id": 1,
    "method_ids": [1, 2]
  }
  ```
- **效果**：将 `sample_methods.status` 从 `4` 更新为 `5`。

#### 17. 管理组任务分发 — `POST /obj/WorkflowManager/Sample/distribute`
- **请求体**：
  ```json
  {
    "task_id": 1,
    "sample_ids": [1, 2],
    "item_id": 1,
    "method_ids": [1, 2],
    "department_id": 2,          // 目标部门
    "deadline": "2024-12-31"     // 检测截止日期
  }
  ```
- **效果**：将 `sample_methods.status` 从 `0` 更新为 `1`，并写入 `department_id` 与 `test_deadline`。

#### 18. 管理组驳回 — `POST /obj/WorkflowManager/Sample/reject`
- **请求体**：同 `approve`
- **效果**：将 `sample_methods.status` 从 `4` 更新为 `3`。

---

## 四、业务逻辑补充说明

### 4.1 任务与样品层级关系
```
Task（任务）
  └── Sample（样品）
        ├── sample_inputs（自定义输入项）
        └── sample_items（检测项）
              ├── sample_processing（前处理流程）
              └── sample_methods（检测方法）
                    ├── sample_helpers（辅助人员）
                    └── sample_results（检测结果字段）
```

### 4.2 `task_id` vs `sample_ids` 的批量操作设计
在 `Sample.py` 的 `itemCreate`、`methodCreate`、`processCreate`、`distribute` 等接口中，`task_id` 与 `sample_ids` 采用**二选一**策略：
- 若传 `task_id`，则自动锁定该任务下所有未删除的样品进行操作（适合全任务批量处理）。
- 若传 `sample_ids`，则直接对指定样品操作（适合部分样品精细化操作）。

### 4.3 参考样类型约束
| type | 含义 | 必填关联字段 |
|------|------|--------------|
| `1` | 空白样 | 无需关联 |
| `2` | 参比样 | `reference_material_id` |
| `3` | 重复样 | `parent_id`（指向原样品） |

若类型与关联字段不匹配，接口会返回 `status: 101`（输入值非法）。

