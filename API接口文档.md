# LIMS-Python 接口文档

> 本文档面向前端开发人员，用于对接 LIMS（实验室信息管理系统）后端接口。  
> 所有接口基于 **Starlette + Pydantic** 构建，统一返回 JSON 格式。  
> 数据库采用 MySQL，通过软删除（`deleted_at`）实现数据归档。

---

## 一、通用约定

### 1.1 基础信息

| 项目 | 说明 |
|------|------|
| 服务地址 | `http://127.0.0.1:8000`（以 `config.json` 实际配置为准） |
| API 前缀 | `/obj` |
| 请求方式 | 全部为 `POST`（除少数 `GET` 接口外） |
| 内容类型 | `application/json`（上传类接口为 `multipart/form-data`） |
| 字符编码 | UTF-8 |

### 1.2 通用返回结构

```json
{
  "status": 0,
  "data": "...",
  "message": "..."
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `status` | `int` | `0` 表示成功；非 `0` 表示业务或系统错误 |
| `data` | `any` | 成功时为主要业务数据；失败时可能为 `null` 或附加信息 |
| `message` | `string` | 成功时可为空；失败时为错误描述 |

**常见错误码**

| 状态码 | 含义 | 典型场景 |
|--------|------|----------|
| `0` | 成功 | 请求正常处理 |
| `10` | 参数校验失败 | Pydantic `ValidationError` 或 JSON 解析错误 |
| `11` | 认证失败 | 未登录，或用户组权限不匹配 |
| `101` | 业务规则拒绝 | 数据无改动、状态非法、条件不满足等 |
| `102` | 业务规则拒绝（二级） | 关联数据不存在、上传文件非法等 |
| `103` | 业务规则拒绝（三级） | 密码错误、重复登录失败超限等 |

### 1.3 认证与会话

- 系统使用 **Session Cookie** 维持登录状态。
- 登录成功后，后端写入 `session_{project}` Cookie；后续请求自动携带。
- 除 `/obj/Common/Login/login`、`/obj/Common/Captcha/get`、`/obj/Common/Index/index` 等公开接口外，其余接口均需登录。
- 部分模块要求用户具备特定角色组权限（通过 `AuthenticationMiddleware` 的 `group` 位校验）。

### 1.4 分页规范

列表类接口（`read`）普遍支持以下分页参数：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | `int` | 否 | 页码，从 `0` 开始，默认 `0` |
| `rows` | `int` | 否 | 每页条数，默认 `10`，必须 `> 0` |

返回结构统一为：

```json
{
  "status": 0,
  "data": {
    "total": 100,
    "rows": [ ... ]
  }
}
```

### 1.5 可选字段与二选一逻辑标注说明

- **必填**：接口层面未设默认值，且 Pydantic 校验不允许为 `null`。
- **可选**：带有默认值（如 `default=None`、`default=''`），或类型为 `xxx | None`。
- **二选一**：用 `⚠️` 标注，表示同一请求中两个字段必须且只能有一个生效，否则后端返回 `101`。

---

## 二、公共模块（Common）

> 业务场景：提供系统级公共服务，包括验证码、用户登录/登出/信息查询、文件上传、首页标识、试剂柜初始化等。  
> 部分接口无需登录即可访问。

### 2.1 验证码（Captcha）

#### `GET /obj/Common/Captcha/get` — 获取验证码图片

| 项目 | 说明 |
|------|------|
| **是否需要登录** | 否 |
| **限流策略** | 同一 IP 30 秒内最多请求 5 次，超限返回 `101 "请求次数过多。"` |

**请求参数**：无（GET 请求，无 Body）

**返回数据**：`StreamingResponse`，`Content-Type: image/png`，为验证码 PNG 图片流。

**前端注意事项**：
- 调用登录接口前必须先获取验证码。
- 验证码为 4~5 位字母+数字组合，不区分大小写。
- 后端将验证码哈希与盐值存入 Session，登录时校验。

---

### 2.2 首页标识（Index）

#### `GET /obj/Common/Index/index` — 服务状态探测

| 项目 | 说明 |
|------|------|
| **是否需要登录** | 否 |

**请求参数**：无

**返回数据**：`PlainTextResponse`，固定文本 `LIMS API v0.0.1`。

**业务场景**：前端可用于服务健康检查或版本展示。

---

### 2.3 用户登录（Login）

#### `POST /obj/Common/Login/login` — 用户登录

| 项目 | 说明 |
|------|------|
| **是否需要登录** | 否（已登录用户访问会返回 `11 "用户已登录。"`） |

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `captcha` | `string` | 是 | 正则 `^[a-zA-Z0-9]{4,5}$` | 验证码 |
| `name` | `string` | 是 | — | 登录名 |
| `password` | `string` | 是 | 长度 `8~32` | 密码 |

**返回数据（成功）**：

```json
{
  "status": 0,
  "data": {
    "id": 1,
    "name": "admin",
    "nickname": "管理员",
    "department_id": 1,
    "department_name": "管理组",
    "is_manager": 1,
    "id_name": "张三",
    "id_number": "...",
    "contact": "13800138000",
    "signature_file": "...",
    "group": 63,
    "last_login_ip": "127.0.0.1",
    "last_login_at": "2026-05-03 12:00:00",
    "time_created": "2026-01-01 08:00:00"
  },
  "message": null
}
```

| 字段 | 说明 |
|------|------|
| `group` | 用户所属角色组的位或（bitwise OR）结果，用于前端权限渲染 |
| `is_manager` | `1` 表示该用户是科室负责人 |

**关键业务校验**：
1. 验证码必须正确（与 Session 中存储的哈希比对）。
2. 同一用户 24 小时内登录失败超过 5 次，将被锁定并返回 `103`。
3. 密码使用 `bcrypt` 校验，错误返回 `104 "用户名或密码错误。"`。

**前端需验证**：
- 登录前验证码图片已加载。
- 密码长度前端可预校验（`8~32` 位）。

---

### 2.4 当前用户（User）

> 业务场景：已登录用户获取/更新自身信息、查询个人菜单、修改密码、退出登录。

#### `GET /obj/Common/User/check` — 刷新并返回当前登录用户信息

| 项目 | 说明 |
|------|------|
| **是否需要登录** | 是 |

**请求参数**：无

**返回数据**：同 `/login` 成功返回的用户信息对象，同时更新 Session。

**业务场景**：前端页面刷新后，可调用此接口重新拉取最新用户状态并同步到本地状态管理。

---

#### `GET /obj/Common/User/info` — 获取当前登录用户信息（只读）

| 项目 | 说明 |
|------|------|
| **是否需要登录** | 是 |

**请求参数**：无

**返回数据**：直接从 Session 读取，结构与 `/check` 一致，不更新数据库。

---

#### `GET /obj/Common/User/logout` — 退出登录

| 项目 | 说明 |
|------|------|
| **是否需要登录** | 是 |

**请求参数**：无

**返回数据**：`{ "status": 0, "data": null, "message": null }`

**业务场景**：前端点击退出后，清除本地用户状态并跳转到登录页。

---

#### `POST /obj/Common/User/reset` — 修改当前用户密码

| 项目 | 说明 |
|------|------|
| **是否需要登录** | 是 |

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `captcha` | `string` | 是 | 正则 `^[a-zA-Z0-9]{4,5}$` | 验证码 |
| `original` | `string` | 是 | 长度 `8~32` | 原密码 |
| `new` | `string` | 是 | 长度 `8~32` | 新密码 |

**关键业务校验**：
- 原密码必须正确，否则返回 `103 "原密码输入错误。"`。

**前端需验证**：
- `new` 密码与原密码不应相同（建议前端提示）。
- 验证码正确。

---

#### `GET /obj/Common/User/menu` — 获取当前用户菜单

| 项目 | 说明 |
|------|------|
| **是否需要登录** | 是 |

**请求参数**：无

**返回数据**：

```json
[
  {
    "id": 1,
    "name": "任务管理",
    "path": "/task",
    "icon": "...",
    "children": [
      { "id": 2, "name": "我的工作台", "path": "/task/workbench", "icon": "..." }
    ]
  }
]
```

**业务场景**：前端登录后，根据该接口返回的树形菜单动态渲染侧边栏导航。菜单权限由 `users_roles → roles_controls → controls` 多级关联决定。

---

### 2.5 文件上传（Upload）

#### `POST /obj/Common/Upload/upload` — 通用文件上传

| 项目 | 说明 |
|------|------|
| **是否需要登录** | 是 |
| **Content-Type** | `multipart/form-data` |

**请求参数（FormData）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file` | `File` | 是 | 上传的文件 |

**返回数据（成功）**：

```json
{
  "status": 0,
  "data": "uploads/xxxxx.png",
  "message": null
}
```

**关键业务校验**：
- 后端通过 `filetype` 或 `mimetypes` 分析文件真实类型，无法识别则返回 `102`。
- 文件保存至 `config.json` 中 `public` 目录下的 `uploads/` 文件夹，文件名为随机生成的 `frankID`。

**业务场景**：用户签名图片、报告模板文件、试剂安全警示贴等附件的上传。

---

### 2.6 试剂柜初始化（ReagentStorage）

#### `POST /obj/Common/ReagentStorage/initialise` — 获取试剂柜名称

| 项目 | 说明 |
|------|------|
| **是否需要登录** | 是 |

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `int` | 是 | 试剂柜 ID |

**返回数据**：试剂柜名称（`string`），未找到返回 `101`。

**业务场景**：试剂柜电子屏等硬件设备启动时，通过此接口获取自身名称用于展示。

---

#### `POST /obj/Common/ReagentStorage/get` — 获取试剂柜实时库存

| 项目 | 说明 |
|------|------|
| **是否需要登录** | 是 |

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `int` | 是 | 试剂柜 ID |

**返回数据**：若该试剂柜 10 秒内无操作日志，返回空数据；否则返回按试剂分组的库存列表。

**业务场景**：试剂柜电子屏轮询展示当前柜内试剂存取状态。

---

## 三、系统管理（SystemAdmin）

> 业务场景：面向系统管理员，管理菜单控件、操作审计日志、角色权限、用户账号。  
> 该模块所有接口均需要登录，且用户需具备 `group=1` 权限位。

### 3.1 菜单管理（Control）

> 业务场景：维护系统左侧菜单树。支持无限层级，通过 `parent_id` 建立父子关系。

#### `POST /obj/SystemAdmin/Control/create` — 创建菜单

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `parent_id` | `int \| null` | 否 | `> 0` | 父级菜单 ID；为 `null` 时表示顶级菜单 |
| `name` | `string` | 是 | 最大长度 `255` | 菜单标题 |
| `path` | `string` | 是 | 最大长度 `255` | 路由地址 |
| `icon` | `string` | 是 | 最大长度 `255` | 菜单图标类名或路径 |
| `sort` | `int` | 是 | `≥ 0` | 同级排序 |
| `enabled` | `int` | 是 | `0` 或 `1` | 是否启用 |

#### `GET /obj/SystemAdmin/Control/read` — 读取菜单树

**请求参数**：无

**返回数据**：树形结构数组，每条记录包含 `id, name, path, icon, sort, enabled, roles, created_at, updated_at, children`。

**关联说明**：`roles` 字段表示已绑定该菜单的角色列表，由后端通过 `roles_controls` 关联聚合。

#### `POST /obj/SystemAdmin/Control/update` — 更新菜单

**请求参数**：同 `create`，额外增加 `id: int`（必填）。

#### `POST /obj/SystemAdmin/Control/delete` — 删除菜单

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `int` | 是 | 菜单 ID |

**关键业务校验**：软删除（更新 `deleted_at = NOW()`）。若记录已删除或不存在，返回 `101`。

#### `POST /obj/SystemAdmin/Control/combo` — 菜单下拉选择

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `query` | `string` | 否 | 默认 `''`，模糊匹配 `name` 或 `path` |

**返回数据**：`[{ "id": 1, "name": "任务管理" }]`

#### `POST /obj/SystemAdmin/Control/arrange` — 批量绑定菜单与角色

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `ids` | `int[]` | 是 | 菜单 ID 列表 |
| `role_ids` | `int[]` | 是 | 角色 ID 列表 |

