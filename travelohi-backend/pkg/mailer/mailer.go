package mailer

import (
	"fmt"
	"net/smtp"
	"strings"
	"time"

	"github.com/google/uuid"
)

type EmailSender interface {
	SendEmail(to []string, subject string, htmlBody string) error
}

type smtpMailer struct {
	host     string
	port     string
	username string
	password string
}

func NewSMTPMailer(host, port, username, password string) EmailSender {
	return &smtpMailer{
		host:     host,
		port:     port,
		username: username,
		password: password,
	}
}

func (m *smtpMailer) SendEmail(to []string, subject string, htmlBody string) error {
	from := m.username

	header := make(map[string]string)
	header["From"] = from
	header["To"] = strings.Join(to, ",")
	header["Subject"] = subject
	header["MIME-version"] = "1.0"
	header["Content-Type"] = "text/html; charset=\"UTF-8\""

	header["Date"] = time.Now().Format(time.RFC1123Z)
	header["Message-ID"] = fmt.Sprintf("<%s@travelohi.com>", uuid.New().String())

	var message string
	for k, v := range header {
		message += fmt.Sprintf("%s: %s\r\n", k, v)
	}
	message += "\r\n" + htmlBody

	auth := smtp.PlainAuth("", m.username, m.password, m.host)
	addr := fmt.Sprintf("%s:%s", m.host, m.port)

	err := smtp.SendMail(addr, auth, from, to, []byte(message))
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}
