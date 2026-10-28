import SmsRateLimit from "../models/SmsRateLimit.js";

const MAX_SMS_PER_USER_PER_MINUTE = 10;

export async function reserveSmsCapacity(userId, smsCount, now = new Date()) {
  if (!Number.isInteger(smsCount) || smsCount < 1) {
    throw new TypeError("SMS reservation count must be a positive integer");
  }
  if (smsCount > MAX_SMS_PER_USER_PER_MINUTE) return false;

  const windowStartedAt = new Date(Math.floor(now.getTime() / 60000) * 60000);
  try {
    const reservation = await SmsRateLimit.findOneAndUpdate(
      {
        user: userId,
        windowStartedAt,
        smsCount: { $lte: MAX_SMS_PER_USER_PER_MINUTE - smsCount },
      },
      {
        $inc: { smsCount },
        $setOnInsert: { user: userId, windowStartedAt },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return Boolean(reservation);
  } catch (error) {
    if (error.code === 11000) return false;
    throw error;
  }
}
