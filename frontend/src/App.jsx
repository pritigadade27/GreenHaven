import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { WishlistProvider } from './context/WishlistContext.jsx';
import { CatalogueProvider } from './context/CatalogueContext.jsx';

import ErrorBoundary from './components/common/ErrorBoundary/ErrorBoundary.jsx';
import { ToastProvider } from './components/common/Toast/ToastProvider.jsx';
import AdminRoute from './components/admin/AdminRoute.jsx';
import { AdminAuthProvider } from './context/AdminAuthContext.jsx';
import './pages/admin/admin.css';
import Navbar from './components/layout/Navbar/Navbar.jsx';
import Footer from './components/layout/Footer/Footer.jsx';
import ScrollToTop from './components/common/ScrollToTop/ScrollToTop.jsx';

import { Suspense, lazy } from 'react';

import Home from './pages/Home/Home.jsx';
const Shop = lazy(() => import('./pages/Shop/Shop.jsx'));
const PlantDetails = lazy(() => import('./pages/PlantDetails/PlantDetails.jsx'));
const Wishlist = lazy(() => import('./pages/Wishlist/Wishlist.jsx'));
const Cart = lazy(() => import('./pages/Cart/Cart.jsx'));
const Checkout = lazy(() => import('./pages/Checkout/Checkout.jsx'));
const Login = lazy(() => import('./pages/Login/Login.jsx'));
const Register = lazy(() => import('./pages/Register/Register.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword/ForgotPassword.jsx'));
const About = lazy(() => import('./pages/About/About.jsx'));
const Contact = lazy(() => import('./pages/Contact/Contact.jsx'));
const Orders = lazy(() => import('./pages/Orders/Orders.jsx'));

// My Profile. One chunk per screen, so a shopper who never signs in downloads
// none of it.
const ProfileLayout = lazy(() => import('./pages/Profile/ProfileLayout.jsx'));
const ProfileOverview = lazy(() => import('./pages/Profile/ProfileOverview.jsx'));
const ProfileOrders = lazy(() => import('./pages/Profile/ProfileOrders.jsx'));
const ProfileOrderDetail = lazy(() => import('./pages/Profile/ProfileOrderDetail.jsx'));
const ProfilePayments = lazy(() => import('./pages/Profile/ProfilePayments.jsx'));
const ProfileWishlist = lazy(() => import('./pages/Profile/ProfileWishlist.jsx'));
const ProfileAddresses = lazy(() => import('./pages/Profile/ProfileAddresses.jsx'));
const ProfilePassword = lazy(() => import('./pages/Profile/ProfilePassword.jsx'));
const ProfileInvoices = lazy(() => import('./pages/Profile/ProfileInvoices.jsx'));
const ProfileNotifications = lazy(() => import('./pages/Profile/ProfileNotifications.jsx'));
const NotFound = lazy(() => import('./pages/NotFound/NotFound.jsx'));

// The dashboard is its own chunk. A shopper never downloads a byte of it,
// and nothing in the public bundle references it.
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin.jsx'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders.jsx'));
const AdminPayments = lazy(() => import('./pages/admin/AdminPayments.jsx'));
const AdminInventory = lazy(() => import('./pages/admin/AdminInventory.jsx'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts.jsx'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers.jsx'));
const AdminReviews = lazy(() => import('./pages/admin/AdminReviews.jsx'));
const AdminCoupons = lazy(() => import('./pages/admin/AdminCoupons.jsx'));
const AdminActivity = lazy(() => import('./pages/admin/AdminActivity.jsx'));
const AdminNotFound = lazy(() => import('./pages/admin/AdminNotFound.jsx'));

/** Green Haven — application shell. */
/** Login and Register are full-height split screens — a footer under them
 *  would just push the form off the fold. */
const CHROMELESS = ['/login', '/register', '/forgot-password'];

/**
 * The dashboard branch.
 *
 * Mounted beside the storefront rather than inside it, so the customer Navbar,
 * Footer, CartProvider and WishlistProvider never render for an admin — and the
 * admin session provider never loads for a shopper. The two interfaces share
 * the backend and the database, and nothing else.
 */
function AdminArea() {
  return (
    <AdminAuthProvider>
      <Suspense
        fallback={
          <div className="admin-boot" role="status" aria-live="polite">
            <span className="admin-boot__dot" />
            <span className="sr-only">Loading</span>
          </div>
        }
      >
        <Routes>
          <Route path="login" element={<AdminLogin />} />
          <Route
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            {/* /admin lands on the dashboard rather than a blank shell. */}
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="inventory" element={<AdminInventory />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="activity" element={<AdminActivity />} />
            {/* Unknown admin route: a 404 inside the shell, still signed in. */}
            <Route path="*" element={<AdminNotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </AdminAuthProvider>
  );
}

/** The public shop. Unchanged. */
function StorefrontArea() {
  const { pathname } = useLocation();
  const showFooter = !CHROMELESS.includes(pathname);

  return (
    <AuthProvider>
      <CatalogueProvider>
      <CartProvider>
      <WishlistProvider>
        <a className="skip-link" href="#main">
          Skip to content
        </a>

        <ScrollToTop />
        <Navbar />

        <main id="main">
          <Suspense fallback={<div className="route-loading" role="status" aria-live="polite">
            <span className="sr-only">Loading</span>
          </div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/plant/:id" element={<PlantDetails />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/orders" element={<Orders />} />

            <Route path="/profile" element={<ProfileLayout />}>
              <Route index element={<ProfileOverview />} />
              <Route path="orders" element={<ProfileOrders />} />
              <Route path="orders/:orderNumber" element={<ProfileOrderDetail />} />
              <Route path="payments" element={<ProfilePayments />} />
              <Route path="wishlist" element={<ProfileWishlist />} />
              <Route path="addresses" element={<ProfileAddresses />} />
              <Route path="password" element={<ProfilePassword />} />
              <Route path="invoices" element={<ProfileInvoices />} />
              <Route path="notifications" element={<ProfileNotifications />} />
            </Route>
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            {/* A real 404. Rendering Home here told people their link worked. */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </main>

        {showFooter && <Footer />}
      </WishlistProvider>
      </CartProvider>
      </CatalogueProvider>
    </AuthProvider>
  );
}

export default function App() {
  return (
    // Outermost on purpose: a throw inside any provider or page shows a page
    // that explains itself instead of a blank white screen.
    <ErrorBoundary>
      <ToastProvider>
      <Routes>
        {/* Everything under /admin, handled entirely by AdminArea. */}
        <Route path="/admin/*" element={<AdminArea />} />
        {/* Everything else is the shop. */}
        <Route path="/*" element={<StorefrontArea />} />
      </Routes>
      </ToastProvider>
    </ErrorBoundary>
  );
}
