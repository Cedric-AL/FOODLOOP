package com.foodloop.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity @Table(name="donation_messages")
public class ChatMessage {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
    @Column(name="donation_id",nullable=false) public Long donationId;
    @Column(name="sender_id",nullable=false) public Long senderId;
    @Column(nullable=false,length=2000) public String body;
    @Column(name="created_at",nullable=false) public Instant createdAt;
}
