/**
 * 组件登记表 —— **唯一的一份清单**。
 *
 * 组件展示页按它渲染左侧目录和正文段落，全局搜索（Ctrl+K）也按它检索。
 * 加新组件时只改这里 + 在页面对应分类的分组里加一段示例。
 *
 * ⚠️ `anchor` 必须和示例段外层 section 的 id 一致，否则搜索跳转落不到位置。
 *
 * ------------------------------------------------------------------
 * 分类依据：naive-ui 文档站的六大分类
 * ------------------------------------------------------------------
 *   https://www.naiveui.com/zh-CN/os-theme/components/button
 *   通用 / 数据录入 / 数据展示 / 导航 / 反馈 / 其它
 *
 * 我们照搬这六类的骨架，但**按账本的业务相关性筛过**：
 *   - 去掉的：Discrete 离散值、Equation 公式、Log 日志、VirtualList 虚拟列表、
 *     LegacyGrid / LegacyTransfer 这些废弃组件
 *     —— 账本里没有对应场景，列出来只是凑数。
 *   - 保留的偏门组件（QRCode / Watermark / Carousel / Calendar）标 `planned`，
 *     因为「未来可能用到」，先占位。
 *
 * ------------------------------------------------------------------
 * 三种状态（status）
 * ------------------------------------------------------------------
 *   "ready"   —— 组件已实现，页面上有**能点能用**的真示例
 *   "planned" —— 组件还没做，页面上给出「计划中的样子」：外观草样 + 使用场景
 *   "omit"    —— 不展示，只在这份清单里留个名字和理由（默认不渲染）
 *
 * 「计划中」的条目**不是空占位**：每一条都写清楚它在账本里干什么用，
 * 用的是 `scene` 字段。这样这一页同时是组件清单，也是二期需求池。
 */

export type ComponentStatus = 'ready' | 'planned' | 'omit'

export type ComponentCategory =
  | '通用'
  | '数据录入'
  | '数据展示'
  | '导航'
  | '反馈'
  | '其它'

export interface ComponentEntry {
  id: string
  /** 中文名（显示名，也是搜索主字段） */
  name: string
  /** 英文名，显示在名字旁边 */
  sub: string
  /** naive-ui 里的对应组件名。没有对应的留空。 */
  naive?: string
  /** 正文里那段示例外层 section 的 id */
  anchor: string
  category: ComponentCategory
  status: ComponentStatus
  /** 一句话说明。搜索时也参与匹配。 */
  desc: string
  /** 在账本里干什么用。planned 的条目必填。 */
  scene?: string
  /** 省略的理由。'omit' 的条目必填。 */
  omitReason?: string
}

