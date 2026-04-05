import resend
from backend.config import settings

def send_otp_email(to_email: str, otp: str):
    if not settings.RESEND_API_KEY:
        print(f"============= OTP EMAIL =============")
        print(f"Skipping Resend since no API key found. OTP for {to_email} is: {otp}")
        print(f"=====================================")
        return
        
    resend.api_key = settings.RESEND_API_KEY

    params = {
        "from": settings.RESEND_FROM_EMAIL,
        "to": [to_email],
        "subject": "Your QuizHub Verification Code",
        "html": f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <div style="text-align: center; padding: 20px;">
                <h2 style="color: #145FB6;">IEEE UPES QuizHub</h2>
            </div>
            <div style="background-color: #f9f9f9; padding: 30px; border-radius: 10px; border: 1px solid #ddd;">
                <p style="font-size: 16px;">Hi there,</p>
                <p style="font-size: 16px;">Your one-time password (OTP) for registration is:</p>
                <div style="background-color: #fff; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 5px; border: 1px dashed #145FB6; margin: 20px 0;">
                    {otp}
                </div>
                <p style="font-size: 14px; color: #777;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
            </div>
            <div style="text-align: center; padding: 20px; font-size: 12px; color: #999;">
                &copy; IEEE UPES Technical Team
            </div>
        </div>
        """
    }

    try:
        email_response = resend.Emails.send(params)
        print(f"Resend email sent successfully! ID: {email_response.get('id')}")
    except Exception as e:
        print(f"Failed to send email via Resend: {e}")
