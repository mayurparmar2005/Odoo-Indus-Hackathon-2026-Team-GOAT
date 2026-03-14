import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, Package, Edit2, Eye, Loader2, AlertTriangle, XCircle, CheckCircle2, X, SlidersHorizontal } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { productsApi } from '../../api/productsApi'

// ── Stock badge helper ─────────────────────────────────────────────────────
function getStockBadge(stock, min) {
  if (stock <= 0) return <span className="badge badge-out">Out of Stock</span>
  if (stock <= min) return <span className="badge badge-low">Low Stock</span>
  return <span className="badge badge-done">In Stock</span>
}

// ── Smart filter chip ──────────────────────────────────────────────────────
function FilterChip({ label, count, active, color, icon: Icon, onClick }) {
  const colors = {
    blue:   { bg: 'rgba(0,113,227,0.1)',   border: 'rgba(0,113,227,0.3)',   text: '#0071E3' },
    red:    { bg: 'rgba(255,69,58,0.1)',   border: 'rgba(255,69,58,0.3)',   text: '#FF453A' },
    orange: { bg: 'rgba(255,159,10,0.1)',  border: 'rgba(255,159,10,0.3)',  text: '#FF9F0A' },
    green:  { bg: 'rgba(48,209,88,0.1)',   border: 'rgba(48,209,88,0.3)',   text: '#30D158' },
    gray:   { bg: 'rgba(0,0,0,0.05)',      border: 'rgba(0,0,0,0.12)',      text: '#8E8E93' },
  }
  const c = colors[color] || colors.gray
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
      style={{
        background: active ? c.bg : 'rgba(0,0,0,0.03)',
        border: `1px solid ${active ? c.border : 'rgba(0,0,0,0.08)'}`,
        color: active ? c.text : '#8E8E93',
        boxShadow: active ? `0 2px 8px ${c.bg}` : 'none',
      }}>
      {Icon && <Icon size={11} />}
      {label}
      {count !== undefined && (
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black"
          style={{ background: active ? c.text : 'rgba(0,0,0,0.08)', color: active ? 'white' : '#8E8E93' }}>
          {count}
        </span>
      )}
    </button>
  )
}

