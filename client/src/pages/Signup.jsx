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
import { FcGoogle } from "react-icons/fc"; // Google official color icon

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
    if (!fullName || !email || !pass || !confirmPass) return alert("Please fill all fields.");
    if (pass !== confirmPass) return alert("Passwords do not match.");

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(userCredential.user, { displayName: fullName });
      await syncUserToMongo(userCredential.user);
      alert("Signup successful!");
      window.location.href = "/login";
    } catch (error) {
      const messages = {
        "auth/email-already-in-use": "This email is already registered.",
        "auth/weak-password": "Password should be at least 6 characters.",
        "auth/invalid-email": "Please enter a valid email address.",
      };
      alert(messages[error.code] || "Signup Error: " + error.message);
    }
  };

  const handleGoogleSignup = async (e) => {
    e.preventDefault();
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await syncUserToMongo(result.user);
      alert("Signed up with Google: " + result.user.email);
      window.location.href = "/Profile";
    } catch (error) {
      alert("Google Signup Error: " + error.message);
      console.error(error);
    }
  };

 return (
  <div className="signup-page">
    <div className="signup-card">
      {/* LEFT: Image / Animation */}
      <div className="signup-left">
        <img src="s-bg.png" alt="signup-bg" />
      </div>

      {/* RIGHT: Signup Form */}
      <div className="signup-right">
        <form className="signup-form" onSubmit={handleEmailSignup}>
          <h2 className="signup-title">Create Account</h2>

          {[
            { placeholder: "Your Name", value: fullName, setter: setFullName, icon: "👤", type: "text" },
            { placeholder: "Your Email", value: email, setter: setEmail, icon: "📧", type: "email" },
            { placeholder: "Password", value: pass, setter: setPass, icon: "🔒", type: "password" },
            { placeholder: "Repeat Password", value: confirmPass, setter: setConfirmPass, icon: "🔑", type: "password" },
          ].map((field, idx) => (
            <div className="input-group" key={idx}>
              <span className="icon">{field.icon}</span>
              <input
                type={field.type}
                placeholder={field.placeholder}
                value={field.value}
                onChange={(e) => field.setter(e.target.value)}
                required
              />
            </div>
          ))}

          <button type="submit" className="register-btn">
            REGISTER
          </button>
          <button type="button" className="google-btn" onClick={handleGoogleSignup}>
            <FcGoogle size={20} style={{ marginRight: "8px" }} />
            Sign Up with Google
          </button>

          {/* New line at bottom */}
          <p className="signin-text">
            Already have an account? <a href="/login">Sign In</a>
          </p>
        </form>
      </div>
    </div>
  </div>
);


}
