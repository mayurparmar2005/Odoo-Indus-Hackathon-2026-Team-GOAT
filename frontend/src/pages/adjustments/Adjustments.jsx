import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Loader2, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { adjustmentsApi } from '../../api/operationsApi'
import { stockApi } from '../../api/dashboardApi'
import { productsApi } from '../../api/productsApi'
import { warehousesApi } from '../../api/dashboardApi'

export default function Adjustments() {
  const [selectedProduct, setSelectedProduct] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('')
  const [countedQty, setCountedQty] = useState('')
  const [reason, setReason] = useState('')
  const [search, setSearch] = useState('')
  const qc = useQueryClient()

  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => productsApi.list().then(r => r.data) })
  const { data: locations = [] } = useQuery({ queryKey: ['all-locations'], queryFn: () => warehousesApi.allLocations().then(r => r.data) })
  const { data: history = [] } = useQuery({ queryKey: ['adjustments'], queryFn: () => adjustmentsApi.list().then(r => r.data), refetchInterval: 10000 })

  // Live quant for selected product+location
  const { data: quantData } = useQuery({
    queryKey: ['quant', selectedProduct, selectedLocation],
    queryFn: () => stockApi.quants({ product_id: selectedProduct, location_id: selectedLocation }).then(r => r.data),
    enabled: Boolean(selectedProduct && selectedLocation),
  })
  const systemQty = quantData?.[0]?.quantity ?? 0
  const diff = countedQty !== '' ? parseFloat(countedQty) - systemQty : null

  const mutation = useMutation({
    mutationFn: () => adjustmentsApi.create({
      product_id: parseInt(selectedProduct),
      location_id: parseInt(selectedLocation),
      counted_qty: parseFloat(countedQty),
      reason,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adjustments'] })
      qc.invalidateQueries({ queryKey: ['quant'] })
      qc.invalidateQueries({ queryKey: ['dashboard-kpis'] })
      toast.success('Adjustment applied!')
      setCountedQty(''); setReason(''); setSelectedProduct(''); setSelectedLocation('')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Adjustment failed'),
  })

  const filteredHistory = history.filter(a =>
    !search || a.product_name?.toLowerCase().includes(search.toLowerCase()) || a.reference?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5 animate-fade-in">
      <div><h1 className="page-title">Stock Adjustments</h1><p className="text-apple-secondary text-sm">Correct inventory discrepancies</p></div>

      {/* Adjustment Panel */}
      <div className="card p-5">
        <h2 className="text-sm font-bold text-apple-text mb-4">New Adjustment</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Product *</label>
            <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} className="input-field">
              <option value="">Select Product</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Location *</label>
            <select value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)} className="input-field">
              <option value="">Select Location</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.warehouse_name} / {l.name}</option>)}
            </select>
          </div>
        </div>

        {/* System vs Counted */}
        {selectedProduct && selectedLocation && (
          <div className="mt-4 grid grid-cols-3 gap-4 p-4 rounded-xl" style={{ background: 'rgba(0,113,227,0.04)', border: '1px solid rgba(0,113,227,0.1)' }}>
            <div className="text-center">
              <p className="text-xs text-apple-secondary font-medium mb-1">System Qty</p>
              <p className="text-2xl font-black text-apple-text">{systemQty}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-apple-secondary font-medium mb-1">Counted Qty</p>
              <input type="number" min="0" step="any" value={countedQty} onChange={e => setCountedQty(e.target.value)}
                placeholder="0" className="input-field text-center text-xl font-black"/>
            </div>
            <div className="text-center">
              <p className="text-xs text-apple-secondary font-medium mb-1">Difference</p>
              <p className={`text-2xl font-black ${diff === null ? 'text-apple-secondary' : diff > 0 ? 'text-apple-success' : diff < 0 ? 'text-apple-danger' : 'text-apple-text'}`}>
                {diff === null ? '—' : diff > 0 ? `+${diff}` : diff}
              </p>
            </div>
          </div>
        )}

        {diff !== null && diff !== 0 && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="form-label">Reason for adjustment</label>
              <input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Physical count revealed damage" className="input-field"/>
            </div>
            <div className="flex justify-end">
              <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
                className="btn-primary disabled:opacity-50">
                {mutation.isPending ? <><Loader2 size={14} className="animate-spin"/> Applying…</> : <><CheckCircle size={14}/> Apply Adjustment</>}
              </button>
            </div>
          </div>
        )}
        {diff === 0 && <p className="mt-3 text-sm text-apple-success text-center font-medium">Stock matches — no adjustment needed</p>}
      </div>

      {/* History */}
      <div className="card overflow-hidden">
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <h2 className="text-sm font-bold text-apple-text">Adjustment History</h2>
          <div className="relative w-56">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-secondary"/>
            <input type="search" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9 text-xs"/>
          </div>
        </div>
        <table className="data-table">
          <thead><tr><th>Reference</th><th>Product</th><th>Location</th><th>System</th><th>Counted</th><th>Diff</th><th>Reason</th><th>By</th></tr></thead>
          <tbody>
            {filteredHistory.map(a => (
              <tr key={a.id}>
                <td className="font-mono text-xs text-apple-blue font-semibold">{a.reference}</td>
                <td className="text-apple-text">{a.product_name}</td>
                <td className="text-apple-secondary">{a.location_name}</td>
                <td className="text-apple-secondary tabular-nums">{a.system_qty}</td>
                <td className="tabular-nums">{a.counted_qty}</td>
                <td className={`font-bold tabular-nums ${a.difference > 0 ? 'text-apple-success' : a.difference < 0 ? 'text-apple-danger' : 'text-apple-text'}`}>
                  {a.difference > 0 ? `+${a.difference}` : a.difference}
                </td>
                <td className="text-apple-secondary text-xs">{a.reason || '—'}</td>
                <td className="text-apple-secondary text-xs">{a.created_by_name}</td>
              </tr>
            ))}
            {filteredHistory.length === 0 && <tr><td colSpan={8} className="text-center py-10 text-apple-secondary">No adjustments yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
