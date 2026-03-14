import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, CheckCircle, Loader2, Eye } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { transfersApi } from '../../api/operationsApi'

const STATUS_STYLES = { draft:'badge-draft', waiting:'badge-waiting', ready:'badge-ready', done:'badge-done', cancelled:'badge-cancelled' }

export default function Transfers() {
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const qc = useQueryClient()
  const navigate = useNavigate()

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ['transfers', status],
    queryFn: () => transfersApi.list(status ? { status } : {}).then(r => r.data),
  })

  const validateMutation = useMutation({
    mutationFn: (id) => transfersApi.validate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transfers'] })
      qc.invalidateQueries({ queryKey: ['dashboard-kpis'] })
      qc.invalidateQueries({ queryKey: ['dashboard-recent-moves'] })
      toast.success('Transfer validated — stock moved!')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Validation failed'),
  })

  const filtered = transfers.filter(t =>
    !search || t.reference.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Transfers</h1><p className="text-apple-secondary text-sm">Internal stock movements</p></div>
        <Link to="/transfers/new" className="btn-primary"><Plus size={16}/> New Transfer</Link>
      </div>
      <div className="card p-4 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-secondary"/>
          <input type="search" placeholder="Search by reference…" value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9"/>
        </div>
        {['','draft','ready','done','cancelled'].map(s => (
          <button key={s} onClick={() => setStatus(s)} className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${status === s ? 'bg-apple-blue text-white' : 'bg-apple-bg text-apple-secondary hover:text-apple-text'}`}>{s || 'All'}</button>
        ))}
      </div>
      <div className="card overflow-hidden">
        {isLoading ? <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-apple-blue"/></div> : (
          <table className="data-table">
            <thead><tr><th>Reference</th><th>From</th><th>To</th><th>Lines</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id}>
                  <td className="font-mono text-xs font-semibold text-apple-blue">{t.reference}</td>
                  <td className="text-apple-text text-sm">{t.from_location_name}</td>
                  <td className="text-apple-text text-sm">{t.to_location_name}</td>
                  <td className="text-apple-secondary">{t.lines?.length ?? 0} items</td>
                  <td><span className={`badge ${STATUS_STYLES[t.status] || 'badge-draft'}`}>{t.status}</span></td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => navigate(`/transfers/${t.id}`)} className="p-1.5 rounded-lg hover:bg-apple-bg text-apple-secondary hover:text-apple-blue transition-colors"><Eye size={14}/></button>
                      {['draft','ready','waiting'].includes(t.status) && (
                        <button onClick={() => validateMutation.mutate(t.id)} disabled={validateMutation.isPending}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-apple-success bg-apple-success/10 hover:bg-apple-success/20 transition-colors disabled:opacity-50">
                          {validateMutation.isPending ? <Loader2 size={12} className="animate-spin"/> : <CheckCircle size={12}/>} Validate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-apple-secondary">No transfers found</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
