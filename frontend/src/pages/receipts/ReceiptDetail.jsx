import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { receiptsApi } from '../../api/operationsApi'

const STATUS_STYLES = { draft:'badge-draft', waiting:'badge-waiting', ready:'badge-ready', done:'badge-done', cancelled:'badge-cancelled' }

export default function ReceiptDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: receipt, isLoading } = useQuery({
    queryKey: ['receipt', id],
    queryFn: () => receiptsApi.get(id).then(r => r.data),
  })

  const validateMutation = useMutation({
    mutationFn: () => receiptsApi.validate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receipts'] })
      qc.invalidateQueries({ queryKey: ['receipt', id] })
      qc.invalidateQueries({ queryKey: ['dashboard-kpis'] })
      toast.success('Receipt validated — stock increased!')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Validation failed'),
  })

  if (isLoading) return <div className="flex items-center justify-center py-24"><Loader2 size={24} className="animate-spin text-apple-blue"/></div>
  if (!receipt) return <div className="text-center py-16 text-apple-secondary">Receipt not found.</div>

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/receipts')} className="p-2 rounded-xl hover:bg-apple-bg text-apple-secondary transition-colors"><ArrowLeft size={18}/></button>
        <div className="flex-1">
          <h1 className="page-title font-mono">{receipt.reference}</h1>
          <p className="text-apple-secondary text-xs mt-0.5">Incoming receipt — {receipt.warehouse_name}</p>
        </div>
        <span className={`badge ${STATUS_STYLES[receipt.status] || 'badge-draft'}`}>{receipt.status}</span>
      </div>

      <div className="card p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="form-label">Supplier</p><p className="text-apple-text font-medium">{receipt.supplier_name || '—'}</p></div>
          <div><p className="form-label">Scheduled Date</p><p className="text-apple-text">{receipt.scheduled_date || '—'}</p></div>
        </div>

        {/* Lines */}
        <div>
          <p className="form-label mb-3">Product Lines</p>
          <div className="rounded-xl overflow-hidden border border-apple-border/50">
            <table className="data-table">
              <thead><tr><th>Product</th><th>SKU</th><th className="text-right">Qty</th><th>UOM</th></tr></thead>
              <tbody>
                {(receipt.lines || []).map(line => (
                  <tr key={line.id}>
                    <td className="font-medium text-apple-text">{line.product_name}</td>
                    <td className="font-mono text-xs text-apple-secondary">{line.product_sku}</td>
                    <td className="text-right font-bold tabular-nums text-apple-success">{line.qty_done ?? line.qty_initial}</td>
                    <td className="text-apple-secondary">{line.uom}</td>
                  </tr>
                ))}
                {(!receipt.lines || receipt.lines.length === 0) && (
                  <tr><td colSpan={4} className="text-center py-6 text-apple-secondary">No lines</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        {['draft','ready','waiting'].includes(receipt.status) && (
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => validateMutation.mutate()} disabled={validateMutation.isPending}
              className="btn-primary disabled:opacity-50">
              {validateMutation.isPending ? <><Loader2 size={14} className="animate-spin"/> Validating…</> : <><CheckCircle size={14}/> Validate Receipt</>}
            </button>
          </div>
        )}
        {receipt.status === 'done' && (
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(48,209,88,0.06)', border: '1px solid rgba(48,209,88,0.2)' }}>
            <CheckCircle size={16} className="text-apple-success"/>
            <p className="text-sm text-apple-success font-medium">Validated — stock has been added to inventory</p>
          </div>
        )}
      </div>
    </div>
  )
}
