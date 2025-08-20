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
   
      <div className="signup-container">
      <form className="signup-form" onSubmit={handleEmailSignup}>
        <h2>Create Account</h2>
        <input
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPass}
          onChange={(e) => setConfirmPass(e.target.value)}
          required
        />
        <button type="submit">Sign Up</button>
        <button
          type="button"
          onClick={handleGoogleSignup}
          style={{ marginTop: "10px" }}
        >
          Sign Up with Google
        </button>
        <p>
          Already have an account? <a href="/login">Login</a>
        </p>
      </form>
    </div>
  );
}
