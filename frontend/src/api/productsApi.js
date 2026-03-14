import axiosClient from './axiosClient'

export const productsApi = {
  list:    (params) => axiosClient.get('/products', { params }),
  get:     (id)     => axiosClient.get(`/products/${id}`),
  create:  (data)   => axiosClient.post('/products', data),
  update:  (id, data) => axiosClient.put(`/products/${id}`, data),
  remove:  (id)     => axiosClient.delete(`/products/${id}`),

  // Categories
  listCategories:  () => axiosClient.get('/products/categories'),
  createCategory: (data) => axiosClient.post('/products/categories', data),
}

export default productsApi
