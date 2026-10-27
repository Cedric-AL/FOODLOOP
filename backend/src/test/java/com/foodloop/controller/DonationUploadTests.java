package com.foodloop.controller;
import com.foodloop.controller.*;
import com.foodloop.model.Account;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class DonationUploadTests {
 @Test void multipartPhotoAndMetadataReachTheSameDonationSubmission() throws Exception {
  WorkspaceController workspace=mock(WorkspaceController.class);Account donor=new Account();donor.id=1L;donor.verified=true;donor.role="DONOR";
  when(workspace.user(any())).thenReturn(donor);when(workspace.donate(any(),any())).thenReturn(100L);
  var mvc=MockMvcBuilders.standaloneSetup(new DonationEvidenceController(workspace)).setControllerAdvice(new ApiErrors()).build();
  var out=new ByteArrayOutputStream();ImageIO.write(new BufferedImage(10,10,BufferedImage.TYPE_INT_RGB),"PNG",out);
  String food="{\"title\":\"Food\",\"category\":\"Bakery\",\"quantity\":1,\"unit\":\"box\",\"expiryDate\":\"2099-12-31\",\"dateType\":\"BEST_BEFORE\",\"foodCondition\":\"Fresh\",\"packagingCondition\":\"Sealed\",\"storageInfo\":\"Room temperature\",\"pickupLocation\":\"Kitchen\",\"pickupFrom\":\"2099-01-01T10:00:00Z\",\"pickupUntil\":\"2099-01-01T12:00:00Z\"}";
  mvc.perform(multipart("/api/donations").file(new MockMultipartFile("details","details.json","application/json",food.getBytes())).file(new MockMultipartFile("photo","food.png","image/png",out.toByteArray())).principal(()->"donor@example.com")).andExpect(status().isOk());
  ArgumentCaptor<WorkspaceController.Food> captured=ArgumentCaptor.forClass(WorkspaceController.Food.class);verify(workspace).donate(any(),captured.capture());assertEquals("Food",captured.getValue().title());
  verify(workspace).update(eq("update food_items set photo=?1 where id=?2"),any(byte[].class),eq(100L));
 }
}
