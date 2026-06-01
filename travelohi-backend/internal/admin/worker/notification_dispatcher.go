package worker

import (
	"context"
	"log"
	"time"

	"github.com/travelohi/backend/internal/admin"
	"github.com/travelohi/backend/pkg/mailer"
)

type NotificationDispatcher struct {
	repo   admin.AdminRepository
	mailer mailer.EmailSender
}

func NewNotificationDispatcher(repo admin.AdminRepository, m mailer.EmailSender) *NotificationDispatcher {
	return &NotificationDispatcher{
		repo:   repo,
		mailer: m,
	}
}

// dispatches broadcast notification
func (w *NotificationDispatcher) DispatchBroadcast(subject, body string) {
	workerCtx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)

	go func() {
		// clean up context
		defer cancel()

		log.Printf("[Worker: Notification] Starting broadcast dispatch: '%s'\n", subject)

		subscribers, err := w.repo.GetNewsletterSubscribers(workerCtx)
		if err != nil {
			log.Printf("[Worker: Notification] ERROR: Failed to fetch subscribers: %v\n", err)
			return
		}

		log.Printf("[Worker: Notification] Found %d active subscribers. Commencing real dispatch...\n", len(subscribers))

		// process queue
		successCount := 0
		for _, sub := range subscribers {
			htmlBody := mailer.GenerateBroadcastEmail(subject, body)
			err := w.mailer.SendEmail([]string{sub.Email}, subject, htmlBody)
			if err != nil {
				log.Printf("[Email Error] -> Failed to send to: %s (%s) | Error: %v\n", sub.Email, sub.Name, err)
			} else {
				log.Printf("[Email Success] -> Sent to: %s (%s) | Subject: %s\n", sub.Email, sub.Name, subject)
				successCount++
			}

			time.Sleep(50 * time.Millisecond)
		}

		log.Printf("[Worker: Notification] Broadcast complete. Successfully dispatched %d/%d emails.\n", successCount, len(subscribers))
	}()
}
