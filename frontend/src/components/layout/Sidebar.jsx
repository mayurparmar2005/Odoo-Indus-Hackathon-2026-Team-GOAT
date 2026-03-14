import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, ArrowDownToLine, ArrowUpFromLine,
  ArrowLeftRight, SlidersHorizontal, BookOpen, Settings,
  ChevronLeft, ChevronRight, LogOut, User
} from 'lucide-react'
import useAuthStore from '../../store/authStore'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: '#60B4FF' },
  { to: '/products', icon: Package, label: 'Products', color: '#BF5AF2' },
  { to: '/receipts', icon: ArrowDownToLine, label: 'Receipts', color: '#30D158' },
  { to: '/deliveries', icon: ArrowUpFromLine, label: 'Deliveries', color: '#FF453A' },
  { to: '/transfers', icon: ArrowLeftRight, label: 'Transfers', color: '#5AC8FA' },
  { to: '/adjustments', icon: SlidersHorizontal, label: 'Adjustments', color: '#FF9F0A' },
  { to: '/ledger', icon: BookOpen, label: 'Stock Ledger', color: '#64D2FF' },
  { to: '/settings/warehouses', icon: Settings, label: 'Settings', color: '#98989D' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <aside
      className={`${collapsed ? 'w-[68px]' : 'w-[230px]'} flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out relative`}
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0D0D0F 0%, #111113 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Subtle top glow */}
      <div className="absolute top-0 left-0 right-0 h-24 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,113,227,0.12) 0%, transparent 70%)' }} />

      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 relative ${collapsed ? 'justify-center' : ''}`}
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 rounded-xl blur-lg opacity-50"
            style={{ background: 'linear-gradient(135deg,#0071E3,#5AC8FA)' }} />
          <div className="relative w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#0071E3,#0056B3)' }}>
            <Package size={15} className="text-white" />
          </div>
        </div>
        {!collapsed && (
          <div className="animate-fade-in min-w-0">
            <p className="text-white text-sm font-bold leading-tight tracking-tight">CoreInventory</p>
            <p className="text-white/30 text-[10px] font-medium tracking-wider uppercase">IMS Platform</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-4 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <p className="px-3 mb-2 text-[9px] font-bold text-white/20 uppercase tracking-[0.15em]">Navigation</p>
        )}
        {NAV_ITEMS.map(({ to, icon: Icon, label, color }) => (
          <NavLink
            key={to} to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `nav-item group ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''}`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`relative flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 ${isActive ? 'bg-white/10' : 'group-hover:bg-white/6'}`}>
                  <Icon size={15} style={{ color: isActive ? color : undefined }} />
                  {isActive && (
                    <div className="absolute inset-0 rounded-lg blur-sm opacity-30" style={{ background: color }} />
                  )}
                </div>
                {!collapsed && (
                  <span className="animate-fade-in text-[13px]">{label}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: User + Collapse */}
      <div className="p-2.5 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl mb-1"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#0071E3,#5AC8FA)' }}>
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-white text-[12px] font-semibold truncate leading-tight">{user?.name || 'User'}</p>
              <p className="text-white/30 text-[10px] capitalize font-medium">{user?.role || 'staff'}</p>
            </div>
          </div>
        )}
        <button onClick={handleLogout} title="Logout"
          className={`nav-item w-full text-left hover:bg-red-500/15 hover:text-red-400 ${collapsed ? 'justify-center px-0' : ''}`}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0">
            <LogOut size={14} />
          </div>
          {!collapsed && <span className="text-[13px]">Logout</span>}
        </button>
        <button onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expand' : 'Collapse'}
          className={`nav-item w-full text-left ${collapsed ? 'justify-center px-0' : ''}`}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0">
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </div>
          {!collapsed && <span className="text-[13px]">Collapse</span>}
        </button>
      </div>
    </aside>
  )
}
