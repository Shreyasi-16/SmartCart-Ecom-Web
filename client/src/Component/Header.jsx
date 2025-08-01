import { NavLink } from 'react-router-dom';
import './Header.css';
export function Header()
{
    return(
    <header className="main-header">
      <div>
        <img src='/public/logo.png' alt='logo' height="100" width="100"/>
        <h1>SmartCart</h1>
      </div>
      <nav>
        <NavLink to="/">Home</NavLink>
        <NavLink to="/product">Product</NavLink>
        <NavLink to="/contact">Contact</NavLink>
        <NavLink to="/cart">Cart</NavLink>
        <NavLink to="/signup">Signup</NavLink>  
        <NavLink to="/login">Login</NavLink>
        <NavLink to="/sell">Sell</NavLink>
        <NavLink to="/profile">Profile</NavLink>

      </nav>
    </header>
    );
}