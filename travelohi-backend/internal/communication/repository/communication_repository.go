package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/travelohi/backend/internal/communication"
	"gorm.io/gorm"
)

type SupportMessageModel struct {
	ID             string    `gorm:"primaryKey;column:id;type:varchar(255)"`
	ConversationID string    `gorm:"column:conversation_id;type:varchar(255);not null;index"`
	SenderID       string    `gorm:"column:sender_id;type:varchar(255);not null"`
	Content        string    `gorm:"column:content;type:text;not null"`
	Status         string    `gorm:"column:status;type:varchar(50);default:'sent'"`
	CreatedAt      time.Time `gorm:"column:created_at;autoCreateTime;index"`
}

func (SupportMessageModel) TableName() string { return "support_messages" }

type postgresCommunicationRepo struct {
	db *gorm.DB
}

func NewPostgresCommunicationRepository(db *gorm.DB) communication.Repository {
	return &postgresCommunicationRepo{db: db}
}

func (r *postgresCommunicationRepo) SaveMessage(ctx context.Context, msg *communication.Message) error {
	model := &SupportMessageModel{
		ID:             msg.ID,
		ConversationID: msg.ConversationID,
		SenderID:       msg.SenderID,
		Content:        msg.Content,
		Status:         "sent",
	}
	return r.db.WithContext(ctx).Create(model).Error
}

func (r *postgresCommunicationRepo) UpdateMessageStatus(ctx context.Context, messageID string, status string) error {
	return r.db.WithContext(ctx).
		Model(&SupportMessageModel{}).
		Where("id = ?", messageID).
		Update("status", status).Error
}

func (r *postgresCommunicationRepo) GetMessages(ctx context.Context, conversationID string, limit, offset int32) ([]*communication.Message, error) {
	var models []SupportMessageModel

	// order by createdat desc
	err := r.db.WithContext(ctx).
		Where("conversation_id = ?", conversationID).
		Order("created_at DESC").
		Limit(int(limit)).
		Offset(int(offset)).
		Find(&models).Error

	if err != nil {
		return nil, err
	}

	var messages []*communication.Message
	for _, m := range models {
		messages = append(messages, &communication.Message{
			ID:             m.ID,
			ConversationID: m.ConversationID,
			SenderID:       m.SenderID,
			Content:        m.Content,
			Status:         m.Status,
			CreatedAt:      m.CreatedAt,
		})
	}

	return messages, nil
}

func (r *postgresCommunicationRepo) IsUserAdmin(ctx context.Context, userID string) (bool, error) {
	var isAdmin bool
	err := r.db.WithContext(ctx).Table("account_models").
		Select("is_admin").
		Where("id = ?", userID).
		Scan(&isAdmin).Error
	return isAdmin, err
}

func (r *postgresCommunicationRepo) GetActiveConversations(ctx context.Context, searchQuery string, limit, offset int32) ([]*communication.ConversationPreview, int32, error) {
	var results []*communication.ConversationPreview
	var total int64

	baseQuery := `
		FROM support_conversations c
		JOIN account_models u ON c.user_id = u.id
		WHERE c.status = 'active'
	`

	args := []interface{}{}

	// apply search filter
	if searchQuery != "" {
		baseQuery += ` AND (u.first_name ILIKE ? OR u.last_name ILIKE ? OR u.email ILIKE ?)`
		searchPattern := "%" + searchQuery + "%"
		args = append(args, searchPattern, searchPattern, searchPattern)
	}

	// calculate total active
	countSQL := "SELECT COUNT(c.id) " + baseQuery
	if err := r.db.WithContext(ctx).Raw(countSQL, args...).Scan(&total).Error; err != nil {
		return nil, 0, err
	}

	// fetch preview data
	selectSQL := `
		SELECT 
			c.id AS conversation_id,
			c.user_id,
			u.first_name || ' ' || u.last_name AS full_name,
			u.profile_picture_url AS profile_picture_url,
			(SELECT content FROM support_messages sm WHERE sm.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS latest_message_content,
			(SELECT created_at FROM support_messages sm WHERE sm.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS latest_message_timestamp,
			(SELECT COUNT(*) FROM support_messages sm WHERE sm.conversation_id = c.id AND sm.sender_id = c.user_id AND sm.status = 'sent') AS unread_count
	`

	finalQuery := selectSQL + baseQuery + ` ORDER BY latest_message_timestamp DESC NULLS LAST LIMIT ? OFFSET ?`
	args = append(args, limit, offset)

	if err := r.db.WithContext(ctx).Raw(finalQuery, args...).Scan(&results).Error; err != nil {
		return nil, 0, err
	}

	return results, int32(total), nil
}

type SupportConversationModel struct {
	ID        string    `gorm:"primaryKey;column:id;type:varchar(255)"`
	UserID    string    `gorm:"column:user_id;type:varchar(255);not null"`
	Status    string    `gorm:"column:status;type:varchar(50);default:'active'"`
	CreatedAt time.Time `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt time.Time `gorm:"column:updated_at;autoUpdateTime"`
}

func (SupportConversationModel) TableName() string { return "support_conversations" }

func (r *postgresCommunicationRepo) GetOrCreateConversation(ctx context.Context, userID string, createIfNotExist bool) (string, error) {
	var model SupportConversationModel
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND status = 'active'", userID).
		First(&model).Error
	if err == nil {
		return model.ID, nil
	}
	if err != gorm.ErrRecordNotFound {
		return "", err
	}

	if !createIfNotExist {
		return "", nil
	}

	newID := uuid.New().String()
	newModel := &SupportConversationModel{
		ID:     newID,
		UserID: userID,
		Status: "active",
	}
	if err := r.db.WithContext(ctx).Create(newModel).Error; err != nil {
		return "", err
	}
	return newID, nil
}

func (r *postgresCommunicationRepo) CloseConversation(ctx context.Context, conversationID string) error {
	return r.db.WithContext(ctx).
		Model(&SupportConversationModel{}).
		Where("id = ?", conversationID).
		Update("status", "closed").Error
}