**关键业务校验**：先删除 `roles_controls` 中 `control_id` 在 `ids` 内的所有记录，再批量插入所有 `control_id × role_id` 组合（笛卡尔积）。

**前端需验证**：
- 执行前建议弹窗确认，因为会清空这些菜单原有的角色绑定关系。

---

### 3.2 审计日志（Log）

> 业务场景：记录系统中所有用户的操作行为，便于管理员追溯问题。

#### `POST /obj/SystemAdmin/Log/read` — 查询操作日志

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `department_id` | `int \| null` | 否 | 按科室筛选 |
| `user_id` | `int \| null` | 否 | 按用户筛选 |
| `page` | `int` | 否 | 默认 `0` |
| `rows` | `int` | 否 | 默认 `10` |

**返回数据**：

```json
{
  "total": 100,
  "rows": [
    {
      "id": 1,
      "department_id": 1,
      "department_name": "管理组",
      "user_id": 2,
      "user_name": "张三",
      "route": "WorkflowManager/Sample/distribute",
      "request_data": "{...}",
      "response_status": 0,
      "created_at": "2026-05-03 12:00:00"
    }
  ]
}
```

**业务场景**：管理员在后台查看用户操作记录，定位异常请求或数据篡改行为。

---

### 3.3 角色管理（Role）

> 业务场景：维护系统角色，每个角色对应一个权限位（`bitwise`），通过位运算实现一个用户同时拥有多角色。  
> 菜单权限和用户分配通过独立的关联接口维护。

#### `POST /obj/SystemAdmin/Role/create` — 创建角色

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `name` | `string` | 是 | 最大长度 `255` | 角色名称 |
| `bitwise` | `int` | 是 | `0 ≤ bitwise < 32` | 权限位，必须唯一 |

**关键业务校验**：`bitwise` 全局唯一，由数据库唯一索引保证，重复则 `INSERT IGNORE` 返回 `101`。

#### `POST /obj/SystemAdmin/Role/read` — 读取角色列表

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `query` | `string` | 否 | 默认 `''`，模糊匹配 `name` |
| `page` | `int` | 否 | 默认 `0` |
| `rows` | `int` | 否 | 默认 `10` |

**返回数据**：包含 `controls[]`（已绑定菜单）和 `users[]`（已分配用户）的聚合数组。

#### `POST /obj/SystemAdmin/Role/update` — 更新角色

**请求参数**：同 `create`，额外增加 `id: int`。

#### `POST /obj/SystemAdmin/Role/delete` — 删除角色

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `int` | 是 | 角色 ID |

#### `POST /obj/SystemAdmin/Role/combo` — 角色下拉选择

**返回数据**：`[{ "id": 1, "name": "系统管理员" }]`

#### `POST /obj/SystemAdmin/Role/controlArrange` — 批量绑定角色与菜单

**请求参数**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `ids` | `int[]` | 是 | 角色 ID 列表 |
| `control_ids` | `int[]` | 是 | 菜单 ID 列表 |

**关键业务校验**：先删除 `roles_controls` 中 `role_id` 在 `ids` 内的记录，再批量插入所有组合。

#### `POST /obj/SystemAdmin/Role/userArrange` — 批量绑定角色与用户

**请求参数**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `ids` | `int[]` | 是 | 角色 ID 列表 |
| `user_ids` | `int[]` | 是 | 用户 ID 列表 |

**关键业务校验**：逻辑同 `controlArrange`，操作的是 `users_roles` 表。

---

### 3.4 用户管理（User）

> 业务场景：系统管理员增删改查用户账号，重置密码，分配角色。

#### `POST /obj/SystemAdmin/User/create` — 创建用户

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `name` | `string` | 是 | 最大长度 `255` | 登录名，全局唯一 |
| `nickname` | `string` | 是 | 最大长度 `255` | 昵称 |
| `password` | `string` | 是 | 长度 `8~32` | 初始密码 |
| `department_id` | `int` | 是 | — | 所属科室 |
| `is_manager` | `int` | 是 | `0` 或 `1` | 是否科室负责人 |
| `id_name` | `string \| null` | 否 | 最大长度 `255` | 真实姓名 |
| `id_number` | `string \| null` | 否 | 最大长度 `255` | 证件号码，全局唯一 |
| `contact` | `string \| null` | 否 | 最大长度 `255` | 联系方式 |
| `signature_file` | `string \| null` | 否 | 最大长度 `255` | 签名图片路径 |
| `enabled` | `int` | 是 | `0` 或 `1` | 是否启用 |

**关键业务校验**：密码使用 `bcrypt` 哈希存储；`name` 和 `id_number` 全局唯一。

#### `POST /obj/SystemAdmin/User/read` — 读取用户列表

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `department_id` | `int \| null` | 否 | 按科室筛选 |
| `query` | `string` | 否 | 默认 `''`，模糊匹配 `name/nickname/id_name/id_number/contact` |
| `page` | `int` | 否 | 默认 `0` |
| `rows` | `int` | 否 | 默认 `10` |

**返回数据**：包含 `roles[]` 数组（已分配角色）。

#### `POST /obj/SystemAdmin/User/update` — 更新用户

**请求参数**：同 `create`，额外增加 `id: int`。

**关键业务校验**：
- **禁止修改自己**：`post.id == req.session['user']['id']` 时返回 `101`。
- 密码修改时会重新 `bcrypt` 哈希。

**前端需验证**：
- 管理员编辑用户时，若目标用户为自己，应禁用保存按钮或给出明确提示。

#### `POST /obj/SystemAdmin/User/delete` — 删除用户

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `int` | 是 | 用户 ID |

**关键业务校验**：
- **禁止删除自己**：`post.id == req.session['user']['id']` 时返回 `101`。
- 软删除。

#### `POST /obj/SystemAdmin/User/combo` — 用户下拉选择

**返回数据**：`[{ "id": 1, "name": "admin" }]`（`name` 为登录名）。

#### `POST /obj/SystemAdmin/User/reset` — 重置用户密码

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `int` | 是 | 用户 ID |

**返回数据**：`{ "status": 0, "data": null, "message": "密码已重置为 abc12345 。" }`

**关键业务校验**：自动生成随机密码（3位小写字母 + 5位数字），`bcrypt` 哈希后更新。

#### `POST /obj/SystemAdmin/User/arrange` — 批量绑定用户与角色

**请求参数**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `ids` | `int[]` | 是 | 用户 ID 列表 |
| `role_ids` | `int[]` | 是 | 角色 ID 列表 |

---

## 四、资源管理（ResourceAdmin）

> 业务场景：维护实验室基础资源字典，包括客户、科室、检测项目、检测方法、任务类型、报告模板等。  
> 这些资源被任务、样品、检测等业务模块引用，属于系统的"主数据"。

### 4.1 客户管理（Client）

> 业务场景：管理送检单位（客户）信息。创建任务时必须关联一个客户。

#### `POST /obj/ResourceAdmin/Client/create` — 创建客户

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `name` | `string` | 是 | 最大长度 `255` | 客户名称 |
| `tax_code` | `string \| null` | 否 | 长度必须为 `18` | 统一社会信用代码 |
| `contact` | `string \| null` | 否 | 最大长度 `255` | 联系人姓名 |
| `mobile` | `string \| null` | 否 | 最大长度 `255` | 联系人电话 |
| `landline` | `string \| null` | 否 | 最大长度 `255` | 固定电话 |
| `email` | `string \| null` | 否 | 邮箱格式，最大长度 `255` | 邮箱 |
| `address` | `string \| null` | 否 | 最大长度 `255` | 地址 |

#### `POST /obj/ResourceAdmin/Client/read` — 读取客户列表

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `query` | `string` | 否 | 默认 `''`，模糊匹配 `name/tax_code/contact/mobile/landline/email/address` |
| `page` | `int` | 否 | 默认 `0` |
| `rows` | `int` | 否 | 默认 `10` |

**关联说明**：客户数据被 `tasks` 表的 `client_id` 外键引用。删除客户（软删除）后，历史任务仍可正常展示客户名称（因为查询任务时通过 `LEFT JOIN` 关联）。

#### `POST /obj/ResourceAdmin/Client/update` — 更新客户

**请求参数**：同 `create`，额外增加 `id: int`。

#### `POST /obj/ResourceAdmin/Client/delete` — 删除客户

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `int` | 是 | 客户 ID |

#### `POST /obj/ResourceAdmin/Client/combo` — 客户下拉选择

**返回数据**：`[{ "id": 1, "name": "某某公司" }]`

---

### 4.2 科室管理（Department）

> 业务场景：维护实验室组织架构。科室用于样品任务的下发和人员的归属。支持层级结构（通过 `parent_id`）。

#### `POST /obj/ResourceAdmin/Department/create` — 创建科室

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `parent_id` | `int \| null` | 否 | `> 0` | 父级科室 ID；为 `null` 时为顶级科室 |
| `name` | `string` | 是 | 最大长度 `255` | 科室名称 |

#### `GET /obj/ResourceAdmin/Department/read` — 读取科室树

**请求参数**：无

**返回数据**：树形结构，包含 `id, name, created_at, updated_at, children`。

**业务场景**：前端用于科室选择树、组织架构展示。用户的 `department_id` 即来源于此表。

#### `POST /obj/ResourceAdmin/Department/update` — 更新科室

**请求参数**：同 `create`，额外增加 `id: int`。

#### `POST /obj/ResourceAdmin/Department/delete` — 删除科室

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `int` | 是 | 科室 ID |

#### `POST /obj/ResourceAdmin/Department/combo` — 科室下拉选择

**返回数据**：`[{ "id": 1, "name": "化学分析室" }]`

---

### 4.3 加工方法管理（ProcessingMethod）

> 业务场景：维护样品前加工方式。例如"研磨"、"消解"、"稀释"等。每个方法下可配置多个具体选项值。  
> 任务创建时若选择"需要加工"（`is_processing=1`），则在后续流程中需要为样品指定加工方法和选项。

#### `POST /obj/ResourceAdmin/ProcessingMethod/create` — 创建加工方法

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `name` | `string` | 是 | 最大长度 `255` | 方法名称 |
| `enabled` | `int` | 是 | `0` 或 `1` | 是否启用 |

#### `POST /obj/ResourceAdmin/ProcessingMethod/read` — 读取加工方法列表

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `query` | `string` | 否 | 默认 `''`，模糊匹配 `name` |
| `page` | `int` | 否 | 默认 `0` |
| `rows` | `int` | 否 | 默认 `10` |

**返回数据**：每条记录包含 `options: [{ id, value, enabled, created_at, updated_at }]` 数组。

#### `POST /obj/ResourceAdmin/ProcessingMethod/update` — 更新加工方法

**请求参数**：同 `create`，额外增加 `id: int`。

#### `POST /obj/ResourceAdmin/ProcessingMethod/delete` — 删除加工方法

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `int` | 是 | 加工方法 ID |

#### `POST /obj/ResourceAdmin/ProcessingMethod/combo` — 加工方法下拉选择

**返回数据**：`[{ "id": 1, "name": "消解", "options": [{ "id": 1, "value": "微波消解" }] }]`  
仅返回 `enabled = 1` 的方法及其启用选项。

#### `POST /obj/ResourceAdmin/ProcessingMethod/optionCreate` — 创建加工选项

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `method_id` | `int` | 是 | — | 所属加工方法 ID |
| `value` | `string` | 是 | 最大长度 `255` | 选项值 |
| `enabled` | `int` | 是 | `0` 或 `1` | 是否启用 |

#### `POST /obj/ResourceAdmin/ProcessingMethod/optionUpdate` — 更新加工选项

**请求参数**：同 `optionCreate`，但主键为 `id: int`（选项 ID），不含 `method_id`。

#### `POST /obj/ResourceAdmin/ProcessingMethod/optionDelete` — 删除加工选项

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `int` | 是 | 选项 ID |

---

### 4.4 检测项目管理（TestItem）

> 业务场景：维护实验室可检测的分析项目，如"重金属含量"、"pH值"等。项目属于某个类别，并可关联多种检测方法。  
> 创建任务时，需要为样品选择检测项目；每个项目下再选择具体的检测方法。