export const COMPONENTS: ComponentEntry[] = [
  /* ================================================================
     通用 —— 出现在每个页面的基础件
     ================================================================ */
  {
    id: 'c-button', name: '按钮', sub: 'Button', naive: 'n-button',
    anchor: 'sec-button', category: '通用', status: 'ready',
    desc: '五种变体（主 / 次 / 幽灵 / 危险 / 文字）× 三个尺寸，带图标、加载态、纯图标、全宽。',
  },
  {
    id: 'c-buttongroup', name: '按钮组', sub: 'ButtonGroup', naive: 'n-button-group',
    anchor: 'sec-buttongroup', category: '通用', status: 'ready',
    desc: '把若干个按钮拼成一条，中间的圆角抹平、描边接起来。',
  },
  {
    id: 'c-icon', name: '图标', sub: 'Icon', naive: 'n-icon',
    anchor: 'sec-icon', category: '通用', status: 'ready',
    desc: '全套用 lucide-react，统一 18px / stroke 1.6。带按钮、徽标、旋转、状态色四种用法。',
  },
  {
    id: 'c-typography', name: '字体排版', sub: 'Typography', naive: 'n-typography / n-h1…n-h6 / n-text / n-p / n-a / n-blockquote',
    anchor: 'sec-typography', category: '通用', status: 'ready',
    desc: '标题六级、正文、次要文字、行内代码、引用、链接的统一样式。',
  },
  {
    id: 'c-card', name: '卡片', sub: 'Card', naive: 'n-card',
    anchor: 'sec-card', category: '通用', status: 'ready',
    desc: '带标题栏和底栏的容器，可整体悬浮、可嵌表格、可做统计卡。',
  },
  {
    id: 'c-divider', name: '分割线', sub: 'Divider', naive: 'n-divider',
    anchor: 'sec-divider', category: '通用', status: 'ready',
    desc: '水平 / 垂直 / 虚线 / 带文字四种。',
  },
  {
    id: 'c-flex', name: '弹性布局', sub: 'Flex', naive: 'n-flex',
    anchor: 'sec-flex', category: '通用', status: 'ready',
    desc: '一维排布的容器，比手写 flex 类名省事，间距不用自己算。',
  },
  {
    id: 'c-grid', name: '栅格', sub: 'Grid', naive: 'n-grid / n-grid-item',
    anchor: 'sec-grid', category: '通用', status: 'ready',
    desc: '响应式栅格，1–6 列随窗口宽度自动折行。',
  },
  {
    id: 'c-space', name: '间距', sub: 'Space', naive: 'n-space',
    anchor: 'sec-space', category: '通用', status: 'ready',
    desc: '给一组元素统一加间距，横竖两种方向。',
  },
  {
    id: 'c-layout', name: '布局', sub: 'Layout', naive: 'n-layout',
    anchor: 'sec-layout', category: '通用', status: 'ready',
    desc: '页面的三块骨架：顶栏 / 侧栏 / 内容区。本项目的外壳就是它。',
  },
  {
    id: 'c-affix', name: '固钉', sub: 'Affix', naive: 'n-affix',
    anchor: 'sec-affix', category: '通用', status: 'planned',
    desc: '把元素钉在滚动容器顶部，滚到位置之前不动。',
    scene: '订单详情页的操作条（「确认完成 / 标记退款」）钉在顶部，长列表里不用滚回上面找按钮。',
  },
  {
    id: 'c-globalstyle', name: '全局样式', sub: 'GlobalStyle', naive: 'n-global-style',
    anchor: 'sec-globalstyle', category: '通用', status: 'planned',
    desc: '把主题变量同步到 body，让浮层（挂在 body 上的那种）也拿到同一套颜色。',
    scene: '抽屉 / 下拉菜单是 portal 到 body 的，如果不做全局同步，深色模式下弹出层会是浅色。',
  },

  /* ================================================================
     数据录入 —— 账本里仅次于表格的大头
     ================================================================ */
  {
    id: 'c-input', name: '输入框', sub: 'Input', naive: 'n-input',
    anchor: 'sec-input', category: '数据录入', status: 'ready',
    desc: '单行文本。带标签、帮助、错误、前后缀图标、可清除、密码框、只读态。',
  },
  {
    id: 'c-inputnumber', name: '数字输入', sub: 'InputNumber', naive: 'n-input-number',
    anchor: 'sec-inputnumber', category: '数据录入', status: 'ready',
    desc: '数字专用，带加减步进、上下限、单位、千分位。金额录入就是它。',
  },
  {
    id: 'c-textarea', name: '多行文本', sub: 'Textarea', naive: 'n-input type="textarea"',
    anchor: 'sec-textarea', category: '数据录入', status: 'ready',
    desc: '备注、地址用。带字数统计和自适应高度。',
  },
  {
    id: 'c-select', name: '选择器', sub: 'Select', naive: 'n-select',
    anchor: 'sec-select', category: '数据录入', status: 'ready',
    desc: '下拉单选，支持搜索过滤、清空、选项禁用、选项副文案。',
  },
  {
    id: 'c-nativeselect', name: '原生选择器', sub: 'NativeSelect', naive: 'n-select（原生形态）',
    anchor: 'sec-nativeselect', category: '数据录入', status: 'ready',
    desc: '直接用 <select>，不弹浮层。选项很少、或者需要系统原生下拉手感时用。',
  },
  {
    id: 'c-autocomplete', name: '自动补全', sub: 'AutoComplete', naive: 'n-auto-complete',
    anchor: 'sec-autocomplete', category: '数据录入', status: 'ready',
    desc: '输入时给候选。客户名、打手名这种「同一批人反复录」的字段用。',
  },
  {
    id: 'c-checkbox', name: '复选框', sub: 'Checkbox', naive: 'n-checkbox',
    anchor: 'sec-checkbox', category: '数据录入', status: 'ready',
    desc: '多选。带禁用态和半选态（表格全选用）。',
  },
  {
    id: 'c-radiogroup', name: '单选组', sub: 'RadioGroup', naive: 'n-radio / n-radio-group',
    anchor: 'sec-radiogroup', category: '数据录入', status: 'ready',
    desc: '单选。两种形态：普通圆点，和整块可点的卡片（适合要展示副文案的渠道选择）。',
  },
  {
    id: 'c-switch', name: '开关', sub: 'Switch', naive: 'n-switch',
    anchor: 'sec-switch', category: '数据录入', status: 'ready',
    desc: '开 / 关。设置页那种「一改就立即生效」的项用它，不用配保存按钮。',
  },
  {
    id: 'c-slider', name: '滑块', sub: 'Slider', naive: 'n-slider',
    anchor: 'sec-slider', category: '数据录入', status: 'ready',
    desc: '在区间里拖一个值。带上下限和实时数值。',
  },
  {
    id: 'c-segmented', name: '分段控制', sub: 'Segmented', naive: 'n-radio-button',
    anchor: 'sec-segmented', category: '数据录入', status: 'ready',
    desc: '几个选项并排、点一下就切。渠道切换、时间范围切换用它比下拉快。',
  },
  {
    id: 'c-form', name: '表单', sub: 'Form', naive: 'n-form / n-form-item',
    anchor: 'sec-form', category: '数据录入', status: 'ready',
    desc: '字段容器 + 校验。校验失败时错误文案挂在对应字段下面并整表拦截提交。',
  },
  {
    id: 'c-upload', name: '上传', sub: 'Upload', naive: 'n-upload',
    anchor: 'sec-upload', category: '数据录入', status: 'ready',
    desc: '点选或拖拽文件。Excel 订单导入的第一步。',
  },
  {
    id: 'c-datepicker', name: '日期选择', sub: 'DatePicker', naive: 'n-date-picker',
    anchor: 'sec-datepicker', category: '数据录入', status: 'planned',
    desc: '日历面板选日期，支持范围选择、快捷项（今天 / 本周 / 本月）。',
    scene: '记订单的「下单日期」、托管「到期日期」、收支分析的「统计区间」。账本里几乎每个筛选器都要它，是二期第一优先要补的表单件。',
  },
  {
    id: 'c-timepicker', name: '时间选择', sub: 'TimePicker', naive: 'n-time-picker',
    anchor: 'sec-timepicker', category: '数据录入', status: 'planned',
    desc: '选时分。',
    scene: '和日期选择配合，记录「打手实际开始的时刻」；也用于托管到期的精确定时。',
  },
  {
    id: 'c-mention', name: '提及', sub: 'Mention', naive: 'n-mention',
    anchor: 'sec-mention', category: '数据录入', status: 'planned',
    desc: '输入 @ 弹出人员候选。',
    scene: '订单备注里 @ 某个打手，让这条备注在打手端高亮出来。',
  },
  {
    id: 'c-cascader', name: '级联选择', sub: 'Cascader', naive: 'n-cascader',
    anchor: 'sec-cascader', category: '数据录入', status: 'planned',
    desc: '多级联动选择，一级一级往下选。',
    scene: '服务分类：「游戏 → 大区 → 服务项目」。现在服务项目是平铺的一个列表，项目多了会很难找。',
  },
  {
    id: 'c-colorpicker', name: '颜色选择', sub: 'ColorPicker', naive: 'n-color-picker',
    anchor: 'sec-colorpicker', category: '数据录入', status: 'planned',
    desc: '取色面板。',
    scene: '给不同渠道 / 不同游戏各配一个标识色，订单列表左侧色条用它区分。注意：一期范围里**没有**自定义调色盘，这个只用于「给分类打标」。',
  },
  {
    id: 'c-rate', name: '评分', sub: 'Rate', naive: 'n-rate',
    anchor: 'sec-rate', category: '数据录入', status: 'planned',
    desc: '星星打分。',
    scene: '给打手结单后打个分，攒起来能看出谁靠谱。属于二期「打手管理」的字段。',
  },
  {
    id: 'c-dynamicinput', name: '动态输入', sub: 'DynamicInput', naive: 'n-dynamic-input',
    anchor: 'sec-dynamicinput', category: '数据录入', status: 'planned',
    desc: '一组可增删的输入行。',
    scene: '**一客户多联系方式**：手机号和邮箱可以加好几条，加一行 / 删一行就是它。产品定义里明确要求了多联系方式，目前没有对应控件。',
  },
  {
    id: 'c-dynamictags', name: '动态标签', sub: 'DynamicTags', naive: 'n-dynamic-tags',
    anchor: 'sec-dynamictags', category: '数据录入', status: 'planned',
    desc: '输入回车就生成一个标签，标签可删。',
    scene: '给客户打自定义标签（「急单常客」「只走闲鱼」「要先付」），列表里按标签筛。',
  },
  {
    id: 'c-checkboxgroup', name: '复选框组', sub: 'CheckboxGroup', naive: 'n-checkbox-group',
    anchor: 'sec-checkboxgroup', category: '数据录入', status: 'planned',
    desc: '一组复选框统一管值，带「全选」。',
    scene: '批量改状态、批量指派打手时，先勾一批订单再统一操作。现在只能一行一行点。',
  },
  {
    id: 'c-transfer', name: '穿梭框', sub: 'Transfer', naive: 'n-transfer',
    anchor: 'sec-transfer', category: '数据录入', status: 'planned',
    desc: '左右两栏之间搬条目。',
    scene: '把「候选打手」拖到「本单参与人」。属于偏重的交互，如果最后只用得上两三个人的话，用复选框组更轻。',
  },
  {
    id: 'c-datetimepicker', name: '日期时间选择', sub: 'DatetimePicker', naive: 'n-date-picker type="datetime"',
    anchor: 'sec-datetimepicker', category: '数据录入', status: 'planned',
    desc: '日期 + 时分一次选完。',
    scene: '导入 Excel 时如果某一行的时间戳解析失败，让用户手工补一个完整时间。',
  },

  /* ================================================================
     数据展示 —— 账本的主画面
     ================================================================ */
  {
    id: 'c-datatable', name: '数据表', sub: 'DataTable', naive: 'n-data-table',
    anchor: 'sec-datatable', category: '数据展示', status: 'ready',
    desc: '表头可排序、整行可点、勾选列（带全选和半选）、斑马纹、紧凑行高、空数据态、加载态。',
  },
  {
    id: 'c-table', name: '基础表格', sub: 'Table', naive: 'n-table',
    anchor: 'sec-table', category: '数据展示', status: 'ready',
    desc: '不带排序和勾选的裸表格，自己完全控制表头和单元格。',
  },
  {
    id: 'c-tag', name: '标签', sub: 'Tag', naive: 'n-tag',
    anchor: 'sec-tag', category: '数据展示', status: 'ready',
    desc: '六种语义色，可关闭。订单状态、渠道、游戏名都用它。',
  },
  {
    id: 'c-badge', name: '徽标', sub: 'Badge', naive: 'n-badge',
    anchor: 'sec-badge', category: '数据展示', status: 'ready',
    desc: '数字角标 / 小红点，超过 99 显示 99+，可只显示点。',
  },
  {
    id: 'c-avatar', name: '头像', sub: 'Avatar', naive: 'n-avatar / n-avatar-group',
    anchor: 'sec-avatar', category: '数据展示', status: 'ready',
    desc: '圆形 / 方形、三档尺寸、图片或首字，以及叠堆 +N。',
  },
  {
    id: 'c-statistic', name: '统计数值', sub: 'Statistic', naive: 'n-statistic',
    anchor: 'sec-statistic', category: '数据展示', status: 'ready',
    desc: '一个大数字配标签、单位、涨跌趋势。收支分析页顶部那排就是它。',
  },
  {
    id: 'c-descriptions', name: '描述列表', sub: 'Descriptions', naive: 'n-descriptions',
    anchor: 'sec-descriptions', category: '数据展示', status: 'ready',
    desc: '「字段名 → 值」成对排列，订单详情的那个信息块。',
  },
  {
    id: 'c-list', name: '列表', sub: 'List', naive: 'n-list',
    anchor: 'sec-list', category: '数据展示', status: 'ready',
    desc: '竖排条目，每条可带右侧内容，整条可点。',
  },
  {
    id: 'c-timeline', name: '时间线', sub: 'Timeline', naive: 'n-timeline',
    anchor: 'sec-timeline', category: '数据展示', status: 'ready',
    desc: '按时间倒序的节点流。订单状态流转记录用它最合适。',
  },
  {
    id: 'c-collapse', name: '折叠面板', sub: 'Collapse', naive: 'n-collapse',
    anchor: 'sec-collapse', category: '数据展示', status: 'ready',
    desc: '可展开收起的内容块，支持手风琴模式（一次只开一个）。',
  },
  {
    id: 'c-tree', name: '树形控件', sub: 'Tree', naive: 'n-tree',
    anchor: 'sec-tree', category: '数据展示', status: 'ready',
    desc: '层级展开，可选中。做不了多选和拖拽，需要时再加。',
  },
  {
    id: 'c-empty', name: '空状态', sub: 'Empty', naive: 'n-empty',
    anchor: 'sec-empty', category: '数据展示', status: 'ready',
    desc: '没数据时的占位块，带说明和下一步动作按钮。',
  },
  {
    id: 'c-skeleton', name: '骨架屏', sub: 'Skeleton', naive: 'n-skeleton',
    anchor: 'sec-skeleton', category: '数据展示', status: 'ready',
    desc: '加载中的灰块占位，避免内容跳一下才出来。',
  },
  {
    id: 'c-diffbar', name: '差异条', sub: 'DiffBar', naive: '—',
    anchor: 'sec-diffbar', category: '数据展示', status: 'ready',
    desc: '一条横条按比例切成几段。展示「一单的钱去哪儿了：转单 / 手续费 / 到手」。naive-ui 没有对应组件。',
  },
  {
    id: 'c-ellipsis', name: '文本省略', sub: 'Ellipsis', naive: 'n-ellipsis',
    anchor: 'sec-ellipsis', category: '数据展示', status: 'ready',
    desc: '超长文本截断并保留悬浮查看全文。',
  },
  {
    id: 'c-numberanimation', name: '数字动画', sub: 'NumberAnimation', naive: 'n-number-animation',
    anchor: 'sec-numberanimation', category: '数据展示', status: 'planned',
    desc: '数字从旧值滚动到新值。',
    scene: '「本月到手」这种汇总数字，改一笔单之后滚动变化，比直接跳数字更容易看出「刚才那一下改了多少」。',
  },
  {
    id: 'c-carousel', name: '轮播', sub: 'Carousel', naive: 'n-carousel',
    anchor: 'sec-carousel', category: '数据展示', status: 'planned',
    desc: '多张内容轮播切换。',
    scene: '打手交付时的**截图凭证**浏览（一期打手端没有拍照上传，二期才有）。',
    },
  {
    id: 'c-calendar', name: '日历', sub: 'Calendar', naive: 'n-calendar',
    anchor: 'sec-calendar', category: '数据展示', status: 'planned',
    desc: '整月的日历格子，每格可以塞内容。',
    scene: '托管到期提醒的「月视图」：哪几天有单到期一眼看到。目前提醒只有列表形态。',
  },
  {
    id: 'c-qrcode', name: '二维码', sub: 'QRCode', naive: 'n-qrcode',
    anchor: 'sec-qrcode', category: '数据展示', status: 'planned',
    desc: '把一段文本生成二维码。**本页只放尺寸正确的占位块**，没有引二维码库。',
    scene: '手机端扫电脑上的订单号直接打开这一单；以及二期「手机记的单同步到电脑」的配对码。一期数据只在本设备，还用不上。',
  },
  {
    id: 'c-watermark', name: '水印', sub: 'Watermark', naive: 'n-watermark',
    anchor: 'sec-watermark', category: '数据展示', status: 'planned',
    desc: '在内容上平铺一层浅色水印文字。',
    scene: '导出的收支报表截图打上「店名 + 日期」，防止对账截图外流。',
  },
  {
    id: 'c-code', name: '代码块', sub: 'Code', naive: 'n-code',
    anchor: 'sec-code', category: '数据展示', status: 'planned',
    desc: '等宽字体展示一段代码或结构化文本，可高亮。',
    scene: '订单的原始导入行。Excel 解析失败时把那一行原样贴出来，用户才知道错在哪一列。',
  },
  {
    id: 'c-gradienttext', name: '渐变文字', sub: 'GradientText', naive: 'n-gradient-text',
    anchor: 'sec-gradienttext', category: '数据展示', status: 'omit',
    desc: '—',
    omitReason: '设计规范明确禁止渐变（颜色只用于表达状态，不用于装饰）。naive-ui 有，我们**刻意不做**。',
  },
  {
    id: 'c-marquee', name: '走马灯', sub: 'Marquee', naive: 'n-marquee',
    anchor: 'sec-marquee', category: '数据展示', status: 'omit',
    desc: '—',
    omitReason: '横向滚动公告，账本是工具不是运营页，没有这个场景。需要播报用提示条。',
  },
  {
    id: 'c-thing', name: '东西', sub: 'Thing', naive: 'n-thing',
    anchor: 'sec-thing', category: '数据展示', status: 'omit',
    desc: '—',
    omitReason: 'naive-ui 的一个通用「信息卡」抽象，我们的卡片 + 描述列表已经覆盖，多一层抽象反而绕。',
  },

  /* ================================================================
     导航
     ================================================================ */
  {
    id: 'c-tabs', name: '标签页', sub: 'Tabs', naive: 'n-tabs',
    anchor: 'sec-tabs', category: '导航', status: 'ready',
    desc: '两种形态：下划线式和胶囊式。用于在同一页的几组内容之间切。',
  },
  {
    id: 'c-sidebar', name: '侧边栏', sub: 'Sidebar', naive: 'n-menu（应用级）',
    anchor: 'sec-sidebar', category: '导航', status: 'ready',
    desc: '窗口最左边那条。可折叠、折叠后图标保留文字淡出、折叠时悬浮出右侧提示。',
  },
  {
    id: 'c-titlebar', name: '标题栏', sub: 'TitleBar', naive: '—',
    anchor: 'sec-titlebar', category: '导航', status: 'ready',
    desc: '窗口最上面那条：居中全局搜索触发器、右侧明暗切换、最右自绘窗口按钮。是 Electron 的拖动区。',
  },
  {
    id: 'c-breadcrumb', name: '面包屑', sub: 'Breadcrumb', naive: 'n-breadcrumb',
    anchor: 'sec-breadcrumb', category: '导航', status: 'ready',
    desc: '显示当前位置的层级路径，最后一项是当前页。',
  },
  {
    id: 'c-dropdown', name: '下拉菜单', sub: 'Dropdown', naive: 'n-dropdown',
    anchor: 'sec-dropdown', category: '导航', status: 'ready',
    desc: '点一个按钮弹出一列操作。支持分组标题、分隔线、快捷键提示、危险项。',
  },
  {
    id: 'c-pagination', name: '分页', sub: 'Pagination', naive: 'n-pagination',
    anchor: 'sec-pagination', category: '导航', status: 'ready',
    desc: '页码 + 上一页 / 下一页，页数多时中间自动省略。',
  },
  {
    id: 'c-steps', name: '步骤条', sub: 'Steps', naive: 'n-steps',
    anchor: 'sec-steps', category: '导航', status: 'ready',
    desc: '横向 / 竖向两种，已完成打勾、当前高亮。导入 Excel 的分步向导用它。',
  },
  {
    id: 'c-anchor', name: '锚点', sub: 'Anchor', naive: 'n-anchor',
    anchor: 'sec-anchor', category: '导航', status: 'ready',
    desc: '页内目录，滚动时自动高亮当前所在的那一节。**本页左侧那条目录就是它的实例。**',
  },
  {
    id: 'c-drawer', name: '抽屉', sub: 'Drawer', naive: 'n-drawer',
    anchor: 'sec-drawer', category: '导航', status: 'ready',
    desc: '从侧边滑出的面板，左 / 右两种方向。详情、编辑表单放这里比弹窗宽敞。',
  },
  {
    id: 'c-popover', name: '气泡卡片', sub: 'Popover', naive: 'n-popover',
    anchor: 'sec-popover', category: '导航', status: 'ready',
    desc: '点触发元素弹出一个任意内容的浮层，比下拉菜单自由。',
  },
  {
    id: 'c-backtotop', name: '回到顶部', sub: 'BackToTop', naive: 'n-back-top',
    anchor: 'sec-backtotop', category: '导航', status: 'ready',
    desc: '滚过一定距离后右下角浮出按钮。',
  },
  {
    id: 'c-menu', name: '菜单', sub: 'Menu', naive: 'n-menu',
    anchor: 'sec-menu', category: '导航', status: 'planned',
    desc: '可折叠、可多级的导航菜单，带选中态和子级展开。',
    scene: '侧边栏现在只有三项、手写就够了。等产品页面长到十几个，侧栏要换成带分组和子级的真菜单 —— 那时把 Sidebar 内部换成它，外观不变。',
  },
  {
    id: 'c-floatbutton', name: '悬浮按钮', sub: 'FloatButton', naive: 'n-float-button / n-float-button-group',
    anchor: 'sec-floatbutton', category: '导航', status: 'planned',
    desc: '固定浮在角落的圆形按钮，可成组。',
    scene: '订单列表右下角的「新建订单」；以及回到顶部按钮的升级版（点开是一组：回到顶部 / 新建 / 同步）。',
  },

  /* ================================================================
     反馈
     ================================================================ */
  {
    id: 'c-modal', name: '对话框', sub: 'Modal', naive: 'n-modal / n-dialog',
    anchor: 'sec-modal', category: '反馈', status: 'ready',
    desc: '居中弹出，带标题栏和底栏。Esc、点遮罩、点 × 都能关。',
  },
  {
    id: 'c-popconfirm', name: '气泡确认', sub: 'Popconfirm', naive: 'n-popconfirm',
    anchor: 'sec-popconfirm', category: '反馈', status: 'ready',
    desc: '贴着按钮弹出的二次确认。比弹窗轻，适合「删除这一行」这种小危险操作。',
  },
  {
    id: 'c-toast', name: '消息条', sub: 'Toast', naive: 'n-message',
    anchor: 'sec-toast', category: '反馈', status: 'ready',
    desc: '右下角浮出的轻提示，四种语义色，带倒计时进度条。',
  },
  {
    id: 'c-alert', name: '提示条', sub: 'Alert', naive: 'n-alert',
    anchor: 'sec-alert', category: '反馈', status: 'ready',
    desc: '嵌在内容里的说明块，四种语义色，可带右侧动作和关闭按钮。',
  },
  {
    id: 'c-notification', name: '通知', sub: 'Notification', naive: 'n-notification',
    anchor: 'sec-notification', category: '反馈', status: 'ready',
    desc: '比消息条重的通知：带标题和正文，适合「托管 3 天后到期」这类要说明白的提醒。',
  },
  {
    id: 'c-progress', name: '进度条', sub: 'Progress', naive: 'n-progress',
    anchor: 'sec-progress', category: '反馈', status: 'ready',
    desc: '四档语义色，可显示百分比，可加斜纹。Excel 导入的进度用它。',
  },
  {
    id: 'c-spin', name: '加载动画', sub: 'Spin', naive: 'n-spin',
    anchor: 'sec-spin', category: '反馈', status: 'ready',
    desc: '转圈。三档尺寸，还有盖在容器上的遮罩版本。',
  },
  {
    id: 'c-result', name: '结果页', sub: 'Result', naive: 'n-result',
    anchor: 'sec-result', category: '反馈', status: 'ready',
    desc: '操作完的收尾页：一张图标 + 一句结论 + 下一步按钮。',
  },
  {
    id: 'c-tooltip', name: '文字提示', sub: 'Tooltip', naive: 'n-tooltip',
    anchor: 'sec-tooltip', category: '反馈', status: 'ready',
    desc: '悬浮出的一行说明，四个方向，支持多行卡片式。',
  },
  {
    id: 'c-loadingbar', name: '加载条', sub: 'LoadingBar', naive: 'n-loading-bar',
    anchor: 'sec-loadingbar', category: '反馈', status: 'planned',
    desc: '窗口最顶上一条细进度条，表示「正在处理」。',
    scene: 'Excel 导入 500 行订单时，顶上一道细线比弹一个遮罩更不打断操作 —— 用户可以同时看别的。',
  },
  {
    id: 'c-dialog', name: '命令式对话框', sub: 'Dialog', naive: 'n-dialog（命令式）',
    anchor: 'sec-dialog', category: '反馈', status: 'planned',
    desc: '不写 JSX，直接 `dialog.warning({...})` 调出来的对话框。',
    scene: '**合并客户**前必须弹窗问 —— 产品定义里写死的要求。这种「代码中途冒出来问一句」的场景，命令式比维护一个 isOpen 状态干净。',
  },
  {
    id: 'c-infinitescroll', name: '无限滚动', sub: 'InfiniteScroll', naive: 'n-infinite-scroll',
    anchor: 'sec-infinitescroll', category: '反馈', status: 'planned',
    desc: '滚到底自动加载下一批。',
    scene: '订单量大之后（比如导入了一整年的单），列表改成滚到底加载，比一次渲染几千行流畅。一期数据量小，先用分页。',
  },

  /* ================================================================
     其它
     ================================================================ */
  {
    id: 'c-floatingsearch', name: '全局搜索', sub: 'FloatingSearch', naive: '—',
    anchor: 'sec-floatingsearch', category: '其它', status: 'ready',
    desc: 'Ctrl/⌘ + K 打开的面板，可拖动、位置记忆、支持中文名与拼音（全拼 + 首字母）检索。',
  },
  {
    id: 'c-image', name: '图片', sub: 'Image', naive: 'n-image',
    anchor: 'sec-image', category: '其它', status: 'ready',
    desc: '带懒加载、载入淡入、失败占位的图片。高分屏自动换 2x。',
  },
  {
    id: 'c-pageheader', name: '页面标题', sub: 'PageHeader', naive: 'n-page-header',
    anchor: 'sec-pageheader', category: '其它', status: 'ready',
    desc: '页面顶部那块：图标 + 大标题 + 右侧动作槽。',
  },
  {
    id: 'c-sectioncard', name: '分组卡片', sub: 'SectionCard', naive: '—',
    anchor: 'sec-sectioncard', category: '其它', status: 'ready',
    desc: '带主色竖条的标题 + 内容区。**本页每一段都是它。**',
  },
  {
    id: 'c-scrollbar', name: '滚动条', sub: 'Scrollbar', naive: 'n-scrollbar',
    anchor: 'sec-scrollbar', category: '其它', status: 'ready',
    desc: '细滚动条（5px），悬停加深。全站统一，不用每个滚动容器单独写。',
  },
  {
    id: 'c-notfound', name: '404 卡片', sub: 'NotFound', naive: 'n-result status="404"',
    anchor: 'sec-notfound', category: '其它', status: 'ready',
    desc: '侧栏里除「组件预览」外的入口都通向它。整页渲染，带发光数字和装饰圆环。',
  },
  {
    id: 'c-pagebackground', name: '页面背景', sub: 'PageBackground', naive: '—',
    anchor: 'sec-pagebackground', category: '其它', status: 'ready',
    desc: '内容区左上角那层很淡的品牌色径向渐变，让大面积底色不至于死板。',
  },
]

/** 六大分类的固定顺序（和 naive-ui 文档站一致） */
export const CATEGORY_ORDER: ComponentCategory[] = [
  '通用',
  '数据录入',
  '数据展示',
  '导航',
  '反馈',
  '其它',
]

/** 只在页面上渲染的分类：omit 的整类会被跳过 */
export const VISIBLE_COMPONENTS = COMPONENTS.filter((c) => c.status !== 'omit')

export function componentsByCategory(category: ComponentCategory): ComponentEntry[] {
  return VISIBLE_COMPONENTS.filter((c) => c.category === category)
}

/** 统计数字，给页面头部和左侧目录用 */
export const REGISTRY_STATS = {
  total: COMPONENTS.length,
  ready: COMPONENTS.filter((c) => c.status === 'ready').length,
  planned: COMPONENTS.filter((c) => c.status === 'planned').length,
  omitted: COMPONENTS.filter((c) => c.status === 'omit').length,
}
