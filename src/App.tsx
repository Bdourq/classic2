import CustomerPage from './pages/CustomerPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  const path = window.location.pathname;

  if (path === '/admin') return <AdminPage />;
  // الصفحة الرئيسية وصفحة "/c" كلاهما يعرضان صفحة العميل — رمز QR
  // المطبوع على الكاسة يشير إلى الجذر "/" ويُحوَّل تلقائياً لتجربة العميل.
  return <CustomerPage />;
}