#### `POST /obj/ResourceAdmin/TestItem/create` — 创建检测项目

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `category_id` | `int` | 是 | — | 所属项目类别 ID |
| `name` | `string` | 是 | 最大长度 `255` | 项目名称 |

#### `POST /obj/ResourceAdmin/TestItem/read` — 读取检测项目列表

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `category_id` | `int \| null` | 否 | 按类别筛选 |
| `query` | `string` | 否 | 默认 `''`，模糊匹配 `name` |
| `page` | `int` | 否 | 默认 `0` |
| `rows` | `int` | 否 | 默认 `10` |

**返回数据**：包含 `methods: [{ id, name, code, created_at }]`（已关联的方法列表）。

#### `POST /obj/ResourceAdmin/TestItem/update` — 更新检测项目

**请求参数**：同 `create`，额外增加 `id: int`。

#### `POST /obj/ResourceAdmin/TestItem/delete` — 删除检测项目

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `int` | 是 | 项目 ID |

#### `POST /obj/ResourceAdmin/TestItem/combo` — 检测项目下拉选择

**返回数据**：`[{ "id": 1, "name": "重金属含量 (化学分析)" }]`  
`name` 格式为 `项目名称 (类别名称)`。

#### `POST /obj/ResourceAdmin/TestItem/method` — 查询项目已关联的方法

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `int` | 是 | 项目 ID |
| `query` | `string` | 否 | 默认 `''` |

**返回数据**：`[{ "id": 1, "name": "GB/T 12345 - 重金属测定法" }]`  
`name` 格式为 `方法名称 - 国标代码`。

**关联说明**：前端在"为样品分配方法"时，可先通过此接口查询某项目下可选的方法。

#### `POST /obj/ResourceAdmin/TestItem/arrange` — 批量关联项目与方法

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `ids` | `int[]` | 是 | 项目 ID 列表 |
| `method_ids` | `int[]` | 是 | 方法 ID 列表 |

**关键业务校验**：
- 先 **清空** 这些项目的历史方法关联（`DELETE FROM test_methods_items WHERE item_id IN (...)`）。
- 再批量插入所有 `item_id × method_id` 笛卡尔积组合。

**前端需验证**：
- 此操作会覆盖原有关系，执行前必须弹窗二次确认。

---

### 4.5 检测方法管理（TestMethod）

> 业务场景：维护检测方法的标准信息（如国标代码），以及方法对应的结果录入字段。  
> 方法是检测项目的执行细则；每个方法可关联多个检测项目，一个检测项目也可使用多种方法。

#### `POST /obj/ResourceAdmin/TestMethod/create` — 创建检测方法

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `name` | `string` | 是 | 最大长度 `255` | 方法名称 |
| `code` | `string` | 是 | 最大长度 `255` | 国标代码 |

#### `POST /obj/ResourceAdmin/TestMethod/read` — 读取检测方法列表

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `query` | `string` | 否 | 默认 `''`，模糊匹配 `name` 或 `code` |
| `page` | `int` | 否 | 默认 `0` |
| `rows` | `int` | 否 | 默认 `10` |

**返回数据**：包含 `fields[]`（结果字段）和 `items[]`（关联项目）。

#### `POST /obj/ResourceAdmin/TestMethod/update` — 更新检测方法

**请求参数**：同 `create`，额外增加 `id: int`。

#### `POST /obj/ResourceAdmin/TestMethod/delete` — 删除检测方法

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `int` | 是 | 方法 ID |

#### `POST /obj/ResourceAdmin/TestMethod/combo` — 检测方法下拉选择

**返回数据**：`[{ "id": 1, "name": "重金属测定法 - GB/T 12345" }]`  
`name` 格式为 `方法名称 - 国标代码`。

#### `POST /obj/ResourceAdmin/TestMethod/item` — 查询方法已关联的项目

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `int` | 是 | 方法 ID |
| `query` | `string` | 否 | 默认 `''` |

**返回数据**：`[{ "id": 1, "name": "重金属含量 (化学分析)" }]`

#### `POST /obj/ResourceAdmin/TestMethod/arrange` — 批量关联方法与项目

**请求参数**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `ids` | `int[]` | 是 | 方法 ID 列表 |
| `item_ids` | `int[]` | 是 | 项目 ID 列表 |

**关键业务校验**：同 `TestItem/arrange`，先清空再重建关系。

#### `POST /obj/ResourceAdmin/TestMethod/fieldCreate` — 创建方法结果字段

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `method_id` | `int` | 是 | — | 所属方法 ID |
| `name` | `string` | 是 | 最大长度 `255` | 字段标题 |
| `key` | `string` | 是 | 最大长度 `255` | 渲染 key |
| `scope` | `int` | 是 | `0` 或 `1` | 作用域：`0` 公用参数，`1` 样品参数 |
| `data_type` | `int` | 是 | `0~2` | 字段类型：`0` 字符，`1` 数字，`2` 时间 |
| `is_required` | `int` | 是 | `0` 或 `1` | 是否必填 |
| `source_type` | `int` | 是 | `0~4` | 数据源类型：见下表 |
| `input_mapped_from` | `string \| null` | 否 | 最大长度 `255` | `source_type=1` 时，映射的输入数据 key |
| `fixed_value` | `string \| null` | 否 | 最大长度 `255` | `source_type=2` 时，固定值 |
| `device_api` | `string \| null` | 否 | 最大长度 `255` | `source_type=3` 时，设备采集接口地址 |
| `code` | `string \| null` | 否 | — | `source_type=4` 时，JavaScript 计算代码 |
| `sort` | `int` | 是 | `≥ 0` | 排序 |
| `enabled` | `int` | 是 | `0` 或 `1` | 是否启用 |

**`source_type` 枚举说明**：

| 值 | 含义 | 配套字段 |
|----|------|----------|
| `0` | 手动输入 | — |
| `1` | 引入（从样品输入数据映射） | `input_mapped_from` |
| `2` | 固定值 | `fixed_value` |
| `3` | 设备采集 | `device_api` |
| `4` | 计算 | `code`（JS 代码） |

**业务场景**：定义检测方法的报告模板字段。例如某方法需要录入"温度"、"湿度"、"检测结果"等字段；其中"检测结果"可能是手动输入（`0`），"温度"可能通过设备接口自动采集（`3`）。

#### `POST /obj/ResourceAdmin/TestMethod/fieldUpdate` — 更新方法结果字段

**请求参数**：同 `fieldCreate`，主键为 `id: int`，不含 `method_id`。

#### `POST /obj/ResourceAdmin/TestMethod/fieldDelete` — 删除方法结果字段

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `int` | 是 | 字段 ID |

---

### 4.6 项目类别管理（TestCategory）

> 业务场景：对检测项目进行分类，便于检索和权限划分。

#### `POST /obj/ResourceAdmin/TestCategory/create` — 创建类别

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `name` | `string` | 是 | 最大长度 `255` | 类别名称，全局唯一 |

#### `POST /obj/ResourceAdmin/TestCategory/read` — 读取类别列表

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `query` | `string` | 否 | 默认 `''`，模糊匹配 `name` |
| `page` | `int` | 否 | 默认 `0` |
| `rows` | `int` | 否 | 默认 `10` |

#### `POST /obj/ResourceAdmin/TestCategory/update` — 更新类别

**请求参数**：同 `create`，额外增加 `id: int`。

#### `POST /obj/ResourceAdmin/TestCategory/delete` — 删除类别

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `int` | 是 | 类别 ID |

#### `POST /obj/ResourceAdmin/TestCategory/combo` — 类别下拉选择

**返回数据**：`[{ "id": 1, "name": "化学分析" }]`

---

### 4.7 任务样品类型管理（TaskSampleType）

> 业务场景：定义送检样品的分类类型（如"土壤"、"水质"、"空气"）。任务创建时必须选择样品类型，且实验室批号由该类型的编码前缀自动生成。

#### `POST /obj/ResourceAdmin/TaskSampleType/create` — 创建样品类型

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `code` | `string` | 是 | 最大长度 `255` | 类型编码（如 "TR" 表示土壤） |
| `name` | `string` | 是 | 最大长度 `255` | 类型名称 |

**关键业务校验**：`code` 用于生成任务的 `lab_code`（实验室批号），如 `TR25001`。

#### `POST /obj/ResourceAdmin/TaskSampleType/read` — 读取样品类型列表

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `query` | `string` | 否 | 默认 `''`，模糊匹配 `code` 或 `name` |
| `page` | `int` | 否 | 默认 `0` |
| `rows` | `int` | 否 | 默认 `10` |

#### `POST /obj/ResourceAdmin/TaskSampleType/update` — 更新样品类型

**请求参数**：同 `create`，额外增加 `id: int`。

#### `POST /obj/ResourceAdmin/TaskSampleType/delete` — 删除样品类型

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `int` | 是 | 类型 ID |

#### `POST /obj/ResourceAdmin/TaskSampleType/combo` — 样品类型下拉选择

**返回数据**：`[{ "id": 1, "name": "TR - 土壤" }]`  
`name` 格式为 `code - name`。

---

### 4.8 任务分析类型管理（TaskAnalysisType）

> 业务场景：定义分析类别（如"元素分析"、"有机物分析"），用于任务分类统计。

接口结构与 `TaskSampleType` 完全一致（仅无 `code` 字段），此处省略详细字段。  
路由前缀：`/obj/ResourceAdmin/TaskAnalysisType`

---

### 4.9 报告封面管理（ReportCover）

> 业务场景：维护检测报告封面的 Word 模板（`.docx`），以及封面中需要替换的关键字字段。  
> 生成报告时，系统根据封面模板和字段映射规则自动填充数据。

#### `POST /obj/ResourceAdmin/ReportCover/create` — 创建封面

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `name` | `string` | 是 | 最大长度 `255` | 封面名称 |
| `template_file` | `string` | 是 | 最大长度 `255` | Word 模板文件路径 |
| `description` | `string \| null` | 否 | 最大长度 `255` | 描述 |

#### `POST /obj/ResourceAdmin/ReportCover/read` — 读取封面列表

**返回数据**：包含 `fields: [{ id, name, key, type, input_mapped_from, result_mapped_from, fixed_value, enabled }]`。

#### `POST /obj/ResourceAdmin/ReportCover/fieldCreate` — 创建封面字段

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `cover_id` | `int` | 是 | — | 所属封面 ID |
| `name` | `string` | 是 | 最大长度 `255` | 字段名称 |
| `key` | `string` | 是 | 最大长度 `255` | Word 中替换关键字 |
| `type` | `int` | 是 | `0~3` | 数据类型：`0` 手动录入，`1` 输入数据，`2` 输出数据，`3` 固定值 |
| `input_mapped_from` | `string \| null` | 否 | 最大长度 `255` | `type=1` 时的输入数据 key |
| `result_mapped_from` | `string \| null` | 否 | 最大长度 `255` | `type=2` 时的输出数据 key |
| `fixed_value` | `string \| null` | 否 | 最大长度 `255` | `type=3` 时的固定值 |
| `enabled` | `int` | 是 | `0` 或 `1` | 是否启用 |

**关联说明**：`type` 决定该字段的数据来源。`type=1` 时从 `sample_inputs` 取值；`type=2` 时从 `sample_results` 取值；`type=3` 时直接使用 `fixed_value`。

---

### 4.10 报告数据表管理（ReportTable）

> 业务场景：维护检测报告中的数据表格模板。结构与 `ReportCover` 类似，但面向表格而非封面。

接口结构与 `ReportCover` 基本一致。路由前缀：`/obj/ResourceAdmin/ReportTable`。  
字段子接口为 `fieldCreate`/`fieldUpdate`/`fieldDelete`，参数与封面字段类似，额外包含 `sort` 排序字段。

---

## 五、设备管理（DeviceAdmin）

> 业务场景：管理实验室仪器设备台账，记录设备基本信息、分类、负责人，以及检定/校准历史。  
> 系统可根据 `commissioned_at`（启用日期）和 `calibration_interval`（校准周期）推算下次校准时间。

### 5.1 设备管理（Device）

