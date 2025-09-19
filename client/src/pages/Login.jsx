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
import { FcGoogle } from "react-icons/fc"; // Google official color icon

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
        alert("❌ User not found.");z
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
  <div className="login-page">
    <div className="login-card">
      {/* LEFT: Login Form */}
      <div className="login-left">
        <form className="login-form" onSubmit={login}>
          <h2 className="login-title">Welcome Back</h2>
          <p className="login-subtitle">Log in to continue</p>

          <div className="input-group">
            <span className="icon">📧</span>
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <span className="icon">🔒</span>
            <input
              type="password"
              placeholder="Password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              required
            />
          </div>

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
            <FcGoogle size={20} style={{ marginRight: "8px" }} />
            {loading ? "Connecting..." : "Login with Google"}
          </button>

          <p className="signup-text">
            Don’t have an account? <a href="/signup">Sign Up</a>
          </p>
        </form>
      </div>

      {/* RIGHT: Image */}
      <div className="login-right">
        <img src="l-bg1.png" alt="login-bg" />
      </div>
    </div>
  </div>
);

}
