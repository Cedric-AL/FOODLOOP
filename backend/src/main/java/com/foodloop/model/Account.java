package com.foodloop.model;
import jakarta.persistence.*;
@Entity @Table(name="users")
public class Account {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
 public String email;
 @Column(name="password_hash") public String passwordHash;
 @Column(name="first_name") public String firstName;
 @Column(name="last_name") public String lastName;
 @Column(name="organization_name") public String organizationName;
 public String role;
 public String phone;
 public String location;
 public boolean verified;
 @Column(name="credential_version") public int credentialVersion;
}
