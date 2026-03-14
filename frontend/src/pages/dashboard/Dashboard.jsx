import { 
  Package, AlertTriangle, XCircle, ArrowDownToLine,
  ArrowUpFromLine, ArrowLeftRight, TrendingUp, Sparkles, Activity
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../../api/dashboardApi'

const KPI_CONFIG = [
  { key: 'total_products',    label: 'Total Products',      icon: Package,         cardClass: 'kpi-blue',   iconColor: '#0071E3', iconBg: 'rgba(0,113,227,0.12)'  },
  { key: 'low_stock',         label: 'Low Stock',           icon: AlertTriangle,   cardClass: 'kpi-orange', iconColor: '#FF9F0A', iconBg: 'rgba(255,159,10,0.12)' },
  { key: 'out_of_stock',      label: 'Out of Stock',        icon: XCircle,         cardClass: 'kpi-red',    iconColor: '#FF453A', iconBg: 'rgba(255,69,58,0.10)'  },
  { key: 'pending_receipts',  label: 'Pending Receipts',    icon: ArrowDownToLine, cardClass: 'kpi-purple', iconColor: '#BF5AF2', iconBg: 'rgba(191,90,242,0.10)' },
  { key: 'pending_deliveries',label: 'Pending Deliveries',  icon: ArrowUpFromLine, cardClass: 'kpi-pink',   iconColor: '#FF2D78', iconBg: 'rgba(255,45,120,0.10)' },
  { key: 'pending_transfers', label: 'Pending Transfers',   icon: ArrowLeftRight,  cardClass: 'kpi-teal',   iconColor: '#32D74B', iconBg: 'rgba(50,215,75,0.10)'  },
]

const TYPE_COLORS = {
  receipt:    { bg: '#E6F9EF', text: '#1A7A45', dot: '#30D158' },
  delivery:   { bg: '#FFF0EF', text: '#C0392B', dot: '#FF453A' },
  transfer:   { bg: '#E8F0FE', text: '#1A5CCC', dot: '#0071E3' },
  adjustment: { bg: '#FFF3E0', text: '#B55309', dot: '#FF9F0A' },
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-apple p-3 text-sm" style={{ background: '#1C1C1E', border: '1px solid rgba(255,255,255,0.1)', minWidth: 120 }}>
      <p className="text-white/50 text-xs mb-2 font-medium">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white text-xs">{p.name}: <strong>{p.value}</strong></span>
        </div>
      ))}
    </div>
  )
}

function KpiSkeleton() {
  return (
    <div className="kpi-blue rounded-apple-lg p-5 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-white/30 mb-3" />
      <div className="h-8 w-16 bg-white/30 rounded mb-2" />
      <div className="h-3 w-24 bg-white/20 rounded" />
    </div>
  )
}

