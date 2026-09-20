import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Boxes, Database, FlaskConical, Gauge, Library, Moon, PanelLeftClose, PanelLeft,
  Settings as SettingsIcon, Sparkles, Sun, Waypoints,
} from 'lucide-react'
import { useActiveModel, useWorkbench } from '@/lib/store'
import { PROVIDER_LABEL } from '@/lib/providers'
import { cx } from '@/lib/utils'

const NAV = [
  { to: '/', label: '工作台', icon: Gauge, end: true, group: '概览' },
  { to: '/studio', label: '创作台', icon: Sparkles, group: '生产' },
  { to: '/recipes', label: '配方库', icon: FlaskConical, group: '生产' },
  { to: '/library', label: '产出库', icon: Library, group: '生产' },
  { to: '/assets', label: '品牌资产', icon: Database, group: '供给' },
  { to: '/models', label: '模型接入', icon: Boxes, group: '供给' },
  { to: '/jobs', label: '运行记录', icon: Waypoints, group: '运维' },
  { to: '/settings', label: '设置', icon: SettingsIcon, group: '运维' },
]

function useThemeEffect() {
  const theme = useWorkbench((s) => s.theme)
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
  }, [theme])
}

function Sidebar() {
  const collapsed = useWorkbench((s) => s.sidebarCollapsed)
  const toggle = useWorkbench((s) => s.toggleSidebar)
  const groups = [...new Set(NAV.map((item) => item.group))]

  return (
    <aside
      className={cx(
        'flex shrink-0 flex-col border-r transition-all duration-200 hairline',
        collapsed ? 'w-[68px]' : 'w-[216px]',
      )}
      style={{ background: 'var(--surface-1)' }}
    >
      <div className="flex h-14 items-center gap-2.5 px-4">
        <div
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white"
          style={{ background: 'var(--series-1)' }}
        >
          <Sparkles size={15} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold leading-tight text-ink">女娲工作台</p>
            <p className="truncate text-[10px] leading-tight text-muted">AI 内容生成平台</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 pb-3">
        {groups.map((group) => (
          <div key={group} className="mb-3">
            {!collapsed && (
              <p className="px-2.5 pb-1.5 pt-2 text-[10px] font-medium uppercase tracking-wider text-muted">{group}</p>
            )}
            <div className="space-y-0.5">
              {NAV.filter((item) => item.group === group).map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    cx(
                      'flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] transition focus-ring',
                      isActive ? 'font-medium text-ink' : 'text-ink-2 hover:bg-plane hover:text-ink',
                      collapsed && 'justify-center',
                    )
                  }
                  style={({ isActive }) =>
                    isActive ? { background: 'color-mix(in srgb, var(--series-1) 12%, transparent)' } : undefined
                  }
                >
                  <Icon size={16} className="shrink-0" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <button
        onClick={toggle}
        className="m-2.5 flex items-center justify-center gap-2 rounded-xl px-2.5 py-2 text-xs text-muted transition hover:bg-plane hover:text-ink focus-ring"
      >
        {collapsed ? <PanelLeft size={15} /> : <><PanelLeftClose size={15} />收起侧栏</>}
      </button>
    </aside>
  )
}

function Topbar() {
  const { pathname } = useLocation()
  const theme = useWorkbench((s) => s.theme)
  const setTheme = useWorkbench((s) => s.setTheme)
  const models = useWorkbench((s) => s.models)
  const setActiveModel = useWorkbench((s) => s.setActiveModel)
  const active = useActiveModel()

  const current = NAV.find((item) => (item.end ? item.to === pathname : pathname.startsWith(item.to)))

  return (
    <header
      className="flex h-14 shrink-0 items-center justify-between gap-4 border-b px-5 hairline"
      style={{ background: 'var(--surface-1)' }}
    >
      <h1 className="text-sm font-semibold text-ink">{current?.label ?? '工作台'}</h1>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-xl border px-2.5 py-1.5 sm:flex hairline">
          <span
            className="h-1.5 w-1.5 rounded-full"
            title={PROVIDER_LABEL[active.provider]}
            style={{ background: active.provider === 'mock' ? 'var(--status-warning)' : 'var(--status-good)' }}
          />
          <select
            value={active.id}
            onChange={(e) => setActiveModel(e.target.value)}
            className="bg-transparent text-xs font-medium text-ink focus-ring"
            aria-label="切换模型"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="rounded-xl p-2 text-muted transition hover:bg-plane hover:text-ink focus-ring"
          aria-label="切换明暗主题"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  )
}

export function Layout() {
  useThemeEffect()
  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
