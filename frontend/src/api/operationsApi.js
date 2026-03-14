import axiosClient from './axiosClient'

export const receiptsApi = {
  list:     (params) => axiosClient.get('/receipts', { params }),
  get:      (id)     => axiosClient.get(`/receipts/${id}`),
  create:   (data)   => axiosClient.post('/receipts', data),
  validate: (id)     => axiosClient.post(`/receipts/${id}/validate`),
  cancel:   (id)     => axiosClient.delete(`/receipts/${id}`),
}

export const deliveriesApi = {
  list:     (params) => axiosClient.get('/deliveries', { params }),
  get:      (id)     => axiosClient.get(`/deliveries/${id}`),
  create:   (data)   => axiosClient.post('/deliveries', data),
  validate: (id)     => axiosClient.post(`/deliveries/${id}/validate`),
  cancel:   (id)     => axiosClient.delete(`/deliveries/${id}`),
}

export const transfersApi = {
  list:     (params) => axiosClient.get('/transfers', { params }),
  get:      (id)     => axiosClient.get(`/transfers/${id}`),
  create:   (data)   => axiosClient.post('/transfers', data),
  validate: (id)     => axiosClient.post(`/transfers/${id}/validate`),
  cancel:   (id)     => axiosClient.delete(`/transfers/${id}`),
}

export const adjustmentsApi = {
  list:   () => axiosClient.get('/adjustments'),
  create: (data) => axiosClient.post('/adjustments', data),
}

export default { receiptsApi, deliveriesApi, transfersApi, adjustmentsApi }
