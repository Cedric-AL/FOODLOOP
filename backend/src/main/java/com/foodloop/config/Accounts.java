package com.foodloop.config;
import com.foodloop.model.*;
import org.springframework.stereotype.Service;
import org.springframework.security.core.userdetails.*;
@Service public class Accounts implements UserDetailsService {
 private final AccountRepository repo;
 public Accounts(AccountRepository repo){this.repo=repo;}
 public UserDetails loadUserByUsername(String email){Account u=repo.findByEmail(email.trim().toLowerCase()).orElseThrow(()->new UsernameNotFoundException("Account not found"));return User.withUsername(u.email).password(u.passwordHash).roles(u.role).build();}
}
