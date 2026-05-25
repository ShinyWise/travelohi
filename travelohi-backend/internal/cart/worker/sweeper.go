// internal/cart/worker/sweeper.go
package worker

import (
	"context"
	"log"
	"time"

	"gorm.io/gorm"

	flightpb "github.com/travelohi/backend/proto/flight/v1"
)

type CartItemSweeperModel struct {
	ID          string `gorm:"primaryKey;column:id"`
	ItemType    string `gorm:"column:item_type"`
	ReferenceID string `gorm:"column:reference_id"`
	Status      string `gorm:"column:status"`
}

func (CartItemSweeperModel) TableName() string {
	return "cart_items"
}

func StartCartSweeper(ctx context.Context, db *gorm.DB, flightClient flightpb.FlightServiceClient) {
	log.Println("🧹 Cart Sweeper Worker started in the background...")

	go func() {
		// run sweep every 1 minute
		ticker := time.NewTicker(1 * time.Minute)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				log.Println("Cart Sweeper shutting down...")
				return
			case <-ticker.C:
				sweepExpiredCarts(ctx, db, flightClient)
			}
		}
	}()
}

func sweepExpiredCarts(ctx context.Context, db *gorm.DB, flightClient flightpb.FlightServiceClient) {

	var expiredItems []CartItemSweeperModel

	err := db.WithContext(ctx).Model(&CartItemSweeperModel{}).Where("status = ? AND created_at < NOW() - INTERVAL '15 minutes'", "in_cart").Find(&expiredItems).Error
	if err != nil {
		log.Printf("Sweeper Error: failed to fetch expiring carts: %v\n", err)
		return
	}

	for _, item := range expiredItems {
		// cross-service grpc call
		if item.ItemType == "flight_seat" {
			// set strict timeout
			reqCtx, cancel := context.WithTimeout(ctx, 5*time.Second)

			_, err := flightClient.InternalUnlockSeat(reqCtx, &flightpb.UnlockSeatRequest{
				SeatId: item.ReferenceID,
			})
			cancel()

			if err != nil {
				log.Printf("⚠️ Sweeper: Failed to unlock seat %s. Will retry next cycle. Err: %v", item.ReferenceID, err)
				continue
			}
		}

		// finalize database state
		err = db.WithContext(ctx).Model(&CartItemSweeperModel{}).Where("id = ?", item.ID).Update("status", "expired").Error
		if err != nil {
			log.Printf("❌ Sweeper Error: Unlocked seat %s, but failed to mark cart as expired: %v", item.ReferenceID, err)
		} else {
			log.Printf("🧹 Sweeper: Successfully expired cart %s and unlocked seat %s", item.ID, item.ReferenceID)
		}
	}
}
