import {
    getAuth,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider
} from "firebase/auth";

import app from '../firebase';
import { useState } from 'react';
import './Login.css';



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
            .then((value) => {
                alert("Login Success");
                window.location.href="/Profile";
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
                const user = result.user;
                alert("Logged in with Google: " + user.email);
                
                console.log("Google user:", user);
                window.location.href="/Profile";
            })
            .catch((error) => {
                console.error("Google Login Error:", error);
                alert("Google Login Error: " + error.message);
            });
    };

    return (
        <>
         <div className="login-container">
            

            <form className="login-form">
                <label htmlFor="lemail">Enter Email-ID:</label>
                <input
                    type="email"
                    id="lemail"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <label htmlFor="lpass">Enter Password:</label>
                <input
                    type="password"
                    id="lpass"
                    name="pass"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                />

                <button type="button" onClick={login}>Log In</button>
                <button type="button" onClick={loginWithGoogle}>Login with Google</button>
                <p>Don't have an account? <a href="/signup">Sign up</a></p>
            </form>
            </div>
        </>
    );
}
