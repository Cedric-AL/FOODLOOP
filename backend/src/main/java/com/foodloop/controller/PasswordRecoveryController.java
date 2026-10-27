package com.foodloop.controller;
import com.foodloop.service.PasswordRecovery;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
@RestController @RequestMapping("/api/auth") public class PasswordRecoveryController {
 private final PasswordRecovery recovery;private final Map<String,Window> requests=new HashMap<>();private record Window(long starts,int count){}
 public PasswordRecoveryController(PasswordRecovery recovery){this.recovery=recovery;}
 public record Email(@NotBlank @jakarta.validation.constraints.Email @Size(max=254) String email){}
 public record Reset(@NotBlank @jakarta.validation.constraints.Email @Size(max=254) String email,@NotNull @Pattern(regexp="[0-9]{6}") String code,@NotNull @Size(min=12,max=72) String password){}
 private synchronized void limit(String address){long now=Instant.now().getEpochSecond();requests.entrySet().removeIf(e->now-e.getValue().starts()>900);Window old=requests.get(address);if((old!=null&&old.count()>=8)||(old==null&&requests.size()>=10000))throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Too many reset attempts. Please try again in 15 minutes.");requests.put(address,new Window(old==null?now:old.starts(),old==null?1:old.count()+1));}
 @PostMapping("/forgot-password") @ResponseStatus(HttpStatus.ACCEPTED) public Map<String,String> forgot(@Valid @RequestBody Email email,HttpServletRequest request){limit("send:"+request.getRemoteAddr());recovery.request(email.email());return Map.of("message","If an account exists for this email, we’ll send a 6-digit reset code. Check your inbox and spam folder. Codes expire in 10 minutes.");}
 @PostMapping("/reset-password") @ResponseStatus(HttpStatus.NO_CONTENT) public void reset(@Valid @RequestBody Reset reset,HttpServletRequest request){limit("verify:"+request.getRemoteAddr());recovery.reset(reset.email(),reset.code(),reset.password());if(request.getSession(false)!=null)request.getSession(false).invalidate();org.springframework.security.core.context.SecurityContextHolder.clearContext();}
}