#### `POST /obj/DeviceAdmin/Device/create` — 创建设备

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `category_id` | `int` | 是 | — | 设备分类 ID |
| `name` | `string` | 是 | 最大长度 `255` | 设备名称 |
| `vendor` | `string \| null` | 否 | 最大长度 `255` | 供应商 |
| `model` | `string \| null` | 否 | 最大长度 `255` | 型号 |
| `serial` | `string \| null` | 否 | 最大长度 `255` | 序列号 |
| `factory_code` | `string \| null` | 否 | 最大长度 `255` | 出厂编号 |
| `asset_code` | `string \| null` | 否 | 最大长度 `255` | 资产编号 |
| `manufactured_at` | `date \| null` | 否 | — | 出厂日期 |
| `commissioned_at` | `date \| null` | 否 | — | 启用日期 |
| `calibration_interval` | `int` | 是 | — | 校准周期（天），默认 `0` |
| `maintainer_id` | `int` | 是 | — | 负责人用户 ID |
| `description` | `string \| null` | 否 | 最大长度 `255` | 描述 |
| `enabled` | `int` | 是 | `0` 或 `1` | 是否启用 |

#### `POST /obj/DeviceAdmin/Device/read` — 读取设备列表

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `query` | `string` | 否 | 默认 `''`，模糊匹配 `name/vendor/model/serial/factory_code/asset_code/description` |
| `page` | `int` | 否 | 默认 `0` |
| `rows` | `int` | 否 | 默认 `10` |

**返回数据**：包含 `category_name`、`maintainer_name`、`calibration_logs`（校准记录 JSON 数组）、`expired_by`（距下次校准天数）。

#### `POST /obj/DeviceAdmin/Device/update` — 更新设备

**请求参数**：同 `create`，额外增加 `id: int`。

#### `POST /obj/DeviceAdmin/Device/delete` — 删除设备

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `int` | 是 | 设备 ID |

#### `POST /obj/DeviceAdmin/Device/combo` — 设备下拉选择

**返回数据**：`[{ "id": 1, "name": "电子天平" }]`

#### `POST /obj/DeviceAdmin/Device/calibrate` — 新增校准记录

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `device_id` | `int` | 是 | 设备 ID |
| `calibrator` | `string` | 是 | 校准单位 |
| `calibrated_at` | `date` | 是 | 校准时间 |

**业务场景**：设备完成外部校准后，管理员录入校准记录，系统据此更新设备状态。

---

### 5.2 设备分类管理（DeviceCategory）

> 业务场景：对设备进行分类（如"称量设备"、"光谱设备"），便于检索和统计。

接口为标准 CRUD + combo。路由前缀：`/obj/DeviceAdmin/DeviceCategory`。  
`combo` 返回格式：`name` 为 `CONCAT_WS(' - ', code, name)`。

---

## 六、试剂管理（ReagentAdmin）

> 业务场景：管理实验室化学试剂、标准物质/标准溶液/基准试剂的台账、库存、领用归还记录。  
> 支持易制毒、易制爆等特殊试剂的分类管理，以及库存余量预警。

### 6.1 试剂管理（Reagent）

> 业务场景：维护试剂的基础信息（名称、类型、单位、报警阈值等）。试剂本身不直接管理数量，数量由"库存"（`ReagentStock`）维护。

#### `POST /obj/ReagentAdmin/Reagent/create` — 创建试剂

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `name` | `string` | 是 | 最大长度 `255` | 试剂名称 |
| `category` | `int` | 是 | `0~2` | 类型：`0` 易制毒，`1` 易制爆，`2` 一般试剂 |
| `unit` | `string` | 是 | 最大长度 `255` | 单位 |
| `alert_threshold` | `float` | 是 | `≥ 0` | 报警阈值 |
| `sticker_file` | `string \| null` | 否 | 最大长度 `255` | 安全合规警示贴图片路径 |
| `description` | `string` | 是 | 最大长度 `255` | 描述 |

#### `POST /obj/ReagentAdmin/Reagent/read` — 读取试剂列表

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `category` | `int \| null` | 否 | 按类型筛选 |
| `query` | `string` | 否 | 默认 `''`，模糊匹配 `name/description` |
| `page` | `int` | 否 | 默认 `0` |
| `rows` | `int` | 否 | 默认 `10` |

#### `POST /obj/ReagentAdmin/Reagent/update` — 更新试剂

**请求参数**：同 `create`，额外增加 `id: int`。

#### `POST /obj/ReagentAdmin/Reagent/delete` — 删除试剂

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `int` | 是 | 试剂 ID |

#### `POST /obj/ReagentAdmin/Reagent/combo` — 试剂下拉选择

**返回数据**：`[{ "id": 1, "name": "硝酸" }]`

---

### 6.2 试剂库存管理（ReagentStock）

> 业务场景：管理每一瓶（或每一批次）试剂的入库、存放位置、领用、归还、报废。  
> 每瓶试剂有独立的 `lab_code`（瓶身编号，格式为 `YYYYMMDDHHMMSSssssss`），存放于某个试剂柜的某一行。

#### `POST /obj/ReagentAdmin/ReagentStock/create` — 创建库存（入库）

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `reagent_id` | `int` | 是 | — | 试剂 ID |
| `specification` | `float` | 是 | `≥ 0` | 规格（总量） |
| `quantity` | `float` | 是 | `≥ 0` | 初始余量 |
| `storage_id` | `int` | 是 | — | 存放试剂柜 ID |
| `row` | `int` | 是 | — | 柜内行号 |
| `description` | `string \| null` | 否 | 最大长度 `255` | 描述 |

**返回数据（成功）**：`{ "status": 0, "data": "20260504001234567890", "message": null }`（生成的瓶身编号）。

**关键业务校验**：
- 自动生成唯一 `lab_code`。
- 同时向 `reagent_logs` 插入一条 `type=0`（新建）的日志记录。

#### `POST /obj/ReagentAdmin/ReagentStock/read` — 读取库存列表

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `reagent_id` | `int` | 是 | 按试剂筛选 |
| `query` | `string` | 否 | 默认 `''`，模糊匹配 `description` |
| `page` | `int` | 否 | 默认 `0` |
| `rows` | `int` | 否 | 默认 `10` |

**返回数据**：包含 `storage_name`（试剂柜名称）、`status`（当前状态：新建/已领用/已归还/已报废）、`quantity`（当前余量）、`user_nickname`（最后操作人）、`last_action_at`（最后操作时间）。

#### `POST /obj/ReagentAdmin/ReagentStock/update` — 更新库存

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `id` | `int` | 是 | — | 库存 ID |
| `specification` | `float` | 是 | `≥ 0` | 规格 |
| `storage_id` | `int` | 是 | — | 试剂柜 ID |
| `row` | `int` | 是 | — | 行号 |
| `description` | `string \| null` | 否 | 最大长度 `255` | 描述 |

#### `POST /obj/ReagentAdmin/ReagentStock/delete` — 删除库存（报废）

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `int` | 是 | 库存 ID |

**关键业务校验**：软删除库存记录，同时向 `reagent_logs` 插入一条 `type=3`（报废）的日志。

#### `POST /obj/ReagentAdmin/ReagentStock/action` — 领取 / 归还

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `id` | `int` | 是 | — | 库存 ID |
| `user_id` | `int` | 是 | — | 使用人 ID |
| `action` | `int` | 是 | `1` 或 `2` | `1` 领取，`2` 归还 |
| `quantity` | `float` | 是 | `≥ 0` | 数量 |
| `description` | `string \| null` | 否 | 最大长度 `255` | 描述 |

**关键业务校验（状态机）**：
- 若最新日志 `type == 3`（已报废），拒绝操作，返回 `101 "试剂状态错误。"`。
- 若最新日志 `type == action`（重复操作，如已领用再次领用），拒绝。
- 若最新日志 `type == 0`（新建）且 `action == 2`（归还），拒绝（未领用不能归还）。

**前端需验证**：
- 领取按钮仅在试剂状态为"新建"或"已归还"时可用。
- 归还按钮仅在试剂状态为"已领用"时可用。
- 报废按钮应始终可用（或根据业务需求控制）。

#### `POST /obj/ReagentAdmin/ReagentStock/logs` — 查询操作日志

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `stock_id` | `int \| null` | 否 | — | 库存 ID |
| `operator_id` | `int \| null` | 否 | — | 操作员 ID |
| `user_id` | `int \| null` | 否 | — | 使用者 ID |
| `type` | `int \| null` | 否 | `0~3` | 操作类型：`0` 新建，`1` 领取，`2` 归还，`3` 报废 |
| `page` | `int` | 否 | 默认 `0` |
| `rows` | `int` | 否 | 默认 `10` |

#### `POST /obj/ReagentAdmin/ReagentStock/logsExport` — 导出日志（Excel）

**请求参数**：同 `logs`，无分页参数。

**返回数据**：Excel 文件下载。

#### `POST /obj/ReagentAdmin/ReagentStock/detail` — 查询库存详情

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `lab_code` | `string` | 是 | 瓶身编号 |

**业务场景**：试剂柜扫码或手动输入瓶身编号，快速查询该瓶试剂的完整信息和最新状态。

---

### 6.3 试剂柜管理（ReagentStorage）

> 业务场景：维护试剂存放的物理柜子名称。每个库存记录关联到一个试剂柜的某一行。

接口为标准 CRUD + combo。路由前缀：`/obj/ReagentAdmin/ReagentStorage`

---

### 6.4 标准物质管理（ReferenceMaterial）

> 业务场景：管理标准物质、标准溶液、基准试剂的全生命周期。支持成分含量管理、稀释/混标制备、余量跟踪。  
> 标准物质可被样品关联为"参比样"（`type=2`），用于质量控制。

#### `POST /obj/ReagentAdmin/ReferenceMaterial/create` — 创建标准物质

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `name` | `string` | 是 | 最大长度 `255` | 名称 |
| `category` | `int` | 是 | `0~2` | `0` 标准物质，`1` 标准溶液，`2` 基准试剂 |
| `stage` | `int` | 是 | `0~3` | `0` 原液，`1` 中间液，`2` 工作液，`3` 标准曲线 |
| `physical_state` | `int` | 是 | `0~2` | `0` 固态，`1` 液态，`2` 气态 |
| `lab_code` | `string \| null` | 否 | 最大长度 `255` | 实验室内部编码，唯一 |
| `sample_code` | `string \| null` | 否 | 最大长度 `255` | 样品编码 |
| `batch_code` | `string \| null` | 否 | 最大长度 `255` | 批号 |
| `vendor` | `string \| null` | 否 | 最大长度 `255` | 研制单位 |
| `location` | `string \| null` | 否 | 最大长度 `255` | 存放地点 |
| `unit` | `string` | 是 | 最大长度 `255` | 单位 |
| `specification` | `float` | 是 | `≥ 0` | 规格 |
| `alert_threshold` | `float` | 是 | `≥ 0` | 报警阈值 |
| `uncertainty` | `float \| null` | 否 | `0~100` | 相对扩展不确定度（%） |
| `mass_concentration` | `float \| null` | 否 | `0~100` | 质量浓度（%） |
| `medium_type_id` | `int` | 是 | — | 介质/基底类型 ID |
| `medium_concentration` | `float \| null` | 否 | `0~100` | 介质浓度（%） |
| `confirmed_at` | `date \| null` | 否 | — | 定值日期 |
| `expiring_at` | `date \| null` | 否 | — | 有效期至 |

**关键业务校验**：新建时 `remaining`（余量）默认等于 `specification`。

#### `POST /obj/ReagentAdmin/ReferenceMaterial/read` — 读取标准物质列表

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `category` | `int \| null` | 否 | — | 按类别筛选 |
| `stage` | `int \| null` | 否 | — | 按阶段筛选 |
| `physical_state` | `int \| null` | 否 | — | 按物理形态筛选 |
| `medium_type_id` | `int \| null` | 否 | — | 按介质类型筛选 |
| `query` | `string` | 否 | 默认 `''` | 模糊匹配多字段 |
| `page` | `int` | 否 | 默认 `0` |
| `rows` | `int` | 否 | 默认 `10` |

