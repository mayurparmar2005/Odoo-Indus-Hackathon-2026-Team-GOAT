import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Edit, Loader2, Package, TrendingUp, AlertTriangle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { productsApi } from '../../api/productsApi'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.get(id).then(r => r.data),
  })

  if (isLoading) return <div className="flex items-center justify-center py-24"><Loader2 size={24} className="animate-spin text-apple-blue"/></div>
  if (!product) return <div className="text-center py-16 text-apple-secondary">Product not found.</div>

  const isLowStock = product.total_stock !== undefined && product.total_stock < product.min_stock_qty
  const stockColor = product.total_stock === 0 ? 'text-apple-danger' : isLowStock ? 'text-apple-warning' : 'text-apple-success'

  return (
    <div className="max-w-xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/products')}
          className="p-2 rounded-xl hover:bg-apple-bg text-apple-secondary transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="page-title">{product.name}</h1>
          <p className="text-apple-secondary text-xs mt-0.5 font-mono">{product.sku}</p>
        </div>
        <Link to={`/products/${id}/edit`} className="btn-secondary">
          <Edit size={14} /> Edit
        </Link>
      </div>

      <div className="space-y-4">
        {/* Stock summary KPI row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4 text-center">
            <p className="text-xs text-apple-secondary font-medium mb-1">Total Stock</p>
            <p className={`text-3xl font-black ${stockColor}`}>{product.total_stock ?? 0}</p>
            <p className="text-xs text-apple-secondary mt-1">{product.uom}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs text-apple-secondary font-medium mb-1">Min Stock</p>
            <p className="text-3xl font-black text-apple-text">{product.min_stock_qty}</p>
            <p className="text-xs text-apple-secondary mt-1">{product.uom}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs text-apple-secondary font-medium mb-1">Status</p>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              {product.total_stock === 0 ? (
                <><AlertTriangle size={16} className="text-apple-danger"/><span className="text-xs font-bold text-apple-danger">Out of Stock</span></>
              ) : isLowStock ? (
                <><AlertTriangle size={16} className="text-apple-warning"/><span className="text-xs font-bold text-apple-warning">Low Stock</span></>
              ) : (
                <><TrendingUp size={16} className="text-apple-success"/><span className="text-xs font-bold text-apple-success">In Stock</span></>
              )}
            </div>
          </div>
        </div>

        {/* Details card */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-3 pb-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,113,227,0.1)' }}>
              <Package size={18} style={{ color: '#0071E3' }} />
            </div>
            <div>
              <p className="font-bold text-apple-text">{product.name}</p>
              <p className="text-xs text-apple-secondary">{product.category_name || 'No Category'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="form-label">SKU</p><p className="font-mono text-apple-text">{product.sku}</p></div>
            <div><p className="form-label">Unit</p><p className="text-apple-text">{product.uom}</p></div>
            <div><p className="form-label">Category</p><p className="text-apple-text">{product.category_name || '—'}</p></div>
            <div><p className="form-label">Status</p><span className={`badge ${product.is_active ? 'badge-done' : 'badge-cancelled'}`}>{product.is_active ? 'Active' : 'Inactive'}</span></div>
          </div>
          {product.description && (
            <div>
              <p className="form-label">Description</p>
              <p className="text-sm text-apple-text leading-relaxed">{product.description}</p>
            </div>
          )}
        </div>

        {/* Stock per location */}
        {product.stock_quants && product.stock_quants.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <p className="text-sm font-bold text-apple-text">Stock by Location</p>
            </div>
            <table className="data-table">
              <thead><tr><th>Location</th><th>Warehouse</th><th className="text-right">On Hand</th><th className="text-right">Reserved</th><th className="text-right">Available</th></tr></thead>
              <tbody>
                {product.stock_quants.map(q => (
                  <tr key={q.id}>
                    <td className="font-medium">{q.location_name}</td>
                    <td className="text-apple-secondary">{q.warehouse_code}</td>
                    <td className="text-right tabular-nums">{q.quantity}</td>
                    <td className="text-right tabular-nums text-apple-secondary">{q.reserved_qty}</td>
                    <td className="text-right tabular-nums font-bold text-apple-success">{q.available_qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
