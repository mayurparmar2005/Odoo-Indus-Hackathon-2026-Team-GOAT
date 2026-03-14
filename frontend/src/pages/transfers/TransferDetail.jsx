import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle, ArrowRight, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { transfersApi } from '../../api/operationsApi'

const STATUS_STYLES = { draft:'badge-draft', waiting:'badge-waiting', ready:'badge-ready', done:'badge-done', cancelled:'badge-cancelled' }

export default function TransferDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: transfer, isLoading } = useQuery({
    queryKey: ['transfer', id],
    queryFn: () => transfersApi.get(id).then(r => r.data),
  })

  const validateMutation = useMutation({
    mutationFn: () => transfersApi.validate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transfers'] })
      qc.invalidateQueries({ queryKey: ['transfer', id] })
      qc.invalidateQueries({ queryKey: ['dashboard-kpis'] })
      toast.success('Transfer validated — stock moved!')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Validation failed'),
  })

  if (isLoading) return <div className="flex items-center justify-center py-24"><Loader2 size={24} className="animate-spin text-apple-blue"/></div>
  if (!transfer) return <div className="text-center py-16 text-apple-secondary">Transfer not found.</div>

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/transfers')} className="p-2 rounded-xl hover:bg-apple-bg text-apple-secondary transition-colors"><ArrowLeft size={18}/></button>
        <div className="flex-1">
          <h1 className="page-title font-mono">{transfer.reference}</h1>
          <p className="text-apple-secondary text-xs mt-0.5">Internal transfer</p>
        </div>
        <span className={`badge ${STATUS_STYLES[transfer.status] || 'badge-draft'}`}>{transfer.status}</span>
      </div>

      <div className="card p-6 space-y-5">
        {/* From → To */}
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(0,113,227,0.04)', border: '1px solid rgba(0,113,227,0.1)' }}>
          <div className="flex-1 text-center">
            <p className="text-xs text-apple-secondary font-medium mb-1">From</p>
            <p className="font-bold text-apple-text">{transfer.from_location_name || '—'}</p>
          </div>
          <ArrowRight size={18} className="text-apple-blue flex-shrink-0"/>
          <div className="flex-1 text-center">
            <p className="text-xs text-apple-secondary font-medium mb-1">To</p>
            <p className="font-bold text-apple-text">{transfer.to_location_name || '—'}</p>
          </div>
        </div>

        <div>
          <p className="form-label mb-3">Product Lines</p>
          <div className="rounded-xl overflow-hidden border border-apple-border/50">
            <table className="data-table">
              <thead><tr><th>Product</th><th>SKU</th><th className="text-right">Qty</th><th>UOM</th></tr></thead>
              <tbody>
                {(transfer.lines || []).map(line => (
                  <tr key={line.id}>
                    <td className="font-medium text-apple-text">{line.product_name}</td>
                    <td className="font-mono text-xs text-apple-secondary">{line.product_sku}</td>
                    <td className="text-right font-bold tabular-nums text-apple-blue">{line.qty_done ?? line.qty_initial}</td>
                    <td className="text-apple-secondary">{line.uom}</td>
                  </tr>
                ))}
                {(!transfer.lines || transfer.lines.length === 0) && (
                  <tr><td colSpan={4} className="text-center py-6 text-apple-secondary">No lines</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {['draft','ready','waiting'].includes(transfer.status) && (
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => validateMutation.mutate()} disabled={validateMutation.isPending}
              className="btn-primary disabled:opacity-50">
              {validateMutation.isPending ? <><Loader2 size={14} className="animate-spin"/> Validating…</> : <><CheckCircle size={14}/> Validate Transfer</>}
            </button>
          </div>
        )}
        {transfer.status === 'done' && (
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(48,209,88,0.06)', border: '1px solid rgba(48,209,88,0.2)' }}>
            <CheckCircle size={16} className="text-apple-success"/>
            <p className="text-sm text-apple-success font-medium">Validated — stock moved between locations</p>
          </div>
        )}
      </div>
    </div>
  )
}
