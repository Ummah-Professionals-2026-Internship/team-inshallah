// signup screen

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./SignupPage.module.css";

// import brand kit assets
import logoFull from "../assets/Brand Kit/Logos/SVGs/horizontal white.svg";
import logoIcon from "../assets/Brand Kit/Logos/SVGs/icon blue with white bg.svg";
import bgPhoto from "../assets/Brand Kit/careerprep-bg.jpg";

export default function SignupPage() {

    const navigate = useNavigate();

    // track whether student or prof.
    const [role, setRole] = useState("student");

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // handle signup form submission
    const handleSignUp = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch("http://localhost:5050/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, role }),
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.message);
                return;
            }
            // go to email verification before letting them in
            navigate("/verify", { state: { email } });
        } catch (err) {
            alert("something went wrong. is the server running?");
        }
    };

    // handle "login" link click
    const handleLogin = () => {
        navigate("/");
    };

    return (
        // full screen wrapper, bg photo layered behind
        <div
            className={styles.pageWrapper}
            style={{ backgroundImage: `url(${bgPhoto})` }}
        >

            {/* top left logo + title */}
            <div className={styles.brandLockup}>
                <img src={logoFull} alt="Ummah Professionals" className={styles.brandLogo} />
                <p className={styles.brandTagline}>Career Prep Services</p>
            </div>

            {/* center signup card */}
            <div className={styles.cardOverlay}>
                <div className={styles.card}>

                    {/* up logo + signup card */}
                    <img src={logoIcon} alt="UP" className={styles.cardIcon} />

                    <h1 className={styles.cardTitle}>Sign Up</h1>

                    {/* role toggle, switch b/w prof & student */}
                    <p className={styles.roleLabel}>Sign up as:</p>
                    <div className={styles.roleToggle}>

                        {/* student tab */}
                        <button
                            type="button"
                            onClick={() => setRole("student")}
                            className={`${styles.roleBtn} ${role === "student" ? styles.roleBtnActive : ""}`}
                        >
                            Student
                        </button>

                        {/* professional tab */}
                        <button
                            type="button"
                            onClick={() => setRole("professional")}
                            className={`${styles.roleBtn} ${role === "professional" ? styles.roleBtnActive : ""}`}
                        >
                            Professional
                        </button>

                    </div>

                    {/* signup form */}
                    <form onSubmit={handleSignUp} className={styles.form}>

                        {/* email input + svg icon */}
                        <div className={styles.inputRow}>
                            <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <rect x="2" y="4" width="20" height="16" rx="2" />
                                <polyline points="2,4 12,13 22,4" />
                            </svg>
                            <input
                                className={styles.input}
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>

                        {/* password input */}
                        <div className={styles.inputRow}>
                            {/* svg lock icon */}
                            <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <rect x="5" y="11" width="14" height="10" rx="2" />
                                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                            </svg>
                            <input
                                className={styles.input}
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="new-password"
                            />
                        </div>

                        {/* submit button */}
                        <button className={styles.loginBtn} type="submit">
                            Get Started
                        </button>

                    </form>

                    {/* login link */}
                    <p className={styles.signupText}>
                        <span className={styles.signupQuestion}>Have an account?</span>{" "}
                        <button
                            className={styles.signupLink}
                            onClick={handleLogin}
                            type="button"
                        >
                            Login
                        </button>
                    </p>

                </div>
            </div>

        </div>
    );
}