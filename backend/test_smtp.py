import os
import smtplib
from email.mime.text import MIMEText
from dotenv import load_dotenv

def test_smtp():
    load_dotenv()
    
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")

    print(f"--- SMTP Diagnostic ---")
    print(f"Host: {smtp_host}")
    print(f"Port: {smtp_port}")
    print(f"User: {smtp_user}")
    print(f"Pass: {'*' * len(smtp_pass) if smtp_pass else 'MISSING'}")

    if not smtp_user or not smtp_pass:
        print("\n❌ ERROR: SMTP_USER or SMTP_PASS is missing in your .env file!")
        return

    msg = MIMEText("This is a test email from GenieBuilder diagnostic tool.")
    msg['Subject'] = 'GenieBuilder SMTP Test'
    msg['From'] = smtp_user
    msg['To'] = smtp_user  # Send to self

    try:
        print("\nConnecting to server...")
        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            print("Starting TLS...")
            server.starttls()
            print("Logging in...")
            server.login(smtp_user, smtp_pass)
            print("Sending test email...")
            server.send_message(msg)
            print("\n✅ SUCCESS! Your email settings are correct.")
            print("You should receive a test email in your inbox shortly.")
    except smtplib.SMTPAuthenticationError:
        print("\n❌ LOGIN FAILED: Gmail rejected your credentials.")
        print("Reason: Most likely your 'App Password' is wrong or 2-Step Verification is disabled.")
    except Exception as e:
        print(f"\n❌ FAILED: {str(e)}")
        print("\nTechnical details for the AI assistant:")
        print(type(e).__name__)

if __name__ == "__main__":
    test_smtp()
