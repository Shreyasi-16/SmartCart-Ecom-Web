// src/App.js
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import "@fontsource/poppins"; // Defaults to weight 400
import "bootstrap/dist/css/bootstrap.min.css";
import { Home } from './pages/Home.jsx';
import Product from './pages/Product.jsx';
import ProductPage from './pages/ProductPage.jsx'; 
import { Contact } from './pages/Contact.jsx';
import SellerProfile from './pages/SellerProfile.jsx'; 
import { Cart } from './pages/Cart.jsx';
import { Signup } from './pages/Signup.jsx';
import { Login } from './pages/Login.jsx';
import  Sell  from './pages/Sell.jsx';
import Profile from './pages/Profile.jsx'; // ✅ Corrected import
import { Wishlist } from "./pages/Wishlist"; 
import { Applayout } from './Component/Applayout.jsx';
import './App.css';

function App() {
  const router = createBrowserRouter([
    {
      path: '/',
      element: <Applayout />,
      children: [
        {
          path: '/',
          element: <Home />,
        },
        {
          path: '/product',
          element: <Product />,
        },
        { path: '/product/:productId', 
          element: <ProductPage /> 
        }, 
        {
          path: '/contact',
          element: <Contact />,
        },
        {
          path: '/cart',
          element: <Cart />,
        },
        {
          path: '/signup',
          element: <Signup />,
        },
        {
          path: '/login',
          element: <Login />,
        },
        {
          path: '/sell',
          element: <Sell />,
        },
        {
          path: '/profile',
          element: <Profile />,
        },
        {
          path:"/seller/:sellerId",
          element:<SellerProfile />
        },

        { path: "/wishlist", 
          element: <Wishlist /> }
      ],
    },
  ]);

  return <RouterProvider router={router} />;
}

export default App;
