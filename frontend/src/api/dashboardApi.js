import axiosClient from './axiosClient'

export const dashboardApi = {
  kpis:        () => axiosClient.get('/dashboard/kpis'),
  chart:       () => axiosClient.get('/dashboard/stock-movement'),
  alerts:      () => axiosClient.get('/dashboard/low-stock-alerts'),
  recentMoves: () => axiosClient.get('/dashboard/recent-moves'),
}

export const stockApi = {
  moves:  (params) => axiosClient.get('/stock/moves', { params }),
  quants: (params) => axiosClient.get('/stock/quants', { params }),
}

export const warehousesApi = {
  list:        () => axiosClient.get('/warehouses'),
  get:         (id) => axiosClient.get(`/warehouses/${id}`),
  create:      (data) => axiosClient.post('/warehouses', data),
  addLocation: (id, data) => axiosClient.post(`/warehouses/${id}/locations`, data),
  allLocations:() => axiosClient.get('/warehouses/locations'),
}

export default { dashboardApi, stockApi, warehousesApi }
