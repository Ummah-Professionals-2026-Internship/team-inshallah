// email verification screen

import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./EmailVerification.module.css";

// import brand kit assets
import logoFull from "../assets/Brand Kit/Logos/SVGs/horizontal white.svg";
import logoIcon from "../assets/Brand Kit/Logos/SVGs/icon blue with white bg.svg";
import bgPhoto from "../assets/Brand Kit/careerprep-bg.jpg";

const CODE_LENGTH = 5;
const RESEND_COOLDOWN = 60; // seconds

const API_BASE = "http://localhost:5050/api/email-verification";

export default function EmailVerification() {

    const navigate = useNavigate();
    const location = useLocation();

    // email passed from signup page via navigate state
    const email = location.state?.email ?? "your email";

    // one state slot per digit
    const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(""));
    const [error, setError] = useState("");
    const [cooldown, setCooldown] = useState(0);

    // refs so we can focus the next box automatically
    const inputRefs = useRef([]);

    // protects against firing this twice in dev
    const hasSentInitialEmail = useRef(false);

    // tick the resend cooldown down every second
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    // send the verification email automatically when the screen loads
    useEffect(() => {
        if (hasSentInitialEmail.current) return;
        hasSentInitialEmail.current = true;

        (async () => {
            try {
                const res = await authFetch("/request", {});
                const data = await res.json();
                if (!res.ok) {
                    setError(data.error ?? "couldn't send verification email.");
                    return;
                }
                setCooldown(RESEND_COOLDOWN);
            } catch (err) {
                setError("something went wrong. is the server running?");
            }
        })();
    }, []);

    // backend uses requireAuth + req.userId,
    // so every call needs the JWT issued at signup/login
    const authFetch = (path, body) => {
        const token = localStorage.getItem("token");
        return fetch(`${API_BASE}${path}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(body),
        });
    };

    // handle typing into a digit box
    const handleDigitChange = (i, val) => {
        const digit = val.replace(/\D/g, "").slice(-1); // numbers only, one char
        const updated = [...digits];
        updated[i] = digit;
        setDigits(updated);
        setError("");

        // auto-focus next box
        if (digit && i < CODE_LENGTH - 1) {
            inputRefs.current[i + 1].focus();
        }
    };

    // handle backspace to jump back a box
    const handleKeyDown = (i, e) => {
        if (e.key === "Backspace" && !digits[i] && i > 0) {
            inputRefs.current[i - 1].focus();
        }
    };

    // handle pasting a full code at once
    const handlePaste = (e) => {
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
        if (!pasted) return;
        const updated = Array(CODE_LENGTH).fill("");
        pasted.split("").forEach((char, i) => (updated[i] = char));
        setDigits(updated);
        inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)].focus();
        e.preventDefault();
    };

    // submit the code to the backend
    const handleContinue = async () => {
        const code = digits.join("");
        if (code.length < CODE_LENGTH) {
            setError("please enter the full code.");
            return;
        }

        try {
            const res = await authFetch("/verify", { code });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error ?? "incorrect code. please try again.");
                return;
            }
            // verified - go to user form based on role returned by the backend
            navigate(data.user?.role === "student" ? "/student-form" : "/professional-form");
        } catch (err) {
            setError("something went wrong. is the server running?");
        }
    };

    // resend the verification email
    const handleResend = async () => {
        if (cooldown > 0) return;
        try {
            const res = await authFetch("/request", {}); // backend looks up the user's email itself
            const data = await res.json();
            if (!res.ok) {
                setError(data.error ?? "couldn't resend. try again.");
                return;
            }
            setCooldown(RESEND_COOLDOWN); // start the 60s cooldown
        } catch (err) {
            setError("something went wrong. is the server running?");
        }
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

            {/* center verify card */}
            <div className={styles.cardOverlay}>
                <div className={styles.card}>

                    {/* up icon */}
                    <img src={logoIcon} alt="UP" className={styles.cardIcon} />

                    <h1 className={styles.cardTitle}>Verify your email</h1>

                    {/* instruction text */}
                    <p className={styles.verifyBody}>
                        To finish signing up, we've sent an email to{" "}
                        <strong>{email}</strong> for verification. After
                        receiving the email, copy the code and type it here.
                    </p>

                    {/* 5 digit boxes */}
                    <div className={styles.digitRow} onPaste={handlePaste}>
                        {digits.map((d, i) => (
                            <input
                                key={i}
                                ref={(el) => (inputRefs.current[i] = el)}
                                className={`${styles.digitBox} ${error ? styles.digitBoxError : ""}`}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={d}
                                onChange={(e) => handleDigitChange(i, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(i, e)}
                            />
                        ))}
                    </div>

                    {/* error message */}
                    {error && <p className={styles.errorText}>{error}</p>}

                    {/* continue button */}
                    <button className={styles.loginBtn} onClick={handleContinue} type="button">
                        Continue
                    </button>

                    {/* resend row */}
                    <p className={styles.signupText}>
                        <span className={styles.signupQuestion}>Didn't receive?</span>{" "}
                        <button
                            className={styles.signupLink}
                            onClick={handleResend}
                            type="button"
                            disabled={cooldown > 0}
                        >
                            Resend confirmation email
                        </button>
                        {/* cooldown timer shown only when active */}
                        {cooldown > 0 && (
                            <span className={styles.cooldownText}>{cooldown}s</span>
                        )}
                    </p>

                </div>
            </div>

        </div>
    );
}