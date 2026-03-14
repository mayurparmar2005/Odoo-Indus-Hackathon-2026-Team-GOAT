import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, CheckCircle, Loader2, Eye } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { deliveriesApi } from '../../api/operationsApi'

const STATUS_STYLES = { draft:'badge-draft', waiting:'badge-waiting', ready:'badge-ready', done:'badge-done', cancelled:'badge-cancelled' }

export default function Deliveries() {
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const qc = useQueryClient()
  const navigate = useNavigate()

  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ['deliveries', status],
    queryFn: () => deliveriesApi.list(status ? { status } : {}).then(r => r.data),
  })

  const validateMutation = useMutation({
    mutationFn: (id) => deliveriesApi.validate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deliveries'] })
      qc.invalidateQueries({ queryKey: ['dashboard-kpis'] })
      qc.invalidateQueries({ queryKey: ['dashboard-recent-moves'] })
      toast.success('Delivery validated — stock deducted!')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Validation failed'),
  })

  const filtered = deliveries.filter(d =>
    !search || d.reference.toLowerCase().includes(search.toLowerCase()) ||
    (d.customer_name || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Deliveries</h1><p className="text-apple-secondary text-sm">Outgoing shipments</p></div>
        <Link to="/deliveries/new" className="btn-primary"><Plus size={16}/> New Delivery</Link>
      </div>
      <div className="card p-4 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-secondary" />
          <input type="search" placeholder="Search reference or customer…" value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9"/>
        </div>
        {['','draft','ready','done','cancelled'].map(s => (
          <button key={s} onClick={() => setStatus(s)} className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${status === s ? 'bg-apple-blue text-white' : 'bg-apple-bg text-apple-secondary hover:text-apple-text'}`}>{s || 'All'}</button>
        ))}
      </div>
      <div className="card overflow-hidden">
        {isLoading ? <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-apple-blue"/></div> : (
          <table className="data-table">
            <thead><tr><th>Reference</th><th>Customer</th><th>Warehouse</th><th>Lines</th><th>Date</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id}>
                  <td className="font-mono text-xs font-semibold text-apple-blue">{d.reference}</td>
                  <td className="text-apple-text">{d.customer_name || '—'}</td>
                  <td className="text-apple-secondary">{d.warehouse_name}</td>
                  <td className="text-apple-secondary">{d.lines?.length ?? 0} items</td>
                  <td className="text-apple-secondary text-xs">{d.scheduled_date || '—'}</td>
                  <td><span className={`badge ${STATUS_STYLES[d.status] || 'badge-draft'}`}>{d.status}</span></td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => navigate(`/deliveries/${d.id}`)} className="p-1.5 rounded-lg hover:bg-apple-bg text-apple-secondary hover:text-apple-blue transition-colors"><Eye size={14}/></button>
                      {['draft','ready','waiting'].includes(d.status) && (
                        <button onClick={() => validateMutation.mutate(d.id)} disabled={validateMutation.isPending}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-apple-success bg-apple-success/10 hover:bg-apple-success/20 transition-colors disabled:opacity-50">
                          {validateMutation.isPending ? <Loader2 size={12} className="animate-spin"/> : <CheckCircle size={12}/>} Validate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-apple-secondary">No deliveries found</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
