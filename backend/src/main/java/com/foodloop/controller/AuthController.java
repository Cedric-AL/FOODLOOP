package com.foodloop.controller;
import com.foodloop.model.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.security.Principal;
import java.util.Map;
@RestController @RequestMapping("/api/auth")
public class AuthController {
 private final AccountRepository repo; private final PasswordEncoder encoder;
 public AuthController(AccountRepository r,PasswordEncoder e){repo=r;encoder=e;}
 public record Registration(@Email @NotBlank @Size(max=254) String email,@Size(min=12,max=72) @NotNull String password,@NotBlank @Size(max=100) String firstName,@NotBlank @Size(max=100) String lastName,@Pattern(regexp="DONOR|RECIPIENT") @NotNull String role){}
 @GetMapping("/csrf") public Map<String,String> csrf(CsrfToken token){return Map.of("token",token.getToken());}
 @PostMapping("/register") @ResponseStatus(HttpStatus.CREATED) public void register(@Valid @RequestBody Registration r){String email=r.email().trim().toLowerCase();if(repo.findByEmail(email).isPresent())throw new ResponseStatusException(HttpStatus.CONFLICT,"Email already registered");Account u=new Account();u.email=email;u.passwordHash=encoder.encode(r.password());u.firstName=r.firstName();u.lastName=r.lastName();u.role=r.role();repo.save(u);}
 @GetMapping("/me") public Map<String,Object> me(Principal p){Account u=repo.findByEmail(p.getName()).orElseThrow();return Map.of("id",u.id,"email",u.email,"firstName",u.firstName,"role",u.role,"verified",u.verified);}
}
