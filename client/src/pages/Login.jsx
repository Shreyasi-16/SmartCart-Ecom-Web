import React from 'react';
import './Login.css';

export function Login() {
  return (
    <div className="login-container">
      <form className="login-form">
        <h2>Welcome Back</h2>
        <input type="email" placeholder="Email" required />
        <input type="password" placeholder="Password" required />
        <button type="submit">Login</button>
        <p>Don't have an account? <a href="/signup">Sign up</a></p>
      </form>
    </div>
  );
}
