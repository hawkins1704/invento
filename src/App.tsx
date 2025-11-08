
import { SignIn } from './pages/SignIn'
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { Authenticated, AuthLoading, Unauthenticated } from 'convex/react'
import Layout from './components/Layout'
import SelectArea from './pages/SelectArea'
import AdminDashboard from './pages/AdminDashboard'
import AdminInventory from './pages/admin/AdminInventory'
import AdminSales from './pages/admin/AdminSales'
import AdminStaff from './pages/admin/AdminStaff'
import AdminBranches from './pages/admin/AdminBranches'
import BranchInventory from './pages/admin/BranchInventory'
import AdminCategories from './pages/admin/AdminCategories'
import SalesDashboard from './pages/SalesDashboard'
import SalesTables from './pages/sales/SalesTables'
import SalesDaily from './pages/sales/SalesDaily'
import SalesInventory from './pages/sales/SalesInventory'


function App() {

  return (
    <>
    <AuthLoading>
        <div>Loading...</div>
    </AuthLoading>
    <Unauthenticated>
        <Router>
            <Routes>
                <Route
                    index
                    element={<Navigate to="/login" replace />}
                />
                <Route path="/login" element={<SignIn />} />
            </Routes>
        </Router>
    </Unauthenticated>
    <Authenticated>
        <Router>
            <Routes>
                <Route
                    index
                    element={<Navigate to="/select-area" replace />}
                />
                <Route path="select-area" element={<SelectArea />} />
                <Route element={<Layout />}>
                    <Route path="admin">
                        <Route index element={<AdminDashboard />} />
                        <Route path="categories" element={<AdminCategories />} />
                        <Route path="inventory" element={<AdminInventory />} />
                        <Route path="sales" element={<AdminSales />} />
                        <Route path="staff" element={<AdminStaff />} />
                        <Route path="branches">
                            <Route index element={<AdminBranches />} />
                            <Route path=":branchId/inventory" element={<BranchInventory />} />
                        </Route>
                    </Route>
                    <Route path="sales">
                        <Route index element={<SalesDashboard />} />
                        <Route path="tables" element={<SalesTables />} />
                        <Route path="daily" element={<SalesDaily />} />
                        <Route path="inventory" element={<SalesInventory />} />
                    </Route>
                </Route>
            </Routes>
        </Router>
    </Authenticated>
</>
  )
}

export default App
