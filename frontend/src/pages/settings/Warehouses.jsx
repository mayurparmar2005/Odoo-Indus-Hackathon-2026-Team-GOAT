import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Loader2, MapPin, Warehouse } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { warehousesApi } from '../../api/dashboardApi'

export default function Warehouses() {
  const [expanded, setExpanded]       = useState({})
  const [showNewWH, setShowNewWH]     = useState(false)
  const [showNewLoc, setShowNewLoc]   = useState(null)
  const [whForm, setWhForm]           = useState({ name: '', code: '', address: '' })
  const [locForm, setLocForm]         = useState({ name: '', code: '', loc_type: 'internal' })
  const qc = useQueryClient()

  const { data: warehouses = [], isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.list().then(r => r.data),
  })

  const createWH = useMutation({
    mutationFn: () => warehousesApi.create(whForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['warehouses'] }); toast.success('Warehouse created!'); setShowNewWH(false); setWhForm({ name:'', code:'', address:'' }) },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  })

  const addLoc = useMutation({
    mutationFn: (whId) => warehousesApi.addLocation(whId, locForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['warehouses'] }); toast.success('Location added!'); setShowNewLoc(null); setLocForm({ name:'', code:'', loc_type:'internal' }) },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  })

  const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }))

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Warehouses & Locations</h1><p className="text-apple-secondary text-sm">Manage your storage structure</p></div>
        <button onClick={() => setShowNewWH(!showNewWH)} className="btn-primary"><Plus size={16}/> New Warehouse</button>
      </div>

      {/* New Warehouse Form */}
      {showNewWH && (
        <div className="card p-5 animate-slide-up">
          <h3 className="text-sm font-bold text-apple-text mb-4">Create Warehouse</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="form-label">Name *</label><input value={whForm.name} onChange={e => setWhForm({...whForm, name:e.target.value})} placeholder="e.g. North Hub" className="input-field"/></div>
            <div><label className="form-label">Code *</label><input value={whForm.code} onChange={e => setWhForm({...whForm, code:e.target.value.toUpperCase()})} placeholder="e.g. WH-N" className="input-field font-mono"/></div>
            <div className="col-span-2"><label className="form-label">Address</label><input value={whForm.address} onChange={e => setWhForm({...whForm, address:e.target.value})} placeholder="Warehouse address" className="input-field"/></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowNewWH(false)} className="btn-secondary">Cancel</button>
            <button onClick={() => createWH.mutate()} disabled={createWH.isPending || !whForm.name || !whForm.code} className="btn-primary disabled:opacity-50">
              {createWH.isPending ? <><Loader2 size={14} className="animate-spin"/> Creating…</> : 'Create Warehouse'}
            </button>
          </div>
        </div>
      )}

      {/* Warehouse List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-apple-blue"/></div>
      ) : warehouses.length === 0 ? (
        <div className="card p-12 text-center">
          <Warehouse size={32} className="mx-auto text-apple-secondary mb-3 opacity-40" />
          <p className="text-apple-secondary text-sm">No warehouses yet — create your first one</p>
        </div>
      ) : (
        <div className="space-y-3">
          {warehouses.map(wh => (
            <div key={wh.id} className="card overflow-hidden">
              <button onClick={() => toggle(wh.id)} className="w-full flex items-center gap-4 p-5 text-left hover:bg-apple-bg/50 transition-colors">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,113,227,0.1)' }}>
                  <Warehouse size={18} style={{ color: '#0071E3' }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-apple-text">{wh.name}</p>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(0,113,227,0.1)', color: '#0071E3' }}>{wh.code}</span>
                  </div>
                  <p className="text-xs text-apple-secondary mt-0.5">{wh.address || 'No address'} · {wh.locations?.length ?? 0} locations</p>
                </div>
                {expanded[wh.id] ? <ChevronDown size={16} className="text-apple-secondary"/> : <ChevronRight size={16} className="text-apple-secondary"/>}
              </button>

              {expanded[wh.id] && (
                <div className="border-t border-apple-border/30 p-5 pt-4 space-y-2 animate-fade-in">
                  {(wh.locations || []).map(loc => (
                    <div key={loc.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.03)' }}>
                      <MapPin size={13} className="text-apple-secondary flex-shrink-0" />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-apple-text">{loc.name}</span>
                        <span className="font-mono text-xs text-apple-secondary ml-2">{loc.code}</span>
                      </div>
                      <span className="text-[11px] text-apple-secondary capitalize px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.04)' }}>{loc.loc_type}</span>
                    </div>
                  ))}

                  {/* Add Location */}
                  {showNewLoc === wh.id && (
                    <div className="p-3 rounded-xl space-y-3 mt-2" style={{ background: 'rgba(0,113,227,0.04)', border: '1px solid rgba(0,113,227,0.1)' }}>
                      <div className="grid grid-cols-3 gap-3">
                        <input value={locForm.name} onChange={e => setLocForm({...locForm, name:e.target.value})} placeholder="Location name *" className="input-field text-sm"/>
                        <input value={locForm.code} onChange={e => setLocForm({...locForm, code:e.target.value.toUpperCase()})} placeholder="Code *" className="input-field text-sm font-mono"/>
                        <select value={locForm.loc_type} onChange={e => setLocForm({...locForm, loc_type:e.target.value})} className="input-field text-sm">
                          {['internal','receiving','dispatch'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setShowNewLoc(null)} className="btn-secondary text-xs py-1.5">Cancel</button>
                        <button onClick={() => addLoc.mutate(wh.id)} disabled={addLoc.isPending || !locForm.name || !locForm.code} className="btn-primary text-xs py-1.5 disabled:opacity-50">
                          {addLoc.isPending ? 'Adding…' : 'Add Location'}
                        </button>
                      </div>
                    </div>
                  )}
                  <button onClick={() => setShowNewLoc(showNewLoc === wh.id ? null : wh.id)}
                    className="flex items-center gap-1.5 text-xs text-apple-blue font-semibold hover:underline mt-1">
                    <Plus size={13}/> Add Location
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
