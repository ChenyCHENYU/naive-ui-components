# 通知中心：演示、远程接口与共享数据源

`C_NotificationCenter` 提供顶部入口、分类列表、详情与消息操作。业务路由、用户/公司身份、待办办理和后端投递由应用负责；组件不读取业务 Store，不绑定具体后台。

## 保留开箱演示

```vue
<C_NotificationCenter
  data-mode="demo"
  storage-key="my-app:notifications:demo"
/>
```

未指定 `dataMode` 时，配置 `fetchNotifications` 会进入远程模式，否则保持演示兼容行为。显式 `demo` 使用内置消息，已读、删除、清空即时持久化到自己的 storage key；刷新和重挂不会恢复已经清空的消息。需要重置演示时由应用删除该 key，其他应用存储不会被修改。

演示模式不调用远程适配器，不启动远程轮询。消息推送配置仍需显式提供，组件不会连接任何演示服务器。

## 对接远程查询与命令

```vue
<C_NotificationCenter
  data-mode="remote"
  :fetch-notifications="fetchInbox"
  :mark-as-read="markRead"
  :mark-all-read="markAllRead"
  :delete-notification="deleteInboxItems"
  :clear-notifications="clearInbox"
  :on-error="reportNotificationError"
  @view-all="router.push('/message-center')"
/>
```

`fetchInbox({ category, page, pageSize })` 返回：

```ts
{
  list: NotificationMessage[],
  total: number,        // 当前查询条件的总条数
  unreadCount: number,  // 全局未读总数，不是当前页或当前分类的数量
  unreadByCategory?: { system?: number, business?: number, alarm?: number }
}
```

分类统计未返回时保持未知，UI 隐藏对应数字，不能用当前页推算完整统计。分页合并按消息 ID 去重，并更新服务端返回的同 ID 记录。分页失败保留已加载数据和当前页，重试继续失败的目标页。

远程模式缺少查询或操作适配器会显示错误并拒绝该操作，绝不会回退到演示数据或伪装成功。异步命令必须在对应适配器内返回 Promise；`read`、`delete`、`allRead` 仅通知正常点击命令的成功完成。错误区的“重试”会重放最近失败的命令；重试不会补发原点击的成功事件，业务状态应以共享数据源或服务端结果为准。

读、删命令使用操作日志叠加状态。旧请求失败只撤销自己的影响，不会覆盖后续成功操作，也不会用旧整表快照抹掉刷新或实时新增的消息。批量已读和清空需要后端定义作用范围、截止时间与权限；涉及跨页或复杂业务筛选时，建议使用下方应用控制器协调接口与服务端统计对账。

没有服务端快照版本或事件游标时，前端无法判断一次统计响应是否已包含仍在途中的批量命令。应用适配器应发送明确截止时间/版本，成功后重新查询权威统计；查询和推送也应采用同一服务端版本规则。组件的操作日志用于避免本地请求回滚互相覆盖，不代表对服务器全量状态的交付或一致性保证。跨页已知记录索引仅额外保留最近 256 条，当前可见记录与进行中操作记录按需保留。

## 顶部与完整消息中心共用应用状态

`controller?: NotificationCenterController` 是可选的公开协议，所有状态为 Ref 或 computed Ref。传入后，组件不再创建内部 core，不额外请求、轮询或建连，也不会在卸载时销毁应用数据源。

```ts
import { useNotificationCore } from '@robot-admin/naive-ui-components'

// 在应用拥有的 setup/effectScope 中创建；Store 的身份隔离和退出清理由应用管理。
const controller = useNotificationCore({
  dataMode: 'remote',
  fetchNotifications: fetchInbox,
  markAsRead: markRead,
  pollingInterval: 60_000,
})
```

```vue
<C_NotificationCenter :controller="controller" @view-all="openMessageCenter" />
```

自定义应用 Store 也可以直接实现该接口。列表、统计和操作可投影共享 Store；`activeCategory`、`selectedMessage`、`popoverVisible` 可在顶部桥接对象中独立保存，避免完整页面的筛选改变顶部列表。请传递保留 Ref 的普通对象，避免用会自动解包 Ref 的深层 reactive 对象包裹整个控制器。

控制器包含 `error`、`busy`、`pendingIds`、`clearError()`，以及可选 `retry()`。若自定义控制器未提供 retry，错误区重试会刷新列表。独立 `useNotificationCore` 另外返回 `initialize()`/`dispose()`；需要手动初始化时设 `autoStart: false`。Vue 组件挂载后自动初始化，普通 effectScope 内会立即初始化，作用域停止会清理资源。切换 dataMode/storageKey 会清理旧作用域数据并重新初始化；远程用户/公司切换仍应由应用替换控制器或销毁旧作用域，并按身份取消请求。

## WebSocket 的可选增强

支持：

- `new_message`：完整 NotificationMessage；按 ID 去重，校验消息结构。
- `read_sync`：完整消息数组；同步其中消息 ID 的已读状态。
- `count_update`：`{ unreadCount, unreadByCategory? }`；校准权威未读统计，不重复扣减之前已发出的乐观命令。

自动重连使用有上限的退避，旧 socket 的迟到事件会被忽略。再次连接成功后远程 core 重新查询列表和统计。可选 `heartbeatTimeout` 启用 pong 超时检测；默认 0 保持既有仅发送心跳的兼容行为。

```ts
const wsConfig = {
  url: 'wss://your-service.example/notifications',
  heartbeatInterval: 30_000,
  heartbeatTimeout: 10_000,
  getToken: () => currentAccessToken(),
}
```

桌面通知权限仅在应用调用 `requestDesktopPermission()` 的用户手势中申请。连接、轮询和缓存都不代表服务端保证交付：事件游标、历史补偿、跨设备一致性、幂等写入、审计与投递重试需要后端协议支持。应用也应在恢复可见、重新登录或切换公司时补刷，并对消息业务目标重新校验权限。
