package com.foodloop.model;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="password_reset_tokens")
public class PasswordResetToken {
 @Id @Column(name="token_hash",length=64) public String tokenHash;
 @Column(name="account_id",nullable=false) public Long accountId;
 @Column(name="credential_version",nullable=false) public int credentialVersion;
 @Column(name="created_at",nullable=false) public Instant createdAt;
 @Column(name="expires_at",nullable=false) public Instant expiresAt;
 @Column(name="used_at") public Instant usedAt;
 @Column(name="failed_attempts",nullable=false) public int failedAttempts;
}
