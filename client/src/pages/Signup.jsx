import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
} from "firebase/auth";
import app from "../firebase";
import { useState } from "react";
import "./Signup.css";

const googleProvider = new GoogleAuthProvider();
const auth = getAuth(app);

export function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  const createSignUP = (e) => {
    e.preventDefault();

    if (!fullName || !email || !pass || !confirmPass) {
      alert("Please fill in all fields.");
      return;
    }

    if (pass !== confirmPass) {
      alert("Passwords do not match.");
      return;
    }

    createUserWithEmailAndPassword(auth, email, pass)
      .then((userCredential) => {
        const user = userCredential.user;
        return updateProfile(user, {
          displayName: fullName,
        });
      })
      .then(() => {
        alert("Signup successful!");
        setFullName("");
        setEmail("");
        setPass("");
        setConfirmPass("");
      })
      .catch((error) => {
        if (error.code === "auth/email-already-in-use") {
          alert("This email is already registered.");
        } else if (error.code === "auth/weak-password") {
          alert("Password should be at least 6 characters.");
        } else if (error.code === "auth/invalid-email") {
          alert("Please enter a valid email address.");
        } else {
          alert("Signup Error: " + error.message);
        }
      });
  };

  const signupWithGoogle = (e) => {
    e.preventDefault();
    signInWithPopup(auth, googleProvider)
      .then((result) => {
        const user = result.user;
        alert("Signed up with Google: " + user.email);
        window.location.href = "/Profile";
      })
      .catch((error) => {
        console.error("Google Signup Error:", error);
        alert("Google Signup Error: " + error.message);
      });
  };

  return (
    <div className="container d-flex justify-content-center align-items-center vh-100">
      <div className="card shadow p-4" style={{ maxWidth: "500px", width: "100%" }}>
        <h3 className="text-center text-primary mb-4">Create an Account</h3>
        <form>
          <div className="mb-3">
            <label htmlFor="fullname" className="form-label">
              Full Name
            </label>
            <input
              type="text"
              id="fullname"
              className="form-control"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="semail" className="form-label">
              Email Address
            </label>
            <input
              type="email"
              id="semail"
              className="form-control"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="spass" className="form-label">
              Password
            </label>
            <input
              type="password"
              id="spass"
              className="form-control"
              placeholder="Create password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="cpass" className="form-label">
              Confirm Password
            </label>
            <input
              type="password"
              id="cpass"
              className="form-control"
              placeholder="Re-enter password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
            />
          </div>

            <button type="submit" className="btn btn-primary w-100 mb-2" onClick={createSignUP}>
            Sign Up
            </button>

            <button type="button" className="btn btn-primary w-100 mb-3" onClick={signupWithGoogle}>
            Sign Up with Google
            </button>


          <div className="text-center">
            <p>
              Already have an account? <a href="/login">Login</a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
