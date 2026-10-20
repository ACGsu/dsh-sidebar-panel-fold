# dsh-sidebar-panel-fold

把 DeepSeek Harness 左侧边栏的**全局面板列表**（插件、定时任务、上下文……）收进一行。

> 默认展开时与原生完全一致；点一下「收起面板」就只剩一行摘要，再点这一行弹出浮层，列出全部面板随时切换。

- **不改任何内置文件** —— 纯外挂插件，不碰 `app.asar`、不碰官方包
- **状态跨重启保留** —— 记在 Host 侧设置文档里，换端口、换端都不丢
- **零运行时依赖** —— 只有 Host 侧一个 `@deepseek-ai/schemastery`（peer，可选）

<sub>English: folds the DeepSeek Harness sidebar's global panel list (Plugins, Schedules, Context, …) into a single row, with a popover to switch panels. State is persisted through DSH's own settings channel, so it survives restarts on both the web and desktop builds. No built-in files are modified. Documentation below is in Chinese.</sub>

## 目录

- [1. 效果](#1-效果)
- [2. 安装](#2-安装)
- [3. 使用](#3-使用)
- [4. 兼容性](#4-兼容性)
- [5. 工作原理](#5-工作原理)
- [6. 已知限制](#6-已知限制)
- [7. 卸载](#7-卸载)
- [8. 开发](#8-开发)
- [9. 问题排查](#9-问题排查)
- [10. 版本](#10-版本)
- [11. 许可与声明](#11-许可与声明)

## 1. 效果

安装前，侧边栏的面板列表每个面板占一行：

```
┌──────────────────────┐
│  ▣  新会话           │  ← 独立按钮，不属于面板列表
│  ⬡  插件             │  ┐
│  ◷  定时任务         │  ├ nav[aria-label="全局面板"]
│  ◈  上下文           │  │ 每个面板一行
│  ▤  市场             │  ┘
└──────────────────────┘
```

装上本插件后，列表上方多出一行「收起面板」：

```
┌──────────────────────┐
│  ▣  新会话           │
│  ⌃  收起面板         │  ← 本插件注入的一行
│  ⬡  插件             │
│  ◷  定时任务         │
│  ◈  上下文           │
│  ▤  市场             │
└──────────────────────┘
```

点击「收起面板」，整列面板收纳成一行摘要（图标 = 当前激活面板，文字 = 当前面板名）：

```
┌──────────────────────┐
│  ▣  新会话           │
│  ⬡  插件  ⌄          │  ← 收纳成一行；点击弹出浮层
└──────────────────────┘
```

点击这一行弹出浮层，列出全部面板：

```
        ┌──────────────────┐
        │  ⬡  插件      ✓  │  ← 当前面板
        │  ◷  定时任务     │
        │  ◈  上下文       │
        │  ▤  市场         │
        │  ─────────────   │
        │  ⌃  展开面板     │  ← 恢复成多行列表
        └──────────────────┘
```

点哪项就切到哪个面板，浮层自动关闭，仍然保持收起。侧边栏处于「窄轨」（整栏收起只剩图标）时，本插件的一行也只显示图标，浮层照常可用。

## 2. 安装

本插件是一个标准的 DSH bundle 包，声明了 `dsh.bundle.patch`，装进 profile 后会被自动加入 `dsh.profile.bundles`，**无需手工改任何配置**。

```powershell
# 1. 把本仓库放到任意目录，记下绝对路径
# 2. 用 file: 协议装进 profile（推荐）
dsh plugin --profile desktop add "file:<本仓库的绝对路径>"

# 3. 完整退出并重启 DeepSeek Harness
```

### 2.1 从本地目录安装

**推荐用 `file:`，不要用 `link:`。**

```powershell
# 桌面端 profile（默认就是它）
dsh plugin --profile desktop add "file:/path/dsh-sidebar-panel-fold"
```


### 2.2 从插件管理器安装

在「插件」面板里选择「从本地路径安装」，指向本目录即可。插件管理器会校验包内是否存在 `dsh.bundle`（本包已声明），随后自动 reconcile 进 profile 的 bundles 列表。

### 2.3 生效

bundle 的 patch 层是在**启动时**组合的，因此安装完需要**完整退出并重启** DeepSeek Harness（不是刷新页面）。

装成功后控制台应有：

```
[dsh-sidebar-panel-fold] client loaded v0.1.0
```

若还看到 `schemastery is not resolvable` 警告，说明装的是 `link:`，换成 `file:` 重装。

> 端口说明：桌面端每次启动用随机端口（`--port 0`），Web 端端口由 `dsh web` 决定。本插件不依赖固定端口，状态存在 Host 侧，换端口不影响。

## 3. 使用

| 场景 | 操作 |
| --- | --- |
| 收起面板列表 | 点击「收起面板」这一行 |
| 展开回原样 | 展开状态下再点这一行（此时它显示「收起面板」） |
| 在收起状态下切换面板 | 点击那一行摘要 → 浮层里选面板 |
| 关闭浮层 | 点击浮层外部、按 `Esc`、或滚动页面 |

## 4. 兼容性

| 项目 | 说明 |
| --- | --- |
| DSH 版本 | `engines.dsh: ">=0.2.0-rc.2"`（DSH 用 `includePrerelease` 匹配，`0.2.1-rc.2` 通过） |
| 验证环境 | DSH `0.2.1-rc.2`，Desktop（Windows 11）/ Web |
| 平台 | Web（浏览器）与 Desktop（Electron）共用 `dsh.client.platform = "web"` |
| 依赖 | 仅 `@deepseek-ai/schemastery`（Host 侧 schema，peer 且 optional）；运行时零第三方依赖 |
| 内置文件 | **不修改** `app.asar` / 任何官方包 |

插件依赖以下**稳定锚点**，都来自官方渲染器与侧边栏组件，不依赖 CSS Module 的哈希类名：

1. `[data-slot="sidebar.panellist"]` —— 插槽渲染器固定输出的锚点（`display: contents`，不参与布局）
2. `nav` —— 由 `closest("nav")` 取得，即面板列表容器
3. `button[aria-current="page"]` / `aria-label` —— 读取当前面板与各面板名称

即使官方改了样式哈希（`_2H3hWW_*`），本插件也不受影响。


## 5. 工作原理

```
Host 半边 (src/index.js)               浏览器半边 (src/client.js)
─────────────────────────              ─────────────────────────────
Config = z.object({                    apply(ctx):
  folded: z.boolean()                    ├─ 注入 <style>（data-dsh-spf-css）
    .default(false)                      ├─ 注册 zh/en 词典（locale NS）
    .volatile()                          ├─ 启动 DOM 观察器
})                                       ├─ 在 nav 前插入一行按钮
apply(ctx):                              └─ ctx.inject(["configForms"]) → 读写 folded
  settings.configure({ auto: false })
  → 不出现在自动生成的设置页
```

细节：

- **注入位置**：按钮容器作为 `nav` 的**前一个兄弟节点**插入，绝不进入 React 自己管理的 `nav` 子节点列表，因此不会与 React 的 diff 打架；React 若重建 `nav`，观察器会重新挂载。
- **收起实现**：给 `nav` 加自定义类 `dsh-spf-folded`，由本插件自己的 CSS 隐藏 `nav` 的**子节点**（不写内联样式，展开时移除类即可还原）。之所以隐藏子节点而不是 `nav` 本身，是为了让 `nav` 的 `display` 仍可被 `getComputedStyle` 读到——官方在 Windows 标题栏窄轨模式下会自己把整个列表 `display: none`，此时本插件的一行也一并隐藏，不会留下一个孤零零的按钮。
- **摘要内容**：从 `nav` 里当前激活的 `button[aria-current="page"]` 读取 `aria-label` 与图标 `innerHTML`，克隆进摘要行，因此面板增减、语言切换都会自动跟随。
- **浮层**：点击摘要行时按 `nav` 里的按钮动态生成菜单（`role="menu"`），点某项时直接 `row.click()`，交回 DSH 自己的 `selectPanel` 逻辑，不绕过任何官方行为。
- **变更检测**：`MutationObserver`（`childList` + `aria-current`/`aria-label`/`class`）+ `resize`/`scroll`，统一用 `requestAnimationFrame` 节流，并对派生状态做签名比对，避免自触发循环。
- **样式**：全部走设计令牌（`--dsw-alias-label-primary`、`--dsw-alias-interactive-bg-hover`、`--dsw-radius-md` 等），自动适配深浅色主题。
- **清理**：所有副作用都挂在 `ctx.effect` 的返回值里，插件卸载时移除 `<style>`、按钮容器与全部监听器，不留残留 DOM。


## 6. 已知限制

- **不是官方插槽能力**：`sidebar.panellist` 是 `list` 槽，但每个 entry 由 `SidebarRoot` 独占渲染成一行 `PanelRow`，官方没有提供「包裹整个 nav」的扩展点，因此本插件走 DOM 注入。若上游把 `nav` 换成别的标签或去掉 `[data-slot]` 锚点，需要同步调整 `src/client.js` 里的 `SLOT` 常量（改动点集中，只有一处）。
- **浮层是自绘的**：定位、关闭时机（外部点击 / `Esc` / 滚动）都由本插件负责；DSH 自带的 `Tooltip` 等原语没有对外暴露，未复用。
- **收起时不可用键盘 Tab 遍历面板**：列表被隐藏，需要通过摘要行打开浮层（浮层内可 Tab）。这是「收纳为一行」的固有代价。
- **不影响窄轨的官方行为**：Windows 标题栏模式下整栏收起时，官方本来就会隐藏面板列表，此时本插件的一行也随之隐藏。

## 7. 卸载

```powershell
dsh plugin --profile desktop remove dsh-sidebar-panel-fold
```

随后完整重启。插件在 `ctx.effect` 的清理函数里移除注入的 `<style>`、按钮容器与所有监听器，不会留下残留 DOM。

## 8. 开发

```
dsh-sidebar-panel-fold/
├── README.md            # 本文件
├── LICENSE              # MIT
├── package.json         # dsh.bundle / dsh.client 声明
├── cordis.patch.yml     # profile patch 层：插入 host entry
├── src/
│   ├── index.js         # Host 半边：Config schema + 隐藏自动设置页
│   └── client.js        # 浏览器半边：DOM 注入 + 浮层 + 持久化
└── test/
    └── smoke.mjs        # 无浏览器冒烟测试
```

自检（Node ≥ 20，无需安装依赖）：

```powershell
node --check src/client.js   # 语法检查
node test/smoke.mjs          # 迷你 DOM 下的行为断言，末行应为 smoke: ok
```

冒烟测试自带一个极简 DOM（`El` / `Fragment` / `Document`）与假的 `ctx`（`effect` / `locale` / `inject` / `configForms`），覆盖：插入位置、收起与展开、摘要内容、浮层项与当前项标记、选择面板时回退到内置行、展开动作、官方隐藏列表时同步隐藏、面板动态增减、`nav` 消失与重建、卸载后无残留。它验证的是插件自身的接线（选择器、事件、状态流、清理），不验证 CSS 与 React 集成。

开发期可以用 `link:` 换安装速度（改完重启即生效），但记得它会让状态记忆降级；交付前用 `file:` 复验一次。

## 9. 问题排查

| 现象 | 原因 / 处理 |
| --- | --- |
| 侧边栏没有任何变化，控制台也没有 `client loaded` | 确认 `dsh.profile.bundles` 里有 `dsh-sidebar-panel-fold`，并**完整重启**（bundle patch 只在启动时组合）。 |
| 控制台有 `schemastery is not resolvable` 警告 | 用了 `link:` 装的。插件本身仍能工作，但收起状态不会跨重启保留。改用 `file:` 重装。 |
| 有 `client loaded` 但没有按钮 | 面板列表为空（`nav` 不存在）时插件不插入任何东西。装至少一个注册 `sidebar.panellist` 的插件（插件管理器自带「插件」面板）。 |
| 收起状态重启后丢失 | 说明 `configForms` 不可用，走了 `localStorage` 兜底；桌面端端口随机会导致兜底失效。检查控制台是否有上面那条 `schemastery` 警告。 |
| 控制台报 `No configurable plugin entry "dsh-sidebar-panel-fold"` | profile patch 里该 entry 的 `id` 与插件 `SETTINGS_NS` 不一致，或 `src/index.js` 没有导出 `Config`（只有 `volatile()` 字段才会出现在设置表单里）。 |
| 收起后列表还在 | 说明官方的 `nav` 结构变了（不再是 `[data-slot="sidebar.panellist"]` 的祖先）。改 `src/client.js` 顶部的 `SLOT` 常量或 `findNav()` 即可，改动点只有一处。 |

## 10. 版本

- `0.1.0` —— 首版：收起为一行、浮层切换、Host 侧状态记忆、Web / 桌面通用。

## 11. 许可与声明

[MIT](LICENSE) © dsh-sidebar-panel-fold contributors

本项目是非官方第三方插件，与 DeepSeek 官方无关。它在运行时读取 DSH 渲染出的 DOM 结构，因此**可能**随 DSH 上游改动而失效——真到那天，改动点集中在 `src/client.js` 顶部的锚点常量。
