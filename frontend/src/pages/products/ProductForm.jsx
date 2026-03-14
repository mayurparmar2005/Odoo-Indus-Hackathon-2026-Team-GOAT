import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { productsApi } from '../../api/productsApi'

export default function ProductForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [form, setForm] = useState({
    name: '', sku: '', category_id: '', uom: 'pcs',
    min_stock_qty: 0, description: '',
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productsApi.listCategories().then(r => r.data),
  })

  // Load product for edit mode
  useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.get(id).then(r => r.data),
    enabled: isEdit,
    onSuccess: (data) => setForm({
      name: data.name, sku: data.sku,
      category_id: data.category_id || '',
      uom: data.uom, min_stock_qty: data.min_stock_qty,
      description: data.description || '',
    }),
  })

  const mutation = useMutation({
    mutationFn: (data) => {
      // Sanitize: convert empty strings → null for optional FK fields
      const payload = {
        ...data,
        category_id:   data.category_id   ? parseInt(data.category_id)   : null,
        min_stock_qty: parseFloat(data.min_stock_qty) || 0,
        description:   data.description   || null,
      }
      return isEdit ? productsApi.update(id, payload) : productsApi.create(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success(isEdit ? 'Product updated!' : 'Product created!')
      navigate('/products')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Save failed'),
  })

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  return (
    <div className="max-w-xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/products')} className="p-2 rounded-xl hover:bg-apple-bg text-apple-secondary transition-colors">
          <ArrowLeft size={18} />
        </button>
        <h1 className="page-title">{isEdit ? 'Edit Product' : 'New Product'}</h1>
      </div>

      <div className="card p-6 space-y-4">
        <div>
          <label className="form-label">Product Name *</label>
          <input value={form.name} onChange={set('name')} placeholder="e.g. Steel Rod 10mm" className="input-field" required />
        </div>
        <div>
          <label className="form-label">SKU *</label>
          <input value={form.sku} onChange={set('sku')} placeholder="e.g. SR-10MM" className="input-field font-mono" disabled={isEdit} />
          {isEdit && <p className="text-[11px] text-apple-secondary mt-1">SKU cannot be changed after creation</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Category</label>
            <select value={form.category_id} onChange={set('category_id')} className="input-field">
              <option value="">No Category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Unit of Measure</label>
            <select value={form.uom} onChange={set('uom')} className="input-field">
              {['pcs', 'kg', 'g', 'L', 'mL', 'm', 'cm', 'box', 'roll', 'unit'].map(u =>
                <option key={u} value={u}>{u}</option>
              )}
            </select>
          </div>
        </div>
        <div>
          <label className="form-label">Minimum Stock Quantity</label>
          <input type="number" min="0" value={form.min_stock_qty}
            onChange={(e) => setForm({ ...form, min_stock_qty: parseFloat(e.target.value) || 0 })}
            className="input-field" />
          <p className="text-[11px] text-apple-secondary mt-1">Low stock alert triggers below this quantity</p>
        </div>
        <div>
          <label className="form-label">Description</label>
          <textarea value={form.description} onChange={set('description')}
            rows={3} placeholder="Optional product description…" className="input-field resize-none" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={() => navigate('/products')} className="btn-secondary">Cancel</button>
          <button onClick={() => mutation.mutate(form)} disabled={mutation.isPending || !form.name || !form.sku} className="btn-primary disabled:opacity-50">
            {mutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save Product</>}
          </button>
        </div>
      </div>
    </div>
  )
}
