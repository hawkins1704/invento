
import { SignIn } from './pages/SignIn'
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { Authenticated, AuthLoading, Unauthenticated } from 'convex/react'
import Layout from './components/Layout'
import LoadingSpinner from './components/LoadingSpinner'
import SelectArea from './pages/SelectArea'
import AdminDashboard from './pages/AdminDashboard'
import AdminInventory from './pages/admin/AdminInventory'
import AdminProductDetail from './pages/admin/AdminProductDetail'
import AdminSales from './pages/admin/AdminSales'
import AdminStaff from './pages/admin/AdminStaff'
import AdminStaffDetail from './pages/admin/AdminStaffDetail'
import AdminBranches from './pages/admin/AdminBranches'
import AdminBranchDetails from './pages/admin/AdminBranchDetails'
import AdminCategories from './pages/admin/AdminCategories'
import AdminCategoryDetail from './pages/admin/AdminCategoryDetail'
import AdminDocuments from './pages/admin/AdminDocuments'
import SalesDashboard from './pages/SalesDashboard'
import SalesTables from './pages/sales/SalesTables'
import SalesDaily from './pages/sales/SalesDaily'
import SalesInventory from './pages/sales/SalesInventory'
import SalesSelectBranch from './pages/sales/SalesSelectBranch'
import EditProfile from './pages/admin/EditProfile'
import AdminSubscription from './pages/admin/AdminSubscription'

function App() {

  return (
    <>
    <AuthLoading>
        <LoadingSpinner />
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
                        <Route path="categories/:categoryId" element={<AdminCategoryDetail />} />
                        <Route path="inventory" element={<AdminInventory />} />
                        <Route path="inventory/:productId" element={<AdminProductDetail />} />
                        <Route path="sales" element={<AdminSales />} />
                        <Route path="documents" element={<AdminDocuments />} />
                        <Route path="staff">
                            <Route index element={<AdminStaff />} />
                            <Route path=":staffId" element={<AdminStaffDetail />} />
                        </Route>
                        <Route path="branches">
                            <Route index element={<AdminBranches />} />
                            <Route path=":branchId" element={<AdminBranchDetails />} />
                        </Route>
                        <Route path="profile" element={<EditProfile />} />
                        <Route path="suscripcion" element={<AdminSubscription />} />
                    </Route>
                    <Route path="sales">
                        <Route index element={<SalesDashboard />} />
                        <Route path="select-branch" element={<SalesSelectBranch />} />
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
