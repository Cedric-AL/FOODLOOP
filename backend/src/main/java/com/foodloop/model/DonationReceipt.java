package com.foodloop.model;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="donation_receipts")
public class DonationReceipt {
 @Id @Column(name="donation_id") public Long donationId;
 @Column(name="recipient_id",nullable=false) public Long recipientId;
 @Column(nullable=false) public String outcome;
 @Column(name="issue_type") public String issueType;
 @Column(columnDefinition="text") public String notes;
 @Column(name="evidence_photo",columnDefinition="bytea") public byte[] evidencePhoto;
 @Column(name="review_status",nullable=false) public String reviewStatus;
 @Column(name="admin_notes",columnDefinition="text") public String adminNotes;
 @Column(name="created_at",nullable=false) public Instant createdAt;
 @Column(name="updated_at",nullable=false) public Instant updatedAt;
 @Column(name="reviewed_at") public Instant reviewedAt;
 @Column(name="reviewed_by") public Long reviewedBy;
}