**返回数据**：包含 `components`（成分 JSON 数组）、`parents`（来源物质 JSON 数组）、`medium_type_name`。

#### `POST /obj/ReagentAdmin/ReferenceMaterial/update` — 更新标准物质

**请求参数**：同 `create`，额外增加 `id: int`、`remaining: float`（`≥ 0`，余量）。

**关键业务校验**：
- 若 `remaining > specification`，返回 `101` 错误。

**前端需验证**：
- 余量不能超过规格，否则阻止提交。

#### `POST /obj/ReagentAdmin/ReferenceMaterial/delete` — 删除标准物质

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `int` | 是 | 标准物质 ID |

#### `POST /obj/ReagentAdmin/ReferenceMaterial/combo` — 标准物质下拉选择

**返回数据**：`[{ "id": 1, "name": "标准溶液A" }]`

#### `POST /obj/ReagentAdmin/ReferenceMaterial/use` — 使用（扣减余量）

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `id` | `int` | 是 | — | 标准物质 ID |
| `used` | `float` | 是 | `≥ 0` | 使用量 |

**关键业务校验**：直接 `UPDATE` 扣减 `remaining`，不校验是否超扣（业务上应由前端或调用方保证）。

**前端需验证**：
- 提交前校验 `used ≤ remaining`，避免超扣。

#### `POST /obj/ReagentAdmin/ReferenceMaterial/prepare` — 配制（稀释/混标）

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| *(同 create 的所有字段)* | — | — | 新物质的基本信息 |
| `parents` | `object[]` | 是 | 父物质使用清单，每项包含 `id`（父物质ID）和 `used`（使用量） |

**关键业务校验**：
- 事务性操作：插入新标物 → 逐个扣减父物质 `remaining` → 插入 `reference_material_sources` 关联记录。
- 任一步影响行数为 0，整体回滚。

**前端需验证**：
- 每个父物质的 `used` 必须 `≤` 其当前 `remaining`。
- 至少选择一个父物质。

**业务场景**：实验员使用原液配制中间液或工作液时，记录用量并生成新的标准物质记录。

#### `POST /obj/ReagentAdmin/ReferenceMaterial/componentCreate` — 创建成分

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `material_id` | `int` | 是 | — | 标准物质 ID |
| `component` | `string` | 是 | 最大长度 `255` | 成分名称 |
| `value` | `float` | 是 | `≥ 0` | 含量值 |
| `unit` | `string` | 是 | 最大长度 `255` | 单位 |
| `uncertainty` | `float` | 是 | `≥ 0` | 不确定度 |

#### `POST /obj/ReagentAdmin/ReferenceMaterial/componentUpdate` — 更新成分

**请求参数**：同 `componentCreate`。

#### `POST /obj/ReagentAdmin/ReferenceMaterial/componentDelete` — 删除成分

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `material_id` | `int` | 是 | 标准物质 ID |
| `component` | `string` | 是 | 成分名称 |

**关键业务校验**：物理删除（`DELETE`），非软删除。

---

### 6.5 标准物质介质类型管理（ReferenceMaterialMediumType）

> 业务场景：维护标准物质的介质/基底类型（如"水"、"土壤"、"空气"）。

接口为标准 CRUD + combo。路由前缀：`/obj/ReagentAdmin/ReferenceMaterialMediumType`

---

## 七、监控管理（MonitorAdmin）

### 7.1 温湿度计管理（Thermometer）

> 业务场景：管理实验室温湿度监控设备的网络配置（Modbus TCP），并查询实时和历史温湿度数据。  
> 设备通过 IP + Port + Unit 地址采集数据，日志存入 `thermometer_logs`。

#### `POST /obj/MonitorAdmin/Thermometer/create` — 创建温湿度计

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `name` | `string` | 是 | 最大长度 `255` | 设备名称 |
| `ip` | `string` | 是 | IPv4/IPv6 格式 | IP 地址 |
| `port` | `int` | 是 | `1~65535` | 端口 |
| `unit` | `int` | 是 | `1~255` | Modbus 单元地址 |
| `enabled` | `int` | 是 | `0` 或 `1` | 是否启用 |

#### `POST /obj/MonitorAdmin/Thermometer/read` — 读取温湿度计列表

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `query` | `string` | 否 | 默认 `''`，模糊匹配 `name` |
| `page` | `int` | 否 | 默认 `0` |
| `rows` | `int` | 否 | 默认 `10` |

**返回数据**：包含 `ip`（字符串格式）、`temperature`、`humidity`（最新日志值）。

#### `POST /obj/MonitorAdmin/Thermometer/update` — 更新温湿度计

**请求参数**：同 `create`，额外增加 `id: int`。

#### `POST /obj/MonitorAdmin/Thermometer/delete` — 删除温湿度计

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `int` | 是 | 设备 ID |

#### `POST /obj/MonitorAdmin/Thermometer/logs` — 查询历史数据

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `thermometer_id` | `int` | 是 | 设备 ID |
| `time_from` | `datetime` | 是 | 开始时间 |
| `time_to` | `datetime` | 是 | 结束时间 |

**返回数据**：`{ "total": 100, "rows": [{ "id", "temperature", "humidity", "created_at" }] }`

#### `POST /obj/MonitorAdmin/Thermometer/logsExport` — 导出历史数据（Excel）

**请求参数**：同 `logs`。

**返回数据**：Excel 文件下载，包含列：ID、温度、湿度、创建时间。

---

## 八、任务工作流（WorkflowManager）

> 业务场景：面向"管理组"或"任务管理员"，负责任务和样品的全生命周期管理。  
> 包括任务创建、样品录入、项目/方法分配、加工设置、以及向科室下发检测任务。  
> 该模块是 LIMS 的核心业务流程入口。

### 8.1 任务管理（Task）

#### `POST /obj/WorkflowManager/Task/create` — 创建任务

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `name` | `string` | 是 | 最大长度 `255` | 任务名称 |
| `client_id` | `int` | 是 | — | 客户 ID |
| `liaison_name` | `string \| null` | 否 | 最大长度 `255` | 客户联络人姓名 |
| `liaison_contact` | `string \| null` | 否 | 最大长度 `255` | 客户联络人电话 |
| `sample_type_id` | `int` | 是 | — | 样品类型 ID |
| `analysis_type_id` | `int` | 是 | — | 分析类型 ID |
| `physical_state` | `int` | 是 | `0~2` | 物理形态：`0` 固态，`1` 液态，`2` 气态 |
| `category` | `int` | 是 | `0~2` | 检测类别：`0` 委托检测，`1` 监督检测，`2` 其他 |
| `delivered_by` | `int` | 是 | `0~2` | 来样方式：`0` 客户邮寄，`1` 客户送检，`2` 自采 |
| `is_processing` | `int` | 是 | `0` 或 `1` | 是否需要加工 |
| `deadline` | `date` | 是 | — | 最迟完成日期 |
| `receiver_id` | `int` | 是 | — | 收样人用户 ID |
| `description` | `string \| null` | 否 | 最大长度 `255` | 描述 |

**关键业务校验**：
- `sample_type_id` 必须有效且未删除。
- `lab_code` 自动生成：格式为 `{样品类型编码}{年份后两位}{3位序号}`，如 `TR25001`。

**前端需验证**：
- `deadline` 必须大于等于当前日期（建议前端校验）。
- `client_id`、`sample_type_id`、`analysis_type_id`、`receiver_id` 必须从对应 combo 接口选择有效值。

---

#### `POST /obj/WorkflowManager/Task/read` — 读取任务列表

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `client_id` | `int \| null` | 否 | 按客户筛选 |
| `receiver_id` | `int \| null` | 否 | 按收样人筛选 |
| `query` | `string` | 否 | 默认 `''`，模糊匹配 `lab_code/name/liaison_name/liaison_contact/description` |
| `page` | `int` | 否 | 默认 `0` |
| `rows` | `int` | 否 | 默认 `10` |

**返回数据**：每条记录包含完整的任务基本信息，以及关联的 `client_name`、`sample_type_name`、`analysis_type_name`、`receiver_nickname`。

---

#### `POST /obj/WorkflowManager/Task/update` — 更新任务

**请求参数**：同 `create`，额外增加 `id: int`。

**关键业务校验**：`UPDATE IGNORE`，若任务已删除或无改动，返回 `101`。

---

#### `POST /obj/WorkflowManager/Task/delete` — 删除任务

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `int` | 是 | 任务 ID |

**关键业务校验**：软删除。

---

#### `POST /obj/WorkflowManager/Task/combo` — 任务下拉选择

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `query` | `string` | 否 | 默认 `''` |

**返回数据**：`[{ "id": 1, "name": "TR25001 - 土壤检测任务" }]`  
`name` 格式为 `CONCAT(lab_code, ' - ', name)`。

---

#### `POST /obj/WorkflowManager/Task/export` — 导出任务结果（Excel）

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `int` | 是 | 任务 ID |

**返回数据**：Excel 文件下载，文件名 `任务结果导出-{taskName}.xlsx`。  
包含 `基础信息` Sheet（客户代码、实验室代码、描述、所有 sample_inputs）和每个 `检测项目-检测方法` 组合的独立 Sheet。

**业务场景**：任务完成后，管理员导出完整数据用于存档或发送给客户。

---

#### `POST /obj/WorkflowManager/Task/template` — 下载任务导入模板

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `client_id` | `int` | 是 | 客户 ID |
| `receiver_id` | `int` | 是 | 收样人 ID |
| `task_id` | `int \| null` | 否 | 若提供，表示向现有任务追加样品 |
| `item_ids` | `int[]` | 是 | 检测项目 ID 列表 |

**返回数据**：Excel 模板文件下载（`TaskTicket.xlsx`）。

**业务场景**：管理员选择客户、收样人、检测项目后，下载模板，填写样品信息和项目勾选情况，再通过 `/upload` 批量导入。

---

#### `POST /obj/WorkflowManager/Task/upload` — 批量导入任务/样品

| 项目 | 说明 |
|------|------|
| **Content-Type** | `multipart/form-data` |

