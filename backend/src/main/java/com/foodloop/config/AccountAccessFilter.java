package com.foodloop.config;

import com.foodloop.model.AccountRepository;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.List;
import java.util.Objects;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/** Recheck privileges on every authenticated request, including existing login sessions. */
public class AccountAccessFilter extends OncePerRequestFilter {
    private final AccountRepository accounts;
    public AccountAccessFilter(AccountRepository accounts) { this.accounts = accounts; }
    @Override
    protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws ServletException,IOException {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken)) {
            var user = accounts.findByEmail(auth.getName());
            Object version=request.getSession(false)==null?null:request.getSession(false).getAttribute("passwordVersion");
            if (user.isEmpty() || !Objects.equals(version,user.get().credentialVersion)) {
                SecurityContextHolder.clearContext();
                if(request.getSession(false)!=null)request.getSession(false).invalidate();
                response.sendError(401);
                return;
            }
            var fresh = new UsernamePasswordAuthenticationToken(auth.getPrincipal(),auth.getCredentials(),List.of(new SimpleGrantedAuthority("ROLE_"+user.get().role)));
            fresh.setDetails(auth.getDetails());
            SecurityContextHolder.getContext().setAuthentication(fresh);
        }
        chain.doFilter(request,response);
    }
}
