import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { authAPI } from "../lib/api";

interface SignUpProps {
  setToken: (token: string) => void;
}

export default function SignUp({ setToken }: SignUpProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      const payload: any = {
        name,
        email,
        password,
        phone,
        age: Number(age)
      };
      if (bloodGroup) payload.bloodGroup = bloodGroup;
      if (address) payload.address = address;

      const response = await authAPI.signup(payload);
      const token = response.data.token;
      if (token) {
        localStorage.setItem("token", token);
        setToken(token);
      }
      setMessage("Signup successful! Redirecting to dashboard...");
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (err: unknown) {
      const errorMessage =
        axios.isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message || "Signup failed. Please try again."
          : "Signup failed. Please try again.";
      setMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-page-container">
      <div className="auth-split-card">
        {/* Left Side: Illustration & Tagline */}
        <div className="auth-banner-side">
          <div className="badge-pill">
            <span className="badge-dot"></span>
            Safety tools, centered on you
          </div>

          <div className="banner-illustration">
            <svg
              className="shield-character-svg"
              viewBox="0 0 200 220"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <ellipse cx="100" cy="80" rx="36" ry="42" fill="#FCD3B6" />
              <path
                d="M62 76C62 52 78 36 100 36C122 36 138 52 138 76C138 85 134 94 130 98C126 84 116 75 100 75C84 75 74 84 70 98C66 94 62 85 62 76Z"
                fill="#2E1065"
              />
              <path
                d="M68 62C68 40 82 24 100 24C118 24 132 40 132 62"
                stroke="#2E1065"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d="M50 170C50 135 72 120 100 120C128 120 150 135 150 170V220H50V170Z"
                fill="#F3F4F6"
              />
              <path
                d="M80 125C80 145 90 175 100 175C110 175 120 145 120 125H80Z"
                fill="#701A75"
              />
              <rect
                x="82"
                y="130"
                width="36"
                height="62"
                rx="6"
                fill="#3B82F6"
                stroke="#FFFFFF"
                strokeWidth="3"
              />
              <circle cx="100" cy="184" r="3" fill="#FFFFFF" />
            </svg>
          </div>

          <h2 className="banner-title">You are never alone.</h2>
        </div>

        {/* Right Side: Form */}
        <div className="auth-form-side">
          <h1 className="form-title">Create account</h1>
          <p className="form-subtitle">Join Her_Shield and stay protected</p>

          <form onSubmit={handleSubmit} className="signup-grid-form">
            <label className="field-group">
              <span className="field-label">Full name</span>
              <input
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>

            <label className="field-group">
              <span className="field-label">Email</span>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label className="field-group">
              <span className="field-label">Password</span>
              <input
                type="password"
                placeholder="At least 6 characters"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            <label className="field-group">
              <span className="field-label">Phone number</span>
              <input
                type="tel"
                placeholder="e.g. +919876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </label>

            <div className="two-col-row">
              <label className="field-group">
                <span className="field-label">Age</span>
                <input
                  type="number"
                  placeholder="e.g. 21"
                  min={1}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                  required
                />
              </label>

              <label className="field-group">
                <span className="field-label">Blood group (optional)</span>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                >
                  <option value="">Select (optional)</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </label>
            </div>

            <label className="field-group">
              <span className="field-label">Address</span>
              <input
                type="text"
                placeholder="Your address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </label>

            <button type="submit" className="submit-btn" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Create account"}
            </button>

            {message && (
              <p className={`message ${message.includes("successful") ? "success" : "error"}`}>
                {message}
              </p>
            )}
          </form>

          <div className="actions">
            <p>Already have an account? <a href="/login">Log In</a></p>
          </div>
        </div>
      </div>
    </main>
  );
}
