import RegisterPage from './pages/RegisterPage';
import CustomerPage from './pages/CustomerPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  const path = window.location.pathname;

  if (path === '/admin') return <AdminPage />;
  if (path === '/c')     return <CustomerPage />;
  return <RegisterPage />;
}
