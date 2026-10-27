package com.foodloop;

import com.foodloop.model.*;
import com.foodloop.service.PickupExpiry;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:pickupchat;MODE=PostgreSQL;DB_CLOSE_DELAY=-1","spring.datasource.username=sa","spring.datasource.password=","spring.jpa.hibernate.ddl-auto=create-drop"})
@AutoConfigureMockMvc @Sql("/admin-schema.sql")
class PickupChatTests {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired AccountRepository accounts;
    @Autowired PickupExpiry expiry;
    Account donor,recipient,other;
    Account account(String name,String role) { Account a=new Account();a.email=name+"@example.com";a.firstName=name;a.lastName="Test";a.passwordHash="test";a.role=role;a.verified=true;return accounts.save(a); }
    MockHttpServletRequestBuilder as(MockHttpServletRequestBuilder request,Account a) { return request.sessionAttr("passwordVersion",0).with(user(a.email).roles(a.role)); }
    @BeforeEach void setup() {
        jdbc.update("delete from donation_messages");jdbc.update("delete from donation_receipts");jdbc.update("delete from donation_requests");jdbc.update("delete from donations");jdbc.update("delete from food_items");accounts.deleteAll();
        donor=account("donor","DONOR");recipient=account("recipient","RECIPIENT");other=account("other","RECIPIENT");
        jdbc.update("insert into food_items(id,donor_id,title,category,quantity,unit,expiry_date,pickup_location,pickup_available_from,pickup_available_until) overriding system value values(100,?,'Bread','Bakery',2,'boxes',date '2099-12-31','Kitchen',timestamp '2099-01-01 10:00:00',timestamp '2099-01-01 12:00:00')",donor.id);
        jdbc.update("insert into donations(id,food_item_id,status,recipient_id) overriding system value values(100,100,'SCHEDULED_FOR_PICKUP',?)",recipient.id);
        jdbc.update("insert into donation_requests(donation_id,recipient_id,status) values(100,?,'ACCEPTED')",recipient.id);
    }
    @Test void acceptedPartnersCanChatButOthersCannot() throws Exception {
        mvc.perform(as(post("/api/donations/100/messages").with(csrf()).contentType("application/json").content("{\"body\":\"Can we collect at eleven?\"}"),donor)).andExpect(status().isCreated());
        mvc.perform(as(get("/api/donations/100/messages"),recipient)).andExpect(status().isOk()).andExpect(jsonPath("$.canSend").value(true)).andExpect(jsonPath("$.messages[0].body").value("Can we collect at eleven?"));
        mvc.perform(as(get("/api/donations/100/messages"),other)).andExpect(status().isNotFound());
        mvc.perform(as(post("/api/donations/100/messages").with(csrf()).contentType("application/json").content("{\"body\":\"Intruder\"}"),other)).andExpect(status().isNotFound());
        mvc.perform(as(get("/api/donations/100/messages").param("after","999999"),recipient)).andExpect(jsonPath("$.messages").isEmpty());
    }
    @Test void pendingAndBlankMessagesAreRejected() throws Exception {
        mvc.perform(as(post("/api/donations/100/messages").with(csrf()).contentType("application/json").content("{\"body\":\"   \"}"),donor)).andExpect(status().isBadRequest());
        jdbc.update("update donation_requests set status='PENDING'");
        mvc.perform(as(get("/api/donations/100/messages"),donor)).andExpect(status().isConflict());
    }
    @Test void expiryClosesRequestsAndIsIdempotent() throws Exception {
        jdbc.update("update food_items set pickup_available_until=timestamp '2000-01-01 00:00:00'");
        jdbc.update("insert into donation_requests(donation_id,recipient_id,status) values(100,?,'PENDING')",other.id);
        expiry.expire();expiry.expire();
        assertEquals("CANCELLED",jdbc.queryForObject("select status from donations where id=100",String.class));
        assertEquals("CANCELLED",jdbc.queryForObject("select status from donation_requests where recipient_id=?",String.class,recipient.id));
        assertEquals("REJECTED",jdbc.queryForObject("select status from donation_requests where recipient_id=?",String.class,other.id));
        String notes=jdbc.queryForObject("select notes from donations",String.class);
        assertEquals(1,notes.split("Automatically cancelled",-1).length-1);
        mvc.perform(as(get("/api/donations/100/messages"),donor)).andExpect(status().isOk()).andExpect(jsonPath("$.canSend").value(false));
        mvc.perform(as(post("/api/donations/100/messages").with(csrf()).contentType("application/json").content("{\"body\":\"Too late\"}"),donor)).andExpect(status().isConflict());
    }
    @Test void handoverProtectsPickupAndCompletedHistoryIsReadOnly() throws Exception {
        jdbc.update("update food_items set pickup_available_until=timestamp '2000-01-01 00:00:00'");
        jdbc.update("update donations set handover_at=current_timestamp");expiry.expire();
        assertEquals("SCHEDULED_FOR_PICKUP",jdbc.queryForObject("select status from donations",String.class));
        jdbc.update("update donations set status='COMPLETED'");expiry.expire();
        assertEquals("COMPLETED",jdbc.queryForObject("select status from donations",String.class));
        mvc.perform(as(get("/api/donations/100/messages"),recipient)).andExpect(status().isOk()).andExpect(jsonPath("$.canSend").value(false));
    }
    @Test void unclaimedListingExpiresAndLateHandoverIsRejected() throws Exception {
        jdbc.update("update food_items set pickup_available_until=timestamp '2000-01-01 00:00:00'");
        mvc.perform(as(post("/api/donations/100/handover").with(csrf()),donor)).andExpect(status().isConflict());
        jdbc.update("update donations set status='AVAILABLE',recipient_id=null");expiry.expire();
        assertEquals("CANCELLED",jdbc.queryForObject("select status from donations",String.class));
    }
}
