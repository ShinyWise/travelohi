package mailer

import (
	"fmt"
	"os"
)

func getBaseFrontendURL() string {
	url := os.Getenv("FRONTEND_URL")
	if url == "" {
		return "http://localhost:5173"
	}
	return url
}

func BaseEmailTemplate(title string, contentHTML string) string {
	baseURL := getBaseFrontendURL()
	return fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>%s</title>
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f3f4f6;
            margin: 0;
            padding: 0;
            color: #1f2937;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        .header {
            background-color: #3b82f6;
            padding: 24px;
            text-align: center;
        }
        .header img {
            max-height: 40px;
        }
        .content {
            padding: 32px;
            line-height: 1.6;
        }
        .content h2 {
            color: #111827;
            margin-top: 0;
        }
        .footer {
            background-color: #f9fafb;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
        }
        .btn {
            display: inline-block;
            background-color: #3b82f6;
            color: #ffffff;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 600;
            margin-top: 16px;
            margin-bottom: 16px;
        }
        .otp-box {
            background-color: #f3f4f6;
            border: 2px dashed #d1d5db;
            border-radius: 6px;
            padding: 16px;
            text-align: center;
            font-size: 32px;
            font-weight: 700;
            letter-spacing: 4px;
            color: #3b82f6;
            margin: 24px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="%s/travelohi.png" alt="TraveloHI Logo">
        </div>
        <div class="content">
            %s
        </div>
        <div class="footer">
            <p>&copy; 2026 TraveloHI. All rights reserved.</p>
            <p>If you didn't request this email, you can safely ignore it.</p>
        </div>
    </div>
</body>
</html>
`, title, baseURL, contentHTML)
}

func GenerateOTPEmail(otp string) string {
	content := fmt.Sprintf(`
		<h2>Your Login Code</h2>
		<p>Hi there,</p>
		<p>You requested a One-Time Password (OTP) to securely log in to your TraveloHI account. Please use the code below:</p>
		<div class="otp-box">%s</div>
		<p>This code is valid for <b>5 minutes</b>.</p>
		<p>For your security, never share this code with anyone.</p>
	`, otp)
	return BaseEmailTemplate("Your TraveloHI OTP Code", content)
}

func GenerateWelcomeEmail() string {
	baseURL := getBaseFrontendURL()
	content := `
		<h2>Welcome to TraveloHI!</h2>
		<p>Hi there,</p>
		<p>Your account has been registered successfully! We are thrilled to have you on board.</p>
		<p>TraveloHI is your one-stop platform for booking the best flights and hotels around the world. Whether you're planning a quick business trip or a luxury vacation, we've got you covered.</p>
		<center>
			<a href="` + baseURL + `/login" class="btn">Log In Now</a>
		</center>
		<p>Ready to explore the world? Let's start your journey today!</p>
	`
	return BaseEmailTemplate("Welcome to TraveloHI!", content)
}

func GenerateActivationEmail(token string) string {
	baseURL := getBaseFrontendURL()
	activationLink := fmt.Sprintf("%s/activate?token=%s", baseURL, token)
	content := fmt.Sprintf(`
		<h2>Activate Your Account</h2>
		<p>Hi there,</p>
		<p>Thank you for registering at TraveloHI! To ensure the security of your account, please verify your email address by clicking the button below.</p>
		<center>
			<a href="%s" class="btn">Activate Account</a>
		</center>
		<p>This activation link will expire in <b>15 minutes</b>.</p>
		<p>If you did not create an account with us, please ignore this email.</p>
	`, activationLink)
	return BaseEmailTemplate("Activate Your TraveloHI Account", content)
}

func GenerateBroadcastEmail(title, body string) string {
	content := fmt.Sprintf(`
		<h2>%s</h2>
		<p>%s</p>
		<br>
		<p>Best Regards,<br><b>The TraveloHI Admin Team</b></p>
	`, title, body)
	return BaseEmailTemplate(title, content)
}

func GeneratePaymentSuccessEmail(transactionID string, totalAmount int64, items []PaymentEmailItem) string {
	baseURL := getBaseFrontendURL()
	itemRows := ""
	for _, item := range items {
		itemRows += fmt.Sprintf(`
			<tr>
				<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">%s</td>
				<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">Rp %s</td>
			</tr>
		`, item.Name, formatAmount(item.Price))
	}

	content := fmt.Sprintf(`
		<h2>Payment Successful!</h2>
		<p>Your payment has been confirmed. Here is your booking summary:</p>
		<table style="width:100%%;border-collapse:collapse;margin:16px 0;">
			<thead>
				<tr style="background-color:#f3f4f6;">
					<th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;font-weight:600;">ITEM</th>
					<th style="padding:10px 12px;text-align:right;font-size:13px;color:#6b7280;font-weight:600;">AMOUNT</th>
				</tr>
			</thead>
			<tbody>
				%s
			</tbody>
			<tfoot>
				<tr>
					<td style="padding:12px;font-weight:700;color:#111827;">Total Paid</td>
					<td style="padding:12px;font-weight:700;color:#3b82f6;text-align:right;font-size:18px;">Rp %s</td>
				</tr>
			</tfoot>
		</table>
		<p style="background-color:#f3f4f6;padding:12px 16px;border-radius:6px;font-size:13px;color:#6b7280;">
			Transaction ID: <b style="color:#111827;">%s</b>
		</p>
		<center>
			<a href="%s/bookings" class="btn">View My Bookings</a>
		</center>
		<p>Thank you for choosing TraveloHI! Have a wonderful trip.</p>
	`, itemRows, formatAmount(totalAmount), transactionID, baseURL)
	return BaseEmailTemplate("Payment Confirmation - TraveloHI", content)
}

type PaymentEmailItem struct {
	Name  string
	Price int64
}

func formatAmount(amount int64) string {
	s := fmt.Sprintf("%d", amount)
	result := ""
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			result += "."
		}
		result += string(c)
	}
	return result
}

