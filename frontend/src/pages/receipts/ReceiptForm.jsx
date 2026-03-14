import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { receiptsApi } from '../../api/operationsApi'
import { warehousesApi } from '../../api/dashboardApi'
import { productsApi } from '../../api/productsApi'

export default function ReceiptForm() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [form, setForm] = useState({ supplier_name: '', warehouse_id: '', scheduled_date: '', lines: [] })

  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: () => warehousesApi.list().then(r => r.data) })
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => productsApi.list().then(r => r.data) })

  const addLine = () => setForm({ ...form, lines: [...form.lines, { product_id: '', qty: 1 }] })
  const removeLine = (i) => setForm({ ...form, lines: form.lines.filter((_, idx) => idx !== i) })
  const setLine = (i, field, val) => {
    const lines = [...form.lines]
    lines[i] = { ...lines[i], [field]: val }
    setForm({ ...form, lines })
  }

  const mutation = useMutation({
    mutationFn: () => receiptsApi.create({ ...form, warehouse_id: parseInt(form.warehouse_id), lines: form.lines.map(l => ({ product_id: parseInt(l.product_id), qty: parseFloat(l.qty) })) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['receipts'] }); toast.success('Receipt created'); navigate('/receipts') },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create receipt'),
  })

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/receipts')} className="p-2 rounded-xl hover:bg-apple-bg text-apple-secondary transition-colors"><ArrowLeft size={18}/></button>
        <h1 className="page-title">New Receipt</h1>
      </div>
      <div className="card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="form-label">Supplier Name</label><input value={form.supplier_name} onChange={e => setForm({...form, supplier_name: e.target.value})} placeholder="Supplier / Vendor" className="input-field"/></div>
          <div><label className="form-label">Warehouse *</label>
            <select value={form.warehouse_id} onChange={e => setForm({...form, warehouse_id: e.target.value})} className="input-field">
              <option value="">Select Warehouse</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        </div>
        <div><label className="form-label">Scheduled Date</label><input type="date" value={form.scheduled_date} onChange={e => setForm({...form, scheduled_date: e.target.value})} className="input-field"/></div>

        {/* Product Lines */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="form-label mb-0">Product Lines</label>
            <button type="button" onClick={addLine} className="flex items-center gap-1 text-xs text-apple-blue font-semibold hover:underline"><Plus size={13}/> Add Line</button>
          </div>
          <div className="space-y-2">
            {form.lines.map((line, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-apple-bg">
                <select value={line.product_id} onChange={e => setLine(i, 'product_id', e.target.value)} className="input-field flex-1">
                  <option value="">Select Product</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
                <input type="number" min="0.001" step="any" value={line.qty} onChange={e => setLine(i, 'qty', e.target.value)} placeholder="Qty" className="input-field w-24"/>
                <button onClick={() => removeLine(i)} className="text-apple-danger hover:text-red-600 transition-colors p-1"><Trash2 size={14}/></button>
              </div>
            ))}
            {form.lines.length === 0 && <p className="text-apple-secondary text-sm text-center py-4">No lines added yet</p>}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={() => navigate('/receipts')} className="btn-secondary">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.warehouse_id || form.lines.length === 0} className="btn-primary disabled:opacity-50">
            {mutation.isPending ? <><Loader2 size={14} className="animate-spin"/> Creating…</> : 'Create Receipt'}
          </button>
        </div>
      </div>
    </div>
  )
}
