package com.foodloop;
import com.foodloop.model.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.security.test.web.servlet.response.SecurityMockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;
@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:savora;MODE=PostgreSQL;DB_CLOSE_DELAY=-1","spring.datasource.username=sa","spring.datasource.password=","spring.jpa.hibernate.ddl-auto=create-drop"})
@AutoConfigureMockMvc
@Sql("/admin-schema.sql")
class FoodLoopApplicationTests {
 @Autowired MockMvc mvc;
 @Autowired AccountRepository repo;
 @Autowired JdbcTemplate jdbc;
 @BeforeEach void clear(){jdbc.update("delete from donation_receipts");jdbc.update("delete from password_reset_tokens");jdbc.update("delete from verification_applications");jdbc.update("delete from donation_requests");jdbc.update("delete from donations");jdbc.update("delete from food_items");jdbc.update("delete from recipient_needs");repo.deleteAll();}
 Account account(String email,String role){Account a=new Account();a.email=email;a.firstName="Test";a.lastName="Account";a.passwordHash="unused-test-hash";a.role=role;a.verified=role.equals("ADMIN");return repo.save(a);}
 String registration(String role){return "{\"email\":\"donor@example.com\",\"password\":\"strong-password-123\",\"firstName\":\"Test\",\"lastName\":\"Donor\",\"role\":\""+role+"\"}";}
 @Test void registrationHashesPasswordAndDoesNotGrantVerification() throws Exception {
  mvc.perform(post("/api/auth/register").with(csrf()).contentType("application/json").content(registration("DONOR"))).andExpect(status().isCreated());
  Account u=repo.findByEmail("donor@example.com").orElseThrow();assertFalse(u.verified);assertTrue(u.passwordHash.startsWith("$2"));assertNotEquals("strong-password-123",u.passwordHash);
  mvc.perform(post("/api/auth/login").with(csrf()).param("email",u.email).param("password","strong-password-123")).andExpect(status().isNoContent()).andExpect(authenticated());
 }
 @Test void cannotSelfRegisterAsAdmin() throws Exception {mvc.perform(post("/api/auth/register").with(csrf()).contentType("application/json").content(registration("ADMIN"))).andExpect(status().isBadRequest());assertEquals(0,repo.count());}
 @Test void csrfAndAdminBoundariesAreEnforced() throws Exception {
  account("donor@example.com","DONOR");
  mvc.perform(post("/api/auth/register").contentType("application/json").content(registration("DONOR"))).andExpect(status().isForbidden());
  mvc.perform(get("/api/admin/applications/1/legal")).andExpect(status().isUnauthorized());
  mvc.perform(get("/api/admin/applications/1/legal").sessionAttr("passwordVersion",0).with(user("donor@example.com").roles("DONOR"))).andExpect(status().isForbidden());
  mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
 }
 @Test void adminWorkspaceIncludesRecordsButNoPasswordHashes() throws Exception {
  account("admin@example.com","ADMIN");account("donor@example.com","DONOR");
  mvc.perform(get("/api/admin/workspace").sessionAttr("passwordVersion",0).with(user("admin@example.com").roles("ADMIN"))).andExpect(status().isOk()).andExpect(jsonPath("$.users.length()").value(2)).andExpect(jsonPath("$.users[0].passwordHash").doesNotExist()).andExpect(jsonPath("$.applications").isArray()).andExpect(jsonPath("$.donations").isArray()).andExpect(jsonPath("$.requests").isArray());
  mvc.perform(get("/api/admin/workspace").sessionAttr("passwordVersion",0).with(user("donor@example.com").roles("DONOR"))).andExpect(status().isForbidden());
 }
 @Test void databaseRoleOverridesOldSessionPrivileges() throws Exception {
  account("formeradmin@example.com","DONOR");
  mvc.perform(get("/api/admin/workspace").sessionAttr("passwordVersion",0).with(user("formeradmin@example.com").roles("ADMIN"))).andExpect(status().isForbidden());
 }
 @Test void administratorCannotDemoteSelfAndCanUpdateAnotherAccount() throws Exception {
  Account admin=account("admin@example.com","ADMIN"),donor=account("donor@example.com","DONOR");
  String body="{\"firstName\":\"New\",\"lastName\":\"Name\",\"role\":\"RECIPIENT\",\"reason\":\"Correct account role\"}";
  mvc.perform(post("/api/admin/users/"+admin.id).sessionAttr("passwordVersion",0).with(user(admin.email).roles("ADMIN")).with(csrf()).contentType("application/json").content(body)).andExpect(status().isConflict());
  mvc.perform(post("/api/admin/users/"+donor.id).sessionAttr("passwordVersion",0).with(user(admin.email).roles("ADMIN")).with(csrf()).contentType("application/json").content(body)).andExpect(status().isOk());
  Account changed=repo.findById(donor.id).orElseThrow();assertEquals("RECIPIENT",changed.role);assertEquals("New",changed.firstName);assertFalse(changed.verified);
 }
 @Test void adminRecordActionsRespectLifecycleAndRejectStaleUpdates() throws Exception {
  Account admin=account("admin@example.com","ADMIN"),donor=account("donor@example.com","DONOR");
  jdbc.update("insert into food_items(id,donor_id,title,category,quantity,unit,expiry_date,pickup_location) overriding system value values(100,?,'Food','Bakery',10,'boxes',date '2099-12-31','Kitchen')",donor.id);
  jdbc.update("insert into donations(id,food_item_id,status) overriding system value values(100,100,'AVAILABLE')");
  mvc.perform(post("/api/admin/donations/100/record").sessionAttr("passwordVersion",0).with(user(admin.email).roles("ADMIN")).with(csrf()).contentType("application/json").content("{\"action\":\"COMPLETE\",\"expectedStatus\":\"AVAILABLE\",\"notes\":\"Invalid shortcut\"}")).andExpect(status().isConflict());
  mvc.perform(post("/api/admin/donations/100/record").sessionAttr("passwordVersion",0).with(user(admin.email).roles("ADMIN")).with(csrf()).contentType("application/json").content("{\"action\":\"CANCEL\",\"expectedStatus\":\"AVAILABLE\",\"notes\":\"Donor withdrew food\"}")).andExpect(status().isOk());
  assertEquals("CANCELLED",jdbc.queryForObject("select status from donations where id=100",String.class));
  mvc.perform(post("/api/admin/donations/100/record").sessionAttr("passwordVersion",0).with(user(admin.email).roles("ADMIN")).with(csrf()).contentType("application/json").content("{\"action\":\"KEEP\",\"expectedStatus\":\"AVAILABLE\",\"notes\":\"Stale screen\"}")).andExpect(status().isConflict());
 }
 @Test void unverifiedDonorCannotDonate() throws Exception {
  mvc.perform(post("/api/auth/register").with(csrf()).contentType("application/json").content(registration("DONOR"))).andExpect(status().isCreated());
  String food="{\"title\":\"Rice\",\"category\":\"Prepared meals\",\"quantity\":10,\"unit\":\"portions\",\"expiryDate\":\"2099-12-31\",\"dateType\":\"EXPIRATION\",\"foodCondition\":\"Fresh\",\"packagingCondition\":\"Sealed\",\"storageInfo\":\"Refrigerated\",\"pickupLocation\":\"Kitchen\",\"pickupFrom\":\"2099-01-01T10:00:00Z\",\"pickupUntil\":\"2099-01-01T12:00:00Z\"}";
  mvc.perform(multipart("/api/donations").file(new org.springframework.mock.web.MockMultipartFile("details","details.json","application/json",food.getBytes(java.nio.charset.StandardCharsets.UTF_8))).file(new org.springframework.mock.web.MockMultipartFile("photo","photo.png","image/png",new byte[]{1})).sessionAttr("passwordVersion",0).with(user("donor@example.com").roles("DONOR")).with(csrf())).andExpect(status().isForbidden());
 }
}