**请求参数（FormData）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file` | `File` | 是 | 通过 `/template` 下载并填写的 Excel 文件 |

**关键业务校验**：
- 解析 `元数据（请勿修改）` Sheet 获取 `client_id`、`receiver_id`、`task_id`。
- 若 `task_id` 存在，则向该任务追加样品；否则根据 `基础信息` Sheet 新建任务。
- 从 `样品和项目` Sheet 提取样品编码和项目勾选状态。
- 从 `自定义数据` Sheet 提取样品输入字段（`sample_inputs`）。

**前端需验证**：
- 上传前校验文件格式为 `.xlsx`。
- 上传成功后建议刷新任务列表。

---

### 8.2 样品管理（Sample）

> 业务场景：在任务下管理具体样品。一个任务可包含多个样品，每个样品有独立的实验室编号（`lab_code`）。  
> 支持创建空白样、参比样、重复样等特殊类型样品。  
> 可对样品添加检测项目、检测方法、加工要求，并下发至科室。

#### `POST /obj/WorkflowManager/Sample/create` — 创建样品

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `task_id` | `int` | 是 | — | 所属任务 ID |
| `client_code` | `string` | 是 | 最大长度 `255` | 原始编号（客户方编号） |
| `description` | `string \| null` | 否 | 最大长度 `255` | 描述 |

**关键业务校验**：
- `lab_code` 自动生成：该任务下已有样品数量 `+1`。

---

#### `POST /obj/WorkflowManager/Sample/read` — 读取样品列表

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `task_id` | `int` | 是 | 任务 ID |
| `query` | `string` | 否 | 默认 `''`，模糊匹配 `client_code` 或精确匹配 `description` |
| `page` | `int` | 否 | 默认 `0` |
| `rows` | `int` | 否 | 默认 `10` |

**返回数据**：

```json
{
  "total": 10,
  "rows": [
    {
      "id": 1,
      "client_code": "S001",
      "lab_code": 1,
      "type": 0,
      "reference_material_id": null,
      "reference_material_name": null,
      "parent_id": null,
      "parent_lab_code": null,
      "creator_id": 2,
      "creator_name": "张三",
      "description": "...",
      "inputs": [{ "key": "颜色", "value": "棕色", "created_at": "...", "updated_at": "..." }],
      "items": [
        {
          "id": 1,
          "name": "重金属含量",
          "processing_status": 0,
          "processing_deadline": null,
          "processing": [{ "id": 1, "value": "微波消解", "method_id": 1 }],
          "methods": [
            {
              "id": 1,
              "name": "GB/T 12345",
              "department_id": 2,
              "tester_id": 3,
              "test_deadline": "2026-05-10",
              "status": 0,
              "helpers": [{ "id": 4, "name": "李四", "status": 1 }],
              "results": [{ "id": 1, "name": "检测结果", "key": "result", "value": "0.5" }]
            }
          ]
        }
      ],
      "created_at": "2026-05-03 12:00:00",
      "updated_at": "2026-05-03 12:00:00"
    }
  ]
}
```

**字段说明**：

| 字段 | 说明 |
|------|------|
| `type` | `0` 非对照样，`1` 空白样，`2` 参比样，`3` 重复样 |
| `processing_status` | `0` 不加工/未开始，`1` 正在加工，`2` 加工完成 |
| `status`（method 内） | `0` 管理组未下发，`1` 组长未下发，`2` 正在试验，`3` 等待组长审核，`4` 等待管理组审核，`5` 生命周期结束 |

---

#### `POST /obj/WorkflowManager/Sample/update` — 更新样品

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `id` | `int` | 是 | — | 样品 ID |
| `client_code` | `string` | 是 | 最大长度 `255` | 原始编号 |
| `description` | `string \| null` | 否 | 最大长度 `255` | 描述 |

---

#### `POST /obj/WorkflowManager/Sample/delete` — 删除样品

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `int` | 是 | 样品 ID |

**关键业务校验**：软删除。

---

#### `POST /obj/WorkflowManager/Sample/reference` — 创建特殊样品（空白/参比/重复）

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `task_id` | `int` | 是 | — | 任务 ID |
| `count` | `int` | 是 | `> 0` | 创建数量 |
| `type` | `int` | 是 | `1~3` | `1` 空白样，`2` 参比样，`3` 重复样 |
| `reference_material_id` | `int \| null` | 否 | — | `type=2` 时必填 |
| `parent_id` | `int \| null` | 否 | — | `type=3` 时必填 |
| `description` | `string \| null` | 否 | 最大长度 `255` | 描述 |

**关键业务校验**：
- `type=1`（空白样）：`reference_material_id` 和 `parent_id` 必须都为 `null`。
- `type=2`（参比样）：`reference_material_id` 必填，`parent_id` 必须为 `null`。
- `type=3`（重复样）：`parent_id` 必填，`reference_material_id` 必须为 `null`。

**前端需验证**：
- 根据 `type` 的值动态控制 `reference_material_id` 和 `parent_id` 的必填状态。
- `type=2` 时，`reference_material_id` 应从 `ReferenceMaterial/combo` 中选择。
- `type=3` 时，`parent_id` 应从当前任务的普通样品中选择。

**业务场景**：在检测任务中插入质量控制样品。空白样用于检测背景干扰；参比样用于验证检测准确性；重复样用于评估检测精密度。

---

#### `POST /obj/WorkflowManager/Sample/inputCreate` — 创建样品输入数据

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `sample_id` | `int` | 是 | — | 样品 ID |
| `key` | `string` | 是 | 最大长度 `255` | 字段名 |
| `value` | `string` | 是 | 最大长度 `255` | 字段值 |

**关键业务校验**：`INSERT IGNORE`，重复 `sample_id + key` 返回 `101`。

---

#### `POST /obj/WorkflowManager/Sample/inputUpdate` — 更新样品输入数据

**请求参数**：同 `inputCreate`。

---

#### `POST /obj/WorkflowManager/Sample/inputDelete` — 删除样品输入数据

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `sample_id` | `int` | 是 | 样品 ID |
| `key` | `string` | 是 | 字段名 |

---

#### `POST /obj/WorkflowManager/Sample/itemCreate` — 为样品添加检测项目

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `task_id` | `int \| null` | 否 ⚠️ | 为整个任务的所有样品添加项目 |
| `sample_ids` | `int[] \| null` | 否 ⚠️ | 为指定样品列表添加项目 |
| `item_ids` | `int[]` | 是 | 检测项目 ID 列表 |

**⚠️ 二选一逻辑**：`task_id` 和 `sample_ids` 必须且只能提供一个。

**关键业务校验**：
- 若通过 `task_id` 查询无样品，返回 `102`。
- 使用 `INSERT ... ON DUPLICATE KEY UPDATE deleted_at = NULL`，重复添加时恢复已删除记录。

---

#### `POST /obj/WorkflowManager/Sample/itemDelete` — 删除样品的检测项目

**请求参数**：同 `itemCreate`。

**关键业务校验**：软删除 `sample_items`（设置 `deleted_at = NOW()`）。

---

#### `POST /obj/WorkflowManager/Sample/methodCreate` — 为样品添加检测方法

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `task_id` | `int \| null` | 否 ⚠️ | 为整个任务添加方法 |
| `sample_ids` | `int[] \| null` | 否 ⚠️ | 为指定样品添加方法 |
| `item_id` | `int` | 是 | 检测项目 ID |
| `method_ids` | `int[]` | 是 | 方法 ID 列表 |

**⚠️ 二选一逻辑**：`task_id` 和 `sample_ids` 必须且只能提供一个。

**关键业务校验**：插入 `sample_methods`，初始 `status = 0`（管理组未下发）。

---

#### `POST /obj/WorkflowManager/Sample/methodDelete` — 删除样品的检测方法

**请求参数**：同 `methodCreate`。

**关键业务校验**：软删除 `sample_methods`。

---

#### `POST /obj/WorkflowManager/Sample/processCreate` — 设置加工要求

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `task_id` | `int \| null` | 否 ⚠️ | 为整个任务设置加工 |
| `sample_ids` | `int[] \| null` | 否 ⚠️ | 为指定样品设置加工 |
| `item_ids` | `int[]` | 是 | 检测项目 ID 列表 |
| `option_ids` | `int[]` | 是 | 加工选项 ID 列表 |
| `deadline` | `date` | 是 | 加工截止日期 |

**⚠️ 二选一逻辑**：`task_id` 和 `sample_ids` 必须且只能提供一个。

**关键业务校验**：
- 仅对 `processing_status = 0`（未加工）且 `sample_methods` 中无已下发记录（`status = 0`）的项目生效。
- 更新 `sample_items.processing_status = 1`（正在加工）。

**前端需验证**：
- 只有 `processing_status = 0` 的项目才允许设置加工。
- 若某项目已下发至科室（`status > 0`），则不可再设置加工。

---

#### `POST /obj/WorkflowManager/Sample/processUpdate` — 更新加工要求

**请求参数**：同 `processCreate`。

**关键业务校验**：仅对 `processing_status = 1`（正在加工）的记录生效。会清空原有 `sample_processing` 记录并重新插入。

---

#### `POST /obj/WorkflowManager/Sample/processDelete` — 取消加工要求

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `task_id` | `int \| null` | 否 ⚠️ | 为整个任务取消加工 |
| `sample_ids` | `int[] \| null` | 否 ⚠️ | 为指定样品取消加工 |
| `item_ids` | `int[]` | 是 | 检测项目 ID 列表 |

**⚠️ 二选一逻辑**：`task_id` 和 `sample_ids` 必须且只能提供一个。

**关键业务校验**：仅对 `processing_status = 1` 的记录生效，重置为 `0` 并清空加工选项。

---

#### `POST /obj/WorkflowManager/Sample/distribute` — 下发至科室

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `task_id` | `int \| null` | 否 ⚠️ | 为整个任务下发 |
| `sample_ids` | `int[] \| null` | 否 ⚠️ | 为指定样品下发 |
| `item_id` | `int` | 是 | 检测项目 ID |
| `method_ids` | `int[]` | 是 | 方法 ID 列表 |
| `department_id` | `int` | 是 | 目标科室 ID |
| `deadline` | `date` | 是 | 检测截止日期 |

**⚠️ 二选一逻辑**：`task_id` 和 `sample_ids` 必须且只能提供一个。

**关键业务校验**：
- 仅下发 `status = 0`（管理组未下发）的方法。
- **若 `sample_items.processing_status = 1`（正在加工），则禁止下发**。
- 下发后 `status = 1`（组长未下发），`department_id` 写入目标科室。

**前端需验证（极为重要）**：
- **样品加工未完成（`processing_status = 1`）时，不可下发至科室**。前端应在点击"下发"前校验所选样品的加工状态，若存在未完成的加工项目，应提示"存在样品加工未完成，无法下发"。
- 只有 `status = 0` 的方法才显示"下发"按钮。

**业务场景**：任务管理员完成样品登记、项目/方法分配、加工设置后，将检测任务下发给具体科室。科室负责人接收后进一步分配给检测员。

---

#### `POST /obj/WorkflowManager/Sample/approve` — 管理组审批通过

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `task_id` | `int \| null` | 否 ⚠️ | 审批整个任务 |
| `sample_ids` | `int[] \| null` | 否 ⚠️ | 审批指定样品 |
| `item_id` | `int` | 是 | 检测项目 ID |
| `method_ids` | `int[]` | 是 | 方法 ID 列表 |

**⚠️ 二选一逻辑**：`task_id` 和 `sample_ids` 必须且只能提供一个。

**关键业务校验**：仅将 `status = 4`（等待管理组审核）的方法更新为 `status = 5`（生命周期结束）。

**前端需验证**：
- 只有 `status = 4` 的方法才显示"审批通过"按钮。

---

#### `POST /obj/WorkflowManager/Sample/reject` — 管理组驳回

**请求参数**：同 `approve`。

**关键业务校验**：仅将 `status = 4` 的方法更新为 `status = 3`（等待组长审核）。

**业务场景**：管理组审核检测结果不通过，退回给科室负责人重新处理。

---

## 九、加工管理（ProcessingManager）

> 业务场景：面向"加工组"或"样品前处理人员"。  
> 该模块展示所有需要加工的样品项目，加工完成后确认，使样品可以进入后续检测流程。

### 9.1 任务管理（Task）

#### `POST /obj/ProcessingManager/Task/read` — 读取待加工任务列表

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `client_id` | `int \| null` | 否 | 按客户筛选 |
| `receiver_id` | `int \| null` | 否 | 按收样人筛选 |
| `query` | `string` | 否 | 默认 `''` |
| `page` | `int` | 否 | 默认 `0` |
| `rows` | `int` | 否 | 默认 `10` |

**关键业务校验**：仅返回存在 `processing_status > 0`（有加工需求）的样品的任务。

### 9.2 样品管理（Sample）

#### `POST /obj/ProcessingManager/Sample/read` — 读取待加工样品列表

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `task_id` | `int` | 是 | 任务 ID |
| `query` | `string` | 否 | 默认 `''` |
| `page` | `int` | 否 | 默认 `0` |
| `rows` | `int` | 否 | 默认 `10` |

**关键业务校验**：仅返回 `processing_status > 0` 的样品项目。

---

#### `POST /obj/ProcessingManager/Sample/approve` — 加工完成确认

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `task_id` | `int \| null` | 否 ⚠️ | 审批整个任务 |
| `sample_ids` | `int[] \| null` | 否 ⚠️ | 审批指定样品 |
| `item_ids` | `int[]` | 是 | 检测项目 ID 列表 |

**⚠️ 二选一逻辑**：`task_id` 和 `sample_ids` 必须且只能提供一个。

**关键业务校验**：仅将 `processing_status = 1`（正在加工）更新为 `2`（加工完成）。

**前端需验证**：
- 只有 `processing_status = 1` 的项目才显示"加工完成"按钮。
- 加工完成后，该样品项目方可被科室接收并进入检测流程。

**业务场景**：加工人员完成样品前处理后，确认加工完成。此后任务管理员可在工作流模块中将该项目下发至检测科室。

---

## 十、科室管理（DepartmentManager）

> 业务场景：面向"科室负责人"和"科室成员"。  
> 科室负责人接收管理组下发的检测任务，分配给具体检测员；审核检测员提交的结果；将完成的检测上交管理组。  
> 科室成员可查看分配给自己的检测任务，录入实验数据并提交审核。

### 10.1 任务管理（Task）

#### `POST /obj/DepartmentManager/Task/read` — 读取本科室任务列表

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `client_id` | `int \| null` | 否 | 按客户筛选 |
| `receiver_id` | `int \| null` | 否 | 按收样人筛选 |
| `query` | `string` | 否 | 默认 `''` |
| `page` | `int` | 否 | 默认 `0` |
| `rows` | `int` | 否 | 默认 `10` |

**关键业务校验**：仅返回当前用户所在 `department_id` 有 `sample_methods` 关联的任务。

---

#### `POST /obj/DepartmentManager/Task/export` — 导出任务结果

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `int` | 是 | 任务 ID |

**返回数据**：同 `WorkflowManager/Task/export`，但仅导出本科室有权限查看的数据。

### 10.2 样品管理（Sample）

#### `POST /obj/DepartmentManager/Sample/read` — 读取本科室样品列表

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `task_id` | `int` | 是 | 任务 ID |
| `query` | `string` | 否 | 默认 `''` |
| `page` | `int` | 否 | 默认 `0` |
| `rows` | `int` | 否 | 默认 `10` |

**关键业务校验**：
- 仅返回当前 `department_id` 有 `sample_methods` 关联的样品，或 `creator_id = 当前用户` 的样品。
- `type`、`reference_material_id/name`、`parent_id/lab_code`、`creator_id/name` 等敏感字段**仅创建者可见**，其他用户这些字段返回 `null`。

---

#### `POST /obj/DepartmentManager/Sample/update` — 更新样品

**请求参数**：同 `WorkflowManager/Sample/update`。

**关键业务校验**：仅可更新 `creator_id = 当前用户` 的样品。

---

#### `POST /obj/DepartmentManager/Sample/delete` — 删除样品

**请求参数**：同 `WorkflowManager/Sample/delete`。

**关键业务校验**：仅可删除 `creator_id = 当前用户` 的样品。

---

#### `POST /obj/DepartmentManager/Sample/reference` — 创建特殊样品

**请求参数**：同 `WorkflowManager/Sample/reference`。

**关键业务校验**：额外校验该任务下当前部门有 `sample_methods` 记录，否则返回 `102`。

---

#### `POST /obj/DepartmentManager/Sample/inputCreate` / `inputUpdate` / `inputDelete`

接口参数和校验同 `WorkflowManager/Sample` 的对应接口，但限制为 `creator_id = 当前用户` 的样品。

---

#### `POST /obj/DepartmentManager/Sample/itemCreate` / `itemDelete`

接口参数和校验同 `WorkflowManager/Sample` 的对应接口，限制为 `creator_id = 当前用户` 的样品。

---

#### `POST /obj/DepartmentManager/Sample/methodCreate` / `methodDelete`

接口参数和校验同 `WorkflowManager/Sample` 的对应接口，限制为 `creator_id = 当前用户` 的样品。

---

#### `POST /obj/DepartmentManager/Sample/helperCreate` — 添加辅助检测人

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `task_id` | `int \| null` | 否 ⚠️ | 为整个任务添加 |
| `sample_ids` | `int[] \| null` | 否 ⚠️ | 为指定样品添加 |
| `item_id` | `int` | 是 | 检测项目 ID |
| `method_id` | `int` | 是 | 方法 ID |
| `helper_ids` | `int[]` | 是 | 辅助人用户 ID 列表 |

**⚠️ 二选一逻辑**：`task_id` 和 `sample_ids` 必须且只能提供一个。

**关键业务校验**：仅可为当前 `department_id` 有 `sample_methods` 关联的样品添加辅助人。

**业务场景**：某项检测需要多人协作完成时，主检测员（`tester_id`）可指定辅助人员。辅助人需在 `SampleHelper` 模块中确认后方可参与。

---

#### `POST /obj/DepartmentManager/Sample/helperDelete` — 删除辅助检测人

**请求参数**：同 `helperCreate`。

**关键业务校验**：仅可删除当前 `department_id` 关联的辅助人记录。

---

#### `POST /obj/DepartmentManager/Sample/distribute` — 科室负责人分配给检测员

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `task_id` | `int \| null` | 否 ⚠️ | 分配整个任务 |
| `sample_ids` | `int[] \| null` | 否 ⚠️ | 分配指定样品 |
| `item_id` | `int` | 是 | 检测项目 ID |
| `method_ids` | `int[]` | 是 | 方法 ID 列表 |
| `tester_id` | `int` | 是 | 检测员用户 ID |

**⚠️ 二选一逻辑**：`task_id` 和 `sample_ids` 必须且只能提供一个。

**关键业务校验**：
- 仅分配当前 `department_id` 下 `status = 1`（组长未下发）的方法。
- **若 `sample_items.processing_status = 1`（正在加工），则禁止分配**。
- 分配后 `status = 2`（正在试验），`tester_id` 写入检测员。

**前端需验证（极为重要）**：
- **样品加工未完成（`processing_status = 1`）时，不可分配给检测员**。前端应在分配前校验加工状态。
- 只有 `status = 1` 的方法才显示"分配"按钮。

**业务场景**：科室负责人收到管理组下发的任务后，根据人员工作安排，将具体检测方法分配给某位检测工程师。

---

#### `POST /obj/DepartmentManager/Sample/approve` — 科室负责人审核通过

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `task_id` | `int \| null` | 否 ⚠️ | 审核整个任务 |
| `sample_ids` | `int[] \| null` | 否 ⚠️ | 审核指定样品 |
| `item_id` | `int` | 是 | 检测项目 ID |
| `method_ids` | `int[]` | 是 | 方法 ID 列表 |

**⚠️ 二选一逻辑**：`task_id` 和 `sample_ids` 必须且只能提供一个。

**关键业务校验**：仅将当前 `department_id` 下 `status = 3`（等待组长审核）的方法更新为 `status = 4`（等待管理组审核）。

**前端需验证**：
- 只有 `status = 3` 的方法才显示"审核通过"按钮。

**业务场景**：检测员完成实验并提交结果后，科室负责人对数据进行复核，确认无误后上交管理组终审。

---

#### `POST /obj/DepartmentManager/Sample/reject` — 科室负责人驳回

**请求参数**：同 `approve`。

**关键业务校验**：仅将当前 `department_id` 下 `status = 3` 的方法重置为 `status = 2`（正在试验），同时清空 `department_id` 和 `tester_id`。

**业务场景**：科室负责人审核发现数据异常或实验过程有问题，将任务退回给检测员重新检测。

---

## 十一、检测管理（TestingManager）

> 业务场景：面向"检测员"（实验工程师）。  
> 检测员查看分配给自己的检测任务，录入实验数据，提交给科室负责人审核。  
> 同时支持辅助检测任务的确认和批量审批。

### 11.1 任务管理（Task）

#### `POST /obj/TestingManager/Task/read` — 读取检测员任务列表

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `client_id` | `int \| null` | 否 | 按客户筛选 |
| `receiver_id` | `int \| null` | 否 | 按收样人筛选 |
| `query` | `string` | 否 | 默认 `''` |
| `page` | `int` | 否 | 默认 `0` |
| `rows` | `int` | 否 | 默认 `10` |

**关键业务校验**：仅返回存在 `sample_methods` 中 `tester_id = 当前用户` 且 `method_count > 0` 的任务。

---

#### `POST /obj/TestingManager/Task/export` — 导出任务结果

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `int` | 是 | 任务 ID |

**返回数据**：Excel 文件下载，结构与工作流导出一致，但仅包含当前检测员有权限的数据。

### 11.2 样品管理（Sample）

#### `POST /obj/TestingManager/Sample/read` — 读取检测员样品列表

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `task_id` | `int` | 是 | 任务 ID |
| `query` | `string` | 否 | 默认 `''` |
| `page` | `int` | 否 | 默认 `0` |
| `rows` | `int` | 否 | 默认 `10` |

**关键业务校验**：仅返回 `creator_id = 当前用户`，或该样品下存在 `tester_id = 当前用户` 的 `sample_methods` 记录的样品。

---

#### `POST /obj/TestingManager/Sample/update` / `delete` / `reference`

接口参数和校验逻辑与 `WorkflowManager/Sample` 基本一致，但额外限制了只能操作 `creator_id = 当前用户` 或 `tester_id = 当前用户` 的数据。

---

#### `POST /obj/TestingManager/Sample/inputCreate` / `inputUpdate` / `inputDelete`

限制为 `creator_id = 当前用户` 的样品。

---

#### `POST /obj/TestingManager/Sample/itemCreate` / `itemDelete`

限制为 `creator_id = 当前用户` 的样品。

---

#### `POST /obj/TestingManager/Sample/methodCreate` / `methodDelete`

限制为 `creator_id = 当前用户` 的样品。

---

#### `POST /obj/TestingManager/Sample/resultCreate` — 录入检测结果

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `sample_id` | `int` | 是 | — | 样品 ID |
| `item_id` | `int` | 是 | — | 检测项目 ID |
| `field_id` | `int` | 是 | — | 方法结果字段 ID |
| `value` | `string` | 是 | 最大长度 `255` | 字段值 |

**关键业务校验**：
- 必须存在 `sample_methods` 记录，且 `tester_id = 当前用户`。
- `status` 必须为 `2`（正在试验）。
- `field_id` 必须属于该方法的合法结果字段。
- 使用 `INSERT ... ON DUPLICATE KEY UPDATE`，重复录入时更新值。

**前端需验证**：
- 只有 `status = 2` 且 `tester_id = 当前用户` 的方法才允许录入结果。
- 若 `data_type = 1`（数字），前端应校验输入为数值。
- 若 `is_required = 1`（必填），前端应校验不能为空。

**业务场景**：检测员在实验过程中或实验完成后，将检测数据录入系统。数据将关联到具体的样品、项目、方法和字段。

---

#### `POST /obj/TestingManager/Sample/resultDelete` — 删除检测结果

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `sample_id` | `int` | 是 | 样品 ID |
| `item_id` | `int` | 是 | 检测项目 ID |
| `field_id` | `int` | 是 | 字段 ID |

**关键业务校验**：通过 JOIN `sample_methods` 和 `test_method_result_fields` 校验 `tester_id = 当前用户`。

---

#### `POST /obj/TestingManager/Sample/template` — 下载结果录入模板

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `task_id` | `int \| null` | 否 ⚠️ | 整个任务 |
| `sample_ids` | `int[] \| null` | 否 ⚠️ | 指定样品 |
| `item_id` | `int` | 是 | 检测项目 ID |
| `method_id` | `int` | 是 | 方法 ID |

**⚠️ 二选一逻辑**：`task_id` 和 `sample_ids` 必须且只能提供一个。

**返回数据**：Excel 模板文件（`ResultTemplate.xlsx`），包含样品实验室代码和结果字段列。

**业务场景**：检测员需要批量录入多个样品的结果时，下载模板在 Excel 中填写后通过 `/upload` 批量上传。

---

#### `POST /obj/TestingManager/Sample/upload` — 批量上传结果

| 项目 | 说明 |
|------|------|
| **Content-Type** | `multipart/form-data` |

**请求参数（FormData）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file` | `File` | 是 | Excel 文件 |

