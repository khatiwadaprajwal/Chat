// utils/cleanupJob.js
import cron from "node-cron";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Runs every 20 minutes
cron.schedule("*/20 * * * *", async () => {
  console.log("⏳ Running cleanup job...");

  const now = new Date();

  try {
    // ----------------------------
    // TempUser Cleanup
    // ----------------------------
    // Delete unblocked TempUser with expired OTP (>1 min)
    const deletedTempUsers = await prisma.tempUser.deleteMany({
      where: {
        otpExpires: { lt: new Date(now.getTime() - 1 * 60 * 1000) },
        isBlacklisted: false,
      },
    });
    console.log(`🗑️ Deleted ${deletedTempUsers.count} expired TempUser records.`);

    // Reset blacklisted TempUser if blacklist expired
    const resetTempUsers = await prisma.tempUser.updateMany({
      where: {
        isBlacklisted: true,
        blacklistedUntil: { lt: now },
      },
      data: {
        isBlacklisted: false,
        blacklistedUntil: null,
      },
    });
    console.log(`🔓 Reset ${resetTempUsers.count} blacklisted TempUser records.`);

    // ----------------------------
    // OTP Cleanup
    // ----------------------------
    const deletedOtp = await prisma.otp.deleteMany({
      where: {
        createdAt: { lt: new Date(now.getTime() - 1 * 60 * 1000) },
        isBlacklisted: false,
      },
    });
    console.log(`🗑️ Deleted ${deletedOtp.count} expired OTP records.`);

    const resetOtp = await prisma.otp.updateMany({
      where: {
        isBlacklisted: true,
        blacklistedUntil: { lt: now },
      },
      data: {
        isBlacklisted: false,
        blacklistedUntil: null,
      },
    });
    console.log(`🔓 Reset ${resetOtp.count} blacklisted OTP records.`);
  } catch (error) {
    console.error("❌ Error running cleanup job:", error.message);
  }
});
