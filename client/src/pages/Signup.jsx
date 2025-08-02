import { getAuth, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile } from "firebase/auth";
import app from '../firebase';
import { useState } from 'react';
import './Signup.css';


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
                // Update user profile with full name
                updateProfile(user, {
                    displayName: fullName
                }).then(() => {
                    alert("Signup successful!");
                    setFullName("");
                    setEmail("");
                    setPass("");
                    setConfirmPass("");
                }).catch((error) => {
                    alert("Profile update failed: " + error.message);
                });
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
    }

    const signupWithGoogle = (e) => {
        e.preventDefault();
        signInWithPopup(auth, googleProvider)
            .then((result) => {
                const user = result.user;
                alert("Signed up with Google: " + user.email);
                console.log("Google user:", user);
            })
            .catch((error) => {
                console.error("Google Signup Error:", error);
                alert("Google Signup Error: " + error.message);
            });
    }

    return (
        <>
        <div className="signup-container">
           
            <form className="signup-form">
                <h2>Create Account</h2>
                <label htmlFor="fullname">Full Name: </label>
                <input type="text" id="fullname" value={fullName} onChange={(e) => setFullName(e.target.value)} />

                <label htmlFor="semail">Email: </label>
                <input type="email" id="semail" value={email} onChange={(e) => setEmail(e.target.value)} />

                <label htmlFor="spass">Password: </label>
                <input type="password" id="spass" value={pass} onChange={(e) => setPass(e.target.value)} />

                <label htmlFor="cpass">Confirm Password: </label>
                <input type="password" id="cpass" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} />

                <button type="button" onClick={createSignUP}>Create User</button>
                <button type="button" onClick={signupWithGoogle}>Signup with Google</button>
                <p>Already have an account? <a href="/login">Login</a></p>
            </form>
            </div>
        </>
    );
}
