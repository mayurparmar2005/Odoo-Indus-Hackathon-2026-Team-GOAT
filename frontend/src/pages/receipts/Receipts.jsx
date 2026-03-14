import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, CheckCircle, Loader2, Eye } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { receiptsApi } from '../../api/operationsApi'

const STATUS_STYLES = {
  draft:     'badge-draft',
  waiting:   'badge-waiting',
  ready:     'badge-ready',
  done:      'badge-done',
  cancelled: 'badge-cancelled',
}

export default function Receipts() {
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const qc = useQueryClient()
  const navigate = useNavigate()

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ['receipts', status],
    queryFn: () => receiptsApi.list(status ? { status } : {}).then(r => r.data),
  })

  const validateMutation = useMutation({
    mutationFn: (id) => receiptsApi.validate(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['receipts'] })
      qc.invalidateQueries({ queryKey: ['dashboard-kpis'] })
      qc.invalidateQueries({ queryKey: ['dashboard-recent-moves'] })
      toast.success('Receipt validated — stock increased!')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Validation failed'),
  })

  const filtered = receipts.filter(r =>
    !search || r.reference.toLowerCase().includes(search.toLowerCase()) ||
    (r.supplier_name || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Receipts</h1>
          <p className="text-apple-secondary text-sm">Incoming stock operations</p>
        </div>
        <Link to="/receipts/new" className="btn-primary"><Plus size={16}/> New Receipt</Link>
      </div>

      <div className="card p-4 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-secondary" />
          <input type="search" placeholder="Search by reference or supplier…" value={search}
            onChange={e => setSearch(e.target.value)} className="input-field pl-9" />
        </div>
        {['', 'draft', 'ready', 'done', 'cancelled'].map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${status === s ? 'bg-apple-blue text-white' : 'bg-apple-bg text-apple-secondary hover:text-apple-text'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-apple-blue" /></div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Reference</th><th>Supplier</th><th>Warehouse</th><th>Lines</th><th>Date</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td className="font-mono text-xs font-semibold text-apple-blue">{r.reference}</td>
                  <td className="text-apple-text">{r.supplier_name || '—'}</td>
                  <td className="text-apple-secondary">{r.warehouse_name}</td>
                  <td className="text-apple-secondary">{r.lines?.length ?? 0} item{r.lines?.length !== 1 ? 's' : ''}</td>
                  <td className="text-apple-secondary text-xs">{r.scheduled_date || '—'}</td>
                  <td><span className={`badge ${STATUS_STYLES[r.status] || 'badge-draft'}`}>{r.status}</span></td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => navigate(`/receipts/${r.id}`)}
                        className="p-1.5 rounded-lg hover:bg-apple-bg text-apple-secondary hover:text-apple-blue transition-colors">
                        <Eye size={14}/>
                      </button>
                      {['draft','ready','waiting'].includes(r.status) && (
                        <button onClick={() => validateMutation.mutate(r.id)}
                          disabled={validateMutation.isPending && validateMutation.variables === r.id}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-apple-success bg-apple-success/10 hover:bg-apple-success/20 transition-colors disabled:opacity-50">
                          {validateMutation.isPending && validateMutation.variables === r.id
                            ? <Loader2 size={12} className="animate-spin" />
                            : <CheckCircle size={12}/>} Validate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-apple-secondary">No receipts found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
