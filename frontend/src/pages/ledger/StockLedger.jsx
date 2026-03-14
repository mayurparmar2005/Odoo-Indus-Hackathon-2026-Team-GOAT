import { useState } from 'react'
import { Download, Search, RefreshCw, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { stockApi } from '../../api/dashboardApi'

const TYPE_STYLES = {
  receipt:    { bg: '#E6F9EF', text: '#1A7A45' },
  delivery:   { bg: '#FFF0EF', text: '#C0392B' },
  transfer:   { bg: '#E8F0FE', text: '#1A5CCC' },
  adjustment: { bg: '#FFF3E0', text: '#B55309' },
}

export default function StockLedger() {
  const [search, setSearch]   = useState('')
  const [typeFilter, setType] = useState('')
  const [page, setPage]       = useState(1)
  const perPage = 50

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['stock-moves', page, typeFilter],
    queryFn: () => stockApi.moves({ page, per_page: perPage, move_type: typeFilter || undefined }).then(r => r.data),
    keepPreviousData: true,
  })

  const moves   = data?.moves  ?? []
  const total   = data?.total  ?? 0
  const pages   = data?.pages  ?? 1

  const filtered = moves.filter(m =>
    !search ||
    m.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.product_sku?.toLowerCase().includes(search.toLowerCase())
  )

  const exportCSV = () => {
    const headers = 'Date,Reference Type,Product,SKU,From,To,Qty,Created By\n'
    const rows = moves.map(m =>
      `${m.created_at},${m.move_type},${m.product_name},${m.product_sku},${m.from_location},${m.to_location},${m.quantity},${m.created_by_name}`
    ).join('\n')
    const blob = new Blob([headers + rows], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'stock_ledger.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Stock Ledger</h1>
          <p className="text-apple-secondary text-sm">{total} total moves — immutable audit trail</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="btn-secondary" disabled={isFetching}>
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''}/>
          </button>
          <button onClick={exportCSV} className="btn-secondary"><Download size={14}/> Export CSV</button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-secondary"/>
          <input type="search" placeholder="Search product…" value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9"/>
        </div>
        {['','receipt','delivery','transfer','adjustment'].map(t => (
          <button key={t} onClick={() => { setType(t); setPage(1) }}
            className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${typeFilter === t ? 'bg-apple-blue text-white' : 'bg-apple-bg text-apple-secondary hover:text-apple-text'}`}>
            {t || 'All Types'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-apple-blue"/></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Date & Time</th><th>Type</th><th>Product</th><th>SKU</th><th>From</th><th>To</th><th className="text-right">Qty</th><th>By</th></tr></thead>
                <tbody>
                  {filtered.map(m => {
                    const style = TYPE_STYLES[m.move_type] || TYPE_STYLES.adjustment
                    const isOut = m.move_type === 'delivery'
                    return (
                      <tr key={m.id}>
                        <td className="text-xs text-apple-secondary font-mono whitespace-nowrap">
                          {m.created_at ? new Date(m.created_at).toLocaleString('en-GB', { dateStyle:'short', timeStyle:'short' }) : '—'}
                        </td>
                        <td>
                          <span className="badge text-[10px] px-2 py-0.5 rounded-full font-bold capitalize"
                            style={{ background: style.bg, color: style.text }}>{m.move_type}</span>
                        </td>
                        <td className="text-apple-text font-medium">{m.product_name}</td>
                        <td className="font-mono text-xs text-apple-secondary">{m.product_sku}</td>
                        <td className="text-apple-secondary text-sm">{m.from_location}</td>
                        <td className="text-apple-secondary text-sm">{m.to_location}</td>
                        <td className={`text-right font-bold tabular-nums ${isOut ? 'text-apple-danger' : 'text-apple-success'}`}>
                          {isOut ? '-' : '+'}{m.quantity}
                        </td>
                        <td className="text-apple-secondary text-xs">{m.created_by_name || '—'}</td>
                      </tr>
                    )
                  })}
                  {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-12 text-apple-secondary">No stock moves yet</td></tr>}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-center gap-2 px-5 py-3" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="btn-secondary disabled:opacity-40">← Prev</button>
                <span className="text-xs text-apple-secondary font-medium">Page {page} of {pages}</span>
                <button onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page === pages} className="btn-secondary disabled:opacity-40">Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
