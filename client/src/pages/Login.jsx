import {
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { MainCardLayout } from "../Component/MainCardLayout";
import app from "../firebase";
import { useState } from "react";
import "./Login.css";

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  const login = (e) => {
    e.preventDefault();
    if (!email || !pass) {
      alert("Please enter email and password.");
      return;
    }

    signInWithEmailAndPassword(auth, email, pass)
      .then(() => {
        alert("Login Success");
        window.location.href = "/Profile";
        setEmail("");
        setPass("");
      })
      .catch((error) => {
        if (error.code === "auth/wrong-password") {
          alert("Incorrect password.");
        } else if (error.code === "auth/user-not-found") {
          alert("User not found.");
        } else {
          alert("Login Error: " + error.message);
        }
      });
  };

  const loginWithGoogle = (e) => {
    e.preventDefault();
    signInWithPopup(auth, googleProvider)
      .then((result) => {
        alert("Logged in with Google: " + result.user.email);
        window.location.href = "/Profile";
      })
      .catch((error) => {
        console.error("Google Login Error:", error);
        alert("Google Login Error: " + error.message);
      });
  };

  return (
    <MainCardLayout>
      <div className="container d-flex justify-content-center align-items-center vh-100">
      <div className="card shadow p-4" style={{ maxWidth: "400px", width: "100%" }}>
        <h3 className="text-center text-primary mb-4">Log In</h3>
        <form>
          <div className="mb-3">
            <label htmlFor="lemail" className="form-label">
              Email Address
            </label>
            <input
              type="email"
              id="lemail"
              className="form-control"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="lpass" className="form-label">
              Password
            </label>
            <input
              type="password"
              id="lpass"
              className="form-control"
              placeholder="Enter password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary w-100 mb-2" onClick={login}>
            Log In
          </button>

          <button type="button" className="btn btn-primary w-100 mb-3" onClick={loginWithGoogle}>
            Login with Google
          </button>

          <div className="text-center">
            <p>
              Don't have an account? <a href="/signup">Sign up</a>
            </p>
          </div>
        </form>
      </div>
    </div>
    </MainCardLayout>
  );
}
