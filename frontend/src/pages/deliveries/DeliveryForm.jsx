import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { deliveriesApi } from '../../api/operationsApi'
import { warehousesApi } from '../../api/dashboardApi'
import { productsApi } from '../../api/productsApi'

export default function DeliveryForm() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [form, setForm] = useState({
    customer_name: '', warehouse_id: '', scheduled_date: '', lines: []
  })

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.list().then(r => r.data),
  })
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list().then(r => r.data),
  })

  const addLine = () => setForm({ ...form, lines: [...form.lines, { product_id: '', qty: 1 }] })
  const removeLine = (i) => setForm({ ...form, lines: form.lines.filter((_, idx) => idx !== i) })
  const setLine = (i, field, val) => {
    const lines = [...form.lines]
    lines[i] = { ...lines[i], [field]: val }
    setForm({ ...form, lines })
  }

  const mutation = useMutation({
    mutationFn: () => deliveriesApi.create({
      ...form,
      warehouse_id: parseInt(form.warehouse_id),
      lines: form.lines.map(l => ({
        product_id: parseInt(l.product_id),
        qty: parseFloat(l.qty),
      })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deliveries'] })
      toast.success('Delivery order created!')
      navigate('/deliveries')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create delivery'),
  })

  const selectedProducts = form.lines.map(l => parseInt(l.product_id)).filter(Boolean)

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/deliveries')}
          className="p-2 rounded-xl hover:bg-apple-bg text-apple-secondary transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="page-title">New Delivery Order</h1>
          <p className="text-apple-secondary text-xs mt-0.5">Outgoing stock — validates against available inventory</p>
        </div>
      </div>

      <div className="card p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Customer / Recipient</label>
            <input value={form.customer_name}
              onChange={e => setForm({ ...form, customer_name: e.target.value })}
              placeholder="Customer name or order ref" className="input-field" />
          </div>
          <div>
            <label className="form-label">Warehouse *</label>
            <select value={form.warehouse_id}
              onChange={e => setForm({ ...form, warehouse_id: e.target.value })}
              className="input-field">
              <option value="">Select Warehouse</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="form-label">Scheduled Delivery Date</label>
          <input type="date" value={form.scheduled_date}
            onChange={e => setForm({ ...form, scheduled_date: e.target.value })}
            className="input-field" />
        </div>

        {/* Product Lines */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="form-label mb-0">Products to Deliver *</label>
            <button type="button" onClick={addLine}
              className="flex items-center gap-1 text-xs text-apple-blue font-semibold hover:underline">
              <Plus size={13} /> Add Line
            </button>
          </div>
          <div className="space-y-2">
            {form.lines.map((line, i) => {
              const product = products.find(p => p.id === parseInt(line.product_id))
              const availableStock = product?.total_stock ?? null
              const isLow = availableStock !== null && parseFloat(line.qty) > availableStock
              return (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${isLow ? 'bg-red-50 border border-red-200' : 'bg-apple-bg'}`}>
                  <select value={line.product_id}
                    onChange={e => setLine(i, 'product_id', e.target.value)}
                    className="input-field flex-1">
                    <option value="">Select Product</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id} disabled={selectedProducts.includes(p.id) && p.id !== parseInt(line.product_id)}>
                        {p.name} — {p.total_stock ?? 0} {p.uom} available
                      </option>
                    ))}
                  </select>
                  <div className="relative">
                    <input type="number" min="0.001" step="any" value={line.qty}
                      onChange={e => setLine(i, 'qty', e.target.value)}
                      placeholder="Qty" className={`input-field w-24 ${isLow ? 'border-red-300 focus:ring-red-200' : ''}`} />
                    {isLow && (
                      <div className="absolute -bottom-5 left-0 text-[10px] text-red-500 font-medium whitespace-nowrap">
                        Only {availableStock} in stock
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
              <div className="text-center py-6 rounded-xl border-2 border-dashed border-apple-border text-apple-secondary text-sm">
                Click "Add Line" to add products to this delivery
              </div>
            )}
          </div>
        </div>

        {/* Info box */}
        {form.lines.length > 0 && (
          <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(0,113,227,0.06)', border: '1px solid rgba(0,113,227,0.15)' }}>
            <span className="font-semibold text-apple-blue">Note:</span>
            <span className="text-apple-secondary ml-1">Stock will be deducted when you validate this delivery order. Stock shortages will be highlighted in red.</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={() => navigate('/deliveries')} className="btn-secondary">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.warehouse_id || form.lines.length === 0 || form.lines.some(l => !l.product_id)}
            className="btn-primary disabled:opacity-50">
            {mutation.isPending
              ? <><Loader2 size={14} className="animate-spin" /> Creating…</>
              : 'Create Delivery Order'}
          </button>
        </div>
      </div>
    </div>
  )
}
