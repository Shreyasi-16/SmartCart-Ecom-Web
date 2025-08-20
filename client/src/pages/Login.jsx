import { useState } from "react";
import {
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import app from "../firebase";
import "./Login.css";

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const login = async (e) => {
    e.preventDefault();
    if (!email || !pass) {
      return alert("Please enter email and password.");
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      alert("✅ Login Successful!");
      navigate("/profile");
    } catch (error) {
      if (error.code === "auth/wrong-password") {
        alert("❌ Incorrect password.");
      } else if (error.code === "auth/user-not-found") {
        alert("❌ User not found.");
      } else {
        alert("Login Error: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      alert(`✅ Logged in as ${result.user.email}`);
      navigate("/profile");
    } catch (error) {
      console.error("Google Login Error:", error);
      alert("Google Login Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Welcome Back</h2>
        <p className="login-subtitle">Log in to continue</p>

        <form onSubmit={login}>
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="login-input"
          />
          <input
            type="password"
            placeholder="Password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            className="login-input"
          />

          <button
            type="submit"
            className="login-btn primary"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Log In"}
          </button>

          <button
            type="button"
            className="login-btn google"
            onClick={loginWithGoogle}
            disabled={loading}
          >
            {loading ? "Connecting..." : "Login with Google"}
          </button>
        </form>

        <p className="signup-text">
          Don’t have an account? <a href="/signup">Sign Up</a>
        </p>
      </div>
    </div>
  );
}