**关键业务校验**：
- 解析 `元数据（请勿修改）` Sheet 获取 `item_id`。
- 从 `模板` Sheet 第一行提取 `field_id`，第一列提取 `sample_id`。
- 校验样品是否属于当前用户且有检测方法分配。
- 批量 `INSERT ... ON DUPLICATE KEY UPDATE` 写入 `sample_results`。

---

#### `POST /obj/TestingManager/Sample/approve` — 检测员提交审核

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `task_id` | `int \| null` | 否 ⚠️ | 提交整个任务 |
| `sample_ids` | `int[] \| null` | 否 ⚠️ | 提交指定样品 |
| `item_id` | `int` | 是 | 检测项目 ID |
| `method_ids` | `int[]` | 是 | 方法 ID 列表 |

**⚠️ 二选一逻辑**：`task_id` 和 `sample_ids` 必须且只能提供一个。

**关键业务校验**：仅将 `tester_id = 当前用户` 且 `status = 2`（正在试验）的方法更新为 `status = 3`（等待组长审核）。

**前端需验证**：
- 只有 `status = 2` 且 `tester_id = 当前用户` 的方法才显示"提交审核"按钮。
- 提交前建议校验所有 `is_required = 1` 的结果字段是否已录入。

**业务场景**：检测员完成数据录入并自检后，提交给科室负责人审核。

