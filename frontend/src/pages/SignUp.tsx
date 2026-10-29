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
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      const response = await authAPI.signup({ name, email, password, phone });
      const token = response.data.token;
      if (token) {
        localStorage.setItem("token", token);
        setToken(token);
      }
      setMessage("Signup successful! Redirecting...");
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
    <main className="app-shell">
      <div className="form-shell">
        <h1>Sign Up</h1>
        <form onSubmit={handleSubmit}>
          <label>
            Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label>
            Phone
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button type="submit" disabled={isLoading}>
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
    </main>
  );
}
