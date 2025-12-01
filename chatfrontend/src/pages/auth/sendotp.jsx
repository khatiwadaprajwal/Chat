import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const SendOTP = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSendOtp = async () => {
    if (!email) return setError("Email is required");

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("http://localhost:5000/v1/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message);

        setTimeout(() => {
          navigate(`/reset-password?email=${email}`);
        }, 1000);
      } else {
        setError(data.message || "Failed to send OTP");
      }
    } catch (err) {
      setError("Network error. Try again.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-blue-300 flex items-center justify-center px-4">
      <div className="bg-white shadow-xl rounded-2xl p-10 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center text-blue-600 mb-6">
          Reset Password
        </h1>
        {message && (
          <p className="text-green-600 text-center mb-4">{message}</p>
        )}
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        this is send otp.
        <input
          type="email"
          placeholder="Enter your email"
          className="w-full px-4 py-2 mb-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-400"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          onClick={handleSendOtp}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
        >
          {loading ? "Sending OTP..." : "Send OTP"}
        </button>
        <p className="text-center text-gray-600 mt-4">
          Back to{" "}
          <span
            className="text-purple-600 hover:underline cursor-pointer"
            onClick={() => navigate("/login")}
          >
            Login
          </span>
        </p>
      </div>
    </div>
  );
};

export default SendOTP;
