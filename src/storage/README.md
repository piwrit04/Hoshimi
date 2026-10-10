# 本地持久化

**选型：IndexedDB（原生，无包装库）**

| 数据 | 位置 | 说明 |
|------|------|------|
| 订单 / 客户 / 设置 / 费率 | IndexedDB `hoshimi` → `kv`/`snapshot` | 业务主存，带 `version` 可迁移 |
| 主题、侧栏折叠 | localStorage（zustand persist） | 小偏好，启动同步读 |

Electron：`app://hoshimi` 有稳定 origin，IDB 跨重启保留。以后导出 JSON 可写到 `userData`（`%APPDATA%\Hoshimi`），主存仍是 IDB。

启动：`boot.ts` 在挂路由前 `hydrate`，并用 `LoadingBar` + HTML 启动条。
