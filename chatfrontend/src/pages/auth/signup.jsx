import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

const Signup = () => {
  const { setLoading, loading } = useContext(AuthContext);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:5000/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (res.ok) {
        navigate("/verify-otp", { state: { email } });
      } else {
        setError(data.message || "Signup failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

 return (
    <div className="min-h-screen bg-blue-300 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-8">
        <h2  className="text-3xl font-bold text-center text-blue-600 mb-6">SIGN UP</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="text-sm text-gray-600">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 mt-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 mt-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 mt-4 rounded-md text-white font-semibold ${
              loading ? "bg-pink-300" : "bg-pink-500 hover:bg-pink-600"
            } transition`}
          >
            {loading ? "Signing up..." : "SIGN UP"}
          </button>
        </form>

        <p className="text-center text-gray-500 mt-4">
          Already a user?{" "}
          <span
            className="text-pink-500 cursor-pointer hover:underline"
            onClick={() => navigate("/login")}
          >
            LOGIN
          </span>
        </p>
      </div>
    </div>
  );
};

export default Signup;