export default function Dashboard() {
  const today = new Date().toLocaleDateString('en-GB', { weekday:'long', year:'numeric', month:'long', day:'numeric' })

  const { data: kpiData, isLoading: kpiLoading } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: () => dashboardApi.kpis().then(r => r.data),
    refetchInterval: 30000, // refresh every 30s
  })

  const { data: chartData = [] } = useQuery({
    queryKey: ['dashboard-chart'],
    queryFn: () => dashboardApi.chart().then(r => r.data),
    refetchInterval: 60000,
  })

  const { data: alerts = [] } = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: () => dashboardApi.alerts().then(r => r.data),
  })

  const { data: recentMoves = [] } = useQuery({
    queryKey: ['dashboard-recent-moves'],
    queryFn: () => dashboardApi.recentMoves().then(r => r.data),
    refetchInterval: 15000,
  })

  // Format chart data: API returns { day, in, out }, recharts expects same
  const formattedChart = chartData.map(d => ({
    day: new Date(d.day).toLocaleDateString('en-US', { weekday: 'short' }),
    in: d.in, out: d.out
  }))

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="page-title">Dashboard</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ background: 'rgba(0,113,227,0.1)', color: '#0071E3', border: '1px solid rgba(0,113,227,0.2)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-apple-blue animate-pulse" />
              Live
            </span>
          </div>
          <p className="text-apple-secondary text-sm">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-apple-secondary" />
          <span className="text-xs text-apple-secondary font-medium">Real-time data</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        {KPI_CONFIG.map(({ key, label, icon: Icon, cardClass, iconColor, iconBg }, i) => (
          kpiLoading ? (
            <KpiSkeleton key={key} />
          ) : (
            <div key={key} className={`kpi-card ${cardClass} animate-slide-up`}
              style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: iconBg }}>
                  <Icon size={18} style={{ color: iconColor }} />
                </div>
                <TrendingUp size={13} className="text-apple-success mt-1 opacity-60" />
              </div>
              <p className="text-3xl font-bold tracking-tight"
                style={{ color: iconColor, animationDelay: `${i * 60 + 200}ms`, animationFillMode: 'both' }}>
                {kpiData?.[key] ?? '—'}
              </p>
              <p className="text-apple-text text-xs font-semibold mt-0.5">{label}</p>
            </div>
          )
        ))}
      </div>

      {/* Chart + Alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="card xl:col-span-2 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-apple-text">Stock Movement</h2>
              <p className="text-xs text-apple-secondary mt-0.5">Last 7 days — IN vs OUT quantities</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-apple-success font-medium">
                <span className="w-2 h-2 rounded-full bg-apple-success" /> Stock In
              </span>
              <span className="flex items-center gap-1.5 text-apple-danger font-medium">
                <span className="w-2 h-2 rounded-full bg-apple-danger" /> Stock Out
              </span>
            </div>
          </div>
          {formattedChart.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-apple-secondary text-sm">
              No movement data yet — validate a receipt or delivery to see data here.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={formattedChart} barGap={4} barSize={14}>
                <defs>
                  <linearGradient id="inGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#30D158" /><stop offset="100%" stopColor="#1FA040" />
                  </linearGradient>
                  <linearGradient id="outGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF453A" /><stop offset="100%" stopColor="#C0392B" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="#F0F0F0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#8E8E93', fontWeight: 500 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#8E8E93' }} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 6 }} />
                <Bar dataKey="in" name="Stock In" fill="url(#inGrad)" radius={[5,5,0,0]} />
                <Bar dataKey="out" name="Stock Out" fill="url(#outGrad)" radius={[5,5,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Alerts */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-apple-text flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-apple-danger animate-pulse" />
              Low Stock Alerts
            </h2>
            <span className="badge badge-out text-[10px]">{alerts.length} items</span>
          </div>
          {alerts.length === 0 ? (
            <div className="py-8 text-center text-apple-secondary text-xs">
              All products are adequately stocked
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 5).map((item) => {
                const pct = item.min_stock_qty > 0
                  ? Math.min(100, Math.round((item.total_stock / item.min_stock_qty) * 100))
                  : 0
                return (
                  <div key={item.product_id} className="p-3 rounded-apple"
                    style={{ background: 'rgba(255,69,58,0.04)', border: '1px solid rgba(255,69,58,0.1)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-xs font-bold text-apple-text">{item.product_name}</p>
                        <p className="text-[10px] text-apple-secondary font-mono">{item.product_sku}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-apple-danger">{item.total_stock}</span>
                        <p className="text-[10px] text-apple-secondary">/ {item.min_stock_qty} min</p>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,69,58,0.1)' }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: pct < 10 ? '#FF453A' : '#FF9F0A' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Moves */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <div>
            <h2 className="text-sm font-bold text-apple-text">Recent Stock Moves</h2>
            <p className="text-xs text-apple-secondary mt-0.5">Latest inventory activity</p>
          </div>
          <Sparkles size={14} className="text-apple-secondary" />
        </div>
        {recentMoves.length === 0 ? (
          <div className="py-10 text-center text-apple-secondary text-sm">
            No stock moves yet — validate a receipt to see activity here.
          </div>
        ) : (
          <div className="divide-y divide-apple-border/30">
            {recentMoves.slice(0, 10).map((move, i) => {
              const colors = TYPE_COLORS[move.move_type] || TYPE_COLORS.adjustment
              const isOut = ['delivery'].includes(move.move_type)
              return (
                <div key={move.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-apple-bg/60 transition-colors duration-150 animate-fade-in"
                  style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: colors.bg }}>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: colors.dot }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-apple-text truncate">{move.product_name}</p>
                    <p className="text-[11px] text-apple-secondary font-mono">{move.from_location} → {move.to_location}</p>
                  </div>
                  <span className="badge text-[10px] capitalize px-2 py-0.5 rounded-full font-bold whitespace-nowrap"
                    style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.dot}30` }}>
                    {move.move_type}
                  </span>
                  <span className={`text-sm font-black w-14 text-right tabular-nums ${isOut ? 'text-apple-danger' : 'text-apple-success'}`}>
                    {isOut ? '-' : '+'}{move.quantity}
                  </span>
                  <span className="text-[11px] text-apple-secondary w-20 text-right font-medium">
                    {new Date(move.created_at).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
