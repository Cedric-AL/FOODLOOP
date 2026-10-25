package com.foodloop;
import com.foodloop.model.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.security.test.web.servlet.response.SecurityMockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;
@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:savora;MODE=PostgreSQL;DB_CLOSE_DELAY=-1","spring.datasource.username=sa","spring.datasource.password=","spring.jpa.hibernate.ddl-auto=create-drop"})
@AutoConfigureMockMvc
class FoodLoopApplicationTests {
 @Autowired MockMvc mvc;
 @Autowired AccountRepository repo;
 @BeforeEach void clear(){repo.deleteAll();}
 String registration(String role){return "{\"email\":\"donor@example.com\",\"password\":\"strong-password-123\",\"firstName\":\"Test\",\"lastName\":\"Donor\",\"role\":\""+role+"\"}";}
 @Test void registrationHashesPasswordAndDoesNotGrantVerification() throws Exception {
  mvc.perform(post("/api/auth/register").with(csrf()).contentType("application/json").content(registration("DONOR"))).andExpect(status().isCreated());
  Account u=repo.findByEmail("donor@example.com").orElseThrow();assertFalse(u.verified);assertTrue(u.passwordHash.startsWith("$2"));assertNotEquals("strong-password-123",u.passwordHash);
  mvc.perform(post("/api/auth/login").with(csrf()).param("email",u.email).param("password","strong-password-123")).andExpect(status().isNoContent()).andExpect(authenticated());
 }
 @Test void cannotSelfRegisterAsAdmin() throws Exception {mvc.perform(post("/api/auth/register").with(csrf()).contentType("application/json").content(registration("ADMIN"))).andExpect(status().isBadRequest());assertEquals(0,repo.count());}
 @Test void csrfAndAdminBoundariesAreEnforced() throws Exception {
  mvc.perform(post("/api/auth/register").contentType("application/json").content(registration("DONOR"))).andExpect(status().isForbidden());
  mvc.perform(get("/api/admin/applications/1/legal")).andExpect(status().isUnauthorized());
  mvc.perform(get("/api/admin/applications/1/legal").with(user("donor@example.com").roles("DONOR"))).andExpect(status().isForbidden());
  mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
 }
 @Test void unverifiedDonorCannotDonate() throws Exception {
  mvc.perform(post("/api/auth/register").with(csrf()).contentType("application/json").content(registration("DONOR"))).andExpect(status().isCreated());
  String food="{\"title\":\"Rice\",\"category\":\"Prepared meals\",\"quantity\":10,\"unit\":\"portions\",\"expiryDate\":\"2099-12-31\",\"dateType\":\"EXPIRATION\",\"foodCondition\":\"Fresh\",\"packagingCondition\":\"Sealed\",\"storageInfo\":\"Refrigerated\",\"pickupLocation\":\"Kitchen\",\"pickupFrom\":\"2099-01-01T10:00:00Z\",\"pickupUntil\":\"2099-01-01T12:00:00Z\"}";
  mvc.perform(post("/api/donations").with(user("donor@example.com").roles("DONOR")).with(csrf()).contentType("application/json").content(food)).andExpect(status().isForbidden());
 }
}
