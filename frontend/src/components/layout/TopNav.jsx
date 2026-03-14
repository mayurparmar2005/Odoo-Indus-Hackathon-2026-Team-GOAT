import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, Search, AlertTriangle, XCircle, Package, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import useAuthStore from '../../store/authStore'
import { dashboardApi } from '../../api/dashboardApi'

const BREADCRUMBS = {
  '/dashboard': ['Dashboard'],
  '/products': ['Products'],
  '/products/new': ['Products', 'New Product'],
  '/receipts': ['Operations', 'Receipts'],
  '/receipts/new': ['Operations', 'Receipts', 'New'],
  '/deliveries': ['Operations', 'Deliveries'],
  '/deliveries/new': ['Operations', 'Deliveries', 'New'],
  '/transfers': ['Operations', 'Transfers'],
  '/transfers/new': ['Operations', 'Transfers', 'New'],
  '/adjustments': ['Operations', 'Adjustments'],
  '/ledger': ['Stock Ledger'],
  '/settings/warehouses': ['Settings', 'Warehouses'],
}

export default function TopNav() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const user      = useAuthStore((s) => s.user)
  const logout    = useAuthStore((s) => s.logout)

  const [notifOpen, setNotifOpen]   = useState(false)
  const [globalSearch, setGlobalSearch] = useState('')
  const notifRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Fetch low-stock alerts (refetch every 60s)
  const { data: alerts = [] } = useQuery({
    queryKey: ['low-stock-alerts'],
    queryFn: () => dashboardApi.alerts().then((r) => r.data),
    refetchInterval: 60_000,
    enabled: !!user,
  })

  const crumbs = BREADCRUMBS[location.pathname] ||
    location.pathname.split('/').filter(Boolean).map(s =>
      s.charAt(0).toUpperCase() + s.slice(1)
    )

  const outCount  = alerts.filter(a => a.total_stock <= 0).length
  const lowCount  = alerts.filter(a => a.total_stock > 0).length
  const totalBadge = alerts.length

  // Global search — navigate to products with ?q= on Enter
  const handleSearch = (e) => {
    if (e.key === 'Enter' && globalSearch.trim()) {
      navigate(`/products?q=${encodeURIComponent(globalSearch.trim())}`)
      setGlobalSearch('')
    }
  }

  return (
    <header className="h-[56px] sticky top-0 z-20 flex items-center justify-between px-6"
      style={{
        background: 'rgba(245,245,247,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
      }}>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-apple-border font-light">/</span>}
            <span className={`${
              i === crumbs.length - 1
                ? 'text-apple-text font-bold'
                : 'text-apple-secondary font-medium'
            } text-[13px]`}>
              {crumb}
            </span>
          </span>
        ))}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-2.5">

        {/* Global Search */}
        <div className="relative group">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-secondary transition-colors group-focus-within:text-apple-blue" />
          <input
            type="search"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="Search products…"
            className="pl-8 pr-3 py-[7px] rounded-xl text-[13px] text-apple-text placeholder-apple-secondary focus:outline-none transition-all duration-300 w-44 focus:w-60"
            style={{
              background: 'rgba(0,0,0,0.05)',
              border: '1px solid rgba(0,0,0,0.06)',
            }}
            onFocus={(e) => { e.target.style.background = 'white'; e.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'; e.target.style.borderColor = 'rgba(0,113,227,0.4)' }}
            onBlur={(e) => { e.target.style.background = 'rgba(0,0,0,0.05)'; e.target.style.boxShadow = 'none'; e.target.style.borderColor = 'rgba(0,0,0,0.06)' }}
          />
        </div>

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 group"
            style={{ background: notifOpen ? 'rgba(0,113,227,0.08)' : 'rgba(0,0,0,0.04)', border: `1px solid ${notifOpen ? 'rgba(0,113,227,0.3)' : 'rgba(0,0,0,0.06)'}` }}>
            <Bell size={14} className={`transition-colors ${notifOpen ? 'text-apple-blue' : 'text-apple-secondary group-hover:text-apple-text'}`} />
            {totalBadge > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-white text-[9px] font-black flex items-center justify-center border-2 border-white"
                style={{ background: outCount > 0 ? '#FF453A' : '#FF9F0A' }}>
                {totalBadge > 9 ? '9+' : totalBadge}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {notifOpen && (
            <div className="absolute right-0 top-10 w-80 rounded-2xl overflow-hidden z-50 animate-slide-up"
              style={{ background: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)', animationDuration: '0.2s' }}>

              {/* Header */}
              <div className="px-4 pt-4 pb-3 flex items-center justify-between"
                style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <div>
                  <h3 className="text-sm font-bold text-apple-text">Stock Alerts</h3>
                  <p className="text-[11px] text-apple-secondary mt-0.5">
                    {alerts.length === 0 ? 'All products well stocked ✅' : `${alerts.length} product${alerts.length > 1 ? 's' : ''} need attention`}
                  </p>
                </div>
                <button onClick={() => setNotifOpen(false)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-apple-bg transition-colors">
                  <X size={12} className="text-apple-secondary" />
                </button>
              </div>

              {/* Summary chips */}
              {alerts.length > 0 && (
                <div className="px-4 py-2.5 flex gap-2" style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                  {outCount > 0 && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                      style={{ background: 'rgba(255,69,58,0.08)', color: '#FF453A', border: '1px solid rgba(255,69,58,0.15)' }}>
                      <XCircle size={10} /> {outCount} Out of Stock
                    </span>
                  )}
                  {lowCount > 0 && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                      style={{ background: 'rgba(255,159,10,0.08)', color: '#FF9F0A', border: '1px solid rgba(255,159,10,0.15)' }}>
                      <AlertTriangle size={10} /> {lowCount} Low Stock
                    </span>
                  )}
                </div>
              )}

              {/* Alert list */}
              <div className="overflow-y-auto max-h-64">
                {alerts.length === 0 ? (
                  <div className="py-10 text-center">
                    <Package size={28} className="text-apple-border mx-auto mb-2" />
                    <p className="text-xs text-apple-secondary font-medium">No stock alerts right now</p>
                  </div>
                ) : (
                  alerts.slice(0, 8).map((item) => {
                    const isOut = item.total_stock <= 0
                    return (
                      <button key={item.product_id}
                        onClick={() => { navigate('/products?q=' + encodeURIComponent(item.product_sku)); setNotifOpen(false) }}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-apple-bg/60 transition-colors duration-150 text-left"
                        style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: isOut ? 'rgba(255,69,58,0.08)' : 'rgba(255,159,10,0.08)' }}>
                          {isOut
                            ? <XCircle size={15} style={{ color: '#FF453A' }} />
                            : <AlertTriangle size={15} style={{ color: '#FF9F0A' }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-apple-text truncate">{item.product_name}</p>
                          <p className="text-[11px] text-apple-secondary font-mono">{item.product_sku}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-black" style={{ color: isOut ? '#FF453A' : '#FF9F0A' }}>
                            {item.total_stock}
                          </p>
                          <p className="text-[10px] text-apple-secondary">/ {item.min_stock_qty} min</p>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>

              {/* Footer */}
              {alerts.length > 0 && (
                <div className="px-4 py-2.5" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <button
                    onClick={() => { navigate('/products?filter=low'); setNotifOpen(false) }}
                    className="w-full text-center text-[12px] font-semibold text-apple-blue hover:underline">
                    View all low-stock products →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-apple-border" />

        {/* Avatar + Logout */}
        <button
          onClick={() => { logout(); navigate('/login') }}
          className="flex items-center gap-2 px-2 py-1 rounded-xl transition-all duration-200 group"
          style={{ border: '1px solid transparent' }}
          title="Click to logout"
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,69,58,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,69,58,0.15)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black"
            style={{ background: 'linear-gradient(135deg,#0071E3,#5AC8FA)' }}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <span className="text-[12px] font-semibold text-apple-text hidden sm:block">{user?.name?.split(' ')[0] || 'User'}</span>
        </button>
      </div>
    </header>
  )
}
