package com.foodloop.service;

import com.foodloop.model.*;
import jakarta.persistence.*;
import jakarta.transaction.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class PasswordRecovery {
    @PersistenceContext private EntityManager em;
    private final AccountRepository accounts;
    private final PasswordEncoder encoder;
    private final ResetMailer mailer;
    private final SecureRandom random = new SecureRandom();
    public PasswordRecovery(AccountRepository accounts, PasswordEncoder encoder, ResetMailer mailer) {
        this.accounts = accounts; this.encoder = encoder; this.mailer = mailer;
    }
    public void request(String email) {
        if (!mailer.configured()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
            "Password reset email is not configured yet. Please contact the site administrator.");
        var found = accounts.findByEmail(normalize(email));
        if (found.isEmpty()) return;
        Account account = em.find(Account.class, found.get().id, LockModeType.PESSIMISTIC_WRITE);
        em.refresh(account, LockModeType.PESSIMISTIC_WRITE);
        Instant now = Instant.now();
        Long recent = em.createQuery("select count(t) from PasswordResetToken t where t.accountId=:id and t.createdAt>:since", Long.class)
            .setParameter("id", account.id).setParameter("since", now.minusSeconds(60)).getSingleResult();
        if (recent > 0) return;
        em.createQuery("update PasswordResetToken t set t.usedAt=:now where t.accountId=:id and t.usedAt is null")
            .setParameter("now", now).setParameter("id", account.id).executeUpdate();
        String code = String.format(Locale.ROOT, "%06d", random.nextInt(1_000_000));
        PasswordResetToken token = new PasswordResetToken();
        // Salted BCrypt fits the existing token_hash column; the raw passcode is never stored.
        token.tokenHash = encoder.encode(code); token.accountId = account.id;
        token.createdAt = now; token.expiresAt = now.plusSeconds(600);
        token.credentialVersion = account.credentialVersion;
        em.persist(token); em.flush();
        try { mailer.send(account.email, code); }
        catch (org.springframework.mail.MailException e) { throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
            "We could not send a reset email. Please try again later."); }
    }
    // Commit failed guesses so restarting the backend does not reset the attempt limit.
    @Transactional(dontRollbackOn = InvalidCode.class)
    public void reset(String email, String code, String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
            "Password must use at most 72 UTF-8 bytes.");
        var found = accounts.findByEmail(normalize(email));
        if (found.isEmpty()) throw invalid();
        // Both code issuance and verification lock the account first to serialize concurrent attempts.
        Account account = em.find(Account.class, found.get().id, LockModeType.PESSIMISTIC_WRITE);
        em.refresh(account, LockModeType.PESSIMISTIC_WRITE);
        var tokens = em.createQuery("select t from PasswordResetToken t where t.accountId=:id order by t.createdAt desc", PasswordResetToken.class)
            .setParameter("id", account.id).setMaxResults(1).setLockMode(LockModeType.PESSIMISTIC_WRITE).getResultList();
        if (tokens.isEmpty()) throw invalid();
        PasswordResetToken token = tokens.get(0);
        if (token.usedAt != null || !token.expiresAt.isAfter(Instant.now()) || token.failedAttempts >= 5
            || account.credentialVersion != token.credentialVersion || !token.tokenHash.startsWith("$2")) throw invalid();
        if (!encoder.matches(code, token.tokenHash)) {
            token.failedAttempts++;
            if (token.failedAttempts >= 5) token.usedAt = Instant.now();
            throw invalid();
        }
        account.passwordHash = encoder.encode(password);
        account.credentialVersion++; token.usedAt = Instant.now();
    }
    private String normalize(String email) { return email.trim().toLowerCase(Locale.ROOT); }
    private InvalidCode invalid() { return new InvalidCode(); }
    public static class InvalidCode extends ResponseStatusException {
        public InvalidCode() { super(HttpStatus.BAD_REQUEST,
            "This code is incorrect, expired, or no longer available. Request a new code if needed."); }
    }
}
