package com.foodloop;

import com.foodloop.model.*;
import com.foodloop.service.*;
import org.junit.jupiter.api.*;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:recovery;MODE=PostgreSQL;DB_CLOSE_DELAY=-1","spring.datasource.username=sa","spring.datasource.password=","spring.jpa.hibernate.ddl-auto=create-drop"})
@AutoConfigureMockMvc
class PasswordRecoveryTests {
    @Autowired PasswordRecovery recovery;
    @Autowired AccountRepository accounts;
    @Autowired PasswordEncoder encoder;
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    @MockBean ResetMailer mailer;
    @BeforeEach void setup(){
        jdbc.update("delete from password_reset_tokens");accounts.deleteAll();
        when(mailer.configured()).thenReturn(true);
        Account a=new Account();a.email="reset@example.com";a.firstName="Reset";a.lastName="Test";a.role="DONOR";a.passwordHash=encoder.encode("original-password-123");accounts.save(a);
    }
    String issue(){
        recovery.request("reset@example.com");ArgumentCaptor<String> code=ArgumentCaptor.forClass(String.class);
        verify(mailer).send(eq("reset@example.com"),code.capture());return code.getValue();
    }
    String body(String code){return "{\"email\":\"reset@example.com\",\"code\":\""+code+"\",\"password\":\"updated-password-456\"}";}
    @Test void requestResponseDoesNotRevealAccountAndRequiresCsrf() throws Exception {
        mvc.perform(post("/api/auth/forgot-password").with(csrf()).contentType("application/json").content("{\"email\":\"reset@example.com\"}")).andExpect(status().isAccepted()).andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.startsWith("If an account exists")));
        mvc.perform(post("/api/auth/forgot-password").with(csrf()).contentType("application/json").content("{\"email\":\"unknown@example.com\"}")).andExpect(status().isAccepted()).andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.startsWith("If an account exists")));
        verify(mailer,times(1)).send(eq("reset@example.com"),anyString());
        mvc.perform(post("/api/auth/forgot-password").contentType("application/json").content("{\"email\":\"reset@example.com\"}")).andExpect(status().isForbidden());
    }
    @Test void validCodeIsHashedOneUseAndInvalidatesExistingSession() throws Exception {
        MockHttpSession oldSession=(MockHttpSession)mvc.perform(post("/api/auth/login").with(csrf()).param("email","reset@example.com").param("password","original-password-123")).andExpect(status().isNoContent()).andReturn().getRequest().getSession();
        String code=issue();assertTrue(code.matches("[0-9]{6}"));
        String stored=jdbc.queryForObject("select token_hash from password_reset_tokens",String.class);assertNotEquals(code,stored);assertTrue(encoder.matches(code,stored));
        mvc.perform(post("/api/auth/reset-password").with(csrf()).contentType("application/json").content(body(code))).andExpect(status().isNoContent());
        mvc.perform(get("/api/auth/me").session(oldSession)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/reset-password").with(csrf()).contentType("application/json").content(body(code))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/auth/login").with(csrf()).param("email","reset@example.com").param("password","updated-password-456")).andExpect(status().isNoContent());
        mvc.perform(post("/api/auth/login").with(csrf()).param("email","reset@example.com").param("password","original-password-123")).andExpect(status().isUnauthorized());
    }
    @Test void expiredCodeCannotChangePassword(){
        String code=issue();jdbc.update("update password_reset_tokens set expires_at=timestamp '2000-01-01 00:00:00'");
        assertEquals(400,assertThrows(ResponseStatusException.class,()->recovery.reset("reset@example.com",code,"updated-password-456")).getStatusCode().value());
        assertTrue(encoder.matches("original-password-123",accounts.findByEmail("reset@example.com").orElseThrow().passwordHash));
    }
    @Test void fiveWrongGuessesPersistAndLockTheCode(){
        String code=issue(),wrong=code.equals("000000")?"999999":"000000";
        for(int i=0;i<5;i++) assertThrows(ResponseStatusException.class,()->recovery.reset("reset@example.com",wrong,"updated-password-456"));
        assertEquals(5,jdbc.queryForObject("select failed_attempts from password_reset_tokens",Integer.class));
        assertEquals(1,jdbc.queryForObject("select count(*) from password_reset_tokens where used_at is not null",Integer.class));
        assertThrows(ResponseStatusException.class,()->recovery.reset("reset@example.com",code,"updated-password-456"));
        assertTrue(encoder.matches("original-password-123",accounts.findByEmail("reset@example.com").orElseThrow().passwordHash));
    }
    @Test void cooldownStopsRepeatedEmailsAndResendReplacesOldCode(){
        String first=issue();recovery.request("reset@example.com");verify(mailer,times(1)).send(anyString(),anyString());
        jdbc.update("update password_reset_tokens set created_at=timestamp '2000-01-01 00:00:00'");
        recovery.request("reset@example.com");ArgumentCaptor<String> codes=ArgumentCaptor.forClass(String.class);verify(mailer,times(2)).send(eq("reset@example.com"),codes.capture());String latest=codes.getAllValues().get(1);
        assertEquals(1,jdbc.queryForObject("select count(*) from password_reset_tokens where used_at is not null",Integer.class));
        if(!first.equals(latest))assertThrows(ResponseStatusException.class,()->recovery.reset("reset@example.com",first,"updated-password-456"));
        recovery.reset("reset@example.com",latest,"updated-password-456");
        assertTrue(encoder.matches("updated-password-456",accounts.findByEmail("reset@example.com").orElseThrow().passwordHash));
    }
    @Test void codeIsBoundToEmail(){String code=issue();assertThrows(ResponseStatusException.class,()->recovery.reset("other@example.com",code,"updated-password-456"));assertEquals(0,jdbc.queryForObject("select failed_attempts from password_reset_tokens",Integer.class));}
    @Test void mailFailureRollsBackCodeAndMissingConfigIsExplicit(){
        doThrow(new org.springframework.mail.MailSendException("Test sender failure")).when(mailer).send(anyString(),anyString());
        assertEquals(503,assertThrows(ResponseStatusException.class,()->recovery.request("reset@example.com")).getStatusCode().value());
        assertEquals(0,jdbc.queryForObject("select count(*) from password_reset_tokens",Integer.class));
        when(mailer.configured()).thenReturn(false);
        assertEquals(503,assertThrows(ResponseStatusException.class,()->recovery.request("unknown@example.com")).getStatusCode().value());
    }
    @Test void malformedCodesAndWeakPasswordsAreRejected() throws Exception {
        mvc.perform(post("/api/auth/reset-password").with(csrf()).contentType("application/json").content("{\"email\":\"reset@example.com\",\"code\":\"invalid\",\"password\":\"short\"}")).andExpect(status().isBadRequest());
    }
}
