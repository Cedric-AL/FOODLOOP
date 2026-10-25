package com.foodloop.config;
import org.springframework.context.annotation.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.cors.*;
import java.util.List;
@Configuration
public class WebConfig {
 @Bean PasswordEncoder encoder(){return new BCryptPasswordEncoder();}
 @Bean SecurityFilterChain security(HttpSecurity http, @Value("${app.frontend-origin}") String origin) throws Exception {
  CorsConfiguration cors=new CorsConfiguration();cors.setAllowedOrigins(List.of(origin));cors.setAllowedMethods(List.of("GET","POST","OPTIONS"));cors.setAllowedHeaders(List.of("Content-Type","X-CSRF-TOKEN"));cors.setAllowCredentials(true);
  UrlBasedCorsConfigurationSource source=new UrlBasedCorsConfigurationSource();source.registerCorsConfiguration("/**",cors);
  return http.cors(c->c.configurationSource(source)).authorizeHttpRequests(a->a.requestMatchers("/api/auth/csrf","/api/auth/register","/api/auth/login","/api/health").permitAll().requestMatchers("/api/admin/**").hasRole("ADMIN").anyRequest().authenticated())
   .formLogin(f->f.loginProcessingUrl("/api/auth/login").usernameParameter("email").successHandler((q,r,a)->r.setStatus(204)).failureHandler((q,r,e)->r.sendError(401,"Invalid email or password")))
   .logout(l->l.logoutUrl("/api/auth/logout").logoutSuccessHandler((q,r,a)->r.setStatus(204)))
   .exceptionHandling(e->e.authenticationEntryPoint((q,r,x)->r.sendError(401)).accessDeniedHandler((q,r,x)->r.sendError(403))).build();
 }
}