---

#### `POST /obj/TestingManager/Sample/reject` — 检测员撤回/驳回（退回待试验）

**请求参数**：同 `approve`。

**关键业务校验**：仅将 `tester_id = 当前用户` 且 `status = 2` 的方法更新为 `status = 1`（组长未下发），同时清空 `tester_id`。

**业务场景**：检测员发现无法继续检测，将任务退回科室重新分配。

### 11.3 辅助检测管理（SampleHelper）

> 业务场景：检测员被他人添加为辅助人后，需要在此模块确认或拒绝。只有确认后，辅助关系才正式生效。

#### `POST /obj/TestingManager/SampleHelper/read` — 读取辅助任务列表

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 校验规则 | 说明 |
|------|------|------|----------|------|
| `status` | `int \| null` | 否 | `0` 或 `1` | 按状态筛选：`0` 待审批，`1` 已审批 |
| `query` | `string` | 否 | 默认 `''` | 模糊匹配 |
| `page` | `int` | 否 | 默认 `0` |
| `rows` | `int` | 否 | 默认 `10` |

**返回数据**：包含样品信息及 `helpers` 数组。

---

#### `POST /obj/TestingManager/SampleHelper/approve` — 单个确认辅助任务

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `sample_id` | `int` | 是 | 样品 ID |
| `item_id` | `int` | 是 | 检测项目 ID |
| `method_id` | `int` | 是 | 方法 ID |

**关键业务校验**：更新 `sample_helpers.status = 1`，要求 `helper_id = 当前用户` 且原 `status = 0`。

---

#### `POST /obj/TestingManager/SampleHelper/batchApprove` — 批量确认辅助任务

**请求参数（Body）**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `sample_ids` | `int[]` | 是 | 样品 ID 列表 |

**关键业务校验**：批量更新 `status = 1`，要求 `helper_id = 当前用户` 且原 `status = 0`。

---

#### `POST /obj/TestingManager/SampleHelper/reject` — 单个拒绝辅助任务

**请求参数**：同 `approve`。

**关键业务校验**：删除 `sample_helpers` 记录，要求 `helper_id = 当前用户` 且原 `status = 0`。

---

#### `POST /obj/TestingManager/SampleHelper/batchReject` — 批量拒绝辅助任务

**请求参数**：同 `batchApprove`。

---

## 十二、前端数据条件验证汇总

> 以下汇总了前端在调用关键接口前应当进行的数据校验，以避免因后端业务规则拒绝而浪费用户操作。

### 12.1 任务与样品流转校验

| 校验点 | 校验规则 | 涉及接口 | 失败提示建议 |
|--------|----------|----------|-------------|
| 下发至科室前加工状态 | `sample_items.processing_status ≠ 1` | `WorkflowManager/Sample/distribute` | "存在样品加工未完成，无法下发至科室" |
| 科室分配前加工状态 | `sample_items.processing_status ≠ 1` | `DepartmentManager/Sample/distribute` | "存在样品加工未完成，无法分配检测员" |
| 下发/分配时方法状态 | `sample_methods.status = 0`（管理组下发）或 `= 1`（科室分配） | `distribute` | "所选方法状态不正确，无法操作" |
| 提交审核时方法状态 | `sample_methods.status = 2` 且 `tester_id = 当前用户` | `TestingManager/Sample/approve` | "只有正在试验且属于自己的任务可提交审核" |
| 科室审核时方法状态 | `sample_methods.status = 3` | `DepartmentManager/Sample/approve` | "只有等待组长审核的任务可审核" |
| 管理组审批时方法状态 | `sample_methods.status = 4` | `WorkflowManager/Sample/approve` | "只有等待管理组审核的任务可审批" |

### 12.2 特殊样品创建校验

| 校验点 | 校验规则 | 涉及接口 | 失败提示建议 |
|--------|----------|----------|-------------|
| 空白样 | `type=1` 时 `reference_material_id = null` 且 `parent_id = null` | `*/Sample/reference` | "空白样不需要关联参比物质或父样品" |
| 参比样 | `type=2` 时 `reference_material_id` 必填且 `parent_id = null` | `*/Sample/reference` | "参比样必须选择标准物质，且不能设置父样品" |
| 重复样 | `type=3` 时 `parent_id` 必填且 `reference_material_id = null` | `*/Sample/reference` | "重复样必须选择父样品，且不能关联标准物质" |

### 12.3 试剂库存状态机校验

| 校验点 | 校验规则 | 涉及接口 | 失败提示建议 |
|--------|----------|----------|-------------|
| 领取 | 最新日志 `type ≠ 3`（未报废）且 `type ≠ 1`（未领用） | `ReagentStock/action` | "该试剂已领用或已报废，无法重复领取" |
| 归还 | 最新日志 `type = 1`（已领用） | `ReagentStock/action` | "该试剂未领用，无法归还" |
| 标准物质使用 | `used ≤ remaining` | `ReferenceMaterial/use` | "使用量不能超过当前余量" |
| 标准物质配制 | 每个父物质 `used ≤ remaining` | `ReferenceMaterial/prepare` | "父物质使用量不能超过其余量" |

### 12.4 通用表单校验

| 校验点 | 校验规则 | 涉及接口 | 说明 |
|--------|----------|----------|------|
| 日期有效性 | `deadline ≥ 今天` | `Task/create`、`Task/update` | 建议前端日期选择器限制最小值为当天 |
| 外键有效性 | 关联 ID 必须从对应 `combo` 接口选择 | 所有含 `_id` 的创建/更新接口 | 避免用户输入不存在的 ID |
| 二选一参数 | `task_id` 和 `sample_ids` 不能同时为空或同时有值 | 大量 `Sample` 子接口 | 前端用单选逻辑控制参数传递 |
| 数值类型 | `data_type=1` 时输入必须为数值 | `Sample/resultCreate` | 前端根据字段元数据渲染输入控件 |
| 必填字段 | `is_required=1` 时结果值不能为空 | `Sample/resultCreate` | 提交前遍历校验 |

---

## 十三、数据字典与枚举值

### 13.1 通用枚举

| 枚举名 | 值 | 含义 |
|--------|----|------|
| `physical_state` | `0` | 固态 |
| `physical_state` | `1` | 液态 |
| `physical_state` | `2` | 气态 |
| `category`（任务） | `0` | 委托检测 |
| `category`（任务） | `1` | 监督检测 |
| `category`（任务） | `2` | 其他 |
| `delivered_by` | `0` | 客户邮寄 |
| `delivered_by` | `1` | 客户送检 |
| `delivered_by` | `2` | 自采 |
| `is_processing` | `0` | 不需要加工 |
| `is_processing` | `1` | 需要加工 |

### 13.2 样品类型（`samples.type`）

| 值 | 含义 | 配套字段 |
|----|------|----------|
| `0` | 非对照样 | — |
| `1` | 空白样 | — |
| `2` | 参比样 | `reference_material_id` |
| `3` | 重复样 | `parent_id` |

### 13.3 加工状态（`sample_items.processing_status`）

| 值 | 含义 | 可操作 |
|----|------|--------|
| `0` | 不加工/未开始 | 可设置加工（`processCreate`） |
| `1` | 正在加工 | 可更新加工（`processUpdate`）、可确认完成（`approve`）、**不可下发/分配** |
| `2` | 加工完成 | 可下发/分配 |

### 13.4 检测方法状态（`sample_methods.status`）

| 值 | 含义 | 可操作 |
|----|------|--------|
| `0` | 管理组未下发 | 可下发至科室（`distribute`） |
| `1` | 组长未下发 | 可分配检测员（`distribute`） |
| `2` | 正在试验 | 可录入结果、可提交审核（`approve`） |
| `3` | 等待组长审核 | 科室负责人可审批/驳回 |
| `4` | 等待管理组审核 | 管理组可审批/驳回 |
| `5` | 生命周期结束 | 不可操作 |

### 13.5 试剂类型（`reagents.category`）

| 值 | 含义 |
|----|------|
| `0` | 易制毒 |
| `1` | 易制爆 |
| `2` | 一般试剂 |

### 13.6 试剂日志类型（`reagent_logs.type`）

| 值 | 含义 | 状态流转 |
|----|------|----------|
| `0` | 新建 | 初始状态 |
| `1` | 领取 | 新建/归还后可领取 |
| `2` | 归还 | 领取后可归还 |
| `3` | 报废 | 任意状态（除已报废）可报废 |

### 13.7 标准物质类别（`reference_materials.category`）

| 值 | 含义 |
|----|------|
| `0` | 标准物质 |
| `1` | 标准溶液 |
| `2` | 基准试剂 |

### 13.8 标准物质阶段（`reference_materials.stage`）

| 值 | 含义 |
|----|------|
| `0` | 原液 |
| `1` | 中间液 |
| `2` | 工作液 |
| `3` | 标准曲线 |

### 13.9 结果字段数据源类型（`test_method_result_fields.source_type`）

| 值 | 含义 | 配套字段 |
|----|------|----------|
| `0` | 手动输入 | — |
| `1` | 引入 | `input_mapped_from` |
| `2` | 固定值 | `fixed_value` |
| `3` | 设备采集 | `device_api` |
| `4` | 计算 | `code` |

### 13.10 封面/表字段类型（`report_cover_fields.type` / `report_table_fields.type`）

| 值 | 含义 | 配套字段 |
|----|------|----------|
| `0` | 手动录入 | — |
| `1` | 输入数据 | `input_mapped_from` |
| `2` | 输出数据 | `result_mapped_from` |
| `3` | 固定值 | `fixed_value` |

---

## 十四、接口关联关系图（核心业务流程）

```
┌─────────────────────────────────────────────────────────────────────┐
│                         任务创建流程                                │
├─────────────────────────────────────────────────────────────────────┤
│  ResourceAdmin/Client/combo      →  选择客户                        │
│  ResourceAdmin/TaskSampleType/combo → 选择样品类型                   │
│  ResourceAdmin/TaskAnalysisType/combo → 选择分析类型                 │
│  SystemAdmin/User/combo          →  选择收样人                       │
│  ↓                                                                  │
│  WorkflowManager/Task/create     →  创建任务（自动生成 lab_code）    │
│  ↓                                                                  │
│  WorkflowManager/Sample/create   →  逐个或批量（upload）录入样品     │
│  ↓                                                                  │
│  ResourceAdmin/TestItem/combo    →  选择检测项目                     │
│  WorkflowManager/Sample/itemCreate → 绑定项目到样品                  │
│  ↓                                                                  │
│  ResourceAdmin/TestMethod/combo  →  选择检测方法                     │
│  WorkflowManager/Sample/methodCreate → 绑定方法到样品-项目           │
│  ↓                                                                  │
│  ResourceAdmin/ProcessingMethod/combo → 选择加工方法（若需要）       │
│  WorkflowManager/Sample/processCreate → 设置加工要求                 │
│  ↓                                                                  │
│  ProcessingManager/Sample/approve → 加工完成确认                     │
│  ↓                                                                  │
│  ResourceAdmin/Department/combo  →  选择目标科室                     │
│  WorkflowManager/Sample/distribute → 下发至科室                      │
│  ↓                                                                  │
│  DepartmentManager/Sample/distribute → 科室负责人分配给检测员         │
│  ↓                                                                  │
│  TestingManager/Sample/resultCreate → 检测员录入结果                 │
│  ↓                                                                  │
│  TestingManager/Sample/approve   →  检测员提交审核                   │
│  ↓                                                                  │
│  DepartmentManager/Sample/approve → 科室负责人审核通过                │
│  ↓                                                                  │
│  WorkflowManager/Sample/approve  →  管理组终审通过                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

*文档生成时间：2026-05-04*  
*基于代码版本：LIMS-Python*
