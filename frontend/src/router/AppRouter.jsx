import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import AppLayout from '../components/layout/AppLayout'
import Login from '../pages/auth/Login'
import Register from '../pages/auth/Register'
import ForgotPassword from '../pages/auth/ForgotPassword'
import OtpVerify from '../pages/auth/OtpVerify'
import ResetPassword from '../pages/auth/ResetPassword'
import Dashboard from '../pages/dashboard/Dashboard'
import Products from '../pages/products/Products'
import ProductForm from '../pages/products/ProductForm'
import ProductDetail from '../pages/products/ProductDetail'
import Receipts from '../pages/receipts/Receipts'
import ReceiptForm from '../pages/receipts/ReceiptForm'
import ReceiptDetail from '../pages/receipts/ReceiptDetail'
import Deliveries from '../pages/deliveries/Deliveries'
import DeliveryForm from '../pages/deliveries/DeliveryForm'
import DeliveryDetail from '../pages/deliveries/DeliveryDetail'
import Transfers from '../pages/transfers/Transfers'
import TransferForm from '../pages/transfers/TransferForm'
import TransferDetail from '../pages/transfers/TransferDetail'
import Adjustments from '../pages/adjustments/Adjustments'
import StockLedger from '../pages/ledger/StockLedger'
import Warehouses from '../pages/settings/Warehouses'

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-otp" element={<OtpVerify />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected — inside layout */}
        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          
          <Route path="products" element={<Products />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/:id" element={<ProductDetail />} />
          <Route path="products/:id/edit" element={<ProductForm />} />
          
          <Route path="receipts" element={<Receipts />} />
          <Route path="receipts/new" element={<ReceiptForm />} />
          <Route path="receipts/:id" element={<ReceiptDetail />} />
          
          <Route path="deliveries" element={<Deliveries />} />
          <Route path="deliveries/new" element={<DeliveryForm />} />
          <Route path="deliveries/:id" element={<DeliveryDetail />} />
          
          <Route path="transfers" element={<Transfers />} />
          <Route path="transfers/new" element={<TransferForm />} />
          <Route path="transfers/:id" element={<TransferDetail />} />
          
          <Route path="adjustments" element={<Adjustments />} />
          <Route path="ledger" element={<StockLedger />} />
          <Route path="settings/warehouses" element={<Warehouses />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
