
import { SignIn } from './pages/SignIn'
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { Authenticated, AuthLoading, Unauthenticated } from 'convex/react'
import Layout from './components/Layout'
import SelectArea from './pages/SelectArea'
import AdminDashboard from './pages/AdminDashboard'
import SalesDashboard from './pages/SalesDashboard'


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
                    <Route path="admin" element={<AdminDashboard />} />
                    <Route path="sales" element={<SalesDashboard />} />
                </Route>
            </Routes>
        </Router>
    </Authenticated>
</>
  )
}

export default App
