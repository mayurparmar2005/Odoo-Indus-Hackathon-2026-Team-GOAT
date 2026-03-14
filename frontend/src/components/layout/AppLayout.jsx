import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopNav from './TopNav'

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-apple-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />
        <main className="flex-1 p-6 animate-fade-in overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
