// main login screen

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./LoginPage.module.css";


// import brand kit assets
import logoFull from "../assets/Brand Kit/Logos/PNGs/horizontal white.png";
import logoIcon from "../assets/Brand Kit/Logos/PNGs/icon blue.png";
import bgPhoto from "../assets/Brand Kit/careerprep-bg.jpg";

export default function LoginPage() {

    const navigate = useNavigate();

    // track whether student or prof.
    const [role, setRole] = useState("student");

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // handle login form submission
    const handleLogin = (e) => {
        e.preventDefault(); // Prevent default browser form submission
        console.log("Login attempt:", { role, email, password });
    };

    // handle "sign up" link click
    const handleSignUp = () => {
        console.log("Navigate to Sign Up");
        navigate("/signup");

    };

    return (
        // full screen wrapper, bg photo layered behind
        <div
            className={styles.pageWrapper}
            style={{ backgroundImage: `url(${bgPhoto})` }}
        >

            {/* top left logo + title */}
            <div className={styles.brandLockup}>
                <img
                    src={logoFull}
                    alt="Ummah Professionals logo"
                    className={styles.brandLogo}
                />
                <p className={styles.brandTagline}>Career Prep Services</p>
            </div>

            {/* center login card */}
            <div className={styles.cardOverlay}>
                <div className={styles.card}>

                    {/* up logo + login card */}
                    <img
                        src={logoIcon}
                        alt="UP icon"
                        className={styles.cardIcon}
                    />

                    <h1 className={styles.cardTitle}>Login</h1>

                    {/* role toggle, switch b/w prof & student */}
                    <p className={styles.roleLabel}>Log in as:</p>
                    <div className={styles.roleToggle}>

                        {/* student tab */}
                        <button
                            className={`${styles.roleBtn} ${role === "student" ? styles.roleBtnActive : ""}`}
                            onClick={() => setRole("student")}
                            type="button"
                        >
                            Student
                        </button>

                        {/* professional tab */}
                        <button
                            className={`${styles.roleBtn} ${role === "professional" ? styles.roleBtnActive : ""}`}
                            onClick={() => setRole("professional")}
                            type="button"
                        >
                            Professional
                        </button>

                    </div>

                    {/* login form */}
                    <form onSubmit={handleLogin} className={styles.form}>

                        {/* email input */}
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
                            {/* SVG lock icon */}
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
                                autoComplete="current-password"
                            />
                        </div>

                        {/* login button */}
                        <button className={styles.loginBtn} type="submit">
                            Login
                        </button>

                    </form>

                    {/* sign up button */}
                    <p className={styles.signupText}>
                        <span className={styles.signupQuestion}>Don&apos;t have an account?</span>{" "}
                        <button
                            className={styles.signupLink}
                            onClick={handleSignUp}
                            type="button"
                        >
                            Sign Up
                        </button>
                    </p>

                </div>
            </div>

        </div>
    );
}
