import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const ResetPassword = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Load email from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    if (emailParam) setEmail(emailParam);
  }, []);

  const handleResetPassword = async () => {
    if (!otp || !newPassword) {
      return setError("All fields are required");
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("http://localhost:5000/v1/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp,
          newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message);

        setTimeout(() => {
          navigate("/login");
        }, 1000);
      } else {
        setError(data.message || "Invalid OTP");
      }
    } catch {
      setError("Server error. Try again.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-blue-300 flex items-center justify-center px-4">
      <div className="bg-white shadow-xl rounded-2xl p-10 max-w-md w-full">
       

        <h1 className="text-3xl font-bold text-center text-blue-600 mb-6">
          Enter OTP & New Password
        </h1>

        {message && (
          <p className="text-green-600 text-center mb-4">{message}</p>
        )}

        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        <input
          type="text"
          placeholder="Enter OTP"
          className="w-full px-4 py-2 mb-4 rounded-lg border"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
        />

        <input
          type="password"
          placeholder="New Password"
          className="w-full px-4 py-2 mb-4 rounded-lg border"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />

        <Button
          onClick={handleResetPassword}
          disabled={loading}
          className="w-full"
        >
          {loading ? "Resetting..." : "Reset Password"}
        </Button>
      </div>
    </div>
  );
};

export default ResetPassword;
