// main login screen

import { useState } from "react";
import { API_BASE_URL } from "../config";
import { useNavigate } from "react-router-dom";
import styles from "./LoginPage.module.css";


// import brand kit assets
import logoFull from "../assets/Brand Kit/Logos/SVGs/horizontal white.svg";
import logoIcon from "../assets/Brand Kit/Logos/SVGs/icon blue with white bg.svg";
import bgPhoto from "../assets/Brand Kit/careerprep-bg.jpg";

export default function LoginPage() {

    const navigate = useNavigate();

    // track whether student or prof.
    const [role, setRole] = useState("student");

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    // handle login form submission
    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, role }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.message || "Unable to log in. Please try again.");
                return;
            }
            // save token + user info for later
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            // send them to verification instead of the dashboard if not verified yet
            if (!data.user.emailVerified) {
                navigate("/verify-email", { state: { email: data.user.email } });
                return;
            }

            // admins skip the form-completion flow entirely — no student/professional form for them
            if (!data.user.profileComplete && data.user.role !== "admin") {
                navigate(data.user.role === "student" ? "/student-form" : "/professional-form");
                return;
            }

            navigate(
              data.user.role === "student"
                ? "/student-dashboard"
                : data.user.role === "admin"
                ? "/admin-dashboard"
                : "/professional-dashboard"
            );
        } catch (err) {
            setError("Something went wrong. Is the server running?");
        }
    };

    // handle "sign up" link click
    const handleSignUp = () => {
        navigate("/signup");
    };

    // clear any stale error when switching tabs
    const handleRoleChange = (nextRole) => {
        setRole(nextRole);
        setError("");
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
                            onClick={() => handleRoleChange("student")}
                            type="button"
                        >
                            Student
                        </button>

                        {/* professional tab */}
                        <button
                            className={`${styles.roleBtn} ${role === "professional" ? styles.roleBtnActive : ""}`}
                            onClick={() => handleRoleChange("professional")}
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

                        {/* error message, shown when login fails (eg. wrong tab) */}
                        {error && <p className={styles.errorText}>{error}</p>}

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