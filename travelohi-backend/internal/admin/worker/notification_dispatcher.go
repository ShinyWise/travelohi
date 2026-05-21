package worker

import (
	"context"
	"log"
	"time"

	"github.com/travelohi/backend/internal/admin"
)

type NotificationDispatcher struct {
	repo admin.AdminRepository
}

func NewNotificationDispatcher(repo admin.AdminRepository) *NotificationDispatcher {
	return &NotificationDispatcher{
		repo: repo,
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

		log.Printf("[Worker: Notification] Found %d active subscribers. Commencing mock dispatch...\n", len(subscribers))

		// process queue
		successCount := 0
		for _, sub := range subscribers {
			// mock email sender
			log.Printf("[Email Mock] -> Sending to: %s (%s) | Subject: %s\n", sub.Email, sub.Name, subject)

			// simulate network latency
			time.Sleep(50 * time.Millisecond)
			successCount++
		}

		log.Printf("[Worker: Notification] Broadcast complete. Successfully dispatched %d/%d emails.\n", successCount, len(subscribers))
	}()
}
