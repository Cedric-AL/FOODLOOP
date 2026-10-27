package com.foodloop;

import com.foodloop.model.*;
import com.foodloop.service.MediaFiles;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:savora;MODE=PostgreSQL;DB_CLOSE_DELAY=-1","spring.datasource.username=sa","spring.datasource.password=","spring.jpa.hibernate.ddl-auto=create-drop"})
@AutoConfigureMockMvc @Sql("/admin-schema.sql")
class DonationEvidenceTests {
 @Autowired MockMvc mvc;
 @Autowired JdbcTemplate jdbc;
 @Autowired AccountRepository accounts;
 Account donor,recipient,other,admin;
 static byte[] image() throws Exception {var out=new ByteArrayOutputStream();ImageIO.write(new BufferedImage(20,20,BufferedImage.TYPE_INT_RGB),"PNG",out);return out.toByteArray();}
 Account account(String name,String role){Account a=new Account();a.email=name+"@example.com";a.firstName=name;a.lastName="Test";a.passwordHash="not-a-real-password";a.role=role;a.verified=true;return accounts.save(a);}
 MockHttpServletRequestBuilder as(MockHttpServletRequestBuilder request,Account actor){return request.sessionAttr("passwordVersion",0).with(user(actor.email).roles(actor.role));}
 @BeforeEach void setup(){jdbc.update("delete from donation_receipts");jdbc.update("delete from password_reset_tokens");jdbc.update("delete from verification_applications");jdbc.update("delete from donation_requests");jdbc.update("delete from donations");jdbc.update("delete from food_items");jdbc.update("delete from recipient_needs");accounts.deleteAll();donor=account("donor","DONOR");recipient=account("recipient","RECIPIENT");other=account("other","RECIPIENT");admin=account("admin","ADMIN");}
 void seed(String status,Long assigned) throws Exception {
  jdbc.update("insert into food_items(id,donor_id,title,category,quantity,unit,expiry_date,pickup_location,pickup_available_from,pickup_available_until,screening_status,photo) overriding system value values(100,?,'Food','Bakery',10,'boxes',date '2099-12-31','Kitchen',timestamp '2099-01-01 10:00:00',timestamp '2099-01-01 12:00:00','PASSED',?)",donor.id,MediaFiles.photo(new MockMultipartFile("photo","food.png","image/png",image())));
  jdbc.update("insert into donations(id,food_item_id,status,recipient_id) overriding system value values(100,100,?,?)",status,assigned);
 }
 String food(){return "{\"title\":\"Rice\",\"category\":\"Prepared meals\",\"quantity\":10,\"unit\":\"portions\",\"expiryDate\":\"2099-12-31\",\"dateType\":\"EXPIRATION\",\"foodCondition\":\"Fresh\",\"packagingCondition\":\"Sealed\",\"storageInfo\":\"Refrigerated\",\"pickupLocation\":\"Kitchen\",\"pickupFrom\":\"2099-01-01T10:00:00Z\",\"pickupUntil\":\"2099-01-01T12:00:00Z\"}";}
 MockHttpServletRequestBuilder receipt(String outcome,boolean evidence) throws Exception {
  String json="{\"outcome\":\""+outcome+"\",\"issueType\":\"WRONG_ITEM\",\"notes\":\"Product was different\"}";
  var request=multipart("/api/donations/100/receipt").file(new MockMultipartFile("details","details.json","application/json",json.getBytes()));
  if(evidence)request.file(new MockMultipartFile("evidence","received.png","image/png",image()));
  return request.with(csrf());
 }
 @Test void photoIsRequiredAndSpoofedImagesAreRejected() throws Exception {
  mvc.perform(as(multipart("/api/donations").file(new MockMultipartFile("details","details.json","application/json",food().getBytes())).with(csrf()),donor)).andExpect(status().isBadRequest());
  mvc.perform(as(multipart("/api/donations").file(new MockMultipartFile("details","details.json","application/json",food().getBytes())).file(new MockMultipartFile("photo","food.png","image/png","fake image".getBytes())).with(csrf()),donor)).andExpect(status().isBadRequest());
  assertEquals(0,jdbc.queryForObject("select count(*) from donations",Integer.class));
 }
 @Test void photoReencodingStripsTrailingData() throws Exception {
  byte[] png=image(),suffix="private-metadata-marker".getBytes(),combined=new byte[png.length+suffix.length];System.arraycopy(png,0,combined,0,png.length);System.arraycopy(suffix,0,combined,png.length,suffix.length);
  byte[] safe=MediaFiles.photo(new MockMultipartFile("photo","food.png","image/png",combined));
  assertEquals("image/jpeg",MediaFiles.type(safe).toString());assertFalse(new String(safe,java.nio.charset.StandardCharsets.ISO_8859_1).contains("private-metadata-marker"));
 }
 @Test void privatePhotosAreRestrictedUntilPublishedAndAfterAssignment() throws Exception {
  seed("SUBMITTED",null);
  mvc.perform(as(get("/api/donations/100/photo"),other)).andExpect(status().isNotFound());
  mvc.perform(as(get("/api/donations/100/photo"),donor)).andExpect(status().isOk()).andExpect(content().contentType("image/jpeg")).andExpect(header().string("Cache-Control","no-store"));
  jdbc.update("update donations set status='AVAILABLE' where id=100");
  mvc.perform(as(get("/api/donations/100/photo"),other)).andExpect(status().isOk());
  jdbc.update("update donations set status='SCHEDULED_FOR_PICKUP',recipient_id=? where id=100",recipient.id);
  mvc.perform(as(get("/api/donations/100/photo"),other)).andExpect(status().isNotFound());
  mvc.perform(as(get("/api/donations/100/photo"),recipient)).andExpect(status().isOk());
 }
 @Test void documentsHaveInlinePreviewAndRemainAdminOnly() throws Exception {
  jdbc.update("insert into verification_applications(id,user_id,organization_name,legal_document,identity_document) overriding system value values(100,?,'Organization',?,?)",donor.id,image(),image());
  mvc.perform(as(get("/api/admin/applications/100/identity"),admin)).andExpect(status().isOk()).andExpect(content().contentType("image/png")).andExpect(header().string("Content-Disposition",org.hamcrest.Matchers.startsWith("inline")));
  mvc.perform(as(get("/api/admin/applications/100/legal"),recipient)).andExpect(status().isForbidden());
 }
 @Test void onlyAssignedRecipientCanConfirmAndReceiptCannotBeReplayed() throws Exception {
  seed("SCHEDULED_FOR_PICKUP",recipient.id);jdbc.update("update donations set handover_at=current_timestamp where id=100");
  mvc.perform(as(receipt("ACCEPTED",false),other)).andExpect(status().isForbidden());
  mvc.perform(as(receipt("ACCEPTED",false),donor)).andExpect(status().isForbidden());
  mvc.perform(as(receipt("ACCEPTED",false),recipient)).andExpect(status().isOk());
  assertEquals("COMPLETED",jdbc.queryForObject("select status from donations where id=100",String.class));
  assertEquals("ACCEPTED",jdbc.queryForObject("select outcome from donation_receipts where donation_id=100",String.class));
  mvc.perform(as(receipt("ACCEPTED",false),recipient)).andExpect(status().isConflict());
 }
 @Test void reportNeedsPhotoAndCanFollowAcceptanceAndBeReviewedOnce() throws Exception {
  seed("SCHEDULED_FOR_PICKUP",recipient.id);jdbc.update("update donations set handover_at=current_timestamp where id=100");
  mvc.perform(as(receipt("REPORTED",false),recipient)).andExpect(status().isBadRequest());
  mvc.perform(as(receipt("ACCEPTED",false),recipient)).andExpect(status().isOk());
  mvc.perform(as(receipt("REPORTED",true),recipient)).andExpect(status().isOk());
  assertEquals("PENDING",jdbc.queryForObject("select review_status from donation_receipts where donation_id=100",String.class));
  mvc.perform(as(get("/api/donations/100/receipt/photo"),other)).andExpect(status().isNotFound());
  mvc.perform(as(get("/api/donations/100/receipt/photo"),donor)).andExpect(status().isOk());
  String review="{\"status\":\"RESOLVED\",\"notes\":\"Reviewed with donor and recipient\"}";
  mvc.perform(as(post("/api/admin/donations/100/receipt/review").with(csrf()).contentType("application/json").content(review),recipient)).andExpect(status().isForbidden());
  mvc.perform(as(post("/api/admin/donations/100/receipt/review").with(csrf()).contentType("application/json").content(review),admin)).andExpect(status().isOk());
  mvc.perform(as(post("/api/admin/donations/100/receipt/review").with(csrf()).contentType("application/json").content(review),admin)).andExpect(status().isConflict());
 }
 @Test void recipientCannotConfirmOrReportBeforeDonorHandover() throws Exception {
  seed("SCHEDULED_FOR_PICKUP",recipient.id);
  mvc.perform(as(receipt("ACCEPTED",false),recipient)).andExpect(status().isConflict());
  mvc.perform(as(receipt("REPORTED",true),recipient)).andExpect(status().isConflict());
  assertEquals(0,jdbc.queryForObject("select count(*) from donation_receipts",Integer.class));
  assertEquals("SCHEDULED_FOR_PICKUP",jdbc.queryForObject("select status from donations where id=100",String.class));
  mvc.perform(as(post("/api/donations/100/handover").with(csrf()),recipient)).andExpect(status().isForbidden());
  mvc.perform(as(post("/api/donations/100/handover").with(csrf()),donor)).andExpect(status().isOk());
  mvc.perform(as(receipt("ACCEPTED",false),recipient)).andExpect(status().isOk());
 }
 @Test void adminCompletionWithoutHandoverDoesNotUnlockRecipientReceipt() throws Exception {
  seed("COMPLETED",recipient.id);
  mvc.perform(as(receipt("ACCEPTED",false),recipient)).andExpect(status().isConflict());
  assertEquals(0,jdbc.queryForObject("select count(*) from donation_receipts",Integer.class));
 }
 @Test void cancelledDonationCannotBeConfirmed() throws Exception {seed("CANCELLED",recipient.id);mvc.perform(as(receipt("ACCEPTED",false),recipient)).andExpect(status().isConflict());}
 @Test void donorHandoverDoesNotConfirmReceiptForTheRecipient() throws Exception {
  seed("SCHEDULED_FOR_PICKUP",recipient.id);
  mvc.perform(as(post("/api/donations/100/handover").with(csrf()),donor)).andExpect(status().isOk());
  assertEquals("SCHEDULED_FOR_PICKUP",jdbc.queryForObject("select status from donations where id=100",String.class));
  assertEquals(1,jdbc.queryForObject("select count(*) from donations where id=100 and handover_at is not null",Integer.class));
  assertEquals(0,jdbc.queryForObject("select count(*) from donation_receipts",Integer.class));
  mvc.perform(as(post("/api/donations/100/handover").with(csrf()),donor)).andExpect(status().isConflict());
 }
 @Test void listingsAndAdminWorkspaceExposePhotoAndReceiptMetadata() throws Exception {
  seed("SCHEDULED_FOR_PICKUP",recipient.id);jdbc.update("update donations set handover_at=current_timestamp where id=100");mvc.perform(as(receipt("REPORTED",true),recipient)).andExpect(status().isOk());
  mvc.perform(as(get("/api/donations"),recipient)).andExpect(status().isOk()).andExpect(jsonPath("$[0].hasPhoto").value(true)).andExpect(jsonPath("$[0].receiptOutcome").value("REPORTED"));
  mvc.perform(as(get("/api/admin/workspace"),admin)).andExpect(status().isOk()).andExpect(jsonPath("$.receipts[0].reviewStatus").value("PENDING")).andExpect(jsonPath("$.receipts[0].evidencePhoto").doesNotExist());
 }
}