// ── Main Products Component ────────────────────────────────────────────────
export default function Products() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Read ?q= and ?filter= from URL (set by TopNav global search / notification bell)
  const urlQuery  = searchParams.get('q') || ''
  const urlFilter = searchParams.get('filter') || ''

  const [search,         setSearch]         = useState(urlQuery)
  const [statusFilter,   setStatusFilter]   = useState(urlFilter)  // '' | 'ok' | 'low' | 'out'
  const [categoryFilter, setCategoryFilter] = useState('')

  // Sync when URL params change (e.g. notification bell click)
  useEffect(() => { setSearch(urlQuery) },   [urlQuery])
  useEffect(() => { setStatusFilter(urlFilter) }, [urlFilter])

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list().then(r => r.data),
    refetchInterval: 30_000,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productsApi.listCategories().then(r => r.data),
  })

  // ── Derive filter counts ─────────────────────────────────────────────────
  const okCount  = products.filter(p => p.total_stock > p.min_stock_qty).length
  const lowCount = products.filter(p => p.total_stock > 0 && p.total_stock <= p.min_stock_qty).length
  const outCount = products.filter(p => p.total_stock <= 0).length

  // ── Apply filters ────────────────────────────────────────────────────────
  const filtered = products.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.category_name || '').toLowerCase().includes(q)
    const matchCat = !categoryFilter || String(p.category_id) === categoryFilter
    const matchStatus =
      !statusFilter || statusFilter === 'all' ? true :
      statusFilter === 'out' ? p.total_stock <= 0 :
      statusFilter === 'low' ? (p.total_stock > 0 && p.total_stock <= p.min_stock_qty) :
      statusFilter === 'ok'  ? p.total_stock > p.min_stock_qty : true
    return matchSearch && matchCat && matchStatus
  })

  // Clear all filters
  const clearAll = () => {
    setSearch('')
    setStatusFilter('')
    setCategoryFilter('')
    navigate('/products', { replace: true })
  }

  const hasFilters = search || statusFilter || categoryFilter

  // Highlight SKU match in search
  const highlight = (text) => {
    if (!search) return text
    const idx = text.toLowerCase().indexOf(search.toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark className="rounded px-0.5" style={{ background: 'rgba(0,113,227,0.15)', color: '#0071E3' }}>
          {text.slice(idx, idx + search.length)}
        </mark>
        {text.slice(idx + search.length)}
      </>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="text-apple-secondary text-sm mt-0.5">
            {isLoading ? 'Loading…' : `${filtered.length} of ${products.length} products`}
          </p>
        </div>
        <Link to="/products/new" className="btn-primary">
          <Plus size={16} /> New Product
        </Link>
      </div>

      {/* Smart filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        <SlidersHorizontal size={13} className="text-apple-secondary" />
        <FilterChip label="All" count={products.length} active={!statusFilter || statusFilter === 'all'} color="blue"
          onClick={() => { setStatusFilter(''); navigate('/products', { replace: true }) }} />
        <FilterChip label="In Stock" count={okCount} active={statusFilter === 'ok'} color="green" icon={CheckCircle2}
          onClick={() => setStatusFilter(statusFilter === 'ok' ? '' : 'ok')} />
        <FilterChip label="Low Stock" count={lowCount} active={statusFilter === 'low'} color="orange" icon={AlertTriangle}
          onClick={() => setStatusFilter(statusFilter === 'low' ? '' : 'low')} />
        <FilterChip label="Out of Stock" count={outCount} active={statusFilter === 'out'} color="red" icon={XCircle}
          onClick={() => setStatusFilter(statusFilter === 'out' ? '' : 'out')} />

        {hasFilters && (
          <button onClick={clearAll}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-apple-secondary hover:text-apple-danger transition-colors ml-auto"
            style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
            <X size={10} /> Clear all
          </button>
        )}
      </div>

      {/* Search + Category row */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-secondary" />
          <input
            type="search"
            placeholder="Search by name, SKU, or category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 pr-8"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-apple-secondary hover:text-apple-danger transition-colors">
              <X size={13} />
            </button>
          )}
        </div>
        {/* Category dropdown */}
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="input-field w-48">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {/* Result count hint */}
        {hasFilters && (
          <span className="text-xs text-apple-secondary font-medium">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Active filter tags (visual) */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2 -mt-2">
          {search && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
              style={{ background: 'rgba(0,113,227,0.08)', color: '#0071E3', border: '1px solid rgba(0,113,227,0.2)' }}>
              <Search size={9} /> "{search}"
              <button onClick={() => setSearch('')}><X size={9} /></button>
            </span>
          )}
          {statusFilter && statusFilter !== 'all' && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
              style={{
                background: statusFilter === 'out' ? 'rgba(255,69,58,0.08)' : statusFilter === 'low' ? 'rgba(255,159,10,0.08)' : 'rgba(48,209,88,0.08)',
                color: statusFilter === 'out' ? '#FF453A' : statusFilter === 'low' ? '#FF9F0A' : '#30D158',
                border: `1px solid ${statusFilter === 'out' ? 'rgba(255,69,58,0.2)' : statusFilter === 'low' ? 'rgba(255,159,10,0.2)' : 'rgba(48,209,88,0.2)'}`,
              }}>
              {statusFilter === 'out' ? 'Out of Stock' : statusFilter === 'low' ? 'Low Stock' : 'In Stock'}
              <button onClick={() => setStatusFilter('')}><X size={9} /></button>
            </span>
          )}
          {categoryFilter && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
              style={{ background: 'rgba(0,0,0,0.05)', color: '#636366', border: '1px solid rgba(0,0,0,0.1)' }}>
              {categories.find(c => String(c.id) === categoryFilter)?.name || 'Category'}
              <button onClick={() => setCategoryFilter('')}><X size={9} /></button>
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-apple-blue" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-apple-danger text-sm">
            Failed to load products. Check that the backend is running.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th><th>Product Name</th><th>Category</th>
                  <th>UOM</th><th>Stock</th><th>Min Stock</th>
                  <th>Status</th><th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className={p.total_stock <= 0 ? 'bg-red-50/30' : p.total_stock <= p.min_stock_qty ? 'bg-orange-50/30' : ''}>
                    <td className="font-mono text-xs text-apple-secondary">{highlight(p.sku)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{
                            background: p.total_stock <= 0 ? 'rgba(255,69,58,0.08)' :
                              p.total_stock <= p.min_stock_qty ? 'rgba(255,159,10,0.08)' : 'rgba(0,0,0,0.04)'
                          }}>
                          <Package size={13}
                            style={{ color: p.total_stock <= 0 ? '#FF453A' : p.total_stock <= p.min_stock_qty ? '#FF9F0A' : '#8E8E93' }} />
                        </div>
                        <span className="font-medium text-apple-text">{highlight(p.name)}</span>
                      </div>
                    </td>
                    <td className="text-apple-secondary">{highlight(p.category_name || '—')}</td>
                    <td className="text-apple-secondary">{p.uom}</td>
                    <td>
                      <span className={`font-semibold ${p.total_stock <= 0 ? 'text-apple-danger' : p.total_stock <= p.min_stock_qty ? 'text-apple-warning' : 'text-apple-success'}`}>
                        {p.total_stock ?? 0}
                      </span>
                    </td>
                    <td className="text-apple-secondary">{p.min_stock_qty}</td>
                    <td>{getStockBadge(p.total_stock ?? 0, p.min_stock_qty)}</td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/products/${p.id}`}
                          className="p-1.5 rounded-lg hover:bg-apple-bg text-apple-secondary hover:text-apple-blue transition-colors">
                          <Eye size={14} />
                        </Link>
                        <Link to={`/products/${p.id}/edit`}
                          className="p-1.5 rounded-lg hover:bg-apple-bg text-apple-secondary hover:text-apple-blue transition-colors">
                          <Edit2 size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={8} className="text-center py-14">
                      <Package size={32} className="text-apple-border mx-auto mb-3" />
                      <p className="text-apple-secondary text-sm font-medium">
                        {hasFilters ? 'No products match your filters' : 'No products yet — create your first product'}
                      </p>
                      {hasFilters && (
                        <button onClick={clearAll} className="mt-2 text-apple-blue text-xs font-semibold hover:underline">
                          Clear all filters
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
