import React, { useState } from "react";
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import app from "../firebase";
import "./Signup.css";

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

const syncUserToMongo = async (user) => {
  try {
    const idToken = await user.getIdToken();

    const response = await fetch("http://localhost:5000/sync-user", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error("Failed to sync user");

    console.log("✅ User synced to MongoDB");
  } catch (error) {
    console.error("❌ Sync Error:", error.message);
  }
};

export function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  const handleEmailSignup = async (e) => {
    e.preventDefault();

    if (!fullName || !email || !pass || !confirmPass) {
      alert("Please fill in all fields.");
      return;
    }

    if (pass !== confirmPass) {
      alert("Passwords do not match.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const user = userCredential.user;

      await updateProfile(user, { displayName: fullName });

      await syncUserToMongo(user);

      alert("Signup successful!");
      window.location.href = "/login";
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        alert("This email is already registered.");
      } else if (error.code === "auth/weak-password") {
        alert("Password should be at least 6 characters.");
      } else if (error.code === "auth/invalid-email") {
        alert("Please enter a valid email address.");
      } else {
        alert("Signup Error: " + error.message);
      }
    }
  };

  const handleGoogleSignup = async (e) => {
    e.preventDefault();
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      await syncUserToMongo(user);

      alert("Signed up with Google: " + user.email);
      window.location.href = "/Profile";
    } catch (error) {
      alert("Google Signup Error: " + error.message);
      console.error(error);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-card">
        <div className="signup-left">
          <form className="signup-form" onSubmit={handleEmailSignup}>
            <h2>Sign up</h2>

            <div className="input-group">
              <span className="icon">👤</span>
              <input
                type="text"
                placeholder="Your Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <span className="icon">📧</span>
              <input
                type="email"
                placeholder="Your Email"
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

            <div className="input-group">
              <span className="icon">🔑</span>
              <input
                type="password"
                placeholder="Repeat your password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                required
              />
            </div>

        

            <button type="submit" className="register-btn">
              REGISTER
            </button>

            <button
              type="button"
              className="google-btn"
              onClick={handleGoogleSignup}
            >
              Sign Up with Google
            </button>
          </form>
        </div>

        <div className="signup-right">
          <img
            src="https://mdbcdn.b-cdn.net/img/Photos/new-templates/bootstrap-registration/draw1.webp"
            alt="signup illustration"
          />
        </div>
      </div>
    </div>
  );
}
