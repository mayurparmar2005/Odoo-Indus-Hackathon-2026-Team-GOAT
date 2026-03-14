import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Loader2, ArrowRight } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { transfersApi } from '../../api/operationsApi'
import { warehousesApi } from '../../api/dashboardApi'
import { productsApi } from '../../api/productsApi'
import { stockApi } from '../../api/dashboardApi'

export default function TransferForm() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [form, setForm] = useState({
    from_location_id: '', to_location_id: '', lines: []
  })

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.list().then(r => r.data),
  })
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list().then(r => r.data),
  })

  // Flatten all locations from all warehouses
  const allLocations = warehouses.flatMap(wh =>
    (wh.locations || []).map(loc => ({ ...loc, warehouse_name: wh.name, warehouse_code: wh.code }))
  )

  // Get available stock for selected from_location
  const { data: fromQuants = [] } = useQuery({
    queryKey: ['quants-from', form.from_location_id],
    queryFn: () => stockApi.quants({ location_id: form.from_location_id }).then(r => r.data),
    enabled: Boolean(form.from_location_id),
  })

  const getAvailableQty = (productId) => {
    const q = fromQuants.find(q => q.product_id === parseInt(productId))
    return q ? q.available_qty : 0
  }

  const fromLocation = allLocations.find(l => l.id === parseInt(form.from_location_id))
  const toLocations  = allLocations.filter(l => l.id !== parseInt(form.from_location_id))

  const addLine = () => setForm({ ...form, lines: [...form.lines, { product_id: '', qty: 1 }] })
  const removeLine = (i) => setForm({ ...form, lines: form.lines.filter((_, idx) => idx !== i) })
  const setLine = (i, field, val) => {
    const lines = [...form.lines]
    lines[i] = { ...lines[i], [field]: val }
    setForm({ ...form, lines })
  }

  const mutation = useMutation({
    mutationFn: () => transfersApi.create({
      from_location_id: parseInt(form.from_location_id),
      to_location_id:   parseInt(form.to_location_id),
      lines: form.lines.map(l => ({
        product_id: parseInt(l.product_id),
        quantity:   parseFloat(l.qty),
      })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transfers'] })
      toast.success('Transfer created!')
      navigate('/transfers')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create transfer'),
  })

  const isValid = form.from_location_id && form.to_location_id &&
    form.from_location_id !== form.to_location_id &&
    form.lines.length > 0 && form.lines.every(l => l.product_id && l.qty > 0)

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/transfers')}
          className="p-2 rounded-xl hover:bg-apple-bg text-apple-secondary transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="page-title">New Transfer</h1>
          <p className="text-apple-secondary text-xs mt-0.5">Move stock between locations atomically</p>
        </div>
      </div>

      <div className="card p-6 space-y-5">
        {/* Location Selector */}
        <div className="grid grid-cols-[1fr,auto,1fr] items-end gap-3">
          <div>
            <label className="form-label">From Location *</label>
            <select value={form.from_location_id}
              onChange={e => setForm({ ...form, from_location_id: e.target.value, lines: [] })}
              className="input-field">
              <option value="">Select source location</option>
              {warehouses.map(wh => (
                <optgroup key={wh.id} label={`${wh.name} (${wh.code})`}>
                  {(wh.locations || []).map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-center pb-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,113,227,0.1)' }}>
              <ArrowRight size={14} style={{ color: '#0071E3' }} />
            </div>
          </div>
          <div>
            <label className="form-label">To Location *</label>
            <select value={form.to_location_id}
              onChange={e => setForm({ ...form, to_location_id: e.target.value })}
              className="input-field"
              disabled={!form.from_location_id}>
              <option value="">Select destination</option>
              {toLocations.map(loc => (
                <option key={loc.id} value={loc.id}>
                  {loc.warehouse_name} / {loc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {form.from_location_id && fromLocation && (
          <div className="text-xs text-apple-secondary px-1">
            Moving from: <span className="font-semibold text-apple-text">{fromLocation.warehouse_name} → {fromLocation.name}</span>
          </div>
        )}

        {/* Product Lines */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="form-label mb-0">Products to Transfer *</label>
            <button type="button" onClick={addLine}
              disabled={!form.from_location_id}
              className="flex items-center gap-1 text-xs text-apple-blue font-semibold hover:underline disabled:opacity-40 disabled:cursor-not-allowed">
              <Plus size={13} /> Add Line
            </button>
          </div>

          {!form.from_location_id ? (
            <div className="text-center py-6 rounded-xl border-2 border-dashed border-apple-border text-apple-secondary text-sm">
              Select a source location first
            </div>
          ) : (
            <div className="space-y-2">
              {form.lines.map((line, i) => {
                const avail = getAvailableQty(line.product_id)
                const isOver = line.product_id && parseFloat(line.qty) > avail
                return (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${isOver ? 'bg-red-50 border border-red-200' : 'bg-apple-bg'}`}>
                    <select value={line.product_id}
                      onChange={e => setLine(i, 'product_id', e.target.value)}
                      className="input-field flex-1">
                      <option value="">Select Product</option>
                      {products
                        .filter(p => fromQuants.length === 0 || fromQuants.some(q => q.product_id === p.id && q.quantity > 0))
                        .map(p => {
                          const q = fromQuants.find(q => q.product_id === p.id)
                          const qty = q ? q.available_qty : 0
                          return (
                            <option key={p.id} value={p.id}>
                              {p.name} — {qty} {p.uom} available
                            </option>
                          )
                        })}
                    </select>
                    <div className="relative">
                      <input type="number" min="0.001" step="any" value={line.qty}
                        onChange={e => setLine(i, 'qty', e.target.value)}
                        placeholder="Qty"
                        className={`input-field w-24 ${isOver ? 'border-red-300' : ''}`} />
                      {isOver && (
                        <div className="absolute -bottom-5 left-0 text-[10px] text-red-500 font-medium whitespace-nowrap">
                          Max: {avail}
                        </div>
                      )}
                    </div>
                    <button onClick={() => removeLine(i)}
                      className="text-apple-danger hover:text-red-600 transition-colors p-1 flex-shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )
              })}
              {form.lines.length === 0 && (
                <div className="text-center py-5 rounded-xl border-2 border-dashed border-apple-border text-apple-secondary text-sm">
                  Click "Add Line" to add products
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={() => navigate('/transfers')} className="btn-secondary">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !isValid}
            className="btn-primary disabled:opacity-50">
            {mutation.isPending
              ? <><Loader2 size={14} className="animate-spin" /> Creating…</>
              : 'Create Transfer'}
          </button>
        </div>
      </div>
    </div>
  )
}
