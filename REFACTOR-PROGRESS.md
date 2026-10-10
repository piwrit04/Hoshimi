# 视觉重构进度

## 参考选型
**shadcn/ui Dashboard（blocks/dashboard-01：Sidebar + SectionCards + 图表 + DataTable）**
理由：和本项目同栈（React + Tailwind），规格干净统一（8px 网格、h-9 控件、h-10 表头、单一卡片样式），适合密集的中文桌面账本；保留粉色主色即可，不必引入新依赖。

## 进度
- [x] 设计系统 tokens（间距 / 字号 / 卡片 / 按钮 / 控件 / 表格）
- [x] 深色主题重做
- [x] 外壳（侧栏 / 标题栏 / 搜索）
- [x] 概览
- [x] 订单列表 + 新建/编辑弹窗
- [x] 待办
- [x] 客户 + 客户详情
- [ ] 设置
- [ ] 组件预览 / 404
- [x] 测试数据（只用 seedCatalog）
